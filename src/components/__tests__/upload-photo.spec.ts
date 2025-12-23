import UploadPhotos from '@/components/UploadPhotos.vue';
import { useUploadStore } from '@/stores/upload';
import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Button from 'primevue/button';
import PrimeVue from 'primevue/config';
import Message from 'primevue/message';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

vi.mock('primevue/usetoast', () => ({
  useToast: vi.fn(() => ({
    add: vi.fn(),
  })),
}));

vi.mock('@/services/photo-service', () => ({
  PhotoService: {
    uploadPhotos: vi.fn().mockResolvedValue({ status: 'Success' }),
  },
}));

vi.mock('@/stores/photo', () => ({
  usePhotoStore: vi.fn(() => ({
    findPhotoIndex: vi.fn().mockReturnValue(-1),
  })),
}));

describe('UploadPhotos.vue', () => {
  const mockAlbumId = 'album-123';
  const mockFiles = [
    { id: '1', file: new File([''], 'test.png', { type: 'image/png' }), fileValidation: 'valid' },
    {
      id: '2',
      file: new File([''], 'invalid.txt', { type: 'text/plain' }),
      fileValidation: 'invalid',
    },
  ];

  let wrapper: any;

  const mountWrapper = () => {
    return mount(UploadPhotos, {
      props: {
        albumId: mockAlbumId,
      },
      global: {
        plugins: [
          PrimeVue,
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              upload: {
                files: [],
                isUploading: false,
                isCompleteUploading: false,
                overwrite: false,
              },
            },
          }),
        ],
        components: {
          Button,
          Message,
          DropZone: {
            template: '<div><slot :drop-zone-active="false"></slot></div>',
          },
          FilePreview: {
            template: '<div />',
          },
          IconX: {
            template: '<svg />',
          },
        },
      },
    });
  };

  beforeEach(() => {
    wrapper = mountWrapper();
  });

  it('renders initial state correctly', () => {
    expect(wrapper.find('.text-lg').text()).toContain('Drag Your Photos Here');
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="upload-file-button"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="clear-file-button"]').exists()).toBe(true);
  });

  it('closes uploader when close button is clicked', async () => {
    const store = useUploadStore();
    await wrapper.find('.mb-2').trigger('click');
    expect(store.clearFiles).toHaveBeenCalled();
    expect(wrapper.emitted()).toHaveProperty('closePhotoUploader');
  });

  it('adds files when selected via file input', async () => {
    const store = useUploadStore();
    const input = wrapper.find('input[type="file"]');
    const mockFileList = [new File([''], 'test.png', { type: 'image/png' })];

    Object.defineProperty(input.element, 'files', {
      value: mockFileList,
    });

    await input.trigger('change');
    expect(store.addFiles).toHaveBeenCalledWith(expect.arrayContaining(mockFileList));
  });

  it('disables upload button when no valid files', async () => {
    const store = useUploadStore();
    store.files = mockFiles as any;
    await nextTick();

    const uploadButton = wrapper.find('[data-test-id="upload-file-button"]');
    // It should be enabled because validFiles.length > 0 (1 valid file)
    // Wait, mockFiles has 1 valid, 1 invalid.
    // Logic: :disabled="isUploading || validFiles.length === 0"
    expect(uploadButton.attributes('disabled')).toBeUndefined();

    // Set only invalid files
    store.files = [mockFiles[1]] as any;
    await nextTick();
    expect(uploadButton.attributes('disabled')).toBeDefined();
  });

  it('shows success message when upload is complete', async () => {
    const store = useUploadStore();
    store.isCompleteUploading = true;
    await nextTick();

    expect(wrapper.findComponent(Message).exists()).toBe(true);
    expect(wrapper.findComponent(Message).text()).toContain('Upload finished!');
    expect(wrapper.find('[data-test-id="finish-button"]').exists()).toBe(true);
  });

  it('clears all files when clear button is clicked', async () => {
    const store = useUploadStore();
    store.files = mockFiles as any;
    await nextTick();

    await wrapper.find('[data-test-id="clear-file-button"]').trigger('click');
    expect(store.clearFiles).toHaveBeenCalled();
  });

  it('emits refresh event when finish button is clicked', async () => {
    const store = useUploadStore();
    store.isCompleteUploading = true;
    await nextTick();

    await wrapper.find('[data-test-id="finish-button"]').trigger('click');
    expect(wrapper.emitted()).toHaveProperty('refreshPhotoList');
    expect(wrapper.emitted()).toHaveProperty('closePhotoUploader');
  });

  it('validates drag and drop files', async () => {
    const dropZone = wrapper.findComponent({ name: 'DropZone' });
    await dropZone.vm.$emit('valid-drag', true);
    expect(wrapper.vm.isValidDrag).toBe(true);

    await dropZone.vm.$emit('valid-drag', false);
    expect(wrapper.vm.isValidDrag).toBe(false);
  });

  it('clears files when albumId changes', async () => {
    const store = useUploadStore();
    store.files = mockFiles as any;
    await nextTick();

    await wrapper.setProps({ albumId: 'new-album-456' });
    expect(store.clearFiles).toHaveBeenCalled();
  });

  it('calls uploadFiles with albumId', async () => {
    const store = useUploadStore();
    store.files = [mockFiles[0]] as any;
    await nextTick();

    await wrapper.find('[data-test-id="upload-file-button"]').trigger('click');
    expect(store.uploadFiles).toHaveBeenCalledWith(mockAlbumId);
  });

  it('revokes object URLs when files are removed or cleared', async () => {
    setActivePinia(createPinia());
    const store = useUploadStore();
    const revokeSpy = vi.fn();
    global.URL.revokeObjectURL = revokeSpy;

    // Test removeFile
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    const file1 = new File([''], 'test1.png', { type: 'image/png' });
    store.addFiles([file1]);
    const uploadFile1 = store.files[0];
    if (!uploadFile1) throw new Error('File 1 not added');
    const url1 = uploadFile1.url;

    store.removeFile(uploadFile1);
    expect(revokeSpy).toHaveBeenCalledWith(url1);
    expect(uploadFile1.url).toBe('');

    // Test clearFiles
    revokeSpy.mockClear();
    const file2 = new File([''], 'test2.png', { type: 'image/png' });
    const file3 = new File([''], 'test3.png', { type: 'image/png' });
    store.addFiles([file2, file3]);
    const uploadFile2 = store.files[0];
    const uploadFile3 = store.files[1];
    if (!uploadFile2 || !uploadFile3) throw new Error('Files 2/3 not added');

    const url2 = uploadFile2.url;
    const url3 = uploadFile3.url;

    store.clearFiles();
    expect(revokeSpy).toHaveBeenCalledTimes(2);
    expect(revokeSpy).toHaveBeenCalledWith(url2);
    expect(revokeSpy).toHaveBeenCalledWith(url3);
  });
});
