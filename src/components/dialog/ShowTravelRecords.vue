<template>
  <Dialog
    v-model:visible="dialogStates.showTravelRecords"
    :breakpoints="{ '960px': '75vw', '641px': '90vw' }"
    :closable="false"
    modal
  >
    <template #header>
      <div class="flex items-center">
        <Button
          data-test-id="create-travel-record-button"
          severity="secondary"
          text
          @click="dialogStore.setDialogState('createTravelRecords', true)"
        >
          <IconPlus :size="24" />
        </Button>
        <span class="ml-2 text-lg font-semibold">Travel Records</span>
      </div>
    </template>
    <div class="max-h-[50vh] overflow-y-auto">
      <DataTable
        :rows="10"
        :rowsPerPageOptions="[10, 20, 50]"
        :sortOrder="-1"
        :value="travelRecords"
        paginator
        sortField="travelDate"
        tableStyle="min-width: 20rem"
      >
        <template #empty> No travel records found.</template>

        <Column :sortable="true" field="travelDate" header="Date">
          <template #body="{ data }">
            {{ data.travelDate ? new Date(data.travelDate).toLocaleDateString() : '--' }}
          </template>
        </Column>
        <Column :sortable="true" field="departure" header="Departure">
          <template #body="{ data }">
            {{ data.departure.displayName }}
          </template>
        </Column>
        <Column :sortable="true" field="destination" header="Destination">
          <template #body="{ data }">
            {{ data.destination.displayName }}
          </template>
        </Column>
        <Column :sortable="true" field="transportType" header="Transport Type">
          <template #body="{ data }">
            {{ data.transportType ? data.transportType : 'flight' }}
          </template>
        </Column>
        <Column field="manage" header="Manage">
          <template #body="{ data }">
            <Button
              :data-test-id="`delete-record-button-${data.id}`"
              severity="secondary"
              text
              @click="confirmDelete(data)"
            >
              <IconTrash :size="24" />
            </Button>
          </template>
        </Column>
      </DataTable>
    </div>
    <template #footer>
      <Button label="Close" text @click="dialogStore.setDialogState('showTravelRecords', false)" />
    </template>
  </Dialog>
  <ConfirmDialog>
    <template #message="slotProps">
      <div class="flex items-center">
        <IconAlertCircle :size="40" class="flex-shrink-0 pr-2 text-red-400" />
        <span class="text-lg font-semibold" data-test-id="confirm-delete-album-dialog-title">
          {{ slotProps.message.message }} {{ selectedRecord?.travelDate ? new Date(selectedRecord.travelDate).toLocaleDateString() : '--' }} fly from
          "{{ selectedRecord?.departure?.displayName }}" to "{{ selectedRecord?.destination?.displayName }}"?
        </span>
      </div>
    </template>
  </ConfirmDialog>
</template>

<script lang="ts" setup>
import type { TravelRecord } from '@/schema/travel-record';
import { TravelRecordService } from '@/services/travel-record-service';
import { useDialogStore, useTravelRecordsStore } from '@/stores';
import { IconAlertCircle, IconPlus, IconTrash } from '@tabler/icons-vue';
import { useMutation } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { Button, Column, ConfirmDialog, DataTable, Dialog, useConfirm, useToast } from 'primevue';
import { ref } from 'vue';

const confirm = useConfirm();
const toast = useToast();
const dialogStore = useDialogStore();
const { dialogStates } = storeToRefs(dialogStore);

const travelRecordsStore = useTravelRecordsStore();
const { travelRecords } = storeToRefs(travelRecordsStore);
const selectedRecord = ref<TravelRecord | null>(null);
const selectedRecordId = ref<string>('');

const confirmDelete = (record: TravelRecord) => {
  selectedRecord.value = record;
  selectedRecordId.value = record.id;

  confirm.require({
    message: 'Do you want to delete record on ',
    header: 'Confirmation',
    rejectProps: {
      label: 'Cancel',
      text: true,
    },
    acceptProps: {
      label: 'Confirm',
    },
    accept: () => {
      deleteRecord();
    },
    reject: () => {
      reset();
    },
  });
};

const { mutate: deleteRecord, reset } = useMutation({
  mutationFn: async () => await TravelRecordService.deleteTravelRecord(selectedRecordId.value),
  onSuccess: async () => {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Record "${selectedRecord.value?.id}" deleted.`,
      life: 3000,
    });
    await travelRecordsStore.refetchTravelRecords();
    selectedRecord.value = null;
  },
  onError: () => {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error while deleting record. Please try again later.',
      life: 3000,
    });
  },
});
</script>
