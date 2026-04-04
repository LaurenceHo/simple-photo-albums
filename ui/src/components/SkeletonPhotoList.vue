<template>
  <template v-if="!photoId">
    <div class="flex items-center pt-4" data-test-id="skeleton-page-list">
      <Skeleton class="mr-2" shape="circle" size="3rem" />
      <Skeleton class="mr-2" height="3rem" width="5rem" />
      <Skeleton height="3rem" width="80%" />
    </div>
    <div class="mt-3 flex gap-2">
      <Skeleton height="2rem" width="4rem" />
      <Skeleton height="2rem" width="4rem" />
    </div>
    <div class="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      <div v-for="n in 4" :key="n">
        <Skeleton :size="isXSmallDevice ? '10rem' : '15rem'" />
      </div>
    </div>
  </template>
  <template v-else>
    <div class="grid grid-cols-4 gap-3">
      <div class="col-span-4 flex flex-col items-center lg:col-span-3">
        <Skeleton class="mt-16 mb-4" height="2rem" width="40%" />
        <Skeleton class="mb-8" height="2rem" width="40%" />
        <Skeleton height="20rem" width="80%" />
      </div>
      <div class="col-span-4 mt-3 lg:col-span-1 lg:mt-0">
        <Skeleton class="mt-16 mb-4" height="2rem" width="80%" />
        <Skeleton height="2rem" width="80%" />
      </div>
    </div>
  </template>
</template>

<script lang="ts" setup>
import useDevice from '@/composables/use-device';
import Skeleton from 'primevue/skeleton';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const { isXSmallDevice } = useDevice();
const photoId = computed(() => route.query['photo'] as string);
</script>
