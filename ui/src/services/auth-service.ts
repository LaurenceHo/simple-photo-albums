import type { ApiResponse, UserPermission } from '@/schema';
import { ApiBaseUrl } from '@/services/api-base-url';
import { BaseApiRequestService } from '@/services/base-api-request-service';

export const AuthService = {
  generateCsrfState: async (): Promise<{ state: string }> => {
    const response = await BaseApiRequestService.perform('GET', `${ApiBaseUrl}/auth/csrf`);
    return response.json();
  },

  login: async (token: string, state: string): Promise<ApiResponse<UserPermission>> => {
    const response = await BaseApiRequestService.perform(
      'POST',
      `${ApiBaseUrl}/auth/verify-id-token`,
      { token, state },
    );
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response.json();
  },

  getUserInfo: async (): Promise<ApiResponse<UserPermission>> => {
    const response = await BaseApiRequestService.perform('GET', `${ApiBaseUrl}/auth/user-info`);
    return response.json();
  },

  logout: async (): Promise<void> => {
    const response = await BaseApiRequestService.perform('POST', `${ApiBaseUrl}/auth/logout`);
    if (!response.ok) {
      throw new Error(response.statusText);
    }
  },
};
