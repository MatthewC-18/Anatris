// ¿ESTÁ EN EL MODELO LO QUE LA PRUEBA DICE QUE RESALTA?
//
// El panel promete resaltar la estructura evaluada. Un registro de patrones
// contra nombres de malla se degrada en silencio de tres maneras, y las tres
// acaban igual: se pulsa Demostrar y no se enciende nada.
//
//   1. Una reexportación del GLB renombra o pierde una malla. El patrón deja de
//      casar y nadie se entera, porque la app no falla: simplemente no brilla.
//   2. Un patrón demasiado ancho atrapa el homónimo de otra región. Hay
//      'collateral_ligament' en rodilla, codo, muñeca y tobillo: un patrón sin
//      anclar enciende el tobillo durante una prueba de rodilla.
//   3. La estructura cae en una capa que el laboratorio NO MUESTRA. Los nervios
//      y los vasos no pasan por `layerForMaterial`, así que sus mallas quedan
//      etiquetadas 'hidden' y encenderlas no hace nada visible.
//
// Esto las mide todas contra el índice del GLB que se publica, y además
// comprueba la otra mitad del contrato: que ninguna prueba con demo se quede sin
// resaltar nada Y sin decir por qué (`cannotShow`).
//
// Run: npm run audit-structures
import { readFileSync } from 'node:fs';
import {
  CLINICAL_STRUCTURES,
  meshIsStructure,
  type StructureLayer,
} from '../src/lib/clinicalStructures.ts';
import { ALL_TESTS_BY_REGION } from '../src/data/fullContent.ts';

interface Entry {
  meshName: string;
  layer: string;
  side: string;
  hiddenByDefault: boolean;
}
const idx = JSON.parse(readFileSync('public/anatomy-index.json', 'utf8')) as {
  totalMeshes: number;
  entries: Entry[];
};

/** La capa del índice -> la capa del laboratorio. null = no se puede mostrar. */
const LAB_LAYER: Record<string, StructureLayer | null> = {
  muscles: 'muscle',
  bones: 'bone',
  ligaments: 'connective',
  skin: 'skin',
  nerves: null,
  vessels: null,
  organs: null,
  reference: null,
  uncategorized: null,
};

let errors = 0;
let warns = 0;
const err = (m: string) => {
  errors += 1;
  console.log(`  ERROR  ${m}`);
};
const warn = (m: string) => {
  warns += 1;
  console.log(`  aviso  ${m}`);
};

console.log(`===== ESTRUCTURAS CLÍNICAS =====\n${idx.entries.length} mallas en el índice\n`);

const ids = Object.keys(CLINICAL_STRUCTURES);
for (const id of ids) {
  const s = CLINICAL_STRUCTURES[id];
  const hits = idx.entries.filter((e) => meshIsStructure(id, e.meshName));
  const layers = [...new Set(hits.map((h) => h.layer))];
  const hidden = hits.filter((h) => h.hiddenByDefault);
  const sides = [...new Set(hits.map((h) => h.side))].sort();

  if (hits.length === 0) {
    err(`${id}: no casa NINGUNA malla. El resalte sería inerte.`);
    continue;
  }
  if (hits.length !== s.expectMeshes) {
    err(
      `${id}: casa ${hits.length} mallas y declara ${s.expectMeshes}. ` +
        `El GLB cambió o el patrón se ensanchó: ${hits.slice(0, 4).map((h) => h.meshName).join(', ')}`,
    );
  }
  for (const l of layers) {
    const lab = LAB_LAYER[l];
    if (lab == null) {
      err(
        `${id}: tiene mallas en la capa '${l}', que el laboratorio NO muestra ` +
          `(layerForMaterial devuelve null). Encenderlas no se ve.`,
      );
    } else if (lab !== s.layer) {
      err(`${id}: declara layer '${s.layer}' pero sus mallas son '${l}' -> '${lab}'`);
    }
  }
  if (hidden.length) {
    err(
      `${id}: ${hidden.length} de sus mallas son geometría de referencia ` +
        `(hiddenByDefault): ${hidden.slice(0, 3).map((h) => h.meshName).join(', ')}`,
    );
  }
  console.log(
    `  ok     ${id.padEnd(30)} ${String(hits.length).padStart(3)} mallas  ` +
      `${s.layer.padEnd(10)} lados: ${sides.join('/')}`,
  );
}

// --- La otra mitad: ninguna prueba promete sin cumplir ni calla sin explicar.
console.log('\n----- Promesa por prueba -----');
let lit = 0;
let declared = 0;
let silent = 0;
for (const [region, tests] of Object.entries(ALL_TESTS_BY_REGION)) {
  for (const t of tests) {
    const d = t.demo;
    if (!d) continue;
    const sids = d.highlightStructureIds ?? [];
    for (const sid of sids) {
      if (!(sid in CLINICAL_STRUCTURES)) {
        err(`${region}/${t.id}: highlightStructureIds '${sid}' no está en el registro`);
      }
    }
    const lights = sids.length > 0 || d.highlightMuscleId != null;
    if (lights) lit += 1;
    else if (d.cannotShow) declared += 1;
    else {
      silent += 1;
      warn(
        `${region}/${t.id}: no resalta nada y no dice por qué ` +
          `(target: ${t.target}). El panel promete resaltar la estructura evaluada.`,
      );
    }
  }
}
const total = lit + declared + silent;
console.log(`\n  ${lit}/${total} demos resaltan algo`);
console.log(`  ${declared}/${total} declaran lo que no se puede ver`);
console.log(`  ${silent}/${total} callan`);

console.log(`\n===== ${errors} errores, ${warns} avisos =====`);
if (errors > 0) process.exitCode = 1;
