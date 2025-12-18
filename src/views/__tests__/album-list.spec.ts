import { setupQueryMocks } from '@/mocks/setup-query-mock';
import type { UserPermission } from '@/schema';
import { useAlbumStore, useDialogStore, useUserConfigStore } from '@/stores';
import AlbumList from '@/views/AlbumList.vue';
import { createTestingPinia } from '@pinia/testing';
import { mount, VueWrapper } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive, ref } from 'vue';
import { type RouteLocationNormalizedLoadedGeneric, useRoute } from 'vue-router';

const mockPush = vi.fn();

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => reactive({ params: {} })),
  useRouter: vi.fn(() => ({
    push: mockPush,
    currentRoute: ref({ params: {} }),
  })),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: vi.fn(() => ({
    add: vi.fn(),
  })),
}));

vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('@/utils/helper', async () => {
  const actual = await vi.importActual('@/utils/helper');
  return {
    ...actual,
    getDataFromLocalStorage: vi.fn(),
  };
});

describe('AlbumList.vue', () => {
  const createWrapper = (storeOverrides = {}): VueWrapper => {
    return mount(AlbumList, {
      global: {
        plugins: [
          PrimeVue,
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
            initialState: {
              album: {
                selectedYear: 'na',
                filterState: {
                  searchKey: '',
                  selectedTags: [],
                  privateOnly: false,
                  sortOrder: 'desc',
                },
                filteredAlbums: [],
                filteredAlbumsByYear: null,
              },
              dialog: {
                dialogStates: {
                  renamePhoto: false,
                  movePhoto: false,
                  deletePhoto: false,
                  updateAlbum: false,
                  createAlbumTag: false,
                  showAlbumTags: false,
                  createTravelRecords: false,
                  showTravelRecords: false,
                },
              },
              ...storeOverrides,
            },
          }),
        ],
        stubs: {
          Button: true,
          SelectYear: true,
          SelectTags: true,
          Paginator: true,
          Panel: true,
          ToggleSwitch: true,
          Skeleton: true,
          Carousel: true,
          Album: true,
          ScrollTop: true,
          CreateAlbum: true,
          CreateAlbumTag: true,
          ShowAlbumTags: true,
          Toast: true,
        },
      },
    });
  };

  beforeEach(() => {
    setupQueryMocks();
    vi.clearAllMocks();
    vi.mocked(useRoute).mockReset();
    vi.mocked(useRoute).mockReturnValue(
      reactive({ params: {} }) as RouteLocationNormalizedLoadedGeneric,
    );
  });

  it('renders the component', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it('toggles sort order when the sort button is clicked', async () => {
    const wrapper = createWrapper();
    const albumStore = useAlbumStore();

    const sortButton = wrapper.findComponent({ name: 'Button' });
    await sortButton.trigger('click');
    expect(albumStore.filterState.sortOrder).toBe('asc');
    await sortButton.trigger('click');
    expect(albumStore.filterState.sortOrder).toBe('desc');
  });

  it('updates selected year when a year is selected', async () => {
    const wrapper = createWrapper();
    const albumStore = useAlbumStore();

    const selectYear = wrapper.findComponent({ name: 'SelectYear' });
    await selectYear.vm.$emit('select-year', '2023');
    expect(mockPush).toHaveBeenCalledWith({
      name: 'albumsByYear',
      params: { year: '2023' },
    });

    const mockRouteResult = vi.mocked(useRoute).mock.results[0];
    expect(mockRouteResult).toBeDefined();
    const mockRoute = mockRouteResult!.value as ReturnType<typeof useRoute>;
    mockRoute.params.year = '2022';
    await nextTick();
    expect(albumStore.selectedYear).toBe('2022');
  });

  it('updates selected tags when tags are selected', async () => {
    const wrapper = createWrapper();
    const albumStore = useAlbumStore();

    const selectTags = wrapper.findComponent({ name: 'SelectTags' });
    await selectTags.vm.$emit('select-tags', ['tag1', 'tag2']);
    expect(albumStore.setSelectedTags).toHaveBeenCalledWith(['tag1', 'tag2']);
    expect(albumStore.filterState.selectedTags).toEqual(['tag1', 'tag2']);
  });

  it('updates pagination when page changes', async () => {
    const wrapper = createWrapper();
    const paginator = wrapper.findComponent({ name: 'Paginator' });
    await paginator.vm.$emit('page', { page: 2, rows: 20 });
    expect((wrapper.vm as any).pageNumber).toBe(3);
    expect((wrapper.vm as any).itemsPerPage).toBe(20);
  });

  it('displays featured albums when available', async () => {
    const wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    // The featured albums are now wrapped in a Panel component
    const panel = wrapper.findComponent({ name: 'Panel' });
    expect(panel.exists()).toBe(true);
    expect(panel.attributes('data-test-id')).toBe('featured-albums-panel');
  });

  it('displays a skeleton loader when fetching albums', async () => {
    setupQueryMocks({
      useQuery: {
        isFetching: ref(true),
      },
    });

    // Ensure useRoute returns a reactive object with a valid params.year
    vi.mocked(useRoute).mockReturnValue(reactive({ params: { year: 'na' } }) as any);
    const wrapper = createWrapper();
    await wrapper.vm.$nextTick();
    expect(wrapper.findAllComponents({ name: 'Skeleton' }).length).toBeGreaterThan(0);
  });

  it('displays "No results" when no albums are available', async () => {
    setupQueryMocks({
      useQuery: {
        data: ref([]),
      },
    });
    const wrapper = createWrapper();
    const albumStore = useAlbumStore();

    albumStore.setSortOrder('desc'); // Trigger applyFilters
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('No results.');
  });

  it('displays the correct number of albums', async () => {
    const wrapper = createWrapper();
    const albumStore = useAlbumStore();
    albumStore.filteredAlbums = [
      {
        id: '1',
        albumName: 'Album 1',
        year: '2023',
        albumCover: '',
        description: '',
        tags: [],
        isPrivate: false,
      },
      {
        id: '2',
        albumName: 'Album 2',
        year: '2023',
        albumCover: '',
        description: '',
        tags: [],
        isPrivate: false,
      },
      {
        id: '3',
        albumName: 'Album 3',
        year: '2023',
        albumCover: '',
        description: '',
        tags: [],
        isPrivate: false,
      },
    ];

    albumStore.setSortOrder('desc'); // Trigger applyFilters
    await wrapper.vm.$nextTick();
    expect(wrapper.findAllComponents({ name: 'Album' }).length).toBe(3);
  });

  it('shows the private album toggle for admin users', async () => {
    const wrapper = createWrapper();
    const albumStore = useAlbumStore();
    const userStore = useUserConfigStore();
    userStore.setUserPermission({ role: 'admin' } as UserPermission);
    await wrapper.vm.$nextTick();

    const toggleSwitch = wrapper.findComponent({ name: 'ToggleSwitch' });
    expect(toggleSwitch.exists()).toBe(true);
    await toggleSwitch.vm.$emit('update:modelValue', true);
    expect(albumStore.filterState.privateOnly).toBe(true);
  });

  it('renders CreateAlbum dialog when updateAlbum is true', async () => {
    const wrapper = createWrapper();
    const dialogStore = useDialogStore();

    dialogStore.setDialogState('updateAlbum', true);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'CreateAlbum' }).exists()).toBe(true);
  });

  it('renders CreateAlbumTag dialog when createAlbumTag is true', async () => {
    const wrapper = createWrapper();
    const dialogStore = useDialogStore();

    dialogStore.setDialogState('createAlbumTag', true);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'CreateAlbumTag' }).exists()).toBe(true);
  });

  it('renders ShowAlbumTags dialog when showAlbumTags is true', async () => {
    const wrapper = createWrapper();
    const dialogStore = useDialogStore();

    dialogStore.setDialogState('showAlbumTags', true);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'ShowAlbumTags' }).exists()).toBe(true);
  });
});
