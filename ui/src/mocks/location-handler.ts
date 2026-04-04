import { delay, http, HttpResponse } from 'msw';

export const searchPlaces = http.get('/api/location/search?textQuery=**', async () => {
  await delay();

  return HttpResponse.json({
    code: 200,
    status: 'Success',
    message: 'ok',
    data: [
      {
        displayName: 'Paris',
        formattedAddress: 'Paris, France',
        location: {
          latitude: 48.857547499999995,
          longitude: 2.3513764999999998,
        },
      },
    ],
  });
});
