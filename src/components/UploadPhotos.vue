<template>
  <div class="h-full w-full">
    <div class="flex justify-end">
      <Button class="mb-2" rounded severity="secondary" @click="closeUploader">
        <template #icon>
          <IconX :size="24" />
        </template>
      </Button>
    </div>

    <div class="flex h-full flex-col items-center">
      <DropZone v-slot="{ dropZoneActive }" @files-dropped="addFiles" @valid-drag="isValidDragFn">
        <Message v-if="isCompleteUploading" class="mb-4" severity="success">
          Upload finished!
        </Message>

        <div
          v-if="!isCompleteUploading && !isUploading"
          :class="{ 'flex flex-1 items-center justify-center': !files.length }"
          class="text-lg font-bold md:text-4xl"
        >
          <div class="flex flex-col items-center">
            <span v-if="dropZoneActive" class="mb-2 flex flex-col items-center">
              <span>Drop Them Here</span>
              <span v-if="isValidDrag" class="text-base">to add them</span>
              <span v-else class="text-red-600">Only image files allowed</span>
            </span>
            <span v-else class="flex flex-col items-center">
              <span>Drag Your Photos Here</span>
              <span class="my-2 text-base">
                or
                <input
                  id="file-input"
                  accept="image/png, image/jpeg"
                  class="hidden"
                  multiple
                  type="file"
                  @change="onInputChange"
                />
                <label class="cursor-pointer italic underline" for="file-input">browse</label>
              </span>
            </span>
            <span class="text-base font-normal">Max file size: 10MB. Only image files allowed</span>
          </div>
        </div>
        <ul
          v-show="files.length"
          class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
        >
          <FilePreview
            v-for="file of files"
            :key="file.id"
            :file="file"
            tag="li"
            @remove="removeFile"
          />
        </ul>
      </DropZone>
    </div>

    <div class="flex justify-center pt-4">
      <Button
        v-if="!isCompleteUploading"
        :disabled="isUploading || validFiles.length === 0"
        class="mr-4"
        data-test-id="clear-file-button"
        label="Clear all"
        outlined
        @click="clearFiles"
      />
      <Button
        v-if="!isCompleteUploading"
        :disabled="isUploading || validFiles.length === 0"
        data-test-id="upload-file-button"
        label="Upload"
        @click="uploadFiles(albumId)"
      />
      <Button
        v-if="isCompleteUploading"
        data-test-id="finish-button"
        label="Done"
        @click="finishUploadPhotos"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import DropZone from '@/components/file-uploader/DropZone.vue';
import FilePreview from '@/components/file-uploader/FilePreview.vue';
import { useUploadStore } from '@/stores/upload';
import { IconX } from '@tabler/icons-vue';
import { storeToRefs } from 'pinia';
import { Button, Message } from 'primevue';
import { computed, ref, toRefs, watch } from 'vue';

const emits = defineEmits(['refreshPhotoList', 'closePhotoUploader']);

const props = defineProps({
  albumId: {
    type: String,
    required: true,
  },
});

const { albumId } = toRefs(props);
const uploadStore = useUploadStore();
const { files, isUploading, isCompleteUploading } = storeToRefs(uploadStore);
const { addFiles, removeFile, uploadFiles, clearFiles } = uploadStore;

const isValidDrag = ref(true);

const validFiles = computed(() => files.value.filter((file) => file.fileValidation === 'valid'));

const isValidDragFn = (isValid: boolean) => {
  isValidDrag.value = isValid;
};

const onInputChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files) {
    addFiles([...target.files]);
    target.value = ''; // reset so that selecting the same file again will still cause it to fire this change
  }
};

const closeUploader = () => {
  clearFiles();
  emits('closePhotoUploader');
};

const finishUploadPhotos = () => {
  emits('refreshPhotoList');
  closeUploader();
};

watch(albumId, (newValue) => {
  if (newValue) {
    clearFiles();
  }
});
</script>
