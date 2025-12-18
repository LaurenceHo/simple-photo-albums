<template>
  <div>
    <Button rounded severity="secondary" text @click="toggleMenu">
      <template #icon>
        <IconDotsVertical :size="24" />
      </template>
    </Button>
    <Menu ref="menu" :model="menuItems" :popup="true">
      <template #item="{ item }">
        <button class="flex items-center p-2">
          <component :is="item.icon" :size="24" />
          <span class="ml-2">{{ item.label }}</span>
        </button>
      </template>
    </Menu>
    <Dialog
      v-model:visible="deleteAlbumDialog"
      class="w-[450px]"
      data-test-id="confirm-delete-album-dialog"
      modal
    >
      <template #header>
        <div class="flex">
          <IconAlertCircle :size="40" class="flex-shrink-0 pr-2 text-red-400" />
          <span class="text-lg font-semibold" data-test-id="confirm-delete-album-dialog-title">
            Do you want to delete album "{{ albumName }}"?
          </span>
        </div>
      </template>
      <div class="mb-4">
        All photos in this album will be deleted, and any new photos added while the delete action
        is in progress might also be deleted.
      </div>
      <template #footer>
        <Button
          label="Cancel"
          text
          @click="
            () => {
              reset();
              deleteAlbumDialog = false;
            }
          "
        />
        <Button
          :loading="isPending"
          data-test-id="confirm-delete-album-button"
          label="Confirm"
          @click="confirmDeleteAlbum"
        />
      </template>
    </Dialog>
  </div>
</template>

<script lang="ts" setup>
import type { Album } from '@/schema';
import { AlbumService } from '@/services/album-service';
import { useAlbumStore, useDialogStore } from '@/stores';
import { initialAlbum } from '@/stores/album';
import { IconAlertCircle, IconDotsVertical, IconEdit, IconTrash } from '@tabler/icons-vue';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { Button, Dialog, Menu } from 'primevue';
import { useToast } from 'primevue/usetoast';
import { ref, toRefs } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
  albumItem: {
    type: Object as () => Album,
    required: true,
    default: () => initialAlbum as Album,
  },
});

const queryClient = useQueryClient();
const { albumItem } = toRefs(props);
const route = useRoute();
const toast = useToast();
const dialogStore = useDialogStore();
const { setAlbumToBeUpdated, refetchAlbums } = useAlbumStore();

const deleteAlbumDialog = ref(false);
const albumName = ref(albumItem.value.albumName);
const menu = ref();

const toggleMenu = (event: any) => {
  menu.value.toggle(event);
};

const setAlbum = () => {
  setAlbumToBeUpdated(albumItem.value);
  dialogStore.setDialogState('updateAlbum', true);
};

const {
  isPending,
  mutate: deleteAlbum,
  reset,
} = useMutation({
  mutationFn: async () => await AlbumService.deleteAlbum(albumItem.value.id, albumItem.value.year),
  onSuccess: async () => {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Album deleted.',
      life: 3000,
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['countAlbumsByYear'] }),
      refetchAlbums(route.params.year as string, true),
    ]);
    deleteAlbumDialog.value = false;
  },
  onError: () => {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error while deleting album. Please try again later.',
      life: 3000,
    });
  },
});

const confirmDeleteAlbum = (e: MouseEvent) => {
  e.preventDefault();
  deleteAlbum();
};

const menuItems = [
  {
    label: 'Edit Album',
    icon: IconEdit as any,
    command: setAlbum,
  },
  {
    label: 'Delete Album',
    icon: IconTrash as any,
    command: () => (deleteAlbumDialog.value = true),
  },
];
</script>
