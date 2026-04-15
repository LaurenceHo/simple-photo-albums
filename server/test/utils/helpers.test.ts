import { beforeEach, describe, expect, it, vi } from 'vitest';
import R2Service from '../../src/services/r2-service';
import {
  buildR2Config,
  deleteObjects,
  emptyR2Folder,
  haversineDistance,
  isValidCoordination,
  uploadObject,
  verifyIfIsAdmin,
} from '../../src/utils/helpers';
import { signJwt } from '../../src/utils/jwt';

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

  it('should throw for null input', () => {
    expect(() => {
      haversineDistance(null as unknown as number, 0, 0, 0);
    }).toThrow('All inputs must be numbers');
  });

  it('should throw for undefined input', () => {
    expect(() => {
      haversineDistance(0, undefined as unknown as number, 0, 0);
    }).toThrow('All inputs must be numbers');
  });

  it('should handle antipodal points (max distance ~20015 km)', () => {
    // North pole to south pole
    const distance = haversineDistance(90, 0, -90, 0);
    expect(distance).toBeCloseTo(20015, -1);
  });
});

describe('isValidCoordination', () => {
  it('should return true for valid coordinates', () => {
    expect(isValidCoordination(48.8566, 2.3522)).toBe(true);
  });

  it('should return true for zero coordinates', () => {
    expect(isValidCoordination(0, 0)).toBe(true);
  });

  it('should return true for negative coordinates', () => {
    expect(isValidCoordination(-33.8688, -151.2093)).toBe(true);
  });

  it('should return false for NaN latitude', () => {
    expect(isValidCoordination(NaN, 2.3522)).toBe(false);
  });

  it('should return false for NaN longitude', () => {
    expect(isValidCoordination(48.8566, NaN)).toBe(false);
  });

  it('should return false for both NaN', () => {
    expect(isValidCoordination(NaN, NaN)).toBe(false);
  });

  it('should return false for string masquerading as number', () => {
    expect(isValidCoordination('hello' as unknown as number, 0)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isValidCoordination(null as unknown as number, 0)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isValidCoordination(undefined as unknown as number, 0)).toBe(false);
  });
});

describe('buildR2Config', () => {
  it('should map all Bindings fields to R2Config', () => {
    const env = {
      CLOUDFLARE_ACCOUNT_ID: 'acct-123',
      R2_ACCESS_KEY: 'ak-456',
      R2_SECRET_KEY: 'sk-789',
      REGION_NAME: 'us-east-1',
      VITE_IMAGEKIT_CDN_URL: 'https://cdn.example.com',
    };

    const config = buildR2Config(env as any);

    expect(config).toEqual({
      accountId: 'acct-123',
      accessKey: 'ak-456',
      secretKey: 'sk-789',
      region: 'us-east-1',
      cdnUrl: 'https://cdn.example.com',
    });
  });

  it('should handle undefined optional fields', () => {
    const env = {
      CLOUDFLARE_ACCOUNT_ID: 'acct',
      R2_ACCESS_KEY: 'key',
      R2_SECRET_KEY: 'secret',
      REGION_NAME: undefined,
      VITE_IMAGEKIT_CDN_URL: undefined,
    };

    const config = buildR2Config(env as any);

    expect(config.region).toBeUndefined();
    expect(config.cdnUrl).toBeUndefined();
  });
});

describe('uploadObject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockConfig = {
    accountId: 'test-id',
    accessKey: 'test-key',
    secretKey: 'test-secret',
  };

  it('should call R2Service.create with correct PutObjectCommandInput', async () => {
    const createMock = vi.fn().mockResolvedValue(true);
    (R2Service as any).prototype.create = createMock;

    await uploadObject(mockConfig, 'my-bucket', 'photos/test.jpg', 'binary-data');

    expect(createMock).toHaveBeenCalledWith({
      Body: 'binary-data',
      Bucket: 'my-bucket',
      Key: 'photos/test.jpg',
    });
  });

  it('should use empty string body when object is null', async () => {
    const createMock = vi.fn().mockResolvedValue(true);
    (R2Service as any).prototype.create = createMock;

    await uploadObject(mockConfig, 'bucket', 'key', null);

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ Body: '' }));
  });

  it('should throw wrapped error when R2Service.create fails', async () => {
    (R2Service as any).prototype.create = vi.fn().mockRejectedValue(new Error('S3 error'));

    await expect(uploadObject(mockConfig, 'bucket', 'key', 'data')).rejects.toThrow(
      'Error when uploading photo',
    );
  });

  it('should preserve original error as cause', async () => {
    const originalError = new Error('connection refused');
    (R2Service as any).prototype.create = vi.fn().mockRejectedValue(originalError);

    try {
      await uploadObject(mockConfig, 'bucket', 'key', 'data');
      expect.unreachable('should have thrown');
    } catch (err: any) {
      expect(err.cause).toBe(originalError);
    }
  });
});

describe('verifyIfIsAdmin', () => {
  const JWT_SECRET = 'test-jwt-secret-at-least-32-characters!!';

  function createMockContext(cookie?: string) {
    return {
      env: { JWT_SECRET },
      req: {
        raw: {
          headers: new Headers(cookie ? { Cookie: `jwt=${cookie}` } : {}),
        },
      },
      header: vi.fn(), // needed by setCookie
    } as any;
  }

  it('should return false when no jwt cookie present', async () => {
    const c = createMockContext();
    const result = await verifyIfIsAdmin(c);
    expect(result).toBe(false);
  });

  it('should return true for valid admin JWT', async () => {
    const token = await signJwt({ role: 'admin', uid: '1' }, JWT_SECRET);
    const c = createMockContext(token);
    const result = await verifyIfIsAdmin(c);
    expect(result).toBe(true);
  });

  it('should return false for valid JWT with non-admin role', async () => {
    const token = await signJwt({ role: 'viewer', uid: '2' }, JWT_SECRET);
    const c = createMockContext(token);
    const result = await verifyIfIsAdmin(c);
    expect(result).toBe(false);
  });

  it('should return false for valid JWT with no role claim', async () => {
    const token = await signJwt({ uid: '3' }, JWT_SECRET);
    const c = createMockContext(token);
    const result = await verifyIfIsAdmin(c);
    expect(result).toBe(false);
  });

  it('should return false and clear cookie for invalid JWT', async () => {
    const c = createMockContext('invalid.jwt.token');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await verifyIfIsAdmin(c);

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      'JWT verification failed in verifyIfIsAdmin:',
      expect.anything(),
    );
    // setCookie calls c.header('set-cookie', ...)
    expect(c.header).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should return false and clear cookie for expired JWT', async () => {
    const token = await signJwt({ role: 'admin' }, JWT_SECRET, '0s');
    await new Promise((r) => setTimeout(r, 50));

    const c = createMockContext(token);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await verifyIfIsAdmin(c);

    expect(result).toBe(false);
    expect(c.header).toHaveBeenCalled();

    vi.restoreAllMocks();
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

    it('should recurse when IsTruncated is true', async () => {
      const listMock = vi
        .fn()
        .mockResolvedValueOnce({
          Contents: [{ Key: 'file1' }],
          IsTruncated: true,
        })
        .mockResolvedValueOnce({
          Contents: [{ Key: 'file2' }],
          IsTruncated: false,
        });
      (R2Service as any).prototype.listObjects = listMock;
      (R2Service as any).prototype.delete = vi.fn().mockResolvedValue(true);

      const result = await emptyR2Folder(mockConfig, 'test-bucket', 'folder');

      expect(result).toBe(true);
      expect(listMock).toHaveBeenCalledTimes(2);
    });

    it('should return false when emptyFolder throws an error', async () => {
      (R2Service as any).prototype.listObjects = vi
        .fn()
        .mockRejectedValue(new Error('network error'));

      const result = await emptyR2Folder(mockConfig, 'test-bucket', 'folder');

      expect(result).toBe(false);
    });

    it('should filter out entries without Key', async () => {
      (R2Service as any).prototype.listObjects = vi.fn().mockResolvedValue({
        Contents: [{ Key: 'valid-key' }, { Key: '' }, { Key: null }],
        IsTruncated: false,
      });
      const deleteMock = vi.fn().mockResolvedValue(true);
      (R2Service as any).prototype.delete = deleteMock;

      const result = await emptyR2Folder(mockConfig, 'test-bucket', 'folder');

      expect(result).toBe(true);
    });

    it('should append trailing slash to folder prefix', async () => {
      const listMock = vi.fn().mockResolvedValue({ Contents: [] });
      (R2Service as any).prototype.listObjects = listMock;

      await emptyR2Folder(mockConfig, 'test-bucket', 'my-folder');

      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ Prefix: 'my-folder/' }));
    });

    it('should not double-append slash if already present', async () => {
      const listMock = vi.fn().mockResolvedValue({ Contents: [] });
      (R2Service as any).prototype.listObjects = listMock;

      await emptyR2Folder(mockConfig, 'test-bucket', 'my-folder/');

      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ Prefix: 'my-folder/' }));
    });
  });
});
