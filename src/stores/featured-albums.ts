import type { Album as AlbumItem, ApiResponse } from '@/schema';
import { AggregateService } from '@/services/aggregate-service';
import { useQuery } from '@tanstack/vue-query';
import { defineStore } from 'pinia';

const fetchFeaturedAlbums = async () => {
  const {
    data: albums,
    code,
    message,
  } = (await AggregateService.getAggregateData('featured-albums')) as ApiResponse<AlbumItem[]>;

  if (code !== 200) {
    console.error('Error fetching feature albums:', message);
    return [];
  }

  return albums ?? [];
};

export const useFeaturedAlbumsStore = defineStore('featuredAlbums', () => {
  const {
    data,
    isFetching,
    refetch: refetchFeaturedAlbums,
  } = useQuery({
    queryKey: ['featured-albums'],
    queryFn: fetchFeaturedAlbums,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return { data, isFetching, refetchFeaturedAlbums };
});
