import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Separate from vite.config.ts on purpose: the app build config carries the PWA
// plugin (service worker generation), which has no place in unit tests. These
// tests exercise the PURE data/logic layer, so a plain node environment is enough.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
