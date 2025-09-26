import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173
    },
    watch: {
      usePolling: true,
      interval: 1000
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  }
})