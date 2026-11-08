// ¿QUEDA CARNE EN EL ANTEBRAZO, O SE VE EL HUESO PELADO?
//
// El recorte medido del antebrazo (`trimForearmOutliers`) oculta lo que se sale
// del miembro. Mide bien y oculta lo que debe: el problema era CUANTO acababa
// ocultando, porque el dato trae cinco grupos de musculos superficiales por
// brazo tumbados ATRAVESANDO el antebrazo -- extensor de los dedos, extensor
// del meñique, flexor profundo de los dedos, flexor largo del pulgar, palmar
// largo y sus mitades tendinosas. Son discos planos: ocupan 1,4-2,7 cm del
// largo del antebrazo y se abren 11,8-14,9 cm en radio (ver `isCrosswise`).
//
// La consecuencia no se veia mirando una lista de mallas ocultas: se veia
// mirando DONDE quedaban las que sobrevivian. El ultimo cuarto del antebrazo se
// quedaba hueco, y ahi dentro siguen el radio y el cubito. Con la piel en modo
// fantasma -- que existe para ensenar el musculo de debajo -- ese tramo no
// ensenaba musculo ninguno: ensenaba hueso pelado pegado a una mano opaca.
//
// YA NO. `src/lib/rigForearmUnmangle.ts` endereza esas mallas en carga con el
// giro medido contra el GLB de Explorar, que las trae bien colocadas, y el
// recorte ya no tiene nada que ocultar ahi. Este banco es lo que lo vigila:
// mide el perfil de relleno del codo (t=0) a la muneca (t=1) en los dos brazos
// y FALLA si cualquiera de los diez tramos baja de `FULL_ENOUGH`. Antes del
// arreglo los dos ultimos daban 32% y 22%; ahora los diez dan 100%.
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

/** Radio de muestreo alrededor del eje: mas alla ya no es el antebrazo. */
const SLEEVE_M = 0.08;
/**
 * Minimo de musculo en pantalla por tramo. Medido tras enderezar las mallas
 * tumbadas (`src/lib/rigForearmUnmangle.ts`): los diez tramos dan 100% en los
 * dos brazos. Antes de aquello los dos ultimos daban 32% y 22%.
 */
const FULL_ENOUGH = 0.9;
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
    `minimo exigido ${Math.round(FULL_ENOUGH * 100)}% en cada tramo`,
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
    const yMid = heights.elbowY - ((i + 0.5) / BINS) * (heights.elbowY - heights.wristY);
    const bar = '#'.repeat(Math.round(frac * 30)).padEnd(30, '.');
    let nota = '';
    if (frac < FULL_ENOUGH) {
      nota = '  HUECO: aqui la piel fantasma ensena hueso pelado';
      fail++;
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
    ? '  El antebrazo tiene carne en toda su longitud, en los dos brazos.'
    : `  ${fail} tramo(s) del antebrazo sin musculo que ensenar.`,
);
if (fail > 0) process.exitCode = 1;
