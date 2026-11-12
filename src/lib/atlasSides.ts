// src/lib/atlasSides.ts
//
// QUE LADO TIENE DE VERDAD UN NOMBRE DE MALLA.
//
// La ficha y la etiqueta de hover leian el lado de `byMesh.get(nombre).side`, y
// `byMesh` es un Map por NOMBRE. Z-Anatomy entrega muchas estructuras pares como
// dos mallas con el MISMO nombre, una a cada lado (`Clavicle`, `Capitate_bone`,
// `Calcaneusr_1`...), y un Map solo puede guardar una entrada por nombre: gana
// la primera y la otra se pierde.
//
// Medido sobre public/anatomy-index.json (6.316 entradas, 5.556 nombres):
// 760 nombres aparecen dos veces; 89 son de linea media en las dos y los otros
// 671 llevan una entrada `left` y otra `right` (191 de hueso, 218 de musculo,
// 90 de nervio y 172 de piel). Para esos 671 la interfaz decia un solo lado
// ("Clavicula, izquierdo") mientras el modelo encendia LAS DOS mallas, porque
// el resalte tambien va por nombre (`mesh.name === selectedMeshName`). El rotulo
// contradecia lo que se veia.
//
// El indice si sabe los dos lados: lo que hacia falta era no tirarlo. Aqui se
// guarda, por nombre, el CONJUNTO de lados de todas sus mallas. Se registra una
// vez, cuando llega el indice (lo hace CommandPalette, que esta montada siempre
// y recibe el indice entero), igual que `registerAtlasNames` en formatName.ts.
//
// Sin nada registrado las funciones devuelven null y quien llama cae a lo que
// hacia antes (el lado de la entrada), asi que el orden de montaje no rompe
// nada: solo deja el rotulo como estaba hasta que el indice llega.

import type { AnatomyEntry, Side } from '../types/anatomy';
import type { SideFilter } from '../store/anatomyStore';

/** Which sides of the body a selection covers. */
export interface SideSet {
  left: boolean;
  right: boolean;
  center: boolean;
}

let sidesByName: Map<string, SideSet> | null = null;

/** Build the name -> sides table from the full index (duplicates included). */
export function buildSideTable(entries: Iterable<AnatomyEntry>): Map<string, SideSet> {
  const table = new Map<string, SideSet>();
  for (const e of entries) {
    let s = table.get(e.meshName);
    if (!s) {
      s = { left: false, right: false, center: false };
      table.set(e.meshName, s);
    }
    s[e.side] = true;
  }
  return table;
}

/** Register the atlas index. Call once per loaded index. */
export function registerAtlasSides(entries: Iterable<AnatomyEntry>): void {
  sidesByName = buildSideTable(entries);
}

/**
 * The sides covered by a set of mesh names (a whole muscle, a bone picked from
 * the list, or a single clicked mesh). null when the index is not registered
 * yet or none of the names is known.
 */
export function sidesOfMeshes(
  meshNames: Iterable<string>,
  table: Map<string, SideSet> | null = sidesByName,
): SideSet | null {
  if (!table) return null;
  const out: SideSet = { left: false, right: false, center: false };
  let known = false;
  for (const name of meshNames) {
    const s = table.get(name);
    if (!s) continue;
    known = true;
    if (s.left) out.left = true;
    if (s.right) out.right = true;
    if (s.center) out.center = true;
  }
  return known ? out : null;
}

/**
 * The words the sheet prints for a side set, or null when there is nothing to
 * say (a midline structure).
 *
 * "Lado derecho" y no "derecho": el adjetivo suelto se pegaba a cualquier
 * nombre en masculino ("Clavicula, derecho"; medido, 673 de los 3.782 nombres
 * con lado del atlas empiezan por un sustantivo femenino). Con "lado" delante
 * concuerda siempre.
 *
 * `filter` is the viewer's side filter: with one side hidden, a paired
 * structure is on screen on ONE side only, and that is the side to name.
 */
export function sideLabel(sides: SideSet | null, filter: SideFilter = 'both'): string | null {
  if (!sides) return null;
  let { left, right } = sides;
  if (filter === 'left' && left) right = false;
  if (filter === 'right' && right) left = false;
  if (left && right) return 'Ambos lados';
  if (left) return 'Lado izquierdo';
  if (right) return 'Lado derecho';
  return null;
}

/** Fallback for a single entry, used until the index is registered. */
export function sideSetOfEntry(side: Side): SideSet {
  return { left: side === 'left', right: side === 'right', center: side === 'center' };
}
