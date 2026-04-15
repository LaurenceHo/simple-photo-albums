import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/index';

let mockServiceBehavior: 'success' | 'error' | 'conflict' = 'success';

vi.mock('../../src/services/album-service', () => ({
  default: class {
    async getAll() {
      if (mockServiceBehavior === 'error') throw new Error('DB read error');
      return [];
    }
    async getById(id: string) {
      if (mockServiceBehavior === 'error') throw new Error('DB error');
      if (mockServiceBehavior === 'conflict') {
        return { id, albumName: 'Existing' };
      }
      if (id === 'existing-album') {
        return { id, albumName: 'Existing', tags: [], isPrivate: false };
      }
      return null;
    }
    async create() {
      if (mockServiceBehavior === 'error') throw new Error('DB insert error');
    }
    async update() {
      if (mockServiceBehavior === 'error') throw new Error('DB update error');
    }
    async delete() {
      if (mockServiceBehavior === 'error') throw new Error('DB delete error');
    }
  },
}));

let mockEmptyR2 = true;

vi.mock('../../src/utils/helpers', () => ({
  buildR2Config: () => ({}),
  emptyR2Folder: () => Promise.resolve(mockEmptyR2),
  uploadObject: () => {
    if (mockServiceBehavior === 'error') throw new Error('R2 upload error');
    return Promise.resolve(true);
  },
  verifyIfIsAdmin: () => {
    if (mockServiceBehavior === 'error') throw new Error('Admin check error');
    return true;
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

const env = {
  DB: {},
  JWT_SECRET: 'test-secret',
  R2_BUCKET_NAME: 'test-bucket',
};

describe('Album route - error paths', () => {
  beforeEach(() => {
    mockServiceBehavior = 'success';
    mockEmptyR2 = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ------------------------------------------------------------------ */
  /* findAll errors                                                      */
  /* ------------------------------------------------------------------ */
  describe('GET /api/albums/:year', () => {
    it('should return 500 when service throws', async () => {
      mockServiceBehavior = 'error';
      const res = await app.request('/api/albums/2024', {}, env);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Failed to query photo album');
    });

    it('should return empty list when no albums match', async () => {
      const res = await app.request('/api/albums/1999', {}, env);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /* create errors                                                       */
  /* ------------------------------------------------------------------ */
  describe('POST /api/albums', () => {
    const validAlbum = {
      id: 'new-album',
      year: '2024',
      albumName: 'Test',
      isPrivate: false,
    };

    it('should return 409 when album already exists', async () => {
      mockServiceBehavior = 'conflict';
      const res = await app.request(
        '/api/albums',
        {
          method: 'POST',
          body: JSON.stringify(validAlbum),
          headers: { 'Content-Type': 'application/json' },
        },
        env,
      );

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.message).toBe('Album already exists');
    });

    it('should return 500 when service throws during create', async () => {
      mockServiceBehavior = 'error';
      const res = await app.request(
        '/api/albums',
        {
          method: 'POST',
          body: JSON.stringify(validAlbum),
          headers: { 'Content-Type': 'application/json' },
        },
        env,
      );

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Failed to create photo album');
    });

    it('should return 400 when body fails validation', async () => {
      const res = await app.request(
        '/api/albums',
        {
          method: 'POST',
          body: JSON.stringify({ id: 'INVALID ID!' }),
          headers: { 'Content-Type': 'application/json' },
        },
        env,
      );

      expect(res.status).toBe(400);
    });
  });

  /* ------------------------------------------------------------------ */
  /* update errors                                                       */
  /* ------------------------------------------------------------------ */
  describe('PUT /api/albums', () => {
    const validUpdate = {
      id: 'test-album',
      year: '2024',
      albumName: 'Updated',
      isPrivate: true,
    };

    it('should return 500 when service throws during update', async () => {
      mockServiceBehavior = 'error';
      const res = await app.request(
        '/api/albums',
        {
          method: 'PUT',
          body: JSON.stringify(validUpdate),
          headers: { 'Content-Type': 'application/json' },
        },
        env,
      );

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Failed to update photo album');
    });
  });

  /* ------------------------------------------------------------------ */
  /* delete errors                                                       */
  /* ------------------------------------------------------------------ */
  describe('DELETE /api/albums', () => {
    const deleteBody = { id: 'test-album', year: '2024' };

    it('should return 500 when emptyR2Folder returns false', async () => {
      mockEmptyR2 = false;
      const res = await app.request(
        '/api/albums',
        {
          method: 'DELETE',
          body: JSON.stringify(deleteBody),
          headers: { 'Content-Type': 'application/json' },
        },
        env,
      );

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Failed to delete photo album');
    });

    it('should return 500 when delete throws', async () => {
      mockServiceBehavior = 'error';
      const res = await app.request(
        '/api/albums',
        {
          method: 'DELETE',
          body: JSON.stringify(deleteBody),
          headers: { 'Content-Type': 'application/json' },
        },
        env,
      );

      expect(res.status).toBe(500);
    });
  });
});
