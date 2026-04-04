<template>
  <div class="flex min-h-[90vh] items-center justify-center">
    <Panel
      :pt="{
        header: {
          style: {
            justifyContent: 'center',
          },
        },
      }"
      class="w-[300px]"
      header="Header"
    >
      <template #header>
        <div class="text-2xl font-bold">{{ !userPermission?.uid ? 'Login' : 'Welcome' }}</div>
      </template>

      <template v-if="!userPermission?.uid">
        <div class="relative">
          <div
            id="google-login-button"
            :style="`opacity: ${loading ? 0.5 : 1}`"
            class="flex justify-center"
          ></div>
          <div v-if="loading" class="absolute top-0 right-0 h-full w-full cursor-not-allowed" />
          <ProgressSpinner v-if="loading" class="login-loading-spinner" fill="transparent" />
        </div>
      </template>
      <p v-else class="flex justify-center">
        {{ userPermission?.displayName }}
      </p>
    </Panel>
  </div>
  <Toast position="bottom-center" />
</template>

<script lang="ts" setup>
import { AuthService } from '@/services/auth-service';
import { useUserConfigStore } from '@/stores';
import { storeToRefs } from 'pinia';
import { Panel, ProgressSpinner, Toast } from 'primevue';
import { useToast } from 'primevue/usetoast';
import { isEmpty } from 'radash';
import { onMounted, ref } from 'vue';

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
  client_id: string;
  state?: string; // Add state to the response type
}

interface GoogleIdentityServices {
  initialize(config: {
    client_id: string;
    callback?: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: string;
    use_fedcm_for_prompt?: boolean;
    state?: string; // Add state to initialization
  }): void;

  renderButton(
    element: HTMLElement | null,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: string;
      locale?: string;
      state?: string;
    },
  ): void;

  prompt(): void;
}

interface GoogleIdentity {
  id: GoogleIdentityServices;
}

declare global {
  interface Window {
    google: {
      accounts: GoogleIdentity;
    };
  }

  const google: {
    accounts: GoogleIdentity;
  };
}

const toast = useToast();
const loading = ref(false);
const csrfState = ref<string>('');

const userConfigStore = useUserConfigStore();
const { setUserPermission } = userConfigStore;
const { userPermission } = storeToRefs(userConfigStore);

onMounted(async () => {
  if (!window.google) {
    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
    localStorage.clear();

    try {
      loading.value = true;
      const { data: userPermission } = await AuthService.login(
        response.credential,
        csrfState.value,
      );

      if (!isEmpty(userPermission) && userPermission !== undefined) {
        setUserPermission(userPermission);
        toast.add({
          severity: 'success',
          summary: 'Welcome',
          detail: `Hello, ${userPermission.displayName}`,
          life: 3000,
        });
        setTimeout(() => window.location.assign('/'), 1000);
      } else {
        toast.add({
          severity: 'error',
          summary: 'Permission denied',
          detail: "You don't have permission to login.",
          life: 3000,
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Permission denied',
        detail: "You don't have permission to login.",
        life: 3000,
      });
    } finally {
      loading.value = false;
    }
  };

  if (window.google) {
    // Generate and store CSRF state
    const { state } = await AuthService.generateCsrfState();
    csrfState.value = state;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
      callback: handleCredentialResponse,
      state: csrfState.value,
    });

    window.google.accounts.id.renderButton(document.getElementById('google-login-button'), {
      theme: 'outline',
      size: 'large',
      width: '240',
      state: csrfState.value,
    });
  }
});
</script>
<style scoped>
.login-loading-spinner {
  position: absolute;
  top: 2px;
  left: 43%;
  width: 2.5rem;
  height: 2.5rem;
}
</style>
