<template>
  <Dialog
    v-model:visible="dialogStates.updateAlbum"
    :breakpoints="{ '960px': '75vw', '641px': '90vw' }"
    :closable="false"
    class="w-[450px]"
    modal
  >
    <template #header>
      <span class="text-lg font-semibold" data-test-id="dialog-title">
        {{ albumToBeUpdate.id ? 'Edit' : 'New' }} Album
      </span>
    </template>

    <form @reset.prevent="resetAlbum" @submit.prevent="validateAndSubmit">
      <div class="mb-4">
        <div class="mb-4 flex items-center pb-4">
          Private album
          <ToggleSwitch v-model="privateAlbum" :disable="isCreatingAlbum" class="ml-2" />
        </div>

        <div class="mb-4 pb-4">
          <FloatLabel>
            <Select
              v-model="selectedYear"
              :disabled="albumToBeUpdate.id !== ''"
              :invalid="v$.selectedYear.$invalid"
              :options="yearOptions"
              class="w-full"
              data-test-id="select-album-year"
              input-id="select-year"
            />
            <label for="select-year">Select Year</label>
          </FloatLabel>
          <small v-if="v$.selectedYear.$invalid" class="p-error">Year is required</small>
        </div>

        <div class="mb-4 pb-4">
          <FloatLabel>
            <InputText
              v-model="albumId"
              :disabled="albumToBeUpdate.id !== '' || isCreatingAlbum"
              :invalid="v$.albumId.$invalid"
              class="w-full"
              data-test-id="input-album-id"
              input-id="album-id"
            />
            <label for="album-id">Album ID</label>
          </FloatLabel>
          <small v-if="v$.albumId.$invalid" class="text-red-600">
            {{ v$.albumId.$silentErrors[0]?.$message }}
          </small>
          <div class="mt-1 flex items-center justify-between text-gray-500">
            <small v-if="!albumToBeUpdate.id">
              Once album is created, album id cannot be changed.
            </small>
            <small class="ml-auto">{{ albumId.length }}/30</small>
          </div>
        </div>

        <div class="mb-4 pb-4">
          <FloatLabel>
            <InputText
              v-model="albumName"
              :disabled="isCreatingAlbum"
              :invalid="v$.albumName.$invalid"
              class="w-full"
              data-test-id="input-album-name"
              input-id="album-name"
            />
            <label for="album-name">Album Name</label>
          </FloatLabel>
          <div class="mt-1 flex items-center justify-between text-gray-500">
            <small v-if="v$.albumName.$invalid" class="text-red-600">
              {{ v$.albumName.$silentErrors[0]?.$message }}
            </small>
            <small class="ml-auto">{{ albumName.length }}/50</small>
          </div>
        </div>

        <div class="mb-4 pb-4">
          <FloatLabel>
            <Textarea
              v-model="albumDesc"
              :disabled="isCreatingAlbum"
              :rows="3"
              class="w-full"
              data-test-id="input-album-desc"
              input-id="album-desc"
            />
            <label for="album-desc">Album Description</label>
          </FloatLabel>
          <div class="mt-1 flex items-center justify-between text-gray-500">
            <small v-if="v$.albumDesc.$invalid" class="text-red-600">
              {{ v$.albumDesc.$silentErrors[0]?.$message }}
            </small>
            <small class="ml-auto">{{ albumDesc.length }}/200</small>
          </div>
        </div>

        <div class="mb-4 flex gap-2">
          <FloatLabel class="w-full flex-grow">
            <SelectTags
              :selected-tags="selectedAlbumTags"
              extra-class="w-full"
              @select-tags="setSelectedTags"
            />
            <label for="select-tags">Album Tag</label>
          </FloatLabel>

          <Button
            data-test-id="create-tag-button"
            severity="secondary"
            text
            @click="dialogStore.setDialogState('createAlbumTag', true)"
          >
            <IconPlus :size="24" />
          </Button>
        </div>

        <div class="mb-4 pb-4">
          <div class="flex items-center">
            Featured album
            <ToggleSwitch
              v-model="featuredAlbum"
              :disabled="isCreatingAlbum || privateAlbum"
              class="ml-2"
            />
          </div>
          <small v-if="privateAlbum" class="text-gray-500">
            Cannot be featured album if album is private.
          </small>
        </div>

        <div class="mb-4">
          <FloatLabel>
            <AutoComplete
              v-model="selectedPlace"
              :disabled="isCreatingAlbum"
              :loading="isSearching"
              :suggestions="placeSuggestions"
              class="w-full"
              input-class="w-full"
              input-id="album-location"
              option-label="displayName"
              @complete="searchPlace"
            >
              <template #option="{ option }">
                <div class="flex flex-col">
                  <span class="font-bold">{{ option.displayName }}</span>
                  <span class="text-sm text-gray-600">{{ option.formattedAddress }}</span>
                </div>
              </template>
              <template #empty>
                <div class="text-gray-500 italic">No suggestion found</div>
              </template>
            </AutoComplete>
            <label for="album-location">Album Location</label>
          </FloatLabel>
        </div>

        <div v-if="selectedPlace && locationLatitude !== 0 && locationLongitude !== 0" class="mt-4">
          <PhotoLocationMap :latitude="locationLatitude" :longitude="locationLongitude" />
        </div>
      </div>

      <div class="flex justify-end">
        <Button
          :disabled="isCreatingAlbum"
          class="mr-2"
          data-test-id="cancel-button"
          label="Cancel"
          text
          @click="resetAlbum"
        />
        <Button
          :disabled="v$.$invalid"
          :label="albumToBeUpdate.id ? 'Update' : 'Create'"
          :loading="isCreatingAlbum"
          autofocus
          data-test-id="submit-album-button"
          type="submit"
        />
      </div>
    </form>
  </Dialog>
</template>

<script lang="ts" setup>
import PhotoLocationMap from '@/components/PhotoLocationMap.vue';
import SelectTags from '@/components/select/SelectTags.vue';
import type { Album, Place } from '@/schema';
import { AlbumService } from '@/services/album-service';
import { AlbumTagService } from '@/services/album-tag-service';
import { LocationService } from '@/services/location-service';
import { useAlbumStore, useAlbumTagsStore, useDialogStore } from '@/stores';
import { initialAlbum } from '@/stores/album';
import { getYearOptions } from '@/utils/helper';
import { IconPlus } from '@tabler/icons-vue';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { useVuelidate } from '@vuelidate/core';
import { helpers, maxLength, minLength, required } from '@vuelidate/validators';
import { storeToRefs } from 'pinia';
import {
  AutoComplete,
  Button,
  Dialog,
  FloatLabel,
  InputText,
  Select,
  Textarea,
  ToggleSwitch,
} from 'primevue';
import { useToast } from 'primevue/usetoast';
import { isEmpty } from 'radash';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const toast = useToast();
const router = useRouter();
const queryClient = useQueryClient();

const dialogStore = useDialogStore();
const albumTagsStore = useAlbumTagsStore();
const albumStore = useAlbumStore();

const { setAlbumToBeUpdated } = albumStore;
const { dialogStates } = storeToRefs(dialogStore);
const { albumToBeUpdate } = storeToRefs(albumStore);
const { data: albumTags } = storeToRefs(albumTagsStore);

const selectedYear = ref(String(new Date().getFullYear()));
const albumId = ref('');
const albumName = ref('');
const albumDesc = ref('');
const privateAlbum = ref(false);
const featuredAlbum = ref<boolean | undefined>(undefined);
const selectedAlbumTags = ref<string[]>([]);
const selectedPlace = ref<Place | null>(null);
const placeSuggestions = ref<Place[]>([]);
const isSearching = ref(false);

const storedTagsStringArray = computed(() =>
  albumTags.value ? albumTags.value.map((tag) => tag.tag) : [],
);
const locationLatitude = computed(() => selectedPlace.value?.location?.latitude || 0);
const locationLongitude = computed(() => selectedPlace.value?.location?.longitude || 0);

// Validation rules
const rules = computed(() => ({
  selectedYear: { required },
  albumId: {
    required: helpers.withMessage('This field is required.', required),
    minLength: helpers.withMessage('It must be at least 2 characters long', minLength(2)),
    maxLength: helpers.withMessage('It cannot exceed 30 characters', maxLength(30)),
    validName: helpers.withMessage(
      'Only lowercase alphanumeric, underscore and dash are allowed',
      (value: string) => /^[a-z0-9-_]*$/.test(value),
    ),
  },
  albumName: {
    required: helpers.withMessage('This field is required.', required),
    minLength: helpers.withMessage('It must be at least 2 characters long', minLength(2)),
    maxLength: helpers.withMessage('It cannot exceed 50 characters', maxLength(50)),
  },
  albumDesc: {
    maxLength: helpers.withMessage('It cannot exceed 200 characters', maxLength(200)),
  },
}));

const v$ = useVuelidate(rules, { selectedYear, albumId, albumName, albumDesc });

const setSelectedTags = (tags: string[]) => {
  selectedAlbumTags.value = tags;
};

const searchPlace = async (event: { query: string }) => {
  if (event.query) {
    isSearching.value = true;
    const { data } = await LocationService.searchPlaces(event.query);
    placeSuggestions.value = data ?? [];
    isSearching.value = false;
  } else {
    placeSuggestions.value = [];
  }
};

const validateAndSubmit = async () => {
  const isFormCorrect = await v$.value.$validate();
  if (isFormCorrect) {
    createAlbum();
  }
};

const { isPending: isCreatingAlbum, mutate: createAlbum } = useMutation({
  mutationFn: async () => {
    // Remove duplicate tags
    if (!isEmpty(selectedAlbumTags.value)) {
      const tagSet = new Set(selectedAlbumTags.value);
      selectedAlbumTags.value = Array.from(tagSet);
    } else {
      selectedAlbumTags.value = [];
    }

    // Create tag
    if (!isEmpty(selectedAlbumTags.value)) {
      const findNewTags = selectedAlbumTags.value.filter(
        (tag) => !storedTagsStringArray.value.includes(tag),
      );
      if (findNewTags.length > 0) {
        await AlbumTagService.createAlbumTags(findNewTags.map((tag) => ({ tag })));
      }
    }

    const albumToBeUpdated: Album = {
      year: selectedYear.value,
      id: albumToBeUpdate.value.id || albumId.value,
      albumCover: albumToBeUpdate.value.albumCover || '',
      albumName: albumName.value,
      description: albumDesc.value,
      isPrivate: privateAlbum.value,
      isFeatured: featuredAlbum.value ?? undefined,
      place: selectedPlace.value,
      tags: selectedAlbumTags.value,
    };

    let result;
    if (albumToBeUpdate.value.id) {
      result = await AlbumService.updateAlbum(albumToBeUpdated);
    } else {
      result = await AlbumService.createAlbum(albumToBeUpdated);
    }

    return { result, album: albumToBeUpdated };
  },
  onSuccess: async ({ result, album }) => {
    if (result.code === 200) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: `Album "${album.albumName}" ${albumToBeUpdate.value.id ? 'updated' : 'created'}.`,
        life: 3000,
      });

      setTimeout(async () => {
        resetAlbum();
        if (router.currentRoute.value.params.year === album.year) {
          await queryClient.invalidateQueries({ queryKey: ['countAlbumsByYear', 'fetchAlbumsByYears', album.year] });
        } else {
          await router.push({ name: 'albumsByYear', params: { year: album.year } });
        }
      }, 2000);
    }
  },
  onError: () => {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error while creating/updating album. Please try again later.',
      life: 3000,
    });
  },
});

const resetAlbum = () => {
  selectedPlace.value = null;
  setAlbumToBeUpdated(initialAlbum);
  dialogStore.setDialogState('updateAlbum', false);
};

const yearOptions = getYearOptions();

watch(
  () => dialogStates.value.updateAlbum,
  (newValue) => {
    if (newValue) {
      selectedYear.value = albumToBeUpdate.value.year || String(new Date().getFullYear());
      albumId.value = albumToBeUpdate.value.id;
      albumName.value = albumToBeUpdate.value.albumName;
      albumDesc.value = albumToBeUpdate.value.description || '';
      privateAlbum.value = albumToBeUpdate.value.isPrivate;
      featuredAlbum.value = albumToBeUpdate.value.isFeatured || undefined;
      selectedAlbumTags.value = albumToBeUpdate.value.tags || [];
      selectedPlace.value = albumToBeUpdate.value.place || null;
    }
  },
  { deep: true, immediate: true },
);

// If it's private album, it cannot be featured album
watch(privateAlbum, (newValue) => {
  if (newValue) {
    featuredAlbum.value = false;
  }
});
</script>
