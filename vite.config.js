import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const buildDate = new Date()
const buildStamp = 'v' +
  String(buildDate.getUTCMonth() + 1).padStart(2, '0') +
  String(buildDate.getUTCDate()).padStart(2, '0') + '.' +
  String(buildDate.getUTCHours()).padStart(2, '0') +
  String(buildDate.getUTCMinutes()).padStart(2, '0')

export default defineConfig({
  define: {
    __APP_BUILD__: JSON.stringify(buildStamp)
  },
  base: '/Stock-Trader-Helper/',
  server: {
    port: 5175,
    strictPort: true
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Stock Trader Helper',
        short_name: 'STH',
        description: 'Mirror politician trades intelligently',
        theme_color: '#0d0d0d',
        background_color: '#0d0d0d',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/Stock-Trader-Helper/',
        start_url: '/Stock-Trader-Helper/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /congressional-trades\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'politician-trades', expiration: { maxAgeSeconds: 3600 } }
          }
        ]
      }
    })
  ]
})
