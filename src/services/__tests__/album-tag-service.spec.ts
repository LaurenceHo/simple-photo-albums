import { ApiBaseUrl } from '@/services/api-base-url';
import { BaseApiRequestService } from '@/services/base-api-request-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlbumTagService } from '../album-tag-service';

// Mock the BaseApiRequestService
vi.mock('@/services/base-api-request-service', () => ({
  BaseApiRequestService: {
    perform: vi.fn(),
  },
}));

describe('AlbumTagService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getAlbumTags', () => {
    it('should call BaseApiRequestService.perform with correct parameters', async () => {
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue([]) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await AlbumTagService.getAlbumTags();

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith('GET', `${ApiBaseUrl}/albumTags`);
    });

    it('should return the JSON response from the API', async () => {
      const mockTags = [{ tag: 'Tag 1' }, { tag: 'Tag 2' }];
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockTags) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      const result = await AlbumTagService.getAlbumTags();

      expect(result).toEqual(mockTags);
    });

    it('should throw an error if the API request fails', async () => {
      const mockResponse = { ok: false, statusText: 'Not Found' };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await expect(AlbumTagService.getAlbumTags()).rejects.toThrow('Not Found');
    });
  });

  describe('createAlbumTags', () => {
    it('should call BaseApiRequestService.perform with correct parameters', async () => {
      const mockTags = [{ tag: 'New Tag' }];
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ status: 'success' }) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await AlbumTagService.createAlbumTags(mockTags);

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'POST',
        `${ApiBaseUrl}/albumTags`,
        mockTags,
      );
    });

    it('should return the ResponseStatus from the API', async () => {
      const mockStatus = { status: 'success' };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockStatus) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      const result = await AlbumTagService.createAlbumTags([{ tag: 'New Tag' }]);

      expect(result).toEqual(mockStatus);
    });

    it('should throw an error if the API request fails', async () => {
      const mockResponse = { ok: false, statusText: 'Bad Request' };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await expect(AlbumTagService.createAlbumTags([{ tag: 'New Tag' }])).rejects.toThrow(
        'Bad Request',
      );
    });
  });

  describe('deleteAlbumTag', () => {
    it('should call BaseApiRequestService.perform with correct parameters', async () => {
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ status: 'success' }) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await AlbumTagService.deleteAlbumTag('1');

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'DELETE',
        `${ApiBaseUrl}/albumTags/1`,
      );
    });

    it('should return the ResponseStatus from the API', async () => {
      const mockStatus = { status: 'success' };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockStatus) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      const result = await AlbumTagService.deleteAlbumTag('1');

      expect(result).toEqual(mockStatus);
    });

    it('should throw an error if the API request fails', async () => {
      const mockResponse = { ok: false, statusText: 'Not Found' };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await expect(AlbumTagService.deleteAlbumTag('1')).rejects.toThrow('Not Found');
    });
  });
});
