// LO QUE SOBREVIVE A LA PODA TIENE QUE SER EXACTAMENTE LO MISMO QUE HABIA.
//
// `npm run strip-rig` saca del GLB las mallas cuyo material no puede caer en
// ninguna capa viva del laboratorio (venas, arterias, raices de diente...) y
// vuelve a codificar el fichero entero con meshopt. Codificar de nuevo es la
// parte peligrosa: si el escritor reordenara vertices, requantizara posiciones o
// tocara los pesos de piel, se llevaria por delante cosas que el runtime ya
// tiene MEDIDAS contra este GLB -- la tabla de pesos horneados
// (src/data/rigSkinWeightBake.ts), el hundido de 10 mm de la fascia
// antebraquial, los parches de piel de la rodilla, el recorte del antebrazo.
//
// Este banco compara los dos ficheros malla a malla y vertice a vertice:
//
//   1. Toda malla del podado existe en el original con el MISMO nombre.
//   2. Posicion, skinIndex y skinWeight son IDENTICOS byte a byte. No
//      "parecidos": identicos. Esos tres son los que el runtime tiene medidos.
//
//      LAS NORMALES VAN POR ANGULO, y con razon: en este GLB estan cuantizadas
//      a Int8 (ver [[rig-quantized-normals]]), asi que el codec las vuelve a
//      filtrar al reescribir y el ultimo bit baila. Comparar sus bytes marcaba
//      1.175 mallas "alteradas" y no decia nada. Lo que importa es el ANGULO:
//      medido sobre las 862.798 normales que sobreviven, la diferencia media
//      es de 0,0029 grados y la peor de 0,541, ninguna por encima de 1 grado.
//      Eso no se ve en una pantalla, asi que el umbral es 1 grado.
//
//      LOS INDICES VAN POR SUPERFICIE, por lo mismo: meshopt reordena los
//      triangulos dentro del buffer para comprimir mejor, y en 3 mallas
//      (Tibia002_1 y las dos lineas axilares posteriores) salieron en otro
//      orden. Medido: MISMA superficie --0 triangulos nuevos, 0 perdidos-- y
//      0 caras volteadas de 1.221.797. Asi que la comparacion es por conjunto
//      de triangulos CONSERVANDO EL GIRO, no por orden: un triangulo que se
//      voltea se ve (sale la cara de dentro), uno que cambia de sitio en el
//      buffer no. Los degenerados --dos indices iguales, area 0-- se cuentan
//      aparte: su giro no esta definido y son los 2 unicos "cambios" que
//      aparecian.
//   3. Las mallas que faltan son SOLO las que `layerForMaterial` no puede
//      colocar en ninguna capa -- y eso se le pregunta a la funcion de verdad,
//      no a la lista del script de poda, que podria haber derivado.
//   4. El esqueleto es el mismo: mismos huesos, mismo orden, mismas pieles.
//   5. Con la cadena de preparacion aplicada (createRigPoser), el conjunto de
//      mallas VISIBLES y de capa viva es el mismo en los dos.
//
// Run: npm run audit-rig-strip

import { readFileSync, existsSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser } from './lib/rigPose.mts';
import { layerForMaterial, meshIsForearmFascia } from '../src/lib/materialColors.ts';

const ORIGINAL = process.argv[2] ?? rigGlbPath();
const PODADO = process.argv[3];
if (!PODADO || !existsSync(PODADO)) {
  console.error('Uso: npm run audit-rig-strip -- <original.glb> <podado.glb>');
  process.exit(1);
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

interface Ficha {
  mesh: THREE.Mesh;
  material: string;
  verts: number;
}

function inventario(scene: THREE.Object3D): Map<string, Ficha> {
  const m = new Map<string, Ficha>();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.name) return;
    const first = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    m.set(mesh.name, {
      mesh,
      material: (first as THREE.Material | undefined)?.name ?? '',
      verts: mesh.geometry.getAttribute('position')?.count ?? 0,
    });
  });
  return m;
}

/**
 * Clave de un triangulo que CONSERVA EL GIRO.
 *
 * Rota el trio para empezar por el indice menor, que es lo que distingue "el
 * mismo triangulo en otro sitio del buffer" (da igual) de "el mismo triangulo
 * del reves" (se ve: aparece la cara interior). Ordenar los tres indices
 * tambien casaria el primero, pero taparia el segundo, que es justo el que hay
 * que cazar.
 */
const giro = (x: number, y: number, z: number): string =>
  x <= y && x <= z ? `${x},${y},${z}` : y <= z ? `${y},${z},${x}` : `${z},${x},${y}`;

/** Compara un atributo entero. Devuelve el indice del primer desajuste o -1. */
function distinto(a: THREE.BufferAttribute | undefined, b: THREE.BufferAttribute | undefined): number {
  if (!a && !b) return -1;
  if (!a || !b) return 0;
  if (a.count !== b.count || a.itemSize !== b.itemSize) return 0;
  const A = a.array as ArrayLike<number>;
  const B = b.array as ArrayLike<number>;
  if (A.length !== B.length) return 0;
  for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return i;
  return -1;
}

const A = await cargar(ORIGINAL);
const B = await cargar(PODADO);

const invA = inventario(A);
const invB = inventario(B);

console.log('===== PODA DEL RIG: LO QUE SOBREVIVE CONTRA LO QUE HABIA =====');
console.log(`  original ${ORIGINAL}`);
console.log(`  podado   ${PODADO}`);
console.log(`  mallas   ${invA.size} -> ${invB.size}  (${invA.size - invB.size} menos)`);

let fallos = 0;

// 1 + 2. Toda malla del podado existe en el original y es IDENTICA.
const intrusas: string[] = [];
const alteradas: string[] = [];
let verticesComparados = 0;
/** Umbral angular de las normales, en grados. Ver la cabecera. */
const GRADOS_NORMAL = 1;
const _n1 = new THREE.Vector3();
const _n2 = new THREE.Vector3();
let normalesComparadas = 0;
let normalSuma = 0;
let peorNormal = 0;
let peorNormalEn = '';
let normalesFuera = 0;
let trisComparados = 0;
let trisVolteados = 0;
let trisDegenerados = 0;
for (const [nombre, fb] of invB) {
  const fa = invA.get(nombre);
  if (!fa) {
    intrusas.push(nombre);
    continue;
  }
  for (const attr of ['position', 'skinIndex', 'skinWeight'] as const) {
    const i = distinto(
      fa.mesh.geometry.getAttribute(attr) as THREE.BufferAttribute | undefined,
      fb.mesh.geometry.getAttribute(attr) as THREE.BufferAttribute | undefined,
    );
    if (i >= 0) {
      alteradas.push(`${nombre}.${attr}[${i}]`);
      break;
    }
  }
  const ia = fa.mesh.geometry.getIndex() as THREE.BufferAttribute | null;
  const ib = fb.mesh.geometry.getIndex() as THREE.BufferAttribute | null;
  if (!ia !== !ib || (ia && ib && ia.count !== ib.count)) {
    alteradas.push(`${nombre}.index (cuenta distinta)`);
  } else if (ia && ib) {
    const sa = new Set<string>();
    for (let k = 0; k < ia.count; k += 3) sa.add(giro(ia.getX(k), ia.getX(k + 1), ia.getX(k + 2)));
    let fuera = 0;
    for (let k = 0; k < ib.count; k += 3) {
      const x = ib.getX(k);
      const y = ib.getX(k + 1);
      const z = ib.getX(k + 2);
      trisComparados++;
      if (sa.has(giro(x, y, z))) continue;
      if (x === y || y === z || x === z) {
        trisDegenerados++;
        continue;
      }
      fuera++;
    }
    if (fuera > 0) {
      trisVolteados += fuera;
      alteradas.push(`${nombre}.index (${fuera} caras volteadas o nuevas)`);
    }
  }
  // Las normales, por angulo.
  const na = fa.mesh.geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
  const nb = fb.mesh.geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (na && nb && na.count === nb.count) {
    for (let i = 0; i < na.count; i++) {
      _n1.fromBufferAttribute(na, i).normalize();
      _n2.fromBufferAttribute(nb, i).normalize();
      const g = (Math.acos(Math.min(1, Math.max(-1, _n1.dot(_n2)))) * 180) / Math.PI;
      normalesComparadas++;
      normalSuma += g;
      if (g > peorNormal) {
        peorNormal = g;
        peorNormalEn = `${nombre}[${i}]`;
      }
      if (g > GRADOS_NORMAL) normalesFuera++;
    }
  } else if (na || nb) {
    alteradas.push(`${nombre}.normal (cuenta distinta)`);
  }
  verticesComparados += fb.verts;
}
console.log('');
console.log(`  vertices comparados byte a byte: ${verticesComparados.toLocaleString('es')}`);
console.log(`  mallas alteradas: ${alteradas.length}${alteradas.length ? ` (${alteradas.slice(0, 6).join(', ')})` : ''}`);
console.log(`  mallas que aparecen de la nada: ${intrusas.length}${intrusas.length ? ` (${intrusas.slice(0, 6).join(', ')})` : ''}`);
console.log(
  `  normales: ${normalesComparadas.toLocaleString('es')} comparadas, media ${(normalSuma / Math.max(1, normalesComparadas)).toFixed(4)} grados, peor ${peorNormal.toFixed(3)} en ${peorNormalEn || '-'}, por encima de ${GRADOS_NORMAL} grado: ${normalesFuera}`,
);
console.log(
  `  triangulos: ${trisComparados.toLocaleString('es')} comparados, caras volteadas o nuevas: ${trisVolteados}, degenerados (area 0, giro sin definir): ${trisDegenerados}`,
);
if (alteradas.length || intrusas.length || normalesFuera > 0) fallos++;

// 3. Lo que falta no podia encenderse NUNCA. Se le pregunta a la funcion real.
const faltan: Ficha[] = [];
for (const [nombre, fa] of invA) if (!invB.has(nombre)) faltan.push(fa);
const vivasBorradas = faltan.filter(
  (f) => layerForMaterial(f.material) !== null || meshIsForearmFascia(f.mesh.name, f.material),
);
const porMat = new Map<string, number>();
for (const f of faltan) porMat.set(f.material || '(sin material)', (porMat.get(f.material || '(sin material)') ?? 0) + 1);
console.log('');
console.log(`  mallas quitadas: ${faltan.length}, ${faltan.reduce((t, f) => t + f.verts, 0).toLocaleString('es')} vertices`);
for (const [mat, n] of [...porMat.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${mat.padEnd(24)} ${String(n).padStart(4)}`);
}
console.log(
  `  de ellas, con capa viva segun layerForMaterial: ${vivasBorradas.length}${vivasBorradas.length ? ` (${vivasBorradas.slice(0, 6).map((f) => f.mesh.name).join(', ')})` : ' -- ninguna'}`,
);
if (vivasBorradas.length) fallos++;

// 4. El esqueleto.
const huesos = (s: THREE.Object3D): string[] => {
  const out: string[] = [];
  s.traverse((o) => {
    if ((o as THREE.Bone).isBone) out.push(o.name);
  });
  return out;
};
const hA = huesos(A);
const hB = huesos(B);
const mismosHuesos = hA.length === hB.length && hA.every((n, i) => n === hB[i]);
console.log('');
console.log(`  huesos: ${hA.length} -> ${hB.length}  ${mismosHuesos ? 'identicos y en el mismo orden' : 'DISTINTOS'}`);
if (!mismosHuesos) fallos++;

// 5. Con la cadena de preparacion, las mismas mallas vivas.
createRigPoser(A, 'glenohumeral-abduction', 'R', false);
createRigPoser(B, 'glenohumeral-abduction', 'R', false);
const vivas = (s: THREE.Object3D): Set<string> => {
  const out = new Set<string>();
  s.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.visible && m.name) out.add(m.name);
  });
  return out;
};
const vA = vivas(A);
const vB = vivas(B);
const perdidas = [...vA].filter((n) => !vB.has(n));
const ganadas = [...vB].filter((n) => !vA.has(n));
console.log('');
console.log(`  tras preparar: visibles ${vA.size} -> ${vB.size}`);
console.log(`    visibles que se pierden: ${perdidas.length}${perdidas.length ? ` (${perdidas.slice(0, 8).join(', ')})` : ''}`);
console.log(`    visibles que aparecen:   ${ganadas.length}${ganadas.length ? ` (${ganadas.slice(0, 8).join(', ')})` : ''}`);
// Perder visibles ES lo esperado solo si eran de material muerto; eso ya lo
// cubre el punto 3, asi que aqui solo se informa y se exige que no APAREZCA
// ninguna nueva ni se pierda ninguna que el punto 3 no hubiera borrado.
const perdidasNoBorradas = perdidas.filter((n) => invB.has(n));
if (perdidasNoBorradas.length) {
  console.log(`    OJO: ${perdidasNoBorradas.length} siguen en el fichero pero ya no se ven: ${perdidasNoBorradas.slice(0, 8).join(', ')}`);
  fallos++;
}
if (ganadas.length) fallos++;

console.log('');
console.log(fallos === 0 ? 'OK: la poda no toca nada de lo que se ve.' : `FALLA: ${fallos} comprobaciones.`);
process.exit(fallos === 0 ? 0 : 1);
