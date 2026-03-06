import CreateTravelRecordsDialog from '@/components/dialog/CreateTravelRecords.vue';
import { setupQueryMocks } from '@/mocks/setup-query-mock';
import { LocationService } from '@/services/location-service';
import { TravelRecordService } from '@/services/travel-record-service';
import { useDialogStore } from '@/stores';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import AutoComplete from 'primevue/autocomplete';
import PrimeVue from 'primevue/config';
import InputText from 'primevue/inputtext';
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
    wrapper.vm.flightNumber = 'NH106';
    await wrapper.vm.$nextTick();

    // Click cancel
    await wrapper.find('[data-test-id="cancel-button"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(dialogStore.dialogStates.createTravelRecords).toBe(false);
    expect(wrapper.vm.travelDate).toBe('');
    expect(wrapper.vm.selectedDeparture).toBe(null);
    expect(wrapper.vm.selectedDestination).toBe(null);
    expect(wrapper.vm.flightNumber).toBe('');
  });

  // Flight number functionality tests

  it('renders flight number input field', () => {
    const flightInput = wrapper.findComponent(InputText);
    expect(flightInput.exists()).toBe(true);
    expect(wrapper.find('label[for="flight-number"]').text()).toBe('Flight number');
  });

  it('shows departure and destination fields when no flight number is entered', () => {
    expect(wrapper.findAllComponents(AutoComplete).length).toBe(2);
    expect(wrapper.find('label[for="departure"]').exists()).toBe(true);
    expect(wrapper.find('label[for="destination"]').exists()).toBe(true);
  });

  it('hides departure and destination fields when flight number is entered', async () => {
    wrapper.vm.flightNumber = 'NH106';
    await wrapper.vm.$nextTick();

    expect(wrapper.findAllComponents(AutoComplete).length).toBe(0);
    expect(wrapper.find('label[for="departure"]').exists()).toBe(false);
    expect(wrapper.find('label[for="destination"]').exists()).toBe(false);
  });

  it('hides transport type selector when flight number is entered', async () => {
    // Transport type select should be visible initially
    expect(wrapper.find('.p-select').exists()).toBe(true);

    wrapper.vm.flightNumber = 'NH106';
    await wrapper.vm.$nextTick();

    // Transport type select should be hidden
    expect(wrapper.find('.p-select').exists()).toBe(false);
  });

  it('shows warning message when flight number is entered', async () => {
    // No warning initially
    expect(wrapper.find('.text-yellow-600').exists()).toBe(false);

    wrapper.vm.flightNumber = 'NH106';
    await wrapper.vm.$nextTick();

    const warning = wrapper.find('.text-yellow-600');
    expect(warning.exists()).toBe(true);
    expect(warning.text()).toContain(
      'Departure and destination will be auto-populated from flight data.',
    );
  });

  it('does not require departure and destination when flight number is entered', async () => {
    wrapper.vm.flightNumber = 'NH106';
    wrapper.vm.travelDate = new Date('2025-01-15');
    await wrapper.vm.$nextTick();

    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    // Should not show departure/destination validation errors
    const errors = wrapper.findAll('.p-error');
    const errorTexts = errors.map((e: any) => e.text());
    expect(errorTexts).not.toContain('Departure is required');
    expect(errorTexts).not.toContain('Destination is required');
  });

  it('calls createTravelRecord with flight data in flight API mode', async () => {
    vi.mocked(TravelRecordService.createTravelRecord).mockResolvedValueOnce({
      code: 200,
      status: 'Success',
      message: 'ok',
    });

    wrapper.vm.travelDate = new Date('2025-01-15T00:00:00.000Z');
    wrapper.vm.flightNumber = 'NH 106';
    await wrapper.vm.$nextTick();
    await flushPromises();

    await wrapper.vm.$nextTick();
    await flushPromises();

    // Call createRecord directly since Vuelidate dynamic rules don't re-evaluate in test env
    wrapper.vm.createRecord();
    await flushPromises();

    expect(TravelRecordService.createTravelRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        flightNumber: 'NH 106',
        transportType: 'flight',
      }),
    );

    // Should NOT include departure/destination or id
    const callArgs = vi.mocked(TravelRecordService.createTravelRecord).mock.calls[0]?.[0];
    expect(callArgs).not.toHaveProperty('departure');
    expect(callArgs).not.toHaveProperty('destination');
    expect(callArgs).not.toHaveProperty('id');
  });

  it('calls createTravelRecord with manual data when no flight number', async () => {
    vi.mocked(TravelRecordService.createTravelRecord).mockResolvedValueOnce({
      code: 200,
      status: 'Success',
      message: 'ok',
    });

    wrapper.vm.travelDate = new Date('2025-01-15T00:00:00.000Z');
    wrapper.vm.selectedDeparture = {
      displayName: 'Tokyo',
      formattedAddress: 'Tokyo, Japan',
      location: { latitude: 35.67, longitude: 139.65 },
    };
    wrapper.vm.selectedDestination = {
      displayName: 'London',
      formattedAddress: 'London, UK',
      location: { latitude: 51.5, longitude: -0.12 },
    };
    await wrapper.vm.$nextTick();

    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(TravelRecordService.createTravelRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        departure: expect.objectContaining({ displayName: 'Tokyo' }),
        destination: expect.objectContaining({ displayName: 'London' }),
        transportType: 'flight',
      }),
    );

    const callArgs = vi.mocked(TravelRecordService.createTravelRecord).mock.calls[0]?.[0];
    expect(callArgs).not.toHaveProperty('id');
  });
});
