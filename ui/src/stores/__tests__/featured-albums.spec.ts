import { useQuery } from '@tanstack/vue-query';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ref } from 'vue';
import { useFeaturedAlbumsStore } from '../featured-albums';

vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/services/aggregate-service', () => ({
  AggregateService: {
    getAggregateData: vi.fn(),
  },
}));

describe('FeaturedAlbumsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should initialize with data from useQuery', () => {
    const mockData = [{ id: '1', albumName: 'Featured 1' }];
    (useQuery as Mock).mockReturnValue({
      data: ref(mockData),
      isFetching: ref(false),
      refetch: vi.fn(),
    });

    const store = useFeaturedAlbumsStore();

    expect(store.data).toEqual(mockData);
    expect(store.isFetching).toBe(false);
  });

  it('should expose refetch function', () => {
    const mockRefetch = vi.fn();
    (useQuery as Mock).mockReturnValue({
      data: ref([]),
      isFetching: ref(false),
      refetch: mockRefetch,
    });

    const store = useFeaturedAlbumsStore();
    store.refetchFeaturedAlbums();

    expect(mockRefetch).toHaveBeenCalled();
  });
});
