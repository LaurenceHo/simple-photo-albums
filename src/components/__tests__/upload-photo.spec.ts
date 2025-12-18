import UploadPhotos from '@/components/UploadPhotos.vue';
import useFileList from '@/composables/use-file-list';
import useFileUploader from '@/composables/use-file-uploader';
import { mount } from '@vue/test-utils';
import Button from 'primevue/button';
import PrimeVue from 'primevue/config';
import Message from 'primevue/message';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

// Mock composables - hoisted to top
vi.mock('@/composables/use-file-list', () => ({
  default: vi.fn(() => ({
    files: ref([]),
    addFiles: vi.fn(),
    removeFile: vi.fn(),
  })),
}));

vi.mock('@/composables/use-file-uploader', () => ({
  default: vi.fn(() => ({
    setIsCompleteUploading: vi.fn(),
    createUploader: vi.fn(() => ({
      uploadFile: vi.fn(() => Promise.resolve({ code: 200, status: 'success' })),
      uploadFiles: vi.fn(() => Promise.resolve()),
    })),
    isUploading: ref(false),
    isCompleteUploading: ref(false),
    overwrite: ref(false),
  })),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: vi.fn(() => ({
    add: vi.fn(),
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

  beforeEach(() => {
    // Reset mock implementations
    vi.mocked(useFileList).mockReturnValue({
      files: ref([]),
      addFiles: vi.fn(),
      removeFile: vi.fn(),
    });

    vi.mocked(useFileUploader).mockReturnValue({
      setIsCompleteUploading: vi.fn(),
      createUploader: () => ({
        uploadFile: vi.fn(() => Promise.resolve({ code: 200, status: 'success' })),
        uploadFiles: vi.fn(() => Promise.resolve()),
      }),
      isUploading: ref(false),
      isCompleteUploading: ref(false),
      overwrite: ref(false),
    });

    wrapper = mount(UploadPhotos, {
      props: {
        albumId: mockAlbumId,
      },
      global: {
        plugins: [PrimeVue],
        components: {
          Button,
          Message,
          DropZone: {
            template: '<div><slot /></div>',
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
  });

  it('renders initial state correctly', () => {
    expect(wrapper.find('.text-lg').text()).toContain('Drag Your Photos Here');
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="upload-file-button"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="clear-file-button"]').exists()).toBe(true);
  });

  it('closes uploader when close button is clicked', async () => {
    await wrapper.find('.mb-2').trigger('click');
    expect(wrapper.emitted()).toHaveProperty('closePhotoUploader');
  });

  it('adds files when selected via file input', async () => {
    const input = wrapper.find('input[type="file"]');
    const mockFileList = [new File([''], 'test.png', { type: 'image/png' })];

    Object.defineProperty(input.element, 'files', {
      value: mockFileList,
    });

    await input.trigger('change');
    expect(useFileList().addFiles).toHaveBeenCalledWith(mockFileList);
  });

  it('disables upload button when no valid files', () => {
    (useFileList as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      files: ref(mockFiles),
    });
    const uploadButton = wrapper.find('[data-test-id="upload-file-button"]');
    expect(uploadButton.attributes('disabled')).toBeDefined();
  });

  it('shows success message when upload is complete', async () => {
    (useFileList as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      files: ref([]),
      addFiles: vi.fn(),
      removeFile: vi.fn(),
    });

    (useFileUploader as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      setIsCompleteUploading: vi.fn(),
      createUploader: () => ({
        uploadFile: vi.fn(),
        uploadFiles: vi.fn(),
      }),
      isUploading: ref(false),
      isCompleteUploading: ref(true),
      overwrite: ref(false),
    });

    const newWrapper = mount(UploadPhotos, {
      props: { albumId: mockAlbumId },
      global: {
        plugins: [PrimeVue],
      },
    });

    // Wait for Vue updates
    await newWrapper.vm.$nextTick();

    // Assertions
    expect(newWrapper.findComponent(Message).exists()).toBe(true);
    expect(newWrapper.findComponent(Message).text()).toContain('Upload finished!');
    expect(newWrapper.find('[data-test-id="finish-button"]').exists()).toBe(true);
  });

  it('clears all files when clear button is clicked', async () => {
    (useFileList as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      files: ref(mockFiles),
    });

    const newWrapper = mount(UploadPhotos, {
      props: { albumId: mockAlbumId },
      global: {
        plugins: [PrimeVue],
      },
    });

    expect((newWrapper.vm as any).files.length).toBe(2);
    await newWrapper.find('[data-test-id="clear-file-button"]').trigger('click');
    expect((newWrapper.vm as any).files.length).toBe(0);
  });

  it('emits refresh event when finish button is clicked', async () => {
    (useFileUploader as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...useFileUploader(),
      isCompleteUploading: ref(true),
    });

    const newWrapper = mount(UploadPhotos, {
      props: { albumId: mockAlbumId },
      global: {
        plugins: [PrimeVue],
      },
    });

    await newWrapper.find('[data-test-id="finish-button"]').trigger('click');
    expect(newWrapper.emitted()).toHaveProperty('refreshPhotoList');
    expect(newWrapper.emitted()).toHaveProperty('closePhotoUploader');
  });

  it('validates drag and drop files', async () => {
    const dropZone = wrapper.findComponent({ name: 'DropZone' });
    await dropZone.vm.$emit('valid-drag', true);
    expect(wrapper.vm.isValidDrag).toBe(true);

    await dropZone.vm.$emit('valid-drag', false);
    expect(wrapper.vm.isValidDrag).toBe(false);
  });

  it('clears files when albumId changes', async () => {
    (useFileList as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      files: ref(mockFiles),
    });

    const newWrapper = mount(UploadPhotos, {
      props: { albumId: mockAlbumId },
      global: {
        plugins: [PrimeVue],
      },
    });

    expect((newWrapper.vm as any).files.length).toBe(2);
    await newWrapper.setProps({ albumId: 'new-album-456' });
    expect((newWrapper.vm as any).files.length).toBe(0);
  });
});
