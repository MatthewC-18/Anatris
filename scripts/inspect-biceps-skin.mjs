// scripts/inspect-biceps-skin.mjs
// Diagnose why the biceps "doesn't stay fixed" during elbow extension: report,
// for each biceps/brachialis/triceps mesh, the bones its skin weights are bound
// to. A biceps whose BELLY is bound to a forearm bone (forearm_flex/forearm_rot)
// will swing with the forearm during extension instead of just lengthening.
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

const WANT = /biceps|brachialis|triceps/i;

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
  const top = [...byBone.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([b, w]) => `${b}=${((w / totalW) * 100).toFixed(1)}%`);
  const jointNames = new Set(joints.map((j) => j.getName()));
  const has = ['humerus_gh', 'scapula', 'forearm_flex', 'forearm_rot']
    .filter((b) => jointNames.has(b)).join(',');
  console.log(`${nm}\n    bones: ${top.join('  ')}\n    skin="${skin.getName()}" armBonesAvail=[${has}] jointCount=${joints.length}`);
}
