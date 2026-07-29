// scripts/inspect-neck-skin.mjs
// Diagnose why the neck/head muscles "se salen" (spill/tear) when the cervical
// spine moves: report, per neck-muscle mesh, the bone(s) its skin weights are
// bound to and which skin it lives in. A neck muscle spanning skull<->thorax that
// is bound rigidly to ONE bone (or whose duplicate copies are bound to DIFFERENT
// bones) tears as the cervical chain rotates.
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

const WANT = /sternocleidomastoid|scalenus|scalene|splenius|semispinalis|longissimus|longus_|longus |colli|capitis|levator_scap|levator scap|trapezius|rectus_(posterior|anterior|lateralis)|obliquus_(superior|inferior)|spinalis|multifidus_cerv|multifidus cerv|omohyoid|sternohyoid|digastric|platysma/i;

const rows = [];
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  const skin = node.getSkin();
  if (!mesh || !skin) continue;
  const nm = node.getName() || mesh.getName() || '';
  if (!WANT.test(nm)) continue;
  const joints = skin.listJoints();
  const byBone = new Map();
  let totalW = 0;
  for (const prim of mesh.listPrimitives()) {
    const J = prim.getAttribute('JOINTS_0');
    const W = prim.getAttribute('WEIGHTS_0');
    if (!J || !W) continue;
    const n = J.getCount();
    for (let i = 0; i < n; i++) {
      const j = J.getElement(i, [0, 0, 0, 0]);
      const w = W.getElement(i, [0, 0, 0, 0]);
      for (let k = 0; k < 4; k++) {
        if (w[k] > 0) {
          const bone = joints[j[k]] ? (joints[j[k]].getName() || '?') : '?';
          byBone.set(bone, (byBone.get(bone) || 0) + w[k]);
          totalW += w[k];
        }
      }
    }
  }
  const top = [...byBone.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([b, w]) => `${b}=${((w / totalW) * 100).toFixed(0)}%`);
  rows.push({ nm, skin: skin.getName(), top: top.join(' ') });
}
rows.sort((a, b) => a.nm.localeCompare(b.nm));
for (const r of rows) console.log(`${r.nm}\n    [${r.skin}] ${r.top}`);
console.log(`\n${rows.length} neck/head muscle meshes`);
