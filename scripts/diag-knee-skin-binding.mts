// Which skin patches around the knee are bound to the WRONG bone?
//
// The elbow had exactly this: half the upper-arm skin shipped bound to
// forearm_flex, so on flexion those patches swung about the elbow and left the
// arm torn open. RigModel fixes it at load (`center.y > UPPER_ARM_Y ->
// rigidBindTo(humerus_gh)`), and the elbow now folds clean at 145 deg.
//
// The knee never got the same treatment, and it shows: from 45 deg of flexion a
// rectangular block detaches off the back of the knee and the thigh ends in an
// open cross-section. This lists the offenders so the same repair can be aimed
// at the right meshes.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/diag-knee-skin-binding.mts
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { materialIsSkin } from '../src/lib/materialColors.ts';
import { rigGlbPath } from './lib/rigPath.mts';

const buf = readFileSync(rigGlbPath());
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder as never);
const gl = await ld.parseAsync(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '',
);
const scene = gl.scene as THREE.Object3D;
scene.updateMatrixWorld(true);

const matNameOf = (m: THREE.Mesh): string => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as THREE.Material | undefined)?.name ?? '';
};

/** Heaviest bone over the whole mesh, by summed skin weight. */
function dominantBone(m: THREE.SkinnedMesh): string {
  const si = m.geometry.getAttribute('skinIndex');
  const sw = m.geometry.getAttribute('skinWeight');
  if (!si || !sw || !m.skeleton) return '';
  const total = new Map<number, number>();
  for (let i = 0; i < si.count; i++) {
    for (const c of ['x', 'y', 'z', 'w'] as const) {
      const w = (sw as THREE.BufferAttribute)[`get${c.toUpperCase()}` as 'getX'](i);
      if (w <= 0) continue;
      const b = (si as THREE.BufferAttribute)[`get${c.toUpperCase()}` as 'getX'](i);
      total.set(b, (total.get(b) ?? 0) + w);
    }
  }
  let best = -1;
  let bestW = -1;
  for (const [b, w] of total) if (w > bestW) { bestW = w; best = b; }
  return m.skeleton.bones[best]?.name.replace(/_\d+$/, '') ?? '';
}

/** Skinned world centre of a mesh. NEVER Box3.setFromObject on a skinned mesh. */
function centre(m: THREE.SkinnedMesh): THREE.Vector3 | null {
  const pos = m.geometry.getAttribute('position');
  if (!pos || pos.count === 0) return null;
  const step = Math.max(1, Math.floor(pos.count / 200));
  const v = new THREE.Vector3();
  const acc = new THREE.Vector3();
  let n = 0;
  for (let i = 0; i < pos.count; i += step) {
    v.fromBufferAttribute(pos, i);
    m.applyBoneTransform(i, v);
    m.localToWorld(v);
    acc.add(v); n++;
  }
  return n > 0 ? acc.divideScalar(n) : null;
}

// Knee height, from the rig rather than hardcoded.
let kneeY = Infinity;
for (const side of ['R', 'L'] as const) {
  scene.getObjectByName(`Leg_Armature_${side}`)?.traverse((o) => {
    if (o.name.replace(/_\d+$/, '') === 'shin_flex') {
      kneeY = Math.min(kneeY, o.getWorldPosition(new THREE.Vector3()).y);
    }
  });
}
console.log(`rodilla a y=${kneeY.toFixed(3)}\n`);

const rows: { name: string; bone: string; y: number; skin: boolean; verts: number }[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isSkinnedMesh) return;
  const bone = dominantBone(m);
  if (bone !== 'shin_flex' && bone !== 'femur_base' && bone !== 'patella') return;
  const c = centre(m);
  if (!c) return;
  rows.push({
    name: m.name,
    bone,
    y: c.y,
    skin: materialIsSkin(matNameOf(m)),
    verts: m.geometry.getAttribute('position')?.count ?? 0,
  });
});

const THIGH = kneeY + 0.08; // same margin the elbow repair uses

const wrongUp = rows.filter((r) => r.bone === 'shin_flex' && r.y > THIGH);
const wrongDown = rows.filter((r) => r.bone === 'femur_base' && r.y < kneeY - 0.08);

const show = (title: string, list: typeof rows) => {
  console.log(`${title}: ${list.length}`);
  for (const r of list.sort((a, b) => b.verts - a.verts).slice(0, 25)) {
    console.log(
      `  ${r.skin ? 'PIEL' : '    '} ${r.name.padEnd(42)} ${r.bone.padEnd(11)} ` +
        `y=${r.y.toFixed(3)}  ${String(r.verts).padStart(6)} vertices`,
    );
  }
  console.log('');
};

// Everything with skin material near the knee, whatever bone it rides.
{
  const near: typeof rows = [];
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh || !materialIsSkin(matNameOf(m))) return;
    const c = centre(m);
    if (!c || Math.abs(c.y - kneeY) > 0.14 || c.x < 0) return;
    near.push({
      name: m.name, bone: dominantBone(m), y: c.y, skin: true,
      verts: m.geometry.getAttribute('position')?.count ?? 0,
    });
  });
  console.log(`PIEL a menos de 14 cm de la rodilla (lado +x): ${near.length}`);
  for (const r of near.sort((a, b) => b.verts - a.verts)) {
    console.log(`  ${r.name.padEnd(44)} ${r.bone.padEnd(11)} y=${r.y.toFixed(3)} ${String(r.verts).padStart(6)} vertices`);
  }
  console.log('');
}

show('Atadas a shin_flex pero situadas en el MUSLO', wrongUp);
show('Atadas a femur_base pero situadas en la PIERNA', wrongDown);
console.log(
  `piel mal atada: ${wrongUp.filter((r) => r.skin).length} en el muslo, ` +
    `${wrongDown.filter((r) => r.skin).length} en la pierna\n`,
);
