/**
 * Auth helpers for POST /api/login.
 * Uses Web Crypto SubtleCrypto (PBKDF2, SHA-256) — native to Cloudflare Workers.
 * ADR-0005: signed session cookie, HMAC-signed opaque session_id.
 */

/**
 * Verify a password against a stored PBKDF2 hash.
 * @param {string} password - plaintext password
 * @param {string} storedHash - hex-encoded hash from DB
 * @param {string} salt - hex-encoded salt from DB
 * @param {number} iterations - iterations from DB
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash, salt, iterations) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(salt), iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hash = bytesToHex(new Uint8Array(derived));
  return hash === storedHash;
}

/**
 * Sign a session_id with HMAC-SHA256 using the worker secret.
 * @param {string} sessionId
 * @param {string} secret - from env.SESSION_SECRET
 * @returns {Promise<string>} - "sessionId.signature"
 */
export async function signSession(sessionId, secret) {
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(sessionId));
  return `${sessionId}.${bytesToHex(new Uint8Array(sig))}`;
}

/**
 * Verify and extract session_id from a signed cookie value.
 * @param {string} signed - "sessionId.signature"
 * @param {string} secret
 * @returns {Promise<string|null>} - sessionId if valid, null if tampered
 */
export async function verifySession(signed, secret) {
  const dot = signed.lastIndexOf('.');
  if (dot === -1) return null;
  const sessionId = signed.slice(0, dot);
  const expected = await signSession(sessionId, secret);
  return expected === signed ? sessionId : null;
}

/**
 * Resolve the session user from a request's `wt_session` cookie.
 * Verifies the HMAC signature, looks up the `sessions` row, and checks expiry.
 * @param {Request} request
 * @param {{ DB: D1Database, SESSION_SECRET: string }} env
 * @returns {Promise<{ sessionId: string, userId: string } | null>} null if unauthenticated
 */
export async function requireSession(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie'));
  const signed = cookies.wt_session;
  if (!signed) return null;

  const sessionId = await verifySession(signed, env.SESSION_SECRET);
  if (!sessionId) return null;

  const row = await env.DB.prepare(
    'SELECT user_id, expires_at FROM sessions WHERE session_id = ?'
  ).bind(sessionId).first();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;

  return { sessionId, userId: row.user_id };
}

/**
 * Parse a Cookie header into a name -> value map.
 * @param {string|null} header
 * @returns {Record<string, string>}
 */
export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a password with PBKDF2 using a fresh random salt.
 * @param   {string} password - plaintext password
 * @param   {number} [iterations=100000] - PBKDF2 iteration count
 * @returns {Promise<{ hash: string, salt: string, iterations: number }>} - hex-encoded hash and salt
 */
export async function hashPassword(password, iterations = 100000) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return {
    hash: bytesToHex(new Uint8Array(derived)),
    salt: bytesToHex(salt),
    iterations,
  };
}
