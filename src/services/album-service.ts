import type { Album, ApiResponse, ResponseStatus } from '@/schema';
import ResponseError from '@/schema/response-error';
import { ApiBaseUrl } from '@/services/api-base-url';
import { BaseApiRequestService } from '@/services/base-api-request-service';

export const AlbumService = {
  getAlbumsByYear: async (year = 'na'): Promise<ApiResponse<Album[]>> => {
    const response = await BaseApiRequestService.perform('GET', `${ApiBaseUrl}/albums/${year}`);
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response.json();
  },

  createAlbum: async (album: Album): Promise<ResponseStatus> => {
    const response = await BaseApiRequestService.perform('POST', `${ApiBaseUrl}/albums`, album);
    if (!response.ok) {
      const errorBody = await response.json();
      throw new ResponseError(errorBody.code, errorBody.status, errorBody.message);
    }
    return response.json();
  },

  updateAlbum: async (album: Album): Promise<ResponseStatus> => {
    const response = await BaseApiRequestService.perform('PUT', `${ApiBaseUrl}/albums`, album);
    if (!response.ok) {
      const errorBody = await response.json();
      throw new ResponseError(errorBody.code, errorBody.status, errorBody.message);
    }
    return response.json();
  },

  deleteAlbum: async (id: string, year: string): Promise<ResponseStatus> => {
    const response = await BaseApiRequestService.perform('DELETE', `${ApiBaseUrl}/albums`, {
      id,
      year,
    });
    if (!response.ok) {
      const errorBody = await response.json();
      throw new ResponseError(errorBody.code, errorBody.status, errorBody.message);
    }
    return response.json();
  },
};
