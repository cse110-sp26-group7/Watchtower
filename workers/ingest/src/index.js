// Spec: docs/backend/api/endpoints-draft.md (POST /ingest)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const MAX_BYTES = 1024 *;
const MAX_EVENTS = 100;

// ON CONFLICT(event_id) DO NOTHING (not INSERT OR IGNORE) so PK replays are
// absorbed while constraint violations still surface as errors.
const INSERT_SQL = `
  INSERT INTO events (
    event_id, project_id, event_type, timestamp, environment, deploy_id,
    received_at, country, payload
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(event_id) DO NOTHING
`;

function err(status, code, message) {
  return Response.json({ error: code, message }, { status, headers: CORS });
}

function ok204() {
  return new Response(null, { status: 204, headers: CORS });
}

function bind(stmt, event, ctx) {
  const {
    event_id,
    event_type,
    timestamp,
    environment,
    deploy_id,
    ...rest
  } = event;
  // Browser-emitted events carry a user_agent (server-enriched from the
  // request header). Deploy events have no browser context.
  const payload = event_type === 'deploy'
    ? rest
    : { ...rest, user_agent: ctx.userAgent };
  return stmt.bind(
    event_id,
    ctx.projectId,
    event_type,
    timestamp,
    environment,
    deploy_id ?? null,
    ctx.receivedAt,
    ctx.country,
    JSON.stringify(payload),
  );
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      if (pathname !== '/ingest') return new Response(null, { status: 404 });
      return new Response(null, { status: 204, headers: CORS });
    }

    if (pathname !== '/ingest') return err(404, 'not_found', 'Unknown route');
    if (request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS', ...CORS } });
    }

    const contentLength = parseInt(request.headers.get('Content-Length') ?? '0', 10);
    if (contentLength > MAX_BYTES) {
      return err(413, 'payload_too_large', `Body exceeds ${MAX_BYTES} bytes`);
    }

    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BYTES) {
      return err(413, 'payload_too_large', `Body exceeds ${MAX_BYTES} bytes`);
    }

    let body;
    try { body = JSON.parse(text); }
    catch { return err(400, 'bad_json', 'Body is not valid JSON'); }

    if (!body || typeof body.project_id !== 'string' || !Array.isArray(body.events)) {
      return err(400, 'bad_envelope', 'Expected { project_id: string, events: array }');
    }
    if (body.events.length === 0) return ok204();
    if (body.events.length > MAX_EVENTS) {
      return err(413, 'batch_too_large', `Max ${MAX_EVENTS} events per batch`);
    }

    // TODO(Sprint 4): project_id lookup → 401 on unknown id.
    // TODO: rate limiting per provisional policy (60/s per project, 30/s per IP).

    const ctx = {
      projectId: body.project_id,
      userAgent: request.headers.get('User-Agent') ?? null,
      country: request.headers.get('CF-IPCountry') ?? null,
      receivedAt: new Date().toISOString(),
    };

    const stmt = env.DB.prepare(INSERT_SQL);
    try {
      // All-or-nothing batch; per-event validation deferred so `error_at` is omitted.
      await env.DB.batch(body.events.map((e) => bind(stmt, e, ctx)));
    } catch (e) {
      console.error('ingest_insert_failed', e);
      return err(400, 'insert_failed', 'Failed to insert events');
    }
    return ok204();
  },
};
