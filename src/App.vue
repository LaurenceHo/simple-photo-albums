<template>
  <Toolbar
    class="border-surface-100 dark:border-surface-800 sticky top-0 z-50 rounded-none max-[768px]:p-1.5"
  >
    <template #start>
      <router-link class="flex items-center" to="/">
        <img
          :height="isMediumDevice ? '48' : '36'"
          :width="isMediumDevice ? '48' : '36'"
          alt="Website logo"
          class="logo"
          src="/logo.png"
        />
        <h1 class="hidden text-2xl font-bold sm:block">{{ appName }}</h1>
      </router-link>
    </template>

    <template #center>
      <IconField v-if="routeName === 'albumsByYear'" class="right-0 md:hidden">
        <InputIcon>
          <IconSearch :size="20" />
        </InputIcon>
        <InputText v-model="searchKey" placeholder="Search" />
      </IconField>
    </template>

    <template #end>
      <IconField v-if="routeName === 'albumsByYear'" class="hidden md:block">
        <InputIcon>
          <IconSearch :size="20" />
        </InputIcon>
        <InputText v-model="searchKey" placeholder="Search" />
      </IconField>
      <template v-if="routeName !== 'login'">
        <Button
          :severity="
            routeName === 'albumsByYear' || routeName === 'photosByAlbum' ? 'primary' : 'secondary'
          "
          as="router-link"
          label="Photos"
          text
          to="/albums"
        >
          <template #icon>
            <IconLibraryPhoto :size="24" />
          </template>
        </Button>
        <Button
          :severity="routeName === 'albumMap' ? 'primary' : 'secondary'"
          as="router-link"
          label="Map"
          text
          to="/map/albums"
        >
          <template #icon>
            <IconMap2 :size="24" />
          </template>
        </Button>
      </template>
      <Button severity="secondary" text @click="toggleDarkMode">
        <template #icon>
          <template v-if="darkMode">
            <IconSun :size="24" />
          </template>
          <template v-else>
            <IconMoonStars :size="24" />
          </template>
        </template>
      </Button>
      <Button
        v-if="userPermission?.uid && routeName !== 'login'"
        :label="userPermission.displayName"
        aria-controls="overlay_menu"
        aria-haspopup="true"
        severity="secondary"
        text
        type="button"
        @click="toggle"
      >
        <template #icon>
          <IconUser :size="24" />
        </template>
      </Button>
      <Menu id="overlay_menu" ref="menu" :model="items" :popup="true">
        <template #item="{ item }">
          <button class="flex cursor-pointer items-center p-2">
            <component :is="item.icon" :size="24" />
            <span class="ml-2">{{ item.label }}</span>
          </button>
        </template>
      </Menu>
    </template>
  </Toolbar>
  <div v-if="isFetching" class="flex min-h-[90vh] items-center justify-center">
    <ProgressSpinner />
  </div>
  <template v-else>
    <router-view />
  </template>
  <Toast position="bottom-center" />
</template>
<script lang="ts" setup>
import { useDevice } from '@/composables';
import { AuthService } from '@/services/auth-service';
import { useAlbumStore, useDialogStore, useUserConfigStore } from '@/stores';
import { DARK_MODE_ENABLED } from '@/utils/local-storage-key';
import {
  IconFolderPlus,
  IconLibraryPhoto,
  IconLogout,
  IconMap2,
  IconMapPins,
  IconMoonStars,
  IconSearch,
  IconSun,
  IconTags,
  IconUser,
} from '@tabler/icons-vue';
import { storeToRefs } from 'pinia';
import {
  Button,
  IconField,
  InputIcon,
  InputText,
  Menu,
  ProgressSpinner,
  Toast,
  Toolbar,
} from 'primevue';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const routeName = computed(() => route.name);

const albumStore = useAlbumStore();
const userConfigStore = useUserConfigStore();
const dialogStore = useDialogStore();
const { setDarkMode, setEnabled } = userConfigStore;
const { isFetching, userPermission, darkMode } = storeToRefs(userConfigStore);
const { filterState } = storeToRefs(albumStore);

const { isMediumDevice } = useDevice();

const appName = import.meta.env.VITE_ALBUM_APP_TITLE;
const title = document.getElementsByTagName('title')?.[0];
if (title) {
  title.innerHTML = appName;
}

const items = [
  {
    label: 'New Album',
    icon: IconFolderPlus as unknown as string,
    visible: () => routeName.value === 'albumsByYear',
    command: () => dialogStore.setDialogState('updateAlbum', true),
  },
  {
    label: 'Manage Album Tags',
    icon: IconTags as unknown as string,
    visible: () => routeName.value === 'albumsByYear',
    command: () => dialogStore.setDialogState('showAlbumTags', true),
  },
  {
    label: 'Manage Travel Records',
    icon: IconMapPins as unknown as string,
    visible: () => routeName.value === 'albumMap',
    command: () => dialogStore.setDialogState('showTravelRecords', true),
  },
  {
    label: 'Logout',
    icon: IconLogout as unknown as string,
    command: () =>
      AuthService.logout().then(() => {
        localStorage.clear();
        location.reload();
      }),
  },
];

const menu = ref();

onMounted(() => {
  setEnabled(true);
});

const searchKey = computed({
  get: () => filterState.value.searchKey,
  set: (value: string) => albumStore.setSearchKey(value),
});

const toggle = (event: MouseEvent) => {
  menu.value.toggle(event);
};

const toggleDarkMode = () => {
  const element = document.querySelector('html');
  if (element) {
    element.classList.toggle('dark');
  }
  setDarkMode(!darkMode.value);
};

const isDarkModeEnabled = () => {
  const storedDarkMode = localStorage.getItem(DARK_MODE_ENABLED);

  if (storedDarkMode !== null) {
    return setDarkModeAndAddClass(storedDarkMode === 'true');
  }

  if (typeof window !== 'undefined' && window.matchMedia) {
    return setDarkModeAndAddClass(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  throw new Error('matchMedia is not supported');
};

const setDarkModeAndAddClass = (isDarkMode: boolean) => {
  if (isDarkMode) {
    document.querySelector('html')?.classList.add('dark');
  }
  setDarkMode(isDarkMode);
  return isDarkMode;
};

isDarkModeEnabled();
</script>
