import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(() => {
  const base = process.env.PAGES_BASE_PATH || '/'

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'og-image.svg', 'robots.txt', 'sitemap.xml'],
        manifest: {
          id: base,
          start_url: base,
          scope: base,
          name: 'utreker — трекер привычек и настроения',
          short_name: 'utreker',
          description: 'Бесплатный трекер привычек, настроения и энергии с аналитикой. Работает офлайн, без регистрации.',
          lang: 'ru',
          categories: ['productivity', 'lifestyle', 'health'],
          theme_color: '#0a0a0f',
          background_color: '#0a0a0f',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: 'icon.svg',
              sizes: 'any',
              type: 'image/svg+xml'
            }
          ],
          screenshots: [
            {
              src: 'og-image.svg',
              sizes: '1200x630',
              type: 'image/svg+xml',
              form_factor: 'wide',
              label: 'utreker — трекер привычек и настроения'
            }
          ],
          shortcuts: [
            {
              name: 'Записать день',
              short_name: 'Записать',
              description: 'Быстро отметить настроение, энергию и привычки',
              url: base,
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    preview: {
      allowedHosts: true as const
    },
    resolve: {
      alias: {
        '@': '/src'
      }
    }
  }
})
