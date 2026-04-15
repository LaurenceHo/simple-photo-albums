import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/index';

let mockServiceBehavior: 'success' | 'error' = 'success';

vi.mock('../../src/services/travel-record-service', () => ({
  default: class {
    async getAll() {
      if (mockServiceBehavior === 'error') throw new Error('DB error');
      return [];
    }
    async create() {
      if (mockServiceBehavior === 'error') throw new Error('Insert failed');
    }
    async update() {
      if (mockServiceBehavior === 'error') throw new Error('Update failed');
    }
    async delete() {
      if (mockServiceBehavior === 'error') throw new Error('Delete failed');
    }
  },
}));

vi.mock('../../src/services/flight-service', async () => {
  const { FlightNotFoundError, FlightApiError } = await import('../../src/services/flight-service');
  return {
    FlightNotFoundError,
    FlightApiError,
    default: class {
      async getFlightByNumber() {
        return {
          departure: {
            displayName: 'A Airport',
            formattedAddress: 'A',
            location: { latitude: 0, longitude: 0 },
          },
          destination: {
            displayName: 'B Airport',
            formattedAddress: 'B',
            location: { latitude: 1, longitude: 1 },
          },
          airline: 'Test Air',
          flightNumber: 'TA1',
          distance: 100,
          durationMinutes: 60,
        };
      }
    },
  };
});

let mockIsValidCoord = true;

vi.mock('../../src/utils/helpers', () => ({
  buildR2Config: () => ({}),
  emptyR2Folder: () => Promise.resolve(true),
  uploadObject: () => Promise.resolve(true),
  verifyIfIsAdmin: () => true,
  haversineDistance: () => 500,
  isValidCoordination: () => mockIsValidCoord,
}));

vi.mock('../../src/routes/auth-middleware', async () => {
  const { createMiddleware } = await import('hono/factory');
  return {
    verifyJwtClaim: createMiddleware(async (c, next) => {
      c.set('user', { role: 'admin', email: 'admin@test.com' });
      await next();
    }),
    verifyUserPermission: createMiddleware(async (c, next) => await next()),
    optionalVerifyJwtClaim: createMiddleware(async (c, next) => await next()),
  };
});

const env = {
  DB: {},
  JWT_SECRET: 'test-secret',
  RAPIDAPI_KEY: 'test-key',
};

function postRecord(body: Record<string, unknown>) {
  return app.request(
    '/api/travel-records',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
    env,
  );
}

function putRecord(body: Record<string, unknown>) {
  return app.request(
    '/api/travel-records',
    {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
    env,
  );
}

describe('Travel record route - error paths', () => {
  beforeEach(() => {
    mockServiceBehavior = 'success';
    mockIsValidCoord = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ------------------------------------------------------------------ */
  /* findAll errors                                                      */
  /* ------------------------------------------------------------------ */
  describe('GET /api/travel-records', () => {
    it('should return 500 when service throws', async () => {
      mockServiceBehavior = 'error';
      const res = await app.request('/api/travel-records', {}, env);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Failed to query travel records');
    });
  });

  /* ------------------------------------------------------------------ */
  /* create errors                                                       */
  /* ------------------------------------------------------------------ */
  describe('POST /api/travel-records', () => {
    it('should return 500 when service create throws', async () => {
      mockServiceBehavior = 'error';
      const res = await postRecord({
        travelDate: '2025-01-15T00:00:00Z',
        transportType: 'bus',
        departure: {
          displayName: 'A',
          formattedAddress: 'A',
          location: { latitude: 0, longitude: 0 },
        },
        destination: {
          displayName: 'B',
          formattedAddress: 'B',
          location: { latitude: 1, longitude: 1 },
        },
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Failed to create travel record');
    });

    it('should return 500 when coordinates are invalid in manual mode', async () => {
      mockIsValidCoord = false;
      const res = await postRecord({
        travelDate: '2025-01-15T00:00:00Z',
        transportType: 'train',
        departure: {
          displayName: 'A',
          formattedAddress: 'A',
          location: { latitude: 999, longitude: 999 },
        },
        destination: {
          displayName: 'B',
          formattedAddress: 'B',
          location: { latitude: 999, longitude: 999 },
        },
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Invalid coordinates');
    });

    it('should create record with zero distance when no departure/destination and not flight API', async () => {
      const res = await postRecord({
        travelDate: '2025-01-15T00:00:00Z',
        transportType: 'bus',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('Travel record created');
    });
  });

  /* ------------------------------------------------------------------ */
  /* update                                                              */
  /* ------------------------------------------------------------------ */
  describe('PUT /api/travel-records', () => {
    it('should update travel record successfully', async () => {
      const res = await putRecord({
        id: 'record-1',
        travelDate: '2025-01-15T00:00:00Z',
        transportType: 'flight',
        departure: {
          displayName: 'A',
          formattedAddress: 'A',
          location: { latitude: 0, longitude: 0 },
        },
        destination: {
          displayName: 'B',
          formattedAddress: 'B',
          location: { latitude: 1, longitude: 1 },
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('Travel record updated');
    });

    it('should return 400 when id is missing', async () => {
      const res = await putRecord({
        travelDate: '2025-01-15T00:00:00Z',
        transportType: 'bus',
        departure: {
          displayName: 'A',
          formattedAddress: 'A',
          location: { latitude: 0, longitude: 0 },
        },
        destination: {
          displayName: 'B',
          formattedAddress: 'B',
          location: { latitude: 1, longitude: 1 },
        },
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe('Record ID is required for update');
    });

    it('should return 500 when service update throws', async () => {
      mockServiceBehavior = 'error';
      const res = await putRecord({
        id: 'record-1',
        travelDate: '2025-01-15T00:00:00Z',
        transportType: 'bus',
        departure: {
          displayName: 'A',
          formattedAddress: 'A',
          location: { latitude: 0, longitude: 0 },
        },
        destination: {
          displayName: 'B',
          formattedAddress: 'B',
          location: { latitude: 1, longitude: 1 },
        },
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Failed to update travel record');
    });
  });

  /* ------------------------------------------------------------------ */
  /* delete                                                              */
  /* ------------------------------------------------------------------ */
  describe('DELETE /api/travel-records/:recordId', () => {
    it('should delete travel record successfully', async () => {
      const res = await app.request('/api/travel-records/record-1', { method: 'DELETE' }, env);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('Travel record deleted');
    });

    it('should return 500 when service delete throws', async () => {
      mockServiceBehavior = 'error';
      const res = await app.request('/api/travel-records/record-1', { method: 'DELETE' }, env);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe('Failed to delete travel record');
    });
  });
});
