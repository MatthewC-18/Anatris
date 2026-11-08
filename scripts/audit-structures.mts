// ¿ESTÁ EN EL MODELO LO QUE LA PRUEBA DICE QUE RESALTA?
//
// El panel promete resaltar la estructura evaluada. Un registro de patrones
// contra nombres de malla se degrada en silencio de cuatro maneras, y las
// cuatro acaban igual: se pulsa Demostrar y no se enciende nada.
//
//   1. Una reexportación del GLB renombra o pierde una malla. El patrón deja de
//      casar y nadie se entera, porque la app no falla: simplemente no brilla.
//   2. Un patrón demasiado ancho atrapa el homónimo de otra región. Hay
//      'collateral_ligament' en rodilla, codo, muñeca y tobillo: un patrón sin
//      anclar enciende el tobillo durante una prueba de rodilla.
//   3. La estructura cae en una capa que el laboratorio NO MUESTRA. Los nervios,
//      los vasos, las bolsas serosas y las fascias no pasan por
//      `layerForMaterial`, así que quedan en capa nula y encenderlas no hace
//      nada visible.
//   4. La malla existe, pero no en el lado que el demo posa.
//
// Y UNA QUINTA, LA QUE DE VERDAD PASÓ: escribir el registro contra el modelo
// equivocado. `public/anatomy-index.json` describe el modelo de EXPLORAR (6316
// mallas). El laboratorio carga `public/cuerpo-rig.opt.glb` (2659). Son
// conjuntos distintos: el rig no tiene cápsula glenohumeral, ni labrum, ni
// cruzados, ni menisco lateral. Un registro entero escrito contra el índice
// pasaba esta auditoría y resolvía a CERO mallas en ejecución. Por eso aquí ya
// no se lee el índice: la única fuente es el GLB del laboratorio, vía
// `scripts/lib/rigInventory.mts`.
//
// Run: npm run audit-structures
import {
  CLINICAL_STRUCTURES,
  meshIsStructure,
  type StructureLayer,
} from '../src/lib/clinicalStructures.ts';
import { ALL_TESTS_BY_REGION } from '../src/data/fullContent.ts';
import { rigSideFor } from '../src/lib/boneMap.ts';
import { rigInventory } from './lib/rigInventory.mts';

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

const inv = await rigInventory();
console.log(
  `===== ESTRUCTURAS CLÍNICAS =====\n` +
    `${inv.meshes.length} mallas en el rig que carga el laboratorio\n`,
);

const ids = Object.keys(CLINICAL_STRUCTURES);
for (const id of ids) {
  const s = CLINICAL_STRUCTURES[id];
  const hits = inv.meshes.filter((m) => meshIsStructure(id, m.name));

  if (hits.length === 0) {
    err(
      `${id}: no casa NINGUNA malla del rig. El resalte sería inerte. ` +
        `(¿se escribió contra el índice de Explorar?)`,
    );
    continue;
  }
  if (hits.length !== s.expectMeshes) {
    err(
      `${id}: casa ${hits.length} mallas y declara ${s.expectMeshes}. ` +
        `El GLB cambió o el patrón se ensanchó: ${hits.slice(0, 4).map((h) => h.name).join(', ')}`,
    );
  }

  // La capa la decide el material, y nada más.
  const layers = [...new Set(hits.map((h) => h.layer))];
  const nul = hits.filter((h) => h.layer == null);
  if (nul.length) {
    err(
      `${id}: ${nul.length} de sus mallas están en capa nula ` +
        `(material '${nul[0].material}'): el laboratorio no las muestra nunca. ` +
        `Encenderlas no se ve.`,
    );
  }
  for (const l of layers) {
    if (l != null && l !== s.layer) {
      err(
        `${id}: declara layer '${s.layer}' pero tiene mallas en '${l}' ` +
          `(material '${hits.find((h) => h.layer === l)!.material}')`,
      );
    }
  }

  // Y el lado lo decide la geometría, igual que RigOverlays.
  const n = { left: 0, right: 0, center: 0 };
  for (const h of hits) n[h.side] += 1;
  if ((n.left === 0 && n.center === 0) || (n.right === 0 && n.center === 0)) {
    err(
      `${id}: resuelve izq ${n.left} / der ${n.right} / centro ${n.center}: ` +
        `un demo del lado vacío no encendería nada`,
    );
  } else {
    console.log(
      `  ok     ${id.padEnd(32)} ${String(hits.length).padStart(3)} mallas  ` +
        `${s.layer.padEnd(10)} izq ${n.left} der ${n.right} centro ${n.center}`,
    );
  }
}

// --- La otra mitad: ninguna prueba promete sin cumplir ni calla sin explicar.
console.log('\n----- Promesa por prueba -----');
const sideMeshCount = (sid: string, want: 'left' | 'right'): number => {
  let n = 0;
  for (const m of inv.meshes) {
    if (!meshIsStructure(sid, m.name)) continue;
    if (m.side === want || m.side === 'center') n += 1;
  }
  return n;
};

let lit = 0;
let declared = 0;
let silent = 0;
let inert = 0;
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
    if (sids.length) {
      const want = rigSideFor((d.side ?? 'R') as 'R' | 'L') === 'R' ? 'right' : 'left';
      let n = 0;
      for (const sid of sids) n += sideMeshCount(sid, want);
      if (n === 0) {
        inert += 1;
        err(`${region}/${t.id}: sus estructuras no tienen ninguna malla en el lado posado`);
      }
    }
    const lights = sids.length > 0 || d.highlightMuscleId != null;
    if (lights) lit += 1;
    else if (d.cannotShow) declared += 1;
    else {
      silent += 1;
      err(
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
console.log(`  ${inert === 0 ? 'ninguna' : inert} con estructuras que resuelven a cero en su lado`);

console.log(`\n===== ${errors} errores, ${warns} avisos =====`);
if (errors > 0) process.exitCode = 1;
