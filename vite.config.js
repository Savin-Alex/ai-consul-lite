import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import copy from 'rollup-plugin-copy'
import { unlinkSync, existsSync, readFileSync, writeFileSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    // Use the official copy plugin for proper file copying
    copy({
      targets: [
        { src: 'manifest.json', dest: 'dist' },
        { src: 'src/offscreen/offscreen.html', dest: 'dist' },
        { src: 'src/popup/popup.html', dest: 'dist/popup' },
        { src: 'src/options/options.html', dest: 'dist/options' },
        { src: 'src/assets/icons/*', dest: 'dist/assets/icons' },
        // Correctly copy the model directory recursively
        {
          src: 'src/assets/models/whisper-tiny.en',
          dest: 'dist/assets/models'
        }
      ],
      hook: 'writeBundle' // Run after Vite finishes building
    }),
    // Refined cleanup plugin
    {
      name: 'cleanup-chrome-files',
      // Use closeBundle hook which runs last
      closeBundle() {
        const helperFilePath = resolve(__dirname, 'dist/_commonjsHelpers.js')
        try {
          if (existsSync(helperFilePath)) {
            unlinkSync(helperFilePath)
            console.log('✅ Removed _commonjsHelpers.js')
          } else {
            console.log('ℹ️ _commonjsHelpers.js not found, skipping removal.')
          }
          
          // Also remove the import statement from built files
          const filesToClean = [
            'dist/popup/popup.js',
            'dist/options/options.js',
            'dist/ui/main.js',
            'dist/jsx-runtime.js',
            'dist/content/content.js',
            'dist/workers/whisper-worker.js'
          ]
          
          filesToClean.forEach(filePath => {
            if (existsSync(filePath)) {
              let content = readFileSync(filePath, 'utf8')
              // Remove the import statement for _commonjsHelpers.js
              content = content.replace(/import[^;]*_commonjsHelpers\.js[^;]*;/g, '')
              writeFileSync(filePath, content)
              console.log(`✅ Cleaned imports from ${filePath}`)
            }
          })
        } catch (err) {
          // Log error but don't fail the build if deletion fails
          console.error('⚠️ Error in cleanup:', err.message)
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'src/background/service-worker-simple.js'),
        'offscreen': resolve(__dirname, 'src/offscreen/offscreen.js'),
        'workers/whisper-worker': resolve(__dirname, 'src/workers/whisper-worker.js'),
        'content/content': resolve(__dirname, 'src/content/content.js'),
        'content/content-simple': resolve(__dirname, 'src/content/content-simple.js'),
        'content/content-debug': resolve(__dirname, 'src/content/content-debug.js'),
        'content/content-selector-discovery': resolve(__dirname, 'src/content/content-selector-discovery.js'),
        'content/content-whatsapp-test': resolve(__dirname, 'src/content/content-whatsapp-test.js'),
        'content/content-whatsapp-simple': resolve(__dirname, 'src/content/content-whatsapp-simple.js'),
        'popup/popup': resolve(__dirname, 'src/popup/popup-entry.jsx'),
        'options/options': resolve(__dirname, 'src/options/options-entry.jsx'),
        'ui/main': resolve(__dirname, 'src/ui/index.jsx')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        format: 'es',
        manualChunks: undefined
      }
    },
    // Increase chunk size warning limit for model files
    chunkSizeWarningLimit: 50000
  },
  define: {
    global: 'globalThis'
  }
})