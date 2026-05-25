import { env, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from '../src/query.js';

const PROJECT_A = 'wt_aaaa';
const PROJECT_B = 'wt_bbbb';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

async function insert(row) {
	const cols = Object.keys(row);
	const placeholders = cols.map(() => '?').join(', ');
	await env.DB.prepare(`INSERT INTO events (${cols.join(', ')}) VALUES (${placeholders})`)
		.bind(...cols.map((c) => row[c]))
		.run();
}

let seed;

beforeEach(async () => {
	const now = Date.now();
	const t = (ms) => new Date(now - ms).toISOString();

	seed = {
		// 3 errors for PROJECT_A, increasing recency (e1 < e2 < e3 in time).
		// Type-specific fields live in the JSON `payload` column, mirroring what
		// workers/ingest writes; received_at is NOT NULL in the schema.
		e1: { event_id: 'e1', project_id: PROJECT_A, event_type: 'error', timestamp: t(2 * HOUR), environment: 'prod', received_at: t(2 * HOUR - 1000), payload: JSON.stringify({ message: 'oops 1', name: 'Error', stack: '...', handled: false }) },
		e2: { event_id: 'e2', project_id: PROJECT_A, event_type: 'error', timestamp: t(1 * HOUR), environment: 'prod', received_at: t(1 * HOUR - 1000), country: 'US', payload: JSON.stringify({ message: 'oops 2', name: 'Error', stack: '...', handled: true }) },
		e3: { event_id: 'e3', project_id: PROJECT_A, event_type: 'error', timestamp: t(0.5 * HOUR), environment: 'prod', received_at: t(0.5 * HOUR - 1000), payload: JSON.stringify({ message: 'oops 3', name: 'TypeError', stack: '...', handled: false }) },
		p1: { event_id: 'p1', project_id: PROJECT_A, event_type: 'performance', timestamp: t(1.5 * HOUR), environment: 'prod', received_at: t(1.5 * HOUR - 1000), payload: JSON.stringify({ metric_name: 'LCP', metric_value: 2456, metric_rating: 'needs-improvement' }) },
		pv1: { event_id: 'pv1', project_id: PROJECT_A, event_type: 'pageview', timestamp: t(0.75 * HOUR), environment: 'prod', received_at: t(0.75 * HOUR - 1000), country: 'US', payload: JSON.stringify({ url: 'https://example.com/checkout', session_id: 's-pv', user_agent: 'UA', referrer: 'https://google.com/' }) },
		d1: { event_id: 'd1', project_id: PROJECT_A, event_type: 'deploy', timestamp: t(3 * HOUR), environment: 'prod', deploy_id: 'b1f2a4d', received_at: t(3 * HOUR - 1000), country: 'GB', payload: JSON.stringify({ version: 'v0.1.0' }) },
		eB: { event_id: 'eB', project_id: PROJECT_B, event_type: 'error', timestamp: t(1 * HOUR), environment: 'prod', received_at: t(1 * HOUR - 1000), payload: JSON.stringify({ message: 'other project', name: 'Error', stack: '...', handled: false }) },
		eOld: { event_id: 'eOld', project_id: PROJECT_A, event_type: 'error', timestamp: t(10 * DAY), environment: 'prod', received_at: t(10 * DAY - 1000), payload: JSON.stringify({ message: 'old', name: 'Error', stack: '...', handled: false }) },
	};

	for (const row of Object.values(seed)) {
		await insert(row);
	}
});

describe('watchtower-api: scaffold routing', () => {
	it('OPTIONS preflight returns 204 with CORS', async () => {
		const r = await SELF.fetch('http://x/api/events', { method: 'OPTIONS' });
		expect(r.status).toBe(204);
		expect(r.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(r.headers.get('Access-Control-Allow-Methods')).toContain('GET');
	});

	it('unknown routes return 404', async () => {
		const r = await SELF.fetch('http://x/api/unknown');
		expect(r.status).toBe(404);
	});
});

describe('GET /api/events: validation', () => {
	it('missing project_id -> 400 missing_param', async () => {
		const r = await SELF.fetch('http://x/api/events');
		expect(r.status).toBe(400);
		expect(await r.json()).toEqual({ error: 'missing_param', param: 'project_id' });
	});

	it('unknown project_id -> 200 with empty events', async () => {
		// sprint-4 (ADR-0005): once session auth lands, unknown/unowned
		// project_id must return 404 per endpoints-draft.md. Flip this
		// expectation then; the placeholder behavior is temporary.
		const r = await SELF.fetch('http://x/api/events?project_id=wt_nope');
		expect(r.status).toBe(200);
		expect(await r.json()).toEqual({ events: [], next_cursor: null, has_more: false });
	});

	it('type=garbage -> 400 invalid_param', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}&type=garbage`);
		expect(r.status).toBe(400);
		expect(await r.json()).toEqual({ error: 'invalid_param', param: 'type' });
	});

	it('limit=0 -> 400 (strict, not clamped)', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}&limit=0`);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('limit');
	});

	it('limit=201 -> 400 (strict, not clamped)', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}&limit=201`);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('limit');
	});

	it('since=not-a-date -> 400', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}&since=zzz`);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('since');
	});

	it('malformed cursor -> 400', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}&cursor=%21%21%21%21`);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('cursor');
	});

	it('since > until -> 400 invalid_param=until', async () => {
		const future = new Date(Date.now() + HOUR).toISOString();
		const past = new Date(Date.now() - HOUR).toISOString();
		const r = await SELF.fetch(
			`http://x/api/events?project_id=${PROJECT_A}&since=${future}&until=${past}`,
		);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('until');
	});

	it('cursor.t before since -> 400 invalid_param=cursor', async () => {
		const stale = encodeCursor({ t: '2020-01-01T00:00:00.000Z', id: 'x' });
		const r = await SELF.fetch(
			`http://x/api/events?project_id=${PROJECT_A}&since=1h&cursor=${encodeURIComponent(stale)}`,
		);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('cursor');
	});

	it('cursor.t after until -> 400 invalid_param=cursor', async () => {
		const future = encodeCursor({ t: '2099-01-01T00:00:00.000Z', id: 'x' });
		const r = await SELF.fetch(
			`http://x/api/events?project_id=${PROJECT_A}&cursor=${encodeURIComponent(future)}`,
		);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('cursor');
	});
});

describe('GET /api/events: SQL-injection safety', () => {
	it('project_id with SQL meta-chars is bound, not interpolated', async () => {
		// Belt-and-braces: parameter binding makes this a literal string match
		// against project_id, so the response should be empty rather than
		// returning every row in the table.
		const evil = encodeURIComponent("' OR 1=1 --");
		const r = await SELF.fetch(`http://x/api/events?project_id=${evil}`);
		expect(r.status).toBe(200);
		expect((await r.json()).events).toEqual([]);
	});
});

describe('cursor codec', () => {
	it('round-trip preserves t and id', () => {
		const t = '2026-05-09T14:32:11.234Z';
		const id = 'evt_abc123';
		expect(decodeCursor(encodeCursor({ t, id }))).toEqual({ t, id });
	});

	it('property: arbitrary {t, id} pairs survive a round-trip', () => {
		for (let i = 0; i < 50; i++) {
			const t = new Date(Math.floor(Math.random() * Date.now())).toISOString();
			const id = `evt_${Math.random().toString(36).slice(2)}`;
			expect(decodeCursor(encodeCursor({ t, id }))).toEqual({ t, id });
		}
	});
});

describe('GET /api/events: filtering and shaping', () => {
	it('default type=error returns only errors, DESC by timestamp', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}`);
		expect(r.status).toBe(200);
		const body = await r.json();
		expect(body.events.map((e) => e.event_id)).toEqual(['e3', 'e2', 'e1']);
		for (const e of body.events) expect(e.event_type).toBe('error');
	});

	it('type=performance filters to performance events', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}&type=performance`);
		const body = await r.json();
		expect(body.events.map((e) => e.event_id)).toEqual(['p1']);
		expect(body.events[0].metric_name).toBe('LCP');
		expect(body.events[0].metric_value).toBe(2456);
	});

	it('type=pageview returns pageviews with referrer + browser context + country', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}&type=pageview`);
		expect(r.status).toBe(200);
		const body = await r.json();
		expect(body.events.map((e) => e.event_id)).toEqual(['pv1']);
		const pv = body.events[0];
		expect(pv.event_type).toBe('pageview');
		expect(pv.referrer).toBe('https://google.com/');
		expect(pv.url).toBe('https://example.com/checkout');
		expect(pv.session_id).toBe('s-pv');
		expect(pv.country).toBe('US');
	});

	it("does not leak other projects' events", async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}`);
		const body = await r.json();
		expect(body.events.map((e) => e.event_id)).not.toContain('eB');
	});

	it('default since=24h excludes 10-day-old event', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}`);
		const body = await r.json();
		expect(body.events.map((e) => e.event_id)).not.toContain('eOld');
	});

	it('since=30d includes 10-day-old event', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}&since=30d`);
		const body = await r.json();
		expect(body.events.map((e) => e.event_id)).toContain('eOld');
	});

	it('error row shape: boolean handled, no metric_*/feedback_* keys, server-enriched fields surface', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}`);
		const body = await r.json();
		const e2 = body.events.find((e) => e.event_id === 'e2');
		expect(e2.handled).toBe(true);
		expect(e2.message).toBe('oops 2');
		expect(e2.name).toBe('Error');
		expect(e2.metric_name).toBeUndefined();
		expect(e2.feedback_rating).toBeUndefined();
		expect(e2.received_at).toBe(seed.e2.received_at);
		expect(e2.country).toBe('US');
		expect(e2.project_id).toBeUndefined();
	});

	it('deploy row shape: version + received_at + country present, no browser-context triplet', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}&type=deploy`);
		const body = await r.json();
		expect(body.events).toHaveLength(1);
		const d = body.events[0];
		expect(d.event_id).toBe('d1');
		expect(d.version).toBe('v0.1.0');
		expect(d.deploy_id).toBe('b1f2a4d');
		expect(d.received_at).toBe(seed.d1.received_at);
		expect(d.url).toBeUndefined();
		expect(d.user_agent).toBeUndefined();
		expect(d.session_id).toBeUndefined();
		expect(d.country).toBe('GB');
	});
});

describe('GET /api/events: pagination', () => {
	it('limit=2 returns 2 errors + non-null next_cursor + has_more=true', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}&limit=2`);
		const body = await r.json();
		expect(body.events).toHaveLength(2);
		expect(body.has_more).toBe(true);
		expect(body.next_cursor).not.toBeNull();
		expect(body.events.map((e) => e.event_id)).toEqual(['e3', 'e2']);
	});

	it('follow next_cursor returns remaining error, has_more=false', async () => {
		const r1 = await SELF.fetch(`http://x/api/events?project_id=${PROJECT_A}&limit=2`);
		const b1 = await r1.json();
		const r2 = await SELF.fetch(
			`http://x/api/events?project_id=${PROJECT_A}&limit=2&cursor=${encodeURIComponent(b1.next_cursor)}`,
		);
		const b2 = await r2.json();
		expect(b2.events.map((e) => e.event_id)).toEqual(['e1']);
		expect(b2.has_more).toBe(false);
		expect(b2.next_cursor).toBeNull();
	});
});
