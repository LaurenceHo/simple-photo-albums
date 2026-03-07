import { ApiBaseUrl } from '@/services/api-base-url';
import { BaseApiRequestService } from '@/services/base-api-request-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AggregateService } from '../aggregate-service';

vi.mock('@/services/base-api-request-service', () => ({
  BaseApiRequestService: {
    perform: vi.fn(),
  },
}));

describe('AggregateService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getAggregateData', () => {
    it('should call BaseApiRequestService.perform with correct parameters', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: 'mock data' }),
      };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await AggregateService.getAggregateData('albums-with-location');

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'GET',
        `${ApiBaseUrl}/aggregate/albums-with-location`,
      );
    });

    it('should return the JSON response from the API', async () => {
      const mockData = { data: 'mock data' };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockData) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      const result = await AggregateService.getAggregateData('featured-albums');

      expect(result).toEqual(mockData);
    });

    it('should throw an error if the API request fails', async () => {
      const mockError = new Error('API request failed');
      (BaseApiRequestService.perform as any).mockRejectedValue(mockError);

      await expect(AggregateService.getAggregateData('featured-albums')).rejects.toThrow(
        'API request failed',
      );
    });

    it('should handle different aggregate types', async () => {
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ data: 'mock data' }) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await AggregateService.getAggregateData('albums-with-location');
      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'GET',
        `${ApiBaseUrl}/aggregate/albums-with-location`,
      );

      await AggregateService.getAggregateData('count-albums-by-year');
      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'GET',
        `${ApiBaseUrl}/aggregate/count-albums-by-year`,
      );
    });
  });
});
