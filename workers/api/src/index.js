/**
 * watchtower-api — Reporting Worker.
 *
 * Serves dashboard read traffic. See docs/ARCHITECTURE.md §3.4 and
 * docs/backend/api/endpoints-draft.md for the endpoint contract.
 */

import { encodeCursor, parseQuery, shapeEvent, ValidationError } from './query.js';
import { assembleSummary, buildBucketPlan, parseSummaryQuery, SITE_STATUS_WINDOW_MS } from './summary.js';

// TODO(sprint-4): once session cookies land (ADR-0005), switch to a specific
// allowed origin and add `Access-Control-Allow-Credentials: true` — `*` is
// incompatible with credentialed requests.
const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(body, status) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
	});
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		if (request.method === 'GET' && url.pathname === '/api/events') {
			return handleGetEvents(url, env);
		}

		if (request.method === 'GET' && url.pathname === '/api/summary') {
			return handleGetSummary(url, env);
		}

		return jsonResponse({ error: 'not_found' }, 404);
	},
};

// TODO(sprint-4): require signed session cookie per ADR-0005. At that point,
// unknown/unowned `project_id` should return 404 (per endpoints-draft.md)
// instead of the current empty-200 placeholder.
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
async function handleGetEvents(url, env) {
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

// TODO(sprint-4): require signed session cookie per ADR-0005 (Sprint 4 Task 7
// flips this marker, same as /api/events). Until then an unknown/unowned
// project_id yields a zeroed 200 — consistent with handleGetEvents — rather
// than the 403/404 in endpoints-draft.md.
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
async function handleGetSummary(url, env) {
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
