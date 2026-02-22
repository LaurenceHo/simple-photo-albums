import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/index';

let mockAuth = true;

vi.mock('../../src/services/album-tag-service', async () => {
  return {
    default: class {
      constructor(db: any) {}
      async getAll() {
        return [{ tag: 'sport' }, { tag: 'food' }, { tag: 'hiking' }];
      }
      async create() {
        return 'created';
      }
      async delete() {
        return 'deleted';
      }
    },
  };
});

vi.mock('../../src/routes/auth-middleware', async () => {
  const { createMiddleware } = await import('hono/factory');
  return {
    verifyJwtClaim: createMiddleware(async (c, next) => {
      if (mockAuth) {
        c.set('user', { role: 'admin' });
        await next();
      } else {
        return c.json({ message: 'Authentication failed. Please login.' }, 401);
      }
    }),
    verifyUserPermission: createMiddleware(async (c, next) => {
      if (mockAuth) {
        await next();
      } else {
        return c.json({ message: 'Unauthorized action' }, 403);
      }
    }),
    optionalVerifyJwtClaim: createMiddleware(async (c, next) => await next()),
  };
});

// Mock env
const env = {
  DB: {},
  JWT_SECRET: 'test-secret',
};

describe('album tag route with auth', () => {
  beforeEach(() => {
    mockAuth = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Validation tests commented out as validation schema was removed
  /*
  it('should return 422 when adding tag and request body is empty', async () => {
    const response = await app.request('/api/albumTags', { method: 'POST' }, env);
    expect(response.status).toBe(422);
  });

  it('should return 422 when adding tag and request body is not array', async () => {
    const response = await app.request(
      '/api/albumTags',
      {
        method: 'POST',
        body: JSON.stringify({ tag: 'tag1' }),
        headers: { 'Content-Type': 'application/json' },
      },
      env,
    );
    expect(response.status).toBe(422);
  });
  */

  it('should return 200 when adding tag', async () => {
    const response = await app.request(
      '/api/albumTags',
      {
        method: 'POST',
        body: JSON.stringify([{ tag: 'tag1' }]),
        headers: { 'Content-Type': 'application/json' },
      },
      env,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      code: 200,
      status: 'Success',
      message: 'Album tag created',
    });
  });

  it('should return 404 when tag is missing', async () => {
    const response = await app.request('/api/albumTags', { method: 'DELETE' }, env);
    expect(response.status).toBe(404);
  });

  it('should return 200 when deleting tag', async () => {
    const response = await app.request('/api/albumTags/tag1', { method: 'DELETE' }, env);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      code: 200,
      status: 'Success',
      message: 'Album tag deleted',
    });
  });
});

describe('album tag route without auth', () => {
  beforeEach(() => {
    mockAuth = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return correct tags', async () => {
    const response = await app.request('/api/albumTags', {}, env);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      code: 200,
      status: 'Success',
      message: 'ok',
      data: [{ tag: 'sport' }, { tag: 'food' }, { tag: 'hiking' }],
    });
  });

  it('where creating tag, should return 401 error when unauthorized', async () => {
    const response = await app.request(
      '/api/albumTags',
      {
        method: 'POST',
        body: JSON.stringify([{ tag: 'tag1' }]),
        headers: { 'Content-Type': 'application/json' },
      },
      env,
    );
    expect(response.status).toBe(401);
  });

  it('when deleting tag, should return 401 error when unauthorized', async () => {
    const response = await app.request('/api/albumTags/tag1', { method: 'DELETE' }, env);
    expect(response.status).toBe(401);
  });
});
