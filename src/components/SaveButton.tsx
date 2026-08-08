// src/components/SaveButton.tsx
//
// The one control that puts something into "Mi colección". Used from the muscle
// sheet and the orthopedic-tests panel, so the affordance reads identically
// wherever it appears — a bookmark that fills in when saved.
//
// Deliberately NOT gated behind an account: saving works offline and signed
// out, and only SYNCS when signed in. Asking someone to register before they
// have any reason to care is how you lose them; letting them build a collection
// first is how you earn the account.

import { useCollection } from '../hooks/useCollection';
import { EVENTS, track } from '../lib/analytics';
import type { CollectionKind } from '../lib/collection';

export function SaveButton({
  kind,
  region,
  id,
  label,
  size = 'md',
}: {
  kind: CollectionKind;
  region: string;
  id: string;
  /** Display name stored with the item (see the note in lib/collection.ts). */
  label: string;
  size?: 'sm' | 'md';
}) {
  const { isSaved, toggle } = useCollection();
  const saved = isSaved(kind, region, id);
  const px = size === 'sm' ? 14 : 16;

  return (
    <button
      type="button"
      onClick={() => {
        toggle({ kind, region, id, label });
        // Only the save direction is worth a funnel event; un-saving is noise.
        if (!saved) track(EVENTS.itemSaved, { kind, region });
      }}
      aria-pressed={saved}
      title={saved ? 'Quitar de mi colección' : 'Guardar en mi colección'}
      aria-label={saved ? 'Quitar de mi colección' : 'Guardar en mi colección'}
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors',
        size === 'sm' ? 'p-1' : 'p-1.5',
        saved
          ? 'text-accent hover:bg-accent/10'
          : 'text-slate-500 hover:bg-slate-100/[0.06] hover:text-slate-300',
      ].join(' ')}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
