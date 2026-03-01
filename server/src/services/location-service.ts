/**
 * Search locations using Google Places API
 *
 * @param textQuery Search query text
 * @param maskFields Fields to include in the response
 * @returns JSON response from Google Places API
 */
export const getLocation = async (textQuery: string, maskFields: string) => {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Accept': '*/*',
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env['GOOGLE_PLACES_API_KEY'] as string,
      'X-Goog-FieldMask': maskFields,
    },
    body: JSON.stringify({ textQuery, languageCode: 'en' }),
  });
  return await response.json();
};
