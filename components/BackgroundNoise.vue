<template>
  <img class="background-noise" src="/noise.jpg" alt="noise image">
</template>

<style scoped>
  .background-noise {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    mix-blend-mode: multiply;
  }
</style>