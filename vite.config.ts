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
      // IMPORTANT: Only enable devtools in development
      !isProduction && vueDevTools(),
      tailwindcss(),
    ].filter(Boolean), // Remove falsy plugins

    server: {
      host: true,
      watch: {
        usePolling: true,
      },
      port: 3000,
      strictPort: true,
      allowedHosts: ['localhost', '13.215.158.152'],
    },

    // Base URL from environment
    base: process.env.BASE_URL || '/',

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // Disable source maps in production for faster build
      sourcemap: false,
      // Optimize build performance
      rollupOptions: {
        output: {
          // Split chunks for better caching
          manualChunks: {
            vendor: ['vue'],
            router: ['vue-router'],
          },
        },
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // Enable minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    // Define environment variables
    define: {
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_OPTIONS_API__: true,
    },
  }
})
