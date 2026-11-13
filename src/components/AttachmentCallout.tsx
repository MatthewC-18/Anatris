// src/components/AttachmentCallout.tsx
//
// LA ETIQUETA DE "ORIGEN" / "INSERCION" DE EXPLORAR: UNA SOLA, EN PANTALLA, CON
// UNA LINEA GUIA HASTA CADA PUNTO.
//
// Antes cada punto de insercion llevaba su propio sprite de texto de 5 cm en el
// mundo 3D, todos con el mismo texto: apilados, ilegibles y cada vez mas grandes
// al acercar la camara (ver src/lib/attachmentCallout.ts, con la queja del
// usuario). Ahora los puntos siguen en 3D (AttachmentMarkers: el nucleo y su
// halo) y el texto va UNA vez, en el DOM, con tamano de letra fijo.
//
// DOS MITADES, como los nombres del atlas (AtlasLabels.tsx, y su memoria): el
// texto nitido quiere DOM y la proyeccion quiere la camara viva, que solo existe
// dentro del <Canvas>. Son dos reconciliadores distintos y no se mezclan:
//
//   <AttachmentPlate>      DOM, hermano del <Canvas>: la etiqueta, las lineas y
//                          los anillos; registra sus elementos abajo.
//   <AttachmentProjector>  dentro del <Canvas>: no pinta nada; cada fotograma
//                          proyecta los puntos, coloca la etiqueta y escribe las
//                          lineas sobre esos elementos.
//
// Lo que se nombra lo publica AttachmentMarkers en `attachmentCallout`. Nada de
// esto vuelve a pintar React mientras la camara se mueve.

import { useRef, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { placeCallout } from '../lib/attachmentCallout';

export type AttachmentPart = 'origin' | 'insertion';

export interface CalloutState {
  part: AttachmentPart | null;
  /** El accidente oseo ("clavícula, acromion y espina de la escápula"), o vacio. */
  text: string;
  /** Un punto por accidente, en coordenadas del mundo. */
  pins: THREE.Vector3[];
}

const EMPTY: CalloutState = { part: null, text: '', pins: [] };
let state: CalloutState = EMPTY;
const subs = new Set<() => void>();

/** El canal: AttachmentMarkers escribe, la placa y el proyector leen. */
export const attachmentCallout = {
  set(next: CalloutState): void {
    state = next.part && next.pins.length > 0 ? next : EMPTY;
    subs.forEach((f) => f());
  },
  clear(): void {
    if (state === EMPTY) return;
    state = EMPTY;
    subs.forEach((f) => f());
  },
  get(): CalloutState {
    return state;
  },
};

function useCalloutState(): CalloutState {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
    () => EMPTY,
  );
}

/** Los elementos que escribe el proyector. Modulo y mutables: la costura entre
 *  los dos reconciliadores, que nunca debe provocar un render. */
const dom: {
  label: HTMLElement | null;
  leaders: (SVGPathElement | null)[];
  pins: (SVGGElement | null)[];
} = { label: null, leaders: [], pins: [] };

function hideAll(): void {
  if (dom.label) dom.label.style.visibility = 'hidden';
  for (const l of dom.leaders) if (l) l.style.visibility = 'hidden';
  for (const p of dom.pins) if (p) p.style.visibility = 'hidden';
}

/* ------------------------------------------------------------------ */
/*  Dentro del Canvas: proyeccion y colocacion, sin DOM propio          */
/* ------------------------------------------------------------------ */

export function AttachmentProjector() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  // Memoria de trabajo, reutilizada en cada fotograma.
  const ndc = useRef(new THREE.Vector3()).current;
  const screen = useRef<{ x: number; y: number }[]>([]).current;

  useFrame(() => {
    const s = attachmentCallout.get();
    if (!s.part || s.pins.length === 0 || !dom.label) {
      hideAll();
      return;
    }
    screen.length = 0;
    for (let i = 0; i < s.pins.length; i++) {
      ndc.copy(s.pins[i]).project(camera);
      if (ndc.z > 1) continue; // detras de la camara
      screen.push({
        x: (ndc.x * 0.5 + 0.5) * size.width,
        y: (-ndc.y * 0.5 + 0.5) * size.height,
      });
    }
    const where = placeCallout(
      screen,
      size.width,
      size.height,
      dom.label.offsetWidth,
      dom.label.offsetHeight,
    );
    if (!where) {
      hideAll();
      return;
    }
    dom.label.style.visibility = 'visible';
    dom.label.style.transform = `translate3d(${where.left}px, ${where.top}px, 0)`;
    for (let i = 0; i < dom.leaders.length; i++) {
      const leader = dom.leaders[i];
      const pin = dom.pins[i];
      const p = screen[i];
      if (!p) {
        if (leader) leader.style.visibility = 'hidden';
        if (pin) pin.style.visibility = 'hidden';
        continue;
      }
      if (leader) {
        // Sale vertical de la etiqueta y entra vertical en el punto: una S suave
        // sin esquinas, que se abre en abanico cuando hay varios puntos.
        const dy = (p.y - where.anchorY) * 0.5;
        leader.setAttribute(
          'd',
          `M${where.anchorX},${where.anchorY}C${where.anchorX},${where.anchorY + dy} ${p.x},${p.y - dy} ${p.x},${p.y}`,
        );
        leader.style.visibility = 'visible';
      }
      if (pin) {
        pin.setAttribute('transform', `translate(${p.x},${p.y})`);
        pin.style.visibility = 'visible';
      }
    }
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  Fuera del Canvas: la etiqueta y las lineas                          */
/* ------------------------------------------------------------------ */

const PART_WORD: Record<AttachmentPart, string> = { origin: 'Origen', insertion: 'Inserción' };

export function AttachmentPlate() {
  const s = useCalloutState();
  dom.leaders.length = s.pins.length;
  dom.pins.length = s.pins.length;
  if (!s.part || s.pins.length === 0) {
    dom.label = null;
    return null;
  }
  return (
    <div
      className={`attach-plate attach-${s.part} pointer-events-none absolute inset-0 z-10 overflow-hidden`}
      aria-hidden="true"
    >
      <svg className="absolute inset-0 h-full w-full">
        {s.pins.map((_, i) => (
          <g key={`l${i}`}>
            <path
              ref={(el) => {
                dom.leaders[i] = el;
              }}
              className="attach-leader"
              d=""
              style={{ visibility: 'hidden' }}
            />
            <g
              ref={(el) => {
                dom.pins[i] = el;
              }}
              style={{ visibility: 'hidden' }}
            >
              <circle className="attach-ring" r="7" />
              <circle className="attach-core" r="2.25" />
            </g>
          </g>
        ))}
      </svg>
      <div
        ref={(el) => {
          dom.label = el;
        }}
        className="attach-callout"
        style={{ visibility: 'hidden' }}
      >
        <span className="attach-callout-part">{PART_WORD[s.part]}</span>
        {s.text && <span className="attach-callout-text">{s.text}</span>}
      </div>
    </div>
  );
}
