// LA TABLA DE GIROS TIENE QUE DEJAR EL RIG SIN UN TRIANGULO AL REVES.
//
// `npm run build-winding-bake` guarda que triangulos del musculo, el conectivo,
// el cartilago y el hueso giran contra sus normales (src/lib/rigWindingBake.ts).
// Una tabla asi solo vale contra el GLB y la cadena de pases con que se hizo.
// Este verificador prepara la escena hasta el mismo punto que RigModel, aplica
// la tabla y vuelve a contar:
//
//   - triangulos que siguen girando contra sus normales despues: CERO
//   - entradas de la tabla que no cuadraron (`stale`) o mallas que faltan: CERO
//   - triangulos al reves que la tabla NO lista: CERO (seria una tabla vieja)
//
// Run: npm run audit-winding-bake

import { trianglesAgainst } from '../src/lib/faceWinding.ts';
import { applyBakedWinding, decodeTriangles } from '../src/lib/rigWindingBake.ts';
import { RIG_WINDING_BAKE } from '../src/data/rigWindingBake.ts';
import { bakeTargets, sceneAtWindingBake } from './build-winding-bake.mts';

const scene = await sceneAtWindingBake();
const targets = bakeTargets(scene);

// Lo que la tabla dice frente a lo que hay ANTES de aplicarla.
const tabla = new Map(RIG_WINDING_BAKE.map((r) => [r.n, new Set(decodeTriangles(r.t))]));
let sinListar = 0;
let antes = 0;
const ejemplos: string[] = [];
for (const m of targets) {
  const contra = trianglesAgainst(m);
  antes += contra.length;
  const listados = tabla.get(m.name);
  for (const t of contra) {
    if (!listados?.has(t)) {
      sinListar++;
      if (ejemplos.length < 8) ejemplos.push(`${m.name} #${t}`);
    }
  }
}

const rep = applyBakedWinding(scene);

let despues = 0;
for (const m of targets) despues += trianglesAgainst(m).length;

console.log(`antes de la tabla: ${antes} triangulos al reves en ${targets.length} mallas revisadas`);
console.log(`tabla: ${rep.flipped} invertidos en ${rep.meshes} mallas; stale ${rep.stale}; faltan ${rep.missing.length}`);
console.log(`al reves y SIN listar: ${sinListar}${ejemplos.length ? ` (p. ej. ${ejemplos.join(', ')})` : ''}`);
console.log(`despues de la tabla: ${despues}`);

const ok = despues === 0 && rep.stale === 0 && rep.missing.length === 0 && sinListar === 0;
console.log(ok ? 'OK' : 'FALLA: regenera con npm run build-winding-bake');
if (!ok) process.exit(1);
