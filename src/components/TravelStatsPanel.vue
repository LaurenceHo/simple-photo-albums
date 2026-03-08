<template>
  <button
    class="absolute top-2 right-2 z-10 flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 dark:bg-zinc-800/90 shadow-md hover:bg-white dark:hover:bg-zinc-700 transition-colors"
    title="Travel stats"
    @click="isOpen = !isOpen"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="w-5 h-5 text-zinc-700 dark:text-zinc-200"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 13h2v8H3zM9 8h2v13H9zM15 11h2v10h-2zM21 4h2v17h-2z" />
    </svg>
  </button>

  <Transition :name="isMobile ? 'slide-up' : 'slide-right'">
    <div
      v-if="isOpen"
      :class="[
        'absolute z-5 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md shadow-lg overflow-y-auto',
        isMobile
          ? 'bottom-0 left-0 right-0 max-h-[60%] rounded-t-2xl'
          : 'top-0 right-0 h-full w-72 sm:w-80',
      ]"
    >
      <div :class="isMobile ? 'p-4 pt-2' : 'p-4 pt-14'">
        <!-- Drag handle indicator for mobile -->
        <div v-if="isMobile" class="flex justify-center mb-2">
          <div class="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600"></div>
        </div>

        <h2 class="text-lg font-bold mb-4 text-zinc-800 dark:text-zinc-100">Travel Stats</h2>

        <!-- Overall -->
        <div class="mb-4 p-3 rounded-lg bg-white/60 dark:bg-zinc-800/60">
          <h3 class="text-sm font-semibold text-zinc-600 dark:text-zinc-300 mb-2">Overall</h3>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div>
              <div class="text-xl font-bold text-zinc-800 dark:text-zinc-100">{{ travelStats.overall.countries.length }}</div>
              <div class="text-xs text-zinc-500 dark:text-zinc-400">Countries</div>
            </div>
            <div>
              <div class="text-xl font-bold text-zinc-800 dark:text-zinc-100">{{ travelStats.overall.totalDistance.toLocaleString() }}</div>
              <div class="text-xs text-zinc-500 dark:text-zinc-400">km</div>
            </div>
            <div>
              <div class="text-xl font-bold text-zinc-800 dark:text-zinc-100">{{ travelStats.overall.tripCount }}</div>
              <div class="text-xs text-zinc-500 dark:text-zinc-400">Trips</div>
            </div>
          </div>
        </div>

        <!-- Per transport type -->
        <div
          v-for="section in transportSections"
          :key="section.type"
          class="mb-3 p-3 rounded-lg bg-white/60 dark:bg-zinc-800/60"
        >
          <div class="flex items-center gap-2 mb-2">
            <span class="inline-block w-3 h-3 rounded-full" :style="{ backgroundColor: section.color }"></span>
            <h3 class="text-sm font-semibold text-zinc-600 dark:text-zinc-300 capitalize">{{ section.type }}</h3>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div>
              <div class="text-xl font-bold text-zinc-800 dark:text-zinc-100">{{ section.stats.countries.length }}</div>
              <div class="text-xs text-zinc-500 dark:text-zinc-400">Countries</div>
            </div>
            <div>
              <div class="text-xl font-bold text-zinc-800 dark:text-zinc-100">{{ section.stats.totalDistance.toLocaleString() }}</div>
              <div class="text-xs text-zinc-500 dark:text-zinc-400">km</div>
            </div>
            <div>
              <div class="text-xl font-bold text-zinc-800 dark:text-zinc-100">{{ section.stats.tripCount }}</div>
              <div class="text-xs text-zinc-500 dark:text-zinc-400">Trips</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { useTravelRecordsStore } from '@/stores';
import { storeToRefs } from 'pinia';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const isOpen = ref(false);
const windowWidth = ref(window.innerWidth);

const onResize = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));

const isMobile = computed(() => windowWidth.value < 640);

const travelRecordsStore = useTravelRecordsStore();
const { travelStats } = storeToRefs(travelRecordsStore);

const transportColors = {
  flight: '#FF0000',
  bus: '#008000',
  train: '#800080',
} as const;

type TransportType = keyof typeof transportColors;

const transportSections = computed(() => {
  const types: TransportType[] = ['flight', 'train', 'bus'];
  return types
    .filter((type) => travelStats.value[type].tripCount > 0)
    .map((type) => ({
      type,
      color: transportColors[type],
      stats: travelStats.value[type],
    }));
});
</script>

<style scoped>
/* Desktop: slide in from right */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

/* Mobile: slide up from bottom */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
