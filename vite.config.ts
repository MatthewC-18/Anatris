import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

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

// EL VIDEO DE CARGA (src/components/LoaderVideo.tsx) y su poster. Por NOMBRE, no
// por extension: abrir `.mp4` o `.webp` a todo public/ dejaria pasar cualquier
// clip o captura de trabajo que alguien deje ahi. Y con techo: el original pesaba
// 7,3 MB y el preparado 793 KB; si alguien sube otra vez el original, el build
// se para en vez de servirlo.
//
// EL NOMBRE CAMBIA CON EL CONTENIDO (`carga.mp4` -> `carga-revelado.mp4`): el
// service worker guarda el video con CacheFirst 60 dias, asi que un fichero
// nuevo con el nombre viejo no le llegaria a quien ya visito la aplicacion.
const RUNTIME_MEDIA = new Map<string, number>([
  ['carga-revelado.mp4', 1_200_000],
  ['carga-revelado.webp', 120_000],
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

/**
 * UN DESPLIEGUE NO PUEDE PUBLICAR UN MODELO DE 133 BYTES.
 *
 * `.gitattributes` mete los `.glb` en Git LFS, asi que en git el modelo no es el
 * modelo: es un puntero de texto. Medido: `git cat-file -s HEAD:public/cuerpo-rig.opt.glb`
 * da 133 bytes, y empieza por `version https://git-lfs.github.com/spec/v1`.
 *
 * Este plugin copiaba con `copyFileSync` sin mirar ni el tamano ni la cabecera.
 * Si el checkout del servidor de compilacion no materializa LFS --un token
 * caducado, una cuota de LFS agotada, un clon con `GIT_LFS_SKIP_SMUDGE`--, `dist`
 * sale con un `.glb` de 133 bytes y un `.glb.gz` de unos 160. En el navegador el
 * cargador no encuentra magia de gzip ni de glTF (src/lib/compressedGLTF.ts),
 * cae al plano, y `GLTFLoader.parse` lanza sobre texto. O sea: **la aplicacion 3D
 * esta muerta en produccion y la compilacion ha salido en verde.**
 *
 * Tres lineas convierten ese fallo en "el build no sale", que es donde se puede
 * ver.
 */
function assertRealModel(src: string): void {
  const size = fs.statSync(src).size;
  const head = Buffer.alloc(64);
  const fd = fs.openSync(src, 'r');
  try {
    fs.readSync(fd, head, 0, 64, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (head.toString('utf8').startsWith('version https://git-lfs')) {
    throw new Error(
      `[anatris] ${path.basename(src)} es un PUNTERO de Git LFS (${size} B), no el modelo. ` +
        `El checkout no materializo LFS: ejecuta \`git lfs pull\` (o revisa el token y la ` +
        `cuota de LFS del servidor de compilacion). Publicar esto deja la aplicacion 3D ` +
        `muerta en produccion con el build en verde.`,
    );
  }
  // LA MAGIA DEL FORMATO, NO EL TAMANO.
  //
  // El primer intento ponia un suelo de 1 MB, y el build fallo: `therapist-hand.glb`
  // --la mano del fisio que dibuja la resistencia manual-- pesa 336 KB
  // legitimamente. El tamano no distingue un GLB pequeno de un fichero roto; la
  // cabecera si. Todo GLB binario empieza por el magico `glTF` (0x46546C67), asi
  // que esto caza el puntero de LFS, un HTML de error del CDN, un fichero
  // truncado a cero y un .glb que en realidad es .gltf de texto.
  if (head.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error(
      `[anatris] ${path.basename(src)} (${size} B) no empieza por el magico 'glTF': ` +
        `no es un GLB binario. Publicarlo deja la aplicacion 3D muerta en produccion ` +
        `con el build en verde.`,
    );
  }
  // Y EL TRUNCADO, QUE LA MAGIA SOLA NO CAZA. Medido: un fichero cortado a 64
  // bytes conserva la cabecera y pasaba. El GLB lleva su longitud total en los
  // bytes 8..12, asi que comparar contra el tamanio real es exacto y no hace
  // falta inventarse ningun suelo en megas.
  const declared = head.readUInt32LE(8);
  if (declared !== size) {
    throw new Error(
      `[anatris] ${path.basename(src)} declara ${declared} B en su cabecera y pesa ` +
        `${size} B: esta truncado o incompleto.`,
    );
  }
}

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
        const keep =
          RUNTIME_GLBS.has(name) ||
          RUNTIME_MEDIA.has(name) ||
          SHIP_EXTS.has(path.extname(name).toLowerCase());
        if (!keep) continue;
        const dest = path.join(outDir, name);
        if (RUNTIME_GLBS.has(name)) assertRealModel(src);
        const techo = RUNTIME_MEDIA.get(name);
        if (techo !== undefined && fs.statSync(src).size > techo) {
          throw new Error(
            `[anatris] ${name} pesa ${fs.statSync(src).size} B y el techo es ${techo} B: ` +
              `es el video de carga sin preparar (ver src/components/LoaderVideo.tsx).`,
          );
        }
        fs.copyFileSync(src, dest);
        // A PRE-COMPRESSED copy of each model, inflated in the browser by
        // src/lib/compressedGLTF.ts. meshopt is meant to be paired with transport
        // compression -- and neither model's ~5 MB JSON chunk is touched by it --
        // so this is 43% off the download for no visual cost at all:
        //   modelo-opt.dec.glb  27.3 -> 15.5 MB
        //   cuerpo-rig.opt.glb  18.2 -> 10.7 MB
        // We ship it ourselves rather than hoping the CDN compresses, because
        // `model/gltf-binary` is not a type CDNs reliably compress and the repo
        // cannot see what the CDN decided. The plain .glb stays next to it as the
        // fallback the loader uses when the .gz is absent (e.g. `vite dev`).
        if (!RUNTIME_GLBS.has(name)) continue;
        fs.writeFileSync(`${dest}.gz`, zlib.gzipSync(fs.readFileSync(src), { level: 9 }));
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
            // `.glb.gz` is the pre-compressed copy the loader prefers (see
            // src/lib/compressedGLTF.ts); without it here the offline cache would
            // hold the fallback nobody fetches.
            urlPattern: ({ url }) =>
              url.pathname.endsWith('.glb') ||
              url.pathname.endsWith('.glb.gz') ||
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
          {
            // EL VIDEO DE CARGA y su poster: al primer uso, y luego desde la
            // cache tambien sin red. `rangeRequests` porque Safari pide un video
            // por trozos (Range) y una respuesta entera cacheada no le vale.
            urlPattern: ({ url }) =>
              url.pathname === '/carga-revelado.mp4' || url.pathname === '/carga-revelado.webp',
            handler: 'CacheFirst',
            options: {
              cacheName: 'anatris-carga',
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 60 },
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