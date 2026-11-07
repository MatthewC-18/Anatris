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
import {
  isFunctionDefect,
  readMovementFunctions,
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
