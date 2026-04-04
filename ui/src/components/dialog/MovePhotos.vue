<template>
  <Dialog
    v-model:visible="dialogStates.movePhoto"
    :breakpoints="{ '960px': '75vw', '641px': '90vw' }"
    class="w-[450px]"
    modal
    :closable="false"
  >
    <template #header>
      <span v-if="duplicatedPhotoKeys.length === 0" class="text-lg font-semibold">
        Move photo{{ selectedPhotos.length > 1 ? 's' : '' }} to another album
      </span>
      <div v-else class="flex">
        <IconFileAlert :size="40" class="mr-2 text-yellow-600" />
        <span class="text-lg font-semibold">
          Photo{{ duplicatedPhotoKeys.length > 1 ? 's' : '' }} exist{{
            duplicatedPhotoKeys.length < 2 ? 's' : ''
          }}
          in
          {{ selectedAlbum }}
        </span>
      </div>
    </template>

    <div v-if="duplicatedPhotoKeys.length === 0" class="mb-4 flex flex-col">
      Select another album for {{ selectedPhotos.length > 1 ? 'these' : 'this' }} photo{{
        selectedPhotos.length > 1 ? 's' : ''
      }}.
      <select-year :selected-year="selectedYear" class="my-4" @select-year="setSelectedYear" />
      <Select
        v-model="selectedAlbum"
        :disabled="isFetchingAlbums"
        :loading="isFetchingAlbums"
        :options="filteredAlbumsList"
        class="w-full"
        filter
        option-label="label"
        option-value="value"
        placeholder="Select an album"
        show-clear
        @filter="filterAlbumsFunction"
      />
    </div>

    <div class="max-h-[50vh] overflow-y-auto">
      <template v-if="duplicatedPhotoKeys.length === 0">
        <div v-for="photoKey in photoKeysArray" :key="photoKey" class="mb-2">
          {{ photoKey }}
        </div>
      </template>

      <template v-else>
        <div v-for="photoKey in duplicatedPhotoKeys" :key="photoKey" class="mb-2">
          {{ photoKey }}
        </div>
      </template>
    </div>

    <template #footer>
      <Button
        :disabled="isPending"
        :label="duplicatedPhotoKeys.length === 0 ? 'Cancel' : 'Close'"
        text
        @click="closeMovePhotoDialog"
      />
      <Button
        v-if="duplicatedPhotoKeys.length === 0"
        :disabled="!selectedAlbum || isPending || photoKeysArray.length === 0"
        :loading="isPending"
        data-test-id="move-photos-button"
        label="Move"
        @click="confirmMovePhotos"
      />
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import SelectYear from '@/components/select/SelectYear.vue';
import type { Photo } from '@/schema';
import { AlbumService } from '@/services/album-service';
import { PhotoService } from '@/services/photo-service';
import { useDialogStore, usePhotoStore } from '@/stores';
import { IconFileAlert } from '@tabler/icons-vue';
import { useMutation, useQuery } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { Button, Dialog, Select } from 'primevue';
import { type SelectFilterEvent } from 'primevue/select';
import { useToast } from 'primevue/usetoast';
import { computed, ref, toRefs, watch } from 'vue';
import { useRoute } from 'vue-router';

const emits = defineEmits(['refreshPhotoList', 'closePhotoDetail']);
const props = defineProps({
  albumId: {
    type: String,
    required: true,
  },
});
const { albumId } = toRefs(props);

const route = useRoute();
const toast = useToast();
const dialogStore = useDialogStore();
const { dialogStates } = storeToRefs(dialogStore);
const photoStore = usePhotoStore();
const { selectedPhotos } = storeToRefs(photoStore);

const selectedYear = ref<string>((route.params['year'] as string) || 'na');

const { data: albumsData, isLoading: isFetchingAlbums } = useQuery({
  enabled: computed(() => !!selectedYear.value),
  queryKey: ['getAlbumsByYear', selectedYear],
  queryFn: () => AlbumService.getAlbumsByYear(selectedYear.value),
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

const mappedAlbumList = computed(() => {
  if (!albumsData.value?.data || albumsData.value?.data?.length === 0) return [];

  return albumsData.value.data
    .filter((album) => album.id !== albumId.value)
    .map((album) => ({ label: album.albumName, value: album.id }));
});

const photoKeysArray = computed(
  () =>
    selectedPhotos.value.map((photoKey: string) => {
      const photoKeyArray = photoKey?.split('/');
      return photoKeyArray.length > 1 ? photoKeyArray[1] : photoKeyArray[0];
    }) as string[],
);

const duplicatedPhotoKeys = ref<string[]>([]);
const filteredAlbumsList = ref<{ label: string; value: string }[]>(mappedAlbumList.value ?? []);
const selectedAlbum = ref<string>(filteredAlbumsList.value[0]?.value ?? '');
const needToRefreshPhotoList = ref(false);

const setSelectedYear = (year: string) => {
  selectedYear.value = year;
};

const filterAlbumsFunction = (event: SelectFilterEvent) => {
  filteredAlbumsList.value = mappedAlbumList.value.filter(
    (album) =>
      album.label.toLowerCase().indexOf(event.value.toLowerCase()) > -1 &&
      album.value !== albumId.value,
  );
};

const {
  isPending,
  mutate: movePhoto,
  reset,
} = useMutation({
  mutationFn: async () => {
    const photosInSelectedAlbum = await PhotoService.getPhotosByAlbumId(
      selectedAlbum.value,
      selectedYear.value,
    );
    let duplicatedPhotoKeys: string[] = [];
    if (photosInSelectedAlbum.data?.photos) {
      duplicatedPhotoKeys = photosInSelectedAlbum.data.photos
        .filter((photo: Photo) => {
          const photoKey = photo.key.split('/')[1];
          if (photoKey) {
            return photoKeysArray.value.includes(photoKey);
          }
          return false;
        })
        .map((photo: Photo) => photo.key.split('/')[1] || '');
    }

    const photoKeysNotDuplicate = photoKeysArray.value.filter(
      (photoKey) => !duplicatedPhotoKeys.includes(photoKey),
    );
    if (photoKeysNotDuplicate.length === 0) {
      throw new Error('All photos are duplicates');
    }

    const result = await PhotoService.movePhotos(
      albumId?.value,
      selectedAlbum.value,
      photoKeysNotDuplicate,
    );
    return { result, tempDuplicatedPhotoKeys: duplicatedPhotoKeys };
  },
  onSuccess: ({ result, tempDuplicatedPhotoKeys }) => {
    duplicatedPhotoKeys.value = tempDuplicatedPhotoKeys;
    if (result?.code === 200) {
      if (duplicatedPhotoKeys.value.length === 0) {
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Photos moved',
          life: 3000,
        });
        setTimeout(() => {
          dialogStore.setDialogState('movePhoto', false);
          emits('closePhotoDetail');
          emits('refreshPhotoList');
        }, 2000);
      } else {
        needToRefreshPhotoList.value = true;
      }
    }
  },
  onError: (error) => {
    if (error.message === 'All photos are duplicates') {
      duplicatedPhotoKeys.value = photoKeysArray.value;
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error while moving photos. Please try again later.',
        life: 3000,
      });
    }
  },
});

const confirmMovePhotos = (e: MouseEvent) => {
  e.preventDefault();
  movePhoto();
};

const closeMovePhotoDialog = (e: MouseEvent) => {
  e.preventDefault();
  if (needToRefreshPhotoList.value) {
    emits('refreshPhotoList');
  }
  reset();
  dialogStore.setDialogState('movePhoto', false);
};

// Watch for changes in mappedAlbumList and update selectedAlbum
watch(mappedAlbumList, (newList) => {
  if (newList.length > 0) {
    filteredAlbumsList.value = newList;
    selectedAlbum.value = newList[0]?.value ?? '';
  }
});
</script>
