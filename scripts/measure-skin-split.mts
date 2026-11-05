// scripts/measure-skin-split.mts
//
// DONDE SE ABRE LA PIEL AL MOVERSE, en milimetros y con nombre.
//
// La piel de este modelo no es una superficie: son unas 250 teselas
// independientes que en reposo encajan (y en muchos sitios SE SOLAPAN sin
// llegar a tocarse). Al posar, dos teselas vecinas que obedecen a huesos
// distintos se separan, y lo que el usuario ve es un desgarro o un trozo de
// musculo asomando por una rendija.
//
// Hay dos fallos distintos y conviene no confundirlos, porque se arreglan de
// forma distinta:
//
//   COSTURA ROTA   los vertices coincidian en reposo (misma posicion, distinta
//                  tesela) y al posar se separan. Es un problema de PESOS:
//                  dos copias del mismo punto siguiendo huesos distintos.
//                  Se arregla repartiendo pesos (`relaxSkinSeams`, o un pase
//                  por altura como los del codo, la cadera y el tobillo).
//   SOLAPE PERDIDO los vertices NO coincidian: las teselas se montaban una
//                  sobre otra y al moverse han dejado de hacerlo. No hay
//                  costura que soldar; lo que falla es que al modelo le falta
//                  piel ahi, y eso no se arregla con pesos.
//
// Este script mide las dos. Primero busca pares de vertices coincidentes en
// reposo (a menos de 1 mm) de teselas DISTINTAS y mide cuanto se separan; eso
// es la primera. Luego, para cada tesela, mide cuanto se aleja su borde del
// borde de su vecina mas cercana; eso aproxima la segunda.
//
// Uso:
//   npx tsx --tsconfig tsconfig.scripts.json scripts/measure-skin-split.mts \
//     [movementId] [grados] [--side=L]

import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { createRigPoser, type Side } from './lib/rigPose.mts';
import { rigGlbPath } from './lib/rigPath.mts';
import { layerForMaterial } from '../src/lib/materialColors.ts';

const args = process.argv.slice(2);
const MOVEMENT = args[0] ?? 'glenohumeral-abduction';
const DEG = Number(args[1] ?? 170);
const SIDE: Side = args.includes('--side=L') ? 'L' : 'R';

/** Dos vertices a menos de esto en reposo son el MISMO punto, duplicado. */
const WELD_M = 0.001;
/** Por debajo de esto una separacion es ruido del posado, no una grieta. */
const REPORT_M = 0.004;

const buf = readFileSync(rigGlbPath());
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  '',
);
const scene = gltf.scene;
const poser = createRigPoser(scene, MOVEMENT, SIDE);

const skins: THREE.SkinnedMesh[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isSkinnedMesh) return;
  const first = Array.isArray(m.material) ? m.material[0] : m.material;
  if (layerForMaterial((first as THREE.Material | undefined)?.name ?? '') !== 'skin') return;
  skins.push(m);
});

/** Posiciones de mundo CON piel aplicada. `localToWorld` a secas no la aplica. */
function posed(m: THREE.SkinnedMesh): THREE.Vector3[] {
  const pos = m.geometry.getAttribute('position');
  const out: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  m.skeleton.update();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    m.applyBoneTransform(i, v);
    m.localToWorld(v);
    out.push(v.clone());
  }
  return out;
}

poser.pose(0);
scene.updateMatrixWorld(true);
const rest = skins.map(posed);

// --- indice de vertices coincidentes en reposo ---
const cell = (p: THREE.Vector3) =>
  `${Math.round(p.x / WELD_M)},${Math.round(p.y / WELD_M)},${Math.round(p.z / WELD_M)}`;
const index = new Map<string, [number, number][]>();
rest.forEach((ps, mi) =>
  ps.forEach((p, vi) => {
    const k = cell(p);
    const l = index.get(k);
    if (l) l.push([mi, vi]);
    else index.set(k, [[mi, vi]]);
  }),
);

poser.pose(DEG);
scene.updateMatrixWorld(true);
const now = skins.map(posed);

interface Pair {
  max: number;
  n: number;
  at: THREE.Vector3;
}
const welded = new Map<string, Pair>();
for (const list of index.values()) {
  if (list.length < 2) continue;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const [ma, va] = list[i];
      const [mb, vb] = list[j];
      if (ma === mb) continue;
      const d = now[ma][va].distanceTo(now[mb][vb]);
      if (d < REPORT_M) continue;
      const key = [skins[ma].name, skins[mb].name].sort().join('  <->  ');
      const e = welded.get(key);
      if (e) {
        e.n++;
        if (d > e.max) {
          e.max = d;
          e.at = now[ma][va];
        }
      } else welded.set(key, { max: d, n: 1, at: now[ma][va] });
    }
  }
}

console.log(`\n${MOVEMENT} a ${DEG} grados, lado ${SIDE} (geometrico)`);
console.log(`${skins.length} teselas de piel\n`);
console.log('--- COSTURAS ROTAS (vertices que eran el mismo punto y ya no) ---');
if (!welded.size) {
  console.log('  ninguna. Lo que se abra aqui NO es una costura: es solape perdido.\n');
} else {
  console.log('  separa   pares   teselas');
  [...welded.entries()]
    .sort((a, b) => b[1].max - a[1].max)
    .slice(0, 15)
    .forEach(([k, v]) =>
      console.log(`  ${(v.max * 100).toFixed(1).padStart(5)} cm  ${String(v.n).padStart(5)}   ${k}`),
    );
  console.log('');
}

// --- solape perdido: cuanto se aleja cada tesela de su vecina mas cercana ---
//
// Se compara el vertice mas cercano de OTRA tesela, en reposo y posado. Si en
// reposo tenia una vecina a 2 mm y ahora la mas cercana esta a 3 cm, por ahi se
// ve el interior.
function nearestOther(
  sets: THREE.Vector3[][],
  mi: number,
  p: THREE.Vector3,
  limit: number,
): number {
  let best = limit;
  for (let k = 0; k < sets.length; k++) {
    if (k === mi) continue;
    for (const q of sets[k]) {
      const d = p.distanceTo(q);
      if (d < best) best = d;
    }
  }
  return best;
}

// Solo en la zona que se ha movido, o esto tarda una eternidad.
const movedBand = (() => {
  let lo = Infinity;
  let hi = -Infinity;
  rest.forEach((ps, mi) =>
    ps.forEach((p, vi) => {
      if (p.distanceTo(now[mi][vi]) < 0.001) return;
      lo = Math.min(lo, p.y, now[mi][vi].y);
      hi = Math.max(hi, p.y, now[mi][vi].y);
    }),
  );
  return { lo: lo - 0.05, hi: hi + 0.05 };
})();

const band = (ps: THREE.Vector3[]) => ps.filter((p) => p.y >= movedBand.lo && p.y <= movedBand.hi);
const restB = rest.map(band);
const nowB = now.map(band);

interface Gap {
  mesh: string;
  grew: number;
  from: number;
  to: number;
  at: THREE.Vector3;
}
const gaps: Gap[] = [];
const LIMIT = 0.05;
skins.forEach((m, mi) => {
  if (!nowB[mi].length) return;
  let worst: Gap | null = null;
  const step = Math.max(1, Math.floor(restB[mi].length / 40));
  for (let i = 0; i < restB[mi].length; i += step) {
    const d0 = nearestOther(restB, mi, restB[mi][i], LIMIT);
    const d1 = nearestOther(nowB, mi, nowB[mi][i], LIMIT);
    const grew = d1 - d0;
    if (!worst || grew > worst.grew) {
      worst = { mesh: m.name, grew, from: d0, to: d1, at: nowB[mi][i] };
    }
  }
  if (worst && worst.grew > REPORT_M) gaps.push(worst);
});

console.log('--- SOLAPE PERDIDO (la tesela vecina se ha ido) ---');
if (!gaps.length) console.log('  nada por encima del ruido.\n');
else {
  console.log('  crece   reposo -> posado   tesela');
  gaps
    .sort((a, b) => b.grew - a.grew)
    .slice(0, 15)
    .forEach((g) =>
      console.log(
        `  ${(g.grew * 100).toFixed(1).padStart(5)} cm  ${(g.from * 100).toFixed(1)} -> ${(
          g.to * 100
        ).toFixed(1)} cm   ${g.mesh}`,
      ),
    );
  console.log('');
}
