// ¿QUEDA CARNE EN EL ANTEBRAZO, O SE VE EL HUESO PELADO?
//
// El recorte medido del antebrazo (`trimForearmOutliers`) oculta lo que se sale
// del miembro. Mide bien y oculta lo que debe: el problema es CUANTO acaba
// ocultando, porque el dato trae seis musculos superficiales por brazo tumbados
// ATRAVESANDO el antebrazo -- extensor de los dedos, extensor del meñique,
// flexor profundo de los dedos, flexor largo del pulgar, palmar largo y sus
// mitades tendinosas. Son discos planos: ocupan 1,4-2,7 cm del largo del
// antebrazo y se abren 11,8-14,9 cm en radio. Estan rotos en los DOS brazos,
// asi que no hay gemelo bueno del que copiar y no hay nada que hacer con ellos
// salvo esconderlos (ver `isCrosswise`).
//
// La consecuencia no se ve mirando una lista de mallas ocultas: se ve mirando
// DONDE quedan las que sobreviven. El ultimo cuarto del antebrazo se queda
// hueco, y ahi dentro siguen el radio y el cubito. Con la piel en modo fantasma
// -- que existe para ensenar el musculo de debajo -- ese tramo no ensena musculo
// ninguno: ensena hueso pelado pegado a una mano opaca.
//
// Este banco mide el perfil de relleno del codo (t=0) a la muneca (t=1), en los
// dos brazos, y comprueba que:
//   1. los tres primeros cuartos del antebrazo siguen llenos (si se vacian, el
//      recorte se ha vuelto agresivo y hay que mirarlo);
//   2. el tramo que SI esta hueco queda cubierto por `inForearmHollow`, que es
//      lo que hace que ahi la piel baje solida hasta el casquete de la mano.
//
// Run: npm run audit-forearm-fill
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser } from './lib/rigPose.mts';
import { layerForMaterial } from '../src/lib/materialColors.ts';
import { armHeights, boneBaseName } from '../src/lib/rigArmRebind.ts';
import { forearmHollowTop } from '../src/lib/rigLimbTrim.ts';

/** Radio de muestreo alrededor del eje: mas alla ya no es el antebrazo. */
const SLEEVE_M = 0.08;
/** Por debajo de esto un tramo se considera hueco. */
const FULL_ENOUGH = 0.6;
const BINS = 10;

const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const buf = readFileSync(rigGlbPath());
const gltf = await ld.parseAsync(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  '',
);
const scene = gltf.scene;
// El mismo preparado que la aplicacion hace al cargar, recorte incluido.
createRigPoser(scene, 'glenohumeral-abduction', 'R');
scene.updateMatrixWorld(true);

const heights = armHeights(scene);
const hollowTop = forearmHollowTop(heights);

function joints(side: 'R' | 'L'): { E: THREE.Vector3; W: THREE.Vector3 } | null {
  const root = scene.getObjectByName(`Shoulder_Armature_${side}`);
  if (!root) return null;
  let E: THREE.Vector3 | null = null;
  let W: THREE.Vector3 | null = null;
  root.traverse((o) => {
    const bn = boneBaseName(o.name);
    if (bn === 'forearm_flex' && !E) E = o.getWorldPosition(new THREE.Vector3());
    else if (bn === 'hand_flex' && !W) W = o.getWorldPosition(new THREE.Vector3());
  });
  return E && W ? { E, W } : null;
}

console.log('===== QUEDA CARNE EN EL ANTEBRAZO =====');
console.log(
  `codo y=${heights.elbowY.toFixed(3)}  muneca y=${heights.wristY.toFixed(3)}  ` +
    `tramo hueco por debajo de y=${hollowTop.toFixed(3)}`,
);
console.log('');

let fail = 0;
const v = new THREE.Vector3();
for (const side of ['R', 'L'] as const) {
  const j = joints(side);
  if (!j) continue;
  const sign = side === 'R' ? 1 : -1;
  const axis = new THREE.Vector3().subVectors(j.W, j.E);
  const L2 = axis.lengthSq();
  const vis = new Array(BINS).fill(0);
  const hid = new Array(BINS).fill(0);

  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (layerForMaterial((mat as THREE.Material | undefined)?.name) !== 'muscle') return;
    const pos = mesh.geometry.getAttribute('position');
    if (!pos) return;
    const step = Math.max(1, Math.floor(pos.count / 400));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i);
      mesh.localToWorld(v);
      if (Math.sign(v.x) !== sign || Math.abs(v.x) < 0.10) continue;
      const d = v.clone().sub(j.E);
      const t = d.dot(axis) / L2;
      if (t < 0 || t > 1) continue;
      if (d.addScaledVector(axis, -t).length() > SLEEVE_M) continue;
      const bin = Math.min(BINS - 1, Math.floor(t * BINS));
      if (mesh.visible) vis[bin]++;
      else hid[bin]++;
    }
  });

  console.log(`--- brazo ${side} (x${sign > 0 ? '>' : '<'}0), del codo a la muneca ---`);
  for (let i = 0; i < BINS; i++) {
    const tot = vis[i] + hid[i];
    const frac = tot > 0 ? vis[i] / tot : 1;
    // Altura real de este tramo, para contrastarla con el limite del hueco.
    const yMid = heights.elbowY - ((i + 0.5) / BINS) * (heights.elbowY - heights.wristY);
    const cubierto = yMid < hollowTop;
    const bar = '#'.repeat(Math.round(frac * 30)).padEnd(30, '.');
    let nota = '';
    if (frac < FULL_ENOUGH) {
      nota = cubierto
        ? '  hueco, y la piel baja solida aqui'
        : '  HUECO Y SIN CUBRIR: la piel fantasma ensena hueso pelado';
      if (!cubierto) fail++;
    }
    console.log(
      `  t ${(i / BINS).toFixed(1)}-${((i + 1) / BINS).toFixed(1)}  y=${yMid.toFixed(3)}  ` +
        `${bar} ${String(Math.round(frac * 100)).padStart(3)}% en pantalla${nota}`,
    );
  }
  console.log('');
}

console.log('===== RESUMEN =====');
console.log(
  fail === 0
    ? '  Todo tramo hueco del antebrazo queda bajo piel solida.'
    : `  ${fail} tramo(s) hueco(s) fuera del alcance de inForearmHollow.`,
);
if (fail > 0) process.exitCode = 1;
