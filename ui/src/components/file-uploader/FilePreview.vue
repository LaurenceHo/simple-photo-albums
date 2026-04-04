<template>
  <component :is="tag" class="file-preview relative w-full overflow-hidden">
    <div>{{ fileSize }}</div>
    <div class="relative">
      <img v-if="file.fileValidation === 'valid'" :alt="file.file.name" :src="file.url" />
      <div v-else>
        File <strong>{{ file.file.name }}</strong>
        {{
          file.fileValidation === 'invalid_format'
            ? ' is not a supported file type'
            : ' exceeds 10MB size limit'
        }}
      </div>
      <Button
        v-if="file.status !== true && !file.exists"
        :disabled="file.status === 'loading'"
        class="absolute top-1 right-1 h-6 w-6"
        raised
        rounded
        severity="danger"
        size="small"
        @click="$emit('remove', file)"
      >
        <template #icon>
          <IconX :size="14" />
        </template>
      </Button>

      <FileStatusTag :file="file" />
    </div>
  </component>
</template>

<script lang="ts" setup>
import FileStatusTag from '@/components/file-uploader/FileStatusTag.vue';
import type { UploadFile as IUploadFile } from '@/schema';
import { IconX } from '@tabler/icons-vue';
import Button from 'primevue/button';
import { computed, toRefs } from 'vue';

defineEmits<(e: 'remove', file: IUploadFile) => void>();

const props = defineProps({
  file: { type: Object as () => IUploadFile, required: true },
  tag: { type: String, default: 'li' },
});

const { file } = toRefs(props);

const fileSize = computed(() => {
  const size = file.value.file.size / 1024;
  return size < 1024 ? `${size.toFixed(2)} KB` : `${(size / 1024).toFixed(2)} MB`;
});
</script>
