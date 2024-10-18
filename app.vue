<script setup>
  const modelLoader = ref(0)

  onMounted(() => {
    window.addEventListener('blur', (e) => {
      useHead({
        title: 'BHOOO 👻',
      })
    })

    window.addEventListener('focus', (e) => {
      useHead({
        title: 'Paint your pumpkin 🎃',
      })
    })
  })

  useHead({
    title: 'Paint your pumpkin 🎃',
  })
</script>

<template>
  <main>
    <Loader :loader="modelLoader" />
    <ClientOnly>
      <Pumpkin v-model:loader="modelLoader" />
    </ClientOnly>
  </main>
</template>

<style>
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  @layer base {
    :root {
      --sides: 20px;
      --h1: 25px;
      --margin-s: 10px;
      --margin-m: 10px;
      --margin-l: 20px;

      @screen lg {
        --h1: 40px;
        --margin-s: 10px;
        --margin-m: 20px;
        --margin-l: 60px;
      }
    }

    @font-face {
      font-family: "Basteleur-Bold";
      src: url("/fonts/Basteleur-Bold.woff2");
    }

    body {
      font-family: "Basteleur-Bold", sans-serif;
      overflow: hidden;
      overscroll-behavior: none;
    }

    img,
    video,
    svg {
      pointer-events: none;
      user-select: none;
    }

    *::-webkit-scrollbar {
      width: 0;
    }

    /* ::selection {
      color: var(--color-primary);
      background: var(--color-accent);
    } */
  }
</style>