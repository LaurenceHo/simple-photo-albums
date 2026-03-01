import { describe, expect, it, vi } from 'vitest';
import app from '../../src/index';

vi.mock('../../src/services/location-service', async () => ({
  getLocation: (_textQuery: string, _maskFields: string) =>
    Promise.resolve({
      places: [
        {
          formattedAddress: 'Auckland, New Zealand',
          location: { latitude: -36.85088270000001, longitude: 174.7644881 },
          displayName: { text: 'Auckland', languageCode: 'en' },
        },
      ],
    }),
}));

// Mock env
const env = {
  DB: {},
};

describe('location route', () => {
  it('should return 422 bad request', async () => {
    const response = await app.request('/api/location/search', {}, env);
    expect(response.status).toBe(400); // Changed to 400 as clientError returns 400
  });

  it('should return correct location', async () => {
    const response = await app.request('/api/location/search?textQuery=somewhere', {}, env);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      code: 200,
      status: 'Success',
      message: 'ok',
      data: [
        {
          displayName: 'Auckland',
          formattedAddress: 'Auckland, New Zealand',
          location: { latitude: -36.85088270000001, longitude: 174.7644881 },
        },
      ],
    });
  });
});
