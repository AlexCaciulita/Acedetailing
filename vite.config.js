import { defineConfig } from 'vite'

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'public/index.html',
        servicii: 'public/servicii.html',
        configurator: 'public/configurator.html',
        rezervare: 'public/rezervare.html',
        contact: 'public/contact.html',
        faq: 'public/faq.html',
        politici: 'public/politici.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})