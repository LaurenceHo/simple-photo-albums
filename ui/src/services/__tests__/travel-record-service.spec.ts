import type { TravelRecord } from '@/schema';
import { ApiBaseUrl } from '@/services/api-base-url';
import { BaseApiRequestService } from '@/services/base-api-request-service';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { TravelRecordService } from '../travel-record-service';

// Mock the BaseApiRequestService
vi.mock('@/services/base-api-request-service', () => ({
  BaseApiRequestService: {
    perform: vi.fn(),
  },
}));

describe('TravelRecordService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockTravelRecord: TravelRecord = {
    id: '1',
    travelDate: '2023-01-01',
    transportType: 'flight',
    airline: 'Test Airline',
    flightNumber: 'TA123',
  };

  describe('getTravelRecords', () => {
    it('should call BaseApiRequestService.perform with correct parameters', async () => {
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue([]) };
      (BaseApiRequestService.perform as Mock).mockResolvedValue(mockResponse);

      await TravelRecordService.getTravelRecords();

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'GET',
        `${ApiBaseUrl}/travel-records`,
      );
    });

    it('should return the JSON response from the API', async () => {
      const mockRecords = [mockTravelRecord];
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockRecords) };
      (BaseApiRequestService.perform as Mock).mockResolvedValue(mockResponse);

      const result = await TravelRecordService.getTravelRecords();

      expect(result).toEqual(mockRecords);
    });

    it('should throw an error if the API request fails', async () => {
      const mockResponse = { ok: false, statusText: 'Internal Server Error' };
      (BaseApiRequestService.perform as Mock).mockResolvedValue(mockResponse);

      await expect(TravelRecordService.getTravelRecords()).rejects.toThrow('Internal Server Error');
    });
  });

  describe('createTravelRecord', () => {
    it('should call BaseApiRequestService.perform with correct parameters', async () => {
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ status: 'success' }) };
      (BaseApiRequestService.perform as Mock).mockResolvedValue(mockResponse);

      await TravelRecordService.createTravelRecord(mockTravelRecord);

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'POST',
        `${ApiBaseUrl}/travel-records`,
        mockTravelRecord,
      );
    });

    it('should return success status from API', async () => {
      const mockStatus = { status: 'success' };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockStatus) };
      (BaseApiRequestService.perform as Mock).mockResolvedValue(mockResponse);

      const result = await TravelRecordService.createTravelRecord(mockTravelRecord);

      expect(result).toEqual(mockStatus);
    });

    it('should throw an error if the API request fails', async () => {
      const mockResponse = { ok: false, statusText: 'Bad Request' };
      (BaseApiRequestService.perform as Mock).mockResolvedValue(mockResponse);

      await expect(TravelRecordService.createTravelRecord(mockTravelRecord)).rejects.toThrow(
        'Bad Request',
      );
    });
  });

  describe('updateTravelRecord', () => {
    it('should call BaseApiRequestService.perform with correct parameters', async () => {
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ status: 'success' }) };
      (BaseApiRequestService.perform as Mock).mockResolvedValue(mockResponse);

      await TravelRecordService.updateTravelRecord(mockTravelRecord);

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'PUT',
        `${ApiBaseUrl}/travel-records`,
        mockTravelRecord,
      );
    });

    it('should return success status from API', async () => {
      const mockStatus = { status: 'success' };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockStatus) };
      (BaseApiRequestService.perform as Mock).mockResolvedValue(mockResponse);

      const result = await TravelRecordService.updateTravelRecord(mockTravelRecord);

      expect(result).toEqual(mockStatus);
    });

    it('should throw an error if the API request fails', async () => {
      const mockResponse = { ok: false, statusText: 'Not Found' };
      (BaseApiRequestService.perform as Mock).mockResolvedValue(mockResponse);

      await expect(TravelRecordService.updateTravelRecord(mockTravelRecord)).rejects.toThrow(
        'Not Found',
      );
    });
  });

  describe('deleteTravelRecord', () => {
    it('should call BaseApiRequestService.perform with correct parameters', async () => {
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ status: 'success' }) };
      (BaseApiRequestService.perform as Mock).mockResolvedValue(mockResponse);

      const recordId = '123';
      await TravelRecordService.deleteTravelRecord(recordId);

      expect(BaseApiRequestService.perform).toHaveBeenCalledWith(
        'DELETE',
        `${ApiBaseUrl}/travel-records/123`,
      );
    });

    it('should return success status from API', async () => {
      const mockStatus = { status: 'success' };
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue(mockStatus) };
      (BaseApiRequestService.perform as Mock).mockResolvedValue(mockResponse);

      const result = await TravelRecordService.deleteTravelRecord('123');

      expect(result).toEqual(mockStatus);
    });

    it('should throw an error if the API request fails', async () => {
      const mockResponse = { ok: false, statusText: 'Unauthorized' };
      (BaseApiRequestService.perform as Mock).mockResolvedValue(mockResponse);

      await expect(TravelRecordService.deleteTravelRecord('123')).rejects.toThrow('Unauthorized');
    });
  });
});
