// scripts/lib/raster.mts
//
// The software rasteriser the render-* scripts share. It exists because the
// lab's canvas never initialises in the agent's browser pane: this is how rig
// geometry gets LOOKED AT rather than only measured.
//
// It shades with the lab's own lights (RigViewer) and paints with the lab's own
// per-mesh colors, so a patch that reads wrong on screen reads wrong here too.
// `owners` reports which mesh painted a given pixel, which turns "what is that
// black shape" into a lookup.
//
// Extracted verbatim from render-region.mts so a POSED render can reuse it. The
// one generalisation is `vertices`: callers hand back the world-space positions
// and normals of a mesh, so a rest-pose render passes localToWorld and a posed
// render passes the skinned positions.

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import * as THREE from 'three';

export type View = 'front' | 'side';

export interface MeshVertices {
  /** World-space vertex positions, indexed like the geometry's position attribute. */
  positions: THREE.Vector3[];
  /** World-space vertex normals, same indexing. */
  normals: THREE.Vector3[];
}

export interface RasterOptions {
  view: View;
  /** [xmin, xmax, ymin, ymax] in world metres. */
  box: [number, number, number, number];
  width: number;
  /** Per-mesh world-space vertices. Return null to skip the mesh. */
  vertices: (mesh: THREE.Mesh) => MeshVertices | null;
  /** Fill color for a mesh, 0xRRGGBB. */
  color: (mesh: THREE.Mesh) => number | null;
  /** Optional extra filter run before anything else. */
  include?: (mesh: THREE.Mesh) => boolean;
}

export interface RasterResult {
  buffer: Uint8Array;
  owners: (string | null)[];
  width: number;
  height: number;
  drawn: number;
}

// The lab's lights (RigViewer): key, fill, rim, hemisphere and a little ambient.
const LIGHTS: { dir: THREE.Vector3; i: number; c: [number, number, number] }[] = [
  { dir: new THREE.Vector3(3, 6, 4).normalize(), i: 1.2, c: [1, 0.957, 0.91] },
  { dir: new THREE.Vector3(-4, 2, -3).normalize(), i: 0.5, c: [0.804, 0.867, 1] },
  { dir: new THREE.Vector3(-2, 3, -5).normalize(), i: 0.95, c: [1, 1, 1] },
];
const AMBIENT = 0.12;
const HEMI = 0.35;

export function rasterize(scene: THREE.Object3D, opts: RasterOptions): RasterResult {
  const [XMIN, XMAX, YMIN, YMAX] = opts.box;
  const W = opts.width;
  const H = Math.round((W * (YMAX - YMIN)) / (XMAX - XMIN));
  const sc = W / (XMAX - XMIN);
  const px = (x: number) => (x - XMIN) * sc;
  const py = (y: number) => H - (y - YMIN) * sc;

  const buffer = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    buffer[i * 3] = 13; buffer[i * 3 + 1] = 27; buffer[i * 3 + 2] = 42;
  }
  const depth = new Float32Array(W * H).fill(Infinity);
  const owners: (string | null)[] = new Array(W * H).fill(null);

  const view = opts.view === 'front'
    ? new THREE.Vector3(0, 0, 1)
    : new THREE.Vector3(1, 0, 0);
  let drawn = 0;

  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (opts.include && !opts.include(m)) return;
    const hex = opts.color(m);
    if (hex === null) return;
    const verts = opts.vertices(m);
    if (!verts) return;
    const idx = m.geometry.getIndex();
    if (!idx) return;

    const base: [number, number, number] = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
    const wp = verts.positions;
    const wn = verts.normals;
    const arr = idx.array as ArrayLike<number>;
    for (let i = 0; i + 2 < arr.length; i += 3) {
      const a = wp[arr[i]], b = wp[arr[i + 1]], cc = wp[arr[i + 2]];
      if (!a || !b || !cc) continue;
      const cx = (a.x + b.x + cc.x) / 3, cy = (a.y + b.y + cc.y) / 3;
      if (cx < XMIN - 0.05 || cx > XMAX + 0.05 || cy < YMIN - 0.05 || cy > YMAX + 0.05) continue;
      const n = wn[arr[i]].clone().add(wn[arr[i + 1]]).add(wn[arr[i + 2]]).normalize();
      // DoubleSide: three.js flips the normal on back faces, so shade the side we see.
      if (n.dot(view) < 0) n.negate();
      const li = AMBIENT + HEMI * (0.5 + 0.5 * n.y);
      const lit: [number, number, number] = [0, 0, 0];
      for (const L of LIGHTS) {
        const d = Math.max(0, n.dot(L.dir)) * L.i;
        for (let k = 0; k < 3; k++) lit[k] += d * L.c[k];
      }
      const shade = (k: number) => {
        const x = (base[k] / 255) * (li + lit[k]);
        // ACES-ish shoulder, matching the lab's tone mapping closely enough to tell
        // "dark because it is unlit" from "dark because it is black".
        const t = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
        return Math.max(0, Math.min(255, Math.round(255 * Math.pow(Math.min(1, t), 1 / 2.2))));
      };
      const col: [number, number, number] = [shade(0), shade(1), shade(2)];
      const pts: [number, number][] = opts.view === 'front'
        ? [[px(a.x), py(a.y)], [px(b.x), py(b.y)], [px(cc.x), py(cc.y)]]
        : [
            [px(a.z + (XMIN + XMAX) / 2), py(a.y)],
            [px(b.z + (XMIN + XMAX) / 2), py(b.y)],
            [px(cc.z + (XMIN + XMAX) / 2), py(cc.y)],
          ];
      const zc = opts.view === 'front'
        ? -(a.z + b.z + cc.z) / 3
        : -(a.x + b.x + cc.x) / 3;
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
          const off = y * W + x;
          if (zc >= depth[off]) continue;
          depth[off] = zc;
          owners[off] = m.name;
          buffer[off * 3] = col[0]; buffer[off * 3 + 1] = col[1]; buffer[off * 3 + 2] = col[2];
        }
      drawn++;
    }
  });

  return { buffer, owners, width: W, height: H, drawn };
}

// --- PNG encoding (no dependency; the harness must run on a bare checkout) ---

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b: Buffer) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC_TABLE[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** Write an RGB buffer out as a PNG. */
export function writePng(path: string, buffer: Uint8Array, W: number, H: number): void {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    Buffer.from(buffer.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  writeFileSync(path, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]));
}

/** Report which meshes painted the given pixels (PICK="x,y;x,y"). */
export function pick(spec: string, owners: (string | null)[], W: number): void {
  for (const pair of spec.split(';')) {
    const [x, y] = pair.split(',').map(Number);
    const found = new Set<string>();
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const o = owners[(y + dy) * W + (x + dx)];
        if (o) found.add(o);
      }
    console.log(`   (${x},${y}) -> ${[...found].join(', ') || 'BACKGROUND (nothing drawn)'}`);
  }
}
