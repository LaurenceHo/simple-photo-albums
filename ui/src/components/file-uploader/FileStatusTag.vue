<template>
  <div class="absolute right-1 bottom-1">
    <Tag
      v-if="tagConfig"
      :class="tagConfig.class"
      :pt="tagConfig.pt"
      :severity="tagConfig.severity"
      :value="tagConfig.value"
      rounded
    >
      <template #icon>
        <component :is="tagConfig.icon" :size="16" />
      </template>
    </Tag>
  </div>
</template>

<script lang="ts" setup>
import type { UploadFile as IUploadFile } from '@/schema/index.js';
import { IconAlertCircle, IconCheck, IconFileAlert, IconLoader } from '@tabler/icons-vue';
import Tag from 'primevue/tag';
import { computed } from 'vue';

const props = defineProps({
  file: {
    type: Object as () => IUploadFile,
    required: true,
  },
});

const tagConfig = computed(() => {
  const config = {
    loading: {
      severity: 'secondary',
      value: 'Uploading',
      icon: IconLoader,
      class: 'loading-indicator',
      pt: undefined,
    },
    uploaded: {
      severity: 'success',
      value: 'Uploaded',
      icon: IconCheck,
      class: '',
      pt: { root: { class: 'dark:bg-green-500 dark:text-green-900' } },
    },
    error: {
      severity: 'danger',
      value: 'Error',
      icon: IconAlertCircle,
      class: '',
      pt: { root: { class: 'dark:bg-red-500 dark:text-red-900' } },
    },
    exists: {
      severity: 'warn',
      value: 'File exists',
      icon: IconFileAlert,
      class: '',
      pt: { root: { class: 'dark:bg-orange-500 dark:text-orange-900' } },
    },
  };

  if (props.file.status === 'loading') return config.loading;
  if (props.file.status === true) return config.uploaded;
  if (props.file.status === false && !props.file.exists) return config.error;
  if (props.file.status === false && props.file.exists) return config.exists;

  return null;
});
</script>
<style lang="scss" scoped>
.file-preview {
  .loading-indicator {
    animation: pulse 1.5s linear 0s infinite;
    @apply text-black;
  }
}

@keyframes pulse {
  0% {
    @apply bg-white;
  }
  50% {
    @apply bg-gray-300;
  }
  100% {
    @apply bg-white;
  }
}
</style>
