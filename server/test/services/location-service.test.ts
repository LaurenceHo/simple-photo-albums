import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLocation } from '../../src/services/location-service';

const mockPlacesResponse = {
  places: [
    {
      formattedAddress: 'Auckland, New Zealand',
      location: { latitude: -36.85088270000001, longitude: 174.7644881 },
      displayName: { text: 'Auckland', languageCode: 'en' },
    },
  ],
};

describe('LocationService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should fetch and return places data', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPlacesResponse),
    } as Response);

    const result = await getLocation('Auckland', 'places.displayName');

    expect(result).toEqual(mockPlacesResponse);
    expect(fetch).toHaveBeenCalledWith(
      'https://places.googleapis.com/v1/places:searchText',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Goog-Api-Key': 'test-api-key',
          'X-Goog-FieldMask': 'places.displayName',
        }),
        body: JSON.stringify({ textQuery: 'Auckland', languageCode: 'en' }),
      }),
    );
  });

  it('should throw when GOOGLE_PLACES_API_KEY is not configured', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '');

    await expect(getLocation('Auckland', 'places.displayName')).rejects.toThrow(
      'GOOGLE_PLACES_API_KEY is not configured',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should throw on non-ok API response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
    } as Response);

    await expect(getLocation('Auckland', 'places.displayName')).rejects.toThrow(
      'Google Places API returned 403',
    );
  });

  it('should pass AbortController signal to fetch', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPlacesResponse),
    } as Response);

    await getLocation('Auckland', 'places.displayName');

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const options = fetchCall?.[1] as RequestInit;
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
});
