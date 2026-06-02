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
