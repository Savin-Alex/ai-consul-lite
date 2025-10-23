import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist/background',
    rollupOptions: {
      input: {
        'service-worker': resolve(__dirname, 'src/background/service-worker.js')
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife', // IIFE format for service worker
        name: 'ServiceWorker'
      }
    }
  }
})
