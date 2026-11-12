// src/hooks/useDialogFocus.ts
//
// LO QUE CONVIERTE UN RECUADRO CENTRADO EN UN DIALOGO.
//
// La aplicacion tenia siete superficies modales (la guia, los planes, lo legal,
// los creditos, la evidencia, el inicio de sesion, el cambio de contrasena) y
// dos cajones moviles, y ninguno era un dialogo para el teclado. Leido en el
// codigo, antes de este fichero:
//
//   - `OverlayShell` y `DrawerShell` (App.tsx) no escuchaban Escape. La guia
//     rapida, los planes y los dos cajones solo se cerraban con el raton.
//   - Ninguno movia el foco al abrirse: el foco se quedaba en el boton de la
//     barra que lo abrio, DEBAJO del velo, y Tab seguia recorriendo la
//     aplicacion tapada.
//   - Ninguno lo devolvia al cerrarse.
//   - Los atajos de una sola tecla seguian vivos debajo: con la guia abierta,
//     la D diseccionaba el musculo seleccionado en el laboratorio
//     (DissectionPanel escucha `keydown` en window) y la R reencuadraba.
//
// El unico que hacia parte del trabajo era el tour, y sin atrapar el foco.
//
// Este hook es esa pieza, una sola vez:
//   1. Al abrir, el foco entra en el dialogo (en `[data-autofocus]` si lo hay y
//      el puntero es fino; si no, en el propio contenedor).
//   2. Tab y Mayus+Tab dan la vuelta dentro.
//   3. Escape llama a `onEscape`, y NO llega a los demas oyentes (asi no suelta
//      ademas la seleccion del laboratorio, que tambien escucha Escape).
//   4. Las teclas sueltas no pasan a los atajos de debajo.
//   5. Al cerrar, el foco vuelve a donde estaba.
//
// Con varios abiertos a la vez (el inicio de sesion abre los terminos encima)
// manda el ULTIMO: una pila, no un booleano.

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * A donde va el foco con Tab dentro de un dialogo de `count` elementos
 * enfocables, estando en el `index` (-1 si el foco esta en el contenedor o
 * fuera). Devuelve el indice al que hay que saltar, -1 si no hay nada
 * enfocable (el foco se queda en el contenedor) o `null` si el navegador puede
 * seguir solo, que es el caso normal: solo se interviene en los dos extremos.
 */
export function trapTarget(count: number, index: number, backwards: boolean): number | null {
  if (count === 0) return -1;
  if (index < 0) return backwards ? count - 1 : 0;
  if (backwards && index === 0) return count - 1;
  if (!backwards && index === count - 1) return 0;
  return null;
}

/**
 * Si una tecla es un ATAJO SUELTO que no debe llegar a lo que hay debajo del
 * dialogo: un solo caracter imprimible, sin modificador y fuera de un campo de
 * texto. El espacio no cuenta (activa el boton enfocado) y con Ctrl o Cmd
 * tampoco (copiar, recargar siguen siendo del usuario).
 */
export function swallowsShortcut(
  e: { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean },
  editable: boolean,
): boolean {
  if (editable) return false;
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  return e.key.length === 1 && e.key !== ' ';
}

function isEditable(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  );
}

function focusablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    // Lo que no ocupa sitio no recibe foco (un boton en `hidden`, por ejemplo).
    (el) => el.getClientRects().length > 0,
  );
}

/** Los dialogos abiertos, del primero al ultimo. Solo el ultimo atiende teclas. */
const stack: object[] = [];

interface DialogFocusOptions {
  /** El dialogo esta en pantalla. Por defecto, si. */
  open?: boolean;
  /** Que hacer con Escape. Sin valor, Escape no cierra (dialogo obligatorio). */
  onEscape?: () => void;
  /**
   * Deja pasar Ctrl/Cmd+K al buscador. Solo para las superficies que App
   * cierra cuando el buscador se abre (la guia, los planes, los cajones); en
   * las demas el buscador se abriria DEBAJO del dialogo, con el foco en un
   * campo que no se ve.
   */
  yieldToSearch?: boolean;
}

/**
 * Hace de `ref` un dialogo para el teclado. El elemento necesita
 * `tabIndex={-1}` para poder recibir el foco inicial.
 */
export function useDialogFocus(
  ref: RefObject<HTMLElement | null>,
  { open = true, onEscape, yieldToSearch = false }: DialogFocusOptions = {},
): void {
  // En refs para que cambiar la funcion entre renders no desmonte el efecto
  // (y con el, no devuelva y vuelva a robar el foco a mitad de escribir).
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;
  const yieldRef = useRef(yieldToSearch);
  yieldRef.current = yieldToSearch;

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (!node) return;

    const token = {};
    stack.push(token);
    const previous = document.activeElement as HTMLElement | null;

    // Foco inicial. `[data-autofocus]` solo con puntero fino: en un telefono
    // enfocar un campo abre el teclado y tapa medio dialogo antes de leerlo.
    const fine =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
    const wanted = fine ? node.querySelector<HTMLElement>('[data-autofocus]') : null;
    (wanted ?? node).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return;

      // Si el foco esta en OTRA capa (el buscador abierto encima, un menu), el
      // dialogo no manda: ni le quita el Tab ni se queda con su Escape.
      const active = document.activeElement;
      if (active && active !== document.body && !node.contains(active)) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !yieldRef.current) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }

      if (e.key === 'Escape') {
        // Se para SIEMPRE, cierre o no: con un dialogo abierto, Escape no es
        // de lo que hay debajo.
        e.stopPropagation();
        if (escapeRef.current) {
          e.preventDefault();
          escapeRef.current();
        }
        return;
      }

      if (e.key === 'Tab') {
        const items = focusablesIn(node);
        const to = trapTarget(items.length, items.indexOf(active as HTMLElement), e.shiftKey);
        if (to === null) return;
        e.preventDefault();
        (to < 0 ? node : items[to]).focus();
        return;
      }

      if (swallowsShortcut(e, isEditable(e.target))) e.stopPropagation();
    };

    // En CAPTURA y sobre `document`: los atajos de la aplicacion escuchan en
    // `window` durante el burbujeo, asi que parar la propagacion aqui es lo
    // unico que los deja fuera sin tocar cada uno de ellos.
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      const i = stack.indexOf(token);
      if (i >= 0) stack.splice(i, 1);
      // Devuelve el foco, salvo que lo que lo tenia ya no exista (el boton
      // que abrio el dialogo pudo desmontarse mientras tanto) o que otra capa
      // lo haya tomado a proposito al cerrarse esta (el buscador enfoca su
      // campo): quitarselo seria dejar al usuario escribiendo en la nada.
      const now = document.activeElement;
      const taken = now != null && now !== document.body && !node.contains(now);
      if (!taken && previous && previous.isConnected && typeof previous.focus === 'function') {
        previous.focus({ preventScroll: true });
      }
    };
  }, [open, ref]);
}
