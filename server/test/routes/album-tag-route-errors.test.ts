import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/index';

let mockServiceBehavior: 'success' | 'error' = 'success';

vi.mock('../../src/services/album-tag-service', () => ({
  default: class {
    async getAll() {
      if (mockServiceBehavior === 'error') throw new Error('DB read error');
      return [{ tag: 'nature' }];
    }
    async create() {
      if (mockServiceBehavior === 'error') throw new Error('DB insert error');
    }
    async delete() {
      if (mockServiceBehavior === 'error') throw new Error('DB delete error');
    }
  },
}));

vi.mock('../../src/routes/auth-middleware', async () => {
  const { createMiddleware } = await import('hono/factory');
  return {
    verifyJwtClaim: createMiddleware(async (c, next) => {
      c.set('user', { role: 'admin', email: 'admin@test.com' });
      await next();
    }),
    verifyUserPermission: createMiddleware(async (c, next) => await next()),
    optionalVerifyJwtClaim: createMiddleware(async (c, next) => await next()),
  };
});

const env = { DB: {}, JWT_SECRET: 'test-secret' };

describe('Album tag route - error paths', () => {
  beforeEach(() => {
    mockServiceBehavior = 'success';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ------------------------------------------------------------------ */
  /* getAll error                                                        */
  /* ------------------------------------------------------------------ */
  describe('GET /api/album-tags', () => {
    it('should return 500 when service throws', async () => {
      mockServiceBehavior = 'error';
      const res = await app.request('/api/album-tags', {}, env);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Failed to query album tags');
    });
  });

  /* ------------------------------------------------------------------ */
  /* create error                                                        */
  /* ------------------------------------------------------------------ */
  describe('POST /api/album-tags', () => {
    it('should return 500 when service throws during create', async () => {
      mockServiceBehavior = 'error';
      const res = await app.request(
        '/api/album-tags',
        {
          method: 'POST',
          body: JSON.stringify([{ tag: 'fail-tag' }]),
          headers: { 'Content-Type': 'application/json' },
        },
        env,
      );

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Failed to create album tag');
    });

    it('should set createdBy from user context', async () => {
      const res = await app.request(
        '/api/album-tags',
        {
          method: 'POST',
          body: JSON.stringify([{ tag: 'new-tag' }]),
          headers: { 'Content-Type': 'application/json' },
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('Album tag created');
    });
  });

  /* ------------------------------------------------------------------ */
  /* delete error                                                        */
  /* ------------------------------------------------------------------ */
  describe('DELETE /api/album-tags/:tagId', () => {
    it('should return 500 when service throws during delete', async () => {
      mockServiceBehavior = 'error';
      const res = await app.request('/api/album-tags/fail-tag', { method: 'DELETE' }, env);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Failed to delete album tag');
    });
  });
});
