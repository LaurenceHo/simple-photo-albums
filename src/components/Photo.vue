<template>
  <div v-if="photoStyle === 'grid'" class="photo-item w-full" data-test-id="photo-item">
    <div :class="['relative cursor-pointer', { 'photo-selected rounded-md': isPhotoSelected }]">
      <SquareImage
        :id="`photo-image-${photo['key']}`"
        :alt="`photo image ${photo['key']}`"
        :src="`${photo['url']}?tr=w-${imageWidth},h-${imageWidth}`"
        @click="goToPhotoDetail"
      />
      <div
        v-if="isAdmin"
        class="photo-top-button-container absolute top-0 right-0 left-0 flex justify-between"
      >
        <Button
          v-tooltip="'Select Photo'"
          :severity="`${isPhotoSelected ? 'primary' : 'secondary'}`"
          data-test-id="select-photo-button"
          rounded
          text
          @click="selectPhoto(photo['key'])"
        >
          <template #icon>
            <IconCircleCheckFilled :size="24" />
          </template>
        </Button>
        <EditPhotoButton :photo-key="photo['key']" extra-class="text-white" />
      </div>
      <IconInfoCircle
        v-if="isAlbumCover(photo['key'])"
        v-tooltip="'Album cover'"
        :size="24"
        class="text-primary-600 absolute bottom-1 left-1"
      />
    </div>
  </div>
  <div
    v-else
    :class="[
      'flex h-26 cursor-pointer items-center rounded-md border border-gray-300 p-2 sm:h-32 sm:p-3',
      { 'photo-selected': isPhotoSelected },
      { 'border-primary-400': darkMode && isPhotoSelected },
    ]"
    data-test-id="detail-photo-item"
  >
    <div class="relative shrink-0" @click="goToPhotoDetail">
      <SquareImage
        :id="`photo-image-${photo['key']}`"
        :alt="`photo image ${photo['key']}`"
        :size="thumbnailSize"
        :src="`${photo['url']}?tr=w-${thumbnailSize},h-${thumbnailSize}`"
      />
    </div>
    <div class="ml-3 min-w-0 grow" @click="selectPhoto(photo['key'])">
      <div class="truncate text-lg">{{ photoId }}</div>
      <div class="text-sm text-gray-400">{{ lastModified }}</div>
      <div class="text-sm text-gray-400">{{ fileSize }}</div>
    </div>
    <div v-if="isAdmin" class="ml-2 shrink-0">
      <EditPhotoButton :photo-key="photo['key']" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { EditPhotoButton } from '@/components/button';
import SquareImage from '@/components/SquareImage.vue';
import { useDevice } from '@/composables';
import { useAlbumStore, usePhotoStore, useUserConfigStore } from '@/stores';
import { IconCircleCheckFilled, IconInfoCircle } from '@tabler/icons-vue';
import { storeToRefs } from 'pinia';
import Button from 'primevue/button';
import { computed, onMounted, ref, toRefs } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const props = defineProps({
  photoStyle: {
    type: String,
    required: true,
  },
  photo: {
    type: Object,
    required: true,
    default: () => ({ key: '', url: '' }),
  },
});

const { photo } = toRefs(props);
const imageWidth = ref(250);

const route = useRoute();
const router = useRouter();

const { isAdmin, darkMode } = storeToRefs(useUserConfigStore());
const { isAlbumCover } = useAlbumStore();
const photoStore = usePhotoStore();
const { selectedPhotos } = storeToRefs(photoStore);
const { setSelectedPhotos } = photoStore;
const { isXSmallDevice } = useDevice();

const photoId = computed(() => photo.value['key'].split('/')[1]);
const thumbnailSize = computed(() => (isXSmallDevice.value ? 80 : 100));
const lastModified = computed(() => new Date(photo.value['lastModified']).toLocaleString());
const fileSize = computed(() => {
  const size = photo.value['size'] / 1024;
  return size < 1024 ? `${size.toFixed(2)} KB` : `${(size / 1024).toFixed(2)} MB`;
});
const isPhotoSelected = computed(() => selectedPhotos.value.includes(photo.value['key']));

const goToPhotoDetail = async () => {
  await router.replace({ query: { ...route.query, photo: photoId.value } });
};

const selectPhoto = (key: string) => {
  if (!isAdmin.value) {
    goToPhotoDetail();
    return;
  }
  const newSelectedPhotos = isPhotoSelected.value
    ? selectedPhotos.value.filter((photo) => photo !== key)
    : [...selectedPhotos.value, key];
  setSelectedPhotos(newSelectedPhotos);
};

onMounted(() => {
  const element = document.getElementById(`photo-image-${photo.value['key']}`);
  if (element) {
    imageWidth.value = element.clientWidth;
  }
});
</script>

<style lang="scss" scoped>
.photo-item {
  .photo-top-button-container {
    opacity: 0;
    transition: opacity 0.3s ease;

    &:hover {
      cursor: pointer;
      background: rgba(0, 0, 0, 0.2);
      opacity: 1;
      border-radius: 8px 8px 0 0;
    }
  }

  &:hover .photo-top-button-container {
    opacity: 1;
  }
}

.photo-selected {
  box-shadow:
    0 1px 5px rgba(0, 0, 0, 0.2),
    0 2px 2px rgba(0, 0, 0, 0.14),
    0 3px 1px -2px rgba(0, 0, 0, 0.12);

  .photo-top-button-container {
    opacity: 1;
  }
}
</style>
