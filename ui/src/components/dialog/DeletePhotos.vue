<template>
  <Dialog
    v-model:visible="dialogStates.deletePhoto"
    :closable="false"
    class="w-[450px]"
    header="Confirm"
    modal
  >
    <template #header>
      <div class="flex">
        <IconAlertCircle :size="40" class="shrink-0 pr-2 text-red-400" />
        <span class="text-lg font-semibold" data-test-id="confirm-delete-photos-dialog-title">
          Do you want to delete photo{{ selectedPhotos.length > 1 ? 's' : '' }} as below?
        </span>
      </div>
    </template>
    <div class="mb-4 max-h-[50vh] overflow-y-auto">
      <div v-for="photoKey in photoKeysArray" :key="photoKey" class="mb-2">{{ photoKey }}</div>
    </div>
    <template #footer>
      <Button
        :disabled="isPending"
        label="Cancel"
        text
        @click="
          () => {
            reset();
            dialogStore.setDialogState('deletePhoto', false);
          }
        "
      />
      <Button :loading="isPending" autofocus label="Confirm" @click="confirmDeletePhotos" />
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import { PhotoService } from '@/services/photo-service';
import { useDialogStore, usePhotoStore } from '@/stores';
import { IconAlertCircle } from '@tabler/icons-vue';
import { useMutation } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { Button, Dialog } from 'primevue';
import { useToast } from 'primevue/usetoast';
import { computed, toRefs } from 'vue';

const props = defineProps({
  albumId: {
    type: String,
    required: true,
  },
});

const emits = defineEmits(['refreshPhotoList', 'closePhotoDetail']);

const toast = useToast();
const dialogStore = useDialogStore();
const { dialogStates } = storeToRefs(dialogStore);
const photoStore = usePhotoStore();
const { selectedPhotos } = storeToRefs(photoStore);
const { albumId } = toRefs(props);

const photoKeysArray = computed(() =>
  selectedPhotos.value.map((photoKey: string) => {
    const photoKeyArray = photoKey.split('/');
    return photoKeyArray.length > 1 ? photoKeyArray[1] : photoKeyArray[0];
  }),
);

const {
  isPending,
  mutate: deletePhoto,
  reset,
} = useMutation({
  mutationFn: async () =>
    await PhotoService.deletePhotos(
      albumId.value,
      photoKeysArray.value.filter((key): key is string => !!key),
    ),
  onSuccess: async () => {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Photos deleted',
      life: 3000,
    });
    setTimeout(() => {
      dialogStore.setDialogState('deletePhoto', false);
      emits('closePhotoDetail');
      emits('refreshPhotoList');
    }, 2000);
  },
  onError: () => {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error while deleting photos. Please try again later.',
      life: 3000,
    });
  },
});

const confirmDeletePhotos = (e: MouseEvent) => {
  e.preventDefault();
  deletePhoto();
};
</script>
