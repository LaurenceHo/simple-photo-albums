import type { UserPermission } from '@/schema';
import { DARK_MODE_ENABLED } from '@/utils/local-storage-key';
import { useQuery } from '@tanstack/vue-query';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ref } from 'vue';
import { useUserConfigStore } from '../user-config';

vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/services/auth-service', () => ({
  AuthService: {
    getUserInfo: vi.fn(),
  },
}));

describe('UserConfigStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();

    // Default mock for useQuery
    (useQuery as Mock).mockReturnValue({
      isFetching: ref(false),
      data: ref(null),
    });
  });

  it('should initialize dark mode from localStorage', () => {
    localStorage.setItem(DARK_MODE_ENABLED, 'true');
    const store = useUserConfigStore();
    expect(store.darkMode).toBe(true);
  });

  it('should update dark mode and localStorage', () => {
    const store = useUserConfigStore();
    store.setDarkMode(true);
    expect(store.darkMode).toBe(true);
    expect(localStorage.getItem(DARK_MODE_ENABLED)).toBe('true');

    store.setDarkMode(false);
    expect(store.darkMode).toBe(false);
    expect(localStorage.getItem(DARK_MODE_ENABLED)).toBe('false');
  });

  it('should compute isAdmin correctly', () => {
    const store = useUserConfigStore();
    store.setUserPermission({ role: 'admin' } as Partial<UserPermission> as UserPermission);
    expect(store.isAdmin).toBe(true);

    store.setUserPermission({ role: 'user' } as Partial<UserPermission> as UserPermission);
    expect(store.isAdmin).toBe(false);
  });

  it('should handle user permission from useQuery data', () => {
    const mockUserData = { data: { role: 'admin', userId: '1' } };
    (useQuery as Mock).mockReturnValue({
      isFetching: ref(false),
      data: ref(mockUserData),
    });

    const store = useUserConfigStore();
    // In Pinia setup stores, refs and computeds are unwrapped in the returned object
    expect(store.userPermission).toEqual(mockUserData.data);
    expect(store.isAdmin).toBe(true);
  });
});
