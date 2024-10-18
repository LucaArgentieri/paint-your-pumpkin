export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/seo', '@vueuse/nuxt'],
  tailwindcss: {
    viewer: false
  },
  site: {
    url: 'https://paint-your-pumpkin.netlify.app/',
    title: 'Paint your pumpkin 🎃',
    description: 'Paint your pumpkin experiment, model generated with ia',
  },
  app: {
    head: {
      titleTemplate: '%s',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [
        {
          name: "image",
          content: "/og-image.png",
        },
        {
          hid: "twitter:image",
          name: "twitter:image",
          content: "/og-image.png",
        },
        {
          hid: "og:image",
          property: "og:image",
          content: "/og-image.png",
        },
        {
          hid: "og:image:secure_url",
          property: "og:image:secure_url",
          content: "/og-image.png",
        },
        {
          hid: "og:image:alt",
          property: "og:image:alt",
          content: "Paint your pumpkin with a decorate pumpkin",
        },
      ],
    }
  }
})
