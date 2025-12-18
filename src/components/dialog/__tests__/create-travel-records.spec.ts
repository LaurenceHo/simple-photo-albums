import CreateTravelRecordsDialog from '@/components/dialog/CreateTravelRecords.vue';
import { setupQueryMocks } from '@/mocks/setup-query-mock';
import { LocationService } from '@/services/location-service';
import { useDialogStore } from '@/stores';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import AutoComplete from 'primevue/autocomplete';
import PrimeVue from 'primevue/config';
import { useToast } from 'primevue/usetoast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: vi.fn(),
}));

// Mock services
vi.mock('@/services/location-service', () => ({
  LocationService: {
    searchPlaces: vi.fn(),
  },
}));

vi.mock('@/services/travel-record-service', () => ({
  TravelRecordService: {
    createTravelRecord: vi.fn(),
  },
}));

describe('CreateTravelRecordsDialog', () => {
  let wrapper: any;
  let dialogStore: ReturnType<typeof useDialogStore>;

  beforeEach(() => {
    setupQueryMocks();
    vi.clearAllMocks();

    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    dialogStore = useDialogStore();
    dialogStore.setDialogState('createTravelRecords', true);

    wrapper = mount(CreateTravelRecordsDialog, {
      global: {
        plugins: [pinia, PrimeVue],
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

    (useToast as any).mockReturnValue({
      add: vi.fn(),
    });
  });

  it('renders dialog when createTravelRecordsDialogState is true', () => {
    expect(wrapper.find('[data-test-id="show-travel-records-dialog"]').exists()).toBe(true);
    expect(wrapper.find('.text-lg.font-semibold').text()).toBe('New travel records');
  });

  it('hides dialog when createTravelRecordsDialogState is false', async () => {
    dialogStore.setDialogState('createTravelRecords', false);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test-id="show-travel-records-dialog"]').exists()).toBe(false);
  });

  it('displays validation error when travel date is empty', async () => {
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    expect(wrapper.find('.p-error').text()).toContain('Travel date is required');
  });

  it('displays validation error when departure is empty', async () => {
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    expect(wrapper.findAll('.p-error')[1].text()).toContain('Departure is required');
  });

  it('displays validation error when destination is empty', async () => {
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    expect(wrapper.findAll('.p-error')[2].text()).toContain('Destination is required');
  });

  it('calls searchPlaces when typing in departure autocomplete', async () => {
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

    const autoComplete = wrapper.findAllComponents(AutoComplete)[0];
    autoComplete.vm.$emit('complete', { query: 'New York' });
    await flushPromises();

    expect(LocationService.searchPlaces).toHaveBeenCalledWith('New York');
  });

  it('calls searchPlaces when typing in destination autocomplete', async () => {
    const mockPlaces = [
      { displayName: 'London', formattedAddress: 'UK' },
      { displayName: 'Los Angeles', formattedAddress: 'CA, USA' },
    ];
    (LocationService.searchPlaces as any).mockResolvedValue({ data: mockPlaces });

    const autoComplete = wrapper.findAllComponents(AutoComplete)[0];
    autoComplete.vm.$emit('complete', { query: 'Lon' });
    await flushPromises();

    expect(LocationService.searchPlaces).toHaveBeenCalledWith('Lon');
  });

  it('resets form and closes dialog on cancel', async () => {
    expect(dialogStore.dialogStates.createTravelRecords).toBe(true);
    wrapper.vm.travelDate = new Date('2023-10-01');
    wrapper.vm.selectedDeparture = { displayName: 'New York', formattedAddress: 'NY, USA' };
    wrapper.vm.selectedDestination = { displayName: 'London', formattedAddress: 'UK' };
    await wrapper.vm.$nextTick();

    // Click cancel
    await wrapper.find('[data-test-id="cancel-button"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(dialogStore.dialogStates.createTravelRecords).toBe(false);
    expect(wrapper.vm.travelDate).toBe('');
    expect(wrapper.vm.selectedDeparture).toBe(null);
    expect(wrapper.vm.selectedDestination).toBe(null);
  });
});
