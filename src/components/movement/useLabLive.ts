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
import { effectiveArc, type EffectiveArc } from '../../lib/labArc';
import { pathologyById } from '../../data/pathologies';
import type { RomMovement } from '../../types/rom';

type Slice = Pick<RigCommand, 'movementId' | 'side' | 'angleDeg' | 'demo' | 'pathologyId'>;

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
  /**
   * Lo que el cuadro clinico activo deja recorrer (con el hombro congelado, hasta
   * 115°). Sin cuadro, el arco entero. La regla del escenario dibuja el arco
   * entero como referencia y marca en ambar lo que el cuadro no deja alcanzar.
   */
  reach: EffectiveArc;
}

const pick = (c: RigCommand): Slice => ({
  movementId: c.movementId,
  side: c.side,
  angleDeg: c.angleDeg,
  demo: c.demo ?? null,
  pathologyId: c.pathologyId ?? null,
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
          (prev.demo ?? null) === (c.demo ?? null) &&
          (prev.pathologyId ?? null) === (c.pathologyId ?? null)
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
    reach: effectiveArc(arc, pathologyById(cmd.pathologyId ?? null)),
  };
}

/**
 * EL DEMO, AUNQUE SU GESTO NO ESTE CARGADO.
 *
 * `useLabLive` devuelve null si `movementById` no encuentra el gesto, y un
 * miotoma mueve el codo, la cadera, la rodilla o el tobillo: en una region que
 * no es la suya ese gesto no esta (solo el hombro va en el paquete y el resto se
 * descarga al visitar su region). El escenario se quedaba EN BLANCO durante 7 de
 * los 8 demos de miotoma, con el rig moviendose. Esto da lo minimo que un demo
 * siempre tiene: su nombre, lo que evalua, el angulo y el lado.
 */
export interface LabDemo {
  demo: NonNullable<RigCommand['demo']>;
  angle: number;
  side: Side;
}

export function useLabDemo(): LabDemo | null {
  const [cmd, setCmd] = useState<Slice>(() => pick(rigChannel.get()));
  useEffect(
    () =>
      rigChannel.subscribe((c) =>
        setCmd((prev) =>
          prev.side === c.side &&
          prev.angleDeg === c.angleDeg &&
          (prev.demo ?? null) === (c.demo ?? null)
            ? prev
            : pick(c),
        ),
      ),
    [],
  );
  if (!cmd.demo) return null;
  return { demo: cmd.demo, angle: cmd.angleDeg, side: cmd.side };
}
