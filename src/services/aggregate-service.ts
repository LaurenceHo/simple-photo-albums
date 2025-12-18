import type { AggregateType, ApiResponse, DataAggregateValueMap } from '@/schema';
import { ApiBaseUrl } from '@/services/api-base-url';
import { BaseApiRequestService } from '@/services/base-api-request-service';

export const AggregateService = {
  getAggregateData: async (
    type: AggregateType,
  ): Promise<ApiResponse<DataAggregateValueMap[typeof type]>> => {
    const response = await BaseApiRequestService.perform('GET', `${ApiBaseUrl}/aggregate/${type}`);

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    return response.json();
  },
};
