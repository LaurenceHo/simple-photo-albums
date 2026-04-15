import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/index';
import { signJwt } from '../../src/utils/jwt';

const JWT_SECRET = 'test-secret';

let mockAlbumResult: Record<string, unknown> | null = null;
let mockUpdateCalls: unknown[] = [];

vi.mock('../../src/services/album-service', () => ({
  default: class {
    async getById() {
      return mockAlbumResult;
    }
    async update(...args: unknown[]) {
      mockUpdateCalls.push(args);
      return 'updated';
    }
  },
}));

let mockPhotos: Record<string, unknown>[] = [];

vi.mock('../../src/services/r2-service', () => ({
  default: class {
    async findAll() {
      return mockPhotos;
    }
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: () => Promise.resolve('https://url'),
}));

vi.mock('../../src/utils/helpers', () => ({
  buildR2Config: () => ({}),
  deleteObjects: vi.fn().mockResolvedValue(true),
  uploadObject: () => Promise.resolve(true),
  verifyIfIsAdmin: () => true,
}));

// Use REAL auth middleware so checkAlbumAccess actually reads cookies
vi.mock('../../src/routes/auth-middleware', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/routes/auth-middleware')>();
  const { createMiddleware } = await import('hono/factory');
  return {
    ...original,
    // Keep real cleanJwtCookie and setJwtCookies
    cleanJwtCookie: original.cleanJwtCookie,
    setJwtCookies: original.setJwtCookies,
    // For protected write routes, auto-pass
    verifyJwtClaim: createMiddleware(async (c, next) => {
      c.set('user', { role: 'admin', email: 'admin@test.com' });
      await next();
    }),
    verifyUserPermission: createMiddleware(async (c, next) => await next()),
    // optionalVerifyJwtClaim: keep real or pass-through doesn't matter for photo findAll
    optionalVerifyJwtClaim: createMiddleware(async (c, next) => await next()),
  };
});

const env = {
  DB: {},
  JWT_SECRET,
  R2_BUCKET_NAME: 'test-bucket',
};

describe('Photo route - private album access & syncAlbumCover', () => {
  beforeEach(() => {
    mockAlbumResult = null;
    mockPhotos = [];
    mockUpdateCalls = [];
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ------------------------------------------------------------------ */
  /* checkAlbumAccess                                                    */
  /* ------------------------------------------------------------------ */
  describe('checkAlbumAccess', () => {
    it('should return 401 when accessing private album without JWT', async () => {
      mockAlbumResult = {
        id: 'priv',
        albumName: 'Private',
        isPrivate: true,
        tags: [],
        albumCover: '',
      };

      const res = await app.request('/api/photos/2024/priv', {}, env);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe('Authentication failed.');
    });

    it('should return 403 when non-admin accesses private album', async () => {
      mockAlbumResult = {
        id: 'priv',
        albumName: 'Private',
        isPrivate: true,
        tags: [],
        albumCover: '',
      };
      const viewerToken = await signJwt({ uid: '1', role: 'viewer', email: 'v@t.com' }, JWT_SECRET);

      const res = await app.request(
        '/api/photos/2024/priv',
        { headers: { Cookie: `jwt=${viewerToken}` } },
        env,
      );

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toBe('Unauthorized action.');
    });

    it('should return 401 when JWT is invalid for private album', async () => {
      mockAlbumResult = {
        id: 'priv',
        albumName: 'Private',
        isPrivate: true,
        tags: [],
        albumCover: '',
      };

      const res = await app.request(
        '/api/photos/2024/priv',
        { headers: { Cookie: 'jwt=invalid-token' } },
        env,
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe('Authentication failed.');
    });

    it('should allow admin to access private album', async () => {
      mockAlbumResult = {
        id: 'priv',
        albumName: 'Private',
        isPrivate: true,
        tags: [],
        albumCover: '',
      };
      const adminToken = await signJwt({ uid: '1', role: 'admin', email: 'a@t.com' }, JWT_SECRET);

      const res = await app.request(
        '/api/photos/2024/priv',
        { headers: { Cookie: `jwt=${adminToken}` } },
        env,
      );

      expect(res.status).toBe(200);
    });
  });

  /* ------------------------------------------------------------------ */
  /* syncAlbumCover                                                      */
  /* ------------------------------------------------------------------ */
  describe('syncAlbumCover', () => {
    it('should set album cover when photos exist but album has no cover', async () => {
      mockAlbumResult = {
        id: 'album-1',
        albumName: 'NoCover',
        isPrivate: false,
        tags: [],
        albumCover: '',
      };
      mockPhotos = [
        { key: 'album-1/photo1.jpg', url: '/photo1.jpg', size: 100, lastModified: '2024-01-01' },
      ];

      await app.request('/api/photos/2024/album-1', {}, env);

      // update should be called to set albumCover
      expect(mockUpdateCalls.length).toBeGreaterThan(0);
      const updateArg = mockUpdateCalls[0] as [string, Record<string, unknown>];
      expect(updateArg[0]).toBe('album-1');
      expect(updateArg[1].albumCover).toBe('album-1/photo1.jpg');
      expect(updateArg[1].updatedBy).toBe('System');
    });

    it('should clear album cover when no photos but album has cover', async () => {
      mockAlbumResult = {
        id: 'album-2',
        albumName: 'HasCover',
        isPrivate: false,
        tags: [],
        albumCover: 'album-2/old-photo.jpg',
      };
      mockPhotos = [];

      await app.request('/api/photos/2024/album-2', {}, env);

      expect(mockUpdateCalls.length).toBeGreaterThan(0);
      const updateArg = mockUpdateCalls[0] as [string, Record<string, unknown>];
      expect(updateArg[1].albumCover).toBe('');
    });

    it('should not update when photos and cover are both present', async () => {
      mockAlbumResult = {
        id: 'album-3',
        albumName: 'AllGood',
        isPrivate: false,
        tags: [],
        albumCover: 'album-3/cover.jpg',
      };
      mockPhotos = [
        { key: 'album-3/cover.jpg', url: '/cover.jpg', size: 100, lastModified: '2024-01-01' },
      ];

      await app.request('/api/photos/2024/album-3', {}, env);

      expect(mockUpdateCalls).toHaveLength(0);
    });

    it('should not update when both photos and cover are empty', async () => {
      mockAlbumResult = {
        id: 'album-4',
        albumName: 'Empty',
        isPrivate: false,
        tags: [],
        albumCover: '',
      };
      mockPhotos = [];

      await app.request('/api/photos/2024/album-4', {}, env);

      expect(mockUpdateCalls).toHaveLength(0);
    });
  });
});
