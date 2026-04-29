import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Cache the app shell + the puzzle bundle
      includeAssets: ['puzzles.json'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,json}'],
        runtimeCaching: [
          {
            // Lichess API: network-first (use cache only when offline)
            urlPattern: /^https:\/\/lichess\.org\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'lichess-api',
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'PuzzleDog',
        short_name: 'PuzzleDog',
        description: 'Chess puzzle trainer — works offline',
        theme_color: '#1a1a1a',
        background_color: '#111111',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
