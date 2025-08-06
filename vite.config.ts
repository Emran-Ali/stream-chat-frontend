import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx(), vueDevTools(), tailwindcss()],

  server: {
    host: true,
    watch: {
      usePolling: true,
    },
    port: 3000,
    strictPort: true,
    allowedHosts: [
      'localhost',
      'pride-operations-ls-obj.trycloudflare.com',
      '.trycloudflare.com',
      '13.215.158.152', // Add your EC2 IP
    ],
  },

  // Add these for production deployment
  base: process.env.BASE_URL || '/',

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
