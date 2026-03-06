import { describe, expect, it, vi, beforeEach } from 'vitest';
import TravelRecordService from '../../src/services/travel-record-service';

describe('TravelRecordService', () => {
  let service: TravelRecordService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      all: vi.fn(),
      first: vi.fn(),
      run: vi.fn(),
    };
    service = new TravelRecordService(mockDb as any);
  });

  describe('mapTravelRecord', () => {
    it('should parse valid JSON strings for departure and destination', async () => {
      const rawData = {
        id: '1',
        departure: JSON.stringify({ displayName: 'Tokyo', location: { latitude: 35.6, longitude: 139.6 } }),
        destination: JSON.stringify({ displayName: 'London', location: { latitude: 51.5, longitude: -0.1 } }),
        transportType: 'flight',
        travelDate: '2024-01-01',
      };

      mockDb.all.mockResolvedValueOnce({ results: [rawData] });

      const results = await service.getAll();
      const record = results[0];

      expect(record.departure).toEqual({ displayName: 'Tokyo', location: { latitude: 35.6, longitude: 139.6 } });
      expect(record.destination).toEqual({ displayName: 'London', location: { latitude: 51.5, longitude: -0.1 } });
    });

    it('should handle invalid JSON strings by logging error and setting field to undefined', async () => {
      const rawData = {
        id: '2',
        departure: 'invalid-json',
        destination: '{ "incomplete": ',
        transportType: 'bus',
        travelDate: '2024-01-02',
      };

      mockDb.all.mockResolvedValueOnce({ results: [rawData] });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const results = await service.getAll();
      const record = results[0];

      expect(record.departure).toBeUndefined();
      expect(record.destination).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse departure'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse destination'));

      consoleSpy.mockRestore();
    });

    it('should leave non-string fields or nulls as is', async () => {
      const rawData = {
        id: '3',
        departure: null,
        destination: undefined,
        transportType: 'train',
        travelDate: '2024-01-03',
      };

      mockDb.all.mockResolvedValueOnce({ results: [rawData] });

      const results = await service.getAll();
      const record = results[0];

      expect(record.departure).toBeNull();
      expect(record.destination).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('should map the record returned by getById', async () => {
      const rawData = {
        id: '4',
        departure: JSON.stringify({ displayName: 'Paris', location: { latitude: 48.8, longitude: 2.3 } }),
        transportType: 'flight',
        travelDate: '2024-01-04',
      };

      mockDb.first.mockResolvedValueOnce(rawData);

      const record = await service.getById('4');

      expect(record?.departure).toEqual({ displayName: 'Paris', location: { latitude: 48.8, longitude: 2.3 } });
    });

    it('should return null if record is not found', async () => {
      mockDb.first.mockResolvedValueOnce(null);

      const record = await service.getById('999');

      expect(record).toBeNull();
    });
  });
});
