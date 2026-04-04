<template>
  <div
    :style="size ? `width: ${size}px; height: ${size}px;` : ''"
    class="relative after:block after:pb-[100%] after:content-['']"
  >
    <img :id="id" :alt="alt" :src="src" class="absolute h-full w-full rounded-md object-cover" />
  </div>
</template>
<script lang="ts" setup>
defineProps({
  id: {
    type: String,
    default: null,
  },
  alt: {
    type: String,
    default: '',
  },
  src: {
    type: String,
    default: '',
    required: true,
  },
  size: {
    type: Number,
    default: null,
  },
});
</script>
