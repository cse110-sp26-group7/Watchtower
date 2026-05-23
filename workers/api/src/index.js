/**
 * watchtower-api — Reporting Worker.
 *
 * Serves dashboard read traffic. See docs/ARCHITECTURE.md §3.4 and
 * docs/backend/api/endpoints-draft.md for the endpoint contract.
 */

import { encodeCursor, parseQuery, shapeEvent, ValidationError } from './query.js';

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
