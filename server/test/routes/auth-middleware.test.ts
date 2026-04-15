import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HonoEnv } from '../../src/env';
import {
  cleanJwtCookie,
  optionalVerifyJwtClaim,
  setJwtCookies,
  verifyJwtClaim,
  verifyUserPermission,
} from '../../src/routes/auth-middleware';
import { signJwt } from '../../src/utils/jwt';

const JWT_SECRET = 'test-jwt-secret-at-least-32-characters!!';

const env = {
  DB: {},
  JWT_SECRET,
} as unknown as HonoEnv['Bindings'];

describe('auth-middleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ------------------------------------------------------------------ */
  /* setJwtCookies                                                       */
  /* ------------------------------------------------------------------ */
  describe('setJwtCookies', () => {
    it('should set jwt cookie and Cache-Control header', async () => {
      const app = new Hono<HonoEnv>();
      app.get('/test', async (c) => {
        await setJwtCookies(c, 'test-token-value');
        return c.json({ ok: true });
      });

      const res = await app.request('/test', {}, env);

      expect(res.status).toBe(200);
      const setCookieHeader = res.headers.get('set-cookie');
      expect(setCookieHeader).toContain('jwt=test-token-value');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('Secure');
      expect(setCookieHeader).toContain('SameSite=None');
      expect(res.headers.get('cache-control')).toBe('private');
    });
  });

  /* ------------------------------------------------------------------ */
  /* cleanJwtCookie                                                      */
  /* ------------------------------------------------------------------ */
  describe('cleanJwtCookie', () => {
    it('should clear jwt cookie and return 401 by default', async () => {
      const app = new Hono<HonoEnv>();
      app.get('/test', (c) => cleanJwtCookie(c, 'Session expired'));

      const res = await app.request('/test', {}, env);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe('Session expired');
      expect(res.headers.get('set-cookie')).toContain('jwt=');
      expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
    });

    it('should return custom status code', async () => {
      const app = new Hono<HonoEnv>();
      app.get('/test', (c) => cleanJwtCookie(c, 'Forbidden', 403));

      const res = await app.request('/test', {}, env);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toBe('Forbidden');
    });
  });

  /* ------------------------------------------------------------------ */
  /* verifyJwtClaim                                                      */
  /* ------------------------------------------------------------------ */
  describe('verifyJwtClaim', () => {
    function buildApp() {
      const app = new Hono<HonoEnv>();
      app.use('/protected/*', verifyJwtClaim);
      app.get('/protected/data', (c) => {
        const user = c.get('user');
        return c.json({ user });
      });
      return app;
    }

    it('should pass through and set user for valid JWT', async () => {
      const token = await signJwt({ uid: '1', role: 'admin', email: 'a@b.com' }, JWT_SECRET);
      const app = buildApp();

      const res = await app.request(
        '/protected/data',
        { headers: { Cookie: `jwt=${token}` } },
        env,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.uid).toBe('1');
      expect(body.user.role).toBe('admin');
    });

    it('should return 401 when no JWT cookie present', async () => {
      const app = buildApp();

      const res = await app.request('/protected/data', {}, env);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain('Authentication failed');
    });

    it('should return 401 and clear cookie for invalid JWT', async () => {
      const app = buildApp();

      const res = await app.request(
        '/protected/data',
        { headers: { Cookie: 'jwt=bad-token' } },
        env,
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain('Authentication failed');
      expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
    });

    it('should return 401 for expired JWT', async () => {
      const token = await signJwt({ uid: '1' }, JWT_SECRET, '0s');
      await new Promise((r) => setTimeout(r, 50));
      const app = buildApp();

      const res = await app.request(
        '/protected/data',
        { headers: { Cookie: `jwt=${token}` } },
        env,
      );

      expect(res.status).toBe(401);
    });

    it('should return 401 for JWT signed with wrong secret', async () => {
      const token = await signJwt({ uid: '1' }, 'wrong-secret-that-is-32-chars-long!!!');
      const app = buildApp();

      const res = await app.request(
        '/protected/data',
        { headers: { Cookie: `jwt=${token}` } },
        env,
      );

      expect(res.status).toBe(401);
    });
  });

  /* ------------------------------------------------------------------ */
  /* optionalVerifyJwtClaim                                              */
  /* ------------------------------------------------------------------ */
  describe('optionalVerifyJwtClaim', () => {
    function buildApp() {
      const app = new Hono<HonoEnv>();
      app.use('/optional/*', optionalVerifyJwtClaim);
      app.get('/optional/data', (c) => {
        const user = c.get('user');
        return c.json({ user: user ?? null });
      });
      return app;
    }

    it('should set user when valid JWT present', async () => {
      const token = await signJwt({ uid: '2', role: 'viewer' }, JWT_SECRET);
      const app = buildApp();

      const res = await app.request('/optional/data', { headers: { Cookie: `jwt=${token}` } }, env);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.uid).toBe('2');
    });

    it('should proceed without user when no JWT', async () => {
      const app = buildApp();

      const res = await app.request('/optional/data', {}, env);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeNull();
    });

    it('should proceed without user when JWT is invalid (no error)', async () => {
      const app = buildApp();

      const res = await app.request('/optional/data', { headers: { Cookie: 'jwt=garbage' } }, env);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeNull();
    });
  });

  /* ------------------------------------------------------------------ */
  /* verifyUserPermission                                                */
  /* ------------------------------------------------------------------ */
  describe('verifyUserPermission', () => {
    function buildApp() {
      const app = new Hono<HonoEnv>();
      app.use('/admin/*', verifyJwtClaim, verifyUserPermission);
      app.get('/admin/data', (c) => c.json({ ok: true }));
      return app;
    }

    it('should pass for admin user', async () => {
      const token = await signJwt({ uid: '1', role: 'admin', email: 'a@b.com' }, JWT_SECRET);
      const app = buildApp();

      const res = await app.request('/admin/data', { headers: { Cookie: `jwt=${token}` } }, env);

      expect(res.status).toBe(200);
    });

    it('should return 403 for non-admin user', async () => {
      const token = await signJwt({ uid: '2', role: 'viewer', email: 'v@b.com' }, JWT_SECRET);
      const app = buildApp();

      const res = await app.request('/admin/data', { headers: { Cookie: `jwt=${token}` } }, env);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toBe('Unauthorized action');
    });

    it('should return 403 when user has no role', async () => {
      const token = await signJwt({ uid: '3', email: 'x@b.com' }, JWT_SECRET);
      const app = buildApp();

      const res = await app.request('/admin/data', { headers: { Cookie: `jwt=${token}` } }, env);

      expect(res.status).toBe(403);
    });
  });
});
