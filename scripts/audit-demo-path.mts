// ¿ATRAVIESA EL BRAZO EL CUERPO MIENTRAS EL DEMO SE MUEVE?
//
// "En los tests el atlas se comienza a salir... y atraviesa el cuerpo desde
// donde sale para el movimiento." Visto en Hawkins-Kennedy: el demo sostenia los
// COMPONENTES (codo a 90, rotacion interna a 70) fijos durante todo el barrido de
// la flexion desde 0, y con el brazo abajo un antebrazo doblado y rotado hacia
// dentro apunta al abdomen.
//
// Ningun banco miraba el RECORRIDO: `audit-demo-hand` y `measure-test-poses`
// posan el demo en su angulo final y nada mas. Esto muestrea el trazo entero
// --ida, que es la vuelta al reves-- para cada demo con componentes, en los dos
// lados, con cada orden posible de `src/lib/demoTimeline.ts`, y cuenta cuanto
// del antebrazo y la mano cae DENTRO del tronco.
//
// COMO SE POSA: igual que `RigModel.apply`. `pose()` devuelve la escena al
// reposo y aplica la base sin la holgura del brazo; encima los componentes (con
// el cero clinico de su postura, una vez por hueso); y al final la holgura,
// porque en la aplicacion va DESPUES de los componentes y gira el humero sobre
// su propio eje x, que no conmuta con la rotacion interna.
//
// EL TRONCO: un cilindro eliptico por rodajas de 2 cm, medido sobre la piel del
// tronco en reposo (sin las mallas de brazo, mano ni pierna). Un vertice del
// miembro esta "dentro" si su radio normalizado es menor que 0,85: a 2-3 cm
// bajo la piel, no rozandola.
//
// Run: npm run audit-demo-path [-- <id de prueba>]

import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import {
  ARM_CLEARANCE_DEG,
  ARM_CLEARANCE_FADE_DEG,
  baseName,
  createRigPoser,
  type Side,
} from './lib/rigPose.mts';
import { ALL_TESTS_BY_REGION } from '../src/data/fullContent.ts';
import { NEURO_BY_REGION } from '../src/data/neuro/index.ts';
import { getBoneControl, resolveArmatureName, rigSideFor } from '../src/lib/boneMap.ts';
import { layerForMaterial } from '../src/lib/materialColors.ts';
import { baseAngle, strokeAt, strokePlan, type DemoOrder } from '../src/lib/demoTimeline.ts';

const D2R = Math.PI / 180;
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const ORDERS: DemoOrder[] = ['together', 'base-first', 'components-first', 'proportional'];
const SAMPLES = 25;
const INSIDE_R = 0.85;
const SOLO = process.argv[2] ?? null;

interface Demo {
  id: string;
  where: string;
  movementId: string;
  angleDeg: number;
  side: 'R' | 'L';
  components: { movementId: string; angleDeg: number }[];
}

const demos: Demo[] = [];
for (const [region, tests] of Object.entries(ALL_TESTS_BY_REGION)) {
  for (const t of tests as { id: string; demo?: Demo & { side?: 'R' | 'L' } }[]) {
    const d = t.demo;
    if (!d) continue;
    // TODOS los demos, no solo los que llevan componentes: la posicion final de
    // cada uno tampoco la miraba nadie con el tronco al lado. Asi salio el press
    // abdominal, con el codo plegado dos veces (ver demoComponents.test.ts).
    demos.push({ id: t.id, where: region, movementId: d.movementId, angleDeg: d.angleDeg, side: d.side ?? 'R', components: d.components ?? [] });
  }
}
const vistos = new Set<string>();
for (const set of Object.values(NEURO_BY_REGION)) {
  for (const r of set.roots) {
    const d = r.demo as (Demo & { components?: Demo['components'] }) | undefined;
    if (!d) continue;
    const key = `${set.id}:${r.id}`;
    if (vistos.has(key)) continue;
    vistos.add(key);
    demos.push({ id: `miotoma ${r.id}`, where: set.id, movementId: d.movementId, angleDeg: d.angleDeg, side: d.side ?? 'R', components: d.components ?? [] });
  }
}
const lista = SOLO ? demos.filter((d) => d.id === SOLO || d.id === `miotoma ${SOLO}`) : demos;

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const fresh = async () => (await loader.parseAsync(ab.slice(0) as ArrayBuffer, '')).scene;

const matName = (m: THREE.Mesh) => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as THREE.Material | undefined)?.name ?? '';
};
const spaced = (n: string) => n.replace(/_/g, ' ');
const ARM_NAMES = /\b(arm|forearm|elbow|cubital|wrist|palm|hand|digits?|fingers?|thumb|nails?|nail plate|deltoid|axilla|axillary|radial foveola|olecranon)\b/i;
const LEG_NAMES = /\b(thigh|femoral|knee|patell|leg|crural|calf|sural|ankle|malleol|foot|heel|sole|toes?|plantar|popliteal|gluteal|hip)\b/i;
const DISTAL_ARM = /\b(forearm|wrist|palm|hand|digits?|fingers?|thumb|nails?|nail plate|radial foveola|cubital|elbow|olecranon)\b/i;

/** El tronco en reposo, por rodajas: centro en z y semiejes. */
interface Slice { y0: number; a: number; z0: number; b: number }
function trunkSlices(scene: THREE.Object3D): Slice[] {
  scene.updateMatrixWorld(true);
  const pts: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh || !m.visible || layerForMaterial(matName(m)) !== 'skin') return;
    const n = spaced(m.name);
    if (ARM_NAMES.test(n) || LEG_NAMES.test(n)) return;
    const pos = m.geometry.getAttribute('position');
    if (m.isSkinnedMesh) m.skeleton.update();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (m.isSkinnedMesh) m.applyBoneTransform(i, v);
      v.applyMatrix4(m.matrixWorld);
      if (v.y < 0.98 || v.y > 1.46 || Math.abs(v.x) > 0.3) continue;
      pts.push(v.clone());
    }
  });
  const pct = (arr: number[], p: number) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))];
  };
  const out: Slice[] = [];
  for (let y0 = 0.98; y0 < 1.46; y0 += 0.02) {
    const s = pts.filter((p) => p.y >= y0 && p.y < y0 + 0.02);
    if (s.length < 30) continue;
    const zmin = pct(s.map((p) => p.z), 0.03);
    const zmax = pct(s.map((p) => p.z), 0.97);
    out.push({ y0, a: pct(s.map((p) => Math.abs(p.x)), 0.95), z0: (zmin + zmax) / 2, b: (zmax - zmin) / 2 });
  }
  return out;
}

/** Radio normalizado de un punto respecto al tronco (Infinity fuera de las rodajas). */
function trunkR(slices: Slice[], p: THREE.Vector3): number {
  const s = slices.find((q) => p.y >= q.y0 && p.y < q.y0 + 0.02);
  if (!s) return Infinity;
  return Math.sqrt((p.x / s.a) ** 2 + ((p.z - s.z0) / s.b) ** 2);
}

interface Result { order: DemoOrder; maxFrac: number; atT: number; minR: number; heldFrac: number }

async function measure(demo: Demo, side: Side, slices: Slice[]): Promise<Result[]> {
  const scene = await fresh();
  const poser = createRigPoser(scene, demo.movementId, side, true);
  const base = getBoneControl(demo.movementId)!;
  const fromMax = base.kind === 'joint' && (base as { arcFrom?: string }).arcFrom === 'max';
  const isArm =
    base.kind === 'chain' ||
    (base.kind === 'joint' && (base as { armatureBase: string }).armatureBase === 'Shoulder_Armature');
  const elevation =
    base.kind === 'chain' ||
    (base.kind === 'joint' &&
      (base as { armatureBase: string }).armatureBase === 'Shoulder_Armature' &&
      (base as { bone: string }).bone === 'humerus_gh' &&
      (base as { axis: string }).axis === 'x');
  const hum = poser.shoulderBones.get('humerus_gh');
  const findIn = (armatureBase: string, n: string): THREE.Object3D | null => {
    const arm = scene.getObjectByName(resolveArmatureName(armatureBase, side));
    let hit: THREE.Object3D | null = null;
    arm?.traverse((o) => {
      if (!hit && baseName(o.name) === n) hit = o;
    });
    return hit;
  };
  // El miembro que se mueve: el lado activo es el signo de x del rig (_R en +x).
  const posX = side === 'R' ? 1 : -1;
  const limb: THREE.SkinnedMesh[] = [];
  const c = new THREE.Vector3();
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh || !m.visible || layerForMaterial(matName(m)) !== 'skin') return;
    if (!DISTAL_ARM.test(spaced(m.name))) return;
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    c.copy(m.geometry.boundingSphere!.center).applyMatrix4(m.matrixWorld);
    if (Math.sign(c.x) !== posX) return;
    limb.push(m);
  });

  const apply = (baseFrac: number, compFrac: number) => {
    const deg = baseAngle(baseFrac, demo.angleDeg, fromMax);
    poser.pose(deg, { withClearance: false });
    const zeroed = new Set<THREE.Object3D>();
    for (const comp of demo.components) {
      const cc = getBoneControl(comp.movementId);
      if (!cc || cc.kind !== 'joint') continue;
      for (const p of cc.posture ?? []) {
        if (!p.zeroPoint) continue;
        const pb = findIn(cc.armatureBase, p.bone);
        if (!pb || zeroed.has(pb)) continue;
        zeroed.add(pb);
        pb.rotateOnAxis(AX[p.axis], p.sign[side] * p.deg * D2R);
      }
      const bone = findIn(cc.armatureBase, cc.bone);
      if (bone) bone.rotateOnAxis(AX[cc.axis], cc.sign[side] * comp.angleDeg * compFrac * D2R);
    }
    // La holgura del brazo, DESPUES de los componentes, como en la aplicacion.
    if (isArm && hum) {
      const f = elevation
        ? Math.max(0, Math.min(1, (ARM_CLEARANCE_FADE_DEG - deg) / ARM_CLEARANCE_FADE_DEG))
        : 1;
      if (f > 0) hum.rotateOnAxis(AX.x, -ARM_CLEARANCE_DEG * f * D2R);
    }
    scene.updateMatrixWorld(true);
  };

  const inside = (): { frac: number; minR: number } => {
    let n = 0;
    let hit = 0;
    let minR = Infinity;
    const v = new THREE.Vector3();
    for (const m of limb) {
      m.skeleton.update();
      const pos = m.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i += 2) {
        v.fromBufferAttribute(pos, i);
        m.applyBoneTransform(i, v);
        v.applyMatrix4(m.matrixWorld);
        n++;
        const r = trunkR(slices, v);
        if (r < minR) minR = r;
        if (r < INSIDE_R) hit++;
      }
    }
    return { frac: n ? hit / n : 0, minR };
  };

  const out: Result[] = [];
  const compDegs = demo.components.map((k) => k.angleDeg);
  const ordenes: DemoOrder[] = demo.components.length ? ORDERS : ['base-first'];
  for (const order of ordenes) {
    const plan = strokePlan(order, demo.angleDeg, compDegs);
    let maxFrac = 0;
    let atT = 0;
    let minR = Infinity;
    for (let k = 0; k <= SAMPLES; k++) {
      const t = k / SAMPLES;
      const f = strokeAt(order, t, demo.components.length > 0, plan.split);
      apply(f.base, f.comp);
      const r = inside();
      if (r.frac > maxFrac) {
        maxFrac = r.frac;
        atT = t;
      }
      if (r.minR < minR) minR = r.minR;
    }
    apply(1, 1);
    out.push({ order, maxFrac, atT, minR, heldFrac: inside().frac });
  }
  return out;
}

// El tronco se mide una vez, en reposo y con los mismos pases que la aplicacion.
const restScene = await fresh();
createRigPoser(restScene, 'glenohumeral-abduction', 'R', true).pose(0);
const slices = trunkSlices(restScene);
console.log(`tronco: ${slices.length} rodajas de 2 cm entre y=${slices[0]?.y0.toFixed(2)} y ${(slices.at(-1)!.y0 + 0.02).toFixed(2)}`);
console.log(`  semiejes en el torax (y~1,30): a=${slices.find((s) => s.y0 > 1.29)?.a.toFixed(3)} m  b=${slices.find((s) => s.y0 > 1.29)?.b.toFixed(3)} m`);
console.log('');

const pctTxt = (f: number) => `${(f * 100).toFixed(1).padStart(5)}%`;
let peorActual = 0;
let peorElegido = 0;
const elegidos: Record<string, DemoOrder> = {};
for (const demo of lista) {
  const rows: Record<DemoOrder, Result[]> = { together: [], 'base-first': [], 'components-first': [], proportional: [] };
  for (const s of ['R', 'L'] as const) {
    const side = rigSideFor(s);
    for (const r of await measure({ ...demo, side: s }, side, slices)) rows[r.order].push(r);
  }
  const peor = (o: DemoOrder) => (rows[o].length ? Math.max(...rows[o].map((r) => r.maxFrac)) : Infinity);
  // El mejor orden: el que menos mete el miembro en el tronco. Empate (menos de
  // 0,5 puntos) -> el de por defecto, que es la forma en que se explora.
  let mejor: DemoOrder = 'base-first';
  for (const o of ORDERS) if (peor(o) < peor(mejor) - 0.005) mejor = o;
  elegidos[demo.id] = mejor;
  if (rows.together.length) peorActual = Math.max(peorActual, peor('together'));
  peorElegido = Math.max(peorElegido, peor(mejor));
  console.log(`${demo.where.padEnd(11)} ${demo.id.padEnd(26)} ${demo.movementId}@${demo.angleDeg}${demo.components.length ? ' + ' + demo.components.map((k) => `${k.movementId}@${k.angleDeg}`).join(' + ') : ''}`);
  for (const o of ORDERS) {
    const rs = rows[o];
    if (!rs.length) continue;
    const w = rs.reduce((a, b) => (b.maxFrac > a.maxFrac ? b : a));
    console.log(
      `   ${o === mejor ? '>' : ' '} ${o.padEnd(17)} dentro del tronco: peor ${pctTxt(peor(o))} (t=${w.atT.toFixed(2)})   radio min ${Number.isFinite(w.minR) ? w.minR.toFixed(2) : ' -- '}   en la posicion final ${pctTxt(Math.max(...rs.map((r) => r.heldFrac)))}`,
    );
  }
}
console.log('');
console.log('===== RESUMEN =====');
console.log(`  demos medidos: ${lista.length} (${lista.filter((d) => d.components.length).length} con componentes), en los dos lados`);
console.log(`  peor con el orden de antes ('together'): ${pctTxt(peorActual)} del antebrazo y la mano dentro del tronco`);
console.log(`  peor con el orden elegido por demo:      ${pctTxt(peorElegido)}`);
const noDefecto = Object.entries(elegidos).filter(([, o]) => o !== 'base-first');
console.log(`  demos que piden otro orden que 'base-first': ${noDefecto.length ? noDefecto.map(([id, o]) => `${id}=${o}`).join(', ') : 'ninguno'}`);
if (peorElegido > 0.02) process.exitCode = 1;
