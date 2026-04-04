<template>
  <ProgressBar v-if="isFetching" mode="indeterminate" style="height: 4px"></ProgressBar>
  <main class="mx-auto mt-2 mb-10 max-w-screen-2xl">
    <div id="container" class="px-8 sm:px-4">
      <Breadcrumb :model="breadcrumbs" class="px-0!">
        <template #item="{ item }">
          <div class="flex min-w-0 items-center">
            <component :is="item.icon" :size="20" />
            <span class="ml-2 max-w-[160px] truncate sm:max-w-full">{{ item.label }}</span>
          </div>
        </template>
      </Breadcrumb>

      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
  </main>
</template>

<script lang="ts" setup>
import { useAlbumStore } from '@/stores';
import { IconFolders, IconLibraryPhoto } from '@tabler/icons-vue';
import { useIsFetching, useIsMutating } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { Breadcrumb, ProgressBar } from 'primevue';
import { computed, type FunctionalComponent } from 'vue';
import { useRoute } from 'vue-router';

const globalIsFetching = useIsFetching();
const globalIsMutating = useIsMutating();

const route = useRoute();
const { currentAlbum } = storeToRefs(useAlbumStore());

const isFetching = computed(() => {
  return globalIsFetching.value || globalIsMutating.value;
});

const breadcrumbs = computed((): { label: string }[] => {
  const routes: { label: string; icon: FunctionalComponent }[] = [];
  routes.push({ label: 'Albums', icon: IconFolders });
  if (route.name === 'photosByAlbum') {
    routes.push({
      label: currentAlbum.value.albumName,
      icon: IconLibraryPhoto,
    });
  }
  return routes;
});
</script>
