import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import pkg from './package.json';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'pwa-maskable-192x192.png',
        'pwa-maskable-512x512.png',
      ],
      manifest: {
        start_url: '/',
        short_name: 'Arurem',
        display: 'standalone',
        theme_color: '#FFD700',
        background_color: '#0a3d2e',
        description:
          'Arurem is a private ledger application built with React and ShadCN to securely track individual gold assets. It provides a clean, user-friendly interface to manage, record, and view gold holdings, ensuring privacy and data integrity while offering detailed transaction records and asset balances.',
        name: 'Arurem | Private Asset Ledger',
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
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
              cacheName: 'font-cache',
            },
          },
        ],
      },
    }),
  ],
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

    chunkSizeWarningLimit: 800,

    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|react-hook-form)[\\/]/,
            },

            {
              name: 'ui',
              test: /node_modules[\\/]@radix-ui[\\/]/,
            },

            {
              name: 'motion',
              test: /node_modules[\\/]motion[\\/]/,
            },

            {
              name: 'icons',
              test: /node_modules[\\/](lucide-react|@tabler[\\/]icons-react)[\\/]/,
            },

            {
              name: 'date-utils',
              test: /node_modules[\\/](date-fns|react-day-picker)[\\/]/,
            },

            {
              name: 'vendor',
              test: /node_modules/,
            },
          ],
        },
      },
    },
  },
});
