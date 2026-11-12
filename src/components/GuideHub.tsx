// src/components/GuideHub.tsx
//
// GUÍA RÁPIDA: an always-available "where is everything?" hub, opened from the
// permanent "?" button in the TopBar. Unlike the one-time OnboardingTour, this
// is a persistent map the user can reopen anytime they feel lost among the many
// regions / modes / panels.
//
// It is CONTEXTUAL: it shows "estás aquí" (current region + mode), lets the user
// JUMP to any of the four modes or to any region, says WHERE each thing of the
// current mode is on screen, and lists the keyboard shortcuts. It can also
// reopen the guided tour.
//
// -----------------------------------------------------------------------------
// UN ÍNDICE, NO UNA REJILLA DE TARJETAS (sistema LAMINA, docs/sistema-lamina.md)
// -----------------------------------------------------------------------------
// Era el fichero con más cajas de la aplicación: `npm run audit-surfaces` le
// contaba 8 cajas, 2 bloques y 1 pastilla. Un recuadro para "Estás en" con dos
// fichas dentro, cuatro tarjetas para los modos (cada una con su icono en otro
// bloque teñido y una pastilla "aquí"), otro recuadro para las acciones del modo
// y una fila de cuatro botones encajonados. Tarjetas dentro de tarjetas, en la
// pantalla cuyo único trabajo es orientar.
//
// Ahora se lee como el índice de un libro: secciones con rótulo y filo, y dentro
// filas de texto separadas por un filo fino. Lo activo se distingue por el peso
// y por el acento, no por un fondo.
//
// LO QUE DICE TIENE QUE EXISTIR. La guía describía una pantalla que ya no era:
// "los cuatro botones de arriba a la derecha" (los modos son pestañas a la
// IZQUIERDA, junto a la región), una "barra flotante del visor", un "panel
// Capas" y un "botón Tests ortopédicos" (hoy son pestañas del margen derecho del
// laboratorio), y una lista de regiones escrita a mano a la que le faltaban
// Cadera y Tobillo. Por eso cada fila de "En este modo" lleva escrito DÓNDE está
// la cosa, en la disposición que el usuario tiene delante (ancha o compacta), y
// las regiones y las fases salen de sus registros y no de una copia.
//
// UI strings Spanish LATAM; code/ids ASCII.

import { useEntitlement } from '../auth/AuthContext';
import { isRegionPremium, type PremiumFeature } from '../auth/entitlements';
import { REGIONS } from '../data/regiones';
import { useIsCompact } from '../hooks/useIsCompact';
import { regionSlugs } from '../lib/routing';
import { useAnatomyStore } from '../store/anatomyStore';
import { PHASE_META, PHASE_ORDER } from '../types/pedagogy';
import { LockGlyph } from './account/PremiumGate';
import { shortcutLabel, type AppMode } from './TopBar';

// EL NOMBRE DE LA REGIÓN SALE DE `REGIONS`, QUE ES LA ÚNICA FUENTE.
//
// Aquí había una copia a mano de la tabla, y le faltaban `hip` y `ankle`. La
// línea de abajo hace `REGION_LABELS[regionId] ?? regionId`, así que el "estás
// aquí" de la ayuda imprimía el identificador EN INGLÉS: 'hip' y 'ankle'. Son
// dos de las regiones de PAGO, vistas desde el botón de ayuda permanente de la
// barra superior, o sea en el primer minuto de cualquier demostración.
//
// Los nombres de región estaban escritos en tres sitios (`regiones.ts`, las
// `MODULES` de `TopBar` y esta tabla); con esto queda uno menos, y la próxima
// región nueva no puede volver a salir en inglés aquí.
const EXTRA_LABELS: Record<string, string> = {
  // 'fundamentos' no es una región anatómica, así que no vive en REGIONS.
  fundamentos: 'Fundamentos',
};

function regionLabelOf(regionId: string): string {
  return EXTRA_LABELS[regionId] ?? REGIONS[regionId]?.name ?? regionId;
}

/**
 * Las regiones, en el orden de la barra. Salen de la tabla de rutas, que es la
 * lista de lo que la aplicación sirve de verdad: la frase a mano que había aquí
 * decía "Fundamentos, Hombro, Codo, Columna, Rodilla" cuando ya existían Cadera
 * y Tobillo, dos regiones de pago que la guía no nombraba en ningún sitio.
 */
const REGION_ROWS: { id: string; label: string }[] = regionSlugs().map(({ id }) => ({
  id,
  label: regionLabelOf(id),
}));

/** Una cosa del modo actual: cómo se llama, DÓNDE está y qué hace. */
interface Place {
  name: string;
  where: string;
  does: string;
  /** Solo existe en una de las dos disposiciones; sin valor, en las dos. */
  only?: 'wide' | 'compact';
  /** Capacidad de pago: se marca con el candado mientras el plan no la cubra. */
  premium?: PremiumFeature;
}

interface ModeInfo {
  id: AppMode;
  label: string;
  tagline: string;
  /** One-liner shown on the mode's row. */
  desc: string;
  /** What is in this mode and where, shown when it is the active one. */
  places: Place[];
  icon: React.ReactNode;
}

// Las siete fases, de su registro: si mañana cambia una etiqueta, cambia aquí.
const PHASE_LIST = PHASE_ORDER.map((id) => PHASE_META[id].label);
const PHASES_SENTENCE = `${PHASE_LIST.slice(0, -1).join(', ')} y ${PHASE_LIST[PHASE_LIST.length - 1]}`;

const MODES: ModeInfo[] = [
  {
    id: 'explore',
    label: 'Explorar',
    tagline: 'El atlas 3D',
    desc: 'El atlas: toca una estructura del modelo y lee su ficha clínica.',
    places: [
      {
        name: 'Modelo',
        where: 'En el centro',
        does: 'Toca una estructura para seleccionarla y arrastra para girar el cuerpo.',
      },
      {
        name: 'Índice',
        where: 'Margen izquierdo',
        does: 'Los músculos, huesos y nervios de la región por nombre. Debajo, las capas y el rango de movimiento.',
        only: 'wide',
      },
      {
        name: 'Ficha',
        where: 'Margen derecho',
        does: 'Origen, inserción, inervación y acciones de lo que hayas seleccionado.',
        only: 'wide',
      },
      {
        name: 'Índice',
        where: 'Botón al pie, a la izquierda',
        does: 'Abre la lista de músculos, huesos y nervios, las capas y el rango de movimiento.',
        only: 'compact',
      },
      {
        name: 'Ficha',
        where: 'Botón al pie, a la derecha',
        does: 'Abre el origen, la inserción, la inervación y las acciones de lo seleccionado.',
        only: 'compact',
      },
      {
        name: 'Vistas',
        where: 'Al pie del visor',
        does: 'Seis vistas de cámara: anterior, posterior, laterales, superior y tres cuartos. También con las teclas 1 a 6.',
      },
    ],
    icon: <IconExplore />,
  },
  {
    id: 'learn',
    label: 'Aprender',
    tagline: 'Itinerario de siete fases',
    desc: 'El itinerario clínico de la región, fase por fase.',
    places: [
      {
        name: 'Fases',
        where: 'Fila de arriba',
        does: `${PHASES_SENTENCE}, en ese orden.`,
      },
      {
        name: 'Músculo a músculo',
        where: 'Fases 1 a 3',
        does: 'Eliges un músculo y lees su anatomía, su biomecánica y cómo se palpa.',
      },
      {
        name: 'La región entera',
        where: 'Fases 4 a 7',
        does: 'Los tests, la patología, el tratamiento y un caso clínico para cerrar.',
      },
      {
        name: 'Fundamentos',
        where: 'Selector de región',
        does: 'Posición anatómica, planos, ejes y nomenclatura del movimiento, con el modelo al lado del texto.',
      },
    ],
    icon: <IconLearn />,
  },
  {
    id: 'study',
    label: 'Repasar',
    tagline: 'Repaso activo',
    desc: 'Tarjetas, cuestionarios y casos para fijar lo estudiado.',
    places: [
      {
        name: 'Repaso',
        where: 'Primera pestaña',
        does: 'Las tarjetas que tocan hoy, con repetición espaciada.',
      },
      {
        name: 'Casos',
        where: 'Segunda pestaña',
        does: 'Casos clínicos de la región para razonar paso a paso.',
      },
      {
        name: 'Cuestionario',
        where: 'Tercera pestaña',
        does: 'Preguntas de opción múltiple generadas con el contenido de la región.',
      },
      {
        name: 'Tarjetas',
        where: 'Cuarta pestaña',
        does: 'El mazo entero, para pasarlo a tu ritmo.',
      },
      {
        name: 'Mi colección',
        where: 'Quinta pestaña',
        does: 'Lo que has guardado de esta región, con tus notas.',
      },
    ],
    icon: <IconStudy />,
  },
  {
    id: 'movement',
    label: 'Movimiento',
    tagline: 'Laboratorio de movimiento',
    desc: 'El laboratorio: mueve la articulación y mira qué músculo trabaja.',
    places: [
      {
        name: 'Lectura y consola',
        where: 'Margen izquierdo',
        does: 'Arriba, el goniómetro y el músculo protagonista. Debajo, la consola: eliges el movimiento y lo reproduces o lo llevas a mano.',
        only: 'wide',
      },
      {
        name: 'Capas',
        where: 'Margen derecho, primera pestaña',
        does: 'Quita y pone piel, músculo, hueso, tendones, cartílago y bolsas.',
        only: 'wide',
      },
      {
        name: 'Tests',
        where: 'Margen derecho, segunda pestaña',
        does: 'Las pruebas ortopédicas con su sensibilidad y especificidad, la demostración sobre el modelo y el nomograma de Fagan.',
        only: 'wide',
        premium: 'orthopedic-tests',
      },
      {
        name: 'Neuro',
        where: 'Margen derecho, tercera pestaña',
        does: 'Dermatoma, miotoma y reflejo de cada raíz. Aparece en las regiones que lo tienen.',
        only: 'wide',
        premium: 'neuro',
      },
      {
        name: 'Reencuadrar',
        where: 'Al pie del escenario',
        does: 'Devuelve el modelo al centro. También con la tecla R.',
        only: 'wide',
      },
      {
        name: 'Modo paciente',
        where: 'Al pie del escenario',
        does: 'El cuerpo a pantalla completa y en lenguaje llano, para enseñárselo al paciente.',
        only: 'wide',
        premium: 'patient-mode',
      },
      {
        name: 'Hoja inferior',
        where: 'Debajo del modelo',
        does: 'Cuatro pestañas: Movimiento, Capas, Tests y Neuro. La flecha la amplía o la reduce.',
        only: 'compact',
      },
      {
        name: 'Paciente',
        where: 'Arriba a la derecha',
        does: 'El cuerpo a pantalla completa y en lenguaje llano, para enseñárselo al paciente.',
        only: 'compact',
        premium: 'patient-mode',
      },
      {
        name: 'Disección',
        where: 'Sobre el modelo',
        does: 'Toca un músculo y podrás diseccionarlo (tecla D), aislarlo (A) o deshacer (Z).',
      },
    ],
    icon: <IconMovement />,
  },
];

interface GuideHubProps {
  mode: AppMode;
  regionId: string;
  /** Jump to a mode and close the guide. */
  onGo: (m: AppMode) => void;
  /** Reopen the step-by-step onboarding tour. */
  onReopenTour: () => void;
  /** Open the pricing overlay. */
  onOpenPricing: () => void;
  /** Open the region's "Evidencia" page (all sources + PubMed links). */
  onOpenEvidence: () => void;
  /** Open the credits / legal overlays (they moved out of the header bar). */
  onOpenOverlay?: (overlay: 'about' | 'legal') => void;
  /** Close the guide. */
  onClose: () => void;
}

export function GuideHub({
  mode,
  regionId,
  onGo,
  onReopenTour,
  onOpenPricing,
  onOpenEvidence,
  onOpenOverlay,
  onClose,
}: GuideHubProps) {
  const setPaletteOpen = useAnatomyStore((s) => s.setPaletteOpen);
  const setRegion = useAnatomyStore((s) => s.setRegion);
  const clearSelection = useAnatomyStore((s) => s.clearSelection);
  const entitlement = useEntitlement();
  const compact = useIsCompact();
  const regionLabel = regionLabelOf(regionId);
  const active = MODES.find((m) => m.id === mode) ?? MODES[0];
  // Solo lo que existe en la disposición que el usuario tiene delante: decirle
  // a alguien en un teléfono que mire "el margen derecho" es mandarlo a buscar
  // algo que su pantalla no tiene.
  const places = active.places.filter(
    (p) => !p.only || p.only === (compact ? 'compact' : 'wide'),
  );

  const openSearch = () => {
    onClose();
    setPaletteOpen(true);
  };

  // El mismo gesto que el selector de la barra: cambia la región, suelta la
  // selección (que es de la región anterior) y cierra la guía.
  const goRegion = (target: string) => {
    if (target !== regionId) {
      setRegion(target);
      clearSelection();
    }
    onClose();
  };

  const regionLocked = (id: string) =>
    isRegionPremium(id) && !entitlement.canAccessRegion(id);

  return (
    <div className="px-5 pb-5 pt-4">
      {/* Estás aquí: una línea de texto, grande. Era un recuadro con dos fichas. */}
      <p className="kicker">Estás en</p>
      <p className="mt-2 font-display text-xl font-semibold leading-tight tracking-tight text-fg">
        {regionLabel}
        <span className="mx-2 font-normal text-fg3" aria-hidden="true">
          /
        </span>
        {active.label}
      </p>
      <p className="mt-1 text-xs text-fg3">{active.tagline}</p>

      {/* Los 4 modos: filas que llevan a cada uno. */}
      <SectionHead id="guide-modes">Modos</SectionHead>
      <ul aria-labelledby="guide-modes" className="divide-y divide-line/60">
        {MODES.map((m) => {
          const isActive = m.id === mode;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onGo(m.id)}
                aria-current={isActive ? 'page' : undefined}
                className="group flex min-h-[44px] w-full items-center gap-3 py-2 text-left"
              >
                <span
                  className={
                    isActive ? 'shrink-0 text-brand' : 'shrink-0 text-fg3 group-hover:text-fg2'
                  }
                >
                  {m.icon}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                  <span
                    className={`shrink-0 text-sm sm:w-24 ${
                      isActive
                        ? 'font-semibold text-fg'
                        : 'font-medium text-fg2 group-hover:text-fg'
                    }`}
                  >
                    {m.label}
                  </span>
                  <span className="min-w-0 text-xs leading-snug text-fg3">{m.desc}</span>
                </span>
                {isActive ? (
                  <span className="tag shrink-0 text-brand">Aquí</span>
                ) : (
                  <span
                    className="shrink-0 text-fg3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden="true"
                  >
                    <IconGo />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* En este modo: qué hay y DÓNDE está. */}
      <SectionHead id="guide-here">En {active.label}</SectionHead>
      <dl aria-labelledby="guide-here" className="divide-y divide-line/60">
        {places.map((p) => {
          const locked = p.premium != null && !entitlement.canUseFeature(p.premium);
          return (
            <div
              key={`${p.name}-${p.where}`}
              className="grid gap-x-4 gap-y-0.5 py-2 sm:grid-cols-[9rem_1fr]"
            >
              <dt className="flex items-center gap-1.5 text-[13px] font-medium text-fg">
                {p.name}
                {locked && (
                  <span className="inline-flex items-center gap-1 text-amber-300" title="Premium">
                    <LockGlyph />
                    <span className="sr-only">Premium</span>
                  </span>
                )}
              </dt>
              <dd className="text-xs leading-relaxed text-fg3">
                <span className="text-fg2">{p.where}.</span> {p.does}
              </dd>
            </div>
          );
        })}
      </dl>

      {/* Regiones: estaban solo descritas en una frase. Ahora se va desde aquí. */}
      <SectionHead id="guide-regions">Regiones</SectionHead>
      <ul aria-labelledby="guide-regions" className="-mx-2 flex flex-wrap gap-y-1">
        {REGION_ROWS.map((r) => {
          const isActive = r.id === regionId;
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => goRegion(r.id)}
                aria-current={isActive ? 'true' : undefined}
                className={`btn btn-quiet gap-1.5 px-2 ${isActive ? 'font-semibold text-fg' : ''}`}
              >
                {r.label}
                {regionLocked(r.id) && <LockGlyph className="text-amber-300" />}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-fg3">
        El candado marca lo que pide Premium. Hombro y Fundamentos son gratis.
      </p>

      {/* Cómo moverte */}
      <SectionHead id="guide-moving">Cómo moverte</SectionHead>
      <dl aria-labelledby="guide-moving" className="divide-y divide-line/60">
        <GuideRow term="Cambiar de región">
          Arriba a la izquierda, junto a la marca: toca el nombre de la región y elige otra.
        </GuideRow>
        <GuideRow term="Cambiar de modo">
          {compact
            ? 'Arriba a la derecha: toca el nombre del modo y elige otro.'
            : 'Las cuatro pestañas de la barra, a continuación de la región.'}
        </GuideRow>
        <GuideRow term="Buscar una estructura">
          {compact ? (
            'El botón «Buscar», al final de esta guía.'
          ) : (
            <>
              «Buscar» en la barra, o el atajo <span className="kbd">{shortcutLabel()}</span>.
            </>
          )}
        </GuideRow>
        <GuideRow term="Compartir una pantalla">
          La dirección del navegador cambia con la región y el modo: cópiala y quien la abra
          llega a esta misma pantalla.
        </GuideRow>
      </dl>

      {/* Atajos. Existían los seis y no estaban escritos en ningún sitio que no
          fuera el `title` de cada botón, que en una pantalla táctil no se ve y
          con teclado no se descubre. En la disposición compacta no se pintan:
          ahí no hay teclado. */}
      {!compact && (
        <>
          <SectionHead id="guide-keys">Atajos de teclado</SectionHead>
          <dl aria-labelledby="guide-keys" className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
            <KeyRow keys={[shortcutLabel()]}>Buscar una estructura</KeyRow>
            <KeyRow keys={['Esc']}>Cerrar lo que esté abierto</KeyRow>
            <KeyRow keys={['1', '6']} range>
              Vistas de cámara, en Explorar
            </KeyRow>
            <KeyRow keys={['R']}>Reencuadrar, en Movimiento</KeyRow>
            <KeyRow keys={['D']}>Diseccionar el músculo tocado</KeyRow>
            <KeyRow keys={['A']}>Aislar el músculo tocado</KeyRow>
            <KeyRow keys={['Z']}>Deshacer la última disección</KeyRow>
          </dl>
        </>
      )}

      {/* Acciones */}
      <SectionHead id="guide-more">Más</SectionHead>
      <div className="-mx-2 flex flex-wrap items-center gap-y-1">
        <button type="button" onClick={openSearch} className="btn btn-quiet px-2">
          <IconSearch />
          Buscar
        </button>
        <button type="button" onClick={onReopenTour} className="btn btn-quiet px-2">
          <IconTour />
          Reabrir el tour
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenEvidence();
          }}
          className="btn btn-quiet px-2"
        >
          <IconEvidence />
          Evidencia clínica
          {!entitlement.canUseFeature('evidence') && <LockGlyph className="text-amber-300" />}
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenPricing();
          }}
          className="btn btn-line ml-auto mr-2"
        >
          Ver planes
        </button>
      </div>

      {/* Acerca de / Legal live here (and in the account menu) rather than in the
          header bar: the bar needed that width for the mode switcher and the
          upgrade CTA, and this hub is reachable at every breakpoint, signed in
          or not — which the account menu is not. */}
      {onOpenOverlay && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/75 pt-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOverlay('about');
            }}
            className="text-[11px] text-fg3 transition-colors hover:text-fg2"
          >
            Acerca de y créditos
          </button>
          <span className="text-fg3" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOverlay('legal');
            }}
            className="text-[11px] text-fg3 transition-colors hover:text-fg2"
          >
            Aviso legal y privacidad
          </button>
        </div>
      )}
    </div>
  );
}

/** Cabecera de sección: rótulo y filo hasta el borde (`.sec-head`). */
function SectionHead({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="sec-head mb-1 mt-6">
      <h3 id={id} className="kicker">
        {children}
      </h3>
      <span className="sec-rule" />
    </div>
  );
}

/** Fila de "cómo moverte": el gesto a la izquierda, dónde se hace a la derecha. */
function GuideRow({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-4 gap-y-0.5 py-2 sm:grid-cols-[9rem_1fr]">
      <dt className="text-[13px] font-medium text-fg">{term}</dt>
      <dd className="text-xs leading-relaxed text-fg3">{children}</dd>
    </div>
  );
}

/** Un atajo: la tecla (o el rango de teclas) y lo que hace. */
function KeyRow({
  keys,
  range = false,
  children,
}: {
  keys: string[];
  range?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <dt className="flex w-16 shrink-0 items-center gap-1">
        {keys.map((k, i) => (
          <span key={k} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-[11px] text-fg3" aria-hidden="true">
                {range ? 'a' : '+'}
              </span>
            )}
            <span className="kbd">{k}</span>
          </span>
        ))}
      </dt>
      <dd className="text-xs leading-snug text-fg2">{children}</dd>
    </div>
  );
}

/* ---- icons ---- */
function IconExplore() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="7" r="3" />
      <path d="M12 10v7M8 13l4 1 4-1M9 21l3-4 3 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconLearn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <line x1="12" y1="3" x2="12" y2="21" strokeLinecap="round" />
      <circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}
function IconStudy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M8 11h6M8 14h4" strokeLinecap="round" />
    </svg>
  );
}
function IconMovement() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="4.5" r="2" />
      <path d="M12 6.5v6M12 9l-5 2M12 9l5 2M9 20l3-7 3 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconGo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
function IconTour() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8l6 4-6 4z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconEvidence() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 3v14" strokeLinecap="round" />
    </svg>
  );
}
