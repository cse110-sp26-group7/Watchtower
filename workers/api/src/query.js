/**
 * Query-parsing, cursor codec, and row-shaping helpers for GET /api/events.
 *
 * Contract: docs/backend/api/endpoints-draft.md §GET /api/events.
 * Row shape: docs/backend/api/event-schema-draft.md.
 */

/**
 * Error for a rejected query param. Carries machine-readable `code` and `param`
 * so the handler can map it to a structured 400 response.
 *
 * @param {string} code - The failure kind, e.g. `'missing_param'` or
 *   `'invalid_param'`.
 * @param {string} param - The offending query-string parameter name.
 */
export class ValidationError extends Error {
	constructor(code, param) {
		super(`${code}: ${param}`);
		this.code = code;
		this.param = param;
	}
}

const VALID_TYPES = new Set(['error', 'performance', 'feedback', 'deploy', 'pageview']);
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
// `since` shorthand: only `<n>h` (hours) and `<n>d` (days). `m` is ambiguous
// (minute vs month) and `w` is unused by the dashboard today — both rejected
// to keep the accepted surface small. Widen here if the UI grows new windows.
const SHORTHAND_RE = /^(\d+)([hd])$/;

function parseRelative(value) {
	const m = SHORTHAND_RE.exec(value);
	if (!m) return null;
	const n = parseInt(m[1], 10);
	if (n < 1) return null;
	const ms = m[2] === 'h' ? n * 3600_000 : n * 86_400_000;
	return new Date(Date.now() - ms).toISOString();
}

function parseInstant(value) {
	if (!ISO_RE.test(value)) return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	return d.toISOString();
}

/**
 * Parse and validate the GET /api/events query string. `since`/`until` accept
 * either a relative shorthand (`<n>h`/`<n>d`) or an ISO-8601 instant; a reused
 * cursor outside the [since, until] window is rejected (see inline note).
 *
 * @param {URL} url - The request URL whose `searchParams` carry `project_id`,
 *   and the optional `type`, `since`, `until`, `limit`, and `cursor`.
 * @returns {{ projectId: string, type: string, since: string, until: string,
 *   cursor: ({ t: string, id: string } | null), limit: number }} The validated
 *   query, with `since`/`until` normalized to ISO-8601 and `limit` in [1, 200].
 * @throws {ValidationError} `missing_param` when `project_id` is absent, or
 *   `invalid_param` for a bad `type`, `since`, `until`, `limit`, or `cursor`.
 */
export function parseQuery(url) {
	const sp = url.searchParams;

	const projectId = sp.get('project_id');
	if (!projectId) throw new ValidationError('missing_param', 'project_id');

	const type = sp.get('type') ?? 'error';
	if (!VALID_TYPES.has(type)) throw new ValidationError('invalid_param', 'type');

	const sinceRaw = sp.get('since') ?? '24h';
	const since = parseRelative(sinceRaw) ?? parseInstant(sinceRaw);
	if (!since) throw new ValidationError('invalid_param', 'since');

	const untilRaw = sp.get('until');
	const until = untilRaw === null ? new Date().toISOString() : parseInstant(untilRaw);
	if (!until) throw new ValidationError('invalid_param', 'until');

	if (since > until) throw new ValidationError('invalid_param', 'until');

	const limitRaw = sp.get('limit');
	const limit = limitRaw === null ? 50 : Number(limitRaw);
	if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
		throw new ValidationError('invalid_param', 'limit');
	}

	let cursor = null;
	const cursorRaw = sp.get('cursor');
	if (cursorRaw !== null) {
		cursor = decodeCursor(cursorRaw);
		if (!cursor) throw new ValidationError('invalid_param', 'cursor');
		// Cursor reused across a different window resolves to either empty
		// (cursor.t < since) or duplicate-prefix results (cursor.t > until).
		// Reject so the client notices the mismatch instead of silently
		// paginating wrong.
		if (cursor.t < since || cursor.t > until) {
			throw new ValidationError('invalid_param', 'cursor');
		}
	}

	return { projectId, type, since, until, cursor, limit };
}

// Cursor is unsigned base64url JSON. A client can craft an arbitrary {t, id}
// pair, but every query is still scoped by project_id/type/since/until, so the
// worst case is they paginate weirdly through their own data — no cross-tenant
// leak. Revisit (HMAC) if cursors ever encode anything more sensitive.
/**
 * Encode a pagination cursor as an unsigned base64url string.
 *
 * @param {{ t: string, id: string }} cursor - The last row's timestamp and id.
 * @returns {string} The base64url-encoded cursor (no padding, URL-safe alphabet).
 */
export function encodeCursor({ t, id }) {
	return btoa(JSON.stringify({ t, id }))
		.replace(/=+$/, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

/**
 * Decode a base64url cursor back into its `{ t, id }` pair. Tolerant of missing
 * padding; returns null on any malformed input rather than throwing.
 *
 * @param {string} s - The base64url cursor string from the `cursor` param.
 * @returns {({ t: string, id: string } | null)} The decoded cursor, or null if
 *   it is malformed or missing the required string fields.
 */
export function decodeCursor(s) {
	try {
		let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
		while (b64.length % 4) b64 += '=';
		const parsed = JSON.parse(atob(b64));
		if (typeof parsed?.t !== 'string' || typeof parsed?.id !== 'string') return null;
		return { t: parsed.t, id: parsed.id };
	} catch {
		return null;
	}
}

// Envelope columns present on every row. `url`, `user_agent`, and `session_id`
// (browser context) plus all type-specific fields live inside the JSON
// `payload` column (written by workers/ingest). `country` is a server
// enrichment (cf-ipcountry) kept as its own column and surfaced on every event
// type, deploys included — the CI runner still has an inbound country.
const ENVELOPE = ['event_id', 'event_type', 'timestamp', 'environment', 'deploy_id', 'received_at', 'country'];

/**
 * Shape a raw DB row into an API event object. Spreads the JSON `payload`
 * first, then overlays the authoritative envelope columns (which win on key
 * collisions); null/undefined values are dropped from both.
 *
 * @param {object} row - A DB row with envelope columns and a JSON `payload`
 *   string (type-specific fields).
 * @returns {object} The merged event: payload fields plus envelope columns.
 */
export function shapeEvent(row) {
	const out = {};
	// Spread the payload first; the authoritative envelope columns below win on
	// any key collision. JSON.parse restores native types (e.g. `handled`
	// boolean, numeric metric values), so no per-field coercion is needed.
	const payload = row.payload ? JSON.parse(row.payload) : {};
	for (const [k, v] of Object.entries(payload)) {
		if (v !== null && v !== undefined) out[k] = v;
	}
	for (const f of ENVELOPE) {
		if (row[f] !== null && row[f] !== undefined) out[f] = row[f];
	}
	return out;
}
