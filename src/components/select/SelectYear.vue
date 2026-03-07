<template>
  <Select
    v-model="internalSelectedYear"
    :class="extraClass"
    :disabled="isError"
    :loading="isFetching"
    :options="countAlbumsByYear?.data"
    option-label="year"
    option-value="year"
  >
    <template #option="{ option: { year, count } }">
      <div class="align-items-center flex">
        <div>{{ year }} ({{ count }})</div>
      </div>
    </template>
  </Select>
</template>

<script lang="ts" setup>
import { AggregateService } from '@/services/aggregate-service';
import { useQuery } from '@tanstack/vue-query';
import Select from 'primevue/select';
import { ref, toRefs, watch } from 'vue';

const emits = defineEmits(['selectYear']);
const props = defineProps({
  selectedYear: {
    type: String,
    required: true,
  },
  extraClass: {
    type: String,
    default: '',
  },
});

const { selectedYear } = toRefs(props);
const internalSelectedYear = ref(selectedYear.value);

const {
  data: countAlbumsByYear,
  isFetching,
  isError,
} = useQuery({
  queryKey: ['count-albums-by-year'],
  queryFn: () => AggregateService.getAggregateData('count-albums-by-year'),
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

watch(
  selectedYear,
  (newValue) => {
    if (newValue !== internalSelectedYear.value) {
      internalSelectedYear.value = newValue;
    }
  },
  { immediate: true },
);

watch(
  internalSelectedYear,
  (value) => {
    emits('selectYear', value);
  },
  { immediate: true },
);
</script>
