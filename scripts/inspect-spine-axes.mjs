// scripts/inspect-spine-axes.mjs
// Reports each Spine_Armature vertebra's REST-pose world position and the world
// direction of its LOCAL x/y/z axes. If flexion is meant to be a clean rotation
// about local X, then local X should point roughly along world X (medio-lateral),
// local Y roughly world +Y (up the spine) and local Z roughly world +/-Z
// (antero-posterior). Any large tilt means "rotate about local X" mixes planes
// and the trunk drifts off-axis as it accumulates up the chain.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';

const GLB_PATH = process.argv[2] || 'rig-src/cuerpo-rig.glb';
if (!fs.existsSync(GLB_PATH)) { console.error('No GLB en ' + GLB_PATH); process.exit(1); }

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(GLB_PATH);
const root = doc.getRoot();

// ---- tiny mat4 (column-major) helpers ----
function trs(t, r, s) {
  const [x, y, z, w] = r;
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
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
function local(n) {
  return trs(n.getTranslation(), n.getRotation(), n.getScale());
}

// parent lookup
const parentOf = new Map();
for (const n of root.listNodes()) for (const c of n.listChildren()) parentOf.set(c, n);

function worldMatrix(n) {
  let m = local(n);
  let p = parentOf.get(n);
  while (p) { m = mul(local(p), m); p = parentOf.get(p); }
  return m;
}

const spine = root.listSkins().find((s) => s.getName() === 'Spine_Armature');
const order = ['vert_sacrum','vert_L5','vert_L4','vert_L3','vert_L2','vert_L1',
  'vert_T12','vert_T11','vert_T10','vert_T9','vert_T8','vert_T7','vert_T6','vert_T5',
  'vert_T4','vert_T3','vert_T2','vert_T1','vert_C7','vert_C6','vert_C5','vert_C4',
  'vert_C3','vert_C2','vert_C1'];
const joints = spine.listJoints();
const byName = new Map(joints.map((j) => [j.getName(), j]));

const f3 = (v) => v.map((x) => (x >= 0 ? ' ' : '') + x.toFixed(2)).join(', ');
console.log('vertebra   worldPos(x,y,z)        localX->world        localY->world        localZ->world');
for (const name of order) {
  const j = byName.get(name);
  if (!j) { console.log(name.padEnd(10), '(missing)'); continue; }
  const m = worldMatrix(j);
  const pos = [m[12], m[13], m[14]];
  // columns 0,1,2 are the world directions of local x,y,z (normalize)
  const col = (i) => { const v = [m[i*4], m[i*4+1], m[i*4+2]]; const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  console.log(
    name.padEnd(10),
    '[' + f3(pos) + ']  ',
    '[' + f3(col(0)) + ']  ',
    '[' + f3(col(1)) + ']  ',
    '[' + f3(col(2)) + ']',
  );
}
