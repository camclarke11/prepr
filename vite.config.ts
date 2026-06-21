/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// prepr is served from the root of its own domain (prepr.camlc.dev), so base is '/'.
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // Custom service worker (src/sw.ts) so we can handle push + notificationclick.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'prepr — shared grocery & meal planning',
        short_name: 'prepr',
        description:
          'A shared grocery list, recipe box, meal planner and pantry that works offline.',
        theme_color: '#3f7a4f',
        background_color: '#f1efe9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['food', 'lifestyle', 'productivity'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Maskable variants have safe-zone padding so Android's mask doesn't
          // crop the glyph (the full-bleed icons above are used for 'any').
          {
            src: 'maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // Under injectManifest, only the glob config is honoured — runtime caching
      // and the navigation fallback live in src/sw.ts instead.
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      devOptions: { enabled: true, type: 'module', navigateFallback: 'index.html' },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
