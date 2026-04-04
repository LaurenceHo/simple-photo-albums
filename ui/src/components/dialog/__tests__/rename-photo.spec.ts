import RenamePhoto from '@/components/dialog/RenamePhoto.vue';
import { PhotoService } from '@/services/photo-service';
import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create hoisted mocks to share between component and tests
const { mockDialogStore, mockAlbumStore, mockPhotoStore, mockToast } = await vi.hoisted(
  async () => {
    const { ref } = await import('vue');
    const { vi } = await import('vitest');
    return {
      mockToast: { add: vi.fn() },
      mockDialogStore: {
        dialogStates: ref({ renamePhoto: true }),
        setDialogState: vi.fn(),
      },
      mockAlbumStore: {
        currentAlbum: ref({ id: 'test-album', year: '2023', albumCover: '' }),
        isAlbumCover: vi.fn().mockReturnValue(false),
        refetchAlbums: vi.fn(),
      },
      mockPhotoStore: {
        currentPhotoToBeRenamed: ref('test-album/old-name.jpg'),
        findPhotoIndex: vi.fn().mockReturnValue(-1),
      },
    };
  },
);

// Mock stores
vi.mock('@/stores', () => ({
  useAlbumStore: vi.fn(() => mockAlbumStore),
  usePhotoStore: vi.fn(() => mockPhotoStore),
  useDialogStore: vi.fn(() => mockDialogStore),
}));

// Mock Vue Query
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/vue-query')>();
  const { ref } = await import('vue');
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: ref(null),
      isFetching: ref(false),
      isError: ref(false),
      refetch: vi.fn(),
    })),
    useMutation: vi.fn((options) => {
      const isPending = ref(false);
      return {
        mutate: vi.fn(async (...args) => {
          isPending.value = true;
          try {
            const result = await options.mutationFn(...args);
            if (options.onSuccess) await options.onSuccess(result);
            return result;
          } catch (error) {
            if (options.onError) await options.onError(error);
          } finally {
            isPending.value = false;
          }
        }),
        isPending,
        reset: vi.fn(),
      };
    }),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
    })),
  };
});

// Mock services
vi.mock('@/services/photo-service', () => ({
  PhotoService: {
    renamePhoto: vi.fn(),
  },
}));

vi.mock('@/services/album-service', () => ({
  AlbumService: {
    updateAlbum: vi.fn(),
  },
}));

// Mock useToast
vi.mock('primevue/usetoast', () => ({
  useToast: vi.fn(() => mockToast),
}));

describe('RenamePhoto', () => {
  const DEFAULT_PROPS = { albumId: 'test-album' };

  const mountComponent = (props = DEFAULT_PROPS) => {
    return mount(RenamePhoto, {
      props,
      global: {
        plugins: [PrimeVue],
        stubs: {
          Dialog: {
            template: '<div class="p-dialog"><slot name="header"></slot><slot></slot></div>',
          },
          InputText: {
            template:
              '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue'],
          },
          Button: {
            template: '<button class="p-button">{{ label }}</button>',
            props: ['label'],
          },
          FloatLabel: {
            template: '<div><slot></slot></div>',
          },
        },
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDialogStore.dialogStates.value = { renamePhoto: true };
    mockPhotoStore.currentPhotoToBeRenamed.value = 'test-album/old-name.jpg';
    mockAlbumStore.currentAlbum.value = { id: 'test-album', year: '2023', albumCover: '' };
  });

  it('renders correctly with current photo name', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const input = wrapper.find('input');
    expect((input.element as HTMLInputElement).value).toBe('old-name');
    expect(wrapper.text()).toContain('.jpg');
  });

  it('validates required field', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const input = wrapper.find('input');
    await input.setValue('');
    await flushPromises();
    expect(wrapper.text()).toContain('This field is required.');
  });

  it('validates minimum length', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const input = wrapper.find('input');
    await input.setValue('a');
    await flushPromises();
    expect(wrapper.text()).toContain('It must be at least 2 characters long');
  });

  it('validates invalid characters', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const input = wrapper.find('input');
    await input.setValue('invalid@name');
    await flushPromises();
    expect(wrapper.text()).toContain(
      'Only alphanumeric, space, full stop, underscore and dash are allowed',
    );
  });

  it('successfully renames a photo', async () => {
    vi.mocked(PhotoService.renamePhoto).mockResolvedValue({ code: 200, status: 'success' });
    const wrapper = mountComponent();
    await flushPromises();

    const input = wrapper.find('input');
    await input.setValue('new-name');
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(PhotoService.renamePhoto).toHaveBeenCalledWith(
      'test-album',
      'new-name.jpg',
      'old-name.jpg',
    );
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        detail: 'Photos renamed',
      }),
    );
  });

  it('handles rename error', async () => {
    vi.mocked(PhotoService.renamePhoto).mockRejectedValue(new Error('Rename failed'));
    const wrapper = mountComponent();
    await flushPromises();

    const input = wrapper.find('input');
    await input.setValue('new-name');
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
      }),
    );
  });

  it('closes dialog on cancel', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const buttons = wrapper.findAll('button');
    const cancelButton = buttons.find((b) => b.text() === 'Cancel');

    if (!cancelButton) {
      throw new Error('Cancel button not found');
    }

    await cancelButton.trigger('click');
    expect(mockDialogStore.setDialogState).toHaveBeenCalledWith('renamePhoto', false);
  });
});
