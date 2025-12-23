import { ApiBaseUrl } from '@/services/api-base-url';
import { BaseApiRequestService } from '@/services/base-api-request-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoService } from '../photo-service';

// Mock the BaseApiRequestService
vi.mock('@/services/base-api-request-service', () => ({
  BaseApiRequestService: {
    perform: vi.fn(),
  },
}));

// Mock the global fetch for the S3 upload
global.fetch = vi.fn();

describe('PhotoService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getPhotosByAlbumId', () => {
    it('should call BaseApiRequestService.perform with correct parameters', async () => {
      const albumId = '123';
      const year = '2023';
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue([]) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await PhotoService.getPhotosByAlbumId(albumId, year);

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'GET',
        `${ApiBaseUrl}/photos/${year}/${albumId}`,
      );
    });

    it('should return the JSON response from the API when successful', async () => {
      const mockPhotos = { photos: [{ id: '1', url: 'http://example.com/photo1.jpg' }] };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockPhotos) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      const result = await PhotoService.getPhotosByAlbumId('123', '2023');

      expect(result).toEqual(mockPhotos);
    });

    it('should throw an error if the API request fails', async () => {
      const mockResponse = { ok: false, statusText: 'Not Found' };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await expect(PhotoService.getPhotosByAlbumId('123', '2023')).rejects.toThrow('Not Found');
    });
  });

  describe('uploadPhotos', () => {
    it('should call BaseApiRequestService.perform with correct parameters to get presigned URL', async () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const albumId = '123';
      const mockApiResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { uploadUrl: 'https://s3-presigned-url' } }),
      };
      const mockS3Response = { ok: true };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockApiResponse);
      (global.fetch as any).mockResolvedValue(mockS3Response);

      await PhotoService.uploadPhotos(file, albumId);

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'GET',
        `${ApiBaseUrl}/photos/upload/${albumId}?filename=${file.name}&mimeType=${encodeURIComponent(
          file.type,
        )}`,
      );
    });

    it('should correctly encode special characters in filename', async () => {
      const file = new File([''], 'test #1.jpg', { type: 'image/jpeg' });
      const albumId = '123';
      const mockApiResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { uploadUrl: 'https://s3-presigned-url' } }),
      };
      const mockS3Response = { ok: true };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockApiResponse);
      (global.fetch as any).mockResolvedValue(mockS3Response);

      await PhotoService.uploadPhotos(file, albumId);

      const params = new URLSearchParams({ filename: file.name, mimeType: file.type });
      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'GET',
        `${ApiBaseUrl}/photos/upload/${albumId}?${params.toString()}`,
      );
    });

    it('should call fetch with the presigned URL and correct parameters', async () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const albumId = '123';
      const mockUploadUrl = 'https://s3-presigned-url';
      const mockApiResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { uploadUrl: mockUploadUrl } }),
      };
      const mockS3Response = { ok: true };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockApiResponse);
      (global.fetch as any).mockResolvedValue(mockS3Response);

      await PhotoService.uploadPhotos(file, albumId);

      expect(global.fetch).toHaveBeenCalledWith(mockUploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
    });

    it('should return ResponseStatus when upload is successful', async () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const albumId = '123';
      const mockApiResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { uploadUrl: 'https://s3-presigned-url' } }),
      };
      const mockS3Response = { ok: true };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockApiResponse);
      (global.fetch as any).mockResolvedValue(mockS3Response);

      const result = await PhotoService.uploadPhotos(file, albumId);

      expect(result).toEqual({
        code: 200,
        status: 'Success',
        message: 'ok',
      });
    });

    it('should throw an error if fetching presigned URL fails', async () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const albumId = '123';
      const mockResponse = { ok: false, statusText: 'Bad Request' };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await expect(PhotoService.uploadPhotos(file, albumId)).rejects.toThrow('Bad Request');
    });

    it('should throw an error if upload URL is not returned', async () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const albumId = '123';
      const mockApiResponse = { ok: true, json: vi.fn().mockResolvedValue({ data: {} }) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockApiResponse);

      await expect(PhotoService.uploadPhotos(file, albumId)).rejects.toThrow(
        'Upload URL not found',
      );
    });

    it('should throw an error if S3 upload fails', async () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const albumId = '123';
      const mockApiResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { uploadUrl: 'https://s3-presigned-url' } }),
      };
      const mockS3Response = { ok: false, statusText: 'Forbidden' };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockApiResponse);
      (global.fetch as any).mockResolvedValue(mockS3Response);

      await expect(PhotoService.uploadPhotos(file, albumId)).rejects.toThrow('Upload failed');
    });
  });

  describe('movePhotos', () => {
    it('should call BaseApiRequestService.perform with correct parameters', async () => {
      const albumId = '123';
      const destinationAlbumId = '456';
      const photoKeys = ['photo1.jpg', 'photo2.jpg'];
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ status: 'success' }) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await PhotoService.movePhotos(albumId, destinationAlbumId, photoKeys);

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith('PUT', `${ApiBaseUrl}/photos`, {
        albumId,
        destinationAlbumId,
        photoKeys,
      });
    });

    it('should return the ResponseStatus from the API when successful', async () => {
      const mockStatus = { status: 'success' };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockStatus) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      const result = await PhotoService.movePhotos('123', '456', ['photo1.jpg', 'photo2.jpg']);

      expect(result).toEqual(mockStatus);
    });

    it('should throw an error if the API request fails', async () => {
      const mockResponse = { ok: false, statusText: 'Not Found' };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await expect(
        PhotoService.movePhotos('123', '456', ['photo1.jpg', 'photo2.jpg']),
      ).rejects.toThrow('Not Found');
    });
  });

  describe('deletePhotos', () => {
    it('should call BaseApiRequestService.perform with correct parameters', async () => {
      const albumId = '123';
      const photoKeys = ['photo1.jpg', 'photo2.jpg'];
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ status: 'success' }) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await PhotoService.deletePhotos(albumId, photoKeys);

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith('DELETE', `${ApiBaseUrl}/photos`, {
        albumId,
        photoKeys,
      });
    });

    it('should return the ResponseStatus from the API when successful', async () => {
      const mockStatus = { status: 'success' };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockStatus) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      const result = await PhotoService.deletePhotos('123', ['photo1.jpg', 'photo2.jpg']);

      expect(result).toEqual(mockStatus);
    });

    it('should throw an error if the API request fails', async () => {
      const mockResponse = { ok: false, statusText: 'Bad Request' };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await expect(PhotoService.deletePhotos('123', ['photo1.jpg', 'photo2.jpg'])).rejects.toThrow(
        'Bad Request',
      );
    });
  });

  describe('renamePhoto', () => {
    it('should call BaseApiRequestService.perform with correct parameters', async () => {
      const albumId = '123';
      const newPhotoKey = 'newname.jpg';
      const currentPhotoKey = 'oldname.jpg';
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ status: 'success' }) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await PhotoService.renamePhoto(albumId, newPhotoKey, currentPhotoKey);

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'PUT',
        `${ApiBaseUrl}/photos/rename`,
        {
          albumId,
          newPhotoKey,
          currentPhotoKey,
        },
      );
    });

    it('should return the ResponseStatus from the API when successful', async () => {
      const mockStatus = { status: 'success' };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockStatus) };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      const result = await PhotoService.renamePhoto('123', 'newname.jpg', 'oldname.jpg');

      expect(result).toEqual(mockStatus);
    });

    it('should throw an error if the API request fails', async () => {
      const mockResponse = { ok: false, statusText: 'Not Found' };
      (BaseApiRequestService.perform as any).mockResolvedValue(mockResponse);

      await expect(PhotoService.renamePhoto('123', 'newname.jpg', 'oldname.jpg')).rejects.toThrow(
        'Not Found',
      );
    });
  });
});
