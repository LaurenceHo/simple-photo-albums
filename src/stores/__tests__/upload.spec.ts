import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUploadStore } from '../upload';

vi.mock('@/services/photo-service', () => ({
  PhotoService: {
    uploadPhotos: vi.fn(),
  },
}));

vi.mock('@/stores/photo', () => ({
  usePhotoStore: vi.fn(() => ({
    findPhotoIndex: vi.fn().mockReturnValue(-1),
  })),
}));

describe('UploadStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    
    // Mock URL methods
    global.URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

  it('should initialize with empty files', () => {
    const store = useUploadStore();
    expect(store.files).toEqual([]);
    expect(store.isUploading).toBe(false);
  });

  it('should add valid files', () => {
    const store = useUploadStore();
    store.addFiles([mockFile]);
    expect(store.files).toHaveLength(1);
    expect(store.files![0]?.fileValidation).toBe('valid');
  });

  it('should handle invalid file format', () => {
    const store = useUploadStore();
    const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
    store.addFiles([invalidFile]);
    expect(store.files![0]?.fileValidation).toBe('invalid_format');
  });

  it('should remove file', () => {
    const store = useUploadStore();
    store.addFiles([mockFile]);
    const fileToRemove = store.files![0];
    if (fileToRemove) {
      store.removeFile(fileToRemove);
    }
    expect(store.files).toHaveLength(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
  });

  it('should clear files', () => {
    const store = useUploadStore();
    store.addFiles([mockFile]);
    store.clearFiles();
    expect(store.files).toHaveLength(0);
    expect(store.isUploading).toBe(false);
  });
});
