import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/index';

const mockGetLocation = vi.fn();

vi.mock('../../src/services/location-service', () => ({
  getLocation: (...args: any[]) => mockGetLocation(...args),
}));

const env = {
  DB: {},
};

describe('location route', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return 400 when textQuery is missing', async () => {
    const response = await app.request('/api/location/search', {}, env);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('should return correct location', async () => {
    mockGetLocation.mockResolvedValue({
      places: [
        {
          formattedAddress: 'Auckland, New Zealand',
          location: { latitude: -36.85088270000001, longitude: 174.7644881 },
          displayName: { text: 'Auckland', languageCode: 'en' },
        },
      ],
    });

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

  it('should return 500 when location service throws', async () => {
    mockGetLocation.mockRejectedValue(new Error('Google Places API returned 403'));

    const response = await app.request('/api/location/search?textQuery=somewhere', {}, env);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe(500);
    expect(body.message).toBe('Failed to fetch location data');
  });

  it('should return 500 when API key is missing', async () => {
    mockGetLocation.mockRejectedValue(new Error('GOOGLE_PLACES_API_KEY is not configured'));

    const response = await app.request('/api/location/search?textQuery=somewhere', {}, env);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe(500);
    expect(body.message).toBe('Failed to fetch location data');
  });
});
