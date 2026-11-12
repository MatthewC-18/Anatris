// src/components/movement/NeuroScreenReadout.tsx
//
// THE LOCALISER: reads the segmental screen backwards and says which root best
// explains it.
//
// This is the neuro panel's counterpart to the tests panel's Fagan block -- the
// piece that reasons rather than lists -- and it runs in the direction a clinician
// actually works: not "what does C7 do" but "a weak triceps and a numb middle
// finger, which level is that".
//
// -----------------------------------------------------------------------------
// WHAT IT SHOWS, AND WHY IN THIS ORDER
// -----------------------------------------------------------------------------
// 1. THE LEVEL, with how much of its pattern is present. Extent is the honest
//    confidence cue here, not a percentage: three affected axes at one level is a
//    different claim from one, and inventing a probability out of integer grades
//    would dress up a judgement as a measurement.
// 2. THE RANKING, as bars, so a near tie is VISIBLE rather than hidden behind a
//    winner. Adjacent dermatomes overlap; a plate that declares C6 when C7 scored
//    one point less is lying by omission.
// 3. THE MIMIC of the leading root, always. Ranking a root does not exclude the
//    peripheral nerve that imitates it, so no score suppresses this.
// 4. THE CAVEATS, which are the findings that change what happens next rather
//    than which root it is -- hyperreflexia above all, since a brisk reflex means
//    the answer is not a root at all.
//
// Colour: the roots keep their segmental pigment, so a bar here is the same
// object as its band on the plate and its chip in the list. Amber is the panel's
// attention colour and carries the caveats. Cyan stays interactive: it is only on
// the button that selects the level.
//
// LAMINA (docs/sistema-lamina.md): una seccion con rotulo y filo, barras de 2 px
// (`.meter`, del color del pigmento), avisos con regla ambar a la izquierda
// (`.note-warn`) y las tres acciones como texto que responde (`btn-quiet`), no
// como pastillas con borde.
//
// UI Spanish LATAM; code and comments ASCII/English.

import { pigmentFor, type PlateFigure } from '../../data/neuro/plate';
import type { Localization, PatternExtent, RootScore } from '../../lib/neuroScreen';

/** How the extent of a pattern is worded, and how firmly. */
const EXTENT_COPY: Record<PatternExtent, { label: string; note: string }> = {
  completo: {
    label: 'Patrón completo',
    note: 'Dermatoma, fuerza y reflejo apuntan al mismo nivel.',
  },
  parcial: {
    label: 'Patrón parcial',
    note: 'Dos de los tres ejes apuntan a este nivel.',
  },
  aislado: {
    label: 'Hallazgo aislado',
    note: 'Un solo eje alterado. Completa el tamizaje antes de concluir.',
  },
};

function Bar({ figure, entry, max }: { figure: PlateFigure; entry: RootScore; max: number }) {
  const pct = max > 0 ? (entry.score / max) * 100 : 0;
  const pigment = pigmentFor(figure, entry.root.id);
  const axes = entry.root.reflex ? 3 : 2;
  const state =
    entry.score === 0
      ? entry.examinedAxes === 0
        ? 'sin explorar'
        : 'dentro de lo normal'
      : `${entry.affectedAxes} de ${axes} ejes alterados`;
  return (
    <div className="flex items-center gap-2.5" title={`${entry.root.label}: ${state}`}>
      <span className="num w-7 shrink-0 text-[11px] font-bold text-fg">{entry.root.label}</span>
      {/* El `.meter` pinta su relleno con `currentColor`: el pigmento de la raiz. */}
      <span
        className="meter flex-1"
        style={{ color: pigment, '--v': pct } as React.CSSProperties}
        aria-hidden="true"
      />
      <span className="w-16 shrink-0 text-right text-[11px] text-fg3">
        {entry.score === 0
          ? entry.examinedAxes === 0
            ? 'sin datos'
            : 'normal'
          : `${entry.affectedAxes} de ${axes}`}
      </span>
    </div>
  );
}

export function NeuroScreenReadout({
  figure,
  localization,
  onShowLevel,
  onClear,
  onCopy,
  copied,
  copyFailed = false,
}: {
  figure: PlateFigure;
  localization: Localization;
  /**
   * Paint the proposed level on the plate. Takes a LIST, because a tie proposes
   * two levels and showing one of them would be the readout contradicting the
   * sentence above it. Explicit, never automatic: a plate lighting up a root
   * nobody picked would be the panel answering its own question.
   */
  onShowLevel: (roots: string[]) => void;
  onClear: () => void;
  onCopy: () => void;
  copied: boolean;
  /** The clipboard refused. Said out loud, because a silent failure here looks
   *  like a dead button and the record is the reason the screen was filled in. */
  copyFailed?: boolean;
}) {
  const { ranked, byLevel, leading, contenders, caveats } = localization;
  // Scale the bars to the best score, not to the theoretical maximum: at 3 of 10
  // every bar is a stub and the ranking becomes unreadable.
  const max = ranked.reduce((m, r) => Math.max(m, r.score), 0);
  const tied = contenders.length > 1;

  // Deduplicated by nerve: two neighbouring roots can name the same entrapment,
  // and printing "Nervio cubital en el codo" twice reads as a bug.
  const mimics = (tied ? contenders : leading ? [leading] : [])
    .map((c) => c.root.mimic)
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .filter((m, i, all) => all.findIndex((x) => x.nerve === m.nerve) === i);

  return (
    <section className="sec">
      <div className="sec-head">
        <span className="kicker text-[11px]">Qué nivel lo explica</span>
        <span className="sec-rule" />
      </div>

      {leading ? (
        <div>
          {/* `flex-wrap`: a 19rem el nivel, su patron y "Ver en el cuerpo" no
              caben en una linea cuando hay empate ("C6 / C7"). */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {/* One dot per level named, so a tie does not show a single colour for
                two roots -- which read as C7 having been painted C6's pigment. */}
            <span className="mt-[3px] flex shrink-0 gap-1" aria-hidden="true">
              {(tied ? contenders : [leading]).map((c) => (
                <span
                  key={c.root.id}
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: pigmentFor(figure, c.root.id) }}
                />
              ))}
            </span>
            {/* 14 px, el tamano mayor del panel (regla 1 de NeuroPanel): iba a
                16 px, un cuarto tamano. */}
            <span className="num text-sm font-bold leading-none text-fg">
              {tied ? contenders.map((c) => c.root.label).join(' / ') : leading.root.label}
            </span>
            {/* Extent describes ONE level, so it is dropped on a tie: "C6 / C7 ·
                hallazgo aislado" read as the pair being one isolated finding. */}
            {!tied && (
              <span className="text-[11px] text-fg3">{EXTENT_COPY[leading.extent].label}</span>
            )}
            {/* "VER EN LA LAMINA" YA NO SE VEIA EN LA LAMINA. La carta de
                dermatomas esta ahora sobre el cuerpo (NeuroSkinLayer) y el
                esquema plano va plegado al final del panel: el boton elegia la
                raiz, el cuerpo la pintaba y el texto mandaba a mirar un dibujo
                cerrado. Dice donde aparece. */}
            <button
              type="button"
              onClick={() => onShowLevel(tied ? contenders.map((c) => c.root.id) : [leading.root.id])}
              title={
                tied
                  ? 'Pintar los dos niveles sobre el cuerpo para compararlos'
                  : 'Pintar este nivel sobre el cuerpo'
              }
              className="btn btn-quiet btn-sm -mr-2 ml-auto shrink-0 text-[11px] text-brand"
            >
              Ver en el cuerpo
            </button>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-fg2">
            {tied
              ? 'Los hallazgos no separan estos dos niveles.'
              : EXTENT_COPY[leading.extent].note}
          </p>
        </div>
      ) : (
        // The section asks a question in its own heading, so it always answers it.
        // Leaving this blank read as a broken panel on a screen whose only finding
        // was a brisk reflex.
        <p className="text-[13px] leading-relaxed text-fg2">
          Ningún nivel explica lo registrado hasta ahora.
        </p>
      )}

      <div className="mt-2.5 space-y-1.5">
        {byLevel.map((entry) => (
          <Bar key={entry.root.id} figure={figure} entry={entry} max={max} />
        ))}
      </div>

      {/* Never suppressed by a high score: a ranked root is not an excluded nerve.
          On a tie, EVERY named level's mimic is listed -- proposing two levels and
          then ruling out only the first one's nerve would leave half the
          differential unstated. */}
      {mimics.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-2.5">
            <span className="kicker text-[11px]">Antes de cerrarlo, descarta</span>
            <span className="sec-rule" />
          </div>
          {mimics.map((m) => (
            <p key={m.nerve} className="mt-1 text-[13px] leading-relaxed text-fg2">
              <span className="text-fg">{m.nerve}.</span> {m.discriminator}
            </p>
          ))}
        </div>
      )}

      {caveats.map((c) => (
        <div key={c.id} className="note note-warn mt-3 text-[13px] leading-relaxed">
          <span className="block font-semibold text-amber-200/90">{c.label}</span>
          <span className="block">{c.detail}</span>
        </div>
      ))}

      <p className="mt-3 text-[11px] leading-snug text-fg3">
        Pesa lo que registraste en un miembro. No es un diagnóstico.
      </p>

      {/* LAS ACCIONES VAN AL PIE, despues de leer. Estaban en la cabecera, a la
          derecha del rotulo, y a 19rem "QUE NIVEL LO EXPLICA" mas dos botones
          con borde no cabian en una linea (unos 160 px de rotulo en versalitas
          de 11 px y 110 de botones contra 272 libres). Copiar es lo que se hace
          cuando el tamizaje esta completo, asi que su sitio natural es el
          final. */}
      <div className="-mx-2 mt-2 flex items-center gap-0.5">
        <button
          type="button"
          onClick={onCopy}
          title="Copiar el tamizaje como texto para la historia clínica"
          className={`btn btn-quiet btn-sm text-[11px] ${copyFailed ? 'text-amber-300' : 'text-brand'}`}
        >
          {copyFailed ? 'No se pudo copiar' : copied ? 'Copiado' : 'Copiar para la historia'}
        </button>
        <button
          type="button"
          onClick={onClear}
          title="Borrar todo lo registrado en este tamizaje"
          className="btn btn-quiet btn-sm text-[11px]"
        >
          Limpiar
        </button>
      </div>
    </section>
  );
}
