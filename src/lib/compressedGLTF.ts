// src/lib/compressedGLTF.ts
//
// THE MODELS WERE SHIPPING 12 MB OF AIR.
//
// "lento" was the physiotherapist's first note. The repeat visit was fixed by
// caching, and the FIRST load turned out to be a smaller problem than the doc
// claimed -- measured in a real browser (scripts/measure-first-load.mts), the
// landing page is 1.9 MB and paints in 0.43 s, and the big models are fetched
// only when a 3D view actually opens, one at a time. What is left is the model
// itself: 27.3 MB for the atlas, 18.2 MB for the rig.
//
// Both are already decimated (~56%) and meshopt-encoded, so the usual next step
// is to decimate further -- and that costs visible surface quality. It is not
// the next step here, because 43% of what goes over the wire is not geometry at
// all:
//
//   modelo-opt.dec.glb   27.3 MB  ->  15.5 MB gzipped   (56%)
//   cuerpo-rig.opt.glb   18.2 MB  ->  10.7 MB gzipped   (59%)
//
// meshopt is DESIGNED to be paired with transport compression -- it reorders
// vertex data so a general-purpose compressor can finish the job -- and neither
// model's 5 MB JSON chunk is compressed by it at all. So the bytes are there for
// free, with no visual cost whatsoever.
//
// The catch is that transport compression is the CDN's decision, not ours, and
// `model/gltf-binary` is not a type CDNs reliably compress. Rather than depend on
// a behaviour we cannot see or control from the repo, the build writes a
// pre-compressed `<name>.glb.gz` next to each model (see vite.config.ts) and this
// module inflates it in the browser with the platform's own DecompressionStream.
//
// If the `.gz` is missing -- in `vite dev`, which serves public/ directly, or in
// any deploy built before this -- the fetch falls straight back to the plain
// `.glb`, so nothing depends on the compressed copy existing.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { claimWarmModel, gzUrl } from './modelWarm';
import { stamp } from './bootClock';

export interface LoadedGLTF {
  scene: THREE.Group;
}

type Entry =
  | { state: 'pending'; promise: Promise<void> }
  | { state: 'done'; value: LoadedGLTF }
  | { state: 'error'; error: unknown };

/** One entry per URL, so a remount does not refetch 27 MB. */
const cache = new Map<string, Entry>();

/**
 * `/a/b.glb?v=7` -> `/a/b.glb.gz?v=7`: the suffix goes on the PATH, not the query.
 *
 * Lives in modelWarm.ts now, which is the three-free half of this module, and is
 * re-exported here because this is where callers (and the test) look for it.
 */
export { gzUrl } from './modelWarm';

/** True when the browser can inflate gzip for us. Every WebGL2 browser can. */
function canInflate(): boolean {
  return typeof DecompressionStream !== 'undefined';
}

/**
 * Read a response body to the end, reporting bytes to three's loading manager.
 *
 * This is not decoration. Both viewers gate their "ready" state on drei's
 * `useProgress()`, which listens to `THREE.DefaultLoadingManager` -- and a plain
 * `fetch` tells the manager nothing. The first version of this module used one,
 * so `progress` stayed at 0 for ever, the overlay never lifted, and the app sat
 * behind "Cargando modelo anatómico · 0%" with the model loaded and rendering
 * underneath it. Whatever loads a model here has to report to the manager.
 */
async function drain(res: Response, url: string, expected: number): Promise<ArrayBuffer> {
  const manager = THREE.DefaultLoadingManager;
  const total = Number(res.headers.get('content-length') ?? 0) || expected;
  if (!res.body || !total) return await res.arrayBuffer();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    manager.onProgress?.(url, loaded, total);
  }
  const out = new Uint8Array(loaded);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out.buffer;
}

async function fetchModelBytes(url: string): Promise<ArrayBuffer> {
  // If main.tsx already started this download (see modelWarm.ts), take it rather
  // than asking for the same 11 MB a second time. It may be the compressed copy
  // or the plain one, depending on what the server had.
  const claimed = claimWarmModel(url);
  const warm = claimed ? await claimed : null;
  if (warm) {
    try {
      if (!warm.compressed) return await drain(warm.res, url, 0);
      const inflated = await inflate(warm.res, url);
      if (inflated) return inflated;
    } catch {
      // A preload that turns out to be unusable must not fail the load: fall
      // through and fetch it the ordinary way.
    }
  }
  if (canInflate()) {
    try {
      const res = await fetch(gzUrl(url));
      // NOT a 404 in dev: vite rewrites unknown paths to index.html and answers
      // 200, so `res.ok` is true for a 5 KB HTML page. `inflate` returns null
      // when the bytes are not gzip, which is how that case is caught.
      if (res.ok && res.body) {
        const inflated = await inflate(res, url);
        if (inflated) return inflated;
      }
    } catch {
      // Network hiccup on the compressed copy: fall through to the plain file
      // rather than failing a load that has a perfectly good alternative.
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar el modelo ${url} (HTTP ${res.status})`);
  return await drain(res, url, 0);
}

/**
 * Read a model response that is SUPPOSED to be the gzipped copy, and hand back
 * usable GLB bytes -- or null when the bytes are neither.
 *
 * Three things can come back from `<name>.glb.gz`, and the difference is only
 * visible in the first bytes:
 *
 *  - REAL GZIP (`1f 8b`). The normal case: inflate it here.
 *  - ALREADY A GLB (`glTF`). The server declared `Content-Encoding: gzip`, so
 *    the browser inflated it before we ever saw it. `vite preview` does exactly
 *    this. The old code handed those bytes to DecompressionStream, which threw,
 *    and the load fell back to fetching the PLAIN 19 MB file -- so every load
 *    through such a server was downloading 11 MB and then 19 MB more, measured.
 *    Now they are used as they are.
 *  - HTML. `vite dev` rewrites unknown paths to index.html and answers 200, so
 *    `res.ok` is true for a 5 KB page. That is the null case, and the caller
 *    fetches the plain model instead.
 *
 * Progress is counted on the download, which is the part that takes the time;
 * inflation is local and fast, so it happens in one go once the bytes are in.
 */
async function inflate(res: Response, url: string): Promise<ArrayBuffer | null> {
  const bytes = await drain(res, url, 16 * 1024 * 1024);
  const head = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
  if (head[0] === 0x1f && head[1] === 0x8b) {
    const stream = new Response(bytes).body!.pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).arrayBuffer();
  }
  // 'glTF' -- the binary glTF magic.
  if (head[0] === 0x67 && head[1] === 0x6c && head[2] === 0x54 && head[3] === 0x46) return bytes;
  return null;
}


function load(url: string): Promise<void> {
  const manager = THREE.DefaultLoadingManager;
  // itemStart/itemEnd are what make `useProgress()` see this load at all, and
  // itemEnd is what finally reports 1 of 1 -- i.e. 100% -- which is the signal
  // both viewers use to lift their loading overlay. It goes AFTER the parse, not
  // after the download, so "100%" means the model is ready rather than
  // downloaded: parsing 2.8M triangles is not instant and the bar should not sit
  // full while it happens.
  manager.itemStart(url);
  const promise = (async () => {
    const buf = await fetchModelBytes(url);
    stamp('bytes');
    const loader = new GLTFLoader();
    // Both models require EXT_meshopt_compression; KHR_mesh_quantization is
    // handled by three itself. This is the same decoder drei's useGLTF installs,
    // set here because we hand the loader bytes rather than a URL.
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.parseAsync(buf, '');
    stamp('parse');
    cache.set(url, { state: 'done', value: { scene: gltf.scene as THREE.Group } });
  })()
    .catch((error: unknown) => {
      cache.set(url, { state: 'error', error });
      manager.itemError(url);
    })
    .finally(() => {
      manager.itemEnd(url);
    });
  cache.set(url, { state: 'pending', promise });
  return promise;
}

/**
 * Start fetching a model before anything renders it, exactly like
 * `useGLTF.preload`. Safe to call repeatedly.
 */
export function preloadGLTF(url: string): void {
  if (!cache.has(url)) void load(url);
}

/**
 * Suspense-friendly model load. Drop-in for drei's `useGLTF` for the two big
 * models: same `{ scene }` shape, same cache-per-URL behaviour, same rule that
 * the returned scene is SHARED and must not be disposed by its consumers.
 */
export function useCompressedGLTF(url: string): LoadedGLTF {
  const entry = cache.get(url);
  if (!entry) throw load(url);
  if (entry.state === 'pending') throw entry.promise;
  if (entry.state === 'error') throw entry.error;
  return entry.value;
}

/** Drop a cached model, so the next use refetches. Mirrors `useGLTF.clear`. */
export function clearGLTF(url: string): void {
  cache.delete(url);
}
