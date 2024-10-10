<script setup>
  const modelLoader = ref(0)
</script>

<template>
  <main>
    <Loader :loader="modelLoader" />
    <BackgroundText />
    <BackgroundNoise />
    <ClientOnly>
      <Pumpkin v-model:loader="modelLoader" />
    </ClientOnly>
  </main>
</template>
