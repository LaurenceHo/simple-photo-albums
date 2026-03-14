import { describe, expect, it, vi, beforeEach } from 'vitest';
import { haversineDistance, deleteObjects, emptyR2Folder } from '../../src/utils/helpers';
import R2Service from '../../src/services/r2-service';

vi.mock('../../src/services/r2-service');

describe('haversineDistance', () => {
  it('should calculate distance between two points correctly (km)', () => {
    const istanbul = { lat: 41.0082, lng: 28.9784 };
    const paris = { lat: 48.8566, lng: 2.3522 };

    const distance = haversineDistance(istanbul.lat, istanbul.lng, paris.lat, paris.lng);

    // Known real-world distance: ~2250 km
    expect(distance).toBeGreaterThan(2200);
    expect(distance).toBeLessThan(2300);
    expect(distance).toBeCloseTo(2255.8, 0); // within 1 km
  });

  it('should return 0 for same coordinates', () => {
    const point = { lat: 40.7128, lng: -74.006 };
    const distance = haversineDistance(point.lat, point.lng, point.lat, point.lng);
    expect(distance).toBe(0);
  });

  it('should handle negative latitudes and longitudes', () => {
    const sydney = { lat: -33.8688, lng: 151.2093 };
    const tokyo = { lat: 35.6762, lng: 139.6503 };

    const distance = haversineDistance(sydney.lat, sydney.lng, tokyo.lat, tokyo.lng);

    expect(distance).toBeGreaterThan(7700);
    expect(distance).toBeLessThan(7900);
    expect(distance).toBeCloseTo(7826.5, -1);
  });

  it('should be symmetric (order of points does not matter)', () => {
    const a = { lat: 51.5074, lng: -0.1278 }; // London
    const b = { lat: 40.7128, lng: -74.006 }; // NYC

    const dist1 = haversineDistance(a.lat, a.lng, b.lat, b.lng);
    const dist2 = haversineDistance(b.lat, b.lng, a.lat, a.lng);

    expect(dist1).toBe(dist2);
  });

  it('should throw or return NaN for invalid input', () => {
    // 1. String input → should throw
    expect(() => {
      // @ts-ignore
      haversineDistance('invalid' as any, 0, 0, 0);
    }).toThrow('All inputs must be numbers');

    // 2. NaN input → should return NaN
    const result = haversineDistance(NaN, 0, 0, 0);
    expect(result).toBeNaN();

    // 3. All NaN → still NaN
    expect(haversineDistance(NaN, NaN, NaN, NaN)).toBeNaN();
  });
});

describe('R2 Helpers', () => {
  const mockConfig = {
    accountId: 'test-id',
    accessKey: 'test-key',
    secretKey: 'test-secret',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteObjects', () => {
    it('should return true if no keys provided', async () => {
      const result = await deleteObjects(mockConfig, 'test-bucket', []);
      expect(result).toBe(true);
    });

    it('should return result from R2Service.delete', async () => {
      const deleteMock = vi.fn().mockResolvedValue(true);
      (R2Service as any).prototype.delete = deleteMock;

      const result = await deleteObjects(mockConfig, 'test-bucket', ['key1']);
      expect(result).toBe(true);
      expect(deleteMock).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Delete: { Objects: [{ Key: 'key1' }] },
      });
    });

    it('should return false on failure', async () => {
      (R2Service as any).prototype.delete = vi.fn().mockRejectedValue(new Error('FAIL'));
      const result = await deleteObjects(mockConfig, 'test-bucket', ['key1']);
      expect(result).toBe(false);
    });
  });

  describe('emptyR2Folder', () => {
    it('should return true if no objects found', async () => {
      (R2Service as any).prototype.listObjects = vi.fn().mockResolvedValue({ Contents: [] });
      const result = await emptyR2Folder(mockConfig, 'test-bucket', 'folder');
      expect(result).toBe(true);
    });

    it('should return false if deletion fails', async () => {
      (R2Service as any).prototype.listObjects = vi.fn().mockResolvedValue({
        Contents: [{ Key: 'file1' }],
        IsTruncated: false,
      });
      (R2Service as any).prototype.delete = vi.fn().mockResolvedValue(false);

      const result = await emptyR2Folder(mockConfig, 'test-bucket', 'folder');
      expect(result).toBe(false);
    });

    it('should return true if deletion succeeds', async () => {
      (R2Service as any).prototype.listObjects = vi.fn().mockResolvedValue({
        Contents: [{ Key: 'file1' }],
        IsTruncated: false,
      });
      (R2Service as any).prototype.delete = vi.fn().mockResolvedValue(true);

      const result = await emptyR2Folder(mockConfig, 'test-bucket', 'folder');
      expect(result).toBe(true);
    });
  });
});
