<template>
  <div
    class="album-list-item flex h-28 cursor-pointer items-center rounded-md border border-surface-100 hover:border-surface-200 hover:shadow-xs dark:border-surface-800 dark:hover:border-surface-600 p-3 sm:h-36"
    data-test-id="list-album-item"
  >
    <div class="relative shrink-0" @click="goToAlbum">
      <SquareImage
        v-if="albumItem['albumCover']"
        :alt="`photo album: ${albumItem.albumName}`"
        :size="thumbnailSize"
        :src="`${thumbnail}?tr=w-${thumbnailSize},h-${thumbnailSize}`"
      />
      <NoImagePlaceholder v-else :icon-size="30" :size="thumbnailSize" />
      <IconLock
        v-if="albumItem?.isPrivate"
        :size="20"
        class="absolute top-1 left-1 text-gray-300"
      />
      <IconStarFilled
        v-if="albumItem?.isFeatured"
        :size="20"
        class="absolute top-1 left-1 text-pink-400"
      />
    </div>
    <div class="ml-3 min-w-0 grow" @click="goToAlbum">
      <h3 class="truncate text-lg font-semibold text-surface-900 dark:text-surface-300">
        {{ albumItem.albumName }}
      </h3>
      <p v-if="albumItem.description" class="truncate text-surface-400 dark:text-surface-500">
        {{ albumItem.description }}
      </p>
      <div class="mt-1 flex flex-nowrap overflow-hidden">
        <Tag
          v-for="tag in tagsForDisplay"
          :key="tag"
          :value="tag"
          class="mr-2"
          severity="success"
        />
      </div>
    </div>
    <div v-if="isAdmin" class="shrink-0">
      <EditAlbumButton :album-item="albumItem" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { EditAlbumButton } from '@/components/button';
import NoImagePlaceholder from '@/components/NoImagePlaceholder.vue';
import SquareImage from '@/components/SquareImage.vue';
import useDevice from '@/composables/use-device';
import type { Album } from '@/schema';
import { useUserConfigStore } from '@/stores';
import { initialAlbum } from '@/stores/album';
import { IconLock, IconStarFilled } from '@tabler/icons-vue';
import { storeToRefs } from 'pinia';
import Tag from 'primevue/tag';
import { computed, toRefs } from 'vue';
import { useRouter } from 'vue-router';

const cdnURL = import.meta.env.VITE_IMAGEKIT_CDN_URL as string;

const props = defineProps({
  albumItem: {
    type: Object as () => Album,
    required: true,
    default: () => initialAlbum,
  },
});

const userConfigStore = useUserConfigStore();
const { isAdmin } = storeToRefs(userConfigStore);

const { isXSmallDevice } = useDevice();
const { albumItem } = toRefs(props);
const router = useRouter();

const thumbnailSize = computed(() => (isXSmallDevice.value ? 90 : 120));
const thumbnail = computed(() => `${cdnURL}/${encodeURI(albumItem.value?.albumCover ?? '')}`);
const tagsForDisplay = computed(() =>
  albumItem.value?.tags ? albumItem.value.tags.slice(0, 3) : [],
);

const goToAlbum = () => router.push(`/album/${albumItem.value?.year}/${albumItem.value?.id}`);
</script>
