// src/components/ShortcutsSheet.tsx
//
// The published keyboard map, rendered from lib/shortcuts.ts. Opened with "?"
// from anywhere, from the Guía hub, and from the command palette.
//
// A cheat sheet is not decoration in a tool like this one. A physiotherapy
// student uses Anatris with the model under one hand and a textbook or a patient
// under the other, and the difference between a product that feels like an
// instrument and one that feels like a website is whether the second hand ever
// has to go back to the mouse. The keys existed before this sheet did -- camera
// views, dissection -- they were just undiscoverable, documented in a `title`
// attribute that no touch device ever shows.

import { shortcutGroups } from '../lib/shortcuts';
import { shortcutLabel } from './TopBar';

export function ShortcutsSheet() {
  const groups = shortcutGroups(shortcutLabel());

  return (
    <div className="px-5 py-5">
      <p className="text-xs leading-relaxed text-slate-400">
        Los atajos funcionan en cualquier pantalla de la aplicación, salvo
        mientras escribes en un campo de texto.
      </p>

      <div className="mt-5 space-y-5">
        {groups.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {group.title}
            </h3>
            <ul className="divide-y divide-slate-800/50 rounded-xl border border-slate-800/70 bg-slate-900/40">
              {group.items.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between gap-4 px-3.5 py-2"
                >
                  <span className="min-w-0 text-xs leading-snug text-slate-300">
                    {item.label}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {item.keys.map((key, i) => (
                      <span key={key} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-[10px] text-slate-600">
                            {item.join === 'plus' ? '+' : 'o'}
                          </span>
                        )}
                        <span className="kbd">{key}</span>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-slate-500">
        Los atajos de modo usan la tecla física, así que funcionan igual en
        teclados español, latinoamericano o inglés.
      </p>
    </div>
  );
}
