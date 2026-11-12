// src/components/movement/calloutChannel.ts
//
// QUE HAY QUE ROTULAR SOBRE EL CUERPO AHORA MISMO, Y DONDE ESTA.
//
// El laboratorio enciende los musculos que mueven el gesto, pero el nombre de
// cada uno y su porcentaje vivian en una columna de texto pequeno a la
// izquierda, lejos del cuerpo: mientras el brazo sube, la vista esta en el
// modelo y lo que cambia --quien entra, quien manda, cuanto-- pasaba fuera de
// ella. "Que se aprecie mejor lo que esta pasando con la info que va cambiando."
//
// Estos canales son la mitad de datos de las ETIQUETAS VIVAS (LabCallouts). Hay
// dos, con la misma forma:
//
//   calloutChannel       los MUSCULOS que trabajan en el gesto. Lo escribe
//                        RigOverlays, que es quien ya resuelve cada musculo a
//                        sus mallas del lado activo para encenderlas.
//   rootCalloutChannel   las RAICES pintadas en la piel (la carta de dermatomas
//                        de la pestana Neuro). Lo escribe NeuroSkinLayer, que es
//                        quien sabe que parche es de que raiz.
//
// Los leen el proyector (dentro del Canvas, cada fotograma) y la lamina (DOM,
// solo cuando cambia QUE hay rotulado).
//
// Mismo patron que rigChannel y dissectChannel: modulo, sin React, y nunca
// provoca un render por fotograma.

import type * as THREE from 'three';
import type { RomMuscleRole } from '../../types/rom';

export interface CalloutItem {
  /** Id estable: el del musculo (`RigHighlight.muscleId`) o el de la raiz. */
  id: string;
  /** El papel del musculo en el gesto. Las raices no lo llevan. */
  role?: RomMuscleRole;
  /** Activacion viva, 0..1. En una raiz, cuanto destaca (1 = elegida). */
  level: number;
  /** La malla a la que apunta la guia. */
  mesh: THREE.Mesh;
  /** Texto del rotulo, si no es el nombre clinico del musculo ("C6"). */
  text?: string;
  /** Lo que acompana al rotulo en vez del porcentaje ("Pulgar"). */
  detail?: string;
  /** Color de la guia y del detalle, si no es el del papel. */
  color?: string;
  /** Que pasa al pinchar el rotulo, si no es aislar el musculo. */
  onPick?: () => void;
}

/** Cuantas etiquetas de musculo caben sin que el escenario sea una lista. */
export const MAX_CALLOUTS = 6;
/** Las raices de un miembro son siete como mucho; caben todas. */
export const MAX_ROOT_CALLOUTS = 9;
/**
 * HISTERESIS. Un musculo entra en la lamina al llegar al 18% y no sale hasta
 * bajar del 10%. Con un solo umbral, uno que ronda esa cifra apareceria y
 * desapareceria a cada grado del arco, y una etiqueta que parpadea se lee como
 * un fallo.
 */
const ENTER = 0.18;
const LEAVE = 0.1;

type Listener = (ids: readonly string[]) => void;

export interface CalloutChannel {
  /** Lo rotulado ahora, lo mas destacado primero. Se lee por fotograma. */
  get: () => readonly CalloutItem[];
  /** Solo los ids, en orden estable (alfabetico): lo que la lamina pinta. */
  ids: () => readonly string[];
  /** Publica el estado de este instante. */
  set: (all: CalloutItem[]) => void;
  subscribe: (l: Listener) => () => void;
}

/**
 * @param umbral Si true, se filtra por activacion con histeresis (musculos). Si
 *               false, se rotula todo lo que llega (raices).
 */
function makeChannel(max: number, umbral: boolean): CalloutChannel {
  let items: CalloutItem[] = [];
  let ids: string[] = [];
  const listeners = new Set<Listener>();
  return {
    get: () => items,
    ids: () => ids,
    set(all) {
      const eran = new Set(ids);
      const next = (umbral
        ? all.filter((it) => it.level >= ENTER || (eran.has(it.id) && it.level >= LEAVE))
        : [...all]
      )
        .sort((a, b) => b.level - a.level)
        .slice(0, max);
      items = next;
      // La lamina se vuelve a pintar solo si cambia QUIEN esta, no cuanto.
      const nextIds = next.map((it) => it.id).sort();
      if (nextIds.length === ids.length && nextIds.every((v, i) => v === ids[i])) return;
      ids = nextIds;
      for (const l of listeners) l(ids);
    },
    subscribe(l) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

/** Los musculos que trabajan en el gesto. */
export const calloutChannel = makeChannel(MAX_CALLOUTS, true);
/** Las raices pintadas en la piel. */
export const rootCalloutChannel = makeChannel(MAX_ROOT_CALLOUTS, false);
