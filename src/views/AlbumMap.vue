<template>
  <ProgressBar v-if="isFetching" mode="indeterminate" style="height: 4px"></ProgressBar>
  <div
    :class="[
      'absolute top-0 right-0 bottom-0 left-0 w-full',
      `${isFetching ? 'mt-[72px]' : 'mt-14 md:mt-16'}`,
    ]"
  >
    <div id="album-location-map" class="w-full h-full"></div>
    <TravelStatsPanel />
  </div>

  <CreateTravelRecords v-if="dialogStates.createTravelRecords" />
  <ShowTravelRecords v-if="dialogStates.showTravelRecords" />
</template>

<script lang="ts" setup>
import { CreateTravelRecords, ShowTravelRecords } from '@/components/dialog';
import TravelStatsPanel from '@/components/TravelStatsPanel.vue';
import {
  useAlbumLocationsStore,
  useDialogStore,
  useTravelRecordsStore,
  useUserConfigStore,
} from '@/stores';
import { useIsFetching, useIsMutating } from '@tanstack/vue-query';
import type { Feature, Point } from 'geojson';
import mapboxgl, {
  type GeoJSONSource,
  type Map,
  type MapEventOf,
  type MapMouseEvent,
  type MapTouchEvent,
  type SourceSpecification,
} from 'mapbox-gl';
import { storeToRefs } from 'pinia';
import { ProgressBar } from 'primevue';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const mapCentreLng = Number(import.meta.env.VITE_MAP_CENTRE_LNG ?? 174.7633);
const mapCentreLat = Number(import.meta.env.VITE_MAP_CENTRE_LAT ?? -36.8484);

const globalIsFetching = useIsFetching();
const globalIsMutating = useIsMutating();

const userConfigStore = useUserConfigStore();
const albumLocationsStore = useAlbumLocationsStore();
const dialogStore = useDialogStore();
const travelRecordsStore = useTravelRecordsStore();

const { darkMode } = storeToRefs(userConfigStore);
const { albumLocationGeoJson } = storeToRefs(albumLocationsStore);
const { dialogStates } = storeToRefs(dialogStore);
const { travelRecordGeoJson } = storeToRefs(travelRecordsStore);
const map = ref<Map | null>(null);

type ClusterEvent = (MapMouseEvent | MapTouchEvent) & {
  features?: mapboxgl.GeoJSONFeature[];
};

const isFetching = computed(() => {
  return globalIsFetching.value || globalIsMutating.value;
});

const inspectCluster = (map: Map, e: ClusterEvent) => {
  const features: Feature[] = map.queryRenderedFeatures(e.point, {
    layers: ['clusters'],
  });
  const clusterId = features[0]?.properties?.cluster_id;
  const source = map.getSource('albums') as GeoJSONSource;

  if (!source || !clusterId) return;

  source.getClusterExpansionZoom(
    clusterId,
    function (this: void, error?: Error | null, result?: number | null) {
      if (error || !result) return;

      map.easeTo({
        center: (features[0]?.geometry as Point).coordinates as [number, number],
        zoom: result,
      });
    },
  );
};

const createPopup = (
  map: Map,
  event: MapEventOf<'mouseenter'> | MapEventOf<'touchstart'>,
  popup: mapboxgl.Popup,
) => {
  if (!event.features?.[0]) return;

  map.getCanvas().style.cursor = 'pointer';

  const coordinates = (event.features[0].geometry as Point).coordinates.slice() as [number, number];
  const description = event.features[0].properties?.description;

  while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
    coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360;
  }

  popup
    .setLngLat(coordinates)
    .setHTML(description || '')
    .addTo(map);

  const popupContent = document.querySelector('.mapboxgl-popup-content');
  if (popupContent) {
    popupContent.classList.toggle('!bg-zinc-900', darkMode.value);
  }
};

const initializeMapLayers = (mapInstance: Map) => {
  if (!mapInstance.getSource('albums')) {
    mapInstance.addSource('albums', {
      type: 'geojson',
      data: albumLocationGeoJson.value,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    } as SourceSpecification);
  }

  // Add clusters layer
  if (!mapInstance.getLayer('clusters')) {
    mapInstance.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'albums',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#637A90',
        'circle-radius': 20,
      },
    });
  }

  // Add cluster count layer
  if (!mapInstance.getLayer('cluster-count')) {
    mapInstance.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'albums',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': 'white',
      },
    });
  }

  // Load and add custom marker image
  mapInstance.loadImage('/marker-icon.png', (error, image) => {
    if (error) {
      console.error('Error loading marker image:', error);
      return;
    }

    if (!mapInstance.hasImage('custom-marker') && image) {
      mapInstance.addImage('custom-marker', image);
    }

    // Add unclustered points layer
    if (!mapInstance.getLayer('unclustered-point')) {
      mapInstance.addLayer({
        id: 'unclustered-point',
        type: 'symbol',
        source: 'albums',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': 'custom-marker',
          'icon-size': 0.25,
        },
      });
    }
  });

  if (!mapInstance.getSource('travel-route')) {
    mapInstance.addSource('travel-route', {
      type: 'geojson',
      data: travelRecordGeoJson.value,
    });
  }

  if (!mapInstance.getLayer('travel-route-layer')) {
    mapInstance.addLayer(
      {
        id: 'travel-route-layer',
        type: 'line',
        source: 'travel-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': [
            'match',
            ['get', 'transportType'],
            'flight',
            '#FF0000', // Red for flight
            'bus',
            '#008000', // Green for bus
            'train',
            '#800080', // Purple for train
            '#0000FF', // Blue as default
          ],
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            2, 2,     // World view: slightly thicker for anti-aliasing
            6, 1.5,   // Regional: original width
            12, 1,    // City level: thinner
          ],
          'line-opacity': [
            'interpolate', ['linear'], ['zoom'],
            2, 0.65,  // Compensate for blur spread
            6, 0.75,  // Original opacity
          ],
          'line-blur': [
            'interpolate', ['linear'], ['zoom'],
            2, 1,     // 1px blur at world zoom for smooth anti-aliasing
            8, 0.5,
            14, 0,    // No blur at street level
          ],
        },
      },
      'clusters',
    );
  }
};

onMounted(async () => {
  try {
    await nextTick();

    if (!albumLocationGeoJson.value) {
      console.warn('No GeoJSON data available');
      return;
    }

    const accessToken = import.meta.env.VITE_MAPBOX_API_KEY;
    if (!accessToken) {
      console.error('Mapbox API key is not set');
      return;
    }

    mapboxgl.accessToken = accessToken;

    const mapInstance = new mapboxgl.Map({
      container: 'album-location-map',
      style: 'mapbox://styles/mapbox/standard',
      center: [mapCentreLng, mapCentreLat],
      zoom: 4,
    });

    map.value = mapInstance;

    mapInstance.on('idle', () => {
      mapInstance.resize();
    });

    mapInstance.on('load', () => {
      initializeMapLayers(mapInstance);

      const popup = new mapboxgl.Popup();

      mapInstance.on('click', 'clusters', (e: ClusterEvent) => inspectCluster(mapInstance, e));
      mapInstance.on('mouseenter', 'clusters', () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      mapInstance.on('mouseleave', 'clusters', () => {
        mapInstance.getCanvas().style.cursor = '';
      });
      mapInstance.on('touchstart', 'clusters', (e: ClusterEvent) => inspectCluster(mapInstance, e));

      mapInstance.on('mouseenter', 'unclustered-point', (event: MapEventOf<'mouseenter'>) => {
        createPopup(mapInstance, event, popup);
      });
      mapInstance.on('mouseleave', 'unclustered-point', () => {
        mapInstance.getCanvas().style.cursor = '';
      });
      mapInstance.on('touchstart', 'unclustered-point', (event: MapEventOf<'touchstart'>) => {
        createPopup(mapInstance, event, popup);
      });
    });
  } catch (error) {
    console.error('Error initializing map:', error);
  }
});

watch(
  albumLocationGeoJson,
  (newData) => {
    if (!map.value) return;

    const source = map.value.getSource('albums') as GeoJSONSource;
    if (source && newData) {
      source.setData(newData);
    }
  },
  { deep: true },
);

watch(
  travelRecordGeoJson,
  (newData) => {
    if (!map.value) return;

    const source = map.value.getSource('travel-route') as GeoJSONSource;
    if (source && newData) {
      source.setData(newData);
    }
  },
  { deep: true },
);

onUnmounted(() => {
  if (map.value) {
    map.value.remove();
    map.value = null;
  }
});
</script>

<style lang="scss">
.mapboxgl-popup {
  max-width: 320px !important;
}

.mapboxgl-popup-content {
  text-align: center;
  padding: 1rem;

  img {
    padding-top: 10px;
    width: 280px;
  }
}

.mapboxgl-marker {
  cursor: pointer;
}
</style>
