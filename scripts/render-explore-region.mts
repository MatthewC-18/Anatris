// Rasterise an EXPLORAR region to a PNG, straight from node.
//
// Same idea as render-region.mts, but for the Explorar atlas (modelo-opt.dec.glb
// + anatomy-index.json + REGIONS) instead of the movement-lab rig: it replicates
// AnatomyModel's visibility gate (layer on, paintable material, hiddenByDefault,
// origin/insertion markers hidden) and the region filter, then draws the result
// with the viewer's palette. PICK reports which mesh painted a pixel, which
// turns "what is that thing hanging off the hip" into a lookup.
//
// Run: OUT=hip.png REGION=hip [VIEW=front|side] [W=700] [PICK="x,y;..."]
//      npx tsx --tsconfig tsconfig.scripts.json scripts/render-explore-region.mts
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import {
  colorForMaterial,
  colorForMaterialMesh,
  materialIsAccessoryTissue,
} from '../src/lib/materialColors.ts';
import { parseMeshName } from '../src/lib/parseMeshName.ts';
import { REGIONS, resolveRegionMeshes, resolveRegionFade } from '../src/data/regiones.ts';

const OUT = process.env.OUT ?? 'region.png';
const REGION = process.env.REGION ?? 'hip';
const VIEW = (process.env.VIEW ?? 'front') as 'front' | 'side';
const W = Number(process.env.W ?? 700);
const LAYERS = new Set((process.env.LAYERS ?? 'bones,muscles,ligaments').split(','));

const index = JSON.parse(
  readFileSync('C:/Users/Matthew/Documents/Fisio/public/anatomy-index.json', 'utf8'),
);
const byMesh = new Map<string, any>();
for (const e of index.entries) byMesh.set(e.meshName, e);

const def = REGIONS[REGION];
if (!def) throw new Error(`unknown region ${REGION}`);
const regionMeshes = resolveRegionMeshes(def, byMesh.keys());

const buf = readFileSync('C:/Users/Matthew/Documents/Fisio/public/modelo-opt.dec.glb');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group;
scene.updateMatrixWorld(true);

/** AnatomyModel's visibility gate, minus side filter (both sides shown). */
function isVisible(name: string): boolean {
  const e = byMesh.get(name);
  if (!e) return false;
  if (colorForMaterial(e.materialName) === null) return false;
  if (!LAYERS.has(e.layer)) return false;
  if (e.hiddenByDefault) return false;
  if (!regionMeshes.has(name)) return false;
  if (materialIsAccessoryTissue(e.materialName, name)) return false;
  const part = parseMeshName(name).part;
  return part !== 'origin' && part !== 'insertion';
}

// The region falloff, mirrored from AnatomyModel's fragment shader so the render
// shows the dissolve the app draws. FADE=off renders the raw region extent.
const fade = process.env.FADE === 'off' ? null : resolveRegionFade(def);
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const fadeAlphaAt = (y: number): number => {
  if (!fade) return 1;
  return (
    smoothstep(fade.min - fade.soft, fade.min, y) *
    (1 - smoothstep(fade.max, fade.max + fade.soft, y))
  );
};

const shown: THREE.Mesh[] = [];
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  if (isVisible(m.name)) shown.push(m);
});

// Auto-frame on the visible bounds, with a small margin. Meshes entirely past
// the falloff are dropped first, exactly as AnatomyModel hides them.
const meshBox = new THREE.Box3();
const drawable = shown.filter((m) => {
  if (!fade) return true;
  meshBox.setFromObject(m);
  return !(meshBox.max.y <= fade.min - fade.soft || meshBox.min.y >= fade.max + fade.soft);
});
shown.length = 0;
shown.push(...drawable);

const box = new THREE.Box3();
for (const m of shown) box.expandByObject(m);
if (fade) {
  box.min.y = Math.max(box.min.y, fade.min - fade.soft);
  box.max.y = Math.min(box.max.y, fade.max + fade.soft);
}
const pad = 0.04;
const XMIN = (VIEW === 'front' ? box.min.x : box.min.z) - pad;
const XMAX = (VIEW === 'front' ? box.max.x : box.max.z) + pad;
const YMIN = box.min.y - pad;
const YMAX = box.max.y + pad;

const LIGHTS: { dir: THREE.Vector3; i: number; c: [number, number, number] }[] = [
  { dir: new THREE.Vector3(3, 6, 4).normalize(), i: 1.2, c: [1, 0.957, 0.91] },
  { dir: new THREE.Vector3(-4, 2, -3).normalize(), i: 0.5, c: [0.804, 0.867, 1] },
  { dir: new THREE.Vector3(-2, 3, -5).normalize(), i: 0.95, c: [1, 1, 1] },
];
const AMBIENT = 0.12;
const HEMI = 0.35;

const H = Math.round((W * (YMAX - YMIN)) / (XMAX - XMIN));
const sc = W / (XMAX - XMIN);
const px = (x: number) => (x - XMIN) * sc;
const py = (y: number) => H - (y - YMIN) * sc;
const buffer = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  buffer[i * 3] = 13;
  buffer[i * 3 + 1] = 27;
  buffer[i * 3 + 2] = 42;
}
const depth = new Float32Array(W * H).fill(Infinity);
const owners: (string | null)[] = new Array(W * H).fill(null);

const view = VIEW === 'front' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
let drawn = 0;
const nrmMat = new THREE.Matrix3();
for (const m of shown) {
  const g = m.geometry;
  const pos = g.getAttribute('position');
  const nrm = g.getAttribute('normal');
  const idx = g.getIndex();
  if (!pos || !idx) continue;
  const e = byMesh.get(m.name);
  const hex = colorForMaterialMesh(e.materialName, m.name) ?? 0xbfae9a;
  const base: [number, number, number] = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  nrmMat.getNormalMatrix(m.matrixWorld);
  const wp: THREE.Vector3[] = [];
  const wn: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    m.localToWorld(v);
    wp.push(v.clone());
    if (nrm) {
      v.fromBufferAttribute(nrm, i).applyMatrix3(nrmMat).normalize();
      wn.push(v.clone());
    } else wn.push(new THREE.Vector3(0, 0, 1));
  }
  const arr = idx.array as ArrayLike<number>;
  for (let i = 0; i + 2 < arr.length; i += 3) {
    const a = wp[arr[i]], b = wp[arr[i + 1]], cc = wp[arr[i + 2]];
    const alpha = fadeAlphaAt((a.y + b.y + cc.y) / 3);
    if (alpha < 0.01) continue;
    const n = wn[arr[i]].clone().add(wn[arr[i + 1]]).add(wn[arr[i + 2]]).normalize();
    if (n.dot(view) < 0) n.negate();
    const li = AMBIENT + HEMI * (0.5 + 0.5 * n.y);
    const lit: [number, number, number] = [0, 0, 0];
    for (const L of LIGHTS) {
      const d = Math.max(0, n.dot(L.dir)) * L.i;
      for (let k = 0; k < 3; k++) lit[k] += d * L.c[k];
    }
    const shade = (k: number) => {
      const x = (base[k] / 255) * (li + lit[k]);
      const t = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
      return Math.max(0, Math.min(255, Math.round(255 * Math.pow(Math.min(1, t), 1 / 2.2))));
    };
    const col: [number, number, number] = [shade(0), shade(1), shade(2)];
    const pts: [number, number][] = VIEW === 'front'
      ? [[px(a.x), py(a.y)], [px(b.x), py(b.y)], [px(cc.x), py(cc.y)]]
      : [[px(a.z), py(a.y)], [px(b.z), py(b.y)], [px(cc.z), py(cc.y)]];
    const zc = VIEW === 'front' ? -(a.z + b.z + cc.z) / 3 : -(a.x + b.x + cc.x) / 3;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(W - 1, Math.ceil(Math.max(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)));
    const den = (xs[1] - xs[0]) * (ys[2] - ys[0]) - (xs[2] - xs[0]) * (ys[1] - ys[0]);
    if (Math.abs(den) < 1e-9) continue;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const w0 = ((xs[1] - x) * (ys[2] - y) - (xs[2] - x) * (ys[1] - y)) / den;
        const w1 = ((xs[2] - x) * (ys[0] - y) - (xs[0] - x) * (ys[2] - y)) / den;
        if (w0 < 0 || w1 < 0 || 1 - w0 - w1 < 0) continue;
        const o = y * W + x;
        if (zc >= depth[o]) continue;
        // Approximate the shader's dissolve: blend over whatever is behind, and
        // only claim the depth slot once the fragment is mostly opaque.
        if (alpha > 0.5) {
          depth[o] = zc;
          owners[o] = m.name;
        }
        for (let k = 0; k < 3; k++) {
          buffer[o * 3 + k] = Math.round(buffer[o * 3 + k] * (1 - alpha) + col[k] * alpha);
        }
      }
    drawn++;
  }
}

const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  Buffer.from(buffer.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
}
const table = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b: Buffer) => {
  let c = 0xffffffff;
  for (const x of b) c = table[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(OUT, Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
]));
console.log(
  `wrote ${OUT} ${W}x${H}, region ${REGION}, ${shown.length} meshes, ${drawn} triangles, view ${VIEW}`,
);
console.log(`  bounds x[${box.min.x.toFixed(2)},${box.max.x.toFixed(2)}] y[${box.min.y.toFixed(2)},${box.max.y.toFixed(2)}] z[${box.min.z.toFixed(2)},${box.max.z.toFixed(2)}]`);
if (process.env.PICK)
  for (const pair of process.env.PICK.split(';')) {
    const [x, y] = pair.split(',').map(Number);
    const found = new Set<string>();
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const o = owners[(y + dy) * W + (x + dx)];
        if (o) found.add(o);
      }
    console.log(`   (${x},${y}) -> ${[...found].join(', ') || 'BACKGROUND (nothing drawn)'}`);
  }
