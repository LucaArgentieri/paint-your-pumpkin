export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/seo'],
  tailwindcss: {
    viewer: false
  },
  site: {
    url: 'https://nuxt.com/',
    name: 'Paint your pumpkin',
    description: 'Paint your pumpkin experiment, model generated with ia',
  },
  seo: {
    fallbackTitle: false
  },
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  }
})