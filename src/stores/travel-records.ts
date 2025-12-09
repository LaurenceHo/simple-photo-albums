import type { TravelRecord } from '@/schema';
import { TravelRecordService } from '@/services/travel-record-service';
import { interpolateGreatCircle } from '@/utils/helper';
import { useQuery } from '@tanstack/vue-query';
import type { Feature, FeatureCollection, LineString, Position } from 'geojson';
import { defineStore } from 'pinia';
import { computed } from 'vue';

export interface TravelRecords {
  dbUpdatedTime: string;
  travelRecords: TravelRecord[];
}

const fetchTravelRecords = async (): Promise<TravelRecord[]> => {
  try {
    const { data: travelRecords, code, message } = await TravelRecordService.getTravelRecords();

    if (code !== 200) {
      console.error('Error fetching travel records:', message);
      return [];
    }

    return travelRecords ?? [];
  } catch (error) {
    console.error('Error fetching travel records:', error);
    throw error;
  }
};

export const useTravelRecordsStore = defineStore('travelRecords', () => {
  const {
    isFetching,
    data,
    error,
    refetch: refetchTravelRecords,
  } = useQuery({
    queryKey: ['getTravelRecords'],
    queryFn: fetchTravelRecords,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 0,
  });

  const travelRecordGeoJson = computed<FeatureCollection<LineString>>(() => {
    const seenRoutes = new Set<string>();
    const features: Feature<LineString>[] = [];

    (data.value ?? []).forEach((record) => {
      if (
        !record.departure?.location?.latitude ||
        !record.departure?.location?.longitude ||
        !record.destination?.location?.latitude ||
        !record.destination?.location?.longitude
      ) {
        console.warn(`Skipping travel record with ID ${record.id} due to missing coordinates`);
        return;
      }

      const start = [record.departure.location.longitude, record.departure.location.latitude] as [
        number,
        number,
      ];

      const end = [record.destination.location.longitude, record.destination.location.latitude] as [
        number,
        number,
      ];

      // Create a unique key for the route regardless of direction
      const sortedLng = [start[0], end[0]].sort((a, b) => a - b);
      const routeKey = `${sortedLng?.[0]?.toFixed(4)}-${sortedLng?.[1]?.toFixed(4)}-${start[1].toFixed(4)}-${end[1].toFixed(4)}`;

      // Optional: deduplicate identical routes (e.g. return flights)
      if (seenRoutes.has(routeKey)) {
        return; // Skip drawing the return leg if already drawn
      }
      seenRoutes.add(routeKey);

      // Always draw from west to east OR south to north for consistency
      const [from, to] = start[0] <= end[0] ? [start, end] : [end, start];

      const segments = interpolateGreatCircle(from, to, 20);
      const coordinates: Position[] = segments[0] ?? [];

      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: {
          transportType: record.transportType || 'flight',
          isReturn: start[0] > end[0], // optional metadata
        },
      });
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  });

  return {
    travelRecords: computed(() => data.value ?? []),
    isFetching,
    error: computed(() => error.value),
    travelRecordGeoJson,
    refetchTravelRecords,
  };
});
