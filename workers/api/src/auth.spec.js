import { describe, it, expect } from 'vitest';
import { verifyPassword, signSession, verifySession } from './auth.js';

const KNOWN_HASH = '876768b5fb082cc511a66826e0f707b3f7f71bf89c0ad84cbf59a2f7d94048b0';
const KNOWN_SALT = 'e7969f05280546e27cbbd01cdf459031';
const ITERATIONS = 100000;
const SECRET = 'test-secret-key';

describe('verifyPassword', () => {
  it('returns true for correct password with known vector', async () => {
    const result = await verifyPassword('demo1234', KNOWN_HASH, KNOWN_SALT, ITERATIONS);
    expect(result).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const result = await verifyPassword('wrongpass', KNOWN_HASH, KNOWN_SALT, ITERATIONS);
    expect(result).toBe(false);
  });
});

describe('signSession / verifySession', () => {
  it('round-trips correctly', async () => {
    const sessionId = 'test-session-123';
    const signed = await signSession(sessionId, SECRET);
    const verified = await verifySession(signed, SECRET);
    expect(verified).toBe(sessionId);
  });

  it('returns null for tampered signature', async () => {
    const sessionId = 'test-session-123';
    const signed = await signSession(sessionId, SECRET);
    const tampered = signed.slice(0, -4) + 'dead';
    const verified = await verifySession(tampered, SECRET);
    expect(verified).toBeNull();
  });

  it('returns null for missing dot separator', async () => {
    const verified = await verifySession('noseparator', SECRET);
    expect(verified).toBeNull();
  });

  it('throws if SESSION_SECRET is not set', async () => {
    await expect(signSession('abc', '')).rejects.toThrow('SESSION_SECRET is not set');
  });
});
