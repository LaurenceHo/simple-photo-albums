<template>
  <Dialog
    v-model:visible="dialogStates.createTravelRecords"
    :closable="false"
    class="w-80"
    data-test-id="show-travel-records-dialog"
    modal
  >
    <template #header>
      <span class="text-lg font-semibold">New travel records</span>
    </template>
    <form @submit.prevent="validateAndSubmit" @reset.prevent="onReset">
      <div class="mb-4 pb-4">
        <FloatLabel>
          <DatePicker
            v-model="travelDate"
            :disabled="isCreatingRecord"
            :invalid="v$.travelDate.$invalid"
            dateFormat="yy-mm-dd"
            fluid
            name="travel-date"
          />
          <label for="travel-date">Travel date</label>
        </FloatLabel>
        <small v-if="v$.travelDate.$invalid" class="p-error">Travel date is required</small>
      </div>
      <div class="mb-4 pb-4">
        <FloatLabel>
          <AutoComplete
            v-model="selectedDeparture"
            :disabled="isCreatingRecord"
            :invalid="v$.departure.$invalid"
            :loading="isSearchingDeparture"
            :suggestions="placeSuggestions"
            class="w-full"
            input-class="w-full"
            input-id="departure"
            option-label="displayName"
            @complete="(e) => searchPlace(e, 'departure')"
          >
            <template #option="{ option }">
              <div class="flex flex-col">
                <span class="font-bold">{{ option?.displayName }}</span>
                <span class="text-sm text-gray-600">{{ option?.formattedAddress }}</span>
              </div>
            </template>
            <template #empty>
              <div class="text-gray-500 italic">No suggestion found</div>
            </template>
          </AutoComplete>
          <label for="departure">Departure</label>
        </FloatLabel>
        <small v-if="v$.departure.$invalid" class="p-error">Departure is required</small>
      </div>
      <div class="mb-4">
        <FloatLabel>
          <AutoComplete
            v-model="selectedDestination"
            :disabled="isCreatingRecord"
            :invalid="v$.destination.$invalid"
            :loading="isSearchingDestination"
            :suggestions="placeSuggestions"
            class="w-full"
            input-class="w-full"
            input-id="destination"
            option-label="displayName"
            @complete="(e) => searchPlace(e, 'destination')"
          >
            <template #option="{ option }">
              <div class="flex flex-col">
                <span class="font-bold">{{ option?.displayName }}</span>
                <span class="text-sm text-gray-600">{{ option?.formattedAddress }}</span>
              </div>
            </template>
            <template #empty>
              <div class="text-gray-500 italic">No suggestion found</div>
            </template>
          </AutoComplete>
          <label for="destination">Destination</label>
        </FloatLabel>
        <small v-if="v$.destination.$invalid" class="p-error">Destination is required</small>
      </div>
      <div class="mb-4">
        <Select
          v-model="selectedTransportType"
          :options="transportTypes"
          class="w-full"
          optionLabel="name"
        />
      </div>
      <div class="flex justify-end">
        <Button
          :disabled="isCreatingRecord"
          class="mr-2"
          data-test-id="cancel-button"
          label="Cancel"
          text
          @click="onReset"
        />
        <Button :disabled="v$.$invalid" :loading="isCreatingRecord" label="Save" type="submit" />
      </div>
    </form>
  </Dialog>
</template>

<script lang="ts" setup>
import type { Place } from '@/schema';
import { TravelRecordSchema } from '@/schema/travel-record';
import { LocationService } from '@/services/location-service';
import { TravelRecordService } from '@/services/travel-record-service';
import { useDialogStore, useTravelRecordsStore } from '@/stores';
import { useMutation } from '@tanstack/vue-query';
import { useVuelidate } from '@vuelidate/core';
import { helpers, required } from '@vuelidate/validators';
import { storeToRefs } from 'pinia';
import { AutoComplete, Button, DatePicker, Dialog, FloatLabel, Select } from 'primevue';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';

const transportTypes = [
  { name: 'Flight', code: 'flight' },
  { name: 'Train', code: 'train' },
  {
    name: 'Bus',
    code: 'bus',
  },
];
const toast = useToast();

const dialogStore = useDialogStore();
const { dialogStates } = storeToRefs(dialogStore);
const { refetchTravelRecords } = useTravelRecordsStore();

const travelDate = ref();
const selectedDeparture = ref<Place | null>(null);
const selectedDestination = ref<Place | null>(null);
const placeSuggestions = ref([] as Place[]);
const isSearchingDeparture = ref(false);
const isSearchingDestination = ref(false);
const selectedTransportType = ref({ name: 'Flight', code: 'flight' });

const departure = computed(() => selectedDeparture.value?.displayName || '');
const destination = computed(() => selectedDestination.value?.displayName || '');

const rules = computed(() => ({
  travelDate: {
    required: helpers.withMessage('This field is required.', required),
  },
  departure: {
    required: helpers.withMessage('This field is required.', required),
  },
  destination: {
    required: helpers.withMessage('This field is required.', required),
  },
}));

const v$ = useVuelidate(rules, { travelDate, departure, destination });

const searchPlace = async (event: { query: string }, field: 'departure' | 'destination') => {
  if (event.query) {
    // Set searching state based on field
    if (field === 'departure') {
      isSearchingDeparture.value = true;
    } else {
      isSearchingDestination.value = true;
    }
    const { data } = await LocationService.searchPlaces(event.query);
    // Set searching states to false after data is returned
    isSearchingDeparture.value = false;
    isSearchingDestination.value = false;
    placeSuggestions.value = data ?? [];
  } else {
    placeSuggestions.value = [];
    // Reset searching states when query is empty
    isSearchingDeparture.value = false;
    isSearchingDestination.value = false;
  }
};

const validateAndSubmit = async () => {
  const isFormCorrect = await v$.value.$validate();
  if (isFormCorrect) {
    createRecord();
  }
};

const { isPending: isCreatingRecord, mutate: createRecord } = useMutation({
  mutationFn: () => {
    if (!selectedDeparture.value || !selectedDestination.value) {
      throw new Error('Departure and destination must be selected');
    }

    const isoDateOnly = travelDate.value.toISOString().split('T')[0];
    const id =
      isoDateOnly +
      '#' +
      selectedDeparture.value?.displayName?.split(' ')[0] +
      '#' +
      selectedDestination.value?.displayName?.split(' ')[0];

    const transportType = TravelRecordSchema.shape.transportType.parse(
      selectedTransportType.value?.code,
    );

    const travelRecord = {
      id,
      travelDate: travelDate.value,
      departure: selectedDeparture.value,
      destination: selectedDestination.value,
      transportType,
    };
    return TravelRecordService.createTravelRecord(travelRecord);
  },
  onSuccess: async () => {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Travel record created.`,
      life: 3000,
    });
    await refetchTravelRecords();
    onReset();
  },
  onError: () => {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error while creating travel record. Please try again later.',
      life: 3000,
    });
  },
});

const onReset = () => {
  dialogStore.setDialogState('createTravelRecords', false);
  travelDate.value = '';
  selectedDeparture.value = null;
  selectedDestination.value = null;
};
</script>
