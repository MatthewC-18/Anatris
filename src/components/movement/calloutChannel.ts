// src/components/movement/calloutChannel.ts
//
// QUE MUSCULOS ESTAN TRABAJANDO AHORA MISMO, Y DONDE ESTAN EN EL CUERPO.
//
// El laboratorio enciende los musculos que mueven el gesto, pero el nombre de
// cada uno y su porcentaje vivian en una columna de texto pequeno a la
// izquierda, lejos del cuerpo: mientras el brazo sube, la vista esta en el
// modelo y lo que cambia --quien entra, quien manda, cuanto-- pasaba fuera de
// ella. "Que se aprecie mejor lo que esta pasando con la info que va cambiando."
//
// Este canal es la mitad de datos de las ETIQUETAS VIVAS (LabCallouts): lo
// escribe RigOverlays, que es quien ya resuelve cada musculo a sus mallas del
// lado activo para encenderlas, y lo leen el proyector (dentro del Canvas, cada
// fotograma) y la lamina (DOM, solo cuando cambia QUE musculos hay).
//
// Mismo patron que rigChannel y dissectChannel: modulo, sin React, y nunca
// provoca un render por fotograma.

import type * as THREE from 'three';
import type { RomMuscleRole } from '../../types/rom';

export interface CalloutItem {
  /** Id del musculo (el mismo de `RigHighlight.muscleId`). */
  id: string;
  role: RomMuscleRole;
  /** Activacion viva, 0..1. */
  level: number;
  /** La malla mas grande del musculo en el lado activo: donde apunta la guia. */
  mesh: THREE.Mesh;
}

/** Cuantas etiquetas caben sin que el escenario se convierta en una lista. */
export const MAX_CALLOUTS = 6;
/**
 * HISTERESIS. Un musculo entra en la lamina al llegar al 18% y no sale hasta
 * bajar del 10%. Con un solo umbral, uno que ronda esa cifra apareceria y
 * desapareceria a cada grado del arco, y una etiqueta que parpadea se lee como
 * un fallo.
 */
const ENTER = 0.18;
const LEAVE = 0.1;

type Listener = (ids: readonly string[]) => void;

let items: CalloutItem[] = [];
let ids: string[] = [];
const listeners = new Set<Listener>();

export const calloutChannel = {
  /** Los musculos etiquetados ahora, el mas activo primero. Se lee por fotograma. */
  get: (): readonly CalloutItem[] => items,
  /** Solo sus ids, en orden estable (alfabetico): lo que la lamina pinta. */
  ids: (): readonly string[] => ids,
  /**
   * Publica la activacion de este instante. `all` trae TODOS los musculos
   * encendidos; aqui se decide cuales llevan etiqueta.
   */
  set(all: CalloutItem[]): void {
    const eran = new Set(ids);
    const next = all
      .filter((it) => it.level >= ENTER || (eran.has(it.id) && it.level >= LEAVE))
      .sort((a, b) => b.level - a.level)
      .slice(0, MAX_CALLOUTS);
    items = next;
    // La lamina se vuelve a pintar solo si cambia QUIEN esta, no cuanto.
    const nextIds = next.map((it) => it.id).sort();
    if (nextIds.length === ids.length && nextIds.every((v, i) => v === ids[i])) return;
    ids = nextIds;
    for (const l of listeners) l(ids);
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
