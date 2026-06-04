import { env, SELF } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { signSession } from '../src/auth.js';

// Session-gate integration tests (ADR-0005 enforcement).
//
// Migrations seed `usr_demo` (owner of `wt_demo`). beforeEach adds a second
// user + project so ownership rejections (403) are exercised against real rows.

const CSRF = { 'X-Watchtower-Auth': '1' };
const DASHBOARD_ORIGIN = 'https://watchtower-page.pages.dev';

const OWNED_PROJECT = 'wt_demo'; // owned by usr_demo (migration seed)
const FOREIGN_PROJECT = 'wt_foreign'; // owned by usr_other

async function createSession(userId, expiresAt) {
	const sessionId = crypto.randomUUID();
	await env.DB.prepare('INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)')
		.bind(sessionId, userId, expiresAt)
		.run();
	const signed = await signSession(sessionId, env.SESSION_SECRET);
	return { sessionId, cookie: `wt_session=${signed}` };
}

async function demoSession() {
	const expires = new Date(Date.now() + 3_600_000).toISOString();
	return createSession('usr_demo', expires);
}

beforeEach(async () => {
	await env.DB.prepare(
		"INSERT INTO users (id, email, password_hash, salt, iterations) VALUES ('usr_other', 'other@watchtower.dev', 'x', 'x', 100000)",
	).run();
	await env.DB.prepare(
		`INSERT INTO projects (project_id, name, owner_id) VALUES ('${FOREIGN_PROJECT}', 'Foreign', 'usr_other')`,
	).run();
});

describe('CSRF header gate', () => {
	it('GET /api/events without X-Watchtower-Auth -> 403', async () => {
		const { cookie } = await demoSession();
		const r = await SELF.fetch(`http://x/api/events?project_id=${OWNED_PROJECT}`, {
			headers: { Cookie: cookie },
		});
		expect(r.status).toBe(403);
		expect((await r.json()).error).toBe('missing_auth_header');
	});

	it('POST /api/login without X-Watchtower-Auth -> 403', async () => {
		const r = await SELF.fetch('http://x/api/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'demo@watchtower.dev', password: 'demo1234' }),
		});
		expect(r.status).toBe(403);
		expect((await r.json()).error).toBe('missing_auth_header');
	});
});

describe('session cookie gate', () => {
	it('no cookie -> 401', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${OWNED_PROJECT}`, {
			headers: CSRF,
		});
		expect(r.status).toBe(401);
		expect((await r.json()).error).toBe('unauthorized');
	});

	it('tampered cookie signature -> 401', async () => {
		const { cookie } = await demoSession();
		const r = await SELF.fetch(`http://x/api/events?project_id=${OWNED_PROJECT}`, {
			headers: { ...CSRF, Cookie: cookie.slice(0, -4) + 'dead' },
		});
		expect(r.status).toBe(401);
	});

	it('valid signature but deleted session row -> 401', async () => {
		const { sessionId, cookie } = await demoSession();
		await env.DB.prepare('DELETE FROM sessions WHERE session_id = ?').bind(sessionId).run();
		const r = await SELF.fetch(`http://x/api/events?project_id=${OWNED_PROJECT}`, {
			headers: { ...CSRF, Cookie: cookie },
		});
		expect(r.status).toBe(401);
	});

	it('expired session -> 401', async () => {
		const past = new Date(Date.now() - 1000).toISOString();
		const { cookie } = await createSession('usr_demo', past);
		const r = await SELF.fetch(`http://x/api/events?project_id=${OWNED_PROJECT}`, {
			headers: { ...CSRF, Cookie: cookie },
		});
		expect(r.status).toBe(401);
	});

	it('valid session + owned project -> 200', async () => {
		const { cookie } = await demoSession();
		const r = await SELF.fetch(`http://x/api/events?project_id=${OWNED_PROJECT}`, {
			headers: { ...CSRF, Cookie: cookie },
		});
		expect(r.status).toBe(200);
	});

	it('login does not require a session cookie', async () => {
		const r = await SELF.fetch('http://x/api/login', {
			method: 'POST',
			headers: { ...CSRF, 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'demo@watchtower.dev', password: 'demo1234' }),
		});
		expect(r.status).toBe(200);
	});
});

describe('project ownership', () => {
	it('unknown project_id -> 404', async () => {
		const { cookie } = await demoSession();
		const r = await SELF.fetch('http://x/api/events?project_id=wt_nope', {
			headers: { ...CSRF, Cookie: cookie },
		});
		expect(r.status).toBe(404);
		expect((await r.json()).error).toBe('unknown_project');
	});

	it("another user's project -> 403", async () => {
		const { cookie } = await demoSession();
		const r = await SELF.fetch(`http://x/api/events?project_id=${FOREIGN_PROJECT}`, {
			headers: { ...CSRF, Cookie: cookie },
		});
		expect(r.status).toBe(403);
		expect((await r.json()).error).toBe('forbidden');
	});
});

describe('POST /api/logout', () => {
	it('deletes the session row and clears the cookie', async () => {
		const { sessionId, cookie } = await demoSession();
		const r = await SELF.fetch('http://x/api/logout', {
			method: 'POST',
			headers: { ...CSRF, Cookie: cookie },
		});
		expect(r.status).toBe(200);
		expect(r.headers.get('Set-Cookie')).toContain('Max-Age=0');

		const row = await env.DB.prepare('SELECT 1 FROM sessions WHERE session_id = ?')
			.bind(sessionId)
			.first();
		expect(row).toBeNull();

		// the now-revoked cookie no longer authenticates
		const r2 = await SELF.fetch(`http://x/api/events?project_id=${OWNED_PROJECT}`, {
			headers: { ...CSRF, Cookie: cookie },
		});
		expect(r2.status).toBe(401);
	});

	it('without a valid session -> 401', async () => {
		const r = await SELF.fetch('http://x/api/logout', { method: 'POST', headers: CSRF });
		expect(r.status).toBe(401);
	});
});

describe('credentialed CORS', () => {
	it('allowlisted Origin is echoed with Allow-Credentials', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${OWNED_PROJECT}`, {
			headers: { ...CSRF, Origin: DASHBOARD_ORIGIN },
		});
		expect(r.headers.get('Access-Control-Allow-Origin')).toBe(DASHBOARD_ORIGIN);
		expect(r.headers.get('Access-Control-Allow-Credentials')).toBe('true');
	});

	it('unknown Origin gets no Access-Control-Allow-Origin', async () => {
		const r = await SELF.fetch(`http://x/api/events?project_id=${OWNED_PROJECT}`, {
			headers: { ...CSRF, Origin: 'https://evil.example' },
		});
		expect(r.headers.get('Access-Control-Allow-Origin')).toBeNull();
		expect(r.headers.get('Access-Control-Allow-Credentials')).toBeNull();
	});

	it('OPTIONS preflight allows the CSRF header for the dashboard origin', async () => {
		const r = await SELF.fetch('http://x/api/events', {
			method: 'OPTIONS',
			headers: {
				Origin: DASHBOARD_ORIGIN,
				'Access-Control-Request-Method': 'GET',
				'Access-Control-Request-Headers': 'X-Watchtower-Auth',
			},
		});
		expect(r.status).toBe(204);
		expect(r.headers.get('Access-Control-Allow-Origin')).toBe(DASHBOARD_ORIGIN);
		expect(r.headers.get('Access-Control-Allow-Headers')).toContain('X-Watchtower-Auth');
		expect(r.headers.get('Access-Control-Allow-Credentials')).toBe('true');
	});
});
