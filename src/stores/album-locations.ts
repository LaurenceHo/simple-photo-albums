import type { Album as AlbumItem, ApiResponse } from '@/schema';
import { AggregateService } from '@/services/aggregate-service';
import { useQuery } from '@tanstack/vue-query';
import DOMPurify from 'dompurify';
import type { Feature, Point } from 'geojson';
import { defineStore } from 'pinia';
import { computed } from 'vue';

interface GeoJson {
  type: 'FeatureCollection';
  features: Feature[];
}

export interface AlbumsWithLocation {
  dbUpdatedTime: string;
  albums: AlbumItem[];
}

/** Get albums with location */
const fetchAlbumsWithLocation = async () => {
  try {
    const {
      data: albums,
      code,
      message,
    } = (await AggregateService.getAggregateData('albumsWithLocation')) as ApiResponse<AlbumItem[]>;

    if (code !== 200) {
      console.error('Error fetching album locations:', message);
      return [];
    }

    return albums ?? [];
  } catch (error) {
    console.error('Error fetching album locations:', error);
    throw error;
  }
};

const cdnURL = import.meta.env.VITE_IMAGEKIT_CDN_URL as string;

export const useAlbumLocationsStore = defineStore('albumLocations', () => {
  const { data, isFetching } = useQuery({
    queryKey: ['albumsWithLocation'],
    queryFn: fetchAlbumsWithLocation,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const albumLocationGeoJson = computed(
    () =>
      ({
        type: 'FeatureCollection',
        features: data.value
          ?.map((album: AlbumItem) => {
            const longitude = album.place?.location?.longitude;
            const latitude = album.place?.location?.latitude;

            if (!longitude || !latitude) {
              return null;
            }

            return {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [longitude, latitude],
              } as Point,
              properties: {
                name: album.albumName,
                description: DOMPurify.sanitize(
                  `<strong>${album.albumName}</strong><br/>` +
                    `${album.place?.displayName ? `<div>${album.place?.displayName}</div>` : ''}` +
                    `${
                      album.albumCover
                        ? `<img src='${cdnURL}/${encodeURI(album.albumCover + '?tr=w-280' || '')}' alt='${album.albumName}' />`
                        : ''
                    }` +
                    `${album.description ? `<p>${album.description}</p>` : ''}` +
                    `<a href='/album/${album.year}/${album.id}'>View Album</a>`,
                ),
              },
            };
          })
          .filter(Boolean),
      }) as GeoJson,
  );

  return {
    isFetching,
    albumLocationGeoJson,
  };
});
