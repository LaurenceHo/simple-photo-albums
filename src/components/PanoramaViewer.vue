<template>
  <div id="panorama" class="rounded-md" style="width: 100%; height: 50%"></div>
</template>
<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue';

interface PannellumViewer {
  destroy(): void;
  [key: string]: any;
}

interface Pannellum {
  viewer(container: string | HTMLElement, config: any): PannellumViewer;
}

declare global {
  interface Window {
    pannellum: Pannellum;
  }
  const pannellum: Pannellum;
}

const props = defineProps({
  imageUrl: {
    type: String,
    required: true,
  },
});

const { imageUrl } = toRefs(props);

const viewer = ref<PannellumViewer | null>(null);
const panoramaOptions = computed(() => ({
  type: 'equirectangular',
  panorama: imageUrl.value || '',
  autoLoad: true,
  autoRotate: -2,
  compass: true,
  showFullscreenCtrl: true,
  showZoomCtrl: true,
}));

onMounted(() => {
  initViewer();
});

onBeforeUnmount(() => {
  if (viewer.value) {
    viewer.value.destroy();
    viewer.value = null;
  }
});

const initViewer = () => {
  if (viewer.value) {
    viewer.value.destroy();
    viewer.value = null;
  }

  const panoramaElement = document.getElementById('panorama');
  if (panoramaElement && imageUrl.value) {
    try {
      viewer.value = window.pannellum.viewer('panorama', {
        ...panoramaOptions.value,
      });
    } catch (error) {
      console.error('Failed to initialize panorama viewer:', error);
    }
  }
};

watch(
  imageUrl,
  () => {
    initViewer();
  },
  { immediate: true },
);
</script>
