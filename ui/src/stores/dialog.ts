import { defineStore } from 'pinia';
import { ref } from 'vue';

// Define the possible dialog keys for type safety
type DialogKey =
  | 'renamePhoto'
  | 'movePhoto'
  | 'deletePhoto'
  | 'updateAlbum'
  | 'createAlbumTag'
  | 'showAlbumTags'
  | 'createTravelRecords'
  | 'showTravelRecords';

// Define the shape of the dialog state explicitly
interface DialogStates {
  renamePhoto: boolean;
  movePhoto: boolean;
  deletePhoto: boolean;
  updateAlbum: boolean;
  createAlbumTag: boolean;
  showAlbumTags: boolean;
  createTravelRecords: boolean;
  showTravelRecords: boolean;
}

export const useDialogStore = defineStore('dialog', () => {
  // Initialize all dialog states as false
  const dialogStates = ref<DialogStates>({
    renamePhoto: false,
    movePhoto: false,
    deletePhoto: false,
    updateAlbum: false,
    createAlbumTag: false,
    showAlbumTags: false,
    createTravelRecords: false,
    showTravelRecords: false,
  });

  // Single setter function for all dialog states
  const setDialogState = (dialog: DialogKey, state: boolean) => {
    dialogStates.value[dialog] = state;
  };

  // Reset all dialog states to false
  const resetDialogStates = () => {
    Object.keys(dialogStates.value).forEach((key) => {
      dialogStates.value[key as DialogKey] = false;
    });
  };

  return {
    dialogStates,
    setDialogState,
    resetDialogStates,
  };
});
