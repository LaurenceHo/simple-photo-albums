<template>
  <div class="flex min-h-[90vh] flex-col items-center justify-center">
    <h1 class="text-[30vh] font-bold">404</h1>

    <h2 class="text-lg text-slate-400">Oops. Nothing here...</h2>

    <Button as="router-link" class="mt-8" label="Go Home" to="/" />
  </div>
</template>
<script lang="ts" setup>
import Button from 'primevue/button';
</script>
