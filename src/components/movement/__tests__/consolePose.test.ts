// LA POSE SOBREVIVE A UN DESMONTAJE, Y EL MODO PACIENTE EMPIEZA LIMPIO.
//
// La consola de movimiento se vuelve a montar en tres situaciones corrientes:
// cambiar de pestaña en la hoja del móvil, entrar o salir del modo paciente, y
// cualquier cambio de distribución que la mueva de sitio. En las tres perdía lo
// puesto --el gesto volvía al primero de la lista y el ángulo a 0-- y el caso
// que más se nota es el segundo: se gira la pantalla hacia el paciente para
// enseñarle SU posición y el brazo aparece colgando.
//
// Y al revés: el modo paciente escondía la tarjeta de disección con el resto de
// los mandos clínicos, pero el pelado seguía aplicado. El paciente veía un
// cuerpo al que le falta un músculo y el fisio ya no tenía ningún control para
// devolverlo.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { readPose, writePose, clearPose } from '../consolePoseStore';

const controls = readFileSync('src/components/movement/MovementControls.tsx', 'utf8');
const view = readFileSync('src/components/movement/MovementView.tsx', 'utf8');

describe('la pose de la consola', () => {
  beforeEach(() => {
    clearPose('shoulder');
    clearPose('knee');
  });

  it('empieza vacía', () => {
    expect(readPose('shoulder')).toBeNull();
  });

  it('devuelve lo último que se puso', () => {
    writePose('shoulder', { movementId: 'glenohumeral-abduction', side: 'R', angleDeg: 120 });
    expect(readPose('shoulder')).toEqual({
      movementId: 'glenohumeral-abduction',
      side: 'R',
      angleDeg: 120,
    });
  });

  it('va por región: la rodilla no hereda el gesto del hombro', () => {
    // Recordar "abducción glenohumeral 120°" al entrar en la rodilla no
    // significa nada: ese movimiento no existe ahí.
    writePose('shoulder', { movementId: 'glenohumeral-abduction', side: 'R', angleDeg: 120 });
    expect(readPose('knee')).toBeNull();
  });

  it('sin región no guarda nada (el laboratorio arranca con region null)', () => {
    writePose(null, { movementId: 'x', side: 'R', angleDeg: 10 });
    expect(readPose(null)).toBeNull();
  });

  it('la consola la lee al montar y la escribe al empujar al rig', () => {
    expect(controls).toContain("import { readPose, writePose } from './consolePoseStore'");
    expect(controls).toContain('const saved = readPose(region)');
    expect(controls).toContain('writePose(region, { movementId, side, angleDeg: posed })');
  });

  it('y el reinicio por cambio de gesto no la pisa al montar', () => {
    // El efecto de [movementId] devuelve el ángulo al inicio anatómico cuando el
    // usuario CAMBIA de gesto, pero en React también corre al montar: restaurar
    // en el useState y dejar que el efecto lo mande a startDeg deja la pose
    // igual de perdida, sólo una décima más tarde.
    expect(controls).toContain('skipFirstResetRef');
    expect(controls).toContain('skipFirstResetRef.current = false');
  });
});

describe('el modo paciente', () => {
  it('deshace la disección al entrar', () => {
    expect(view).toContain('if (patientMode) dissectChannel.reset()');
  });
});
