// src/components/movement/LabCallouts.tsx
//
// ETIQUETAS VIVAS: lo que hay que nombrar sobre el cuerpo, escrito en el margen
// del escenario con una linea guia hasta la estructura.
//
// "Que cada vez que se haga el movimiento se aprecie mejor lo que esta pasando
// con la info que va cambiando." Lo que cambia en un gesto es QUIEN trabaja y
// CUANTO, y eso estaba en una columna de texto pequeno a la izquierda, fuera de
// la vista: mientras el brazo sube se mira el brazo. Aqui la lectura va al
// cuerpo. Es la lamina de un atlas --el nombre en el margen, la guia hasta la
// estructura-- con una diferencia: esta se mueve con el gesto, y las cifras
// cambian mientras se mira.
//
// Sirve para dos cartas, segun el canal que se le pase (ver calloutChannel.ts):
// los MUSCULOS que trabajan en el gesto (nombre y porcentaje, del color de su
// papel) y las RAICES pintadas en la piel en la pestana Neuro (la raiz y su
// punto clave, del color de su territorio).
//
// DOS MITADES, POR LO MISMO QUE EN EL ATLAS DE EXPLORAR (ver AtlasLabels.tsx):
// las anclas se proyectan con la camara viva (useFrame, tiene que ser hijo del
// <Canvas>), pero un texto nitido a cualquier zoom es DOM, y son dos
// reconciliadores de React distintos que no se mezclan.
//
//   <LabCalloutPlate>      DOM, hermano del <Canvas>. Pinta los nombres y las
//                          guias, y registra cada elemento.
//   <LabCalloutProjector>  dentro del <Canvas>. No pinta nada: cada fotograma
//                          proyecta el ancla de cada estructura, apila las
//                          columnas y escribe las transformaciones y la cifra
//                          directamente en los elementos registrados.
//
// React solo vuelve a pintar cuando cambia QUE hay rotulado (el canal avisa
// solo de eso). Mientras el gesto corre no se renderiza nada: el porcentaje se
// escribe con `textContent`.
//
// EL ANCLA SIGUE A LA POSE. Las mallas son pieladas, asi que el centro de su
// caja es el de la pose de LIGADO: con el brazo a 120 grados la guia seguiria
// apuntando a donde estaba el deltoides con el brazo colgando. El ancla es un
// VERTICE --el mas cercano al centro de la malla, elegido una vez-- y cada
// fotograma se le aplica el esqueleto (`getVertexPosition`). Un vertice por
// etiqueta: seis transformaciones por fotograma.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useAllMuscles } from '../../hooks/useMuscleResolution';
import * as THREE from 'three';
import { calloutChannel, MAX_CALLOUTS, type CalloutChannel, type CalloutItem } from './calloutChannel';
import { dissectChannel } from './dissectChannel';
import { stackColumn, type PlacedLabel } from '../../lib/atlasPlate';
import { muscleNameById } from '../../lib/romPhaseAtAngle';
import { musclesForRomLookup } from '../../data/musclesByRegion';
import { ROLE_TONE_CSS } from '../../lib/romRolePalette';
import { ROM_ROLE_LABEL } from '../../types/rom';

/** Separacion vertical entre dos etiquetas apiladas, en px. */
const LABEL_GAP = 30;
/** Aire entre la silueta y la columna de nombres. */
const COLUMN_GUTTER = 52;
/** Lo que mide el nombre mas largo con su cifra ("Esternocleidomastoideo 100%"). */
const COLUMN_MIN_INSET = 176;
const COLUMN_MIN_FRACTION = 0.27;
const COLUMN_MAX_FRACTION = 0.36;
/** Tramo horizontal antes de que la guia gire hacia la estructura. */
const ELBOW = 16;
const CURVE_CONTROL = 0.45;
/** Sitio de la lectura del escenario (arriba) y de la linea del arco (abajo). */
const PAD_TOP = 132;
const PAD_BOTTOM = 118;
/** Por debajo de este ancho de lienzo no hay margen donde escribir. */
const MIN_WIDTH = 520;
/** Altura (m) a la que se proyecta el eje del cuerpo: el torax. */
const MIDLINE_Y = 1.3;

interface Row {
  label: HTMLElement | null;
  pct: HTMLElement | null;
  group: SVGGElement | null;
  leader: SVGPathElement | null;
  grad: SVGLinearGradientElement | null;
  pin: SVGGElement | null;
  /** La ultima cifra escrita, para no tocar el DOM si no cambia. */
  shown: number;
}

/** Los elementos en los que escribe el proyector: por canal, y por id. */
const registry = new WeakMap<CalloutChannel, Map<string, Row>>();

function rowsOf(channel: CalloutChannel): Map<string, Row> {
  let m = registry.get(channel);
  if (!m) {
    m = new Map();
    registry.set(channel, m);
  }
  return m;
}

function rowFor(channel: CalloutChannel, id: string): Row {
  const rows = rowsOf(channel);
  let r = rows.get(id);
  if (!r) {
    r = { label: null, pct: null, group: null, leader: null, grad: null, pin: null, shown: -1 };
    rows.set(id, r);
  }
  return r;
}

function hide(r: Row | undefined): void {
  if (!r) return;
  if (r.label) r.label.style.visibility = 'hidden';
  if (r.group) r.group.style.visibility = 'hidden';
}

/** El vertice que representa a cada malla: el mas cercano al centro de su caja. */
const anchorVertex = new WeakMap<THREE.BufferGeometry, number>();

function vertexFor(mesh: THREE.Mesh): number {
  const g = mesh.geometry;
  const known = anchorVertex.get(g);
  if (known !== undefined) return known;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center;
  const pos = g.getAttribute('position');
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i) - c.x;
    const dy = pos.getY(i) - c.y;
    const dz = pos.getZ(i) - c.z;
    const d = dx * dx + dy * dy + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  anchorVertex.set(g, best);
  return best;
}

/* ------------------------------------------------------------------ */
/*  Dentro del Canvas: proyeccion y colocacion, sin DOM propio         */
/* ------------------------------------------------------------------ */

export function LabCalloutProjector({
  channel = calloutChannel,
  gap = LABEL_GAP,
}: {
  channel?: CalloutChannel;
  /** Separacion vertical entre etiquetas: las de dos lineas piden mas. */
  gap?: number;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const rows = rowsOf(channel);

  // Memoria de trabajo, reutilizada para que el bucle no reserve nada.
  const v = useRef(new THREE.Vector3()).current;
  const placed = useRef<(PlacedLabel & { id: string; level: number; cifra: boolean })[]>([]).current;
  const leftCol = useRef<PlacedLabel[]>([]).current;
  const rightCol = useRef<PlacedLabel[]>([]).current;
  const seen = useRef(new Set<string>()).current;

  // Al desmontarse (se cambia de carta) no puede quedar una etiqueta a la vista.
  useEffect(
    () => () => {
      for (const r of rows.values()) hide(r);
    },
    [rows],
  );

  useFrame(() => {
    const items = channel.get();
    if (items.length === 0 || size.width < MIN_WIDTH) {
      for (const r of rows.values()) hide(r);
      return;
    }
    placed.length = 0;
    seen.clear();
    let minAx = Infinity;
    let maxAx = -Infinity;

    // EL EJE DEL CUERPO, NO EL CENTRO DEL ESCENARIO, decide a que margen va cada
    // nombre. La primera version comparaba con `size.width / 2`, y MEDIDO en la
    // abduccion a 95 grados salio al reves: el guardian de encuadre habia
    // desplazado la camara para meter la mano, el cuerpo quedaba a la derecha
    // del centro del lienzo (su eje en x=439 de 728) y las anclas del hombro
    // que se mueve, en x=374..413, caian por 10 px en la mitad DERECHA. Las seis
    // etiquetas se apilaban encima del torax, al lado contrario del brazo. El
    // plano sagital del cuerpo es x=0 en el mundo: se proyecta y se compara
    // contra eso.
    //
    // LA CAMARA AL DIA ANTES DE PROYECTAR, la misma trampa que en Explorar (ver
    // AttachmentCallout.tsx). Los controles de camara corren antes (useFrame de
    // prioridad -1) y giran con lookAt, que recalcula la matriz ANTES de
    // escribir el giro nuevo: hasta el render, la inversa lleva la posicion
    // nueva con el giro viejo. MEDIDO en Chrome con la tarjeta grafica,
    // avanzando fotogramas de 1/60 s: sin esta llamada los puntos y las guias se
    // separaban del cuerpo al menos 48 px al arrastrar (3 grados por
    // fotograma), 24 px en un giro vertical de 20 grados y 111 px en uno de 90;
    // con ella, 0 en todos. Acercar, desplazar y el gesto ya daban 0: no giran
    // la camara, y la consola mueve el cuerpo fuera del bucle con las matrices
    // ya al dia. Es idempotente; el render la repite.
    camera.updateMatrixWorld();
    v.set(0, MIDLINE_Y, 0).project(camera);
    const midX = (v.x * 0.5 + 0.5) * size.width;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const mesh = it.mesh;
      seen.add(it.id);
      if (!mesh.visible) {
        hide(rows.get(it.id));
        continue;
      }
      // El ancla, en la pose de AHORA.
      const sk = mesh as THREE.SkinnedMesh;
      const idx = vertexFor(mesh);
      if (sk.isSkinnedMesh) sk.getVertexPosition(idx, v);
      else v.fromBufferAttribute(mesh.geometry.getAttribute('position'), idx);
      v.applyMatrix4(mesh.matrixWorld).project(camera);
      const sx = (v.x * 0.5 + 0.5) * size.width;
      const sy = (-v.y * 0.5 + 0.5) * size.height;
      const fuera =
        v.z > 1 || sy < -30 || sy > size.height + 30 || sx < -60 || sx > size.width + 60;
      if (fuera) {
        hide(rows.get(it.id));
        continue;
      }
      placed.push({
        i,
        id: it.id,
        level: it.level,
        cifra: it.detail === undefined,
        ax: sx,
        ay: sy,
        y: sy,
        left: sx < midX,
      });
      if (sx < minAx) minAx = sx;
      if (sx > maxAx) maxAx = sx;
    }
    // Lo que ya no esta en el canal se esconde (su fila se va en el proximo
    // render de la lamina).
    for (const [id, r] of rows) if (!seen.has(id)) hide(r);
    if (placed.length === 0) return;

    // Las columnas se arriman a la silueta, para que las guias sean cortas.
    const maxInset = size.width * COLUMN_MAX_FRACTION;
    const minInset = Math.min(COLUMN_MIN_INSET, size.width * COLUMN_MIN_FRACTION);
    const leftInset = Math.min(Math.max(minAx - COLUMN_GUTTER, minInset), maxInset);
    const rightInset = Math.min(Math.max(size.width - maxAx - COLUMN_GUTTER, minInset), maxInset);

    leftCol.length = 0;
    rightCol.length = 0;
    for (const p of placed) (p.left ? leftCol : rightCol).push(p);
    stackColumn(leftCol, size.height, gap, PAD_TOP, PAD_BOTTOM);
    stackColumn(rightCol, size.height, gap, PAD_TOP, PAD_BOTTOM);

    for (const p of placed) {
      const r = rows.get(p.id);
      if (!r) continue;
      const tipX = p.left ? leftInset : size.width - rightInset;
      const elbowX = p.left ? tipX + ELBOW : tipX - ELBOW;
      if (r.label) {
        r.label.style.visibility = 'visible';
        r.label.dataset.lado = p.left ? 'izq' : 'der';
        r.label.style.transform = `translate3d(${tipX}px, ${p.y}px, 0) translate(${p.left ? '-100%' : '0'}, -50%)`;
        // Lo que mas destaca se lee mas: la opacidad acompana al nivel.
        r.label.style.opacity = (0.5 + 0.5 * p.level).toFixed(2);
      }
      // La cifra viva solo donde la hay: una raiz lleva su punto clave, fijo.
      if (p.cifra) {
        const cifra = Math.round(p.level * 100);
        if (r.pct && r.shown !== cifra) {
          r.shown = cifra;
          r.pct.textContent = `${cifra}%`;
        }
      }
      if (r.group) {
        r.group.style.visibility = 'visible';
        r.group.style.opacity = (0.45 + 0.55 * p.level).toFixed(2);
      }
      if (r.leader) {
        const cx = elbowX + (p.ax - elbowX) * CURVE_CONTROL;
        r.leader.setAttribute('d', `M${tipX},${p.y}L${elbowX},${p.y}Q${cx},${p.y} ${p.ax},${p.ay}`);
      }
      if (r.grad) {
        r.grad.setAttribute('x1', String(tipX));
        r.grad.setAttribute('y1', String(p.y));
        r.grad.setAttribute('x2', String(p.ax));
        r.grad.setAttribute('y2', String(p.ay));
      }
      if (r.pin) r.pin.setAttribute('transform', `translate(${p.ax},${p.ay})`);
    }
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  Fuera del Canvas: los nombres                                      */
/* ------------------------------------------------------------------ */

export function LabCalloutPlate({
  region,
  channel = calloutChannel,
}: {
  region: string | null | undefined;
  channel?: CalloutChannel;
}) {
  const [ids, setIds] = useState<readonly string[]>(() => channel.ids());
  useEffect(() => {
    setIds(channel.ids());
    return channel.subscribe(setIds);
  }, [channel]);

  // EL NOMBRE SALE DEL MISMO UNIVERSO QUE EL BRILLO. RigOverlays resuelve las
  // mallas de cada musculo con `useAllMuscles` (el hombro, las regiones ya
  // descargadas y el suelo de fichas que siempre se suma), y esta lamina las
  // nombraba solo con el catalogo de la REGION abierta. Un miotoma enciende
  // musculos de otra region: en el laboratorio de hombro el braquiorradial de
  // C6 se encendia y su etiqueta decia "Brachioradialis", el id humanizado, al
  // lado de un margen que lo llamaba "Braquiorradial". Primero la region (sus
  // fichas completas mandan) y, si no lo tiene, el universo entero.
  const allMuscles = useAllMuscles();
  const nameFromAll = useMemo(
    () => new Map(allMuscles.map((m) => [m.id, m.name] as const)),
    [allMuscles],
  );

  // Fuera las filas de lo que ya no esta, para que el proyector no pueda
  // escribir en un elemento de la tanda anterior.
  const rows = rowsOf(channel);
  for (const id of [...rows.keys()]) if (!ids.includes(id)) rows.delete(id);

  if (ids.length === 0) return null;
  const reg = region ?? 'shoulder';
  // El papel, el texto y el color no cambian con el angulo dentro de un mismo
  // render de la lamina: se leen del canal al pintar.
  const byId = new Map<string, CalloutItem>(channel.get().map((it) => [it.id, it]));
  // Un prefijo por canal: los degradados de las guias se referencian por id, y
  // las dos cartas no pueden pisarse los suyos.
  const prefijo = channel === calloutChannel ? 'lab-callout' : 'lab-root';

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {ids.map((id) => {
          const it = byId.get(id);
          const tone = it?.color ?? ROLE_TONE_CSS[it?.role ?? 'assistant'];
          const gid = `${prefijo}-${id}`;
          return (
            <g
              key={id}
              ref={(el) => {
                rowFor(channel, id).group = el;
              }}
              className="lab-leader"
              style={{ visibility: 'hidden', color: tone }}
            >
              <linearGradient
                id={gid}
                gradientUnits="userSpaceOnUse"
                ref={(el) => {
                  rowFor(channel, id).grad = el;
                }}
              >
                <stop offset="0" stopColor="currentColor" stopOpacity="0.85" />
                <stop offset="0.55" stopColor="currentColor" stopOpacity="0.45" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0.1" />
              </linearGradient>
              <path
                ref={(el) => {
                  rowFor(channel, id).leader = el;
                }}
                d=""
                stroke={`url(#${gid})`}
              />
              <g
                ref={(el) => {
                  rowFor(channel, id).pin = el;
                }}
              >
                <circle className="lab-leader-ring" r="4.5" />
                <circle className="lab-leader-core" r="1.6" />
              </g>
            </g>
          );
        })}
      </svg>

      {ids.map((id) => {
        const it = byId.get(id);
        const tone = it?.color ?? ROLE_TONE_CSS[it?.role ?? 'assistant'];
        const name =
          it?.text ??
          (musclesForRomLookup(reg).some((m) => m.id === id)
            ? muscleNameById(reg, id)
            : nameFromAll.get(id) ?? muscleNameById(reg, id));
        const title = it?.text
          ? `${name}${it.detail ? `: ${it.detail}` : ''}`
          : `${name}: ${ROM_ROLE_LABEL[it?.role ?? 'assistant']}. Clic para verlo solo.`;
        return (
          <button
            key={id}
            type="button"
            tabIndex={-1}
            ref={(el) => {
              const r = rowFor(channel, id);
              r.label = el;
              // Un elemento nuevo no tiene cifra escrita todavia.
              if (el) r.shown = -1;
            }}
            style={{ visibility: 'hidden' }}
            className={`lab-callout ${it?.text ? 'lab-callout-root' : ''}`}
            title={title}
            onClick={() => {
              // Se lee del canal AL PINCHAR, no al pintar: `onPick` puede haber
              // cambiado desde el ultimo render de la lamina.
              const ahora = channel.get().find((x) => x.id === id);
              if (ahora?.onPick) {
                ahora.onPick();
                return;
              }
              // La etiqueta de un musculo es tambien un mando: lo aisla, y otra
              // vez lo devuelve todo. Mismo gesto que su nombre en el margen.
              if (dissectChannel.get().isolated?.id === id) {
                dissectChannel.clearIsolate();
                return;
              }
              const rec = musclesForRomLookup(reg).find((m) => m.id === id);
              if (rec?.meshBases?.length) dissectChannel.isolateMuscle(id, rec.name, rec.meshBases);
            }}
          >
            <span className="lab-callout-name" style={it?.text ? { color: tone } : undefined}>
              {name}
            </span>
            <span
              className="lab-callout-pct"
              style={it?.detail === undefined ? { color: tone } : undefined}
              ref={(el) => {
                rowFor(channel, id).pct = el;
              }}
            >
              {it?.detail ?? ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Cuantas etiquetas de musculo puede haber a la vez; lo usa el test. */
export const LAB_CALLOUT_LIMIT = MAX_CALLOUTS;
