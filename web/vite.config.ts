/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API = 'http://127.0.0.1:8090';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // cardspec/ lives next to web/ because the Go hooks read the same limits.
    fs: { allow: ['..'] },
    proxy: {
      '/api': { target: API, changeOrigin: true },
      '/_': { target: API, changeOrigin: true },
    },
  },
  // Loaded on demand by the export. Without this, the first export in development makes
  // Vite discover a new dependency and reload the page in the middle of it.
  optimizeDeps: { include: ['pdf-lib'] },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
