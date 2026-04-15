import { describe, expect, it } from 'vitest';
import { signJwt, verifyJwt } from '../../src/utils/jwt';

const TEST_SECRET = 'test-secret-key-at-least-32-chars-long!!';

describe('JWT utilities', () => {
  /* ------------------------------------------------------------------ */
  /* signJwt                                                             */
  /* ------------------------------------------------------------------ */
  describe('signJwt', () => {
    it('should produce a valid JWT string with 3 dot-separated parts', async () => {
      const token = await signJwt({ sub: 'user1' }, TEST_SECRET);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should embed payload claims in token', async () => {
      const payload = { uid: '123', role: 'admin', email: 'test@test.com' };
      const token = await signJwt(payload, TEST_SECRET);
      const decoded = await verifyJwt<typeof payload>(token, TEST_SECRET);

      expect(decoded.uid).toBe('123');
      expect(decoded.role).toBe('admin');
      expect(decoded.email).toBe('test@test.com');
    });

    it('should set iat (issued at) claim', async () => {
      const token = await signJwt({ sub: 'user1' }, TEST_SECRET);
      const decoded = await verifyJwt<{ iat: number }>(token, TEST_SECRET);

      expect(decoded.iat).toBeDefined();
      expect(typeof decoded.iat).toBe('number');
    });

    it('should set exp claim based on expiresIn parameter', async () => {
      const token = await signJwt({ sub: 'user1' }, TEST_SECRET, '1h');
      const decoded = await verifyJwt<{ iat: number; exp: number }>(token, TEST_SECRET);

      // exp should be ~3600 seconds after iat
      const diff = decoded.exp - decoded.iat;
      expect(diff).toBe(3600);
    });

    it('should default to 7-day expiry', async () => {
      const token = await signJwt({ sub: 'user1' }, TEST_SECRET);
      const decoded = await verifyJwt<{ iat: number; exp: number }>(token, TEST_SECRET);

      const diff = decoded.exp - decoded.iat;
      expect(diff).toBe(7 * 24 * 3600); // 7 days in seconds
    });

    it('should produce different tokens for different payloads', async () => {
      const token1 = await signJwt({ sub: 'user1' }, TEST_SECRET);
      const token2 = await signJwt({ sub: 'user2' }, TEST_SECRET);

      expect(token1).not.toBe(token2);
    });

    it('should produce different tokens for different secrets', async () => {
      const token1 = await signJwt({ sub: 'user1' }, 'secret-aaaaaaaaaaaaaaaaaaaaaaaa');
      const token2 = await signJwt({ sub: 'user1' }, 'secret-bbbbbbbbbbbbbbbbbbbbbbbb');

      expect(token1).not.toBe(token2);
    });
  });

  /* ------------------------------------------------------------------ */
  /* verifyJwt                                                           */
  /* ------------------------------------------------------------------ */
  describe('verifyJwt', () => {
    it('should verify and return typed payload', async () => {
      interface Payload {
        uid: string;
        role: string;
      }
      const token = await signJwt({ uid: '42', role: 'viewer' }, TEST_SECRET);
      const result = await verifyJwt<Payload>(token, TEST_SECRET);

      expect(result.uid).toBe('42');
      expect(result.role).toBe('viewer');
    });

    it('should reject token signed with different secret', async () => {
      const token = await signJwt({ sub: 'user1' }, 'correct-secret-at-least-32-chars!!');

      await expect(verifyJwt(token, 'wrong-secret-that-is-also-32-chars!!')).rejects.toThrow();
    });

    it('should reject expired token', async () => {
      // Sign with already-expired time
      const token = await signJwt({ sub: 'user1' }, TEST_SECRET, '0s');

      // Small delay to ensure expiry
      await new Promise((r) => setTimeout(r, 50));

      await expect(verifyJwt(token, TEST_SECRET)).rejects.toThrow();
    });

    it('should reject malformed token string', async () => {
      await expect(verifyJwt('not.a.valid-token', TEST_SECRET)).rejects.toThrow();
    });

    it('should reject empty token', async () => {
      await expect(verifyJwt('', TEST_SECRET)).rejects.toThrow();
    });

    it('should reject tampered payload', async () => {
      const token = await signJwt({ role: 'viewer' }, TEST_SECRET);

      // Tamper with the payload (middle part)
      const parts = token.split('.');
      // Decode payload, modify, re-encode
      const payload = JSON.parse(atob(parts[1]));
      payload.role = 'admin';
      parts[1] = btoa(JSON.stringify(payload));
      const tampered = parts.join('.');

      await expect(verifyJwt(tampered, TEST_SECRET)).rejects.toThrow();
    });
  });
});
