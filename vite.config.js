import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Stock-Trader-Helper/',
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api/hsw': {
        target: 'https://house-stock-watcher-data.s3-us-east-2.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hsw/, '/data')
      }
    }
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Stock Trader Helper',
        short_name: 'TraderHelper',
        description: 'Mirror politician trades intelligently',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/Stock-Trader-Helper/',
        start_url: '/Stock-Trader-Helper/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/house-stock-watcher-data/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'politician-trades', expiration: { maxAgeSeconds: 3600 } }
          }
        ]
      }
    })
  ]
})
