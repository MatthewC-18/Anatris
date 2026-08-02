import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'node:path';

// The ONLY .glb models the app fetches at runtime. Every other .glb in public/
// is a backup/source (cuerpo-rig.glb, *.bak.glb, modelo-blender*, brazo-rig, ...)
// that must NOT ship: copyPublicDir copies ALL of public/, so those ~700 MB of
// backups were bloating every build/deploy (and filled the disk once). We turn
// copyPublicDir OFF and copy only the runtime files here. Dev is unaffected (the
// dev server serves public/ directly regardless of this build-only setting).
const RUNTIME_GLBS = new Set([
  'modelo-opt.dec.glb', // Explorar atlas (AnatomyModel)
  'cuerpo-rig.opt.glb', // movement-lab rig (RigModel)
  'therapist-hand.glb', // manual-resistance hand (RigOverlays)
]);

// Web assets that DO ship (small). A POSITIVE allowlist, so junk in public/ can
// never sneak into a deploy: besides the runtime .glb above and these extensions,
// everything else (backup .glb, .glb.bak, and the ~540 MB of .blend/.blend1
// Blender sources sitting in public/) is skipped.
const SHIP_EXTS = new Set([
  '.json',
  '.svg',
  '.png',
  '.ico',
  '.webmanifest',
  '.xml',
  '.txt',
  '.woff',
  '.woff2',
]);

function copyRuntimePublicAssets(): Plugin {
  return {
    name: 'anatris-copy-runtime-public',
    apply: 'build',
    writeBundle() {
      const srcDir = path.resolve(__dirname, 'public');
      const outDir = path.resolve(__dirname, 'dist');
      for (const name of fs.readdirSync(srcDir)) {
        const src = path.join(srcDir, name);
        if (!fs.statSync(src).isFile()) continue;
        const keep = RUNTIME_GLBS.has(name) || SHIP_EXTS.has(path.extname(name).toLowerCase());
        if (!keep) continue;
        fs.copyFileSync(src, path.join(outDir, name));
      }
    },
  };
}

export default defineConfig({
  plugins: [
    copyRuntimePublicAssets(),
    react(),
    // PWA: installable on iPad / desktop (home-screen icon, standalone window) and
    // works OFFLINE after the first online load. The app shell (JS/CSS/HTML) is
    // precached; the heavy 3D models (.glb, ~19-49 MB) and the anatomy index are
    // CACHED ON FIRST USE (runtimeCaching) rather than precached, so install stays
    // light and the models are available offline once opened.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'favicon-32x32.png'],
      manifest: {
        name: 'Anatris | Anatomía clínica y biomecánica',
        short_name: 'Anatris',
        description:
          'Atlas 3D de anatomía clínica y biomecánica para fisioterapia: rangos de movimiento, músculos por fase, tests y modo paciente.',
        lang: 'es',
        theme_color: '#070b14',
        background_color: '#070b14',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell only. 4 MB ceiling keeps the biggest JS chunk in
        // (romPhaseAtAngle ~1 MB) while excluding the multi-MB .glb models.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        // Don't hijack range/stream edge cases; models are handled below.
        runtimeCaching: [
          {
            // The 3D models + anatomy index: cache on first use, serve offline after.
            urlPattern: ({ url }) =>
              url.pathname.endsWith('.glb') ||
              url.pathname.endsWith('anatomy-index.json'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'anatris-models',
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Avoid bundling the heavy .glb; let it be served as a static asset
  assetsInclude: ['**/*.glb'],
  build: {
    // Don't blind-copy public/ (it holds ~700 MB of backup/source .glb). The
    // copyRuntimePublicAssets plugin above copies only the runtime files instead.
    copyPublicDir: false,
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