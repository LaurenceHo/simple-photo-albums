import { computed, onMounted, onUnmounted, ref } from 'vue';

export default function useDevice() {
  const windowWidth = ref(window.innerWidth);

  const updateWindowSize = () => {
    windowWidth.value = window.innerWidth;
  };

  onMounted(() => {
    window.addEventListener('resize', updateWindowSize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateWindowSize);
  });

  const getWindowSize = computed(() => windowWidth.value);

  return {
    windowSize: getWindowSize,
    isXSmallDevice: computed(() => windowWidth.value < 640),
    isSmallDevice: computed(() => windowWidth.value >= 640),
    isMediumDevice: computed(() => windowWidth.value >= 768),
    isLargeDevice: computed(() => windowWidth.value >= 1024),
    isXLargeDevice: computed(() => windowWidth.value >= 1280),
  };
}
