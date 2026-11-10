// EL ANTEBRAZO SE QUEDA EN HUESO PELADO, Y ESTE SCRIPT LO MIDE.
//
// EL DEFECTO, MEDIDO EN PANTALLA ANTES DE ESCRIBIR ESTO. En /hombro/movimiento,
// muestreando el pixel del eje del antebrazo (de `forearm_rot` a `hand_flex`):
//
//   con todo como esta hoy      t=0,20 rgb(215,73,83)  t=0,45 rgb(148,123,120)  t=0,75 rgb(164,161,154)
//   ocultando la PIEL           t=0,20 rgb(215,73,83)  t=0,45 rgb(148,123,120)  t=0,75 rgb(164,161,154)
//   ocultando PIEL y HUESO      t=0,20 rgb(215,73,83)  t=0,45 rgb( 32, 10, 12)  t=0,75 rgb(  0,  0,  0)
//   ocultando PIEL y HUESO,
//   con lo CONECTIVO encendido  t=0,20 rgb(215,73,83)  t=0,45 rgb( 55, 33, 36)  t=0,75 rgb(121,122,124)
//
// Se lee asi: quitar la piel no cambia nada (el velo no era el problema), quitar
// el hueso deja NEGRO -- o sea fondo, nada -- de la mitad del antebrazo para
// abajo, y encender lo conectivo lo vuelve a llenar. Luego lo que hay en la
// mitad distal del antebrazo es TENDON, y el laboratorio arranca con la capa
// conectiva apagada. Resultado en camara: el antebrazo es una varilla de marfil
// entre un brazo con musculo y una mano con piel solida.
//
// Es lo que el usuario lleva varias sesiones describiendo ("deja descubierto el
// hueso del antebrazo", "los brazos se ven mal"). No era el recorte del
// antebrazo, ni la piel fantasma, ni un mal pesado: es que la mitad distal de un
// antebrazo ES tendon, y estaba apagada.
//
// LA REGLA QUE SE INTRODUCE: el tendon de un musculo es parte de ese musculo.
// Se enciende con la capa `muscle`, no con la conectiva. Ligamento, capsula y
// cartilago siguen bajo el interruptor.
//
// ESTE SCRIPT mide, sin camara y sobre el GLB real, cuanto hueso queda al aire
// si los tendones se apagan. Para cada segmento de miembro corta rodajas
// perpendiculares a su eje, divide cada rodaja en sectores y cuenta los sectores
// donde el hueso es lo mas externo salvo que entre el tendon.
//
// Uso: npm run audit-tendon-cover
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { layerForMaterial, materialIsTendon } from '../src/lib/materialColors.ts';
import { resolveArmatureName } from '../src/lib/boneMap.ts';
import { rigGlbPath } from './lib/rigPath.mts';

type Capa = 'muscle' | 'bone' | 'tendon';

/** Un segmento de miembro: dos huesos del rig y el armature donde viven. */
interface Segmento {
  nombre: string;
  armature: string;
  desde: string;
  hasta: string;
}

const SEGMENTOS: readonly Segmento[] = [
  { nombre: 'brazo', armature: 'Shoulder_Armature', desde: 'humerus_gh', hasta: 'forearm_flex' },
  { nombre: 'antebrazo', armature: 'Shoulder_Armature', desde: 'forearm_rot', hasta: 'hand_flex' },
  { nombre: 'muslo', armature: 'Leg_Armature', desde: 'femur_base', hasta: 'shin_flex' },
  { nombre: 'pierna', armature: 'Leg_Armature', desde: 'shin_flex', hasta: 'foot_flex' },
];

/** Rodajas a lo largo del segmento y sectores por rodaja. */
const TS = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
const SECTORES = 16;
const GROSOR = 0.02; // media rodaja, en metros
const RADIO_MAX = 0.1; // fuera de esto ya no es el miembro

/**
 * Cuanto tiene que sobresalir un tejido por encima del hueso para que cuente
 * como que lo tapa. 3 mm: por debajo de eso el musculo esta rozando el hueso y
 * en pantalla no lo cubre.
 */
const MARGEN = 0.003;

const path = rigGlbPath();
const buf = readFileSync(path);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const gltf = await new Promise<{ scene: THREE.Group }>((res, rej) =>
  ld.parse(ab, '', res as never, rej),
);
const scene = gltf.scene;
scene.updateMatrixWorld(true);

/** El hueso `base` dentro de ese armature, en coordenadas de mundo. */
function hueso(base: string, armature: string): THREE.Vector3 | null {
  const root = scene.getObjectByName(armature);
  if (!root) return null;
  let hit: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (hit) return;
    if (o.name.replace(/_\d+$/, '') === base) hit = o;
  });
  if (!hit) return null;
  return (hit as THREE.Object3D).getWorldPosition(new THREE.Vector3());
}

/** Clasifica una malla en la capa que el laboratorio le aplica. */
function capaDe(mesh: THREE.Mesh): Capa | null {
  const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const nombre = mat?.name ?? '';
  const capa = layerForMaterial(nombre);
  if (capa === 'muscle') return 'muscle';
  if (capa === 'bone') return 'bone';
  if (capa === 'connective' && materialIsTendon(nombre)) return 'tendon';
  return null;
}

const mallas: { mesh: THREE.Mesh; capa: Capa }[] = [];
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const capa = capaDe(m);
  if (capa) mallas.push({ mesh: m, capa });
});

const _v = new THREE.Vector3();

interface Rodaja {
  t: number;
  /** Sectores donde el hueso es lo mas externo y NO hay musculo que lo tape. */
  pelados: number;
  /** De esos, los que el tendon SI tapa. */
  rescatados: number;
  /** Sectores con hueso presente. */
  conHueso: number;
}

function mideSegmento(seg: Segmento, lado: 'R' | 'L'): Rodaja[] | null {
  const armature = resolveArmatureName(seg.armature, lado);
  const A = hueso(seg.desde, armature);
  const B = hueso(seg.hasta, armature);
  if (!A || !B) return null;
  const u = B.clone().sub(A).normalize();
  const largo = B.distanceTo(A);
  let e1 = new THREE.Vector3(0, 0, 1);
  e1.addScaledVector(u, -u.dot(e1));
  if (e1.lengthSq() < 1e-6) e1 = new THREE.Vector3(1, 0, 0);
  e1.normalize();
  const e2 = u.clone().cross(e1).normalize();

  // radio maximo por (rodaja, sector, capa)
  const radios = new Map<string, number>();
  const clave = (ti: number, sec: number, capa: Capa) => `${ti}|${sec}|${capa}`;

  for (const { mesh, capa } of mallas) {
    const pos = mesh.geometry.getAttribute('position');
    if (!pos || pos.count === 0) continue;
    const paso = Math.max(1, Math.floor(pos.count / 600));
    for (let i = 0; i < pos.count; i += paso) {
      _v.fromBufferAttribute(pos, i);
      const sk = mesh as THREE.SkinnedMesh;
      if (sk.isSkinnedMesh && sk.skeleton) sk.applyBoneTransform(i, _v);
      mesh.localToWorld(_v);
      const w = _v.clone().sub(A);
      const a = w.dot(u);
      const t = a / largo;
      if (t < 0 || t > 1) continue;
      const rad = w.addScaledVector(u, -a);
      const d = rad.length();
      if (d > RADIO_MAX) continue;
      const th = Math.atan2(rad.dot(e2), rad.dot(e1));
      const sec = (((Math.floor(((th + Math.PI) / (2 * Math.PI)) * SECTORES) % SECTORES) + SECTORES) %
        SECTORES) as number;
      for (let ti = 0; ti < TS.length; ti++) {
        if (Math.abs(t - TS[ti]) * largo > GROSOR) continue;
        const k = clave(ti, sec, capa);
        const prev = radios.get(k) ?? 0;
        if (d > prev) radios.set(k, d);
      }
    }
  }

  return TS.map((t, ti) => {
    let pelados = 0;
    let rescatados = 0;
    let conHueso = 0;
    for (let sec = 0; sec < SECTORES; sec++) {
      const h = radios.get(clave(ti, sec, 'bone')) ?? 0;
      if (h <= 0) continue;
      conHueso++;
      const m = radios.get(clave(ti, sec, 'muscle')) ?? 0;
      if (m >= h + MARGEN) continue; // el musculo ya lo tapa
      pelados++;
      const td = radios.get(clave(ti, sec, 'tendon')) ?? 0;
      if (td >= h + MARGEN) rescatados++;
    }
    return { t, pelados, rescatados, conHueso };
  });
}

const pct = (a: number, b: number) => (b === 0 ? '  -  ' : `${((100 * a) / b).toFixed(0).padStart(3)}%`);

console.log(`GLB ${path}`);
console.log(`     ${mallas.length} mallas de musculo/hueso/tendon`);
console.log('');
console.log('Sectores con hueso al aire (sin musculo que lo tape), y cuantos de');
console.log('esos tapa el TENDON. Si la segunda columna es alta, apagar los');
console.log('tendones deja ese tramo en hueso pelado.');
console.log('');

let peorSegmento = '';
let peorRescate = 0;
const filas: { seg: string; lado: string; t: number; pelados: number; rescatados: number; conHueso: number }[] = [];

for (const seg of SEGMENTOS) {
  for (const lado of ['R', 'L'] as const) {
    const rodajas = mideSegmento(seg, lado);
    if (!rodajas) {
      console.log(`${seg.nombre.padEnd(10)} ${lado}  (sin huesos en el rig: ${seg.desde} -> ${seg.hasta})`);
      continue;
    }
    const cab = `${seg.nombre.padEnd(10)} ${lado}`;
    const cuerpo = rodajas
      .map((r) => `t${r.t.toFixed(2)} ${pct(r.pelados, r.conHueso)}/${pct(r.rescatados, Math.max(r.pelados, 1))}`)
      .join('  ');
    console.log(`${cab}  ${cuerpo}`);
    for (const r of rodajas) {
      filas.push({ seg: seg.nombre, lado, ...r });
      const rescate = r.pelados === 0 ? 0 : r.rescatados / r.pelados;
      if (r.pelados >= 4 && rescate > peorRescate) {
        peorRescate = rescate;
        peorSegmento = `${seg.nombre} ${lado} t=${r.t}`;
      }
    }
  }
}

console.log('');
console.log('Lectura: "a/b" = a% de los sectores con hueso lo tienen al aire;');
console.log('         de esos, b% los tapa el tendon.');
console.log('');

// El titular: el tramo donde el tendon es MAS imprescindible.
if (peorSegmento) {
  console.log(
    `El tramo que mas depende del tendon: ${peorSegmento} ` +
      `(${(100 * peorRescate).toFixed(0)}% del hueso al aire lo tapa el tendon).`,
  );
}

// Y el resumen que el test vigila: el antebrazo distal.
const distalAntebrazo = filas.filter((f) => f.seg === 'antebrazo' && f.t >= 0.6);
const pel = distalAntebrazo.reduce((s, f) => s + f.pelados, 0);
const res = distalAntebrazo.reduce((s, f) => s + f.rescatados, 0);
const con = distalAntebrazo.reduce((s, f) => s + f.conHueso, 0);
console.log('');
console.log(
  `ANTEBRAZO DISTAL (t >= 0,6, los dos lados): ${pel} de ${con} sectores con el ` +
    `hueso al aire, y el tendon tapa ${res}.`,
);
if (pel > 0 && res === 0) {
  console.log('');
  console.log('AVISO: el tendon no rescata nada aqui. Si esto sale asi, la regla');
  console.log('"el tendon sigue a su musculo" no arregla el antebrazo y hay que');
  console.log('buscar la causa en otro sitio antes de tocar las capas.');
}
