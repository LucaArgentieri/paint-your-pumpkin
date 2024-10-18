<script setup>
  defineProps(['modalIsOpen'])
  const color = defineModel('color')
  const size = defineModel('size')
</script>

<template>
  <Transition>
    <div v-if="modalIsOpen"
      class="tooltip text-[18px] absolute bottom-[40px] right-0 translate-x-full bg-[#f9f9f9] min-w-[50vw] md:min-w-[20vw] 2xl:min-w-[10vw] rounded-md p-s pb-l lg:pb-m flex flex-col gap-s shadow-2xl">
      <label class="flex flex-col w-fit" for="color">
        Color
        <input type="color" name="color" id="color" v-model="color" />
      </label>
      <label class="flex flex-col w-fit" for="size">
        Size: {{ size }}
        <input type="range" name="size" id="size" min="1" max="20" v-model="size">
      </label>
    </div>
  </Transition>
</template>

<style scoped>

  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.3s ease-out;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }

  .tooltip::after {
    content: " ";
    position: absolute;
    bottom: -20px;
    left: 10px;
    z-index: 5;
    margin-left: 0px;
    border-width: 10px;
    border-style: solid;
    border-color: #f9f9f9 transparent transparent transparent;
  }

  input[type='color'] {
    appearance: none;
    background-color: transparent;
    width: 40px;
    height: 40px;
    cursor: pointer;
  }

  input[type='color']::-webkit-color-swatch {
    border-radius: 0.375rem;
  }

  input[type='range'] {
    -webkit-appearance: none;
    margin-top: 5px;
    width: 100%;
    height: 5px;
    border-radius: 5px;
    background: black;
  }

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 25px;
    height: 25px;
    border: 0;
    background: url('/pumpkin.png');
    background-size: contain;
    background-repeat: no-repeat;
    cursor: pointer;
  }

</style>