import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/index';
import { signJwt } from '../../src/utils/jwt';

const JWT_SECRET = 'test-secret';

const { mockVerifyIdToken, mockUserFindOne } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
  mockUserFindOne: vi.fn().mockResolvedValue(null),
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = mockVerifyIdToken;
  },
}));

vi.mock('../../src/services/user-service', () => ({
  default: class {
    findOne = mockUserFindOne;
  },
}));

// Don't mock auth-middleware for auth routes (they don't use it directly)
// But other routes imported via index DO use it, so mock for them
vi.mock('../../src/routes/auth-middleware', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/routes/auth-middleware')>();
  const { createMiddleware } = await import('hono/factory');
  return {
    ...original,
    // Keep real setJwtCookies and cleanJwtCookie
    setJwtCookies: original.setJwtCookies,
    cleanJwtCookie: original.cleanJwtCookie,
    // Mock verification middleware for other routes that need it
    verifyJwtClaim: createMiddleware(async (c, next) => {
      c.set('user', { role: 'admin', email: 'test@test.com' });
      await next();
    }),
    verifyUserPermission: createMiddleware(async (c, next) => await next()),
    optionalVerifyJwtClaim: createMiddleware(async (c, next) => await next()),
  };
});

const env = {
  DB: {},
  JWT_SECRET,
  VITE_GOOGLE_CLIENT_ID: 'test-client-id',
};

process.env.JWT_SECRET = JWT_SECRET;

describe('Auth Route', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUserFindOne.mockReset().mockResolvedValue(null);
    mockVerifyIdToken.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ------------------------------------------------------------------ */
  /* GET /api/auth/csrf                                                  */
  /* ------------------------------------------------------------------ */
  describe('GET /api/auth/csrf', () => {
    it('should return a state token and set csrf_state cookie', async () => {
      const res = await app.request('/api/auth/csrf', {}, env);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.state).toBeDefined();
      expect(typeof body.state).toBe('string');
      expect(body.state).toHaveLength(32); // 16 bytes hex
      expect(res.headers.get('set-cookie')).toContain('csrf_state=');
    });
  });

  /* ------------------------------------------------------------------ */
  /* GET /api/auth/user-info                                             */
  /* ------------------------------------------------------------------ */
  describe('GET /api/auth/user-info', () => {
    it('should return 200 with no data when no JWT cookie', async () => {
      const res = await app.request('/api/auth/user-info', {}, env);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.code).toBe(200);
      expect(body.data).toBeUndefined();
    });

    it('should return decoded user for valid JWT', async () => {
      const token = await signJwt(
        { uid: '1', email: 'test@test.com', role: 'admin', displayName: 'Test' },
        JWT_SECRET,
      );

      const res = await app.request(
        '/api/auth/user-info',
        { headers: { Cookie: `jwt=${token}` } },
        env,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.code).toBe(200);
      expect(body.data.uid).toBe('1');
      expect(body.data.email).toBe('test@test.com');
    });

    it('should return 200 and clear cookie for invalid JWT', async () => {
      const res = await app.request(
        '/api/auth/user-info',
        { headers: { Cookie: 'jwt=invalid-token' } },
        env,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.code).toBe(200);
      expect(body.data).toBeUndefined();
      // Cookie should be cleared
      expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
    });

    it('should return 200 and clear cookie for expired JWT', async () => {
      const token = await signJwt({ uid: '1' }, JWT_SECRET, '0s');
      await new Promise((r) => setTimeout(r, 50));

      const res = await app.request(
        '/api/auth/user-info',
        { headers: { Cookie: `jwt=${token}` } },
        env,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeUndefined();
    });
  });

  /* ------------------------------------------------------------------ */
  /* POST /api/auth/verify-id-token                                      */
  /* ------------------------------------------------------------------ */
  describe('POST /api/auth/verify-id-token', () => {
    const validPayload = {
      sub: 'google-uid-123',
      email: 'user@example.com',
      iat: Math.floor(Date.now() / 1000), // fresh
    };

    function postVerify(body: Record<string, unknown>, cookies = '') {
      return app.request(
        '/api/auth/verify-id-token',
        {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
            ...(cookies ? { Cookie: cookies } : {}),
          },
        },
        env,
      );
    }

    it('should return 401 when Google token has no uid/email', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: '', email: '' }) });

      const res = await postVerify({ token: 'gtoken', state: 'abc' });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe('Invalid Google token');
    });

    it('should return 401 on CSRF state mismatch', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => validPayload,
      });

      const res = await postVerify(
        { token: 'gtoken', state: 'wrong-state' },
        'csrf_state=correct-state',
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe('CSRF token mismatch');
    });

    it('should return 500 when login session is expired (>5 min)', async () => {
      const stalePayload = { ...validPayload, iat: Math.floor(Date.now() / 1000) - 600 };
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => stalePayload,
      });

      const res = await postVerify({ token: 'gtoken', state: 'csrf-val' }, 'csrf_state=csrf-val');

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Login session expired');
    });

    it('should return 401 when user not found in permissions', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => validPayload });
      mockUserFindOne.mockResolvedValue(null);

      const res = await postVerify({ token: 'gtoken', state: 'csrf-val' }, 'csrf_state=csrf-val');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe('User not authorized');
    });

    it('should return 200 with user data on successful auth', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => validPayload });
      mockUserFindOne.mockResolvedValue({
        uid: 'google-uid-123',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'admin',
      });

      const res = await postVerify({ token: 'gtoken', state: 'csrf-val' }, 'csrf_state=csrf-val');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.code).toBe(200);
      expect(body.data.email).toBe('user@example.com');
      // Should set JWT cookie
      expect(res.headers.get('set-cookie')).toContain('jwt=');
    });

    it('should return 500 when Google verification throws', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const res = await postVerify({ token: 'bad-token', state: 'x' });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Authentication failed');
    });

    it('should return 500 when VITE_GOOGLE_CLIENT_ID is missing', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('VITE_GOOGLE_CLIENT_ID not configured'));

      const res = await app.request(
        '/api/auth/verify-id-token',
        {
          method: 'POST',
          body: JSON.stringify({ token: 'x', state: 'y' }),
          headers: { 'Content-Type': 'application/json' },
        },
        { ...env, VITE_GOOGLE_CLIENT_ID: '' },
      );

      expect(res.status).toBe(500);
    });
  });

  /* ------------------------------------------------------------------ */
  /* POST /api/auth/logout                                               */
  /* ------------------------------------------------------------------ */
  describe('POST /api/auth/logout', () => {
    it('should return 200 and clear cookie', async () => {
      const res = await app.request('/api/auth/logout', { method: 'POST' }, env);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('Logged out');
      expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
    });
  });
});
