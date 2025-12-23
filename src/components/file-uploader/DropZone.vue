<template>
  <Card
    :class="`file-drop-zone h-[calc(80vh-80px)] w-full max-w-7xl overflow-auto ${active ? 'border-2 border-dashed shadow-md' : ''} ${isValidDrag ? 'border-blue-500' : 'border-red-500'} ${isUploading ? 'bg-gray-100 dark:bg-zinc-800' : ''}`"
    :pt="{
      body: {
        style: {
          height: '100%',
        },
      },
      content: {
        style: {
          height: '100%',
        },
      },
    }"
  >
    <template #content>
      <div class="flex h-full flex-col">
        <div class="flex items-center">
          <Checkbox id="overwrite-checkbox" v-model="overwrite" binary class="mr-2" />
          <label class="cursor-pointer" for="overwrite-checkbox">Overwrite existing photos</label>
        </div>

        <Divider class="!mb-0" />
        <ProgressBar v-if="isUploading" class="mb-4 h-1.5" mode="indeterminate" />

        <div
          class="flex flex-1 flex-col p-4"
          @dragenter.prevent="setActive"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="setInactive"
          @drop.prevent="onDrop"
        >
          <slot :drop-zone-active="active"></slot>
        </div>
      </div>
    </template>
  </Card>
</template>

<script lang="ts" setup>
import { ALLOWED_FILE_TYPE, useUploadStore } from '@/stores/upload';
import { storeToRefs } from 'pinia';
import Card from 'primevue/card';
import Checkbox from 'primevue/checkbox';
import Divider from 'primevue/divider';
import ProgressBar from 'primevue/progressbar';
import { useToast } from 'primevue/usetoast';
import { debounce } from 'radash';
import { onMounted, onUnmounted, ref } from 'vue';

const emits = defineEmits<{
  (e: 'files-dropped', files: File[]): void;
  (e: 'valid-drag', isValid: boolean): void;
}>();

const uploadStore = useUploadStore();
const { overwrite, isUploading } = storeToRefs(uploadStore);
const toast = useToast();

const active = ref(false);
const isValidDrag = ref(true);

let inActiveTimeout: number | null = null;

// setActive and setInactive use timeouts, so that when you drag an item over a child element,
// the dragleave event that is fired won't cause a flicker. A few ms should be plenty of
// time to wait for the next dragenter event to clear the timeout and set it back to active.
const setActive = () => {
  active.value = true;
  if (inActiveTimeout !== null) {
    clearTimeout(inActiveTimeout);
  }
};

const setInactive = () => {
  inActiveTimeout = window.setTimeout(() => {
    active.value = false;
  }, 50);
};

const emitValidDrag = debounce({ delay: 100 }, (isValid: boolean) => {
  emits('valid-drag', isValid);
});

const onDragOver = (e: DragEvent) => {
  setActive();
  if (e.dataTransfer?.items) {
    isValidDrag.value = [...e.dataTransfer.items].every((item) =>
      ALLOWED_FILE_TYPE.includes(item.type),
    );

    emitValidDrag(isValidDrag.value);
  }
};

const onDrop = (e: DragEvent) => {
  setInactive();
  if (e.dataTransfer?.files) {
    const filteredFiles = [...e.dataTransfer.files].filter((file) =>
      ALLOWED_FILE_TYPE.includes(file.type),
    );

    const rejectedCount = e.dataTransfer.files.length - filteredFiles.length;
    if (rejectedCount > 0) {
      toast.add({
        severity: 'error',
        summary: 'Invalid files',
        detail: `${rejectedCount} file(s) were rejected due to unsupported file type`,
        life: 3000,
      });
    }

    emits('files-dropped', filteredFiles);
  }
};

const preventDefaults = (e: Event) => {
  e.preventDefault();
};

const events = ['dragenter', 'dragover', 'dragleave', 'drop'];

onMounted(() => {
  events.forEach((eventName) => {
    document.body.addEventListener(eventName, preventDefaults);
  });
});

onUnmounted(() => {
  events.forEach((eventName) => {
    document.body.removeEventListener(eventName, preventDefaults);
  });
});
</script>
