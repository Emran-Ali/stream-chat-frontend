import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [
      vue(),
      vueJsx(),
      // CRITICAL: Disable devtools in production
      !isProduction && vueDevTools(),
      tailwindcss(),
    ].filter(Boolean),

    server: {
      host: true,
      watch: {
        usePolling: true,
      },
      port: 3000,
      strictPort: true,
      allowedHosts: ['localhost', '13.215.158.152'],
    },

    base: process.env.BASE_URL || '/',

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false, // Disable for faster build
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    define: {
      __VUE_PROD_DEVTOOLS__: false,
    },
  }
})
