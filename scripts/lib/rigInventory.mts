// scripts/lib/rigInventory.mts
//
// EL INVENTARIO DEL MODELO QUE EL LABORATORIO CARGA DE VERDAD.
//
// Por qué existe este archivo: durante una auditoría se dio por bueno
// `public/anatomy-index.json` como si describiera el rig. No lo describe. El
// índice es del modelo de Explorar (6316 mallas); el laboratorio carga
// `public/cuerpo-rig.opt.glb` (2659 mallas), y son conjuntos distintos. Todo un
// registro de estructuras clínicas se escribió contra el índice y resolvía a
// CERO mallas en el rig: cápsula glenohumeral, labrum glenoideo, cruzados,
// menisco lateral... nada de eso está en el rig. La app no fallaba; simplemente
// no encendía nada.
//
// Así que: quien tenga que decidir qué se puede resaltar en el laboratorio
// pregunta AQUÍ, y aquí se lee el GLB. Dos reglas más que el índice tampoco
// sabe y este inventario sí:
//
//   - la capa la decide `layerForMaterial(nombreDelMaterial)` y nada más. El
//     campo `layer` del índice miente: 'Cartilage' sale como hueso en el índice
//     y es conectivo en ejecución; 'Bursa', 'Fascia' y 'Ligament.001' son capa
//     nula (invisibles por mucho que se enciendan).
//   - el lado lo decide la GEOMETRÍA (el signo de x del centro), igual que
//     RigOverlays, porque los sufijos l/r de este GLB no son de fiar. Y +x es la
//     IZQUIERDA anatómica.
//
// Cargar y parsear el GLB cuesta ~40 s, así que el resultado se cachea en
// `scripts/.cache/` con la huella (tamaño + mtime) del GLB: si el modelo se
// reexporta, la caché se invalida sola.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './rigPath.mts';
import { layerForMaterial } from '../../src/lib/materialColors.ts';

/** Las cuatro capas que el laboratorio sabe mostrar. */
export type LabLayer = 'muscle' | 'bone' | 'connective' | 'skin';

export interface RigMesh {
  /** Nombre del nodo, tal cual en el GLB. */
  name: string;
  /** Nombre del material. Es lo único que decide la capa. */
  material: string;
  /** Capa de ejecución, o null si el laboratorio no la muestra nunca. */
  layer: LabLayer | null;
  /** Lado anatómico por geometría, igual que RigOverlays. */
  side: 'left' | 'right' | 'center';
  /** x del centro en metros, por si hace falta medir. */
  x: number;
  /** y del centro en metros: sirve para separar mano de pie, etc. */
  y: number;
}

export interface RigInventory {
  path: string;
  meshes: RigMesh[];
}

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(SCRIPTS, '../.cache');
const CACHE = resolve(CACHE_DIR, 'rig-inventory.json');

/** Mismo criterio que RigOverlays.sideOfMesh. */
const LATERAL_M = 0.04;

let memo: RigInventory | null = null;

async function readFromGlb(): Promise<RigInventory> {
  const path = rigGlbPath();
  const ld = new GLTFLoader();
  ld.setMeshoptDecoder(MeshoptDecoder);
  const buf = readFileSync(path);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const gl = await ld.parseAsync(ab, '');
  gl.scene.updateMatrixWorld(true);

  const c = new THREE.Vector3();
  const meshes: RigMesh[] = [];
  gl.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const first = Array.isArray(m.material) ? m.material[0] : m.material;
    const material = (first as THREE.Material | undefined)?.name ?? '';
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    c.copy(m.geometry.boundingSphere!.center).applyMatrix4(m.matrixWorld);
    const side =
      Math.abs(c.x) < LATERAL_M ? 'center' : c.x > 0 ? 'left' : 'right';
    meshes.push({
      name: m.name,
      material,
      layer: layerForMaterial(material) as LabLayer | null,
      side,
      x: Math.round(c.x * 1000) / 1000,
      y: Math.round(c.y * 1000) / 1000,
    });
  });
  return { path, meshes };
}

/**
 * El inventario del rig. Se lee del GLB la primera vez y se cachea con su
 * huella; reexportar el modelo invalida la caché.
 */
export async function rigInventory(): Promise<RigInventory> {
  if (memo) return memo;
  const path = rigGlbPath();
  const st = statSync(path);
  const stamp = `${st.size}:${Math.round(st.mtimeMs)}`;
  if (existsSync(CACHE)) {
    try {
      const cached = JSON.parse(readFileSync(CACHE, 'utf8')) as RigInventory & { stamp: string };
      if (cached.stamp === stamp && Array.isArray(cached.meshes) && cached.meshes.length) {
        memo = { path: cached.path, meshes: cached.meshes };
        return memo;
      }
    } catch {
      /* caché corrupta: se regenera */
    }
  }
  const fresh = await readFromGlb();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE, JSON.stringify({ stamp, ...fresh }));
  memo = fresh;
  return memo;
}
