import { z } from 'zod';

const LOCATION_API_TIMEOUT_MS = 10_000;

/** Zod schema for a single place in Google Places API v1 searchText response. */
const PlacesAddressComponentSchema = z.object({
  types: z.array(z.string()),
  shortText: z.string().optional(),
  longText: z.string().optional(),
});

const PlacesSearchResultSchema = z.object({
  formattedAddress: z.string(),
  displayName: z.object({
    text: z.string(),
    languageCode: z.string().optional(),
  }),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  addressComponents: z.array(PlacesAddressComponentSchema).optional(),
});

const PlacesSearchResponseSchema = z.object({
  places: z.array(PlacesSearchResultSchema).optional(),
});

export type PlacesSearchResponse = z.infer<typeof PlacesSearchResponseSchema>;
export type PlacesSearchResult = z.infer<typeof PlacesSearchResultSchema>;
export type PlacesAddressComponent = z.infer<typeof PlacesAddressComponentSchema>;

/**
 * Search locations using Google Places API
 *
 * @param textQuery Search query text
 * @param maskFields Fields to include in the response
 * @returns JSON response from Google Places API
 */
export const getLocation = async (
  apiKey: string,
  textQuery: string,
  maskFields: string,
): Promise<PlacesSearchResponse> => {
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOCATION_API_TIMEOUT_MS);

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': maskFields,
      },
      body: JSON.stringify({ textQuery, languageCode: 'en' }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Google Places API returned ${response.status}`);
    }

    const data: unknown = await response.json();
    return PlacesSearchResponseSchema.parse(data);
  } finally {
    clearTimeout(timeoutId);
  }
};
