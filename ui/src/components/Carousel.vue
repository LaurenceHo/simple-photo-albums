<template>
  <div class="embla relative">
    <div ref="emblaRef" class="embla__viewport">
      <div class="embla__container">
        <template v-for="albumItem in featuredAlbums" :key="albumItem.id">
          <div class="embla__slide" data-test-id="carousel-slide">
            <router-link :to="`/album/${albumItem?.['year']}/${albumItem?.['id']}`">
              <div class="relative cursor-pointer">
                <SquareImage
                  v-if="albumItem['albumCover']"
                  :alt="`photo album ${albumItem.albumName}`"
                  :src="`${cdnURL}/${encodeURI(albumItem?.['albumCover'])}?tr=w-240,h-240`"
                />
                <NoImagePlaceholder v-else />
                <div
                  class="absolute top-0 right-0 left-0 flex h-8 flex-wrap items-center overflow-hidden rounded-t-md bg-black/60 px-2 transition-all duration-500"
                >
                  <div class="truncate text-white">{{ albumItem.albumName }}</div>
                </div>
              </div>
            </router-link>
          </div>
        </template>
      </div>
    </div>
    <Button
      v-if="!prevBtnDisabled && !nextBtnDisabled"
      class="absolute top-[35%] left-0"
      rounded
      @click="scrollPrev"
    >
      <template #icon>
        <IconChevronLeft :size="24" />
      </template>
    </Button>

    <Button
      v-if="!prevBtnDisabled && !nextBtnDisabled"
      class="absolute top-[35%] right-0"
      rounded
      @click="scrollNext"
    >
      <template #icon>
        <IconChevronRight :size="24" />
      </template>
    </Button>

    <div
      v-if="emblaApi && !prevBtnDisabled && !nextBtnDisabled"
      class="-mr-2 hidden flex-wrap items-center justify-center sm:flex"
    >
      <carousel-dot-button
        v-for="(_, index) in scrollSnaps"
        :key="`dot-button-${index}`"
        :carousel-api="emblaApi"
        :dot-index="index"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { CarouselDotButton } from '@/components/button';
import NoImagePlaceholder from '@/components/NoImagePlaceholder.vue';
import SquareImage from '@/components/SquareImage.vue';
import type { Album } from '@/schema';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-vue';
import type { EmblaCarouselType } from 'embla-carousel';
import emblaCarouselVue from 'embla-carousel-vue';
import Button from 'primevue/button';
import { onMounted, onUnmounted, ref, toRefs, watch } from 'vue';

const props = defineProps({
  featuredAlbums: {
    type: Array as () => Album[],
    required: true,
    default: () => [],
  },
});

const cdnURL = import.meta.env.VITE_IMAGEKIT_CDN_URL as string;
const [emblaRef, emblaApi] = emblaCarouselVue({ loop: true, slidesToScroll: 'auto' });

const { featuredAlbums } = toRefs(props);
const scrollSnaps = ref<number[]>([]);
const prevBtnDisabled = ref(true);
const nextBtnDisabled = ref(true);

const scrollPrev = () => {
  if (!emblaApi.value) return;
  emblaApi.value.scrollPrev();
};
const scrollNext = () => {
  if (!emblaApi.value) return;
  emblaApi.value.scrollNext();
};

const onInit = (carouselApi: EmblaCarouselType) => {
  if (!carouselApi) return;
  scrollSnaps.value = carouselApi.scrollSnapList();
};

const onSelect = (carouselApi: EmblaCarouselType) => {
  if (!carouselApi) return;
  prevBtnDisabled.value = !carouselApi?.canScrollPrev();
  nextBtnDisabled.value = !carouselApi?.canScrollNext();
};

watch(emblaApi, (newVal) => {
  if (!newVal) return;
  onInit(newVal);
  onSelect(newVal);
  newVal.on('reInit', onInit).on('reInit', onSelect).on('select', onSelect);
});

onMounted(() => {
  if (emblaApi.value) {
    onInit(emblaApi.value);
    onSelect(emblaApi.value);
    emblaApi.value.on('reInit', onInit).on('reInit', onSelect).on('select', onSelect);
  }
});

onUnmounted(() => {
  if (emblaApi.value) {
    emblaApi.value.destroy();
  }
});
</script>

<style lang="scss" scoped>
.embla {
  --slide-height: 15rem;
  --slide-spacing: 1rem;
}

.embla__viewport {
  overflow: hidden;
  height: var(--slide-height);
}

.embla__container {
  display: flex;
  margin-left: calc(var(--slide-spacing) * -1);
}

.embla__slide {
  flex: 0 0 var(--slide-height);
  min-width: 0;
  padding-left: var(--slide-spacing);
}

@media (max-width: 640px) {
  .embla {
    --slide-height: 12rem;
    --slide-spacing: 0.8rem;
  }
}
</style>
