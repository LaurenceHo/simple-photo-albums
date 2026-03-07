import type { ApiResponse, ResponseStatus, TravelRecord } from '@/schema';
import { ApiBaseUrl } from '@/services/api-base-url';
import { BaseApiRequestService } from '@/services/base-api-request-service';

export const TravelRecordService = {
  getTravelRecords: async (): Promise<ApiResponse<TravelRecord[]>> => {
    const response = await BaseApiRequestService.perform('GET', `${ApiBaseUrl}/travel-records`);
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response.json();
  },

  createTravelRecord: async (travelRecord: TravelRecord): Promise<ResponseStatus> => {
    const response = await BaseApiRequestService.perform(
      'POST',
      `${ApiBaseUrl}/travel-records`,
      travelRecord,
    );
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response.json();
  },

  updateTravelRecord: async (travelRecord: TravelRecord): Promise<ResponseStatus> => {
    const response = await BaseApiRequestService.perform(
      'PUT',
      `${ApiBaseUrl}/travel-records`,
      travelRecord,
    );
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response.json();
  },

  deleteTravelRecord: async (recordId: string): Promise<ResponseStatus> => {
    const encodedRecordId = encodeURIComponent(recordId);
    const response = await BaseApiRequestService.perform(
      'DELETE',
      `${ApiBaseUrl}/travel-records/${encodedRecordId}`,
    );
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response.json();
  },
};
