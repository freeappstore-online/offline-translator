import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: { alias: { 'onnxruntime-web/webgpu': 'onnxruntime-web/wasm' } },
  worker: { format: 'es' },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [{
          urlPattern: /\/assets\/ort-wasm-[^/]+\.wasm$/,
          handler: 'CacheFirst',
          options: { cacheName: 'offline-translator-wasm', expiration: { maxEntries: 2 } },
        }, {
          urlPattern: /^https:\/\/fonts\.googleapis\.com/,
          handler: 'CacheFirst',
          options: { cacheName: 'offline-translator-font-css' },
        }, {
          urlPattern: /^https:\/\/fonts\.gstatic\.com/,
          handler: 'CacheFirst',
          options: { cacheName: 'offline-translator-fonts' },
        }],
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: { host: '127.0.0.1' },
})
