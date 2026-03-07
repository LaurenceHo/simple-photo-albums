import { z } from 'zod';

const LOCATION_API_TIMEOUT_MS = 10_000;

interface GeocodeAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GeocodeResult {
  address_components: GeocodeAddressComponent[];
}

interface GeocodeResponse {
  results: GeocodeResult[];
  status: string;
}

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
 * Reverse-geocode a lat/lng pair to extract the country short code (e.g. "JP", "FR").
 *
 * @param lat Latitude
 * @param lng Longitude
 * @param apiKey Google Maps API key
 * @returns ISO 3166-1 alpha-2 country code, or undefined if not found
 */
export const reverseGeocodeCountry = async (
  lat: number,
  lng: number,
  apiKey: string,
): Promise<string | undefined> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOCATION_API_TIMEOUT_MS);

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=country&key=${apiKey}`;
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Google Geocoding API returned ${response.status}`);
    }

    const data = (await response.json()) as GeocodeResponse & { error_message?: string };
    console.log(
      `Geocode response status=${data.status}, results=${data.results?.length ?? 0}, error=${data.error_message ?? 'none'}`,
    );

    if (!data.results || data.results.length === 0) {
      return undefined;
    }

    const components = data.results[0]?.address_components;
    if (!components) {
      return undefined;
    }

    const countryComponent = components.find((c) => c.types.includes('country'));

    return countryComponent?.short_name;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Search locations using Google Places API
 *
 * @param textQuery Search query text
 * @param maskFields Fields to include in the response
 * @returns JSON response from Google Places API
 */
export const getLocation = async (
  textQuery: string,
  maskFields: string,
): Promise<PlacesSearchResponse> => {
  const apiKey = process.env['GOOGLE_PLACES_API_KEY'];
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOCATION_API_TIMEOUT_MS);

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
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
