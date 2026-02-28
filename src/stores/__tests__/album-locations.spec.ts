import { useQuery } from '@tanstack/vue-query';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ref } from 'vue';
import { useAlbumLocationsStore } from '../album-locations';

vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/services/aggregate-service', () => ({
  AggregateService: {
    getAggregateData: vi.fn(),
  },
}));

describe('AlbumLocationsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should initialize with correct data', async () => {
    const mockData = [
      {
        id: '1',
        albumName: 'Test Album',
        year: '2023',
        place: {
          location: {
            longitude: 174.7633,
            latitude: -36.8485,
          },
          displayName: 'Auckland',
        },
      },
    ];

    (useQuery as Mock).mockReturnValue({
      data: ref(mockData),
      isFetching: ref(false),
    });

    const store = useAlbumLocationsStore();

    expect(store.albumLocationGeoJson.type).toBe('FeatureCollection');
    expect(store.albumLocationGeoJson.features).toHaveLength(1);
    expect(store.albumLocationGeoJson.features![0]?.properties?.name).toBe('Test Album');
  });

  it('should filter out albums without location', () => {
    const mockData = [
      {
        id: '1',
        albumName: 'With Location',
        place: {
          location: { longitude: 1, latitude: 1 },
        },
      },
      {
        id: '1', // Same ID to avoid issues with unique keys if any
        albumName: 'Without Location',
        place: {},
      },
    ];

    (useQuery as Mock).mockReturnValue({
      data: ref(mockData),
      isFetching: ref(false),
    });

    const store = useAlbumLocationsStore();

    expect(store.albumLocationGeoJson.features).toHaveLength(1);
    expect(store.albumLocationGeoJson.features![0]?.properties?.name).toBe('With Location');
  });

  it('should handle empty data', () => {
    (useQuery as Mock).mockReturnValue({
      data: ref([]),
      isFetching: ref(false),
    });

    const store = useAlbumLocationsStore();

    expect(store.albumLocationGeoJson.features).toHaveLength(0);
  });
});
