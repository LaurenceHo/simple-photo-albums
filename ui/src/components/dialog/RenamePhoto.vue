<template>
  <Dialog v-model:visible="dialogStates.renamePhoto" :closable="false" class="w-96" modal>
    <template #header>
      <span class="text-lg font-semibold">Rename Photo</span>
    </template>
    <form @submit.prevent="validateAndSubmit" @reset.prevent="onReset">
      <div class="mb-4">
        <div class="flex items-center">
          <InputText
            id="photoName"
            v-model="newPhotoNameWithoutExtension"
            :invalid="v$.newPhotoNameWithoutExtension.$invalid"
            autofocus
            class="w-full"
            maxlength="30"
          />
          <span class="ml-2">{{ fileType }}</span>
        </div>
        <div class="mt-1 flex items-center justify-between">
          <small v-if="v$.$invalid" class="text-red-600">
            {{ v$.$silentErrors[0]?.$message }}
          </small>
          <small class="ml-auto text-gray-500">{{ newPhotoNameWithoutExtension.length }}/30</small>
        </div>
      </div>
      <div class="flex justify-end">
        <Button
          :disabled="isPending"
          class="mr-2"
          label="Cancel"
          text
          @click="
            () => {
              reset();
              dialogStore.setDialogState('renamePhoto', false);
            }
          "
        />
        <Button
          :disabled="
            v$.$invalid ||
            isPending ||
            newPhotoNameWithoutExtension === currentFileNameWithoutExtension
          "
          :loading="isPending"
          data-test-id="rename-photos-button"
          label="Save"
          type="submit"
        />
      </div>
    </form>
  </Dialog>
</template>

<script lang="ts" setup>
import { AlbumService } from '@/services/album-service';
import { PhotoService } from '@/services/photo-service';
import { useAlbumStore, useDialogStore, usePhotoStore } from '@/stores';
import { useMutation } from '@tanstack/vue-query';
import { useVuelidate } from '@vuelidate/core';
import { helpers, maxLength, minLength, required } from '@vuelidate/validators';
import { storeToRefs } from 'pinia';
import { Button, Dialog, InputText } from 'primevue';
import { useToast } from 'primevue/usetoast';
import { isEmpty } from 'radash';
import { computed, ref, toRefs, watch } from 'vue';

const props = defineProps({
  albumId: {
    type: String,
    required: true,
  },
});

const emits = defineEmits(['refreshPhotoList', 'closePhotoDetail']);

const rules = computed(() => ({
  newPhotoNameWithoutExtension: {
    required: helpers.withMessage('This field is required.', required),
    minLength: helpers.withMessage('It must be at least 2 characters long', minLength(2)),
    maxLength: helpers.withMessage('It cannot exceed 30 characters', maxLength(50)),
    validName: helpers.withMessage(
      'Only alphanumeric, space, full stop, underscore and dash are allowed',
      (value: string) => /^[A-Za-z0-9\s.\-_]*$/.test(value),
    ),
    notExists: helpers.withMessage('Photo name already exists', () => !isExistedPhotoKey.value),
  },
}));

const toast = useToast();
const { albumId } = toRefs(props);
const dialogStore = useDialogStore();
const { dialogStates } = storeToRefs(dialogStore);
const { refetchAlbums, isAlbumCover: checkIsAlbumCover } = useAlbumStore();
const { currentAlbum } = storeToRefs(useAlbumStore());
const photoStore = usePhotoStore();
const { currentPhotoToBeRenamed } = storeToRefs(photoStore);
const { findPhotoIndex } = photoStore;

const findFileTypeIndex = computed(() => currentPhotoToBeRenamed.value.lastIndexOf('.'));
const fileType = computed(() => currentPhotoToBeRenamed.value.slice(findFileTypeIndex.value));
const currentFileNameWithoutExtension = computed(
  () => currentPhotoToBeRenamed.value.slice(0, findFileTypeIndex.value).split('/')[1],
); // Without album id

const isExistedPhotoKey = ref(false);
const newPhotoNameWithoutExtension = ref(currentFileNameWithoutExtension.value || ''); // It's used in the input text
const newPhotoId = computed(() => `${newPhotoNameWithoutExtension.value || ''}${fileType.value}`);
const isAlbumCover = computed(() => checkIsAlbumCover(currentPhotoToBeRenamed.value));

const v$ = useVuelidate(rules, { newPhotoNameWithoutExtension });

const {
  isPending,
  mutate: renamePhoto,
  reset,
} = useMutation({
  mutationFn: async () => {
    newPhotoNameWithoutExtension.value = newPhotoNameWithoutExtension.value.trim();
    if (isEmpty(newPhotoNameWithoutExtension.value)) {
      return;
    }

    return await PhotoService.renamePhoto(
      albumId.value,
      newPhotoId.value,
      `${currentFileNameWithoutExtension.value}${fileType.value}`,
    );
  },
  onSuccess: async (result) => {
    if (result?.code === 200) {
      if (isAlbumCover.value) {
        const albumToBeUpdated = {
          ...currentAlbum.value,
          albumCover: `${albumId.value}/${newPhotoId.value}`,
        };
        const response = await AlbumService.updateAlbum(albumToBeUpdated);
        if (response.code === 200) {
          await refetchAlbums(albumToBeUpdated.year, true);
        }
      }
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Photos renamed',
        life: 3000,
      });
      setTimeout(() => {
        dialogStore.setDialogState('renamePhoto', false);
        emits('closePhotoDetail');
        emits('refreshPhotoList');
      }, 2000);
    }
  },
  onError: () => {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error while renaming photos. Please try again later.',
      life: 3000,
    });
  },
});

const validateAndSubmit = async () => {
  const isFormCorrect = await v$.value.$validate();
  if (isFormCorrect) {
    renamePhoto();
  }
};

const onReset = () => {
  newPhotoNameWithoutExtension.value = currentFileNameWithoutExtension.value || '';
};

watch(newPhotoNameWithoutExtension, (value) => {
  if (value) {
    const photoIndex = findPhotoIndex(newPhotoId.value);
    isExistedPhotoKey.value = photoIndex !== -1;
  }
});
</script>
