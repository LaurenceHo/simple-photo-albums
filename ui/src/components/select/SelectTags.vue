<template>
  <MultiSelect
    v-model="internalSelectedTags"
    :class="extraClass"
    :loading="isFetchingAlbumTags"
    :options="albumTags"
    display="chip"
    filter
    input-id="select-tags"
    option-label="tag"
    option-value="tag"
  />
</template>

<script lang="ts" setup>
import { useAlbumTagsStore } from '@/stores';
import { storeToRefs } from 'pinia';
import MultiSelect from 'primevue/multiselect';
import { ref, toRefs, watch } from 'vue';

const emits = defineEmits(['selectTags']);
const props = defineProps({
  selectedTags: {
    type: Array as () => string[],
    default: () => [],
  },
  extraClass: {
    type: String,
    default: '',
  },
});

const { selectedTags } = toRefs(props);
const internalSelectedTags = ref(selectedTags.value);
const albumTagsStore = useAlbumTagsStore();
const { isFetching: isFetchingAlbumTags, data: albumTags } = storeToRefs(albumTagsStore);

watch(
  internalSelectedTags,
  (value) => {
    emits('selectTags', value);
  },
  { immediate: true },
);
</script>
