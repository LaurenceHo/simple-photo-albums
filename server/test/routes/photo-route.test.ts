import { createMiddleware } from 'hono/factory';
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/index';
import { mockAlbumList, mockPhotoList } from '../mock-data';

vi.mock('../../src/services/s3-service', async () => {
  const { mockPhotoList } = await import('../mock-data');
  return {
    default: class {
      findAll() {
        return Promise.resolve(mockPhotoList);
      }
      copy() {
        return Promise.resolve(true);
      }
    },
  };
});

vi.mock('../../src/routes/auth-middleware', async () => ({
  verifyJwtClaim: createMiddleware(async (c, next) => {
    c.set('user', { role: 'admin', email: 'test@test.com' });
    await next();
  }),
  verifyUserPermission: createMiddleware(async (c, next) => await next()),
  optionalVerifyJwtClaim: createMiddleware(async (c, next) => await next()),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: () => Promise.resolve('https://upload-url'),
}));

vi.mock('../../src/utils/helpers', async () => ({
  deleteObjects: vi.fn(),
  uploadObject: () => Promise.resolve(true),
}));

vi.mock('../../src/services/album-service', async () => {
  const { mockAlbumList } = await import('../mock-data');
  return {
    default: class {
      async getById(id: string) {
        if (id === 'test') {
          return mockAlbumList[0];
        }
        return null;
      }
      async update() {
        return 'updated';
      }
    },
  };
});

// Mock env
const env = {
  DB: {},
  JWT_SECRET: 'test-secret',
};

describe('photo route', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return correct photos', async () => {
    const response = await app.request('/api/photos/2024/test', {}, env);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      code: 200,
      status: 'Success',
      message: 'ok',
      data: {
        album: mockAlbumList[0],
        photos: mockPhotoList,
      },
    });
  });

  describe('upload photo', () => {
    it('should return 200', async () => {
      const response = await app.request(
        '/api/photos/upload/test?filename=test.jpg&mimeType=image/jpeg',
        {},
        env,
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.uploadUrl).toBeDefined();
    });
  });
});

describe('Move photo', () => {
  it('should return 200', async () => {
    // Mock deleteObjects to resolve true
    const { deleteObjects } = await import('../../src/utils/helpers');
    vi.mocked(deleteObjects).mockResolvedValue(true);

    const response = await app.request(
      '/api/photos',
      {
        method: 'PUT',
        body: JSON.stringify({
          albumId: 'Test-album',
          destinationAlbumId: 'test-album-1',
          photoKeys: ['test-photo-1'],
        }),
        headers: { 'Content-Type': 'application/json' },
      },
      env,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      code: 200,
      status: 'Success',
      message: 'Photo moved',
    });
  });

  it('should batch delete when moving multiple photos', async () => {
    // Mock deleteObjects to resolve true
    const { deleteObjects } = await import('../../src/utils/helpers');
    // Reset limits to ensure clean state
    vi.mocked(deleteObjects).mockClear();
    vi.mocked(deleteObjects).mockResolvedValue(true);

    const response = await app.request(
      '/api/photos',
      {
        method: 'PUT',
        body: JSON.stringify({
          albumId: 'Test-album',
          destinationAlbumId: 'test-album-1',
          photoKeys: ['p1', 'p2', 'p3'],
        }),
        headers: { 'Content-Type': 'application/json' },
      },
      env,
    );

    expect(response.status).toBe(200);
    expect(deleteObjects).toHaveBeenCalledTimes(1);
    // The keys passed to deleteObjects should be the source keys
    expect(deleteObjects).toHaveBeenCalledWith(['Test-album/p1', 'Test-album/p2', 'Test-album/p3']);
  });

  describe('Rename photo', () => {
    it('should return 200', async () => {
      const response = await app.request(
        '/api/photos/rename',
        {
          method: 'PUT',
          body: JSON.stringify({
            albumId: 'Test-album',
            newPhotoKey: 'test-photo-1',
            currentPhotoKey: 'test-photo-2',
          }),
          headers: { 'Content-Type': 'application/json' },
        },
        env,
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({
        code: 200,
        status: 'Success',
        message: 'Photo renamed',
      });
    });

    // Validation tests commented out
  });

  describe('delete delete', () => {
    it('should return 200', async () => {
      const response = await app.request(
        '/api/photos',
        {
          method: 'DELETE',
          body: JSON.stringify({
            albumId: 'Test-album',
            photoKeys: ['test-photo-1'],
          }),
          headers: { 'Content-Type': 'application/json' },
        },
        env,
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({
        code: 200,
        status: 'Success',
        message: 'Photo deleted',
      });
    });

    // Validation tests commented out
  });
});
