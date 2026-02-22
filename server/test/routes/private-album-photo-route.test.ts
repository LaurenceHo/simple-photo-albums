import { createMiddleware } from 'hono/factory';
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/index';
import { mockAlbumList, mockPhotoList, mockSignedCookies } from '../mock-data';

vi.mock('../../src/services/album-service', async () => {
  const { mockAlbumList } = await import('../mock-data');
  return {
    default: class {
      constructor(db: any) {}
      async getById(id: string) {
        return mockAlbumList[2]; // private album
      }
      async update() {
        return 'updated';
      }
    },
  };
});

vi.mock('../../src/services/s3-service', async () => {
  const { mockPhotoList } = await import('../mock-data');
  return {
    default: class {
      findAll() {
        return Promise.resolve(mockPhotoList);
      }
    },
  };
});

// Mock auth middleware to simulate real behavior for testing 401
vi.mock('../../src/routes/auth-middleware', async () => ({
  verifyJwtClaim: createMiddleware(async (c, next) => {
    const token = c.req.header('Cookie');
    if (token && token.includes('jwt=')) {
      c.set('user', { role: 'admin', email: 'test@test.com' });
      await next();
    } else {
      return c.json({ message: 'Authentication failed. Please login.' }, 401);
    }
  }),
  verifyUserPermission: createMiddleware(async (c, next) => await next()),
  optionalVerifyJwtClaim: createMiddleware(async (c, next) => {
    const token = c.req.header('Cookie');
    if (token && token.includes('jwt=')) {
      c.set('user', { role: 'admin', email: 'test@test.com' });
    }
    await next();
  }),
  cleanJwtCookie: (c: any, message: string, code = 401) => {
    return c.json({ message }, code);
  },
}));

// Mock env
const env = {
  DB: {},
  JWT_SECRET: 'test-secret',
};

describe('private album route', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return correct photos', async () => {
    process.env.JWT_SECRET = 'test-secret';
    const token = await mockSignedCookies();
    const response = await app.request(
      '/api/photos/2024/test',
      {
        headers: {
          Cookie: `jwt=${token}`,
        },
      },
      env,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      code: 200,
      status: 'Success',
      message: 'ok',
      data: {
        album: mockAlbumList[2],
        photos: mockPhotoList,
      },
    });
  });

  it('should return 401', async () => {
    const response = await app.request('/api/photos/2024/test', {}, env);
    expect(response.status).toBe(401);
  });
});
