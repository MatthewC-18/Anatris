// src/hooks/useStudyKeys.ts
//
// Conecta el teclado del modo Repasar a la ventana. La decision de que hace
// cada tecla, y de cuando NO hay que tocarla, es pura y vive en
// src/lib/studyKeys.ts; esto solo le da los cuatro hechos del DOM que necesita
// (modificadores, si se esta escribiendo, si el foco esta en un control, si
// algo tapa la vista) y escucha.
//
// POR QUE EN LA VENTANA Y NO EN LA TARJETA. Un `onKeyDown` en la tarjeta solo
// funciona con el foco dentro de ella, y el foco casi nunca esta ahi: al
// calificar, el boton pulsado se desmonta y el foco cae en `body`; al entrar
// con el raton se queda en la pestana "Repaso". Escuchando en la ventana el
// espacio voltea este donde este el foco.

import { useEffect, useRef, type RefObject } from 'react';
import { shouldIgnoreStudyKey } from '../lib/studyKeys';

const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const CONTROL = new Set(['BUTTON', 'A', 'SUMMARY']);

/** El foco esta en un campo de texto. */
function isTyping(t: HTMLElement | null): boolean {
  return Boolean(t && (TYPING.has(t.tagName) || t.isContentEditable));
}

/** El foco esta en algo que espacio o Intro activan por si solos. */
function isOnControl(t: HTMLElement | null): boolean {
  if (!t) return false;
  const role = t.getAttribute('role');
  // La pestana YA seleccionada no cuenta: ver `KeyContext.onControl`.
  if (role === 'tab' && t.getAttribute('aria-selected') === 'true') return false;
  if (CONTROL.has(t.tagName)) return true;
  return role === 'button' || role === 'tab' || role === 'link' || role === 'switch';
}

/**
 * True si algo tapa la vista de repaso. Se pregunta al navegador que elemento
 * hay en el centro de la vista: si no es de la vista, hay un dialogo, la paleta
 * o el tour encima. Asi no hace falta que cada capa nueva de la aplicacion se
 * acuerde de avisar aqui.
 */
function isCovered(el: HTMLElement | null): boolean {
  if (!el || typeof document === 'undefined' || !document.elementFromPoint) return false;
  const scope = (el.closest('[data-study-view]') as HTMLElement | null) ?? el;
  const r = scope.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return true;
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return !(hit && scope.contains(hit));
}

/**
 * @param rootRef un elemento de la vista (para saber si esta tapada).
 * @param onKey recibe la tecla y devuelve true si la ha usado; entonces se
 *   cancela su efecto por defecto (el espacio desplazaria la pagina).
 */
export function useStudyKeys(
  rootRef: RefObject<HTMLElement | null>,
  onKey: (key: string) => boolean,
): void {
  // El manejador cambia en cada render (cierra sobre la tarjeta actual); con
  // una ref el `keydown` se registra una sola vez y nunca lee una tarjeta vieja.
  const handler = useRef(onKey);
  handler.current = onKey;

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (
        shouldIgnoreStudyKey({
          key: e.key,
          modifier: e.ctrlKey || e.metaKey || e.altKey,
          repeat: e.repeat,
          typing: isTyping(t),
          onControl: isOnControl(t),
          covered: isCovered(rootRef.current),
        })
      ) {
        return;
      }
      if (handler.current(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [rootRef]);
}
