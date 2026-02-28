import { useQuery } from '@tanstack/vue-query';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ref } from 'vue';
import { useAlbumTagsStore } from '../album-tags';

vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/services/album-tag-service', () => ({
  AlbumTagService: {
    getAlbumTags: vi.fn(),
  },
}));

describe('AlbumTagsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should initialize with correct data from useQuery', () => {
    const mockTags = [
      { id: '1', name: 'Tag 1' },
      { id: '2', name: 'Tag 2' },
    ];

    (useQuery as Mock).mockReturnValue({
      data: ref(mockTags),
      isFetching: ref(false),
      isError: ref(false),
      refetch: vi.fn(),
    });

    const store = useAlbumTagsStore();

    expect(store.data).toEqual(mockTags);
    expect(store.isFetching).toBe(false);
    expect(store.isError).toBe(false);
  });

  it('should expose refetch function', () => {
    const mockRefetch = vi.fn();
    (useQuery as Mock).mockReturnValue({
      data: ref([]),
      isFetching: ref(false),
      isError: ref(false),
      refetch: mockRefetch,
    });

    const store = useAlbumTagsStore();
    store.refetchAlbumTags();

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should handle error state', () => {
    (useQuery as Mock).mockReturnValue({
      data: ref(null),
      isFetching: ref(false),
      isError: ref(true),
      refetch: vi.fn(),
    });

    const store = useAlbumTagsStore();

    expect(store.isError).toBe(true);
    expect(store.data).toBeNull();
  });
});
