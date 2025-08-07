import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const isProduction = mode === 'production'

  console.log(`Building in ${mode} mode, isProduction: ${isProduction}`)

  return {
    plugins: [
      vue(),
      vueJsx(),
      // CRITICAL: Only load devtools in development
      ...(isProduction ? [] : [vueDevTools()]),
      tailwindcss()
    ],

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
      sourcemap: false, // Disable source maps to speed up build
      minify: 'esbuild', // Use esbuild instead of terser (faster)
      target: 'esnext', // Modern target for faster build
      // Optimize rollup options
      rollupOptions: {
        output: {
          manualChunks: undefined, // Let Vite handle chunking automatically
        }
      },
      chunkSizeWarningLimit: 2000,
    },

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    // Optimize dependencies to prevent hanging
    optimizeDeps: {
      include: ['vue', 'vue-router'], // Pre-bundle common deps
      exclude: ['vite-plugin-vue-devtools'], // Exclude devtools from optimization
    },

    define: {
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_OPTIONS_API__: true
    }
  }
})
