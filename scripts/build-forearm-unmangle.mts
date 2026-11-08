// CALCULA EL GIRO QUE ENDEREZA LAS MALLAS TUMBADAS DEL ANTEBRAZO.
//
// Cinco musculos superficiales del antebrazo (y sus mitades tendinosas) vienen
// del GLB del rig TUMBADOS ATRAVESANDO el miembro: discos de 1,4-2,7 cm de
// largo y 11,8-14,9 cm de radio. El recorte medido los oculta, y por eso el
// cuarto distal del antebrazo se quedaba hueco con el radio y el cubito al aire
// (ver `npm run audit-forearm-fill`).
//
// NO HAY QUE INVENTAR NADA PARA ARREGLARLO: el GLB de Explorar -- el mismo
// modelo, sin riggear -- trae esas mismas mallas BIEN COLOCADAS. Este script
// mide el giro rigido que lleva la version del rig encima de la de Explorar y
// escribe la tabla; el runtime la aplica al cargar.
//
// Los dos GLB sueldan los vertices de forma distinta (514 contra 395 en el
// extensor de los dedos), asi que no hay correspondencia uno a uno y no sirve
// un Kabsch. Se alinean por sus EJES PRINCIPALES y se mide el resultado con la
// distancia media al vecino mas cercano, que no necesita pareja.
//
// Reglas de admision, todas medidas:
//   - la malla tiene que estar LEJOS de su version sana (> 2 cm), o no esta rota;
//   - el giro tiene que dejarla ENCIMA (< 0,5 cm), o no es un giro lo que le pasa;
//   - las dos tienen que medir lo mismo (± 25% en el eje largo), o la del rig es
//     un fragmento y alinearlo contra el musculo entero no significa nada.
//
// El control negativo es `Flexor_carpi_radialis`: ya esta a 0,08 cm de su
// version sana, el metodo le calcula 1 grado de giro y la regla lo deja en paz.
//
// Run: npm run build-forearm-unmangle
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath, explorerGlbPath } from './lib/rigPath.mts';
import { layerForMaterial } from '../src/lib/materialColors.ts';
import { armHeights } from '../src/lib/rigArmRebind.ts';

/** Minimo desplazamiento para considerar que una malla esta fuera de sitio. */
const BROKEN_MIN_M = 0.02;
/** Maxima distancia residual tras el giro para aceptar la reparacion. */
const FIXED_MAX_M = 0.005;
/** Tolerancia relativa entre los ejes largos de las dos versiones. */
const EXTENT_TOL = 0.25;

async function load(p: string): Promise<THREE.Object3D> {
  const ld = new GLTFLoader();
  ld.setMeshoptDecoder(MeshoptDecoder);
  const b = readFileSync(p);
  const g = await ld.parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer,
    '',
  );
  g.scene.updateMatrixWorld(true);
  return g.scene;
}

function samplePoints(m: THREE.Mesh, max = 600): THREE.Vector3[] {
  const pos = m.geometry.getAttribute('position');
  const stride = Math.max(1, Math.floor(pos.count / max));
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i += stride)
    out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  return out;
}

/** Autovectores de una matriz simetrica 3x3, por rotaciones de Jacobi. */
function eigenVectors(S: number[][]): { vec: THREE.Vector3[]; val: number[] } {
  const a = S.map((r) => r.slice());
  const V = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 64; sweep++) {
    let off = 0;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) off += a[i][j] * a[i][j];
    if (off < 1e-20) break;
    for (let p = 0; p < 3; p++)
      for (let q = p + 1; q < 3; q++) {
        if (Math.abs(a[p][q]) < 1e-18) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < 3; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < 3; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < 3; k++) {
          const vkp = V[k][p];
          const vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
  }
  const idx = [0, 1, 2].sort((i, j) => a[j][j] - a[i][i]);
  return {
    vec: idx.map((i) => new THREE.Vector3(V[0][i], V[1][i], V[2][i]).normalize()),
    val: idx.map((i) => a[i][i]),
  };
}

function principalFrame(P: THREE.Vector3[]) {
  const c = P.reduce((s, v) => s.add(v.clone()), new THREE.Vector3()).multiplyScalar(1 / P.length);
  const S = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const p of P) {
    const d = p.clone().sub(c);
    const v = [d.x, d.y, d.z];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) S[i][j] += v[i] * v[j];
  }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) S[i][j] /= P.length;
  const e = eigenVectors(S);
  // Extension sobre el eje largo: separa un musculo entero de un fragmento suyo.
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of P) {
    const t = p.clone().sub(c).dot(e.vec[0]);
    if (t < lo) lo = t;
    if (t > hi) hi = t;
  }
  return { c, vec: e.vec, extent: hi - lo };
}

function basis(v: THREE.Vector3[], s: readonly number[]): THREE.Matrix3 {
  const e0 = v[0].clone().multiplyScalar(s[0]);
  const e1 = v[1].clone().multiplyScalar(s[1]);
  const e2 = e0.clone().cross(e1);
  return new THREE.Matrix3().set(e0.x, e1.x, e2.x, e0.y, e1.y, e2.y, e0.z, e1.z, e2.z);
}

/** Distancia media de cada punto de A a su vecino mas cercano de B. */
function nearestDist(A: THREE.Vector3[], B: THREE.Vector3[]): number {
  let s = 0;
  for (const a of A) {
    let best = Infinity;
    for (const b of B) {
      const d = a.distanceToSquared(b);
      if (d < best) best = d;
    }
    s += Math.sqrt(best);
  }
  return s / A.length;
}

const rig = await load(rigGlbPath());
const exp = await load(explorerGlbPath());
const heights = armHeights(rig);

const byExpName = new Map<string, THREE.Mesh[]>();
exp.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const l = byExpName.get(m.name) ?? [];
  l.push(m);
  byExpName.set(m.name, l);
});

interface Entry {
  name: string;
  before: number;
  after: number;
  angDeg: number;
  matrix: number[];
}
const entries: Entry[] = [];
const skipped: string[] = [];

const candidates: THREE.Mesh[] = [];
rig.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const mat = Array.isArray(m.material) ? m.material[0] : m.material;
  const layer = layerForMaterial((mat as THREE.Material | undefined)?.name);
  if (layer !== 'muscle' && layer !== 'connective') return;
  if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
  const c = m.geometry.boundingBox!.getCenter(new THREE.Vector3());
  m.localToWorld(c);
  // Solo el antebrazo: la columna lateral del brazo, por debajo del codo.
  if (Math.abs(c.x) < 0.14 || c.y > heights.elbowY + 0.02 || c.y < heights.wristY - 0.04) return;
  candidates.push(m);
});

console.log(`${candidates.length} mallas de tejido en el antebrazo, comparadas con el GLB de Explorar`);
console.log('');

for (const m of candidates) {
  // `001` es como la exportacion marca la copia espejada; el nombre base es el
  // mismo en Explorar.
  const base = m.name.replace(/001/, '');
  const cands = byExpName.get(base);
  if (!cands || cands.length === 0) continue;
  const A = samplePoints(m);
  const sideX = A.reduce((s, v) => s + v.x, 0) / A.length;
  // La copia de Explorar DEL MISMO LADO: el nombre no distingue lados de forma
  // fiable en Z-Anatomy, la posicion si.
  let pick: THREE.Mesh | null = null;
  let pickD = Infinity;
  for (const c of cands) {
    const s = samplePoints(c, 40);
    const cx = s.reduce((acc, v) => acc + v.x, 0) / s.length;
    const d = Math.abs(cx - sideX);
    if (d < pickD) {
      pickD = d;
      pick = c;
    }
  }
  if (!pick) continue;
  const B = samplePoints(pick);
  const before = nearestDist(A, B);
  if (before < BROKEN_MIN_M) continue; // sana: no se toca

  const fa = principalFrame(A);
  const fb = principalFrame(B);
  const ratio = fa.extent / (fb.extent || 1e-9);
  if (Math.abs(ratio - 1) > EXTENT_TOL) {
    skipped.push(
      `  ${m.name.padEnd(34)} a ${(before * 100).toFixed(2)} cm, pero mide ${(ratio * 100).toFixed(0)}% ` +
        'del largo de la sana: es un fragmento, no un giro',
    );
    continue;
  }
  let best: { d: number; R: THREE.Matrix3 } | null = null;
  for (const s0 of [1, -1])
    for (const s1 of [1, -1]) {
      const R = basis(fb.vec, [s0, s1]).multiply(basis(fa.vec, [1, 1]).transpose());
      const moved = A.map((p) => p.clone().sub(fa.c).applyMatrix3(R).add(fb.c));
      const d = nearestDist(moved, B);
      if (!best || d < best.d) best = { d, R };
    }
  if (!best || best.d > FIXED_MAX_M) {
    skipped.push(
      `  ${m.name.padEnd(34)} a ${(before * 100).toFixed(2)} cm, y el giro la deja a ` +
        `${((best?.d ?? 1) * 100).toFixed(2)} cm: no es un giro lo que le pasa`,
    );
    continue;
  }
  // Matriz 4x4 de mundo: p' = R * (p - ca) + cb
  const e = best.R.elements; // column-major 3x3
  const M = new THREE.Matrix4().set(
    e[0], e[3], e[6], 0,
    e[1], e[4], e[7], 0,
    e[2], e[5], e[8], 0,
    0, 0, 0, 1,
  );
  const pre = new THREE.Matrix4().makeTranslation(-fa.c.x, -fa.c.y, -fa.c.z);
  const post = new THREE.Matrix4().makeTranslation(fb.c.x, fb.c.y, fb.c.z);
  const T = post.multiply(M).multiply(pre);
  const trace = e[0] + e[4] + e[8];
  const angDeg = (Math.acos(Math.max(-1, Math.min(1, (trace - 1) / 2))) * 180) / Math.PI;
  entries.push({
    name: m.name,
    before,
    after: best.d,
    angDeg,
    matrix: T.toArray().map((x) => Number(x.toFixed(6))),
  });
}

entries.sort((a, b) => (a.name < b.name ? -1 : 1));
console.log('ENDEREZADAS:');
for (const e of entries)
  console.log(
    `  ${e.name.padEnd(34)} ${(e.before * 100).toFixed(2).padStart(6)} cm -> ` +
      `${(e.after * 100).toFixed(2).padStart(5)} cm   giro ${e.angDeg.toFixed(0).padStart(4)} deg`,
  );
console.log('');
if (skipped.length > 0) {
  console.log('FUERA DE SITIO PERO NO ES UN GIRO (se quedan como estan):');
  console.log(skipped.join('\n'));
  console.log('');
}

const out = resolve(process.cwd(), 'src/data/rigForearmUnmangle.ts');
const rows = entries
  .map(
    (e) =>
      `  // ${(e.before * 100).toFixed(2)} cm -> ${(e.after * 100).toFixed(2)} cm, giro ${e.angDeg.toFixed(0)} grados\n` +
      `  ['${e.name}', [${e.matrix.join(', ')}]],`,
  )
  .join('\n');
writeFileSync(
  out,
  `// GENERADO POR \`npm run build-forearm-unmangle\`. No editar a mano.
//
// Giros rigidos que enderezan las mallas del antebrazo que el GLB del rig trae
// TUMBADAS ATRAVESANDO el miembro. El destino no es una invencion: es la misma
// malla, bien colocada, en el GLB de Explorar. Cada fila lleva medida la
// distancia a esa version sana antes y despues del giro.
//
// Matriz de MUNDO en la postura de reposo, column-major (THREE.Matrix4.toArray).
// Ver src/lib/rigForearmUnmangle.ts para como se aplica, y
// \`npm run audit-forearm-fill\` para lo que arregla.

export const FOREARM_UNMANGLE: ReadonlyArray<readonly [string, readonly number[]]> = [
${rows}
];
`,
  'utf8',
);
console.log(`${entries.length} filas escritas en src/data/rigForearmUnmangle.ts`);
