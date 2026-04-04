<template>
  <button :class="dotButtonClasses" type="button" @click="scrollTo" />
</template>
<script lang="ts" setup>
import type { EmblaCarouselType } from 'embla-carousel';
import { computed, onMounted, ref, toRefs, watch } from 'vue';

const props = defineProps({
  carouselApi: {
    type: Object as () => EmblaCarouselType | undefined,
    required: true,
  },
  dotIndex: {
    type: Number,
    required: true,
  },
});

const { dotIndex, carouselApi } = toRefs(props);

const selectedIndex = ref(0);

const dotButtonClasses = computed(() => ({
  embla__dot: true,
  'embla__dot--selected': dotIndex.value === selectedIndex.value,
}));

const onSelect = (carouselApi: EmblaCarouselType) => {
  if (!carouselApi) return;
  selectedIndex.value = carouselApi?.selectedScrollSnap();
};

const scrollTo = () => {
  if (!carouselApi.value) return;
  selectedIndex.value = dotIndex.value;
  carouselApi.value.scrollTo(dotIndex.value);
};

onMounted(() => {
  if (carouselApi.value) {
    onSelect(carouselApi.value);
    carouselApi.value.on('reInit', onSelect).on('select', onSelect);
  }
});

watch(carouselApi, (newVal) => {
  if (!newVal) return;
  onSelect(newVal);
  newVal.on('reInit', onSelect).on('select', onSelect);
});
</script>

<style lang="scss" scoped>
.embla__dot {
  -webkit-tap-highlight-color: transparent;
  -webkit-appearance: none;
  appearance: none;
  background-color: transparent;
  touch-action: manipulation;
  text-decoration: none;
  cursor: pointer;
  border: 0;
  padding: 0;
  margin: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.embla__dot:after {
  box-shadow: inset 0 0 0 0.2rem #0ea5e9;
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  content: '';
}

.embla__dot--selected:after {
  box-shadow: inset 0 0 0 0.8rem #0ea5e9;
}
</style>
