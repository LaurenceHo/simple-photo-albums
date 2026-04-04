import { useQuery } from '@tanstack/vue-query';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ref } from 'vue';
import { useTravelRecordsStore } from '../travel-records';

vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/services/travel-record-service', () => ({
  TravelRecordService: {
    getTravelRecords: vi.fn(),
  },
}));

vi.mock('@/utils/helper', () => ({
  interpolateGreatCircle: vi.fn().mockReturnValue([
    [
      [0, 0],
      [1, 1],
    ],
  ]),
}));

describe('TravelRecordsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mockRecord = {
    id: '1',
    departure: { location: { longitude: 10, latitude: 20 } },
    destination: { location: { longitude: 30, latitude: 40 } },
    transportType: 'flight',
  };

  it('should initialize with data from useQuery', () => {
    (useQuery as Mock).mockReturnValue({
      data: ref([mockRecord]),
      isFetching: ref(false),
      error: ref(null),
      refetch: vi.fn(),
    });

    const store = useTravelRecordsStore();

    expect(store.travelRecords).toHaveLength(1);
    expect(store.travelRecords![0]).toEqual(mockRecord);
  });

  it('should generate GeoJson features', () => {
    (useQuery as Mock).mockReturnValue({
      data: ref([mockRecord]),
      isFetching: ref(false),
      error: ref(null),
      refetch: vi.fn(),
    });

    const store = useTravelRecordsStore();

    expect(store.travelRecordGeoJson.type).toBe('FeatureCollection');
    expect(store.travelRecordGeoJson.features).toHaveLength(1);
    expect(store.travelRecordGeoJson.features![0]?.geometry?.type).toBe('LineString');
    expect(store.travelRecordGeoJson.features![0]?.properties?.transportType).toBe('flight');
  });

  it('should skip records with missing coordinates', () => {
    const invalidRecord = { id: '2', departure: {}, destination: {} };
    (useQuery as Mock).mockReturnValue({
      data: ref([invalidRecord]),
      isFetching: ref(false),
      error: ref(null),
      refetch: vi.fn(),
    });

    const store = useTravelRecordsStore();

    expect(store.travelRecordGeoJson.features).toHaveLength(0);
  });
});
