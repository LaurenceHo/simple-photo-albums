<template>
  <Button
    v-tooltip.left="'Travel stats'"
    class="absolute top-2 right-2 z-10"
    severity="secondary"
    @click="isOpen = !isOpen"
  >
    <template #icon>
      <IconChartBar :size="20" />
    </template>
  </Button>

  <Transition :name="isMobile ? 'slide-up' : 'slide-right'">
    <div
      v-if="isOpen"
      ref="panelEl"
      :class="[
        'dark:bg-surface-900/85 absolute z-5 bg-white/85 shadow-lg backdrop-blur-md',
        isDragging ? 'overflow-hidden' : 'overflow-y-auto',
        isMobile
          ? 'right-0 bottom-0 left-0 max-h-[60%] rounded-t-2xl'
          : 'top-0 right-0 h-full w-72 sm:w-80',
      ]"
      :style="panelDragStyle"
    >
      <div :class="isMobile ? 'p-4 pt-2' : 'p-4 pt-14'">
        <!-- Drag handle for mobile swipe-to-dismiss -->
        <div
          v-if="isMobile"
          class="-mx-4 -mt-2 flex touch-none justify-center py-3"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        >
          <div class="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600"></div>
        </div>

        <h2 class="text-surface-900 dark:text-surface-300 mb-4 text-lg font-bold">Travel Stats</h2>

        <!-- Overall -->
        <div
          class="dark:bg-surface-800/60 border-surface-100 dark:border-surface-800 mb-4 rounded-lg border bg-white/60 p-3"
        >
          <h3 class="text-surface-900 dark:text-surface-300 mb-2 text-sm font-semibold">Overall</h3>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div>
              <div class="text-surface-800 dark:text-surface-100 text-xl font-bold">
                {{ travelStats.overall.countries.length }}
              </div>
              <div class="text-surface-500 dark:text-surface-400 text-xs">Countries</div>
            </div>
            <div>
              <div class="text-surface-800 dark:text-surface-100 text-xl font-bold">
                {{ travelStats.overall.totalDistance.toLocaleString() }}
              </div>
              <div class="text-surface-500 dark:text-surface-400 text-xs">km</div>
            </div>
            <div>
              <div class="text-surface-800 dark:text-surface-100 text-xl font-bold">
                {{ travelStats.overall.tripCount }}
              </div>
              <div class="text-surface-500 dark:text-surface-400 text-xs">Trips</div>
            </div>
          </div>
        </div>

        <!-- Per transport type -->
        <div
          v-for="section in transportSections"
          :key="section.type"
          class="dark:bg-surface-800/60 border-surface-100 dark:border-surface-800 mb-3 rounded-lg border bg-white/60 p-3"
        >
          <div class="mb-2 flex items-center gap-2">
            <span
              class="inline-block h-3 w-3 rounded-full"
              :style="{ backgroundColor: section.color }"
            ></span>
            <h3 class="text-surface-900 dark:text-surface-300 text-sm font-semibold capitalize">
              {{ section.type }}
            </h3>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div>
              <div class="text-surface-800 dark:text-surface-100 text-xl font-bold">
                {{ section.stats.countries.length }}
              </div>
              <div class="text-surface-500 dark:text-surface-400 text-xs">Countries</div>
            </div>
            <div>
              <div class="text-surface-800 dark:text-surface-100 text-xl font-bold">
                {{ section.stats.totalDistance.toLocaleString() }}
              </div>
              <div class="text-surface-500 dark:text-surface-400 text-xs">km</div>
            </div>
            <div>
              <div class="text-surface-800 dark:text-surface-100 text-xl font-bold">
                {{ section.stats.tripCount }}
              </div>
              <div class="text-surface-500 dark:text-surface-400 text-xs">Trips</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { useTravelRecordsStore } from '@/stores';
import { IconChartBar } from '@tabler/icons-vue';
import { storeToRefs } from 'pinia';
import { Button } from 'primevue';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const isOpen = ref(false);
const windowWidth = ref(window.innerWidth);
const panelEl = ref<HTMLElement | null>(null);
const dragOffsetY = ref(0);
const isDragging = ref(false);
let touchStartY = 0;

const DISMISS_THRESHOLD = 80;

const panelDragStyle = computed(() => {
  if (!isDragging.value || dragOffsetY.value <= 0) return {};
  return { transform: `translateY(${dragOffsetY.value}px)`, transition: 'none' };
});

function onTouchStart(e: TouchEvent) {
  e.preventDefault();
  const touch = e.touches[0];
  if (!touch) return;
  touchStartY = touch.clientY;
  isDragging.value = true;
  dragOffsetY.value = 0;
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault();
  const touch = e.touches[0];
  if (!touch) return;
  const delta = touch.clientY - touchStartY;
  dragOffsetY.value = Math.max(0, delta);
}

function onTouchEnd() {
  isDragging.value = false;
  if (dragOffsetY.value > DISMISS_THRESHOLD) {
    isOpen.value = false;
  }
  dragOffsetY.value = 0;
}

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
