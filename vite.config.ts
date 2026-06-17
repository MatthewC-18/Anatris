import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Avoid bundling the heavy .glb; let it be served as a static asset
  assetsInclude: ['**/*.glb'],
  build: {
    rollupOptions: {
      output: {
        // Keep supabase as its own long-lived chunk (it loads at startup for
        // auth but rarely changes). We deliberately do NOT manualChunk three /
        // @react-three here: those share `zustand` with the app store, and
        // grouping them would hoist zustand into the three chunk and create a
        // STATIC edge from the entry, pulling three into the initial load. The
        // React.lazy boundary around Viewer3D/MovementView already splits three
        // into on-demand chunks, which is what keeps it off the landing page.
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});