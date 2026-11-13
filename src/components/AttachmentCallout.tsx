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
import {
  leaderPath,
  placeCallout,
  ringRadii,
  RING_RADIUS,
  type CalloutPlacement,
  type CalloutReserve,
} from '../lib/attachmentCallout';
import { PLATE_PAD_TOP } from '../lib/atlasPlate';
import { toolbarReserve } from '../lib/stageToolbar';

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
  const gl = useThree((s) => s.gl);
  // Las franjas donde la etiqueta no va: arriba la misma que los nombres del
  // atlas; abajo la barra de vistas, medida cada 30 fotogramas (medio segundo),
  // que solo cambia al redimensionar.
  const reserve = useRef<CalloutReserve>({ top: PLATE_PAD_TOP, bottom: 0 }).current;
  const frame = useRef(0);
  // Donde quedo la etiqueta en el fotograma anterior: se queda alli mientras su
  // sitio siga libre (placeCallout). Se olvida al cambiar lo que se nombra, para
  // que un musculo nuevo empiece por la regla y no por el sitio del anterior.
  const last = useRef<CalloutPlacement | null>(null);
  const lastState = useRef<CalloutState | null>(null);
  // Memoria de trabajo, reutilizada en cada fotograma.
  const ndc = useRef(new THREE.Vector3()).current;
  const box = useRef({ left: 0, top: 0, width: 0, height: 0 }).current;
  // ALINEADO CON LOS PUNTOS: screen[i] es el punto i, o null si queda detras de
  // la camara. Saltarlo sin hueco desplazaba las lineas: la del punto 3 iba al 4.
  const screen = useRef<({ x: number; y: number } | null)[]>([]).current;
  const visibles = useRef<{ x: number; y: number }[]>([]).current;
  // El radio del anillo de cada punto (ringRadii) y el ultimo escrito, para
  // tocar el DOM solo cuando cambia.
  const radii = useRef<number[]>([]).current;
  const written = useRef<number[]>([]).current;

  useFrame(() => {
    const s = attachmentCallout.get();
    if (!s.part || s.pins.length === 0 || !dom.label) {
      hideAll();
      frame.current = 0;
      last.current = null;
      lastState.current = null;
      written.length = 0;
      return;
    }
    if (s !== lastState.current) {
      last.current = null;
      lastState.current = s;
      // Los circulos pueden ser nuevos: se vuelven a escribir todos.
      written.length = 0;
    }
    // LA CAMARA AL DIA ANTES DE PROYECTAR. Los controles de camara (useFrame de
    // prioridad -1) mueven la camara y llaman a lookAt, que recalcula la matriz
    // ANTES de escribir el giro nuevo: hasta el render, la inversa lleva la
    // posicion nueva con el giro viejo. Proyectar con ella separaba anillos y
    // lineas de los puntos 3D mientras la vista giraba: medido en Chrome sin
    // cabeza quitando esta llamada y sus dos gemelas (AtlasLabels,
    // AttachmentMarkers), hasta 24,4 px al cambiar de vista; con ellas, 0 en
    // todas las muestras. Es idempotente; el render la repite.
    camera.updateMatrixWorld();
    if (frame.current++ % 30 === 0) reserve.bottom = toolbarReserve(gl.domElement);
    screen.length = 0;
    visibles.length = 0;
    for (let i = 0; i < s.pins.length; i++) {
      ndc.copy(s.pins[i]).project(camera);
      if (ndc.z > 1) {
        screen.push(null); // detras de la camara
        continue;
      }
      const p = { x: (ndc.x * 0.5 + 0.5) * size.width, y: (-ndc.y * 0.5 + 0.5) * size.height };
      // FUERA DEL LIENZO NO SE APUNTA. Con la camara muy cerca (medido: dentro
      // del torax, los seis puntos del deltoides a miles de px) la etiqueta
      // quedaba arriba con lineas hacia ningun sitio. Solo cuentan los puntos
      // que se ven; si no se ve ninguno, no hay etiqueta.
      const dentro = p.x >= -20 && p.x <= size.width + 20 && p.y >= -20 && p.y <= size.height + 20;
      screen.push(dentro ? p : null);
      if (dentro) visibles.push(p);
    }
    box.width = dom.label.offsetWidth;
    box.height = dom.label.offsetHeight;
    const where = placeCallout(
      visibles,
      size.width,
      size.height,
      box.width,
      box.height,
      reserve,
      last.current,
    );
    if (!where) {
      hideAll();
      last.current = null;
      return;
    }
    last.current = where;
    box.left = where.left;
    box.top = where.top;
    // Anillos que no se montan: con el origen del pectoral recien abierto, los
    // puntos quedan a 6-13 px en el movil (ringRadii).
    ringRadii(screen, radii);
    written.length = screen.length;
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
        // Cada linea sale por el borde de la etiqueta que mira a SU punto, en
        // una S suave que no vuelve a entrar en la caja (leaderPath): con la
        // etiqueta entre puntos, las lineas ya no cruzan el texto. Un punto
        // debajo de la etiqueta (solo si no habia hueco) no lleva linea.
        const d = leaderPath(box, p);
        leader.setAttribute('d', d);
        leader.style.visibility = d ? 'visible' : 'hidden';
      }
      if (pin) {
        pin.setAttribute('transform', `translate(${p.x},${p.y})`);
        pin.style.visibility = 'visible';
        const r = Math.round(radii[i] * 4) / 4;
        if (written[i] !== r) {
          written[i] = r;
          pin.firstElementChild?.setAttribute('r', String(r));
          pin.lastElementChild?.setAttribute('r', String(Math.min(2.25, r - 1)));
        }
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
              <circle className="attach-ring" r={RING_RADIUS} />
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
