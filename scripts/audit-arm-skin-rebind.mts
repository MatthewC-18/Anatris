// AL DOBLAR EL CODO, ¿QUE SE QUEDA QUIETO EN EL BRAZO?
//
// La mitad superior del brazo no se mueve cuando se dobla el codo. En este GLB
// si: buena parte de los parches de piel del brazo, y los vientres del biceps,
// el braquial y el triceps, vienen pesados al ANTEBRAZO, asi que giran
// alrededor del codo como si fuesen antebrazo. `src/lib/rigArmRebind.ts` los
// devuelve al humero al cargar.
//
// POR QUE ESTA PRUEBA EXISTE. La reparacion vivia dentro de `RigModel` y
// comparaba el nombre CRUDO del hueso dominante contra `forearm_flex`. El
// segundo armature llama al suyo `forearm_flex_1`, de modo que cogia 137 mallas
// y dejaba 136: UN BRAZO RELIGADO Y EL OTRO NO. Mirando un brazo cada vez --
// que es como se mira -- los dos parecian bien. Lo que lo delata es medir, y
// medir los dos a la vez.
//
// Tampoco lo cazaba `audit-arc-tears`, y no por descuido: alli se mide cuanto
// CRECE una malla, y estos parches no crecen, se van enteros de viaje. Son dos
// familias de fallo distintas y hacen falta las dos medidas.
//
// Lo que se comprueba aqui:
//   1. cuanto viaja cada pieza del brazo en el GLB crudo (el tamano del fallo);
//   2. que despues de `rebindArmBellies` no viaja ninguna (el arreglo), en los
//      DOS brazos.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-arm-skin-rebind.mts
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { rigGlbPath } from './lib/rigPath.mts';
import {
  armHeights,
  boneBaseName,
  dominantBoneName,
  distalArmWeight,
  isUpperArmBelly,
  rebindArmBellies,
  reweightArmAboveElbow,
} from '../src/lib/rigArmRebind.ts';
import { layerForMaterial } from '../src/lib/materialColors.ts';

/** Grados de flexion de codo a los que se mide. El maximo clinico. */
const DEG = 145;
/** Por encima de esto se considera que la pieza se ha ido de viaje, en metros. */
const TOLERANCE_M = 0.01;
/**
 * Las piezas de MEZCLA cruzan el codo a proposito, asi que se reparte su peso
 * de forma continua en vez de pegarlas a un hueso: su mitad distal SI tiene
 * que acompanar al antebrazo. Lo que se vigila en ellas es que el brazo deje
 * de arrastrarse -- de 8 cm de mediana a menos de uno -- no que queden
 * clavadas. Las otras dos familias si van pegadas, y ahi el listón es cero.
 */
const TOLERANCE_BLEND_M = 0.03;

const matNameOf = (m: THREE.Mesh): string => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as THREE.Material | undefined)?.name ?? '';
};

const classify = (mesh: THREE.Mesh): 'muscle' | 'skin' | 'other' => {
  const layer = layerForMaterial(matNameOf(mesh));
  return layer === 'muscle' ? 'muscle' : layer === 'skin' ? 'skin' : 'other';
};

/**
 * Centroide de la malla YA DEFORMADA por el esqueleto.
 *
 * `geometry.boundingSphere.center` por `matrixWorld` NO vale: el pielado no
 * toca la matriz del objeto, pasa por los pesos. Con esa cuenta los dos brazos
 * daban 0,0 cm de viaje, es decir, la medida habria dicho que no habia nada que
 * arreglar. Hay que recorrer los vertices con `applyBoneTransform`.
 */
function posedCentre(m: THREE.Mesh, out: THREE.Vector3): THREE.Vector3 {
  const pos = m.geometry.getAttribute('position');
  const sk = m as THREE.SkinnedMesh;
  const skinned = !!sk.isSkinnedMesh;
  if (skinned) sk.skeleton.update();
  const v = new THREE.Vector3();
  out.set(0, 0, 0);
  const step = Math.max(1, Math.floor(pos.count / 400));
  let n = 0;
  for (let i = 0; i < pos.count; i += step) {
    v.fromBufferAttribute(pos, i);
    if (skinned) sk.applyBoneTransform(i, v);
    m.localToWorld(v);
    out.add(v);
    n++;
  }
  return n ? out.divideScalar(n) : out;
}

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

/** Carga una copia limpia del rig: una para medir el fallo, otra el arreglo. */
async function freshScene(): Promise<THREE.Group> {
  const ld = new GLTFLoader();
  ld.setMeshoptDecoder(MeshoptDecoder);
  const gl = await new Promise<{ scene: THREE.Group }>((r, j) =>
    ld.parse(ab.slice(0), '', r as never, j),
  );
  gl.scene.updateMatrixWorld(true);
  return gl.scene;
}

interface Piece {
  mesh: THREE.Mesh;
  kind: 'piel' | 'vientre' | 'mezcla';
  arm: 'izquierdo' | 'derecho';
  before: THREE.Vector3;
}

/** Las piezas del BRAZO que no deben moverse al doblar el codo. */
function armPieces(scene: THREE.Group): Piece[] {
  const H = armHeights(scene);
  const out: Piece[] = [];
  const c = new THREE.Vector3();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !(m as THREE.SkinnedMesh).isSkinnedMesh) return;
    const kindOf = classify(m);
    let kind: 'piel' | 'vientre' | 'mezcla' | null = null;
    if (kindOf === 'muscle' && isUpperArmBelly(m.name)) kind = 'vientre';
    else if (kindOf === 'skin' && dominantBoneName(m) === 'forearm_flex') kind = 'piel';
    // MEZCLA: la piel del brazo que no es de NADIE del todo -- dominante el
    // humero, pero con medio peso en el antebrazo. Ni el religado por nombre
    // ni el religado por hueso dominante la cogian, y era la que destapaba
    // el biceps al doblar el codo. La arregla reweightArmAboveElbow.
    else if (distalArmWeight(m) > 0.05) kind = 'mezcla';
    if (!kind) return;
    posedCentre(m, c);
    if (kind !== 'vientre' && c.y <= H.upperArmY) return;
    out.push({
      mesh: m,
      kind,
      // +x es la izquierda anatomica en este GLB (ver boneMap.rigSideFor).
      arm: c.x > 0 ? 'izquierdo' : 'derecho',
      before: c.clone(),
    });
  });
  return out;
}

/** Dobla los dos codos. */
function bendBothElbows(scene: THREE.Group): void {
  const axis = new THREE.Vector3(1, 0, 0);
  for (const side of ['R', 'L'] as const) {
    const root = scene.getObjectByName(`Shoulder_Armature_${side}`);
    root?.traverse((o) => {
      if (boneBaseName(o.name) === 'forearm_flex')
        o.rotateOnAxis(axis, ((side === 'R' ? 1 : -1) * DEG * Math.PI) / 180);
    });
  }
  scene.updateMatrixWorld(true);
}

function travels(scene: THREE.Group, pieces: Piece[]): { p: Piece; travel: number }[] {
  bendBothElbows(scene);
  const v = new THREE.Vector3();
  return pieces.map((p) => ({ p, travel: posedCentre(p.mesh, v).distanceTo(p.before) }));
}

function report(label: string, rows: { p: Piece; travel: number }[]): number {
  console.log(`   ${label}`);
  let moved = 0;
  for (const arm of ['derecho', 'izquierdo'] as const) {
    for (const kind of ['piel', 'vientre', 'mezcla'] as const) {
      const g = rows.filter((r) => r.p.arm === arm && r.p.kind === kind);
      if (!g.length) continue;
      const t = g.map((r) => r.travel).sort((a, b) => a - b);
      const lim = kind === 'mezcla' ? TOLERANCE_BLEND_M : TOLERANCE_M;
      const bad = g.filter((r) => r.travel > lim).length;
      moved += bad;
      console.log(
        `     brazo ${arm.padEnd(10)} ${kind.padEnd(8)} ${String(g.length).padStart(3)} piezas   ` +
          `mediana ${(t[t.length >> 1] * 100).toFixed(1).padStart(5)} cm   ` +
          `peor ${(t[t.length - 1] * 100).toFixed(1).padStart(5)} cm   ` +
          `${bad} de viaje`,
      );
    }
  }
  return moved;
}

console.log('\n===== EL BRAZO AL DOBLAR EL CODO =====\n');
const H = armHeights(await freshScene());
console.log(
  `   codo a y=${H.elbowY.toFixed(3)}  ·  brazo propiamente dicho por encima de y=${H.upperArmY.toFixed(3)}  ·  ${DEG} grados\n`,
);

// 1. El GLB tal cual viene.
const rawScene = await freshScene();
const rawRows = travels(rawScene, armPieces(rawScene));
const rawMoved = report('GLB CRUDO, sin reparar:', rawRows);

// 2. El GLB con el religado que hace la aplicacion.
console.log('');
const fixedScene = await freshScene();
const fixedPieces = armPieces(fixedScene);
const done = rebindArmBellies(fixedScene, classify);
const mixed = reweightArmAboveElbow(fixedScene);
const fixedRows = travels(fixedScene, fixedPieces);
const fixedMoved = report(
  `CON rebindArmBellies (${done.bellies} vientres, ${done.skinPatches} parches, ${done.orphans} duplicados ocultos)` +
    ` + reweightArmAboveElbow (${mixed.vertices} vertices en ${mixed.meshes} mallas):`,
  fixedRows,
);

console.log('');
if (rawMoved === 0) {
  console.log('AVISO: el GLB crudo ya no mueve nada. O se reexporto bien, o esta');
  console.log('       prueba ha dejado de mirar donde debia.');
  process.exitCode = 1;
} else if (fixedMoved > 0) {
  const worst = fixedRows.reduce((a, b) => (b.travel > a.travel ? b : a));
  console.log(`RESULTADO: ${fixedMoved} piezas del brazo siguen viajando con el antebrazo.`);
  console.log(
    `           La peor recorre ${(worst.travel * 100).toFixed(1)} cm (${worst.p.mesh.name},`,
  );
  console.log(`           brazo ${worst.p.arm}). Mira src/lib/rigArmRebind.ts.`);
  process.exitCode = 1;
} else {
  console.log(`RESULTADO: el GLB mueve ${rawMoved} piezas del brazo que no deberia moverse;`);
  console.log('           tras el religado no se mueve ninguna, en los dos brazos.');
}
