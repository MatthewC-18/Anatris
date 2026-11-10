// src/components/movement/LayerControls.tsx
//
// Layer peel panel for the movement lab. The rig ships a full-body skin envelope
// on top of muscle, bone and the joint-connecting connective tissue; this panel
// lets the user "quitar capas" -- toggle each tissue on/off to go from a dressed
// body down to the skeleton. It drives RigModel through layerChannel (the same
// DOM->canvas pub/sub pattern as rigChannel), so no ref crosses the <Canvas>.
//
// Independent toggles (not a single depth slider) so any combination is possible
// -- e.g. skin off + muscle off to inspect bone alone. Default is a dressed body
// (skin on) so the lab no longer "parece un esqueleto suelto".
//
// SHAPE: switch rows on one surface, ordered outer tissue to inner, each with its
// tissue swatch. The rows used to be four bordered buttons stacked inside a
// bordered panel with "On/Off" spelled out; a switch already says its own state.
//
// Per-muscle DISSECTION lives elsewhere (click a muscle on the model -> the
// DissectionPanel's "Diseccionar" peels it to reveal what's underneath). These
// toggles are the coarse whole-tissue control; the click-to-dissect is the fine,
// muscle-by-muscle one.
//
// UI strings Spanish LATAM; code/ids ASCII; no `any`.

import { useEffect, useState } from 'react';
import { layerChannel, type LayerState } from './RigModel';
import { ChevronDownIcon, LayersIcon } from '../ui/Icons';

/**
 * Las capas que se pelan, de fuera hacia dentro, con su etiqueta y su muestra.
 *
 * `short` ES OBLIGATORIO Y NO ES UN CAPRICHO. La tira horizontal imprimia
 * `label.split(' ')[0]`, o sea que "Tendones y ligamentos" aparecia como
 * "Tendones" -- justo la etiqueta que el comentario de este fichero declaraba
 * falsa, y en la variante que se usa PRECISAMENTE cuando hay una hoja abierta
 * (tests, neuro), que es cuando el fisio mira las capas. El nombre entero solo
 * vivia en `title`, que en una pantalla tactil no se puede ver. Asi que cada
 * fila trae su nombre corto escrito, no recortado.
 */
const LAYERS: ReadonlyArray<{
  key: keyof LayerState;
  label: string;
  short: string;
  swatch: string;
}> = [
  { key: 'skin', label: 'Piel', short: 'Piel', swatch: '#d7a88f' },
  { key: 'muscle', label: 'Músculo', short: 'Músculo', swatch: '#c23b3b' },
  { key: 'bone', label: 'Hueso', short: 'Hueso', swatch: '#eae3d2' },
  // UN SOLO INTERRUPTOR NOMBRABA EL 67% DE LO QUE ENCENDIA.
  //
  // "Tendones y ligamentos" encendia tambien el cartilago y la capsula. Medido
  // sobre public/cuerpo-rig.opt.glb con los descartes del laboratorio puestos,
  // de las 446 mallas que la capa conectiva enciende: Tendon 191 (42,8%),
  // Cartilage 122 (27,4%), Ligament 97 (21,7%), Articular capsule 28 (6,3%) y
  // Origin-Ligament 8 (1,8%). Un tercio no era ni tendon ni ligamento, y el
  // fisio que buscaba el menisco, el disco o el cartilago articular no tenia
  // ningun boton que los nombrara.
  //
  // Ahora son dos botones: 313 mallas en las cuerdas y 133 en las superficies
  // (el reparto por region esta en `panelLayerForMaterial`). Y la muestra de
  // color de cada uno es la de SU tejido, no la del promedio.
  //
  // El comentario anterior justificaba la etiqueta diciendo que en la rodilla
  // aparecian "los colaterales y los cruzados". Era falso, y es justo lo que
  // este repositorio no tolera: `npm run rig-find "cruciate|collateral|meniscus"`
  // da 20 coincidencias y CERO cruzados; de la rodilla solo estan el colateral
  // TIBIAL (porcion superficial y profunda) y el menisco MEDIAL con su
  // meniscotibial. Ni cruzados, ni menisco lateral, ni colateral lateral, que
  // es lo que ya dice `clinicalStructures.ts`.
  { key: 'connective', label: 'Tendones y ligamentos', short: 'Tendón', swatch: '#e3e7ed' },
  { key: 'cartilage', label: 'Cartílago y cápsula', short: 'Cartílago', swatch: '#bcd0e0' },
  // La bolsa serosa estaba en el GLB --42 mallas, 3.902 vertices ya
  // descargados, medido con `npm run audit-glb-waste`-- y no habia forma de
  // encenderla, hasta el punto de que Neer, Hawkins y el arco doloroso llevaban
  // escrito en la ficha que el laboratorio no podia ensenar lo que se pinza.
  { key: 'bursa', label: 'Bolsas serosas', short: 'Bolsas', swatch: '#6fb3bd' },
] as const;

/**
 * @param embedded Render bare, for the compact bottom sheet: no frosted panel,
 * no fixed width, no self-collapsing header. Inside the sheet the TAB is already
 * the disclosure, so a second one just adds a tap between the user and the
 * switches -- and the fixed 11.5rem width would leave two thirds of a phone
 * empty. The floating desktop variant is unchanged.
 */
export function LayerControls({
  embedded = false,
  strip = false,
}: { embedded?: boolean; strip?: boolean } = {}) {
  const [state, setState] = useState<LayerState>(() => layerChannel.get());
  // Collapsible so it doesn't cover the model on phones. Default collapsed on
  // small screens (where it otherwise overlaps the bottom control panel), open
  // on desktop where there is room in the right margin.
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia('(max-width: 639px)').matches;
  });
  const isOpen = embedded || open;

  // Stay in sync if anything else writes the channel.
  useEffect(() => layerChannel.subscribe(setState), []);

  const toggle = (key: keyof LayerState) => layerChannel.set({ [key]: !state[key] });

  // TIRA HORIZONTAL, para cuando una hoja (tests o neuro) ocupa la columna
  // derecha entera. Antes el panel de capas simplemente se DESMONTABA al abrir
  // cualquiera de las dos: el fisio lanzaba la demostracion de un test o de un
  // miotoma --el momento exacto en que quiere quitar la piel para ver que
  // musculo trabaja-- y los cuatro interruptores ya no estaban. Y si habia
  // dejado la piel apagada, el cuerpo seguia sin piel sin ningun sitio donde
  // volver a encenderla salvo cerrar la hoja.
  if (strip) {
    return (
      <div className="instrument pointer-events-auto flex shrink-0 items-center gap-1 px-2 py-1.5">
        <LayersIcon size={13} className="mx-1 shrink-0 text-slate-500" aria-hidden="true" />
        {LAYERS.map(({ key, label, short, swatch }) => {
          const on = state[key];
          return (
            <button
              key={key}
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={label}
              title={label}
              onClick={() => toggle(key)}
              className={`flex min-h-[32px] items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                on ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/30 transition-opacity"
                style={{ backgroundColor: swatch, opacity: on ? 1 : 0.28 }}
                aria-hidden="true"
              />
              {/* El nombre corto de la tabla, no el recorte por el primer
                  espacio: ver el bloque de LAYERS. */}
              {short}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={
        embedded
          ? 'w-full'
          : 'instrument pointer-events-auto w-[11.5rem] overflow-hidden'
      }
    >
      {!embedded && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3.5 py-3 text-slate-300 transition-colors hover:text-slate-100"
        >
          <LayersIcon size={14} className="text-slate-500" />
          <h3 className="kicker flex-1 text-left">Capas</h3>
          {/* Chevron only on phones: desktop stays open. */}
          <ChevronDownIcon
            size={12}
            className={`text-slate-600 transition-transform sm:hidden ${open ? 'rotate-180' : ''}`}
          />
        </button>
      )}
      {isOpen && (
        <>
          {!embedded && <div className="hairline" />}
          <div className={embedded ? 'px-4 py-1' : 'px-3.5 py-1.5'}>
            {LAYERS.map(({ key, label, swatch }) => {
              const on = state[key];
              return (
                <button
                  key={key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => toggle(key)}
                  // 44px rows in the sheet: these are the switches a physio taps
                  // most, and py-2 gave a 30px target.
                  className={`group flex w-full items-center gap-2.5 text-left ${
                    embedded ? 'min-h-[44px] py-2.5' : 'py-2'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/30 transition-opacity"
                    style={{ backgroundColor: swatch, opacity: on ? 1 : 0.28 }}
                    aria-hidden="true"
                  />
                  <span
                    className={`flex-1 text-xs font-medium transition-colors ${
                      on ? 'text-slate-100' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  >
                    {label}
                  </span>
                  <span
                    className={`relative h-[16px] w-[28px] shrink-0 rounded-full border transition-colors duration-200 ${
                      on ? 'border-accent/50 bg-accent/60' : 'border-slate-700 bg-slate-800/80'
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] h-[10px] w-[10px] rounded-full shadow transition-all duration-200 ${
                        on ? 'left-[14px] bg-slate-100' : 'left-[2px] bg-slate-400'
                      }`}
                    />
                  </span>
                </button>
              );
            })}
          </div>
          {!embedded && <div className="hairline" />}
          <p
            className={
              embedded
                ? 'px-4 pb-3 pt-1 text-[13px] leading-relaxed text-slate-500'
                : 'px-3.5 py-2.5 text-[10px] leading-snug text-slate-500'
            }
          >
            Toca un músculo del modelo para diseccionarlo o aislarlo, lado por lado.
          </p>
          {/* EL INTERRUPTOR DECIA "PIEL" APAGADA Y HABIA PIEL EN PANTALLA.
              `applyLayers` se salta los interruptores para el casquete distal:
              `if (lm.distalCap) { visible = true; continue; }`. Medido sobre las
              486 mallas de piel del rig, 30 son casquete (3.271 vertices) y
              TODAS son de mano y muñeca --Palm, Dorsum_of_hand, las caras de los
              dedos, la foveola radial y las dos uñas--, porque `inDistalRegion`
              es y entre 0,60 y 0,86 con |x| > 0,18. En la franja del pie
              (y < 0,25) hay 86 parches de piel y CERO de casquete: el pie SI se
              desnuda y la mano no, o sea un cuerpo desollado con dos manos
              enguantadas.
              No se quita, se DICE. El casquete existe porque el interior distal
              del GLB es una pila de huesecillos rotos y tendones en pincho: en
              esa region se descartan 204 mallas de anatomia (57 de musculo, 37
              de hueso, 67 de tendon/ligamento y 43 de cartilago), y lo que
              quedaria al apagar la piel no es una mano, es escombro. Ensenar el
              motivo cuesta una linea; ensenar el escombro cuesta la venta. */}
          <p
            className={
              embedded
                ? 'px-4 pb-3 text-[13px] leading-relaxed text-slate-600'
                : 'px-3.5 pb-2.5 text-[10px] leading-snug text-slate-600'
            }
          >
            Las manos conservan la piel: su interior no es utilizable.
          </p>
        </>
      )}
    </div>
  );
}
