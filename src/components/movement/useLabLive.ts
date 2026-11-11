// src/components/movement/useLabLive.ts
//
// LO QUE ESTA PASANDO EN EL LABORATORIO AHORA MISMO, en una sola suscripcion.
//
// El gesto, el angulo, el lado y la fase los necesitan a la vez la lectura del
// escenario, la linea del arco y el margen. Cada uno se suscribia a rigChannel
// por su cuenta y volvia a derivar el arco y la fase con sus propios
// `useMemo`: tres copias de la misma cuenta, que es como dos lecturas de la
// misma pantalla acaban diciendo cosas distintas.
//
// SOLO LECTURA: se suscribe al MISMO rigChannel que mueve el rig y recalcula
// con los MISMOS ayudantes puros (buildLabArc, phaseAtAngleIn), asi que no
// puede inventar nada ni desviarse del brillo del modelo.

import { useEffect, useMemo, useState } from 'react';
import { rigChannel, type RigCommand } from './RigModel';
import { movementById } from '../../data/romByRegion';
import { getBoneControl, type Side } from '../../lib/boneMap';
import { buildLabArc, phaseAtAngleIn, type LabArc, type PhaseAtAngle } from '../../lib/romPhaseAtAngle';
import type { RomMovement } from '../../types/rom';

type Slice = Pick<RigCommand, 'movementId' | 'side' | 'angleDeg' | 'demo'>;

export interface LabLive {
  movement: RomMovement;
  /** El arco con signo del laboratorio: extremos y fases de punta a punta. */
  arc: LabArc;
  /** Angulo con signo, en grados. */
  angle: number;
  side: Side;
  /** La fase que contiene el angulo, o null si el gesto no tiene fases. */
  at: PhaseAtAngle | null;
  /** El nombre del gesto que se esta haciendo: en la mitad negativa, el opuesto. */
  gestureName: string;
  /** True si el gesto es del raquis (no tiene lado). */
  isSpine: boolean;
  /** El demo de una prueba o un miotoma, si hay uno moviendo el rig. */
  demo: RigCommand['demo'] | null;
}

const pick = (c: RigCommand): Slice => ({
  movementId: c.movementId,
  side: c.side,
  angleDeg: c.angleDeg,
  demo: c.demo ?? null,
});

/** El estado vivo del laboratorio, o null si no hay un gesto que el rig mueva. */
export function useLabLive(): LabLive | null {
  const [cmd, setCmd] = useState<Slice>(() => pick(rigChannel.get()));
  useEffect(
    () =>
      rigChannel.subscribe((c) =>
        setCmd((prev) =>
          prev.movementId === c.movementId &&
          prev.side === c.side &&
          prev.angleDeg === c.angleDeg &&
          (prev.demo ?? null) === (c.demo ?? null)
            ? prev
            : pick(c),
        ),
      ),
    [],
  );

  const movement = useMemo(() => movementById(cmd.movementId), [cmd.movementId]);
  const arc = useMemo(() => (movement ? buildLabArc(movement) : null), [movement]);
  const control = cmd.movementId ? getBoneControl(cmd.movementId) : undefined;
  if (!movement || !arc || !control || control.kind === 'unsupported') return null;

  const angle = cmd.angleDeg;
  return {
    movement,
    arc,
    angle,
    side: cmd.side,
    at: phaseAtAngleIn(arc.phases, angle),
    gestureName: angle < 0 && movement.labReverse ? movement.labReverse.name : movement.name,
    isSpine: control.kind === 'spine',
    demo: cmd.demo ?? null,
  };
}
