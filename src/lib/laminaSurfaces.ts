// src/lib/laminaSurfaces.ts
//
// EL DETECTOR DE CAJAS DEL SISTEMA LAMINA.
//
// La regla del sistema (docs/sistema-lamina.md) es "dentro de un margen no hay
// cajas", y una regla asi solo se sostiene contandola. Esto lee el codigo
// fuente de un componente y devuelve cada `className` que dibuja:
//
//   CAJA        un contenedor con radio, contorno Y relleno
//               (`rounded-md|lg|xl|2xl|3xl` + `border`/`ring-1` + `bg-*`)
//   BLOQUE      lo mismo sin contorno: un rectangulo redondeado tenido. Es la
//               caja que no se ve en el codigo y si en pantalla.
//   PASTILLA    una ficha: capsula o chip con relleno o contorno
//               (`rounded`/`rounded-full` + `px-*` + `border`/`ring-1`/`bg-*`)
//   SUPERFICIE  una lamina flotante (`instrument`, `glass`, `glass-strong`)
//
// Un relleno que solo aparece AL PASAR (`hover:bg-*`, `focus:`, `active:`,
// `disabled:`, `group-hover:`) no es una caja: es la respuesta de un boton. Esas
// variantes no cuentan. Las de ancho (`sm:`, `lg:`...) si, como su clase base.
//
// POR QUE LA EXPRESION ENTERA Y NO CADA CADENA. Las clases de un elemento casi
// nunca estan en una sola cadena: `border ${on ? 'bg-accent/20' : 'bg-ink-900'}`
// reparte la firma entre tres literales, y contando literal a literal ese
// elemento no es una caja en ninguno de ellos. Asi que se toma la expresion
// completa de cada `className=` y se mira la UNION de sus palabras. Sobrecuenta
// (suma las ramas de un condicional) y eso esta bien: es un detector, y lo que
// marca de mas se mira y se justifica.
//
// JUSTIFICAR. Donde el recuadro ES el objeto (la tarjeta de repaso que se
// voltea, la muestra de un color) se marca con `caja-ok: <motivo>` en la linea
// del `className` o en una de las dos de encima.
//
// Sin dependencias: lo usan el banco (`npm run audit-surfaces`) y el test que
// fija en cero los ficheros ya convertidos.

export type SurfaceKind = 'caja' | 'bloque' | 'pastilla' | 'superficie';

export interface SurfaceFinding {
  line: number;
  kind: SurfaceKind;
  /** El motivo escrito en `caja-ok:`, o null si no esta justificada. */
  justified: string | null;
  /** La expresion, aplanada y recortada, para ensenarla. */
  text: string;
}

/** Variantes de ESTADO: lo que llevan no esta en pantalla en reposo. */
const STATE =
  /^(hover|focus|focus-visible|focus-within|active|disabled|group-hover|group-focus|peer-[a-z-]+|aria-[a-z[\]=-]+|data-[a-z[\]=-]+|placeholder|file|open|checked|enabled|visited|first|last|odd|even|before|after):/;

/** Variantes de ANCHO o de medio: la clase esta en pantalla, se cuenta. */
const RESPONSIVE = /^(sm|md|lg|xl|2xl|min-\[[^\]]+\]|max-\[[^\]]+\]|dark|motion-safe|motion-reduce|print):/;

/** Las firmas que dibuja la union de clases de una expresion `className`. */
export function surfaceKinds(expr: string): SurfaceKind[] {
  const words = new Set(expr.match(/[A-Za-z0-9_\-[\].:/%#=]+/g) ?? []);
  const base = new Set<string>();
  for (const w0 of words) {
    let w = w0;
    let stateOnly = false;
    for (;;) {
      if (STATE.test(w)) {
        stateOnly = true;
        w = w.replace(STATE, '');
        continue;
      }
      if (RESPONSIVE.test(w)) {
        w = w.replace(RESPONSIVE, '');
        continue;
      }
      break;
    }
    if (!stateOnly) base.add(w);
  }
  const has = (re: RegExp) => [...base].some((w) => re.test(w));

  const out: SurfaceKind[] = [];
  const outline =
    has(/^border$/) || has(/^ring-1$/) || has(/^border-(?![btlrxy]-|[btlrxy]$)[a-z]/);
  const fill = has(/^bg-(?!transparent|clip|gradient|none|current)/);
  const radius = has(/^rounded-(md|lg|xl|2xl|3xl|\[)/);
  if (radius && fill) out.push(outline ? 'caja' : 'bloque');
  if (has(/^rounded(-sm|-full)?$/) && has(/^px-/) && (outline || fill)) out.push('pastilla');
  if (base.has('instrument') || base.has('glass') || base.has('glass-strong')) {
    out.push('superficie');
  }
  return out;
}

/** La expresion de un `className=`, entera: de la comilla o llave a su cierre. */
function classExpression(src: string, from: number): string {
  const c = src[from];
  if (c === '"' || c === "'") {
    const end = src.indexOf(c, from + 1);
    return end < 0 ? '' : src.slice(from + 1, end);
  }
  if (c !== '{') return '';
  // Pila de contextos: 'code' dentro de llaves, o la comilla de la cadena en
  // la que se esta. Una plantilla puede abrir codigo con `${`, y ese codigo
  // puede abrir otra plantilla, asi que hace falta pila y no un contador.
  const stack: string[] = ['code'];
  let i = from + 1;
  for (; i < src.length && stack.length > 0; i++) {
    const ch = src[i];
    const top = stack[stack.length - 1];
    if (top === 'code') {
      if (ch === '{') stack.push('code');
      else if (ch === '}') stack.pop();
      else if (ch === '"' || ch === "'" || ch === '`') stack.push(ch);
      continue;
    }
    // Dentro de una cadena.
    if (ch === '\\') {
      i++;
      continue;
    }
    if (top === '`' && ch === '$' && src[i + 1] === '{') {
      stack.push('code');
      i++;
      continue;
    }
    if (ch === top) stack.pop();
  }
  return src.slice(from + 1, i - 1);
}

/** Todo lo que dibuja una caja, bloque, pastilla o superficie en un fuente. */
export function auditSurfaces(source: string): SurfaceFinding[] {
  const src = source.replace(/\r\n/g, '\n');
  const lines = src.split('\n');
  const out: SurfaceFinding[] = [];
  const re = /className=/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const expr = classExpression(src, m.index + m[0].length);
    if (!expr) continue;
    const kinds = surfaceKinds(expr);
    if (kinds.length === 0) continue;
    const line = src.slice(0, m.index).split('\n').length;
    // El motivo puede estar en la linea del className o en las dos de encima.
    const near = [lines[line - 1], lines[line - 2], lines[line - 3]].join('\n');
    const j = /caja-ok:\s*([^\n*}]+)/.exec(near);
    for (const kind of kinds) {
      out.push({
        line,
        kind,
        justified: kind === 'superficie' ? null : j ? j[1].trim() : null,
        text: expr.replace(/\s+/g, ' ').slice(0, 110),
      });
    }
  }
  return out;
}

/** Cajas, bloques y pastillas SIN justificar: lo que la regla prohibe. */
export function unjustifiedBoxes(source: string): SurfaceFinding[] {
  return auditSurfaces(source).filter((f) => f.kind !== 'superficie' && !f.justified);
}
