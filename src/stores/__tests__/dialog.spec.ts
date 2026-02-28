import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDialogStore } from '../dialog';

describe('DialogStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize all dialog states to false', () => {
    const store = useDialogStore();
    expect(store.dialogStates.renamePhoto).toBe(false);
    expect(store.dialogStates.movePhoto).toBe(false);
    expect(store.dialogStates.deletePhoto).toBe(false);
    expect(store.dialogStates.updateAlbum).toBe(false);
    expect(store.dialogStates.createAlbumTag).toBe(false);
    expect(store.dialogStates.showAlbumTags).toBe(false);
    expect(store.dialogStates.createTravelRecords).toBe(false);
    expect(store.dialogStates.showTravelRecords).toBe(false);
  });

  it('should set dialog state correctly', () => {
    const store = useDialogStore();
    store.setDialogState('renamePhoto', true);
    expect(store.dialogStates.renamePhoto).toBe(true);

    store.setDialogState('renamePhoto', false);
    expect(store.dialogStates.renamePhoto).toBe(false);

    store.setDialogState('updateAlbum', true);
    expect(store.dialogStates.updateAlbum).toBe(true);
  });

  it('should reset all dialog states to false', () => {
    const store = useDialogStore();
    store.setDialogState('renamePhoto', true);
    store.setDialogState('updateAlbum', true);
    store.setDialogState('showAlbumTags', true);

    store.resetDialogStates();

    expect(store.dialogStates.renamePhoto).toBe(false);
    expect(store.dialogStates.updateAlbum).toBe(false);
    expect(store.dialogStates.showAlbumTags).toBe(false);
    expect(store.dialogStates.deletePhoto).toBe(false);
  });
});
