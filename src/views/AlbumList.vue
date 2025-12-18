<template>
  <div v-if="isFetchingFeaturedAlbums" class="py-4">
    <Skeleton class="mb-4" height="2rem" width="10rem" />
    <div class="flex">
      <Skeleton :size="isXSmallDevice ? '10rem' : '13rem'" class="mr-4"></Skeleton>
      <Skeleton :size="isXSmallDevice ? '10rem' : '13rem'"></Skeleton>
    </div>
  </div>
  <Panel
    v-else-if="featuredAlbums && featuredAlbums.length > 0"
    v-model:collapsed="isFeaturedCollapsed"
    toggleable
    class="my-4"
    data-test-id="featured-albums-panel"
  >
    <template #header>
      <span class="text-xl font-bold">Featured</span>
    </template>
    <Carousel :featured-albums="featuredAlbums" />
  </Panel>
  <div v-if="isFetchingAlbums" class="grid grid-cols-1 gap-2 pt-4 md:grid-cols-2 xl:grid-cols-3">
    <div
      v-for="n in 3"
      :key="n"
      class="flex h-28 items-center rounded-md border border-gray-300 p-3 sm:h-36"
    >
      <Skeleton :size="isXSmallDevice ? '6rem' : '7rem'" />
      <div class="ml-3 flex-grow">
        <Skeleton class="mb-2" width="10rem" />
        <Skeleton />
      </div>
    </div>
  </div>
  <template v-else>
    <div class="flex flex-wrap justify-between pt-2">
      <div class="flex grow sm:flex-none">
        <Button outlined severity="secondary" @click="toggleSortOrder">
          <template #icon>
            <template v-if="sortOrder === 'asc'">
              <IconSortAscendingLetters :size="24" />
            </template>
            <template v-else>
              <IconSortDescendingLetters :size="24" />
            </template>
          </template>
        </Button>
        <SelectYear
          :selected-year="paramsYear || filteredAlbumsByYear?.year || 'na'"
          extra-class="ml-2 grow sm:w-auto sm:flex-none"
          @select-year="setSelectedYear"
        />
        <SelectTags extra-class="ml-2 grow sm:w-auto sm:flex-none" @select-tags="setSelectedTags" />
      </div>
      <div class="album-list-paginator grow pt-2 sm:flex-none sm:pt-0">
        <Paginator
          v-model:rows="itemsPerPage"
          :rows-per-page-options="[10, 20, 30]"
          :total-records="totalItems"
          @page="onPageChange"
        />
      </div>
    </div>
    <div v-if="isAdmin" class="flex items-center py-4">
      Only show private album
      <ToggleSwitch v-model="privateOnly" class="ml-2" data-test-id="album-private-toggle" />
    </div>

    <template v-if="chunkAlbumList.length > 0">
      ({{ totalItems }} album{{ totalItems > 1 ? 's' : '' }})
      <div class="grid grid-cols-1 gap-2 pt-2 md:grid-cols-2 xl:grid-cols-3">
        <Album v-for="album in chunkAlbumList" :key="album.id" :album-item="album" />
      </div>
    </template>
    <template v-else>
      <div class="text-lg font-semibold">No results.</div>
    </template>
  </template>
  <ScrollTop />

  <CreateAlbum v-if="dialogStates.updateAlbum" />
  <CreateAlbumTag v-if="dialogStates.createAlbumTag" />
  <ShowAlbumTags v-if="dialogStates.showAlbumTags" />
</template>

<script lang="ts" setup>
import Album from '@/components/Album.vue';
import Carousel from '@/components/Carousel.vue';
import { CreateAlbum, CreateAlbumTag, ShowAlbumTags } from '@/components/dialog';
import SelectTags from '@/components/select/SelectTags.vue';
import SelectYear from '@/components/select/SelectYear.vue';
import { useDevice } from '@/composables';
import {
  useAlbumStore,
  useDialogStore,
  useFeaturedAlbumsStore,
  useUserConfigStore,
} from '@/stores';
import { IconSortAscendingLetters, IconSortDescendingLetters } from '@tabler/icons-vue';
import { storeToRefs } from 'pinia';
import {
  Button,
  type PageState,
  Paginator,
  Panel,
  ScrollTop,
  Skeleton,
  ToggleSwitch,
} from 'primevue';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const toast = useToast();
const route = useRoute();
const router = useRouter();
const { isXSmallDevice } = useDevice();
const albumStore = useAlbumStore();
const dialogStore = useDialogStore();

const {
  isFetching: isFetchingAlbums,
  filteredAlbums,
  filterState,
  isError: isFetchingAlbumError,
  filteredAlbumsByYear,
  selectedYear,
} = storeToRefs(albumStore);
const { isFetching: isFetchingFeaturedAlbums, data: featuredAlbums } =
  storeToRefs(useFeaturedAlbumsStore());
const { isAdmin } = storeToRefs(useUserConfigStore());
const { dialogStates } = storeToRefs(dialogStore);

onMounted(() => {
  albumStore.setEnabled(true);
  // Initialise selectedYear from route params if available, but only if different
  if (route.params.year && route.params.year !== selectedYear.value) {
    albumStore.setSelectedYear(route.params.year as string);
  }
});

// UI state
const isFeaturedCollapsed = ref(false);

// Pagination state
const pageNumber = ref(1);
const itemsPerPage = ref(20);

const sortOrder = computed(() => filterState.value.sortOrder);
const privateOnly = computed({
  get: () => filterState.value.privateOnly,
  set: (value: boolean) => albumStore.setPrivateOnly(value),
});

const paramsYear = computed(() => route.params['year'] as string);
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value));
const firstIndex = computed(() => (pageNumber.value - 1) * itemsPerPage.value);
const lastIndex = computed(() =>
  totalPages.value > pageNumber.value ? firstIndex.value + itemsPerPage.value : totalItems.value,
);
const totalItems = computed(() => filteredAlbums.value.length);
const chunkAlbumList = computed(() =>
  filteredAlbums.value.slice(firstIndex.value, lastIndex.value),
);

const onPageChange = (event: PageState) => {
  pageNumber.value = event.page + 1;
  itemsPerPage.value = event.rows;
};
const toggleSortOrder = () => albumStore.setSortOrder(sortOrder.value === 'desc' ? 'asc' : 'desc');
const setSelectedTags = (tags: string[]) => albumStore.setSelectedTags(tags);
const setSelectedYear = (year: string) => albumStore.setSelectedYear(year);

watch(
  isFetchingAlbumError,
  (newValue) => {
    if (newValue) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error while fetching albums. Please try again later.',
        life: 3000,
      });
    }
  },
  { immediate: true },
);

watch(paramsYear, (newValue) => {
  // Only update selectedYear if it differs from the current store value
  if (newValue && newValue !== selectedYear.value) {
    albumStore.setSelectedYear(newValue);
  }
});

watch(isFetchingAlbums, (newValue) => {
  if (!newValue && !paramsYear.value) {
    router.push({
      name: 'albumsByYear',
      params: { year: filteredAlbumsByYear.value?.year || 'na' },
    });
  }
});
</script>
