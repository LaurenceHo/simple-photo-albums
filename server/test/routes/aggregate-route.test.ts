import { describe, expect, it, vi } from 'vitest';
import app from '../../src/index';
import { mockAlbumList, mockSignedCookies } from '../mock-data';

const helperMock = vi.hoisted(() => ({
  verifyIfIsAdmin: vi.fn(() => true),
}));

vi.mock('../../src/services/aggregation-service', async () => {
  const { mockAlbumList } = await import('../mock-data');

  return {
    default: class {
      constructor(db: any) {}
      async getAlbumsWithLocation(isAdmin: boolean) {
        return mockAlbumList;
      }
      async getCountAlbumsByYear(includePrivate: boolean) {
        if (includePrivate) {
          return [
            { year: '2018', count: 1 },
            { year: '2019', count: 11 },
            { year: '2020', count: 10 },
            { year: '2021', count: 20 },
          ];
        } else {
          return [
            { year: '2020', count: 10 },
            { year: '2021', count: 20 },
          ];
        }
      }
      async getFeaturedAlbums() {
        return [];
      }
    },
  };
});

vi.mock('../../src/controllers/helpers', () => ({
  verifyIfIsAdmin: () => helperMock.verifyIfIsAdmin,
}));

// Mock env with DB and JWT_SECRET
const env = {
  DB: {},
  JWT_SECRET: 'test-secret',
};

// Set process.env.JWT_SECRET for mockSignedCookies
process.env.JWT_SECRET = 'test-secret';

describe("aggregate route when it's admin", () => {
  it('should return album list', async () => {
    const token = await mockSignedCookies();
    const response = await app.request(
      '/api/aggregate/albumsWithLocation',
      {
        headers: {
          Cookie: `jwt=${token}`,
        },
      },
      env,
    );
    const body = await response.json();
    expect(body).toEqual({
      code: 200,
      status: 'Success',
      message: 'ok',
      data: mockAlbumList,
    });
    expect(response.status).toBe(200);
  });

  it('should return count albums include private album', async () => {
    const token = await mockSignedCookies();
    const response = await app.request(
      '/api/aggregate/countAlbumsByYear',
      {
        headers: {
          Cookie: `jwt=${token}`,
        },
      },
      env,
    );
    const body = await response.json();
    expect(body).toEqual({
      code: 200,
      status: 'Success',
      message: 'ok',
      data: [
        { year: '2018', count: 1 },
        { year: '2019', count: 11 },
        { year: '2020', count: 10 },
        { year: '2021', count: 20 },
      ],
    });
    expect(response.status).toBe(200);
  });

  it('should return 400 bad request', async () => {
    const response = await app.request('/api/aggregate/invalidType', {}, env);
    expect(response.status).toBe(400);
  });
});
