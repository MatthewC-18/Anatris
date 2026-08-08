// src/components/study/CollectionView.tsx
//
// "Mi colección": everything the user has bookmarked, with an editable note per
// item. This is the half of retention the app was missing — a place where the
// user's OWN work accumulates, rather than one more thing to read.
//
// Scope note: it lists the CURRENT REGION's items, matching the rest of the
// study view (which is region-scoped throughout), with a count of what is saved
// elsewhere so nothing feels lost.
//
// The note is saved on blur rather than on every keystroke: each write touches
// localStorage and bumps `updatedAt`, which the account sync then debounces and
// uploads. Per-keystroke writes would turn one sentence into forty sync pushes.

import { useEffect, useRef, useState } from 'react';
import { useCollection } from '../../hooks/useCollection';
import type { CollectionItem, CollectionKind } from '../../lib/collection';

const KIND_LABEL: Record<CollectionKind, string> = {
  muscle: 'Músculo',
  test: 'Test',
  movement: 'Movimiento',
  case: 'Caso',
};

export function CollectionView({ region }: { region: string }) {
  const { items, remove, setNote } = useCollection(region);
  const all = useCollection();
  const elsewhere = all.count - items.length;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="font-display text-lg font-semibold text-slate-300">
          Aún no has guardado nada en esta región
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Pulsa el marcador junto a un músculo o a un test para guardarlo aquí y
          añadirle tus notas. Se guarda en este dispositivo y, si inicias sesión,
          te sigue a los demás.
        </p>
        {elsewhere > 0 && (
          <p className="mt-4 text-xs text-slate-600">
            Tienes {elsewhere} {elsewhere === 1 ? 'elemento guardado' : 'elementos guardados'} en
            otras regiones.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <CollectionRow
            key={item.key}
            item={item}
            onRemove={() => remove(item.key)}
            onNote={(note) => setNote(item.key, note)}
          />
        ))}
      </ul>
      {elsewhere > 0 && (
        <p className="mt-6 text-center text-xs text-slate-600">
          Y {elsewhere} {elsewhere === 1 ? 'elemento' : 'elementos'} en otras regiones.
        </p>
      )}
    </div>
  );
}

function CollectionRow({
  item,
  onRemove,
  onNote,
}: {
  item: CollectionItem;
  onRemove: () => void;
  onNote: (note: string) => void;
}) {
  const [draft, setDraft] = useState(item.note);
  const lastSaved = useRef(item.note);

  // Adopt an externally changed note (another device's sync, another tab)
  // WITHOUT clobbering what the user is typing right now.
  useEffect(() => {
    if (item.note !== lastSaved.current && draft === lastSaved.current) {
      setDraft(item.note);
      lastSaved.current = item.note;
    }
  }, [item.note, draft]);

  function commit() {
    if (draft === lastSaved.current) return;
    lastSaved.current = draft;
    onNote(draft);
  }

  return (
    <li className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
            {KIND_LABEL[item.kind]}
          </span>
          <p className="mt-0.5 font-display text-sm font-semibold leading-snug text-slate-100">
            {item.label}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${item.label} de mi colección`}
          title="Quitar de mi colección"
          className="shrink-0 rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-800/60 hover:text-rose-300"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        rows={draft ? 3 : 1}
        placeholder="Tu nota…"
        aria-label={`Nota sobre ${item.label}`}
        className="mt-3 w-full resize-y rounded-lg border border-slate-800/60 bg-slate-950/40 px-3 py-2 text-sm leading-relaxed text-slate-300 placeholder:text-slate-600 focus:border-accent/50 focus:outline-none"
      />
    </li>
  );
}
