<template>
  <div
    :style="size ? `width: ${size}px; height: ${size}px;` : ''"
    class="relative rounded-md border-2 border-dashed border-gray-300 after:block after:pb-[100%] after:content-['']"
  >
    <IconPhoto
      :size="iconSize"
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform"
    />
  </div>
</template>
<script lang="ts" setup>
import { IconPhoto } from '@tabler/icons-vue';

defineProps({
  size: {
    type: Number,
    default: null,
  },

  iconSize: {
    type: Number,
    default: 48,
  },
});
</script>
