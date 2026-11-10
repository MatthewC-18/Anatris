// LA TABLA HORNEADA TIENE QUE DAR EL MISMO RIG QUE LOS PASES.
//
// `npm run build-skin-weight-bake` guarda lo que escriben `relaxSkinSeams` y
// `redistributeSkinRootWeight` para ahorrarse 3,4 s de busqueda en cada
// arranque. Una tabla asi solo vale si se puede demostrar que no cambia nada, y
// una tabla contra un GLB reexportado es un resto de otro modelo.
//
// Este verificador carga el GLB DOS VECES en el mismo proceso: una corre los dos
// pases de verdad (ANATRIS_NO_BAKE=1) y otra aplica la tabla. Luego compara, por
// cada vertice con esqueleto, el peso que cada HUESO acaba teniendo -- por
// nombre, no por indice, porque `skinIndex` es una lista por malla.
//
// Lo que se mide y por que ese umbral:
//   - diferencia maxima de peso por hueso. Los pesos van cuantizados a u16, asi
//     que el error de ida y vuelta es <= 1/65535 = 1,5e-5. Se exige < 1e-4.
//   - vertices que difieren por encima del umbral: tienen que ser CERO.
//   - mallas de la tabla que ya no existen, o con huesos que faltan: CERO.
//
// Run: npm run audit-skin-weight-bake

import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser } from './lib/rigPose.mts';
import { SKIN_WEIGHT_BAKE } from '../src/data/rigSkinWeightBake.ts';

const TOLERANCIA = 1e-4;

async function cargar(path: string): Promise<THREE.Group> {
  const buf = readFileSync(path);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return await new Promise((res, rej) => {
    loader.parse(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      '',
      (g) => res(g.scene as THREE.Group),
      rej,
    );
  });
}

/** Peso por NOMBRE de hueso de un vertice. */
function mezcla(mesh: THREE.SkinnedMesh, vi: number): Map<string, number> {
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  const m = new Map<string, number>();
  for (let k = 0; k < 4; k++) {
    const w = sw.getComponent(vi, k);
    if (w <= 0) continue;
    const b = mesh.skeleton.bones[si.getComponent(vi, k)];
    if (!b) continue;
    m.set(b.name, (m.get(b.name) ?? 0) + w);
  }
  return m;
}

const ruta = rigGlbPath();

process.env.ANATRIS_NO_BAKE = '1';
const conPases = await cargar(ruta);
createRigPoser(conPases, 'glenohumeral-abduction', 'R', false);

delete process.env.ANATRIS_NO_BAKE;
const conTabla = await cargar(ruta);
createRigPoser(conTabla, 'glenohumeral-abduction', 'R', false);

const porNombreA = new Map<string, THREE.SkinnedMesh>();
conPases.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (m.isSkinnedMesh && m.name) porNombreA.set(m.name, m);
});

let vertices = 0;
let peores: { malla: string; vi: number; d: number; hueso: string }[] = [];
let maxDif = 0;
let fuera = 0;
const mallasSinPareja: string[] = [];

conTabla.traverse((o) => {
  const B = o as THREE.SkinnedMesh;
  if (!B.isSkinnedMesh || !B.name) return;
  const A = porNombreA.get(B.name);
  if (!A) {
    mallasSinPareja.push(B.name);
    return;
  }
  const n = Math.min(
    A.geometry.getAttribute('skinIndex')?.count ?? 0,
    B.geometry.getAttribute('skinIndex')?.count ?? 0,
  );
  for (let vi = 0; vi < n; vi++) {
    const ma = mezcla(A, vi);
    const mb = mezcla(B, vi);
    const huesos = new Set([...ma.keys(), ...mb.keys()]);
    let peor = 0;
    let quien = '';
    for (const h of huesos) {
      const d = Math.abs((ma.get(h) ?? 0) - (mb.get(h) ?? 0));
      if (d > peor) {
        peor = d;
        quien = h;
      }
    }
    vertices++;
    if (peor > maxDif) maxDif = peor;
    if (peor > TOLERANCIA) {
      fuera++;
      peores.push({ malla: B.name, vi, d: peor, hueso: quien });
    }
  }
});

peores.sort((a, b) => b.d - a.d);
peores = peores.slice(0, 12);

console.log('HORNEADO DE PESOS DE PIEL - tabla contra pases');
console.log(`  tabla: ${SKIN_WEIGHT_BAKE.length} mallas`);
console.log(`  comparados: ${vertices.toLocaleString('es')} vertices con esqueleto`);
console.log(`  diferencia maxima de peso por hueso: ${maxDif.toExponential(2)} (umbral ${TOLERANCIA})`);
console.log(`  vertices fuera de umbral: ${fuera}`);
if (mallasSinPareja.length) {
  console.log(`  mallas sin pareja: ${mallasSinPareja.length} (${mallasSinPareja.slice(0, 5).join(', ')})`);
}
if (peores.length) {
  console.log('  los peores:');
  for (const p of peores) console.log(`    ${p.d.toExponential(2)}  ${p.malla}[${p.vi}] ${p.hueso}`);
}

const ok = fuera === 0 && mallasSinPareja.length === 0 && SKIN_WEIGHT_BAKE.length > 0;
console.log(ok ? '\nOK: la tabla reproduce los pases.' : '\nFALLA: vuelve a correr `npm run build-skin-weight-bake`.');
process.exit(ok ? 0 : 1);
