import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/index';

let mockError = false;

vi.mock('../../src/services/aggregation-service', () => ({
  default: class {
    async getAlbumsWithLocation() {
      if (mockError) throw new Error('DB connection lost');
      return [];
    }
    async getCountAlbumsByYear(includePrivate: boolean) {
      if (mockError) throw new Error('DB timeout');
      return includePrivate ? [{ year: '2024', count: 3 }] : [{ year: '2024', count: 1 }];
    }
    async getFeaturedAlbums() {
      if (mockError) throw new Error('DB error');
      return [{ id: 'feat-1', albumName: 'Featured', tags: [], isFeatured: true }];
    }
  },
}));

vi.mock('../../src/routes/auth-middleware', async () => {
  const { createMiddleware } = await import('hono/factory');
  return {
    verifyJwtClaim: createMiddleware(async (c, next) => {
      c.set('user', { role: 'viewer', email: 'viewer@test.com' });
      await next();
    }),
    verifyUserPermission: createMiddleware(async (c, next) => await next()),
    optionalVerifyJwtClaim: createMiddleware(async (c, next) => {
      // Non-admin user
      c.set('user', { role: 'viewer', email: 'viewer@test.com' });
      await next();
    }),
  };
});

const env = { DB: {}, JWT_SECRET: 'test-secret' };

describe('Aggregate route - error paths & edge cases', () => {
  beforeEach(() => {
    mockError = false;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ------------------------------------------------------------------ */
  /* featured-albums                                                     */
  /* ------------------------------------------------------------------ */
  describe('featured-albums', () => {
    it('should return featured albums', async () => {
      const res = await app.request('/api/aggregate/featured-albums', {}, env);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.code).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].albumName).toBe('Featured');
    });

    it('should return 500 when service throws', async () => {
      mockError = true;
      const res = await app.request('/api/aggregate/featured-albums', {}, env);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toContain('Failed to query aggregate data for featured albums');
    });
  });

  /* ------------------------------------------------------------------ */
  /* albums-with-location errors                                         */
  /* ------------------------------------------------------------------ */
  describe('albums-with-location errors', () => {
    it('should return 500 when service throws', async () => {
      mockError = true;
      const res = await app.request('/api/aggregate/albums-with-location', {}, env);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toContain('photo album with location');
    });
  });

  /* ------------------------------------------------------------------ */
  /* count-albums-by-year                                                */
  /* ------------------------------------------------------------------ */
  describe('count-albums-by-year', () => {
    it('should return non-admin counts (excludes private)', async () => {
      const res = await app.request('/api/aggregate/count-albums-by-year', {}, env);

      expect(res.status).toBe(200);
      const body = await res.json();
      // Non-admin user → includePrivate = false → count = 1
      expect(body.data).toEqual([{ year: '2024', count: 1 }]);
    });

    it('should return 500 when service throws', async () => {
      mockError = true;
      const res = await app.request('/api/aggregate/count-albums-by-year', {}, env);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toContain('count albums by year');
    });
  });

  /* ------------------------------------------------------------------ */
  /* Invalid type                                                        */
  /* ------------------------------------------------------------------ */
  describe('invalid type', () => {
    it('should return 400 for unknown aggregate type', async () => {
      const res = await app.request('/api/aggregate/unknown-type', {}, env);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain('Invalid aggregate type');
    });
  });
});
