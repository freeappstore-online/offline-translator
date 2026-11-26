import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
// @ts-expect-error app-local JS build plugin
import { ocrRuntimePlugin } from './ocr-runtime-plugin.mjs'
// @ts-expect-error JS plugin loaded from Vite config
import { reviewDevPlugin } from './review-dev-plugin.mjs'

const webRoot = fileURLToPath(new URL('.', import.meta.url))
const trackedFiles = [
  ...readdirSync(new URL('./src/', import.meta.url), { recursive: true, withFileTypes: true })
    .filter(file => file.isFile())
    .map(file => file.parentPath.slice(webRoot.length) + '/' + file.name),
  'vite.config.ts', 'ocr-runtime-plugin.mjs', 'package.json', '../pnpm-lock.yaml',
].sort()

const fingerprint = createHash('sha256')
for (const file of trackedFiles) {
  fingerprint.update(file + '\0').update(readFileSync(new URL(file, import.meta.url))).update('\0')
}
const build = fingerprint.digest('hex').slice(0, 16)

export default defineConfig({
  define: { __TRANSLATOR_BUILD__: JSON.stringify(build) },
  resolve: { alias: { 'onnxruntime-web/webgpu': 'onnxruntime-web/wasm' } },
  worker: { format: 'es' },
  plugins: [
    reviewDevPlugin(),
    ocrRuntimePlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        globIgnores: ['ocr-runtime/**'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [{ urlPattern: /\/ocr-runtime\//, handler: 'CacheFirst', options: { cacheName: 'offline-translator-ocr-runtime-v1' } }, {
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
