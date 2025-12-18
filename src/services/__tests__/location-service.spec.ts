import { ApiBaseUrl } from '@/services/api-base-url';
import { BaseApiRequestService } from '@/services/base-api-request-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationService } from '../location-service';

// Mock the BaseApiRequestService
vi.mock('@/services/base-api-request-service', () => ({
  BaseApiRequestService: {
    perform: vi.fn(),
  },
}));

describe('LocationService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('searchPlaces', () => {
    it('should call BaseApiRequestService.perform with correct parameters', async () => {
      const searchText = 'New York';
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue([]) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await LocationService.searchPlaces(searchText);

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'GET',
        `${ApiBaseUrl}/location/search?textQuery=${encodeURIComponent(searchText)}`,
      );
    });

    it('should return the JSON response from the API when successful', async () => {
      const mockPlaces = [
        { id: '1', name: 'New York City', country: 'USA' },
        { id: '2', name: 'New York Mills', country: 'USA' },
      ];
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockPlaces) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      const result = await LocationService.searchPlaces('New York');

      expect(result).toEqual(mockPlaces);
    });

    it('should throw an error if the API request fails', async () => {
      const mockResponse = { ok: false, statusText: 'Not Found' };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await expect(LocationService.searchPlaces('Invalid Location')).rejects.toThrow('Not Found');
    });

    it('should properly encode the search text in the URL', async () => {
      const searchText = 'New York City, NY';
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue([]) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await LocationService.searchPlaces(searchText);

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'GET',
        `${ApiBaseUrl}/location/search?textQuery=${encodeURIComponent(searchText)}`,
      );
    });

    it('should handle empty search text', async () => {
      const searchText = '';
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue([]) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await LocationService.searchPlaces(searchText);

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'GET',
        `${ApiBaseUrl}/location/search?textQuery=`,
      );
    });
  });
});
