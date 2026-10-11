import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { localApi } from './server/dev-api.js';
import { loadLocalEnvironment } from './server/local-environment.js';

export default defineConfig(({ mode }) => ({
  plugins: [localApi(loadLocalEnvironment(mode, process.cwd())), react(), VitePWA({
    strategies: 'injectManifest', srcDir: 'src', filename: 'sw.js',
    registerType: 'prompt', injectRegister: false,
    includeAssets: ['icon.svg', 'apple-touch-icon.png', 'finn.png'],
    manifest: {
      name: 'Daymargin', short_name: 'Daymargin', description: 'Your daily organizer.',
      theme_color: '#315a48', background_color: '#f5f4ef', display: 'standalone',
      start_url: '/', scope: '/', lang: 'en',
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
    },
    injectManifest: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'] },
    devOptions: { enabled: false },
  })],
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
}));
