import type { Photo } from '@/schema';
import { PhotoService } from '@/services/photo-service';
import { initialAlbum, useAlbumStore } from '@/stores/album';
import { FILTERED_ALBUMS_BY_YEAR } from '@/utils/local-storage-key';
import { useQuery } from '@tanstack/vue-query';
import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';

export const usePhotoStore = defineStore('photo', () => {
  const photosInAlbum = ref<Photo[]>([]);
  const selectedPhotos = ref<string[]>([]);
  const currentPhotoToBeRenamed = ref('');

  const albumStore = useAlbumStore();
  const { currentAlbum } = storeToRefs(albumStore);
  const queryKey = computed(() => ['photos', currentAlbum.value.id, currentAlbum.value.year]);

  const {
    data: fetchedPhotosData,
    isPending: isFetchingPhotos,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const { id, year } = currentAlbum.value;
      if (!id || !year) return { photos: [], album: initialAlbum };

      const { data, code } = await PhotoService.getPhotosByAlbumId(id, year);
      if (code && code !== 200) {
        if (code === 401 || code === 403) {
          localStorage.removeItem(FILTERED_ALBUMS_BY_YEAR);
        }
        setTimeout(() => globalThis.location.assign('/'), 3000);
        // Return empty to prevent breaking components
        return { photos: [], album: { ...currentAlbum.value } };
      }
      return data;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: computed(() => !!currentAlbum.value.id && !!currentAlbum.value.year),
  });

  watch(fetchedPhotosData, (data) => {
    if (data) {
      photosInAlbum.value = data.photos;
      albumStore.setCurrentAlbum(data.album);
    }
  });

  const fetchPhotos = async (albumId: string, albumYear: string, refreshPhotosList?: boolean) => {
    if (albumId !== currentAlbum.value.id || albumYear !== currentAlbum.value.year) {
      // This will trigger the useQuery to be enabled and run
      albumStore.setCurrentAlbum({ ...initialAlbum, id: albumId, year: albumYear });
    } else if (refreshPhotosList) {
      await refetch();
    }
  };

  watch(currentAlbum, (newAlbum, oldAlbum) => {
    if (newAlbum.id !== oldAlbum.id) {
      // When album changes, clear old photos immediately
      photosInAlbum.value = [];
      selectedPhotos.value = [];
      // The query will automatically fetch new photos.
    }
  });

  const findPhotoByIndex = (index: number): Photo | undefined => photosInAlbum.value[index];

  const findPhotoIndex = (photoId: string): number =>
    photosInAlbum.value.findIndex((photo) => photo.key === `${currentAlbum.value.id}/${photoId}`);

  const setCurrentPhotoToBeRenamed = (photoKey: string) => {
    currentPhotoToBeRenamed.value = photoKey;
  };

  const setSelectedPhotos = (photos: string[]) => {
    selectedPhotos.value = photos;
  };

  return {
    // refs
    isError,
    photosInAlbum,
    isFetchingPhotos,
    selectedPhotos,
    currentPhotoToBeRenamed,
    // actions
    fetchPhotos,
    setCurrentPhotoToBeRenamed,
    setSelectedPhotos,
    findPhotoByIndex,
    findPhotoIndex,
  };
});
