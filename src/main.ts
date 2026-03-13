import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';
import { VueQueryPlugin } from '@tanstack/vue-query';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import Tooltip from 'primevue/tooltip';
import { createApp } from 'vue';
import App from './App.vue';
import './assets/primevue-override.css';
import router from './router';

declare global {
  var dataLayer: any[];
  var gtag: ((...args: any[]) => void) | undefined;
}

const prepareApp = async () => {
  const { worker } = await import('./mocks/browser');
  return worker.start({
    onUnhandledRequest: (request, print) => {
      const ignoredUrls = [
        'chrome-extension://',
        'https://fonts.gstatic.com',
        'https://api.mapbox.com',
        'https://events.mapbox.com',
      ];

      // Check if the request URL starts with any of the ignored URLs
      if (ignoredUrls.some((url) => request.url.startsWith(url))) {
        return;
      }

      print.warning();
    },
  });
};

const pinia = createPinia();
const app = createApp(App);

const myThemePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{sky.50}',
      100: '{sky.100}',
      200: '{sky.200}',
      300: '{sky.300}',
      400: '{sky.400}',
      500: '{sky.500}',
      600: '{sky.600}',
      700: '{sky.700}',
      800: '{sky.800}',
      900: '{sky.900}',
      950: '{sky.950}',
    },
  },
});

app.use(PrimeVue, {
  theme: {
    preset: myThemePreset,
    options: {
      darkModeSelector: '.dark',
      cssLayer: {
        name: 'primevue',
        order: 'theme, base, primevue',
      },
    },
  },
});
app.use(router);
app.use(VueQueryPlugin);
app.use(pinia);
app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);

if (import.meta.env.MODE === 'MSW') {
  prepareApp().then(() => {
    app.mount('#app');
  });
} else {
  app.mount('#app');
}

const gtagId = import.meta.env.VITE_GTAG_ID;
if (gtagId) {
  globalThis.dataLayer = globalThis.dataLayer || [];

  function gtag(...args: any[]) {
    globalThis.dataLayer.push({ event: args[0], ...(args.length > 1 ? args[1] : {}) });
  }

  globalThis.gtag = gtag;

  gtag('js', new Date());
  gtag('config', gtagId);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gtagId}`;
  document.head.appendChild(script);
} else {
  console.warn('VITE_GTAG_ID is not defined');
}

router.afterEach((to) => {
  if (globalThis.gtag) {
    globalThis.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: globalThis.location.href,
      page_path: to.fullPath,
    });
  }
});
