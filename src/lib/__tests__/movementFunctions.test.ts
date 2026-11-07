// ¿HACE ESE MUSCULO ESE MOVIMIENTO?
//
// Dos datos escritos por separado: la fase acredita musculos como motor,
// asistente, freno o estabilizador, y cada musculo declara aparte sus propias
// acciones. Nada comprobaba que dijeran lo mismo, y un desacuerdo no se ve: el
// chip se pinta igual, el musculo se ilumina igual y los grados son correctos.
// Lo unico que esta mal es la funcion, que es lo que el alumno viene a aprender.
//
// `npm run audit-functions` lo imprime musculo por musculo; esto lo fija.

import { describe, it, expect } from 'vitest';
import {
  gesturesIn,
  isFunctionDefect,
  readMovementFunctions,
  type MovementLike,
  type MuscleLike,
} from '../movementFunctions';
import { SHOULDER_ROM_LIST } from '../../data/shoulderRom';
import { ELBOW_ROM_LIST } from '../../data/elbowRom';
import { KNEE_ROM_LIST } from '../../data/kneeRom';
import { HIP_ROM_LIST } from '../../data/hipRom';
import { ANKLE_ROM_LIST } from '../../data/ankleRom';
import { CERVICAL_ROM_LIST } from '../../data/cervicalRom';
import { THORACIC_ROM_LIST } from '../../data/thoracicRom';
import { LUMBAR_ROM_LIST } from '../../data/lumbarRom';
import { shoulderMuscles } from '../../data/muscles/shoulder';
import { elbowMuscles } from '../../data/muscles/elbow';
import { kneeMuscles } from '../../data/muscles/knee';
import { hipMuscles } from '../../data/muscles/hip';
import { ankleMuscles } from '../../data/muscles/ankle';
import { spineMuscles } from '../../data/muscles/spine';

const MOVEMENTS = [
  ...SHOULDER_ROM_LIST, ...ELBOW_ROM_LIST, ...KNEE_ROM_LIST, ...HIP_ROM_LIST,
  ...ANKLE_ROM_LIST, ...CERVICAL_ROM_LIST, ...THORACIC_ROM_LIST, ...LUMBAR_ROM_LIST,
] as unknown as MovementLike[];

// La union de todas las regiones a proposito: un movimiento toracico recluta la
// pared abdominal, que vive en la lumbar, y uno del hombro musculos del codo.
const MUSCLES = [
  ...shoulderMuscles, ...elbowMuscles, ...kneeMuscles,
  ...hipMuscles, ...ankleMuscles, ...spineMuscles,
] as unknown as MuscleLike[];

describe('las palabras que nombran un gesto', () => {
  it('no deja que un nombre corto se coma uno largo', () => {
    // La trampa de la aguja larga, la misma que hizo falta en los distractores
    // de los casos: «flexion plantar» no es una flexion y «rotacion interna» no
    // es una rotacion cualquiera.
    expect(gesturesIn('Flexión plantar')).toEqual(['flexion-plantar']);
    expect(gesturesIn('Rotación interna')).toEqual(['rotacion-interna']);
    expect(gesturesIn('Rotación externa')).toEqual(['rotacion-externa']);
    expect(gesturesIn('Flexión')).toEqual(['flexion']);
  });

  it('entiende como el raquis llama a la flexion lateral', () => {
    // Las fichas espinales escriben «Inclinacion ipsilateral», que es el mismo
    // gesto visto desde el musculo. Sin esto el banco suspendia al cuadrado
    // lumbar, que es EL inclinador lateral del tronco.
    expect(gesturesIn('Inclinación ipsilateral')).toContain('flexion-lateral');
    expect(gesturesIn('inclina el cuello al mismo lado')).toContain('flexion-lateral');
  });

  it('entiende el gesto escrito en verbo dentro de una nota', () => {
    expect(gesturesIn('Flexiona, abduce y rota internamente la cadera.'))
      .toEqual(expect.arrayContaining(['flexion', 'abduccion', 'rotacion-interna']));
  });
});

describe('las funciones de los 34 movimientos', () => {
  it('todo motor y todo asistente tiene el gesto en su propia ficha', () => {
    const bad: string[] = [];
    for (const mv of MOVEMENTS) {
      for (const r of readMovementFunctions(mv, MUSCLES)) {
        if (!isFunctionDefect(r)) continue;
        bad.push(
          `${mv.id}: ${r.muscleName} como ${r.role} pide "${r.wanted.join('/')}" ` +
          `y su ficha declara ${r.declared.join(', ') || '—'}`,
        );
      }
    }
    expect(bad, `npm run audit-functions lo imprime musculo por musculo:\n${bad.join('\n')}`)
      .toEqual([]);
  });

  it('cada fase tiene al menos un motor o un freno', () => {
    // Una fase sin nadie que la produzca ni nadie que la frene no ensena nada.
    const bad: string[] = [];
    for (const mv of MOVEMENTS) {
      const blocks = [
        ...mv.phases.map((p, i) => ({ at: `${mv.id} fase ${i}`, muscles: p.muscles })),
        ...(mv.reverseArc?.phases ?? []).map((p, i) => ({
          at: `${mv.id} arco inverso fase ${i}`, muscles: p.muscles,
        })),
      ];
      for (const b of blocks) {
        const drivers = b.muscles.filter(
          (m) => m.role === 'prime-mover' || m.role === 'eccentric-control',
        );
        if (drivers.length === 0) bad.push(b.at);
      }
    }
    expect(bad).toEqual([]);
  });

  it('revisa de verdad las acreditaciones, no un puñado', () => {
    // Un banco que mira cuatro musculos pasa por un informe limpio.
    const total = MOVEMENTS.reduce(
      (n, mv) => n + readMovementFunctions(mv, MUSCLES).length, 0,
    );
    expect(MOVEMENTS.length).toBeGreaterThanOrEqual(34);
    expect(total).toBeGreaterThan(200);
  });
});

describe('el freno excentrico', () => {
  it('se comprueba al reves: un freno TIENE que ser el antagonista', () => {
    // El erector frena la flexion del tronco justo porque es el extensor.
    // Exigirle que su ficha declare la flexion seria exigirle que deje de ser un
    // freno; lo que si se le exige es que haga el gesto contrario.
    const brake = {
      movementId: 'x', muscleId: 'y', muscleName: 'Erector', role: 'eccentric-control' as const,
      wanted: ['flexion'], declared: ['extension'], supports: false, contradicts: true,
      opposites: ['extension'], noActions: false,
    };
    expect(isFunctionDefect(brake)).toBe(false);
    // Y uno que no hace ni el gesto ni el contrario no tiene nada que frenar ahi.
    expect(isFunctionDefect({ ...brake, declared: ['abduccion'], contradicts: false })).toBe(true);
  });

  it('la flexion del tronco acredita al erector como freno, no como motor', () => {
    // El defecto que esto fija: figuraba como MOTOR PRINCIPAL de la flexion, con
    // una nota que explicaba perfectamente que lo que hace es frenar. Con tres
    // roles no habia forma de decirlo y el alumno leia que el extensor flexiona.
    for (const id of ['thoracic-flexion', 'lumbar-flexion']) {
      const mv = MOVEMENTS.find((m) => m.id === id);
      expect(mv, id).toBeDefined();
      const refs = (mv?.phases ?? []).flatMap((p) => p.muscles);
      const erectors = refs.filter((r) => /^(longissimus|iliocostalis)-/.test(r.muscleId));
      expect(erectors.length, `${id} debe acreditar al erector`).toBeGreaterThan(0);
      for (const e of erectors) {
        expect(e.role, `${id}: ${e.muscleId}`).toBe('eccentric-control');
      }
    }
  });

  it('un estabilizador no tiene que producir el movimiento', () => {
    // Eso es lo que significa la palabra: el manguito estabiliza la abduccion
    // sin abducir. Exigirle el gesto llenaria el informe de ruido.
    const stab = {
      movementId: 'x', muscleId: 'y', muscleName: 'Z', role: 'stabilizer' as const,
      wanted: ['abduccion'], declared: ['estabilizacion'], supports: false,
      contradicts: false, opposites: ['aduccion'], noActions: false,
    };
    expect(isFunctionDefect(stab)).toBe(false);
  });
});

describe('la cintura escapular cuenta en una elevacion del brazo', () => {
  it('acredita al trapecio y al serrato sin exigirles el gesto del humero', () => {
    // No mueven el humero: hacen la rotacion superior de la escapula, que es
    // literalmente como el brazo pasa de 90 grados. La ficha del serrato lo dice
    // con esas palabras. Exigirles «abduccion» era el error del banco.
    for (const id of ['glenohumeral-abduction', 'glenohumeral-flexion']) {
      const mv = MOVEMENTS.find((m) => m.id === id);
      const readings = readMovementFunctions(mv as MovementLike, MUSCLES);
      for (const girdle of ['trapezius', 'serratus-anterior']) {
        const rs = readings.filter((r) => r.muscleId === girdle && r.role !== 'stabilizer');
        expect(rs.length, `${id} debe acreditar a ${girdle}`).toBeGreaterThan(0);
        for (const r of rs) expect(isFunctionDefect(r), `${id}/${girdle}`).toBe(false);
      }
    }
  });
});
