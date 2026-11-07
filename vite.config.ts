import { defineConfig } from 'vitest/config';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import pkg from './package.json';
import { VitePWA } from 'vite-plugin-pwa';

const isTest = process.env.VITEST === 'true';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    !isTest &&
      (VitePWA({
        injectRegister: 'auto',
        registerType: 'autoUpdate',
        includeAssets: [
          'icons/favicon.ico',
          'icons/apple-touch-icon.png',
          'icons/pwa-maskable-192x192.png',
          'icons/pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          start_url: '/',
          scope: '/',
          short_name: 'Arurem',
          name: 'Arurem | Private Gold Ledger',
          display: 'standalone',
          orientation: 'portrait-primary',
          // Matches --primary / --background so the splash screen does not
          // flash a colour that appears nowhere in the app.
          theme_color: '#0a3d2e',
          background_color: '#fbf9f4',
          description:
            'A private, offline-first ledger for tracking physical gold holdings by weight, purity, and vendor.',
          categories: ['finance', 'productivity'],
          icons: [
            { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: '/icons/pwa-maskable-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icons/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /\.(woff|woff2|ttf|otf)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'arurem-fonts-v1',
                expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }) as PluginOption),
  ].filter(Boolean) as PluginOption[],

  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  logLevel: 'info',
  optimizeDeps: { include: ['react', 'react-dom'] },

  build: {
    minify: 'oxc',
    target: 'esnext',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|react-hook-form|scheduler)[\\/]/,
            },
            { name: 'ui', test: /node_modules[\\/]radix-ui[\\/]/ },
            { name: 'motion', test: /node_modules[\\/]motion[\\/]/ },
            { name: 'icons', test: /node_modules[\\/]lucide-react[\\/]/ },
            { name: 'date-utils', test: /node_modules[\\/](date-fns|react-day-picker)[\\/]/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
