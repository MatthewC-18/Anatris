// Is any mesh being torn apart by a movement, in ANY region?
//
// The abdominal wall was: a y-only rule meant for the forearm caught the lumbar
// muscles, rebound part of them to the humerus, and at 150 deg of abduction the
// whole trunk wall was dragged 0.7 m across the chest as a sheet. A mesh being
// pulled apart like that has a signature that needs no eye: the SPREAD of how far
// its vertices travel from the rest pose. A mesh that rides one bone has a small
// spread (it moves as a piece); a mesh that rotates about a joint has a spread of
// the order of its own length; a mesh torn between two bones that go different
// ways has a spread far bigger than the mesh is.
//
// The number reported is how much bigger the mesh GETS: the diagonal of its
// posed bounding box against the diagonal of its resting one. A mesh that rides
// bones which move together keeps its size whatever it travels -- 1.0x -- and a
// mesh whose ends are being pulled to different places grows. The abdominal wall
// read 4.0x. How far a mesh MOVES says nothing on its own: a thin strip down the
// arm travels 30 cm at 180 deg and is perfectly intact.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-arc-tears.mts
//   MOVES=a,b   only these movement ids
//   TOP=5       worst meshes listed per movement
//   FLAG=3      ratio at or above which a movement is reported as failing
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { ALL_ROM_BY_REGION } from '../src/data/fullContent.ts';
import { getBoneControl } from '../src/lib/boneMap.ts';
import { buildLabArc } from '../src/lib/romPhaseAtAngle.ts';
import { applyMirrorRepair } from './lib/mirrorRepair.mts';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, type Side } from './lib/rigPose.mts';

const ONLY = (process.env.MOVES ?? '').split(',').filter(Boolean);
const TOP = Number(process.env.TOP ?? 3);
const FLAG = Number(process.env.FLAG ?? 3);
const SIDE = (process.env.SIDE ?? 'R') as Side;
/** Meshes smaller than this are ignored: a 2 cm fleck has a noisy ratio. */
const MIN_SIZE_M = 0.03;
/** Vertices sampled per mesh. */
const SAMPLES = 120;

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);

interface Row { move: string; region: string; ratio: number; mesh: string; spread: number; deg: number }
const failures: Row[] = [];

for (const [region, list] of Object.entries(ALL_ROM_BY_REGION)) {
  for (const mv of list) {
    if (ONLY.length > 0 && !ONLY.includes(mv.id)) continue;
    const ctrl = getBoneControl(mv.id);
    if (!ctrl || (ctrl.kind !== 'chain' && ctrl.kind !== 'joint')) continue;

    // A fresh scene per movement: the poser mutates weights at construction, and
    // a movement must not be judged on the leftovers of the one before it.
    const gl = await new Promise<any>((r, j) => ld.parse(ab.slice(0), '', r, j));
    const scene = gl.scene as THREE.Group;
    scene.updateMatrixWorld(true);
    applyMirrorRepair(scene);
    let poser;
    try {
      poser = createRigPoser(scene, mv.id, SIDE, true);
    } catch {
      continue; // not actionable on this rig
    }

    // Rest sample: which vertices to watch, and how big the mesh is at rest.
    const meshes: { mesh: THREE.SkinnedMesh; idx: number[]; size: number }[] = [];
    const _v = new THREE.Vector3();
    const box = new THREE.Box3();
    scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isMesh || !m.isSkinnedMesh || !m.visible || !m.skeleton) return;
      const pos = m.geometry.getAttribute('position');
      if (!pos || pos.count < 12) return;
      const step = Math.max(1, Math.floor(pos.count / SAMPLES));
      const idx: number[] = [];
      box.makeEmpty();
      for (let i = 0; i < pos.count; i += step) {
        _v.fromBufferAttribute(pos, i);
        m.localToWorld(_v);
        idx.push(i);
        box.expandByPoint(_v);
      }
      // Measured on the SAMPLE, so the rest and posed sizes are the same
      // estimator and their ratio is not biased by how coarsely we sampled.
      const size = box.getSize(new THREE.Vector3()).length();
      if (size < MIN_SIZE_M) return;
      meshes.push({ mesh: m, idx, size });
    });

    const arc = buildLabArc(mv);
    const steps = 6;
    let worst: Row | null = null;
    for (let s = 0; s <= steps; s++) {
      const deg = arc.min + ((arc.max - arc.min) * s) / steps;
      poser.pose(deg);
      for (const { mesh, idx, size } of meshes) {
        const pos = mesh.geometry.getAttribute('position');
        box.makeEmpty();
        for (const i of idx) {
          _v.fromBufferAttribute(pos, i);
          mesh.applyBoneTransform(i, _v);
          mesh.localToWorld(_v);
          box.expandByPoint(_v);
        }
        const posed = box.getSize(new THREE.Vector3()).length();
        const ratio = posed / size;
        if (!worst || ratio > worst.ratio) {
          worst = { move: mv.id, region, ratio, mesh: mesh.name, spread: posed - size, deg };
        }
      }
    }
    if (!worst) continue;
    const mark = worst.ratio >= FLAG ? 'TEAR' : '  ok';
    console.log(
      `${mark}  ${region.padEnd(10)} ${mv.id.padEnd(34)} ` +
        `peor ${worst.ratio.toFixed(1)}x (+${(worst.spread * 100).toFixed(0)} cm) ` +
        `${worst.mesh.slice(0, 34)} @ ${worst.deg.toFixed(0)} deg`,
    );
    if (worst.ratio >= FLAG) failures.push(worst);
  }
}

console.log(
  failures.length === 0
    ? `\nSin desgarros: ninguna malla se separa ${FLAG}x su propio tamano en ningun arco.`
    : `\n${failures.length} movimiento(s) con desgarro.`,
);
if (failures.length > 0) process.exitCode = 1;
