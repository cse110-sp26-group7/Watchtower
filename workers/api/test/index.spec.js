import { env, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { signSession } from '../src/auth.js';
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

// All /api/* routes are session-gated (ADR-0005). `fetchAuthed` rides a
// usr_demo session cookie plus the CSRF header; the gate itself is covered in
// auth-middleware.spec.js.
let authHeaders;

async function fetchAuthed(url, init = {}) {
	return SELF.fetch(url, { ...init, headers: { ...authHeaders, ...init.headers } });
}

let seed;

beforeEach(async () => {
	// usr_demo is seeded by the migrations; the test projects must exist and be
	// owned by it to pass the ownership gate.
	for (const [id, name] of [[PROJECT_A, 'Project A'], [PROJECT_B, 'Project B']]) {
		await env.DB.prepare(
			"INSERT INTO projects (project_id, name, owner_id) VALUES (?, ?, 'usr_demo')",
		).bind(id, name).run();
	}

	const sessionId = crypto.randomUUID();
	await env.DB.prepare(
		"INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, 'usr_demo', ?)",
	).bind(sessionId, new Date(Date.now() + HOUR).toISOString()).run();
	authHeaders = {
		'Cookie': `wt_session=${await signSession(sessionId, env.SESSION_SECRET)}`,
		'X-Watchtower-Auth': '1',
	};
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
	it('OPTIONS preflight returns 204 with CORS for the dashboard origin', async () => {
		const origin = 'https://watchtower-page.pages.dev';
		const r = await fetchAuthed('http://x/api/events', {
			method: 'OPTIONS',
			headers: { Origin: origin },
		});
		expect(r.status).toBe(204);
		expect(r.headers.get('Access-Control-Allow-Origin')).toBe(origin);
		expect(r.headers.get('Access-Control-Allow-Methods')).toContain('GET');
	});

	it('unknown routes return 404', async () => {
		const r = await fetchAuthed('http://x/api/unknown');
		expect(r.status).toBe(404);
	});
});

describe('GET /api/events: validation', () => {
	it('missing project_id -> 400 missing_param', async () => {
		const r = await fetchAuthed('http://x/api/events');
		expect(r.status).toBe(400);
		expect(await r.json()).toEqual({ error: 'missing_param', param: 'project_id' });
	});

	it('unknown project_id -> 404 unknown_project', async () => {
		// ADR-0005 enforcement: unknown project_id is 404 per endpoints-draft.md
		// (was a 200-empty placeholder before the session gate landed).
		const r = await fetchAuthed('http://x/api/events?project_id=wt_nope');
		expect(r.status).toBe(404);
		expect((await r.json()).error).toBe('unknown_project');
	});

	it('type=garbage -> 400 invalid_param', async () => {
		const r = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}&type=garbage`);
		expect(r.status).toBe(400);
		expect(await r.json()).toEqual({ error: 'invalid_param', param: 'type' });
	});

	it('limit=0 -> 400 (strict, not clamped)', async () => {
		const r = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}&limit=0`);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('limit');
	});

	it('limit=201 -> 400 (strict, not clamped)', async () => {
		const r = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}&limit=201`);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('limit');
	});

	it('since=not-a-date -> 400', async () => {
		const r = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}&since=zzz`);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('since');
	});

	it('malformed cursor -> 400', async () => {
		const r = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}&cursor=%21%21%21%21`);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('cursor');
	});

	it('since > until -> 400 invalid_param=until', async () => {
		const future = new Date(Date.now() + HOUR).toISOString();
		const past = new Date(Date.now() - HOUR).toISOString();
		const r = await fetchAuthed(
			`http://x/api/events?project_id=${PROJECT_A}&since=${future}&until=${past}`,
		);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('until');
	});

	it('cursor.t before since -> 400 invalid_param=cursor', async () => {
		const stale = encodeCursor({ t: '2020-01-01T00:00:00.000Z', id: 'x' });
		const r = await fetchAuthed(
			`http://x/api/events?project_id=${PROJECT_A}&since=1h&cursor=${encodeURIComponent(stale)}`,
		);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('cursor');
	});

	it('cursor.t after until -> 400 invalid_param=cursor', async () => {
		const future = encodeCursor({ t: '2099-01-01T00:00:00.000Z', id: 'x' });
		const r = await fetchAuthed(
			`http://x/api/events?project_id=${PROJECT_A}&cursor=${encodeURIComponent(future)}`,
		);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('cursor');
	});
});

describe('GET /api/events: SQL-injection safety', () => {
	it('project_id with SQL meta-chars is bound, not interpolated', async () => {
		// Belt-and-braces: parameter binding makes this a literal string match
		// against project_id, so the ownership lookup finds no such project
		// (404) rather than matching every row in the table.
		const evil = encodeURIComponent("' OR 1=1 --");
		const r = await fetchAuthed(`http://x/api/events?project_id=${evil}`);
		expect(r.status).toBe(404);
		expect((await r.json()).error).toBe('unknown_project');
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
		const r = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}`);
		expect(r.status).toBe(200);
		const body = await r.json();
		expect(body.events.map((e) => e.event_id)).toEqual(['e3', 'e2', 'e1']);
		for (const e of body.events) expect(e.event_type).toBe('error');
	});

	it('type=performance filters to performance events', async () => {
		const r = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}&type=performance`);
		const body = await r.json();
		expect(body.events.map((e) => e.event_id)).toEqual(['p1']);
		expect(body.events[0].metric_name).toBe('LCP');
		expect(body.events[0].metric_value).toBe(2456);
	});

	it('type=pageview returns pageviews with referrer + browser context + country', async () => {
		const r = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}&type=pageview`);
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
		const r = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}`);
		const body = await r.json();
		expect(body.events.map((e) => e.event_id)).not.toContain('eB');
	});

	it('default since=24h excludes 10-day-old event', async () => {
		const r = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}`);
		const body = await r.json();
		expect(body.events.map((e) => e.event_id)).not.toContain('eOld');
	});

	it('since=30d includes 10-day-old event', async () => {
		const r = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}&since=30d`);
		const body = await r.json();
		expect(body.events.map((e) => e.event_id)).toContain('eOld');
	});

	it('error row shape: boolean handled, no metric_*/feedback_* keys, server-enriched fields surface', async () => {
		const r = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}`);
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
		const r = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}&type=deploy`);
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
		const r = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}&limit=2`);
		const body = await r.json();
		expect(body.events).toHaveLength(2);
		expect(body.has_more).toBe(true);
		expect(body.next_cursor).not.toBeNull();
		expect(body.events.map((e) => e.event_id)).toEqual(['e3', 'e2']);
	});

	it('follow next_cursor returns remaining error, has_more=false', async () => {
		const r1 = await fetchAuthed(`http://x/api/events?project_id=${PROJECT_A}&limit=2`);
		const b1 = await r1.json();
		const r2 = await fetchAuthed(
			`http://x/api/events?project_id=${PROJECT_A}&limit=2&cursor=${encodeURIComponent(b1.next_cursor)}`,
		);
		const b2 = await r2.json();
		expect(b2.events.map((e) => e.event_id)).toEqual(['e1']);
		expect(b2.has_more).toBe(false);
		expect(b2.next_cursor).toBeNull();
	});
});

describe('GET /api/summary', () => {
	const PROJECT_S = 'wt_sum';
	const MIN = 60_000;

	beforeEach(async () => {
		// Register the summary test project under usr_demo so the session-gated
		// ownership check passes.
		await env.DB.prepare(
			"INSERT INTO projects (project_id, name, owner_id) VALUES (?, 'Summary', 'usr_demo')",
		).bind(PROJECT_S).run();
	});

	// Insert one event of `type` for PROJECT_S at `agoMs` before now, with the
	// given payload. received_at + payload are NOT NULL in the schema.
	async function seedEvent(type, agoMs, payload) {
		const ts = new Date(Date.now() - agoMs).toISOString();
		await insert({
			event_id: `s-${type}-${agoMs}-${Math.random().toString(36).slice(2)}`,
			project_id: PROJECT_S,
			event_type: type,
			timestamp: ts,
			environment: 'prod',
			received_at: ts,
			payload: JSON.stringify(payload),
		});
	}

	it('missing project_id -> 400 missing_param', async () => {
		const r = await fetchAuthed('http://x/api/summary');
		expect(r.status).toBe(400);
		expect(await r.json()).toEqual({ error: 'missing_param', param: 'project_id' });
	});

	it('window=1h -> 200 with 60 one-minute buckets', async () => {
		const r = await fetchAuthed(`http://x/api/summary?project_id=${PROJECT_S}&window=1h`);
		expect(r.status).toBe(200);
		const b = await r.json();
		expect(b.window).toBe('1h');
		expect(b.timeseries.bucket_size).toBe('1m');
		expect(b.timeseries.errors).toHaveLength(60);
		const s = b.timeseries.errors;
		expect(new Date(s[1].t) - new Date(s[0].t)).toBe(60_000); // one minute apart
	});

	it('timezone param is accepted but ignored: 200, buckets stay UTC, no tz/warnings fields', async () => {
		const r = await fetchAuthed(`http://x/api/summary?project_id=${PROJECT_S}&timezone=America/New_York`);
		expect(r.status).toBe(200);
		const b = await r.json();
		// Not yet honored — buckets remain the UTC-aligned 24h grid, and the
		// response carries no undocumented timezone/warnings fields.
		expect(b).not.toHaveProperty('timezone');
		expect(b).not.toHaveProperty('warnings');
		expect(b.timeseries.errors).toHaveLength(24);
		expect(b.timeseries.errors[0].t).toMatch(/Z$/);
	});

	it('window=5d -> 400 invalid_param=window', async () => {
		const r = await fetchAuthed(`http://x/api/summary?project_id=${PROJECT_S}&window=5d`);
		expect(r.status).toBe(400);
		expect((await r.json()).param).toBe('window');
	});

	it('unknown project -> 404 unknown_project (ADR-0005 enforcement)', async () => {
		const r = await fetchAuthed('http://x/api/summary?project_id=wt_nobody');
		expect(r.status).toBe(404);
		expect((await r.json()).error).toBe('unknown_project');
	});

	it('empty project -> zeroed 200 with full shape', async () => {
		const r = await fetchAuthed(`http://x/api/summary?project_id=${PROJECT_S}`);
		expect(r.status).toBe(200);
		const b = await r.json();
		expect(b.project_id).toBe(PROJECT_S);
		expect(b.window).toBe('24h');
		expect(typeof b.generated_at).toBe('string');
		expect(b.totals.errors).toBe(0);
		expect(b.totals.feedback_count).toBe(0);
		expect(b.totals.feedback_avg).toBeNull();
		expect(b.totals.performance_p75).toEqual({ LCP: null, FCP: null, TTFB: null, CLS: null, INP: null });
		expect(b.timeseries.bucket_size).toBe('1h');
		expect(b.timeseries.errors).toHaveLength(24);
		expect(b.timeseries.feedback).toHaveLength(24);
		expect(b.timeseries.errors.every((p) => p.count === 0)).toBe(true);
		expect(b.timeseries.feedback.every((p) => p.count === 0 && p.avg === null)).toBe(true);
		expect(b.site_status).toBe('ok');
	});

	it('errors: total = sum of buckets, zero-filled to 24 ascending 1h buckets, window-bounded', async () => {
		await seedEvent('error', 30 * MIN, { message: 'a', name: 'Error', handled: false });
		await seedEvent('error', 2 * 60 * MIN, { message: 'b', name: 'Error', handled: false });
		await seedEvent('error', 5 * 60 * MIN, { message: 'c', name: 'Error', handled: false });
		await seedEvent('error', 25 * 60 * MIN, { message: 'old', name: 'Error', handled: false }); // outside 24h

		const r = await fetchAuthed(`http://x/api/summary?project_id=${PROJECT_S}`);
		const b = await r.json();

		expect(b.totals.errors).toBe(3); // the 25h-old one is excluded
		const series = b.timeseries.errors;
		expect(series).toHaveLength(24);
		expect(series.reduce((acc, p) => acc + p.count, 0)).toBe(3);
		// strictly ascending, exactly 1h apart
		for (let i = 1; i < series.length; i++) {
			const dt = new Date(series[i].t) - new Date(series[i - 1].t);
			expect(dt).toBe(60 * MIN);
		}
	});

	it('only errors count toward totals.errors (type isolation)', async () => {
		await seedEvent('error', 10 * MIN, { message: 'e', name: 'Error', handled: false });
		await seedEvent('performance', 10 * MIN, { metric_name: 'LCP', metric_value: 1000, metric_rating: 'good' });
		await seedEvent('feedback', 10 * MIN, { feedback_rating: 5 });

		const r = await fetchAuthed(`http://x/api/summary?project_id=${PROJECT_S}`);
		const b = await r.json();
		expect(b.totals.errors).toBe(1);
	});

	it('feedback: count-weighted average rounded to 1 decimal', async () => {
		await seedEvent('feedback', 10 * MIN, { feedback_rating: 4 });
		await seedEvent('feedback', 20 * MIN, { feedback_rating: 4 });
		await seedEvent('feedback', 30 * MIN, { feedback_rating: 5 });

		const r = await fetchAuthed(`http://x/api/summary?project_id=${PROJECT_S}`);
		const b = await r.json();
		expect(b.totals.feedback_count).toBe(3);
		expect(b.totals.feedback_avg).toBe(4.3); // 13/3 = 4.333 -> 4.3
		// feedback series carries non-null avg only where there is data
		const withData = b.timeseries.feedback.filter((p) => p.count > 0);
		expect(withData.reduce((acc, p) => acc + p.count, 0)).toBe(3);
	});

	it('performance_p75 per metric, null for metrics with no samples', async () => {
		for (const v of [100, 200, 300, 400]) {
			await seedEvent('performance', 10 * MIN, { metric_name: 'LCP', metric_value: v, metric_rating: 'good' });
		}
		for (const v of [0.1, 0.2, 0.3, 0.4]) {
			await seedEvent('performance', 10 * MIN, { metric_name: 'CLS', metric_value: v, metric_rating: 'good' });
		}
		await seedEvent('performance', 10 * MIN, { metric_name: 'INP', metric_value: 50, metric_rating: 'good' });

		const r = await fetchAuthed(`http://x/api/summary?project_id=${PROJECT_S}`);
		const p75 = (await r.json()).totals.performance_p75;
		expect(p75.LCP).toBe(300); // ceil(0.75*4)=3 -> 3rd smallest
		expect(p75.CLS).toBe(0.3); // precision preserved
		expect(p75.INP).toBe(50); // single sample -> that value
		expect(p75.FCP).toBeNull();
		expect(p75.TTFB).toBeNull();
	});

	it('site_status: issues when an error is within the last 15 min, else ok', async () => {
		await seedEvent('error', 5 * MIN, { message: 'recent', name: 'Error', handled: false });
		const r1 = await fetchAuthed(`http://x/api/summary?project_id=${PROJECT_S}`);
		expect((await r1.json()).site_status).toBe('issues');
	});

	it('site_status: ok when the only error is older than 15 min', async () => {
		await seedEvent('error', 60 * MIN, { message: 'stale', name: 'Error', handled: false });
		const r = await fetchAuthed(`http://x/api/summary?project_id=${PROJECT_S}`);
		const b = await r.json();
		expect(b.totals.errors).toBe(1); // still inside the 24h window
		expect(b.site_status).toBe('ok'); // but outside the 15-min status window
	});

	it('upper-bound invariant: a lone future-dated error counts nowhere (totals 0, site_status ok)', async () => {
		// Clock skew: an event timestamped after "now" must be excluded from every
		// aggregate (errors >= windowStart AND <= now), so totals, the grid, and
		// site_status stay consistent rather than diverging.
		await seedEvent('error', -10 * MIN, { message: 'future', name: 'Error', handled: false });
		const r = await fetchAuthed(`http://x/api/summary?project_id=${PROJECT_S}`);
		const b = await r.json();
		expect(b.totals.errors).toBe(0);
		expect(b.timeseries.errors.reduce((acc, p) => acc + p.count, 0)).toBe(0);
		expect(b.site_status).toBe('ok');
	});

	it('does not count other projects', async () => {
		await insert({
			event_id: 's-other',
			project_id: 'wt_other',
			event_type: 'error',
			timestamp: new Date(Date.now() - 10 * MIN).toISOString(),
			environment: 'prod',
			received_at: new Date(Date.now() - 10 * MIN).toISOString(),
			payload: JSON.stringify({ message: 'x', name: 'Error', handled: false }),
		});
		const r = await fetchAuthed(`http://x/api/summary?project_id=${PROJECT_S}`);
		expect((await r.json()).totals.errors).toBe(0);
	});

	it('window=7d -> 168 hourly buckets', async () => {
		const r = await fetchAuthed(`http://x/api/summary?project_id=${PROJECT_S}&window=7d`);
		const b = await r.json();
		expect(b.window).toBe('7d');
		expect(b.timeseries.bucket_size).toBe('1h');
		expect(b.timeseries.errors).toHaveLength(168);
	});

	it('window=30d -> 30 daily buckets', async () => {
		const r = await fetchAuthed(`http://x/api/summary?project_id=${PROJECT_S}&window=30d`);
		const b = await r.json();
		expect(b.window).toBe('30d');
		expect(b.timeseries.bucket_size).toBe('1d');
		expect(b.timeseries.errors).toHaveLength(30);
		// daily buckets are exactly 24h apart
		const s = b.timeseries.errors;
		expect(new Date(s[1].t) - new Date(s[0].t)).toBe(24 * 60 * MIN);
	});
});
