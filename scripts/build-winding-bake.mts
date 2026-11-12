// HORNEA QUE TRIANGULOS DEL MUSCULO Y DEL HUESO GIRAN CONTRA SUS NORMALES.
//
// Ver src/lib/rigWindingBake.ts para el porque (553 ms en la carga para 4.623
// triangulos). Este script corre la MISMA cadena que RigModel hasta el punto
// donde se aplica la tabla --reparacion de espejos, desenredo del antebrazo y
// `repairFaceWinding`; los pases de la piel no tocan nada de esto-- y apunta, por
// malla, las posiciones de los triangulos que giran contra la normal media de
// sus vertices.
//
// La piel NO entra: la arregla `agreeTriangleWinding` en vivo (28.000
// triangulos, unos milisegundos), y asi queda cubierta tambien la que cambie de
// material o de capa.
//
// Una fila por GEOMETRIA, no por malla: dos mallas que comparten geometria
// comparten indice, y listarla dos veces la invertiria dos veces (la segunda
// contaria como `stale`).
//
// Comprobarlo: npm run audit-winding-bake.
// Run: npm run build-winding-bake

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { applyMirrorRepair } from './lib/mirrorRepair.mts';
import { unmangleForearmMeshes } from '../src/lib/rigForearmUnmangle.ts';
import { repairFaceWinding, trianglesAgainst } from '../src/lib/faceWinding.ts';
import { colorForMaterial, layerForMaterial } from '../src/lib/materialColors.ts';
import { encodeTriangles } from '../src/lib/rigWindingBake.ts';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = resolve(REPO, 'src/data/rigWindingBake.ts');

/** La escena preparada hasta el punto donde RigModel aplica la tabla. */
export async function sceneAtWindingBake(): Promise<THREE.Group> {
  const ld = new GLTFLoader();
  ld.setMeshoptDecoder(MeshoptDecoder);
  const buf = readFileSync(rigGlbPath());
  const gl = await ld.parseAsync(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
    '',
  );
  const scene = gl.scene;
  scene.updateMatrixWorld(true);
  applyMirrorRepair(scene);
  unmangleForearmMeshes(scene);
  repairFaceWinding(scene);
  return scene;
}

/** Las mallas que la tabla cubre: lo que el laboratorio ensena, menos la piel. */
export function bakeTargets(scene: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  const geoms = new Set<string>();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    const f = Array.isArray(m.material) ? m.material[0] : m.material;
    const name = (f as THREE.Material | undefined)?.name ?? '';
    if (colorForMaterial(name) === null) return; // contenedores, ocultos siempre
    const layer = layerForMaterial(name);
    if (!layer || layer === 'skin') return;
    if (geoms.has(m.geometry.uuid)) return;
    geoms.add(m.geometry.uuid);
    out.push(m);
  });
  return out;
}

async function main() {
  const scene = await sceneAtWindingBake();
  const filas: { n: string; t: string; k: number }[] = [];
  let total = 0;
  let tris = 0;
  for (const m of bakeTargets(scene)) {
    tris += (m.geometry.getIndex()?.count ?? 0) / 3;
    const contra = trianglesAgainst(m);
    if (contra.length === 0) continue;
    filas.push({ n: m.name, t: encodeTriangles(contra), k: contra.length });
    total += contra.length;
  }
  filas.sort((a, b) => a.n.localeCompare(b.n));
  const cuerpo = filas.map((f) => `  { n: ${JSON.stringify(f.n)}, t: ${JSON.stringify(f.t)} },`).join('\n');
  const src = `// GENERADO por scripts/build-winding-bake.mts. No editar a mano.
// Ver src/lib/rigWindingBake.ts.
//
// ${total} triangulos en ${filas.length} mallas, de ${tris} triangulos revisados.

export interface WindingRow {
  /** Nombre de la malla en el GLB. */
  n: string;
  /** Posiciones de triangulo a invertir (diferencias en base 36, con puntos). */
  t: string;
}

export const RIG_WINDING_BAKE: readonly WindingRow[] = [
${cuerpo}
];
`;
  writeFileSync(SALIDA, src);
  console.log(`${total} triangulos en ${filas.length} mallas (de ${tris} revisados) -> ${SALIDA}`);
  console.log(`tamano de la tabla: ${(Buffer.byteLength(src) / 1024).toFixed(1)} KB`);
}

// Solo al ejecutarlo, no al importarlo (el banco de auditoria reutiliza la escena).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
