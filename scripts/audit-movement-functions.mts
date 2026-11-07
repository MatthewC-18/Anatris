// ¿HACE ESE MUSCULO ESE MOVIMIENTO?
//
// `npm run audit-direction` dice hacia donde va cada movimiento y
// `npm run audit-angles` cuantos grados recorre. Esta mira la otra mitad de lo
// que el panel ensena: LAS FUNCIONES. Cada fase acredita musculos como motor
// principal, asistente o estabilizador, y cada musculo declara aparte sus
// propias acciones en su ficha anatomica. Son dos datos escritos por separado y
// nada comprobaba que dijeran lo mismo.
//
// Imprime musculo por musculo para que se pueda revisar con los ojos, y
// suspende cuando un motor o un asistente no tiene en su ficha el gesto que se
// le acredita. La deteccion vive en src/lib/movementFunctions.ts, compartida con
// el test de regresion.
//
// Lee los modulos de cada region DIRECTAMENTE y no `romForRegion`, que consulta
// el almacen premium del runtime y en un script devuelve lista vacia.
//
// Run: npm run audit-functions
import { SHOULDER_ROM_LIST } from '../src/data/shoulderRom.ts';
import { ELBOW_ROM_LIST } from '../src/data/elbowRom.ts';
import { KNEE_ROM_LIST } from '../src/data/kneeRom.ts';
import { HIP_ROM_LIST } from '../src/data/hipRom.ts';
import { ANKLE_ROM_LIST } from '../src/data/ankleRom.ts';
import { CERVICAL_ROM_LIST } from '../src/data/cervicalRom.ts';
import { THORACIC_ROM_LIST } from '../src/data/thoracicRom.ts';
import { LUMBAR_ROM_LIST } from '../src/data/lumbarRom.ts';
import { shoulderMuscles } from '../src/data/muscles/shoulder.ts';
import { elbowMuscles } from '../src/data/muscles/elbow.ts';
import { kneeMuscles } from '../src/data/muscles/knee.ts';
import { hipMuscles } from '../src/data/muscles/hip.ts';
import { ankleMuscles } from '../src/data/muscles/ankle.ts';
import { spineMuscles } from '../src/data/muscles/spine.ts';
import { SHOULDER_TRACK } from '../src/data/shoulderPhases.ts';
import { ELBOW_TRACK } from '../src/data/elbowPhases.ts';
import { KNEE_TRACK } from '../src/data/kneePhases.ts';
import { HIP_TRACK } from '../src/data/hipPhases.ts';
import { ANKLE_TRACK } from '../src/data/anklePhases.ts';
import { CERVICAL_TRACK } from '../src/data/cervicalPhases.ts';
import { THORACIC_TRACK } from '../src/data/thoracicPhases.ts';
import { LUMBAR_TRACK } from '../src/data/lumbarPhases.ts';
import {
  isFunctionDefect,
  readGuideRoleConflicts,
  readMovementFunctions,
  readRoleDisagreements,
  type GuideLike,
  type MovementLike,
  type MuscleLike,
} from '../src/lib/movementFunctions.ts';

const REGIONS: { name: string; movements: unknown[] }[] = [
  { name: 'shoulder', movements: SHOULDER_ROM_LIST },
  { name: 'elbow', movements: ELBOW_ROM_LIST },
  { name: 'knee', movements: KNEE_ROM_LIST },
  { name: 'hip', movements: HIP_ROM_LIST },
  { name: 'ankle', movements: ANKLE_ROM_LIST },
  { name: 'cervical', movements: CERVICAL_ROM_LIST },
  { name: 'thoracic', movements: THORACIC_ROM_LIST },
  { name: 'lumbar', movements: LUMBAR_ROM_LIST },
];

// LA UNION DE TODAS LAS REGIONES, a proposito: un movimiento toracico recluta
// legitimamente la pared abdominal, que vive en la lumbar, y un movimiento del
// hombro recluta musculos que la ficha guarda en el codo. Buscar solo en la
// region del movimiento daria por "sin ficha" a los invitados.
const MUSCLES: MuscleLike[] = [
  ...shoulderMuscles, ...elbowMuscles, ...kneeMuscles,
  ...hipMuscles, ...ankleMuscles, ...spineMuscles,
] as MuscleLike[];

const ROLE_LABEL = {
  'prime-mover': 'motor principal ',
  assistant: 'asistente       ',
  'eccentric-control': 'freno excentrico',
  stabilizer: 'estabilizador   ',
} as const;

let defects = 0;
let judged = 0;
let unjudgeable = 0;
const perRegion: { region: string; movements: number; defects: number }[] = [];

console.log('===== LAS FUNCIONES: ¿HACE ESE MUSCULO ESE MOVIMIENTO? =====');
console.log('Se compara lo que la fase le acredita con lo que su propia ficha declara.');
console.log('Un estabilizador NO produce el movimiento, asi que no se le exige el gesto.');
console.log('');

for (const reg of REGIONS) {
  let regDefects = 0;
  console.log(`--- ${reg.name} (${reg.movements.length} movimientos) ---`);
  for (const mv of reg.movements as MovementLike[]) {
    const readings = readMovementFunctions(mv, MUSCLES);
    const bad = readings.filter(isFunctionDefect);
    judged += readings.filter((r) => r.role !== 'stabilizer').length;
    unjudgeable += readings.filter((r) => r.noActions).length;
    if (bad.length === 0) {
      console.log(`  OK  ${mv.id.padEnd(34)} ${readings.length} musculos acreditados`);
      continue;
    }
    regDefects += bad.length;
    defects += bad.length;
    console.log(`  MAL ${mv.id.padEnd(34)} ${bad.length} de ${readings.length} sin respaldo`);
    for (const r of bad) {
      const why = r.noActions
        ? 'su ficha no declara NINGUNA accion'
        : r.role === 'eccentric-control'
          ? `un freno tiene que ser el antagonista (${r.opposites.join('/')}), y su ficha declara ${r.declared.join(', ') || '—'}`
          : r.contradicts
            ? `su ficha le atribuye EL CONTRARIO (${r.declared.join(', ')})`
            : `su ficha declara ${r.declared.length ? r.declared.join(', ') : '—'}`;
      console.log(
        `        ${ROLE_LABEL[r.role]}  ${r.muscleName.padEnd(30)} ` +
        `pide "${r.wanted.join('/')}", ${why}`,
      );
    }
  }
  perRegion.push({ region: reg.name, movements: reg.movements.length, defects: regDefects });
  console.log('');
}

console.log('===== RESUMEN =====');
for (const r of perRegion) {
  console.log(`  ${r.region.padEnd(10)} ${String(r.movements).padStart(2)} movimientos   ` +
    `${r.defects === 0 ? 'sin defectos' : `${r.defects} sin respaldo`}`);
}
console.log('');
console.log(`  ${judged} acreditaciones de motor o asistente revisadas.`);
if (unjudgeable > 0) {
  console.log(`  ${unjudgeable} de ellas sobre musculos sin acciones en su ficha, que no se pueden juzgar.`);
}
console.log('');
console.log(
  defects === 0
    ? '  Todo motor y todo asistente tiene el gesto en su propia ficha.'
    : `  ${defects} acreditacion(es) que la ficha del musculo no respalda.`,
);

if (defects > 0) process.exitCode = 1;

// ---------------------------------------------------------------------------
// EL MISMO PAPEL, ESCRITO DOS VECES.
//
// El rol de un musculo vive en la fase Y en su envolvente de reclutamiento, y el
// panel prefiere la segunda. Corregir solo la fase deja la pantalla igual: paso
// al convertir el erector lumbar en freno excentrico — el dato decia "freno" y
// el panel seguia mostrando "Motor principal: Iliocostal lumbar 76%".
// ---------------------------------------------------------------------------
console.log('===== EL MISMO PAPEL, ESCRITO DOS VECES =====');
console.log('La fase dice un rol y la envolvente de reclutamiento dice otro.');
console.log('El panel muestra el de la ENVOLVENTE, asi que ese es el que se lee.');
console.log('');
let disagreements = 0;
for (const reg of REGIONS) {
  for (const mv of reg.movements as MovementLike[]) {
    const bad = readRoleDisagreements(mv);
    if (bad.length === 0) continue;
    disagreements += bad.length;
    console.log(`  MAL ${mv.id}`);
    for (const d of bad) {
      console.log(
        `        ${d.muscleId.padEnd(26)} la fase dice ${d.phaseRoles.join('/')}, ` +
        `la envolvente dice ${d.activationRole} (y es la que se ve)`,
      );
    }
  }
}
console.log('');
console.log(
  disagreements === 0
    ? '  Los dos sitios donde vive el papel de un musculo dicen lo mismo.'
    : `  ${disagreements} musculo(s) con dos papeles distintos en el mismo movimiento.`,
);

if (disagreements > 0) process.exitCode = 1;

// ---------------------------------------------------------------------------
// Y EL CUARTO SITIO: LAS GUIAS GESTUALES.
//
// Los pasos de la fase de biomecanica llevan su propio rol, y colorean el chip
// y el musculo mientras el alumno avanza. Un paso puede subrayar a un asistente
// como protagonista de SU tramo y eso es ensenanza, no defecto; lo que no puede
// es titularse «el erector frena» y acreditar al erector como MOTOR.
// ---------------------------------------------------------------------------
const TRACKS = [
  SHOULDER_TRACK, ELBOW_TRACK, KNEE_TRACK, HIP_TRACK,
  ANKLE_TRACK, CERVICAL_TRACK, THORACIC_TRACK, LUMBAR_TRACK,
];
const GUIDES = TRACKS.flatMap(
  (t) => Object.values(t.phases).flatMap(
    (ph) => ((ph as { guides?: unknown[] }).guides ?? []) as GuideLike[],
  ),
);
const ALL_MOVES = REGIONS.flatMap((r) => r.movements) as MovementLike[];

console.log('');
console.log('===== LAS GUIAS GESTUALES, PASO A PASO =====');
console.log(`${GUIDES.length} guias con ${GUIDES.reduce((n, g) => n + g.steps.length, 0)} pasos.`);
console.log('Un paso no puede llamar motor a lo que el movimiento llama freno.');
console.log('');
const conflicts = readGuideRoleConflicts(GUIDES, ALL_MOVES);
for (const c of conflicts) {
  console.log(`  MAL ${c.movementId} / paso "${c.stepTitle}"`);
  console.log(
    `        ${c.muscleId.padEnd(26)} la guia dice ${c.guideRole}, ` +
    `el movimiento dice ${c.romRoles.join('/')}`,
  );
}
console.log('');
console.log(
  conflicts.length === 0
    ? '  Ningun paso de guia contradice la funcion del movimiento.'
    : `  ${conflicts.length} paso(s) de guia con la funcion al reves.`,
);

if (conflicts.length > 0) process.exitCode = 1;
