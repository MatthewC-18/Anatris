// LA PANTALLA DE EVIDENCIA SEPARA ESTUDIOS DE LIBROS, Y CUENTA TODOS LOS LIBROS.
//
// Pedido del agente de Aprender (tanda 2a): un test que citaba un LIBRO salia
// en "Estudios" (Magee en la cadera), y los libros que cita la ruta de Aprender
// no se contaban (el tobillo perdia a Magee). Este test lo fija con el hombro,
// que va en el paquete.

import { describe, it, expect } from 'vitest';
import { evidenceForRegion } from '../evidence';
import { REFERENCES, isJournalRef } from '../../data/references';
import { SHOULDER_TRACK } from '../../data/shoulderPhases';

/** Todas las referencias citadas bajo un arbol de datos (`cite` / `rangeCite`). */
function citedRefs(node: unknown, out = new Set<string>()): Set<string> {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const x of node) citedRefs(x, out);
    return out;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if ((k === 'cite' || k === 'rangeCite') && Array.isArray(v)) {
      for (const c of v) if (c && typeof c === 'object' && 'ref' in c) out.add(String((c as { ref: string }).ref));
    } else citedRefs(v, out);
  }
  return out;
}

describe('evidencia del hombro', () => {
  const ev = evidenceForRegion('shoulder');

  it('en "Estudios" solo hay articulos de revista', () => {
    expect(ev.studies.length).toBeGreaterThan(0);
    for (const s of ev.studies) expect(isJournalRef(s.ref), s.ref.title).toBe(true);
  });

  it('en "Libros" solo hay libros', () => {
    for (const b of ev.books) expect(isJournalRef(b.ref), b.ref.title).toBe(false);
  });

  it('cuenta los libros que cita la ruta de Aprender', () => {
    const libros = new Set(ev.books.map((b) => b.ref.id));
    const enRuta = [...citedRefs(SHOULDER_TRACK)].filter((id) => REFERENCES[id] && !isJournalRef(REFERENCES[id]));
    expect(enRuta.length).toBeGreaterThan(0);
    for (const id of enRuta) expect(libros.has(id), id).toBe(true);
  });
});

describe('una region de pago sin descargar', () => {
  it('no hereda los libros de la ruta del hombro', () => {
    // trackForRegion cae a la del hombro cuando la de pago no ha llegado.
    const ev = evidenceForRegion('ankle');
    const delHombro = [...citedRefs(SHOULDER_TRACK)].filter(
      (id) => REFERENCES[id] && !isJournalRef(REFERENCES[id]),
    );
    const cuenta = new Map(ev.books.map((b) => [b.ref.id, b.citeCount]));
    // Si alguno aparece, no puede ser por la ruta del hombro: con el tobillo sin
    // descargar, su ROM y sus fichas tampoco estan, asi que no hay libros.
    for (const id of delHombro) expect(cuenta.get(id) ?? 0).toBe(0);
  });
});
