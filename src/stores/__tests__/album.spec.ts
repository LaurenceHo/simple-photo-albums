import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAlbumStore } from '../album';

vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/services/album-service', () => ({
  AlbumService: {
    getAlbumsByYear: vi.fn(),
  },
}));

vi.mock('@/utils/helper', () => ({
  getDataFromLocalStorage: vi.fn(),
  sortByKey: vi.fn((data) => data),
}));

describe('AlbumStore', () => {
  const mockRouter = {
    push: vi.fn(),
    currentRoute: {
      value: {
        params: { year: '2023' },
      },
    },
  };

  const mockQueryClient = {
    fetchQuery: vi.fn(),
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue(mockRouter);
    (useQueryClient as Mock).mockReturnValue(mockQueryClient);
    (useQuery as Mock).mockReturnValue({
      data: ref([]),
      isFetching: ref(false),
      isError: ref(false),
      refetch: vi.fn(),
    });
  });

  it('should initialize with default state', () => {
    const store = useAlbumStore();
    expect(store.selectedYear).toBe('na');
    expect(store.filterState.searchKey).toBe('');
    expect(store.filterState.privateOnly).toBe(false);
  });

  it('should update selectedYear', () => {
    const store = useAlbumStore();
    store.setSelectedYear('2024');
    expect(store.selectedYear).toBe('2024');
  });

  it('should set searchKey', () => {
    const store = useAlbumStore();
    store.setSearchKey('test');
    expect(store.filterState.searchKey).toBe('test');
  });

  it('should clear filters', () => {
    const store = useAlbumStore();
    store.setSearchKey('test');
    store.setPrivateOnly(true);
    store.clearFilters();
    expect(store.filterState.searchKey).toBe('');
    expect(store.filterState.privateOnly).toBe(false);
  });

  it('should set current album', () => {
    const store = useAlbumStore();
    const mockAlbum = { id: '1', albumName: 'Test' } as any;
    store.setCurrentAlbum(mockAlbum);
    expect(store.currentAlbum).toEqual(mockAlbum);
  });

  it('should check if photo is album cover', () => {
    const store = useAlbumStore();
    store.setCurrentAlbum({ albumCover: 'cover.jpg' } as any);
    expect(store.isAlbumCover('cover.jpg')).toBe(true);
    expect(store.isAlbumCover('other.jpg')).toBe(false);
  });
});
