import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/index';

const mockTravelRecords = [
  {
    id: '14257dd6-6e41-408d-b3e2-691ceb946591',
    travelDate: '2025-10-31T11:00:00.000Z',
    departure: {
      displayName: 'Tokyo',
      formattedAddress: 'Tokyo, Japan',
      location: { latitude: 35.6764225, longitude: 139.650027 },
    },
    destination: {
      displayName: 'Los Angeles',
      formattedAddress: 'Los Angeles, CA, USA',
      location: { latitude: 34.0549076, longitude: -118.24264299999999 },
    },
    transportType: 'flight',
    flightNumber: null,
    distance: 8819,
    airline: null,
    aircraftType: null,
    durationMinutes: null,
    createdAt: '2025-11-21T21:28:19.883Z',
    createdBy: 'test@example.com',
    updatedAt: '2025-11-21T21:28:19.878Z',
    updatedBy: 'test@example.com',
  },
];

vi.mock('../../src/services/travel-record-service', async () => {
  return {
    default: class {
      async getAll() {
        return mockTravelRecords;
      }
      async create() {
        return 'created';
      }
      async update() {
        return 'updated';
      }
      async delete() {
        return 'deleted';
      }
    },
  };
});

vi.mock('../../src/services/flight-service', async () => {
  const { FlightNotFoundError, FlightApiError } = await import('../../src/services/flight-service');
  return {
    FlightNotFoundError,
    FlightApiError,
    default: class {
      async getFlightByNumber(flightNumber: string, date: string) {
        if (flightNumber === 'XX999') {
          throw new FlightNotFoundError();
        }
        if (flightNumber === 'ERR500') {
          throw new FlightApiError('AeroDataBox API returned 500');
        }
        return {
          departure: {
            displayName: 'Tokyo Haneda Airport',
            formattedAddress: 'Tokyo, JP',
            location: { latitude: 35.5494, longitude: 139.7798 },
          },
          destination: {
            displayName: 'Los Angeles International Airport',
            formattedAddress: 'Los Angeles, US',
            location: { latitude: 33.9425, longitude: -118.408 },
          },
          airline: 'All Nippon Airways',
          flightNumber: 'NH 106',
          aircraftType: 'Boeing 777-300ER',
          distance: 8819,
          durationMinutes: 585,
        };
      }
    },
  };
});

vi.mock('../../src/routes/auth-middleware', async () => {
  const { createMiddleware } = await import('hono/factory');
  return {
    verifyJwtClaim: createMiddleware(async (c, next) => {
      c.set('user', { role: 'admin', email: 'test@test.com' });
      await next();
    }),
    verifyUserPermission: createMiddleware(async (c, next) => await next()),
    optionalVerifyJwtClaim: createMiddleware(async (c, next) => await next()),
  };
});

vi.mock('../../src/utils/helpers', async () => ({
  emptyS3Folder: () => Promise.resolve(true),
  uploadObject: () => Promise.resolve(true),
  verifyIfIsAdmin: () => true,
  haversineDistance: () => 8819,
  isValidCoordination: () => true,
}));

const env = {
  DB: {},
  JWT_SECRET: 'test-secret',
  RAPIDAPI_KEY: 'test-rapid-api-key',
};

const postTravelRecord = (body: Record<string, unknown>, envOverride = env) =>
  app.request(
    '/api/travel-records',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
    envOverride,
  );

describe('travel record route', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return all travel records', async () => {
    const response = await app.request('/api/travel-records', {}, env);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.code).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('14257dd6-6e41-408d-b3e2-691ceb946591');
  });

  it('should create travel record via flight API mode', async () => {
    const response = await postTravelRecord({
      id: 'new-flight-record',
      travelDate: '2025-01-15T00:00:00Z',
      transportType: 'flight',
      flightNumber: 'NH106',
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ code: 200, status: 'Success', message: 'Travel record created' });
  });

  it('should create travel record via manual mode', async () => {
    const response = await postTravelRecord({
      id: 'new-manual-record',
      travelDate: '2025-01-15T00:00:00Z',
      transportType: 'flight',
      departure: {
        displayName: 'Tokyo',
        formattedAddress: 'Tokyo, Japan',
        location: { latitude: 35.6764225, longitude: 139.650027 },
      },
      destination: {
        displayName: 'Los Angeles',
        formattedAddress: 'Los Angeles, CA, USA',
        location: { latitude: 34.0549076, longitude: -118.242643 },
      },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ code: 200, status: 'Success', message: 'Travel record created' });
  });

  it('should return 404 when flight is not found', async () => {
    const response = await postTravelRecord({
      id: 'fail-flight-record',
      travelDate: '2025-01-15T00:00:00Z',
      transportType: 'flight',
      flightNumber: 'XX999',
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe(404);
    expect(body.message).toBe('No flight data found for the given flight number and date');
  });

  it('should return 500 when flight API provider fails', async () => {
    const response = await postTravelRecord({
      id: 'provider-error-record',
      travelDate: '2025-01-15T00:00:00Z',
      transportType: 'flight',
      flightNumber: 'ERR500',
    });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe(500);
    expect(body.message).toBe('Failed to fetch flight data from provider');
  });

  it('should return 500 when RAPIDAPI_KEY is missing', async () => {
    const response = await postTravelRecord(
      {
        id: 'no-key-record',
        travelDate: '2025-01-15T00:00:00Z',
        transportType: 'flight',
        flightNumber: 'NH106',
      },
      { DB: {}, JWT_SECRET: 'test-secret' } as any,
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).toBe('RAPIDAPI_KEY is not configured');
  });
});
