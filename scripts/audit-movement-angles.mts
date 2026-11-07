// ¿LLEGA EL RIG A LOS GRADOS QUE DICE EL PANEL?
//
// `npm run audit-direction` contesta HACIA DONDE va cada movimiento. Esta
// contesta CUANTO, que es la otra mitad de "fiel a la realidad" y nadie habia
// medido: el deslizador dice 135 grados de flexion de rodilla, y lo que hay que
// comprobar es que la rodilla quede a 135 y no a 112.
//
// No se mide el hueso contra el mundo, se mide contra SU SEGMENTO PADRE, que es
// lo que significa el numero clinico: la flexion de rodilla es la tibia
// respecto al femur, la del codo el antebrazo respecto al brazo, y la del
// raquis la vertebra de arriba del bloque respecto a la de abajo. Un hueso
// medido contra el mundo arrastra todo lo que haya pasado por encima.
//
// POR QUE NO ES TRIVIALMENTE CIERTO. Un movimiento simple es un
// `rotateOnAxis` y deberia dar exactamente sus grados, pero entre el dato y el
// hueso hay cuatro cosas que pueden cambiar la cifra:
//   - los ACOPLAMIENTOS, que escriben sobre el mismo hueso (la flexion de cruce
//     de la aduccion de cadera; ya borro una vez el movimiento entero);
//   - las POSTURAS de exploracion, que mueven la base desde la que se gira;
//   - el `aim` del hombro y el `scapulaWrap`, que posmultiplican el humero
//     DESPUES de aplicar la cadena;
//   - y las cadenas, donde el numero clinico es la suma de tres aportaciones y
//     ninguna de ellas por si sola vale ese numero.
//
// Ese ultimo caso es el interesante y no es un fallo: la elevacion del hombro
// se mide del humero respecto al TORAX, y de esos grados dos tercios los pone
// la articulacion glenohumeral y un tercio la escapula. El ritmo
// escapulohumeral 2:1 es una ley biomecanica, asi que aqui se mide y se
// comprueba, en vez de confiar en que la decomposicion se aplique.
//
// Run: npm run audit-angles
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { baseName, createRigPoser } from './lib/rigPose.mts';
import { BONE_MAP } from '../src/lib/boneMap.ts';
import { shoulderChain } from '../src/lib/biomech/shoulderChain.ts';

/** Un hueso, o el TORAX (que en este rig no se mueve solo). */
type Ref = string | 'world';

interface AngleCheck {
  move: string;
  /** Hueso cuyo giro ES el movimiento. */
  bone: string;
  /** Contra que se mide. El numero clinico siempre es relativo a algo. */
  ref: Ref;
  /** Lecturas extra, para repartir el angulo de una cadena. */
  split?: { label: string; bone: string; ref: Ref }[];
  /**
   * Grados que se esperan, cuando NO son los del `clinicalRange`.
   * Se escribe junto al motivo; sin motivo no se escribe.
   */
  expect?: number;
  why?: string;
  /** Margen, en grados. */
  tol?: number;
}

const CHECKS: AngleCheck[] = [
  // --- TOBILLO: el pie respecto a la pierna.
  { move: 'ankle-dorsiflexion', bone: 'foot_flex', ref: 'shin_flex' },
  { move: 'ankle-plantarflexion', bone: 'foot_flex', ref: 'shin_flex' },
  { move: 'ankle-inversion', bone: 'foot_flex', ref: 'shin_flex' },
  { move: 'ankle-eversion', bone: 'foot_flex', ref: 'shin_flex' },

  // --- RODILLA: la tibia respecto al femur.
  { move: 'knee-flexion', bone: 'shin_flex', ref: 'femur_base' },
  { move: 'knee-extension', bone: 'shin_flex', ref: 'femur_base' },
  { move: 'knee-internal-rotation', bone: 'shin_flex', ref: 'femur_base' },
  { move: 'knee-external-rotation', bone: 'shin_flex', ref: 'femur_base' },

  // --- CADERA: el femur respecto al tronco, que aqui no se mueve.
  { move: 'hip-flexion', bone: 'femur_base', ref: 'world' },
  { move: 'hip-extension', bone: 'femur_base', ref: 'world' },
  { move: 'hip-abduction', bone: 'femur_base', ref: 'world' },
  {
    move: 'hip-adduction',
    bone: 'femur_base',
    ref: 'world',
    // La aduccion lleva una flexion de cruce DELIBERADA en el mismo hueso
    // (hipCrossOverFlexion), porque la pierna de apoyo esta en medio. El giro
    // total del femur es entonces la composicion de las dos, no la aduccion
    // sola: 20 grados de aduccion mas 25 de flexion dan ~32 por Pitagoras.
    expect: Math.round((180 / Math.PI) * Math.acos(Math.cos((20 * Math.PI) / 180) * Math.cos((25 * Math.PI) / 180))),
    why: 'aduccion 20 compuesta con la flexion de cruce de 25',
    tol: 3,
  },
  { move: 'hip-internal-rotation', bone: 'femur_base', ref: 'world' },
  { move: 'hip-external-rotation', bone: 'femur_base', ref: 'world' },

  // --- CODO Y ANTEBRAZO.
  { move: 'elbow-flexion', bone: 'forearm_flex', ref: 'humerus_gh' },
  { move: 'elbow-extension', bone: 'forearm_flex', ref: 'humerus_gh' },
  { move: 'elbow-pronation', bone: 'forearm_rot', ref: 'forearm_flex' },
  { move: 'elbow-supination', bone: 'forearm_rot', ref: 'forearm_flex' },

  // --- MUNECA.
  { move: 'wrist-flexion', bone: 'hand_flex', ref: 'forearm_rot' },
  { move: 'wrist-extension', bone: 'hand_flex', ref: 'forearm_rot' },

  // --- HOMBRO. Las dos elevaciones son cadenas: el numero clinico es el humero
  // respecto al TORAX, y el reparto se imprime al lado.
  // LAS DOS ELEVACIONES NO SE MIDEN AQUI, y no es pereza.
  //
  // El giro del hueso del humero NO es la elevacion del brazo: por encima de 90
  // grados el modelo le suma la rotacion externa obligatoria, que gira el hueso
  // sobre su propio eje y no sube la mano ni un milimetro. Medido, la flexion a
  // 180 daba un hueso girado 177,5 grados con el brazo elevado 156. Un angulo de
  // hueso habria dado por buena una elevacion que se queda a 24 grados.
  //
  // Lo que se mide es la DIRECCION DEL BRAZO (hombro a codo) y, como un
  // goniometro, EN SU PLANO: la abduccion en el frontal y la flexion en el
  // sagital. Eso lo hace el bloque del ritmo, mas abajo.
  { move: 'glenohumeral-internal-rotation', bone: 'humerus_gh', ref: 'scapula' },
  { move: 'glenohumeral-external-rotation', bone: 'humerus_gh', ref: 'scapula' },

  // --- RAQUIS: la vertebra de arriba del bloque respecto a la de debajo del
  // bloque, que es exactamente el angulo regional que se mide en consulta.
  { move: 'lumbar-flexion', bone: 'vert_L1', ref: 'vert_sacrum' },
  { move: 'lumbar-extension', bone: 'vert_L1', ref: 'vert_sacrum' },
  { move: 'lumbar-lateral-flexion', bone: 'vert_L1', ref: 'vert_sacrum' },
  { move: 'lumbar-rotation', bone: 'vert_L1', ref: 'vert_sacrum' },
  { move: 'thoracic-flexion', bone: 'vert_T1', ref: 'vert_L1' },
  { move: 'thoracic-extension', bone: 'vert_T1', ref: 'vert_L1' },
  { move: 'thoracic-lateral-flexion', bone: 'vert_T1', ref: 'vert_L1' },
  { move: 'thoracic-rotation', bone: 'vert_T1', ref: 'vert_L1' },
  { move: 'cervical-flexion', bone: 'vert_C1', ref: 'vert_T1' },
  { move: 'cervical-extension', bone: 'vert_C1', ref: 'vert_T1' },
  { move: 'cervical-lateral-flexion', bone: 'vert_C1', ref: 'vert_T1' },
  { move: 'cervical-rotation', bone: 'vert_C1', ref: 'vert_T1' },
];

// ---------------------------------------------------------------------------
const buf = readFileSync(rigGlbPath());
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder as never);
const gltf = await loader.parseAsync(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '',
);
const scene = gltf.scene as THREE.Object3D;
scene.updateMatrixWorld(true);

// El reposo verdadero, aparte. `createRigPoser` captura "reposo" del escenario
// TAL COMO LO ENCUENTRA, y una postura de exploracion se queda puesta tras su
// ultimo `pose(0)`: sin esto, el poser siguiente adopta un codo doblado como
// reposo y le suma sus propios 90 grados. Es el mismo guardarraíl que lleva el
// audit de direccion, y por el mismo fallo medido.
const restSnapshot: { o: THREE.Object3D; q: THREE.Quaternion; p: THREE.Vector3; s: THREE.Vector3 }[] = [];
scene.traverse((o) => {
  restSnapshot.push({ o, q: o.quaternion.clone(), p: o.position.clone(), s: o.scale.clone() });
});
function restoreRest(): void {
  for (const r of restSnapshot) {
    r.o.quaternion.copy(r.q);
    r.o.position.copy(r.p);
    r.o.scale.copy(r.s);
  }
  scene.updateMatrixWorld(true);
}

/** Los huesos de las cinco armaduras, por nombre base. */
const bones = new Map<string, THREE.Object3D>();
for (const an of [
  'Shoulder_Armature_R', 'Shoulder_Armature_L',
  'Leg_Armature_R', 'Leg_Armature_L', 'Spine_Armature',
]) {
  const root = scene.getObjectByName(an);
  if (!root) continue;
  root.traverse((o) => {
    const key = `${an}/${baseName(o.name)}`;
    if (!bones.has(key)) bones.set(key, o);
  });
}
/** La armadura en la que vive el hueso de este movimiento, para el lado dado. */
function armatureFor(move: string, side: 'R' | 'L'): string {
  const c = BONE_MAP[move] as { kind: string; armatureBase?: string };
  if (c.kind === 'spine') return 'Spine_Armature';
  if (c.kind === 'chain') return `Shoulder_Armature_${side}`;
  return `${c.armatureBase ?? 'Shoulder_Armature'}_${side}`;
}
function boneOf(armature: string, name: string): THREE.Object3D | null {
  return bones.get(`${armature}/${name}`) ?? null;
}

/** Orientacion de `moving` expresada en el marco de `ref`. */
function relQuat(moving: THREE.Object3D, ref: THREE.Object3D | null): THREE.Quaternion {
  const qm = moving.getWorldQuaternion(new THREE.Quaternion());
  if (!ref) return qm;
  return ref.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(qm);
}
/** Grados de giro entre dos orientaciones. Sin signo: el signo lo vigila el audit de direccion. */
function angleBetween(a: THREE.Quaternion, b: THREE.Quaternion): number {
  const d = Math.min(1, Math.abs(a.dot(b)));
  return (2 * Math.acos(d) * 180) / Math.PI;
}
/** El giro de `a` a `b` como eje y angulo, que es como se mide un reparto. */
function axisAngle(a: THREE.Quaternion, b: THREE.Quaternion): { axis: THREE.Vector3; deg: number } {
  const q = b.clone().multiply(a.clone().invert()).normalize();
  if (q.w < 0) { q.x = -q.x; q.y = -q.y; q.z = -q.z; q.w = -q.w; }
  const v = new THREE.Vector3(q.x, q.y, q.z);
  const len = v.length();
  if (len < 1e-9) return { axis: new THREE.Vector3(0, 1, 0), deg: 0 };
  return { axis: v.divideScalar(len), deg: (2 * Math.atan2(len, q.w) * 180) / Math.PI };
}
/**
 * CUANTO DE ESTE GIRO EMPUJA EL MOVIMIENTO.
 *
 * Un reparto no se puede hacer con angulos totales. La elevacion escapular se
 * conduce sobre la X LOCAL DE LA PALETA, que no es el eje en el que se mide la
 * elevacion del brazo, y la clavicula lleva encima una retraccion horizontal:
 * el angulo total de la escapula mezcla las tres cosas y no dice cuanto SUBE el
 * brazo. Lo que se mide aqui es el giro proyectado sobre el EJE DEL MOVIMIENTO,
 * que es exactamente la rotacion ascendente que un fisio ve y mide.
 */
function alongAxis(a: THREE.Quaternion, b: THREE.Quaternion, axis: THREE.Vector3): number {
  const r = axisAngle(a, b);
  return r.deg * r.axis.dot(axis);
}

interface Row {
  move: string;
  side: 'R' | 'L';
  stated: number;
  measured: number;
  split: { label: string; deg: number }[];
  ok: boolean;
  note: string;
}

const rows: Row[] = [];
let failures = 0;

for (const c of CHECKS) {
  const ctrl = BONE_MAP[c.move] as {
    kind: string;
    clinicalRange: { min: number; max: number };
    arcFrom?: 'max';
  };
  if (!ctrl) { console.log(`  ?   ${c.move} no esta en el mapa de huesos`); continue; }
  const deg = ctrl.clinicalRange.max;
  // `arcFrom: 'max'` comparte un arco con su flexion: 0 es la articulacion
  // estirada y el movimiento es el REGRESO, asi que el giro se mide igual (de 0
  // al maximo) y lo que cambia es solo cual de los dos extremos se llama fin.
  const expect = c.expect ?? deg;
  const tol = c.tol ?? 2;
  const sides: ('R' | 'L')[] = ctrl.kind === 'spine' ? ['R'] : ['R', 'L'];

  for (const side of sides) {
    restoreRest();
    let poser;
    try { poser = createRigPoser(scene, c.move, side); }
    catch (e) { console.log(`  ?   ${c.move} ${side} no accionable (${(e as Error).message})`); continue; }

    const arm = armatureFor(c.move, side);
    const moving = boneOf(arm, c.bone);
    if (!moving) { console.log(`  ?   ${c.move} ${side} sin hueso "${c.bone}" en ${arm}`); continue; }
    const refBone = c.ref === 'world' ? null : boneOf(arm, c.ref);
    if (c.ref !== 'world' && !refBone) {
      console.log(`  ?   ${c.move} ${side} sin hueso de referencia "${c.ref}" en ${arm}`);
      continue;
    }
    const splitBones = (c.split ?? []).map((s) => ({
      label: s.label,
      moving: boneOf(arm, s.bone),
      ref: s.ref === 'world' ? null : boneOf(arm, s.ref),
    }));

    poser.pose(0);
    scene.updateMatrixWorld(true);
    const q0 = relQuat(moving, refBone);
    const s0 = splitBones.map((s) => (s.moving ? relQuat(s.moving, s.ref) : null));

    poser.pose(deg);
    scene.updateMatrixWorld(true);
    const q1 = relQuat(moving, refBone);
    const measured = angleBetween(q0, q1);
    const split = splitBones.map((s, i) => ({
      label: s.label,
      deg: s.moving && s0[i] ? angleBetween(s0[i]!, relQuat(s.moving, s.ref)) : NaN,
    }));

    poser.pose(0);
    scene.updateMatrixWorld(true);

    const ok = Math.abs(measured - expect) <= tol;
    if (!ok) failures++;
    rows.push({
      move: c.move, side, stated: expect, measured, split, ok,
      note: c.why ?? '',
    });
  }
}

console.log('===== GRADOS: LO QUE DICE EL PANEL CONTRA LO QUE HACE EL HUESO =====');
console.log('Cada angulo se mide contra SU SEGMENTO PADRE, que es lo que significa el numero clinico.');
console.log('');
for (const r of rows) {
  const diff = r.measured - r.stated;
  const sp = r.split.length
    ? '   [' + r.split.map((s) => `${s.label} ${s.deg.toFixed(0)}`).join(' · ') + ']'
    : '';
  console.log(
    `  ${r.ok ? 'OK ' : 'MAL'} ${r.move.padEnd(32)} ${r.side}  ` +
    `dice ${String(r.stated).padStart(3)}  mide ${r.measured.toFixed(1).padStart(5)}  ` +
    `(${diff >= 0 ? '+' : ''}${diff.toFixed(1)})${sp}${r.note ? '   ' + r.note : ''}`,
  );
}
console.log('');
console.log(
  failures === 0
    ? '  Todos los movimientos alcanzan los grados que su ficha publica.'
    : `  ${failures} movimiento(s) no llegan a los grados que publican.`,
);
console.log('');

// ---------------------------------------------------------------------------
// EL RITMO ESCAPULOHUMERAL, que es una ley y no una preferencia.
//
// Por encima de los primeros grados de elevacion, cada 3 grados de brazo son 2
// de glenohumeral y 1 de escapula. Si el rig pone los 180 enteros en la
// glenohumeral, la escapula se queda quieta y la imagen es falsa aunque la mano
// acabe donde debe; si los pone todos en la escapula, pasa lo contrario.
// ---------------------------------------------------------------------------
console.log('===== RITMO ESCAPULOHUMERAL: EL REPARTO QUE EL PANEL PUBLICA =====');
console.log('Se mide SOBRE EL PROPIO BRAZO: cuanto sube, y donde estaria si solo se hubiera');
console.log('movido la cintura. La diferencia es la parte glenohumeral.');
console.log('El TOTAL va en el plano del movimiento, como un goniometro; el REPARTO en 3D,');
console.log('porque la paleta gira en su plano inclinado y proyectarla da dos cifras falsas.');
console.log('');
let rhythmFail = 0;
for (const move of ['glenohumeral-abduction', 'glenohumeral-flexion']) {
  const ctrl = BONE_MAP[move] as { clinicalRange: { max: number } };
  restoreRest();
  const poser = createRigPoser(scene, move, 'R');
  const arm = 'Shoulder_Armature_R';
  const hum = boneOf(arm, 'humerus_gh')!;
  const fore = boneOf(arm, 'forearm_flex')!;
  const scap = boneOf(arm, 'scapula')!;
  poser.pose(0);
  scene.updateMatrixWorld(true);
  // La direccion del brazo es el eje del humero, de hombro a codo: un vector del
  // propio hueso, no un supuesto sobre que eje local mira donde.
  const shaft = (): THREE.Vector3 =>
    fore.getWorldPosition(new THREE.Vector3())
      .sub(hum.getWorldPosition(new THREE.Vector3())).normalize();
  const shaftRest = shaft();
  // DOS PREGUNTAS, DOS REGLAS. Medirlas con la misma fue el error.
  //
  // 1. "¿LLEGA EL BRAZO A LOS GRADOS QUE DICE?" es una pregunta de goniometro, y
  //    un goniometro mide EN UN PLANO. El brazo no cuelga pegado al cuerpo: le
  //    queda una separacion lateral que el modelo CONSERVA a proposito (el aim
  //    rehace la direccion del eje preservando la componente fuera de plano), asi
  //    que el brazo sube por su propio plano parasagital, como un brazo de
  //    verdad, y el angulo 3D que recorre es menor que el que se mide. Medido: la
  //    flexion a 180 recorre 156 grados en 3D y 180 en el plano sagital. Sin
  //    proyectar, el banco suspendia un rig correcto.
  //
  // 2. "¿CUANTO PONE CADA ARTICULACION?" NO es una pregunta de plano, y por eso
  //    no se proyecta. La rotacion ascendente de la paleta gira sobre la
  //    perpendicular a SU plano, inclinado 34 grados hacia delante (medido), asi
  //    que al elevar lleva el brazo tanto arriba como adelante. Proyectada en el
  //    plano frontal, la aportacion de la cintura a 90 grados se queda en 9,8 y
  //    en el sagital sale 16,5 — dos cifras distintas para el mismo movimiento de
  //    la misma paleta, y ninguna de las dos es el reparto. El reparto es el
  //    angulo 3D humero-toracico, que es ademas la magnitud con la que la
  //    literatura del ritmo (Inman, Ludewig) da el 2:1.
  //
  // Asi que el total se mide en el plano y el reparto en 3D, y la razon entre las
  // dos partes es lo que se compara con la que el panel publica.
  // COMO UN GONIOMETRO: EN EL PLANO DEL MOVIMIENTO.
  //
  // El angulo 3D entre la direccion de reposo y la final no es el angulo
  // clinico, porque el brazo no cuelga pegado al cuerpo: le queda una separacion
  // lateral, y el modelo la CONSERVA a proposito (el aim rehace la direccion del
  // eje preservando la componente fuera de plano). Asi el brazo sube por su
  // propio plano parasagital, que es lo que hace un brazo de verdad — pero el
  // angulo 3D que recorre es entonces menor que el angulo medido. Medido: la
  // flexion a 180 recorre 156 grados en 3D y 180 en el plano sagital, que es el
  // que lee el goniometro. Sin proyectar, el banco suspendia un rig correcto.
  const plane = (BONE_MAP[move] as { aimPlane?: 'x' | 'z' }).aimPlane!;
  /** El angulo del eje del brazo dentro del plano en que se mide el movimiento. */
  const inPlane = (v: THREE.Vector3): number =>
    plane === 'z' ? Math.atan2(v.x, -v.y) : Math.atan2(v.z, -v.y);
  /** El angulo 3D entre dos direcciones, para el reparto. */
  const ang3 = (a: THREE.Vector3, b: THREE.Vector3): number =>
    (Math.acos(Math.min(1, Math.max(-1, a.dot(b)))) * 180) / Math.PI;
  const wrap = (a: number): number => {
    let d = a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    return (Math.abs(d) * 180) / Math.PI;
  };
  const restAng = inPlane(shaftRest);
  const girdleRest = scap.getWorldQuaternion(new THREE.Quaternion());

  console.log(`  ${move}`);
  for (const d of [30, 60, 90, 120, 150, ctrl.clinicalRange.max]) {
    if (d > ctrl.clinicalRange.max) continue;
    poser.pose(d);
    scene.updateMatrixWorld(true);
    const shaftNow = shaft();
    const total = wrap(inPlane(shaftNow) - restAng);
    const total3 = ang3(shaftRest, shaftNow);
    // Donde estaria el brazo si SOLO se hubiera movido la cintura. Esto es
    // estable en toda la cima del arco, al contrario que proyectar sobre un eje:
    // el eje de un giro de 179 grados se da la vuelta y hacia leer la escapula
    // "a -61 grados" y el brazo "a -151".
    const girdleOnly = shaftRest.clone().applyQuaternion(
      scap.getWorldQuaternion(new THREE.Quaternion()).multiply(girdleRest.clone().invert()),
    );
    const sc = ang3(shaftRest, girdleOnly);
    const gh = total3 - sc;

    // El mismo reparto que lee el panel, con la misma regla del tronco: solo
    // participa donde el control de verdad mueve el raquis.
    const trunkLean = (BONE_MAP[move] as { targets?: { target: { armature: string } }[] })
      .targets?.some((t) => t.target.armature === 'spine') ?? false;
    const r = shoulderChain(d, 'R', undefined, { trunkLean }).readout;
    // El tronco solo entra por encima de 150, y en el rig lo lleva la MISMA
    // medida de la cintura (carryShoulders gira el armature del hombro con el
    // raquis), asi que ahi se compara contra cintura + tronco.
    const wantSc = r.scapulaDeg + r.trunkDeg;
    const wantGh = r.ghDeg;
    // Lo primero que el panel dice: que el brazo llegue. En el plano.
    const okTotal = Math.abs(total - d) <= 3;
    // Cuanto pone la cintura, en 3D.
    const okSc = Math.abs(sc - wantSc) <= Math.max(4, wantSc * 0.2);
    // Y la razon entre las dos partes, que es el titular del panel. Se compara la
    // razon y no los grados absolutos de la glenohumeral porque los del panel
    // suman el angulo MEDIDO (en el plano) y los del hueso el 3D, que al final
    // del arco sagital no son el mismo numero.
    const have = sc > 0.5 ? gh / sc : Infinity;
    const want = wantSc > 0.5 ? wantGh / wantSc : Infinity;
    const okRatio =
      !Number.isFinite(have) || !Number.isFinite(want)
        ? d < 60
        : Math.abs(have - want) <= Math.max(0.6, want * 0.3);
    if (!okSc || !okTotal || !okRatio) rhythmFail++;
    console.log(
      `    ${okSc && okTotal && okRatio ? 'OK ' : 'MAL'} ${String(d).padStart(3)} deg  ` +
      `brazo ${total.toFixed(0).padStart(3)} en el plano / ${total3.toFixed(0).padStart(3)} en 3D  ` +
      `cintura ${sc.toFixed(1).padStart(5)} (panel ${wantSc.toFixed(1)})  ` +
      `glenohumeral ${gh.toFixed(1).padStart(5)}  ` +
      `razon ${Number.isFinite(have) ? have.toFixed(1) : '—'}:1 (panel ${r.ratio})`,
    );
  }
  poser.pose(0);
  scene.updateMatrixWorld(true);
  console.log('');
}
console.log(
  rhythmFail === 0
    ? '  El reparto que el panel publica es el que el hueso hace.'
    : `  ${rhythmFail} lectura(s) en las que el panel y el hueso no dicen lo mismo.`,
);
console.log('');

if (failures + rhythmFail > 0) process.exitCode = 1;
