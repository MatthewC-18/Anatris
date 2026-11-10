// CUANTOS VERTICES CAMBIA CADA BLOQUE DE PESOS, ANTES DE HORNEAR NADA.
//
// El horneado de `relaxSkinSeams` + `redistributeSkinRootWeight` salio bien
// porque esos dos pases escriben 7.926 vertices de 1.000.527: la tabla pesa
// 155 KB de base64 y ahorra 2,4 s. Los siguientes candidatos --el bloque de
// hombro/cadera/tobillo/raquis (658 ms) y `reweightArmAboveElbow` (492 ms)--
// pueden escribir MUCHO mas, y entonces el cambio seria pagar megas de bundle
// por un segundo de CPU. Esta medida decide si merece la pena, en vez de
// suponerlo.
//
// Usa las marcas de scripts/lib/rigPose.mts y compara el peso POR NOMBRE DE
// HUESO, no por indice: los pases extienden el esqueleto de la malla, asi que
// el indice 3 no significa lo mismo antes y despues.
//
// LO QUE SALIO (10 nov 2026, sobre el GLB v7 de 1.000.527 vertices con hueso):
//
//   bloque hombro+raquis+cadera+tobillo   444.634 vertices (44,44%)  ->  8.684 KB
//   los dos pases ya horneados              7.926 vertices ( 0,79%)  ->    155 KB
//   reweightArmAboveElbow                  14.329 vertices ( 1,43%)  ->    280 KB
//
// ASI QUE EL BLOQUE NO SE HORNEA. Sus 658 ms costarian 8,7 MB de bundle: el
// pase del raquis reescribe el oblicuo externo entero (88.756 vertices por
// lado), no un reparto fino de costuras. Pagar 8,7 MB de descarga para ahorrar
// 0,66 s de CPU es cambiar un problema por uno peor.
//
// Y `reweightArmAboveElbow` TAMPOCO, por ahora: 280 KB por 492 ms es un trato
// mediocre, y la lista de las mallas que mas cambia dice algo mejor --
// `Visceral_systemsg001`, `Digestive_systemg001`, ramos del nervio radial: el
// pase esta gastando su tiempo en mallas que el laboratorio NO ENSENA NUNCA.
// Sacarlas del GLB arregla esto, el parse y la subida a la GPU de una vez, que
// es lo siguiente.
//
// Run: npm run measure-weight-stages

import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser } from './lib/rigPose.mts';

const EPS = 1e-6;

interface Foto {
  /** Por malla: indices, pesos y la lista de nombres de hueso de ese momento. */
  mallas: Map<string, { si: Uint16Array; sw: Float32Array; huesos: string[] }>;
}

function retratar(scene: THREE.Object3D): Foto {
  const mallas = new Map<string, { si: Uint16Array; sw: Float32Array; huesos: string[] }>();
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh || !m.skeleton || !m.name) return;
    const si = m.geometry.getAttribute('skinIndex');
    const sw = m.geometry.getAttribute('skinWeight');
    if (!si || !sw) return;
    mallas.set(m.name, {
      si: new Uint16Array(si.array as ArrayLike<number>),
      sw: new Float32Array(sw.array as ArrayLike<number>),
      huesos: m.skeleton.bones.map((b) => b.name),
    });
  });
  return { mallas };
}

/** Peso por nombre de hueso de un vertice, leido de una foto. */
function mezcla(
  f: { si: Uint16Array; sw: Float32Array; huesos: string[] },
  vi: number,
  out: Map<string, number>,
): void {
  out.clear();
  for (let k = 0; k < 4; k++) {
    const w = f.sw[vi * 4 + k];
    if (w <= 0) continue;
    const n = f.huesos[f.si[vi * 4 + k]];
    if (!n) continue;
    out.set(n, (out.get(n) ?? 0) + w);
  }
}

function comparar(a: Foto, b: Foto, titulo: string): void {
  let vertices = 0;
  let cambiados = 0;
  const mallasTocadas = new Set<string>();
  let maxDif = 0;
  const porMalla = new Map<string, number>();
  const ma = new Map<string, number>();
  const mb = new Map<string, number>();

  for (const [nombre, fb] of b.mallas) {
    const fa = a.mallas.get(nombre);
    if (!fa) continue;
    const n = Math.min(fa.sw.length, fb.sw.length) / 4;
    for (let vi = 0; vi < n; vi++) {
      vertices++;
      mezcla(fa, vi, ma);
      mezcla(fb, vi, mb);
      let peor = 0;
      for (const [h, w] of ma) peor = Math.max(peor, Math.abs(w - (mb.get(h) ?? 0)));
      for (const [h, w] of mb) if (!ma.has(h)) peor = Math.max(peor, w);
      if (peor > EPS) {
        cambiados++;
        mallasTocadas.add(nombre);
        porMalla.set(nombre, (porMalla.get(nombre) ?? 0) + 1);
        if (peor > maxDif) maxDif = peor;
      }
    }
  }

  const bytes = cambiados * 15;
  console.log(`\n${titulo}`);
  console.log(`  vertices comparados: ${vertices.toLocaleString('es')}`);
  console.log(
    `  CAMBIADOS: ${cambiados.toLocaleString('es')} (${((cambiados / vertices) * 100).toFixed(2)}%) en ${mallasTocadas.size} mallas`,
  );
  console.log(`  diferencia maxima de peso: ${maxDif.toFixed(4)}`);
  console.log(
    `  tabla que haria falta: ${(bytes / 1024).toFixed(0)} KB binario -> ${((bytes * 4) / 3 / 1024).toFixed(0)} KB base64`,
  );
  const top = [...porMalla.entries()].sort((x, y) => y[1] - x[1]).slice(0, 6);
  if (top.length) {
    console.log('  las que mas cambian:');
    for (const [n, c] of top) console.log(`    ${String(c).padStart(6)}  ${n}`);
  }
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

// Con los pases DE VERDAD: es lo que se quiere medir.
process.env.ANATRIS_NO_BAKE = '1';

const fotos = new Map<string, Foto>();
(globalThis as {
  __anatrisBakeSnapshot?: (e: string, s: THREE.Object3D) => void;
}).__anatrisBakeSnapshot = (etiqueta, s) => {
  if (fotos.has(etiqueta)) return;
  fotos.set(etiqueta, retratar(s));
};

const scene = await cargar(rigGlbPath());
createRigPoser(scene, 'glenohumeral-abduction', 'R', false);

console.log('PESOS QUE ESCRIBE CADA BLOQUE');
console.log(`  marcas vistas: ${[...fotos.keys()].join(', ')}`);

const etapas: [string, string, string][] = [
  ['bloque:antes', 'bloque:despues', 'BLOQUE hombro + raquis + cadera + tobillo (medido: 658 ms)'],
  ['bloque:despues', 'peso:despues', 'LOS DOS PASES CAROS, ya horneados (referencia: 7.926 vertices)'],
  ['brazo:antes', 'brazo:despues', 'reweightArmAboveElbow (medido: 492 ms)'],
];
for (const [a, b, titulo] of etapas) {
  const fa = fotos.get(a);
  const fb = fotos.get(b);
  if (!fa || !fb) {
    console.log(`\n${titulo}\n  FALTA una marca (${a} / ${b})`);
    continue;
  }
  comparar(fa, fb, titulo);
}
