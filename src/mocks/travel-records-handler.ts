import { delay, http, HttpResponse } from 'msw';

export const mockTravelRecords = [
  {
    id: '14257dd6-6e41-408d-b3e2-691ceb946591',
    travelDate: '2025-10-31T11:00:00.000Z',
    departure: {
      displayName: 'Tokyo',
      formattedAddress: 'Tokyo, Japan',
      location: {
        latitude: 35.6764225,
        longitude: 139.650027,
      },
    },
    destination: {
      displayName: 'Los Angeles',
      formattedAddress: 'Los Angeles, CA, USA',
      location: {
        latitude: 34.0549076,
        longitude: -118.24264299999999,
      },
    },
    transportType: 'flight',
    airline: null,
    flightNumber: null,
    distance: 8819,
  },
  {
    id: 'a1f2e0b6-9357-4517-b3aa-83cc5ccfdfe9',
    travelDate: '2025-09-30T11:00:00.000Z',
    departure: {
      displayName: 'Paris',
      formattedAddress: 'Paris, France',
      location: {
        latitude: 48.857547499999995,
        longitude: 2.3513764999999998,
      },
    },
    destination: {
      displayName: 'Sarajevo',
      formattedAddress: 'Sarajevo, Bosnia and Herzegovina',
      location: {
        latitude: 43.856258600000004,
        longitude: 18.4130763,
      },
    },
    transportType: 'flight',
    airline: null,
    flightNumber: null,
    distance: 1349,
  },
  {
    id: '98e0e046-5cc0-4755-be1c-b016cd3bbacc',
    travelDate: '2025-08-31T12:00:00.000Z',
    departure: {
      displayName: 'Auckland',
      formattedAddress: 'Auckland, New Zealand',
      location: {
        latitude: -36.85088270000001,
        longitude: 174.7644881,
      },
    },
    destination: {
      displayName: 'Doha',
      formattedAddress: 'Doha, Qatar',
      location: {
        latitude: 25.285447299999998,
        longitude: 51.531039799999995,
      },
    },
    transportType: 'flight',
    airline: null,
    flightNumber: null,
    distance: 14538,
  },
  {
    id: 'fe9285c8-0ce4-4fdc-a33d-83d00e2a698a',
    travelDate: '2025-09-01T12:00:00.000Z',
    departure: {
      displayName: 'Doha',
      formattedAddress: 'Doha, Qatar',
      location: {
        latitude: 25.285447299999998,
        longitude: 51.531039799999995,
      },
    },
    destination: {
      displayName: 'Paris',
      formattedAddress: 'Paris, France',
      location: {
        latitude: 48.857547499999995,
        longitude: 2.3513764999999998,
      },
    },
    transportType: 'flight',
    airline: null,
    flightNumber: null,
    distance: 4973,
  },
  {
    id: 'ebc3375c-5420-4f32-9434-2c968ec15b7e',
    travelDate: '2025-10-06T11:00:00.000Z',
    departure: {
      displayName: 'Sarajevo',
      formattedAddress: 'Sarajevo, Bosnia and Herzegovina',
      location: {
        latitude: 43.856258600000004,
        longitude: 18.4130763,
      },
    },
    destination: {
      displayName: 'Istanbul',
      formattedAddress: 'Istanbul, İstanbul, Türkiye',
      location: {
        latitude: 41.0082376,
        longitude: 28.9783589,
      },
    },
    transportType: 'flight',
    airline: null,
    flightNumber: null,
    distance: 922,
  },
  {
    id: '218eb36b-3dec-47cf-935e-c72821638af8',
    travelDate: '2025-10-14T11:00:00.000Z',
    departure: {
      displayName: 'Auckland',
      formattedAddress: 'Auckland, New Zealand',
      location: {
        latitude: -36.85088270000001,
        longitude: 174.7644881,
      },
    },
    destination: {
      displayName: 'Brisbane',
      formattedAddress: 'Brisbane QLD, Australia',
      location: {
        latitude: -27.4704528,
        longitude: 153.0260341,
      },
    },
    transportType: 'flight',
    airline: null,
    flightNumber: null,
    distance: 2289,
  },
  {
    id: '5f4f07b7-ddaf-48b5-87b3-b3acd45ddb46',
    travelDate: '2025-10-15T11:00:00.000Z',
    departure: {
      displayName: 'Brisbane',
      formattedAddress: 'Brisbane QLD, Australia',
      location: {
        latitude: -27.4704528,
        longitude: 153.0260341,
      },
    },
    destination: {
      displayName: 'Tokyo',
      formattedAddress: 'Tokyo, Japan',
      location: {
        latitude: 35.6764225,
        longitude: 139.650027,
      },
    },
    transportType: 'flight',
    airline: null,
    flightNumber: null,
    distance: 7160,
  },
  {
    id: '2025-11-09#London#Paris',
    travelDate: '2025-11-09T11:00:00.000Z',
    departure: {
      displayName: 'London',
      formattedAddress: 'London, UK',
      location: {
        latitude: 51.5072178,
        longitude: -0.12758619999999998,
      },
    },
    destination: {
      displayName: 'Paris',
      formattedAddress: 'Paris, France',
      location: {
        latitude: 48.857547499999995,
        longitude: 2.3513764999999998,
      },
    },
    transportType: 'train',
    airline: null,
    flightNumber: null,
    distance: 343,
  },
  {
    id: '2025-11-30#Sarajevo#Bar',
    travelDate: '2025-11-30T11:00:00.000Z',
    departure: {
      displayName: 'Sarajevo',
      formattedAddress: 'Sarajevo, Bosnia and Herzegovina',
      location: {
        latitude: 43.856258600000004,
        longitude: 18.4130763,
      },
    },
    destination: {
      displayName: 'Bar',
      formattedAddress: 'Bar, Montenegro',
      location: {
        latitude: 42.0912106,
        longitude: 19.089904,
      },
    },
    transportType: 'bus',
    airline: null,
    flightNumber: null,
    distance: 204,
  },
];

export const getTravelRecords = http.get('/api/travelRecords', async () => {
  await delay();

  // return new HttpResponse(null, {
  //   status: 500,
  //   statusText: 'Error',
  // });

  return HttpResponse.json({
    code: 200,
    status: 'Success',
    message: 'ok',
    data: mockTravelRecords,
  });
});

export const deleteTravelRecord = http.delete('/api/travelRecords/**', async () => {
  await delay();

  return HttpResponse.json({
    code: 200,
    status: 'Success',
    message: 'ok',
  });
});

export const updateTravelRecords = http.put('/api/travelRecords', async () => {
  await delay();

  return HttpResponse.json({
    code: 200,
    status: 'Success',
    message: 'ok',
  });
});

export const createTravelRecords = http.post('/api/travelRecords', async () => {
  await delay();

  // return new HttpResponse(null, {
  //   status: 500,
  //   statusText: 'Error',
  // });

  return HttpResponse.json({
    code: 200,
    status: 'Success',
    message: 'ok',
  });
});
