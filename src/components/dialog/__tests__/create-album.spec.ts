import CreateAlbum from '@/components/dialog/CreateAlbum.vue';
import router from '@/router';
import { AlbumService } from '@/services/album-service';
import { LocationService } from '@/services/location-service';
import { useAlbumStore, useDialogStore } from '@/stores';
import { createTestingPinia } from '@pinia/testing';
import { QueryClient, VueQueryPlugin, type VueQueryPluginOptions } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { AutoComplete, ToggleSwitch } from 'primevue';
import PrimeVue from 'primevue/config';
import { useToast } from 'primevue/usetoast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock services
vi.mock('@/services/album-service', () => ({
  AlbumService: {
    createAlbum: vi.fn().mockResolvedValue({ code: 200 }),
    updateAlbum: vi.fn().mockResolvedValue({ code: 200 }),
  },
}));

vi.mock('@/services/album-tag-service', () => ({
  AlbumTagService: {
    createAlbumTags: vi.fn().mockResolvedValue({ code: 200 }),
    getAlbumTags: vi.fn().mockResolvedValue({ code: 200, data: [] }),
  },
}));

vi.mock('@/services/location-service', () => ({
  LocationService: {
    searchPlaces: vi.fn(),
  },
}));

vi.mock('primevue/usetoast', () => ({
  useToast: vi.fn(),
}));

// Create a test query client for tests
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // disable retries for testing
    },
  },
});

describe('CreateAlbum', () => {
  let dialogStore: ReturnType<typeof useDialogStore>;
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
  });

  const mountComponent = () => {
    // Reset dialog state before each mount
    const options: VueQueryPluginOptions = {
      queryClient,
    };

    return mount(CreateAlbum, {
      global: {
        plugins: [pinia, router, PrimeVue, [VueQueryPlugin, options]],
        stubs: {
          Dialog: {
            template:
              '<div class="p-dialog" v-if="visible"><slot name="header"></slot><slot></slot></div>',
            props: ['visible'],
          },
          AutoComplete,
        },
      },
    });
  };

  beforeEach(() => {
    dialogStore = useDialogStore();
    dialogStore.setDialogState('updateAlbum', true);

    vi.clearAllMocks();
    queryClient.clear(); // Clear query cache between tests
    (useToast as any).mockReturnValue({
      add: vi.fn(),
    });
  });

  it('renders correctly with default values for new album', async () => {
    const wrapper = mountComponent();

    expect(wrapper.find('.p-dialog').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="dialog-title"]').text()).toBe('New Album');
    expect(wrapper.find('[data-test-id="select-album-year"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="input-album-id"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="input-album-name"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-id="input-album-desc"]').exists()).toBe(true);
  });

  it('validates required fields before submission', async () => {
    const wrapper = mountComponent();
    const submitButton = wrapper.find('[data-test-id="submit-album-button"]');

    // Initially button should be disabled due to validation
    expect(submitButton.attributes('disabled')).toBeDefined();

    // Fill in required fields
    await wrapper.find('[data-test-id="input-album-id"]').setValue('test-album');
    await wrapper.find('[data-test-id="input-album-name"]').setValue('Test Album');

    // Button should now be enabled
    expect(submitButton.attributes('disabled')).toBeUndefined();
  });

  it('handles album ID validation rules correctly', async () => {
    const wrapper = mountComponent();
    const albumIdInput = wrapper.find('[data-test-id="input-album-id"]');

    // Test minimum length
    await albumIdInput.setValue('a');
    expect(wrapper.text()).toContain('It must be at least 2 characters long');

    // Test maximum length
    await albumIdInput.setValue('a'.repeat(31));
    expect(wrapper.text()).toContain('It cannot exceed 30 characters');

    // Test invalid characters
    await albumIdInput.setValue('Invalid@Album#ID');
    expect(wrapper.text()).toContain(
      'Only lowercase alphanumeric, underscore and dash are allowed',
    );

    await albumIdInput.setValue('invalid space album id');
    expect(wrapper.text()).toContain(
      'Only lowercase alphanumeric, underscore and dash are allowed',
    );

    // Test valid input
    await albumIdInput.setValue('valid-album-id');
    expect(wrapper.text()).not.toContain('Only lowercase alphanumeric');
  });

  it('toggles featured album based on private album status', async () => {
    const wrapper = mountComponent();
    const privateToggle = wrapper.findComponent(ToggleSwitch);
    const featuredToggle = wrapper.findAllComponents(ToggleSwitch)[1]!;

    // Default private album is true
    expect(privateToggle.props('modelValue')).toBe(true);
    expect(featuredToggle.classes()).toContain('p-disabled');

    // Disable private album
    await privateToggle.setValue(false);
    expect(privateToggle.props('modelValue')).toBe(false);
    expect(featuredToggle.classes()).not.toContain('p-disabled');

    // Set featured to true
    await featuredToggle.setValue(true);
    expect(featuredToggle.props('modelValue')).toBe(true);

    // Enable private album
    await privateToggle.setValue(true);
    expect(privateToggle.props('modelValue')).toBe(true);

    // Featured should automatically be set to false
    expect(featuredToggle.props('modelValue')).toBe(false);
    // Featured toggle should be disabled
    expect(featuredToggle.classes()).toContain('p-disabled');
  });

  it('handles place search correctly', async () => {
    const wrapper = mountComponent();
    const autoComplete = wrapper.findComponent(AutoComplete);

    const mockPlaces = [
      {
        displayName: 'New York',
        formattedAddress: 'NY, USA',
        location: { latitude: 40.7128, longitude: -74.006 },
      },
    ];

    vi.mocked(LocationService.searchPlaces).mockResolvedValueOnce({
      code: 200,
      status: 'success',
      data: mockPlaces,
    });

    // Trigger place search
    autoComplete.vm.$emit('complete', { query: 'New York' });

    expect(LocationService.searchPlaces).toHaveBeenCalledWith('New York');
  });

  it('successfully creates a new album', async () => {
    const wrapper = mountComponent();
    const mockAlbum = {
      year: '2024',
      id: 'test-album',
      albumName: 'Test Album',
      description: 'Test Description',
      isPrivate: true,
      tags: ['test'],
    };

    // Fill in form
    await wrapper.find('[data-test-id="input-album-id"]').setValue(mockAlbum.id);
    await wrapper.find('[data-test-id="input-album-name"]').setValue(mockAlbum.albumName);
    await wrapper.find('[data-test-id="input-album-desc"]').setValue(mockAlbum.description);

    // Submit form
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const mutation = queryClient.getMutationCache().getAll()[0]!;
    expect(mutation.state.status).toBe('success');

    const toast = useToast();
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Success',
      }),
    );
  });

  it('handles error during album creation', async () => {
    const wrapper = mountComponent();

    // Make the service fail
    vi.mocked(AlbumService.createAlbum).mockRejectedValueOnce(new Error('Failed to create'));

    // Fill in required fields
    await wrapper.find('[data-test-id="input-album-id"]').setValue('test-album');
    await wrapper.find('[data-test-id="input-album-name"]').setValue('Test Album');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const mutation = queryClient.getMutationCache().getAll()[0]!;
    expect(mutation.state.status).toBe('error');

    const toast = useToast();
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Error',
      }),
    );
  });

  it('closes dialog when form is reset', async () => {
    const wrapper = mountComponent();
    await wrapper.find('[data-test-id="cancel-button"]').trigger('click');

    expect(dialogStore.dialogStates.updateAlbum).toBe(false);
  });

  it('displays existing album data when editing', async () => {
    const albumStore = useAlbumStore();
    albumStore.albumToBeUpdate = {
      year: '2023',
      id: 'existing-album',
      albumName: 'Existing Album',
      description: 'Existing Description',
      isPrivate: false,
      isFeatured: true,
      tags: ['existing-tag'],
      place: {
        displayName: 'Test Place',
        formattedAddress: 'Test Address',
        location: { latitude: 10, longitude: 20 },
      },
    };
    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-test-id="dialog-title"]').text()).toBe('Edit Album');
    expect(wrapper.find('[data-test-id="select-album-year"]').classes()).toContain('p-disabled');
    expect(wrapper.find('[data-test-id="input-album-id"]').attributes('disabled')).toBe('');
    expect(
      (wrapper.find('[data-test-id="input-album-name"]').element as HTMLInputElement).value,
    ).toBe('Existing Album');
    expect(
      (wrapper.find('[data-test-id="input-album-desc"]').element as HTMLTextAreaElement).value,
    ).toBe('Existing Description');
    expect(wrapper.findComponent(ToggleSwitch).props('modelValue')).toBe(false);
    expect(wrapper.findAllComponents(ToggleSwitch)[1]!.props('modelValue')).toBe(true);
    expect((wrapper.find('.p-autocomplete-input').element as HTMLInputElement).value).toBe(
      'Test Place',
    );
    expect(wrapper.findComponent({ name: 'PhotoLocationMap' }).exists()).toBe(true);
  });

  it('successfully updates an existing album', async () => {
    const albumStore = useAlbumStore();
    albumStore.albumToBeUpdate = {
      year: '2023',
      id: 'existing-album',
      albumName: 'Old Name',
      description: 'Old Description',
      isPrivate: true,
    };
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.find('[data-test-id="input-album-name"]').setValue('New Name');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(AlbumService.updateAlbum).toHaveBeenCalledWith(
      expect.objectContaining({
        albumName: 'New Name',
      }),
    );

    const toast = useToast();
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Success',
        detail: 'Album "New Name" updated.',
      }),
    );
  });

  it('validates album name and description length', async () => {
    const wrapper = mountComponent();
    const albumNameInput = wrapper.find('[data-test-id="input-album-name"]');
    const albumDescInput = wrapper.find('[data-test-id="input-album-desc"]');

    await albumNameInput.setValue('a');
    expect(wrapper.text()).toContain('It must be at least 2 characters long');
    await albumNameInput.setValue('a'.repeat(51));
    expect(wrapper.text()).toContain('It cannot exceed 50 characters');

    await albumDescInput.setValue('a'.repeat(201));
    expect(wrapper.text()).toContain('It cannot exceed 200 characters');
  });

  it('opens create tag dialog when button is clicked', async () => {
    const wrapper = mountComponent();
    await wrapper.find('[data-test-id="create-tag-button"]').trigger('click');
    expect(dialogStore.setDialogState).toHaveBeenCalledWith('createAlbumTag', true);
  });

  it('handles empty place search query', async () => {
    const wrapper = mountComponent();
    const autoComplete = wrapper.findComponent(AutoComplete);
    autoComplete.vm.$emit('complete', { query: '' });
    await flushPromises();
    expect(LocationService.searchPlaces).not.toHaveBeenCalled();
  });

  it('invalidates separate query keys on success', async () => {
    // Reset store state to ensure clean slate from previous tests
    const albumStore = useAlbumStore();
    albumStore.albumToBeUpdate = {
      year: '2025',
      id: '',
      albumName: '',
      albumCover: '',
      description: '',
      tags: [],
      isPrivate: true,
    };
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01'));
    // Spy on invalidateQueries
    vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = mountComponent();
    const mockAlbum = {
      year: '2025',
      id: 'test-album',
      albumName: 'Test Album',
      description: 'Test Description',
      isPrivate: true,
      tags: [],
    };

    // Ensure we are on the correct route to trigger invalidation
    await router.push({ name: 'albumsByYear', params: { year: '2025' } });

    // Fill in form
    await wrapper.find('[data-test-id="input-album-id"]').setValue(mockAlbum.id);
    await wrapper.find('[data-test-id="input-album-name"]').setValue(mockAlbum.albumName);

    // Fill other fields
    await wrapper.find('[data-test-id="input-album-desc"]').setValue(mockAlbum.description);

    // Submit form
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // Advance time by 2000ms
    vi.advanceTimersByTime(2000);
    await flushPromises();

    // Check invalidations
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['countAlbumsByYear'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['fetchAlbumsByYears', '2025'],
    });

    vi.useRealTimers();
  });
});
