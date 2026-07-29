// scripts/inspect-leg.mjs
// Dump the Leg armature bone rest transforms (local + world) so we can reason
// about the knee flexion axis and how a local-X rotation bends the shin.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';

const GLB_PATH = process.argv[2] || 'rig-src/cuerpo-rig.glb';
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(GLB_PATH);
const root = doc.getRoot();

const allNodes = root.listNodes();
const parentOf = new Map();
for (const n of allNodes) for (const c of n.listChildren()) parentOf.set(c, n);
const nameOf = (n) => (n ? n.getName() || '(unnamed)' : '(none)');

// --- minimal mat4 / quat helpers (column-major, like gl-matrix) ---
function trs(t, q, s) {
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  const [sx, sy, sz] = s;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    t[0], t[1], t[2], 1,
  ];
}
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  return o;
}
function pos(m) { return [m[12], m[13], m[14]]; }
// transform a direction (w=0)
function dir(m, v) {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2],
  ];
}
function worldOf(node) {
  let m = trs(node.getTranslation(), node.getRotation(), node.getScale());
  let p = parentOf.get(node);
  while (p) {
    m = mul(trs(p.getTranslation(), p.getRotation(), p.getScale()), m);
    p = parentOf.get(p);
  }
  return m;
}

const want = /leg|thigh|shin|foot|femur|patell|tibia|knee|ankle|calf|toe/i;
const lines = [];
for (const n of allNodes) {
  const nm = nameOf(n);
  if (!want.test(nm)) continue;
  const w = worldOf(n);
  const p = pos(w);
  // local X axis of this bone expressed in world space (knee flexion axis for shin_flex)
  const ax = dir(w, [1, 0, 0]);
  const ay = dir(w, [0, 1, 0]);
  const az = dir(w, [0, 0, 1]);
  const t = n.getTranslation();
  const r = n.getRotation();
  lines.push(
    `${nm}\n  parent=${nameOf(parentOf.get(n))}\n  localT=[${t.map((v) => v.toFixed(3))}]  localQ=[${r.map((v) => v.toFixed(3))}]\n  worldPos=[${p.map((v) => v.toFixed(3))}]\n  worldXaxis=[${ax.map((v) => v.toFixed(2))}] worldYaxis=[${ay.map((v) => v.toFixed(2))}] worldZaxis=[${az.map((v) => v.toFixed(2))}]`,
  );
}
const out = lines.join('\n\n');
fs.writeFileSync('leg-bones.txt', out, 'utf8');
console.log(out);
console.log('\n-> leg-bones.txt  (' + lines.length + ' nodes)');
