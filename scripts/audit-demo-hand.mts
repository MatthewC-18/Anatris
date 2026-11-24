// ¿ESTÁ EL PULGAR DONDE DICE LA PRUEBA?
//
// Hay tres pruebas de hombro cuyo rasgo distintivo es la ORIENTACIÓN DE LA MANO,
// no el ángulo del brazo:
//
//   - Lata vacía (Jobe): abducción con el pulgar HACIA ABAJO. Sin eso es una
//     abducción resistida cualquiera.
//   - O'Brien, primera fase: flexión con el pulgar HACIA ABAJO (la segunda fase
//     es la misma flexión con la palma arriba, y la prueba es la diferencia).
//   - Speed: flexión con el antebrazo SUPINADO, palma arriba.
//
// Eso no se puede revisar a ojo en una captura --la mano ocupa veinte píxeles y
// el pulgar se confunde con el índice-- y tampoco se puede deducir del dato: el
// mismo par de componentes (rotación interna 60-70 + pronación 80) deja el
// pulgar ABAJO con el brazo en flexión y ARRIBA con el brazo en abducción,
// porque los ejes se combinan distinto. Medido, con la pronación puesta Jobe
// daba +5,6 cm (pulgar arriba): la maniobra decía una cosa y el modelo hacía la
// contraria.
//
// Así que se mide: se posa el demo entero (base + componentes + el cero clínico
// de cada componente, igual que RigModel) y se compara la ALTURA del pulgar con
// la del meñique. Negativo = pulgar abajo.
//
// Run: npm run audit-demo-hand
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, baseName, type Side } from './lib/rigPose.mts';
import { demoHeldAngle, getBoneControl, resolveArmatureName, rigSideFor } from '../src/lib/boneMap.ts';
import { ALL_TESTS_BY_REGION } from '../src/data/fullContent.ts';
import type { OrthopedicTest } from '../src/types/orthopedicTest.ts';

const D2R = Math.PI / 180;
const AX: Record<string, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};
/** Margen: por debajo de 2 cm la diferencia no se lee en pantalla. */
const CLEAR_CM = 2;

/** Lo que cada prueba PROMETE en su texto, y por tanto tiene que verse. */
const EXPECT: Record<string, { want: 'abajo' | 'arriba'; why: string }> = {
  'empty-can': { want: 'abajo', why: 'la lata vacía ES el pulgar hacia abajo' },
  obrien: { want: 'abajo', why: 'la primera fase de O’Brien es con el pulgar abajo' },
  speed: { want: 'arriba', why: 'Speed se hace con el antebrazo supinado, palma arriba' },
};

const all: OrthopedicTest[] = Object.values(ALL_TESTS_BY_REGION).flat();
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

/** Altura del pulgar menos la del meñique, en cm, con el demo ya posado. */
async function handRoll(test: OrthopedicTest): Promise<number | null> {
  const demo = test.demo;
  if (!demo) return null;
  const side = rigSideFor((demo.side ?? 'R') as Side);
  const gl = await ld.parseAsync(ab.slice(0) as ArrayBuffer, '');
  const scene = gl.scene;
  const poser = createRigPoser(scene, demo.movementId, side, true);
  // La pose SOSTENIDA, como la aplicacion (boneMap.demoHeldAngle).
  poser.pose(demoHeldAngle(demo.movementId, demo.angleDeg));
  for (const comp of demo.components ?? []) {
    const cc = getBoneControl(comp.movementId);
    if (!cc || cc.kind !== 'joint') continue;
    const armature = scene.getObjectByName(resolveArmatureName(cc.armatureBase, side));
    const find = (n: string): THREE.Object3D | null => {
      let hit: THREE.Object3D | null = null;
      armature?.traverse((o) => {
        if (!hit && baseName(o.name) === n) hit = o;
      });
      return hit;
    };
    for (const p of cc.posture ?? []) {
      if (!p.zeroPoint) continue;
      const pb = find(p.bone);
      if (pb) pb.rotateOnAxis(AX[p.axis], p.sign[side] * p.deg * D2R);
    }
    const bone = find(cc.bone);
    if (bone) bone.rotateOnAxis(AX[cc.axis], cc.sign[side] * comp.angleDeg * D2R);
    scene.updateMatrixWorld(true);
  }
  scene.updateMatrixWorld(true);

  const posX = side === 'R' ? 1 : -1;
  const centre = (re: RegExp): THREE.Vector3 | null => {
    const acc = new THREE.Vector3();
    let n = 0;
    const box = new THREE.Box3();
    const c = new THREE.Vector3();
    scene.traverse((o: THREE.Object3D) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isMesh || !re.test(m.name)) return;
      const pos = m.geometry.getAttribute('position');
      if (!pos) return;
      if (m.isSkinnedMesh) m.skeleton.update();
      const v = new THREE.Vector3();
      box.makeEmpty();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        if (m.isSkinnedMesh) m.applyBoneTransform(i, v);
        (m as unknown as THREE.Mesh).localToWorld(v);
        box.expandByPoint(v);
      }
      box.getCenter(c);
      if (Math.sign(c.x) !== posX) return;
      acc.add(c);
      n += 1;
    });
    return n ? acc.divideScalar(n) : null;
  };
  const thumb = centre(/first_finger_of_hand/i);
  const pinky = centre(/fifth_finger_of_hand/i);
  if (!thumb || !pinky) return null;
  return (thumb.y - pinky.y) * 100;
}

console.log('===== LA MANO DEL DEMO =====\n');
const rows: { id: string; cm: number }[] = [];
for (const t of all) {
  if (!t.demo) continue;
  // Sólo las del miembro superior: en la pierna no hay pulgar que mirar.
  const c = getBoneControl(t.demo.movementId);
  const base = c && (c.kind === 'joint' ? c.armatureBase : c.kind === 'chain' ? 'Shoulder_Armature' : '');
  if (base !== 'Shoulder_Armature') continue;
  const cm = await handRoll(t);
  if (cm == null) continue;
  rows.push({ id: t.id, cm });
}

let bad = 0;
for (const r of rows.sort((a, b) => a.cm - b.cm)) {
  const exp = EXPECT[r.id];
  const dir = r.cm < 0 ? 'abajo' : 'arriba';
  let mark = '  ';
  if (exp) {
    const ok = exp.want === dir && Math.abs(r.cm) >= CLEAR_CM;
    if (!ok) bad += 1;
    mark = ok ? 'ok' : 'XX';
  }
  console.log(
    `  ${mark}  ${r.id.padEnd(26)} ${r.cm.toFixed(1).padStart(6)} cm  pulgar ${dir}` +
      (exp ? `   (se espera ${exp.want}: ${exp.why})` : ''),
  );
}

console.log('\n===== RESUMEN =====');
console.log(`  ${rows.length} demos del miembro superior medidos`);
console.log(`  ${Object.keys(EXPECT).length} con una orientación que la prueba promete`);
if (bad > 0) {
  console.log(`\n  ${bad} NO cumplen lo que su texto dice.`);
  process.exitCode = 1;
} else {
  console.log('\n  Todas las que prometen una orientación de la mano la cumplen.');
}
