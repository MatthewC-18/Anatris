// HORNEA LO QUE ESCRIBEN LOS DOS PASES DE PESO MAS CAROS.
//
// `redistributeSkinRootWeight` y `relaxSkinSeams` cuestan 3,4 s de los 6,8-7,6 s
// que tarda en prepararse el rig (medido en el navegador con src/lib/bootClock.ts)
// y escriben 7.926 vertices de 1.000.527: el 0,79%. Lo que cuesta es la BUSQUEDA
// --una rejilla espacial sobre todo el musculo y el conectivo en uno, un
// recorrido de costuras con difusion por anillos en el otro--, y esa busqueda da
// siempre el mismo resultado porque el GLB es fijo.
//
// Este script corre la cadena de verdad una vez, mira QUE vertices dejaron
// marcados los dos pases (`seamSettled` y `skinRootSettled`) y lee sus pesos.
//
// EL MOMENTO EN QUE SE LEE IMPORTA, y costo 601 vertices descubrirlo: hay que
// leer JUSTO DESPUES de los dos pases, no al final de la cadena.
// `reweightArmAboveElbow` corre mas tarde, reescribe vertices del codo y no es
// idempotente, asi que una tabla con su resultado dentro se lo comeria dos veces
// (medido: hasta 0,237 de diferencia de peso en las seis mallas del codo). Por
// eso scripts/lib/rigPose.mts llama a `__anatrisBakeSnapshot` en ese punto
// exacto -- un gancho que solo existe en el banco.
//
// POR QUE LOS PESOS DE DESPUES DE LOS DOS Y NO LOS DE CADA UNO: son consecutivos
// y el segundo reescribe vertices del primero. Guardar el estado de despues de
// los dos es lo unico que reproduce la escena.
//
// POR QUE NOMBRES DE HUESO Y NO INDICES: `skinIndex` apunta a
// `mesh.skeleton.bones`, que es una lista POR MALLA. El indice 3 no significa lo
// mismo en dos mallas y un reexport que reordene los huesos lo cambia sin que
// nada falle a la vista.
//
// Comprobarlo: `npm run audit-skin-weight-bake` compara la tabla contra los
// pases de verdad, vertice a vertice, sobre el millon de vertices.
//
// Run: npm run build-skin-weight-bake

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser } from './lib/rigPose.mts';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = resolve(REPO, 'src/data/rigSkinWeightBake.ts');
// u32 indice | u8 x4 paleta | u16 x4 peso | u8 banderas | 3 B de relleno.
//
// LAS BANDERAS NO SON ADORNO, y costo 294 vertices averiguarlo:
// `reweightArmAboveElbow` LEE `mesh.userData.seamSettled` para no deshacer lo
// que la soldadura de costuras resolvio (src/lib/rigArmRebind.ts:128). Si la
// tabla no reconstruye esa marca, ese pase pisa vertices que en la version con
// pases respetaba, y el brazo posterior sale con hasta 0,62 de diferencia de
// peso. Bit 0 = lo asento la costura; bit 1 = lo escribio el reparto de raiz.
const STRIDE = 2 + 4 + 8 + 1;

interface Fila {
  n: string;
  b: string[];
  d: string;
}

const filas: Fila[] = [];
let totalVertices = 0;
let totalBytes = 0;
const sinNombre: string[] = [];

/** Lee los pesos de los vertices marcados de una malla y los mete en la tabla. */
function leer(mesh: THREE.SkinnedMesh, quiero: { vi: number; f: number }[]): void {
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  if (!si || !sw) return;

  // Paleta de nombres de hueso: solo los que esta malla usa en esos vertices.
  const paleta: string[] = [];
  const idxPaleta = new Map<number, number>();
  const slot = (bi: number): number => {
    const ya = idxPaleta.get(bi);
    if (ya !== undefined) return ya;
    const nombre = mesh.skeleton.bones[bi]?.name;
    if (!nombre) throw new Error(`${mesh.name}: hueso ${bi} sin nombre`);
    paleta.push(nombre);
    idxPaleta.set(bi, paleta.length - 1);
    return paleta.length - 1;
  };

  const buf = new Uint8Array(quiero.length * STRIDE);
  const dv = new DataView(buf.buffer);
  let escritos = 0;
  for (const { vi, f } of quiero) {
    const o = escritos * STRIDE;
    if (vi > 0xffff) throw new Error(`${mesh.name}: vertice ${vi} no cabe en u16`);
    let suma = 0;
    const w = [0, 0, 0, 0];
    for (let k = 0; k < 4; k++) {
      w[k] = sw.getComponent(vi, k);
      suma += w[k];
    }
    if (suma <= 1e-6) continue;
    dv.setUint16(o, vi, true);
    for (let k = 0; k < 4; k++) {
      const s = slot(si.getComponent(vi, k));
      if (s > 255) throw new Error(`${mesh.name}: paleta de mas de 256 huesos`);
      buf[o + 2 + k] = s;
      dv.setUint16(o + 6 + k * 2, Math.round((w[k] / suma) * 65535), true);
    }
    buf[o + 14] = f;
    escritos++;
  }
  if (escritos === 0) return;

  const usado = buf.subarray(0, escritos * STRIDE);
  filas.push({ n: mesh.name, b: paleta, d: Buffer.from(usado).toString('base64') });
  totalVertices += escritos;
  totalBytes += usado.byteLength;
}

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

// El horneado tiene que correr con los pases DE VERDAD, no con la tabla vieja.
process.env.ANATRIS_NO_BAKE = '1';

let hecha = false;
(globalThis as {
  __anatrisBakeSnapshot?: (e: string, s: THREE.Object3D) => void;
}).__anatrisBakeSnapshot = (etiqueta, s) => {
  // La cadena marca cinco puntos (ver `marca` en scripts/lib/rigPose.mts). Este
  // horneado solo quiere el de despues de los dos pases caros.
  if (etiqueta !== 'peso:despues') return;
  if (hecha) return;
  hecha = true;
  const lista: { mesh: THREE.SkinnedMesh; vis: { vi: number; f: number }[] }[] = [];
  s.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
    const costura = mesh.userData.seamSettled as Uint8Array | undefined;
    const raiz = mesh.userData.skinRootSettled as Uint8Array | undefined;
    if (!costura && !raiz) return;
    if (!mesh.name) {
      sinNombre.push('(malla sin nombre)');
      return;
    }
    const si = mesh.geometry.getAttribute('skinIndex');
    if (!si) return;
    const vis: { vi: number; f: number }[] = [];
    for (let i = 0; i < si.count; i++) {
      const f = (costura && costura[i] ? 1 : 0) | (raiz && raiz[i] ? 2 : 0);
      if (f) vis.push({ vi: i, f });
    }
    if (vis.length) lista.push({ mesh, vis });
  });
  for (const { mesh, vis } of lista) leer(mesh, vis);
};

const scene = await cargar(rigGlbPath());
// La cadena completa que corre la aplicacion al cargar. `apply: false` deja
// fuera solo los extras de pose; los pases de malla y de peso corren igual.
createRigPoser(scene, 'glenohumeral-abduction', 'R', false);

if (!hecha) {
  console.error('El gancho __anatrisBakeSnapshot no se llamo: revisa scripts/lib/rigPose.mts');
  process.exit(1);
}

filas.sort((a, b) => a.n.localeCompare(b.n));

const cabecera = `// GENERADO POR \`npm run build-skin-weight-bake\`. NO EDITAR A MANO.
//
// Los pesos de piel que escriben \`relaxSkinSeams\` y \`redistributeSkinRootWeight\`,
// medidos una vez contra el GLB publicado. El porque esta en
// src/lib/rigSkinWeightBake.ts; el verificador, en
// \`npm run audit-skin-weight-bake\`.
//
// ${filas.length} mallas, ${totalVertices.toLocaleString('es')} vertices, ${(totalBytes / 1024).toFixed(0)} KB en binario.
//
// Formato de \`d\`: base64 de un bloque de ${STRIDE} B por vertice --
//   u16 indice de vertice | u8 x4 ranura en la paleta \`b\` | u16 x4 peso (x65535)
//   | u8 banderas (bit 0 costura, bit 1 raiz).
// La paleta guarda NOMBRES de hueso porque \`skinIndex\` es por malla, y las
// banderas reconstruyen \`seamSettled\`, que \`reweightArmAboveElbow\` lee.

export interface BakedMesh {
  /** Nombre de la malla en el GLB. */
  n: string;
  /** Paleta de nombres de hueso de esta malla. */
  b: string[];
  /** Bloque base64, ${STRIDE} B por vertice. */
  d: string;
}

export const SKIN_WEIGHT_BAKE: readonly BakedMesh[] = [
`;

const cuerpo = filas
  .map((f) => `  { n: ${JSON.stringify(f.n)}, b: ${JSON.stringify(f.b)}, d: ${JSON.stringify(f.d)} },`)
  .join('\n');

writeFileSync(SALIDA, `${cabecera}${cuerpo}\n];\n`, 'utf8');

console.log(`Escrito ${SALIDA}`);
console.log(`  ${filas.length} mallas, ${totalVertices.toLocaleString('es')} vertices`);
console.log(`  ${(totalBytes / 1024).toFixed(0)} KB binario -> ${((totalBytes * 4) / 3 / 1024).toFixed(0)} KB de base64`);
if (sinNombre.length) console.log(`  AVISO: ${sinNombre.length} mallas sin nombre, no se pueden hornear`);
