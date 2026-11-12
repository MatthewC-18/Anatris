// src/components/SelectionPanel.tsx
//
// Right-hand margin of "Explorar": the sheet of whatever is selected. Empty
// state tells the user how to select. When a structure is selected:
//   - If it resolves to a muscle with authored content, show the full clinical
//     sheet (origin, insertion, innervation, actions with hierarchy, functional
//     positions, biomechanics, palpation, pathologies, notes) -- every claim
//     with its citation(s).
//   - Otherwise, fall back to the basic name + the structure's own fields.
//
// WHICH sheet opens is decided by lib/selectionSheet.ts (a pure function, so it
// can be measured against the real index): the muscle the model is lighting,
// with the same resolver the highlight uses. The clinical content index is
// chosen by the ACTIVE REGION (store.region), so the same panel serves every
// region without changes here.
//
// The Origin and Insertion sections also carry a "Ver origen / Ver insercion"
// control that highlights that attachment on the 3D model (PartFocusControls,
// shared with the toolbar).
//
// LAMINA: ES EL MARGEN DERECHO DE LA LAMINA (docs/sistema-lamina.md).
// La ficha era una pila de tarjetas: seis pastillas de color bajo el nombre
// (capa, grupo, lado), cada apartado en su caja con borde y fondo, las fuentes
// en fichitas con contorno, la relevancia clinica en un recuadro verde y, con
// nada seleccionado, un icono dentro de un recuadro con halo. Ahora es una
// columna de secciones: rotulo + filo, texto, y las fuentes como etiquetas en
// mono debajo de lo que respaldan. Los cuatro datos que se consultan siempre
// (origen, insercion, inervacion, acciones) llegan ABIERTOS; el resto se
// despliega desde su rotulo.

import { useMemo, useState } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { LAYER_META } from '../lib/anatomyMeta';
import { regionStructuresByMesh } from '../lib/regionStructures';
import {
  muscleRecordIsEmpty,
  resolveSheet,
  type MuscleSheet,
  type StructureSheet,
} from '../lib/selectionSheet';
import { sideLabel, sideSetOfEntry, sidesOfMeshes } from '../lib/atlasSides';
import { PartFocusControls } from './PartFocusControls';
import { SaveButton } from './SaveButton';
import { CitationRow } from './MuscleContentSections';
import { shortcutLabel } from './TopBar';
import type { AnatomyEntry } from '../types/anatomy';
import { FUNCTIONAL_GROUP_LABEL } from '../types/muscle';
import type { MuscleResolution } from '../lib/muscleResolver';
import type { SourcedText, MuscleAction } from '../types/muscleContent';

interface SelectionPanelProps {
  byMesh: Map<string, AnatomyEntry>;
  /** The mesh <-> muscle maps the 3D highlight uses. The sheet resolves the
   *  selection through the SAME maps, so what lights up and what the sheet
   *  titles are always one muscle (see lib/selectionSheet.ts). */
  resolution?: MuscleResolution;
}

/** Ids of the sheet's sections, in reading order. */
type SheetSection =
  | 'origin'
  | 'insertion'
  | 'innervation'
  | 'actions'
  | 'positions'
  | 'biomechanics'
  | 'palpation'
  | 'synergists'
  | 'antagonists'
  | 'pathologies'
  | 'clinical';

/**
 * Open by default: the four facts a physio looks a muscle up for. They are two
 * or three lines each, so they fit on screen together. Antes solo llegaban
 * abiertos origen e insercion, y la inervacion y las acciones (que es lo que se
 * pregunta en un examen) pedian un clic cada una en CADA musculo.
 */
const OPEN_BY_DEFAULT: SheetSection[] = ['origin', 'insertion', 'innervation', 'actions'];

/** Props every collapsible section needs, built from the shared open set. */
type SectionBinder = (id: SheetSection) => {
  id: SheetSection;
  open: boolean;
  onToggle: () => void;
};

export function SelectionPanel({ byMesh, resolution }: SelectionPanelProps) {
  const selectedMeshName = useAnatomyStore((s) => s.selectedMeshName);
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);
  const selectedBoneMeshes = useAnatomyStore((s) => s.selectedBoneMeshes);
  const sideFilter = useAnatomyStore((s) => s.sideFilter);
  const clearSelection = useAnatomyStore((s) => s.clearSelection);
  const requestFocus = useAnatomyStore((s) => s.requestFocus);
  const region = useAnatomyStore((s) => s.region);

  // The bones and nerves the left margin lists, by mesh: the sheet titles a
  // structure with the name its row carries. Once per region, not per click.
  const structures = useMemo(
    () => regionStructuresByMesh([...byMesh.values()], region),
    [byMesh, region],
  );

  const sheet = resolveSheet({
    region,
    selectedMeshName,
    selectedMuscleId,
    selectedBoneMeshes,
    byMesh,
    resolution,
    structures,
  });

  // One set for the whole margin, so what the user opened STAYS open while they
  // move from muscle to muscle (comparing the palpation of two cuff muscles
  // should not mean reopening "Palpacion" on each).
  const [openSet, setOpenSet] = useState<ReadonlySet<SheetSection>>(
    () => new Set(OPEN_BY_DEFAULT),
  );
  const sec: SectionBinder = (id) => ({
    id,
    open: openSet.has(id),
    onToggle: () =>
      setOpenSet((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
  });

  // EL LADO QUE SE DICE ES EL QUE ESTA ENCENDIDO. Un musculo se enciende entero
  // (los dos lados), y una malla cuyo nombre comparten las dos mitades tambien;
  // la ficha decia el lado de UNA entrada del indice. Ver lib/atlasSides.ts.
  const side =
    sheet.kind === 'none'
      ? null
      : sideLabel(
          sidesOfMeshes(sheet.meshNames) ??
            (sheet.kind === 'structure' ? sideSetOfEntry(sheet.entry.side) : null),
          sideFilter,
        );

  return (
    <aside
      aria-label="Ficha de la estructura seleccionada"
      // `max-w-full`: en el cajon del movil el contenedor mide como mucho 85vw
      // (306 px en un telefono de 360), y con 340 px fijos la ficha se salia por
      // la derecha y habia que desplazarla en horizontal para leer el final de
      // cada renglon.
      className="margin margin-r h-full w-[340px] max-w-full shrink-0"
    >
      <header className="flex min-h-[2.75rem] shrink-0 items-center gap-1 px-4 pt-1">
        <h2 className="kicker mr-1.5">Selección</h2>
        <span className="sec-rule" />
        {sheet.kind !== 'none' && (
          <>
            {/* Llegar a una estructura por la lista o por el buscador no mueve
                la camara si ya estaba seleccionada, y pincharla en el modelo
                tampoco: "Centrar" la encuadra desde donde este. */}
            {sheet.meshNames.length > 0 && (
              <button
                type="button"
                onClick={() => requestFocus(sheet.meshNames)}
                title="Encuadrar esta estructura en el modelo"
                className="btn btn-quiet btn-sm"
              >
                Centrar
              </button>
            )}
            <button type="button" onClick={clearSelection} className="btn btn-quiet btn-sm">
              Limpiar
            </button>
          </>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6">
        {sheet.kind === 'none' ? (
          <EmptyState />
        ) : sheet.kind === 'muscle' ? (
          <MuscleSheetView sheet={sheet} region={region} side={side} sec={sec} />
        ) : (
          <StructureSheetView sheet={sheet} side={side} />
        )}
      </div>
    </aside>
  );
}

/**
 * Nothing selected. Era un icono de cursor dentro de un recuadro con halo,
 * centrado en mitad de la columna, y dos atajos escritos como pista. Ahora dice
 * las TRES formas de seleccionar (el modelo, un nombre del margen, una fila de
 * la lista) y el buscador es un boton que se pulsa, no solo una combinacion de
 * teclas que hay que recordar: en una tableta no hay teclado que pulsar.
 */
function EmptyState() {
  const setPaletteOpen = useAnatomyStore((s) => s.setPaletteOpen);

  return (
    <div className="animate-fade-in">
      <div className="sec">
        <p className="font-display text-base font-semibold leading-snug text-fg">
          Ninguna estructura seleccionada
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-fg2">
          Toca una estructura del modelo, uno de los nombres que la rodean o una
          fila de la lista de la izquierda para abrir aquí su ficha clínica.
        </p>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="btn btn-line mt-4"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          Buscar en el atlas
        </button>
      </div>

      <div className="sec">
        <div className="sec-head">
          <span className="kicker">Atajos</span>
          <span className="sec-rule" />
        </div>
        <dl className="flex flex-col gap-2 text-[13px] text-fg2">
          <div className="flex items-center gap-3">
            <dt className="flex w-16 shrink-0 items-center gap-1">
              <span className="kbd">1</span>
              <span className="text-fg3">a</span>
              <span className="kbd">6</span>
            </dt>
            <dd>Vistas de cámara</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="flex w-16 shrink-0 items-center">
              <span className="kbd">{shortcutLabel()}</span>
            </dt>
            <dd>Buscar músculos, huesos, tests y movimientos</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/**
 * The line of facts under the name: layer, group, side. Era una fila de
 * pastillas de color; ahora son etiquetas en mono separadas por un punto medio,
 * con el punto de color de la capa delante.
 */
function FactLine({ dot, facts }: { dot: string; facts: Array<string | null | undefined> }) {
  const shown = facts.filter((f): f is string => !!f);
  return (
    <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      {shown.map((fact, i) => (
        <span key={`${fact}-${i}`} className="tag">
          {i > 0 && (
            <span className="mr-2" aria-hidden="true">
              ·
            </span>
          )}
          {fact}
        </span>
      ))}
    </p>
  );
}

/**
 * Sheet of a structure that is not a muscle: a bone, a nerve, a ligament, a
 * vessel. The atlas has no clinical record for these, so the sheet names it and
 * says so, instead of leaving an empty column.
 */
function StructureSheetView({ sheet, side }: { sheet: StructureSheet; side: string | null }) {
  const layer = LAYER_META[sheet.entry.layer];

  return (
    <div className="animate-slide-in-right">
      <div className="sec">
        <h3 className="font-display text-xl font-semibold leading-snug text-fg">{sheet.name}</h3>
        {/* The atlas's own (Latin / English) name, quiet: it is what a textbook
            index or a paper will call this structure. */}
        <p className="num mt-1 break-words text-[11px] text-fg3">
          {sheet.entry.canonicalName.replace(/_instance_\d+$/i, '').replace(/_/g, ' ')}
        </p>
        <FactLine dot={layer.dot} facts={[layer.label, side]} />
      </div>
      <div className="sec">
        <p className="note">
          Esta estructura todavía no tiene ficha clínica. Las fichas con origen,
          inserción, inervación y acciones están en los músculos de la región.
        </p>
      </div>
    </div>
  );
}

/** Body text of the sheet. */
function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-fg2">{children}</p>;
}

/** Sheet of a muscle: the rich cited content, or the muscle's own fields. */
function MuscleSheetView({
  sheet,
  region,
  side,
  sec,
}: {
  sheet: MuscleSheet;
  /** Active region, so a saved muscle can be reopened where it belongs. */
  region: string | null;
  side: string | null;
  sec: SectionBinder;
}) {
  const layer = LAYER_META.muscles;
  const { content, muscle } = sheet;
  const groups = content
    ? content.group
      ? [content.group]
      : []
    : (muscle?.groups.map((g) => FUNCTIONAL_GROUP_LABEL[g]) ?? []);

  return (
    <div className="animate-slide-in-right">
      <div className="sec">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-semibold leading-snug text-fg">
              {sheet.name}
            </h3>
            {sheet.latin && <p className="mt-0.5 text-sm italic text-fg2">{sheet.latin}</p>}
          </div>
          {region && content && (
            <SaveButton kind="muscle" region={region} id={sheet.muscleId} label={sheet.name} />
          )}
        </div>
        <FactLine dot={layer.dot} facts={[layer.label, ...groups, side]} />
      </div>

      {content ? (
        <RichSections sheet={sheet} sec={sec} />
      ) : muscle ? (
        <SimpleSections sheet={sheet} sec={sec} />
      ) : null}
    </div>
  );
}

/** The cited sheet of a muscle the region has authored content for. */
function RichSections({ sheet, sec }: { sheet: MuscleSheet; sec: SectionBinder }) {
  const content = sheet.content;
  if (!content) return null;
  const primaryActions = content.actions.filter((a) => a.role === 'primary');
  const accessoryActions = content.actions.filter((a) => a.role === 'accessory');

  return (
    <>
      <Section title="Origen" {...sec('origin')}>
        <Sourced item={content.origin} />
        <PartFocusControls variant="panel" part="origin" />
      </Section>

      <Section title="Inserción" {...sec('insertion')}>
        <Sourced item={content.insertion} />
        <PartFocusControls variant="panel" part="insertion" />
      </Section>

      <Section title="Inervación" {...sec('innervation')}>
        <Sourced item={content.innervation.nerve} />
        {content.innervation.roots && (
          <div className="mt-2">
            <Sourced item={content.innervation.roots} />
          </div>
        )}
      </Section>

      {content.actions.length > 0 && (
        <Section title="Acciones" {...sec('actions')}>
          {primaryActions.length > 0 && (
            <>
              <SubLabel>Principales</SubLabel>
              <ul className="flex flex-col gap-2">
                {primaryActions.map((a, i) => (
                  <li key={i}>
                    <ActionItem action={a} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {accessoryActions.length > 0 && (
            <>
              <SubLabel className={primaryActions.length > 0 ? 'mt-3' : ''}>Accesorias</SubLabel>
              <ul className="flex flex-col gap-2">
                {accessoryActions.map((a, i) => (
                  <li key={i}>
                    <ActionItem action={a} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
      )}

      {content.functionalPositions && (
        <Section title="Posiciones funcionales" {...sec('positions')}>
          <SubLabel>Acortado</SubLabel>
          <Sourced item={content.functionalPositions.shortened} />
          <SubLabel className="mt-3">Estirado</SubLabel>
          <Sourced item={content.functionalPositions.lengthened} />
        </Section>
      )}

      {content.biomechanics && content.biomechanics.length > 0 && (
        <Section title="Biomecánica" {...sec('biomechanics')}>
          <SourcedList items={content.biomechanics} />
        </Section>
      )}

      {content.palpation && (
        <Section title="Palpación" {...sec('palpation')}>
          <Sourced item={content.palpation.howTo} />
          {content.palpation.position && (
            <div className="mt-2">
              <SubLabel>Posición de acceso</SubLabel>
              <Sourced item={content.palpation.position} />
            </div>
          )}
        </Section>
      )}

      {content.synergists && content.synergists.length > 0 && (
        <Section title="Sinergistas" {...sec('synergists')}>
          <SourcedList items={content.synergists} />
        </Section>
      )}

      {content.antagonists && content.antagonists.length > 0 && (
        <Section title="Antagonistas" {...sec('antagonists')}>
          <SourcedList items={content.antagonists} />
        </Section>
      )}

      {content.pathologies && content.pathologies.length > 0 && (
        <Section title="Patologías frecuentes" {...sec('pathologies')}>
          <SourcedList items={content.pathologies} />
        </Section>
      )}

      {content.clinicalNotes && content.clinicalNotes.length > 0 && (
        <Section title="Relevancia clínica" {...sec('clinical')}>
          <SourcedList items={content.clinicalNotes} />
        </Section>
      )}
    </>
  );
}

/**
 * A muscle without a rich sheet in this region: its own attachment,
 * innervation and action fields. Un apartado sin texto NO se pinta: un rotulo
 * con su filo y nada debajo se lee como un fallo de carga. Y si el registro no
 * trae ningun dato (un musculo de otra region que asoma en esta) se dice eso,
 * en vez de "contenido en revision" sobre una ficha en blanco.
 */
function SimpleSections({ sheet, sec }: { sheet: MuscleSheet; sec: SectionBinder }) {
  const muscle = sheet.muscle;
  if (!muscle) return null;

  if (muscleRecordIsEmpty(muscle)) {
    return (
      <div className="sec">
        <p className="note">
          Este músculo se estudia en otra región: aquí solo se identifica. Su
          ficha completa se abre desde la región a la que pertenece.
        </p>
      </div>
    );
  }

  return (
    <>
      {muscle.origin && (
        <Section title="Origen" {...sec('origin')}>
          <Prose>{muscle.origin}</Prose>
        </Section>
      )}
      {muscle.insertion && (
        <Section title="Inserción" {...sec('insertion')}>
          <Prose>{muscle.insertion}</Prose>
        </Section>
      )}
      {muscle.innervation && (
        <Section title="Inervación" {...sec('innervation')}>
          <Prose>
            {muscle.innervation}
            {muscle.roots.length > 0 && (
              <span className="num ml-1.5 text-[11px] text-fg3">({muscle.roots.join(', ')})</span>
            )}
          </Prose>
        </Section>
      )}
      {muscle.actions.length > 0 && (
        <Section title="Acciones" {...sec('actions')}>
          <ul className="flex flex-col gap-1.5">
            {muscle.actions.map((a, i) => (
              <li key={i} className="text-[13px] leading-relaxed text-fg2">
                <span className="font-medium text-fg">{a.movement}</span>
                <span className="text-fg3"> · {a.joint}</span>
                {a.note && <span className="block">{a.note}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {muscle.clinicalNote && (
        <Section title="Relevancia clínica" {...sec('clinical')}>
          <Prose>{muscle.clinicalNote}</Prose>
        </Section>
      )}
      <div className="sec">
        <p className="note">Contenido en revisión; pendiente de verificación con la fuente.</p>
      </div>
    </>
  );
}

/** A second-rank label inside a section ("Principales", "Acortado"). */
function SubLabel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={`tag mb-1 text-fg2 ${className}`}>{children}</p>;
}

function ActionItem({ action }: { action: MuscleAction }) {
  return (
    <div>
      <Prose>{action.text}</Prose>
      <CitationRow cites={action.cite} />
    </div>
  );
}

function Sourced({ item }: { item: SourcedText }) {
  return (
    <div>
      <Prose>{item.text}</Prose>
      <CitationRow cites={item.cite} />
    </div>
  );
}

function SourcedList({ items }: { items: SourcedText[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <li key={i}>
          <Sourced item={it} />
        </li>
      ))}
    </ul>
  );
}

/** The sources under a claim: mono tags separated by a middle dot. */
// LA CITA SE ABRE CON UN TOQUE. Esta fila era una copia privada que solo
// ensenaba la referencia en `title`, y `title` no existe en una pantalla
// tactil: en el iPad la cita no llevaba a ningun sitio. Se usa la de Aprender
// (MuscleContentSections), que se pulsa y despliega la referencia entera con su
// enlace. Pedido del agente de Aprender, tanda 2a.

/**
 * A collapsible section of the sheet. The header is the LAMINA section head
 * made clickable (chevron + kicker + rule); there is no box around the body.
 */
function Section({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: SheetSection;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4">
      {/* El titulo envuelve al boton, y no al reves: un encabezado dentro de un
          <button> no es HTML valido y los lectores de pantalla lo aplanan. */}
      <h4>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`ficha-${id}`}
          // 44 px en el cajon tactil; 36 px en el margen de escritorio.
          className="sec-head group mb-0 min-h-[44px] w-full text-left lg:min-h-[2.25rem]"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            aria-hidden="true"
            className={`shrink-0 transition-transform ${
              open ? 'rotate-90 text-fg2' : 'text-fg3 group-hover:text-fg2'
            }`}
          >
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={`kicker transition-colors ${open ? 'text-fg2' : 'group-hover:text-fg2'}`}>
            {title}
          </span>
          <span className="sec-rule" />
        </button>
      </h4>
      {open && (
        <div id={`ficha-${id}`} className="pb-3 pl-5">
          {children}
        </div>
      )}
    </section>
  );
}
