/**
 * watchtower-api — Reporting Worker.
 *
 * Serves dashboard read traffic. See docs/ARCHITECTURE.md §3.4 and
 * docs/backend/api/endpoints-draft.md for the endpoint contract.
 */

import { encodeCursor, parseQuery, shapeEvent, ValidationError } from './query.js';
import { assembleSummary, buildBucketPlan, parseSummaryQuery, SITE_STATUS_WINDOW_MS } from './summary.js';
import { requireSession, signSession, verifyPassword } from './auth.js';

// CSRF defense per ADR-0005: every /api/* request (login included) must carry
// this custom header. Cross-origin JS can only attach it after a CORS
// preflight, which the origin allowlist grants to the dashboard alone, so
// forged cross-site requests arrive without it and are rejected.
const CSRF_HEADER = 'X-Watchtower-Auth';

/**
 * Credentialed CORS (ADR-0005): echo the request Origin only if it is in the
 * comma-separated `ALLOWED_ORIGINS` var. `*` is incompatible with cookies.
 */
function corsHeaders(request, env) {
	const headers = {
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': `Content-Type, ${CSRF_HEADER}`,
		'Vary': 'Origin',
	};
	const origin = request.headers.get('Origin');
	const allowed = (env.ALLOWED_ORIGINS || '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	if (origin && allowed.includes(origin)) {
		headers['Access-Control-Allow-Origin'] = origin;
		headers['Access-Control-Allow-Credentials'] = 'true';
	}
	return headers;
}

function jsonResponse(body, status) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

export default {
	async fetch(request, env) {
		const response = await route(request, env);
		// CORS is per-request (origin echo), so it is applied here rather than
		// inside the handlers.
		for (const [key, value] of Object.entries(corsHeaders(request, env))) {
			response.headers.set(key, value);
		}
		return response;
	},
};

async function route(request, env) {
	const url = new URL(request.url);

	if (request.method === 'OPTIONS') {
		return new Response(null, { status: 204 });
	}

	if (!request.headers.get(CSRF_HEADER)) {
		return jsonResponse({ error: 'missing_auth_header' }, 403);
	}

	if (request.method === 'POST' && url.pathname === '/api/login') {
		return handleLogin(request, env);
	}

	// Everything below requires a valid session (ADR-0005).
	const session = await requireSession(request, env);
	if (!session) {
		return jsonResponse({ error: 'unauthorized' }, 401);
	}

	if (request.method === 'POST' && url.pathname === '/api/logout') {
		return handleLogout(session, env);
	}

	if (request.method === 'GET' && url.pathname === '/api/events') {
		return handleGetEvents(url, env, session);
	}

	if (request.method === 'GET' && url.pathname === '/api/summary') {
		return handleGetSummary(url, env, session);
	}

	const parts = url.pathname.split('/');
	const eventDetailMatch = parts.length === 4 && parts[1] === 'api' && parts[2] === 'events' && parts[3] ? [null, parts[3]] : null;
	if (request.method === 'GET' && eventDetailMatch) {
		return handleGetEventDetail(eventDetailMatch[1], url, env, session);
	}

	return jsonResponse({ error: 'not_found' }, 404);
}

/**
 * Ownership gate: 404 when `project_id` does not exist, 403 when it is not
 * owned by the session user (per endpoints-draft.md). Returns null when access
 * is allowed.
 */
async function checkProjectAccess(projectId, session, env) {
	const row = await env.DB.prepare('SELECT owner_id FROM projects WHERE project_id = ?')
		.bind(projectId)
		.first();
	if (!row) return jsonResponse({ error: 'unknown_project' }, 404);
	if (row.owner_id !== session.userId) return jsonResponse({ error: 'forbidden' }, 403);
	return null;
}

/**
 * Handle `GET /api/events`.
 *
 * On success returns JSON:
 *   { events: Event[], next_cursor: string | null, has_more: boolean }
 * Each `Event` is shaped by `shapeEvent` in query.js — envelope columns merged
 * with the type-specific fields stored in the JSON `payload` column. `country`
 * is a server enrichment surfaced on every event type. See
 * docs/backend/api/event-schema-draft.md.
 *
 * On validation failure returns 400 with `{ error, param }`.
 */
async function handleGetEvents(url, env, session) {
	let params;
	try {
		params = parseQuery(url);
	} catch (err) {
		if (err instanceof ValidationError) {
			return jsonResponse({ error: err.code, param: err.param }, 400);
		}
		throw err;
	}

	const { projectId, type, since, until, cursor, limit } = params;

	const denied = await checkProjectAccess(projectId, session, env);
	if (denied) return denied;

	const args = [projectId, type, since, until];
	let cursorClause = '';
	if (cursor) {
		cursorClause = 'AND (timestamp < ? OR (timestamp = ? AND event_id < ?)) ';
		args.push(cursor.t, cursor.t, cursor.id);
	}
	args.push(limit + 1);

	const sql =
		'SELECT event_id, event_type, timestamp, environment, deploy_id, received_at, country, payload ' +
		'FROM events ' +
		'WHERE project_id = ? AND event_type = ? AND timestamp >= ? AND timestamp <= ? ' +
		cursorClause +
		'ORDER BY timestamp DESC, event_id DESC LIMIT ?';

	const { results } = await env.DB.prepare(sql).bind(...args).all();

	const hasMore = results.length > limit;
	const dataRows = hasMore ? results.slice(0, limit) : results;

	let nextCursor = null;
	if (hasMore) {
		const last = dataRows[dataRows.length - 1];
		nextCursor = encodeCursor({ t: last.timestamp, id: last.event_id });
	}

	return jsonResponse(
		{
			events: dataRows.map(shapeEvent),
			next_cursor: nextCursor,
			has_more: hasMore,
		},
		200,
	);
}

/**
 * Handle `GET /api/summary`.
 *
 * Aggregated counts + zero-filled hourly/daily timeseries for the dashboard
 * overview. Runs four read-only aggregates in one D1 batch (errors series,
 * feedback series, performance samples, recent-error existence for
 * site_status), then `assembleSummary` shapes the JSON. Contract:
 * docs/backend/api/endpoints-draft.md §GET /api/summary.
 *
 * On validation failure returns 400 with `{ error, param }`.
 */
async function handleGetSummary(url, env, session) {
	let params;
	try {
		params = parseSummaryQuery(url);
	} catch (err) {
		if (err instanceof ValidationError) {
			return jsonResponse({ error: err.code, param: err.param }, 400);
		}
		throw err;
	}

	const { projectId, window } = params;

	const denied = await checkProjectAccess(projectId, session, env);
	if (denied) return denied;
	const now = Date.now();
	const plan = buildBucketPlan(window, now);
	const nowISO = new Date(now).toISOString();
	const recentSince = new Date(now - SITE_STATUS_WINDOW_MS).toISOString();

	// Every aggregate is bounded `timestamp >= windowStart AND timestamp <= now`
	// (matching /api/events, which bounds both sides). The upper bound keeps the
	// observed interval identical across all four queries and the now-floored
	// bucket grid, so a future-dated row (clock skew) can't count toward
	// site_status without also showing in totals, or vice versa.
	//
	// bucketFmt is a closed internal whitelist (see summary.js WINDOWS), never
	// user input, so it is safe to inline; all runtime values are bound.
	const errorStmt = env.DB.prepare(
		`SELECT strftime('${plan.bucketFmt}', timestamp) AS bucket, COUNT(*) AS count ` +
			'FROM events WHERE project_id = ? AND event_type = ? AND timestamp >= ? AND timestamp <= ? GROUP BY bucket',
	).bind(projectId, 'error', plan.windowStartISO, nowISO);

	const feedbackStmt = env.DB.prepare(
		`SELECT strftime('${plan.bucketFmt}', timestamp) AS bucket, COUNT(*) AS count, ` +
			"SUM(CAST(json_extract(payload, '$.feedback_rating') AS REAL)) AS sum_rating " +
			'FROM events WHERE project_id = ? AND event_type = ? AND timestamp >= ? AND timestamp <= ? GROUP BY bucket',
	).bind(projectId, 'feedback', plan.windowStartISO, nowISO);

	// p75 per Web Vital, computed in SQL so we never load raw samples into the
	// worker. Nearest-rank: rank the values per metric, pick the row at
	// ceil(0.75 * n) == (3*n + 3)/4 (1-based) — an actual observed value, no
	// interpolation, so LCP stays integral and CLS keeps its precision. A metric
	// with no samples yields no row and surfaces as null in assembleSummary.
	const perfStmt = env.DB.prepare(
		'SELECT metric_name, value AS p75 FROM (' +
			"SELECT json_extract(payload, '$.metric_name') AS metric_name, " +
			"CAST(json_extract(payload, '$.metric_value') AS REAL) AS value, " +
			"ROW_NUMBER() OVER (PARTITION BY json_extract(payload, '$.metric_name') " +
			"ORDER BY CAST(json_extract(payload, '$.metric_value') AS REAL)) AS rn, " +
			"COUNT(*) OVER (PARTITION BY json_extract(payload, '$.metric_name')) AS cnt " +
			'FROM events WHERE project_id = ? AND event_type = ? AND timestamp >= ? AND timestamp <= ?' +
			') WHERE rn = (3 * cnt + 3) / 4',
	).bind(projectId, 'performance', plan.windowStartISO, nowISO);

	const recentErrorStmt = env.DB.prepare(
		'SELECT COUNT(*) AS count FROM events WHERE project_id = ? AND event_type = ? AND timestamp >= ? AND timestamp <= ?',
	).bind(projectId, 'error', recentSince, nowISO);

	const [errorRes, feedbackRes, perfRes, recentRes] = await env.DB.batch([
		errorStmt,
		feedbackStmt,
		perfStmt,
		recentErrorStmt,
	]);

	const summary = assembleSummary({
		projectId,
		window,
		plan,
		generatedAt: nowISO,
		errorRows: errorRes.results,
		feedbackRows: feedbackRes.results,
		perfP75Rows: perfRes.results,
		recentErrorCount: recentRes.results[0].count,
	});

	return jsonResponse(summary, 200);
}

/**
 * Handle `POST /api/login`.
 * Verifies email + password, creates a session row, sets signed cookie.
 */
async function handleLogin(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'bad_json' }, 400); }

  const { email, password } = body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return jsonResponse({ error: 'missing_fields', message: 'email and password required' }, 400);
  }

  // Look up user
  const user = await env.DB.prepare(
    'SELECT id, email, password_hash, salt, iterations FROM users WHERE email = ?'
  ).bind(email).first();

  if (!user) return jsonResponse({ error: 'invalid_credentials' }, 401);

  // Verify password
  const valid = await verifyPassword(password, user.password_hash, user.salt, user.iterations);
  if (!valid) return jsonResponse({ error: 'invalid_credentials' }, 401);

  // Create session (7-day expiry per ADR-0005)
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    'INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(sessionId, user.id, expiresAt).run();

  // Sign cookie
  const signed = await signSession(sessionId, env.SESSION_SECRET);

  // Fetch user's projects
  const { results: projects } = await env.DB.prepare(
    'SELECT project_id, name FROM projects WHERE owner_id = ?'
  ).bind(user.id).all();

  const headers = {
    'Content-Type': 'application/json',
    'Set-Cookie': `wt_session=${signed}; HttpOnly; Secure; SameSite=None; Max-Age=${7 * 24 * 60 * 60}`,
  };

  return new Response(JSON.stringify({
    user: { id: user.id, email: user.email },
    projects,
  }), { status: 200, headers });
}

/**
 * Handle `POST /api/logout`.
 * Deletes the session row (server-side revocation per ADR-0005) and clears
 * the cookie.
 */
async function handleLogout(session, env) {
	await env.DB.prepare('DELETE FROM sessions WHERE session_id = ?').bind(session.sessionId).run();
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Set-Cookie': 'wt_session=; HttpOnly; Secure; SameSite=None; Max-Age=0',
		},
	});
}

/**
 * Handle `GET /api/events/:event_id`.
 *
 * Returns the full shaped event plus the nearest deploy event at-or-before
 * the event's timestamp in the same project (deploy correlation).
 * 404 on unknown event_id; 403 if the project is not owned by the session user.
 */
async function handleGetEventDetail(eventId, url, env, session) {
	const projectId = url.searchParams.get('project_id');
	if (!projectId) return jsonResponse({ error: 'missing_param', param: 'project_id' }, 400);

	const denied = await checkProjectAccess(projectId, session, env);
	if (denied) return denied;

	// Fetch the event
	const row = await env.DB.prepare(
		'SELECT event_id, event_type, timestamp, environment, deploy_id, received_at, country, payload ' +
		'FROM events WHERE event_id = ? AND project_id = ?'
	).bind(eventId, projectId).first();

	if (!row) return jsonResponse({ error: 'not_found' }, 404);

	const event = shapeEvent(row);

	// Deploy correlation: nearest deploy at-or-before this event's timestamp
	const deployRow = await env.DB.prepare(
		'SELECT event_id, event_type, timestamp, environment, deploy_id, received_at, country, payload ' +
		'FROM events ' +
		'WHERE project_id = ? AND event_type = ? AND timestamp <= ? ' +
		'ORDER BY timestamp DESC, event_id DESC LIMIT 1'
	).bind(projectId, 'deploy', event.timestamp).first();

	const correlatedDeploy = deployRow ? shapeEvent(deployRow) : null;

	return jsonResponse({ event, correlated_deploy: correlatedDeploy }, 200);
}
