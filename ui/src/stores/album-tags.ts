import type { AlbumTag } from '@/schema';
import { AlbumTagService } from '@/services/album-tag-service';
import { useQuery } from '@tanstack/vue-query';
import { defineStore } from 'pinia';

export interface AlbumTags {
  dbUpdatedTime: string;
  tags: AlbumTag[];
}

const fetchAlbumTags = async (): Promise<AlbumTag[]> => {
  try {
    const { data: tags, code, message } = await AlbumTagService.getAlbumTags();

    if (code !== 200) {
      console.error('Error fetching album tags:', message);
      return [];
    }

    return tags ?? [];
  } catch (error) {
    console.error('Error fetching album tags:', error);
    throw error;
  }
};

export const useAlbumTagsStore = defineStore('albumTags', () => {
  const {
    isFetching,
    data,
    isError,
    refetch: refetchAlbumTags,
  } = useQuery({
    queryKey: ['getAlbumTags'],
    queryFn: () => fetchAlbumTags(),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 0,
  });

  return {
    isFetching,
    isError,
    data,
    refetchAlbumTags,
  };
});
