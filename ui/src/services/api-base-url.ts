export const ApiBaseUrl =
  import.meta.env.MODE === 'MSW'
    ? '/api'
    : import.meta.env.DEV
      ? 'http://localhost:8787/api'
      : import.meta.env.VITE_WORKER_API_URL;
