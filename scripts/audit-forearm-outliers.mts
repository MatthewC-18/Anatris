// Which forearm meshes actually stick OUT, measured against the limb's own bone
// chain instead of its skin.
//
// Removing the name-based culls filled the forearm back up but brought loose
// spikes with it. The skin-cloud metric that said the culled meshes were fine was
// unreliable: the digital tendons run into the fingers, where the hand skin is
// sampled thinly, so distances there are meaningless.
//
// The bone chain is a solid reference. Every point of a forearm or hand structure
// lies within a few cm of the segment elbow -> wrist -> fingertips. A mesh whose
// bulk sits far off that chain is a spike, whatever it is called.
//
// Run: npx tsx scripts/audit-forearm-outliers.mts [deg]
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { getBoneControl, resolveArmatureName } from '../src/lib/boneMap.ts';
import { layerForMaterial } from '../src/lib/materialColors.ts';

const DEG = Number(process.argv[2] ?? 0);
const GLB = 'C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig.opt.glb';
const D2R = Math.PI / 180;
const SIDE: 'R' | 'L' = 'R';
const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group; scene.updateMatrixWorld(true);
const bs = (n: string) => n.replace(/_\d+$/, '');
const AX: Record<string, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1),
};
const armRoot = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', SIDE))!;
const boneOf = (n: string) => { let f: any = null; armRoot.traverse((o: any) => { if (!f && bs(o.name) === n) f = o; }); return f; };
const rq = new Map<THREE.Object3D, THREE.Quaternion>();
scene.traverse((o) => rq.set(o, o.quaternion.clone()));

/** Every bone of this arm, as world points: the chain to measure against. */
function chainPoints(): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  armRoot.traverse((o) => {
    if ((o as THREE.Bone).isBone) pts.push(o.getWorldPosition(new THREE.Vector3()));
  });
  return pts;
}
/** Distance from p to the nearest bone point (a good proxy for "on the limb"). */
function distToChain(p: THREE.Vector3, chain: THREE.Vector3[]) {
  let best = Infinity;
  for (const q of chain) { const d = p.distanceToSquared(q); if (d < best) best = d; }
  return Math.sqrt(best);
}

const ELBOW_Y = boneOf('forearm_flex').getWorldPosition(new THREE.Vector3()).y;
const WRIST_Y = boneOf('hand_flex').getWorldPosition(new THREE.Vector3()).y;
type M = { m: THREE.SkinnedMesh; name: string; layer: string };
const meshes: M[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh) return;
  if (!m.skeleton?.bones.some((b) => armRoot.getObjectById(b.id))) return;
  const first = Array.isArray(m.material) ? m.material[0] : m.material;
  const layer = layerForMaterial((first as any)?.name ?? '');
  if (!layer) return;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  if (c.y < WRIST_Y - 0.10 || c.y > ELBOW_Y + 0.02) return;
  if (Math.abs(c.x) < 0.12) return;
  meshes.push({ m, name: m.name, layer });
});

function pose(deg: number) {
  scene.traverse((o) => { const q = rq.get(o); if (q) o.quaternion.copy(q); });
  if (deg) {
    const c: any = getBoneControl('elbow-pronation');
    const b = boneOf(c.bone);
    if (b) b.rotateOnAxis(AX[c.axis], deg * D2R * c.sign[SIDE]);
  }
  scene.updateMatrixWorld(true);
}
const posedOf = (x: M) => {
  x.m.skeleton.update();
  const pos = x.m.geometry.getAttribute('position');
  const step = Math.max(1, Math.floor(pos.count / 400));
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i += step) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    x.m.applyBoneTransform(i, v); x.m.localToWorld(v); out.push(v);
  }
  return out;
};

pose(DEG);
const chain = chainPoints();
console.log(`side ${SIDE}, pronation ${DEG} deg, ${meshes.length} meshes, ${chain.length} bone points\n`);
console.log('  p95    max    layer        mesh');
const rows = meshes.map((x) => {
  const d = posedOf(x).map((p) => distToChain(p, chain)).sort((a, b) => a - b);
  return { name: x.name, layer: x.layer, p95: d[Math.floor(d.length * 0.95)], max: d[d.length - 1] };
});
rows.sort((a, b) => b.p95 - a.p95);
for (const r of rows.slice(0, 22))
  console.log(
    `${(r.p95 * 100).toFixed(1).padStart(6)} ${(r.max * 100).toFixed(1).padStart(6)}   ${r.layer.padEnd(11)}  ${r.name}`,
  );

// The limb's own thickness, for a threshold: how far does the SKIN sit?
const skin = rows.filter((r) => r.layer === 'skin');
const skinP95 = Math.max(...skin.map((r) => r.p95));
console.log(`\nskin reaches ${(skinP95 * 100).toFixed(1)} cm from the chain at p95 -- that is the limb's own radius.`);
const over = rows.filter((r) => r.layer !== 'skin' && r.p95 > skinP95);
console.log(`${over.length} non-skin meshes have their p95 BEYOND the skin:`);
for (const r of over) console.log(`   ${(r.p95 * 100).toFixed(1)} cm  [${r.layer}] ${r.name}`);
