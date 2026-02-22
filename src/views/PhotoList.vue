<template>
  <template v-if="isFetchingPhotos">
    <SkeletonPhotoList />
  </template>
  <template v-else>
    <div v-if="!photoId && !showPhotoUploader" class="py-4">
      <div class="flex flex-col items-start pb-4 sm:flex-row sm:items-center">
        <div class="flex w-full items-center sm:w-auto">
          <Button class="flex-shrink-0" rounded @click="goBack">
            <template #icon>
              <IconArrowNarrowLeft :size="24" />
            </template>
          </Button>
          <SelectButton
            v-model="photoStyle"
            :options="['grid', 'detail']"
            aria-labelledby="basic"
            class="ml-2 flex-shrink-0"
            @update:model-value="
              (value) => router.replace({ query: { ...route.query, photoStyle: value } })
            "
          >
            <template #option="{ option }">
              <template v-if="option === 'grid'">
                <IconLayoutGrid :size="24" />
              </template>
              <template v-else>
                <IconList :size="24" />
              </template>
            </template>
          </SelectButton>
          <Button
            v-if="currentAlbum?.place"
            class="ml-2 flex-shrink-0"
            data-test-id="album-map-button"
            outlined
            severity="secondary"
            @click="toggle"
          >
            <template #icon>
              <IconMap2 :size="24" />
            </template>
          </Button>
          <Popover ref="showMap">
            <div class="flex flex-col gap-4">
              <h3 class="text-lg text-gray-600">{{ currentAlbum.place?.displayName }}</h3>
              <PhotoLocationMap
                :latitude="currentAlbum.place?.location.latitude"
                :longitude="currentAlbum.place?.location.longitude"
                style="width: 250px"
              />
            </div>
          </Popover>
          <IconLock
            v-if="currentAlbum?.isPrivate"
            v-tooltip="'This is a private album'"
            :size="24"
            class="ml-2 text-gray-600"
          />
          <IconStar
            v-else-if="currentAlbum?.isFeatured"
            v-tooltip="'This is a featured album'"
            :size="24"
            class="ml-2 text-gray-600"
          />
        </div>
        <p
          v-if="currentAlbum?.description"
          class="mt-2 w-full py-2 text-lg text-gray-600 sm:mt-0 sm:ml-2 sm:w-auto sm:min-w-0 sm:flex-grow"
          data-test-id="album-desc"
        >
          {{ currentAlbum?.description }}
        </p>
      </div>
      <div
        v-if="currentAlbum?.tags?.length && currentAlbum?.tags?.length > 0"
        class="flex flex-wrap gap-2 pb-4"
      >
        <Tag
          v-for="(tag, i) in currentAlbum.tags"
          :key="i"
          :value="tag"
          data-test-id="album-tag"
          severity="success"
        />
      </div>
      <Toolbar v-if="isAdmin" class="mb-4 p-2" data-test-id="photo-manage-panel">
        <template #start>
          <Button
            v-tooltip="'Upload photos'"
            data-test-id="upload-photos-button"
            severity="secondary"
            text
            @click="showPhotoUploader = true"
          >
            <template #icon>
              <IconPhotoUp :size="24" />
            </template>
          </Button>
        </template>
        <template #center>
          <Button
            v-if="selectedPhotos.length !== photoAmount && selectedPhotos.length < 50"
            v-tooltip="'Select all photos (maximum 50 photos)'"
            data-test-id="select-all-photos-button"
            severity="secondary"
            text
            @click="setSelectedPhotos(photoKeysList)"
          >
            <template #icon>
              <IconChecks :size="24" />
            </template>
          </Button>
          <Button
            v-if="selectedPhotos.length > 0"
            v-tooltip="'Unselect all photos'"
            data-test-id="unselect-all-photos-button"
            severity="secondary"
            text
            @click="setSelectedPhotos([])"
          >
            <template #icon>
              <IconX :size="24" />
            </template>
          </Button>
          <span v-if="selectedPhotos.length > 0" class="ml-2">
            {{ selectedPhotos.length }} selected
          </span>
        </template>
        <template #end>
          <Button
            v-if="selectedPhotos.length > 0"
            v-tooltip.left="'Delete selected photos'"
            severity="secondary"
            text
            @click="dialogStore.setDialogState('deletePhoto', true)"
          >
            <template #icon>
              <IconTrash :size="24" />
            </template>
          </Button>
          <Button
            v-if="selectedPhotos.length > 0"
            v-tooltip.left="'Move selected photos'"
            severity="secondary"
            text
            @click="dialogStore.setDialogState('movePhoto', true)"
          >
            <template #icon>
              <IconFileExport :size="24" />
            </template>
          </Button>
        </template>
      </Toolbar>
      <div
        v-if="photosInAlbum.length > 0"
        :class="[
          'grid',
          photoStyle === 'grid'
            ? 'grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
            : 'grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        ]"
      >
        <Photo
          v-for="photo in photosInAlbum"
          :key="photo.key"
          :photo="photo"
          :photo-style="photoStyle"
        />
      </div>
      <h2 v-if="photosInAlbum.length === 0">No results.</h2>
      <ScrollTop />
    </div>
    <div v-else class="py-4">
      <transition
        appear
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <PhotoDetail
          v-if="photoId"
          @refresh-photo-list="refreshPhotoList"
          @close-photo-detail="closePhotoDetail"
        />
        <UploadPhotos
          v-else-if="showPhotoUploader && isAdmin"
          :album-id="currentAlbum?.id"
          @refresh-photo-list="refreshPhotoList"
          @close-photo-uploader="showPhotoUploader = false"
        />
      </transition>
    </div>
  </template>

  <MovePhotos
    v-if="dialogStates.movePhoto"
    :album-id="currentAlbum?.id"
    @close-photo-detail="closePhotoDetail"
    @refresh-photo-list="refreshPhotoList"
  />
  <DeletePhotos
    v-if="dialogStates.deletePhoto"
    :album-id="currentAlbum?.id"
    @close-photo-detail="closePhotoDetail"
    @refresh-photo-list="refreshPhotoList"
  />
  <RenamePhoto
    v-if="dialogStates.renamePhoto"
    :album-id="currentAlbum?.id"
    @close-photo-detail="closePhotoDetail"
    @refresh-photo-list="refreshPhotoList"
  />
</template>

<script lang="ts" setup>
import { DeletePhotos, MovePhotos, RenamePhoto } from '@/components/dialog';
import Photo from '@/components/Photo.vue';
import PhotoDetail from '@/components/PhotoDetail.vue';
import PhotoLocationMap from '@/components/PhotoLocationMap.vue';
import SkeletonPhotoList from '@/components/SkeletonPhotoList.vue';
import UploadPhotos from '@/components/UploadPhotos.vue';
import type { Album } from '@/schema';
import { AlbumService } from '@/services/album-service';
import { useAlbumStore, useDialogStore, usePhotoStore, useUserConfigStore } from '@/stores';
import {
  IconArrowNarrowLeft,
  IconChecks,
  IconFileExport,
  IconLayoutGrid,
  IconList,
  IconLock,
  IconMap2,
  IconPhotoUp,
  IconStar,
  IconTrash,
  IconX,
} from '@tabler/icons-vue';
import { storeToRefs } from 'pinia';
import { Button, Popover, ScrollTop, SelectButton, Tag, Toolbar } from 'primevue';
import { useToast } from 'primevue/usetoast';
import { computed, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const toast = useToast();
const route = useRoute();
const router = useRouter();

const dialogStore = useDialogStore();
const { dialogStates } = storeToRefs(dialogStore);
const { isAdmin } = storeToRefs(useUserConfigStore());

const photoStore = usePhotoStore();
const { isFetchingPhotos, photosInAlbum, selectedPhotos } = storeToRefs(photoStore);
const { setSelectedPhotos, fetchPhotos } = photoStore;
const { refetchAlbums } = useAlbumStore();
const { currentAlbum } = storeToRefs(useAlbumStore());

const albumId = computed(() => route.params['albumId'] as string);
const albumYear = computed(() => route.params['year'] as string);
const photoKeysList = computed(() => photosInAlbum.value.map((photo) => photo.key).slice(0, 50)); // Max 50 photos
const photoAmount = computed(() => photosInAlbum.value.length);
const photoId = computed(() => route.query['photo'] as string);

const showPhotoUploader = ref(false);
const showMap = ref();
const photoStyle = ref((route.query['photoStyle'] as string) || 'grid'); // Grid is default photo list style

onUnmounted(() => {
  showPhotoUploader.value = false;
  showMap.value?.hide();
  setSelectedPhotos([]);
});

const toggle = (event: any) => {
  showMap.value.toggle(event);
};

const goBack = () => {
  if (window.history.state.back === null) {
    router.push({ name: 'albumsByYear', params: { year: albumYear.value } });
  } else {
    router.back();
  }
};

const closePhotoDetail = async () =>
  await router.replace({ query: { ...route.query, photo: undefined } });

const refreshPhotoList = async () => {
  const isPrevAlbumEmpty = photosInAlbum.value.length === 0;
  await fetchPhotos(albumId.value, albumYear.value, true);
  const isCurrentAlbumEmpty = photosInAlbum.value.length === 0;

  let albumToBeUpdated = null;
  if (isPrevAlbumEmpty) {
    // If album is empty before uploading photos, set the first photo as album cover.
    albumToBeUpdated = {
      ...(currentAlbum.value as Album),
      albumCover: photosInAlbum.value[0]?.key as string,
    };
  } else if (!isPrevAlbumEmpty && isCurrentAlbumEmpty) {
    albumToBeUpdated = { ...(currentAlbum.value as Album), albumCover: '' };
  }
  if (albumToBeUpdated) {
    const result = await AlbumService.updateAlbum(albumToBeUpdated);
    if (result.code === 200) {
      await refetchAlbums(albumToBeUpdated.year, true);
    }
  }

  setSelectedPhotos([]);
};

watch(
  albumId,
  (newValue) => {
    if (newValue) {
      fetchPhotos(newValue, albumYear.value);
      setSelectedPhotos([]);
    }
  },
  { immediate: true },
);
</script>
