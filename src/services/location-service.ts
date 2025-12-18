import type { ApiResponse, Place } from '@/schema';
import { ApiBaseUrl } from '@/services/api-base-url';
import { BaseApiRequestService } from '@/services/base-api-request-service';

export const LocationService = {
  searchPlaces: async (text: string): Promise<ApiResponse<Place[]>> => {
    const response = await BaseApiRequestService.perform(
      'GET',
      `${ApiBaseUrl}/location/search?textQuery=${encodeURIComponent(text || '')}`,
    );

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    return response.json();
  },
};
