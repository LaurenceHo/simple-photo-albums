const LOCATION_API_TIMEOUT_MS = 10_000;

/**
 * Search locations using Google Places API
 *
 * @param textQuery Search query text
 * @param maskFields Fields to include in the response
 * @returns JSON response from Google Places API
 */
export const getLocation = async (textQuery: string, maskFields: string) => {
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

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};
