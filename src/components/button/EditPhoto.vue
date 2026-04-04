<template>
  <Button
    :class="extraClass"
    data-test-id="edit-photo-button"
    rounded
    severity="secondary"
    text
    @click="toggle"
  >
    <template #icon>
      <IconDotsVertical :size="24" />
    </template>
  </Button>
  <Menu ref="menu" :model="items" popup>
    <template #item="{ item }">
      <button class="flex items-center p-2">
        <component :is="item.icon" :size="24" />
        <span class="ml-2">{{ item.label }}</span>
        <Tag
          v-if="showPhotoCopiedTag && item.label === 'Copy link'"
          class="ml-2"
          severity="success"
          value="Copied!"
        ></Tag>
      </button>
    </template>
  </Menu>
</template>

<script lang="ts" setup>
import type { Album } from '@/schema';
import { AlbumService } from '@/services/album-service';
import { useAlbumStore, useDialogStore, usePhotoStore } from '@/stores';
import { getStaticFileUrl } from '@/utils/helper';
import {
  IconDotsVertical,
  IconEdit,
  IconFileExport,
  IconLink,
  IconPhotoStar,
  IconTrash,
} from '@tabler/icons-vue';
import { useMutation } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { Button, Menu, Tag, useToast } from 'primevue';
import { ref, toRefs } from 'vue';

const props = defineProps({
  extraClass: {
    type: String,
    default: '',
  },
  photoKey: {
    type: String,
    required: true,
  },
});

const menu = ref();
const { photoKey } = toRefs(props);
const showPhotoCopiedTag = ref(false);

const toast = useToast();
const photoStore = usePhotoStore();
const { setSelectedPhotos, setCurrentPhotoToBeRenamed } = photoStore;
const { refetchAlbums, setCurrentAlbum, isAlbumCover } = useAlbumStore();
const dialogStore = useDialogStore();
const { currentAlbum } = storeToRefs(useAlbumStore());

const { mutate } = useMutation({
  mutationFn: async () => {
    // TODO: should show menu when clicking assign photo cover button
    const albumToBeUpdated = {
      ...(currentAlbum.value as Album),
      albumCover: photoKey.value as string,
    };
    const result = await AlbumService.updateAlbum(albumToBeUpdated);
    return { result, album: albumToBeUpdated };
  },
  onSuccess: async ({ result, album }) => {
    if (result?.code === 200) {
      await refetchAlbums(album.year, true);
      setCurrentAlbum(album);
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Album "${album.albumName}" cover photo updated.`,
      life: 3000,
    });
  },
  onError: () => {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error while updating album. Please try again later.',
      life: 3000,
    });
  },
});

const makeCoverPhoto = () => {
  if (!currentAlbum.value || isAlbumCover(photoKey.value)) {
    return;
  }
  mutate();
};

const deletePhoto = () => {
  setSelectedPhotos([photoKey.value]);
  dialogStore.setDialogState('deletePhoto', true);
};

const movePhoto = () => {
  setSelectedPhotos([photoKey.value]);
  dialogStore.setDialogState('movePhoto', true);
};

const renamePhoto = () => {
  setCurrentPhotoToBeRenamed(photoKey.value);
  dialogStore.setDialogState('renamePhoto', true);
};

const copyPhotoLink = () => {
  const photoLink = getStaticFileUrl(photoKey.value);
  navigator.clipboard.writeText(photoLink).then(() => {
    // TODO: should show menu when clicking copy link button
    showPhotoCopiedTag.value = true;
    setTimeout(() => (showPhotoCopiedTag.value = false), 2000);
  });
};

const toggle = (event: Event) => {
  menu.value.toggle(event);
};

const items = [
  {
    label: 'Copy Link',
    icon: IconLink as unknown as string,
    command: copyPhotoLink,
  },
  {
    label: 'Delete Photo',
    icon: IconTrash as unknown as string,
    command: deletePhoto,
  },
  {
    label: 'Move Photo',
    icon: IconFileExport as unknown as string,
    command: movePhoto,
  },
  {
    label: 'Rename Photo',
    icon: IconEdit as unknown as string,
    command: renamePhoto,
  },
  {
    label: 'Make Album Cover',
    icon: IconPhotoStar as unknown as string,
    command: makeCoverPhoto,
    visible: !isAlbumCover(photoKey.value),
  },
];
</script>
