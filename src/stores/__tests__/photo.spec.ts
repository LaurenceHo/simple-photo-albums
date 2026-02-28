import { PhotoService } from '@/services/photo-service';
import { initialAlbum, useAlbumStore } from '@/stores/album';
import { useQuery } from '@tanstack/vue-query';
import { createPinia, setActivePinia, storeToRefs } from 'pinia';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ref } from 'vue';
import { usePhotoStore } from '../photo';

vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/services/photo-service', () => ({
  PhotoService: {
    getPhotosByAlbumId: vi.fn(),
  },
}));

vi.mock('@/stores/album', () => ({
  initialAlbum: { id: '', year: '' },
  useAlbumStore: vi.fn(),
}));

describe('PhotoStore', () => {
  const mockCurrentAlbum = ref({ id: 'album1', year: '2023', albumName: 'Test Album' });
  const mockSetCurrentAlbum = vi.fn();

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    (useAlbumStore as any).mockReturnValue({
      currentAlbum: mockCurrentAlbum,
      setCurrentAlbum: mockSetCurrentAlbum,
    });

    (useQuery as Mock).mockReturnValue({
      data: ref(null),
      isPending: ref(false),
      isError: ref(false),
      refetch: vi.fn(),
    });
  });

  it('should initialize with default values', () => {
    const store = usePhotoStore();
    expect(store.photosInAlbum).toEqual([]);
    expect(store.selectedPhotos).toEqual([]);
    expect(store.currentPhotoToBeRenamed).toBe('');
  });

  it('should set selected photos', () => {
    const store = usePhotoStore();
    const photos = ['photo1', 'photo2'];
    store.setSelectedPhotos(photos);
    expect(store.selectedPhotos).toEqual(photos);
  });

  it('should set current photo to be renamed', () => {
    const store = usePhotoStore();
    store.setCurrentPhotoToBeRenamed('photo1');
    expect(store.currentPhotoToBeRenamed).toBe('photo1');
  });

  it('should find photo index', () => {
    const store = usePhotoStore();
    store.photosInAlbum = [
      { key: 'album1/photo1' },
      { key: 'album1/photo2' },
    ] as any;
    
    expect(store.findPhotoIndex('photo1')).toBe(0);
    expect(store.findPhotoIndex('photo2')).toBe(1);
    expect(store.findPhotoIndex('photo3')).toBe(-1);
  });

  it('should find photo by index', () => {
    const store = usePhotoStore();
    const mockPhoto = { key: 'album1/photo1' };
    store.photosInAlbum = [mockPhoto] as any;
    
    expect(store.findPhotoByIndex(0)).toEqual(mockPhoto);
    expect(store.findPhotoByIndex(1)).toBeUndefined();
  });
});
