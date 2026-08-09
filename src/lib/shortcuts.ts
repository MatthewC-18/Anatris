// src/lib/shortcuts.ts
//
// The app-level keyboard map, declared ONCE so the handler and the cheat sheet
// can never disagree. A shortcut that is implemented but undocumented does not
// exist; a shortcut that is documented but unimplemented is worse.
//
// WHY THESE KEYS
//
// The digits 1-6 were already taken: ViewToolbar binds them to the six camera
// views in Explorar, and the movement lab binds D / A / Z to dissect, isolate
// and undo. So the modes are on SHIFT + digit, matched on `event.code`
// (`Digit1`...) rather than `event.key`, because on the Spanish, French and
// German layouts this product actually ships to, Shift+1 produces `!`, `&` or
// `!` respectively -- reading `key` would have made the shortcut work only on a
// US keyboard.
//
// The single letters we do claim (`g`, `?`, `/`) are all free, and everything
// else is a modifier-free key that no text field can swallow because the handler
// bails on typing targets.

/** One row of the cheat sheet, and the source of truth for what it does. */
export interface ShortcutDef {
  /** Rendered as separate <kbd> chips, joined by "+" or "then". */
  keys: string[];
  label: string;
  /** Joined with a "+" (chord) or nothing (alternatives shown as "o"). */
  join?: 'plus' | 'or';
}

export interface ShortcutGroup {
  title: string;
  items: ShortcutDef[];
}

/**
 * The published map. `searchLabel` is injected by the caller so the sheet shows
 * the platform's real modifier glyph (Cmd on Apple, Ctrl elsewhere), the same
 * way the TopBar's search button does.
 */
export function shortcutGroups(searchLabel: string): ShortcutGroup[] {
  return [
    {
      title: 'Moverte por la app',
      items: [
        { keys: ['⇧', '1'], label: 'Modo Explorar', join: 'plus' },
        { keys: ['⇧', '2'], label: 'Modo Aprender', join: 'plus' },
        { keys: ['⇧', '3'], label: 'Modo Movimiento', join: 'plus' },
        { keys: ['⇧', '4'], label: 'Modo Estudiar', join: 'plus' },
        { keys: ['⇧', '←'], label: 'Región anterior', join: 'plus' },
        { keys: ['⇧', '→'], label: 'Región siguiente', join: 'plus' },
        { keys: ['N'], label: 'Ir al siguiente paso sugerido' },
      ],
    },
    {
      title: 'Encontrar cosas',
      items: [
        { keys: [searchLabel, '/'], label: 'Buscar una estructura', join: 'or' },
        { keys: ['G'], label: 'Abrir la guía rápida' },
        { keys: ['?'], label: 'Esta hoja de atajos' },
        { keys: ['Esc'], label: 'Cerrar, o soltar la selección' },
      ],
    },
    {
      title: 'En el visor 3D (Explorar)',
      items: [
        { keys: ['1'], label: 'Vista anterior' },
        { keys: ['2'], label: 'Vista posterior' },
        { keys: ['3'], label: 'Lateral derecha' },
        { keys: ['4'], label: 'Lateral izquierda' },
        { keys: ['5'], label: 'Vista superior' },
        { keys: ['6'], label: 'Vista 3/4' },
      ],
    },
    {
      title: 'En el laboratorio de movimiento',
      items: [
        { keys: ['D'], label: 'Disecar la estructura seleccionada' },
        { keys: ['A'], label: 'Aislar la estructura seleccionada' },
        { keys: ['Z'], label: 'Deshacer la última disección' },
      ],
    },
  ];
}

/**
 * True when the event came from somewhere the user is writing, so a global
 * single-letter shortcut must not fire. Every keyboard handler in the app funnels
 * through this instead of re-writing the same three tag checks.
 */
export function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return (
    t.tagName === 'INPUT' ||
    t.tagName === 'TEXTAREA' ||
    t.tagName === 'SELECT' ||
    t.isContentEditable
  );
}
