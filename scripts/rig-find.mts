// ¿QUÉ TIENE EL RIG, DE VERDAD?
//
// La única manera honesta de decidir qué puede resaltar el laboratorio es
// preguntárselo al GLB que el laboratorio carga. No al índice de Explorar: son
// modelos distintos (6316 mallas contra 2659) y escribir contra el índice ya
// produjo un registro entero de estructuras que resolvía a cero.
//
// Uso:
//   npm run rig-find -- <patrón>              busca por nombre (regex, sin mayúsculas)
//   npm run rig-find -- <patrón> --mat        busca por nombre de MATERIAL
//   npm run rig-find -- --layer connective    lista una capa de ejecución
//   npm run rig-find -- --materials           la tabla material -> capa
//
// Las tres columnas que importan: el material (que es lo único que decide la
// capa), la capa de ejecución (null = el laboratorio no la muestra nunca) y el
// lado por geometría (que es como lo decide RigOverlays).
import { rigInventory } from './lib/rigInventory.mts';

const argv = process.argv.slice(2);
const flag = (f: string) => argv.includes(f);
const layerAt = argv.indexOf('--layer');
const layerArg = layerAt >= 0 ? argv[layerAt + 1] : undefined;
const pattern = argv.find((a, i) => !a.startsWith('--') && !(layerAt >= 0 && i === layerAt + 1));

const inv = await rigInventory();
console.log(`${inv.path}\n${inv.meshes.length} mallas\n`);

if (flag('--materials')) {
  const byMat = new Map<string, { layer: string; n: number }>();
  for (const m of inv.meshes) {
    const e = byMat.get(m.material) ?? { layer: String(m.layer), n: 0 };
    e.n += 1;
    byMat.set(m.material, e);
  }
  console.log('material                      capa          mallas');
  for (const [mat, e] of [...byMat].sort()) {
    console.log(`  ${mat.padEnd(28)} ${e.layer.padEnd(12)} ${String(e.n).padStart(5)}`);
  }
  process.exit(0);
}

let hits = inv.meshes;
if (flag('--layer')) hits = hits.filter((m) => String(m.layer) === layerArg);
if (pattern) {
  const rx = new RegExp(pattern, 'i');
  hits = hits.filter((m) => rx.test(flag('--mat') ? m.material : m.name));
}
hits = [...hits].sort((a, b) => a.name.localeCompare(b.name));

console.log(`${hits.length} coincidencias\n`);
console.log('malla'.padEnd(60) + 'material'.padEnd(20) + 'capa'.padEnd(12) + 'lado    altura');
for (const h of hits) {
  console.log(
    `  ${h.name.padEnd(58)}${h.material.padEnd(20)}${String(h.layer).padEnd(12)}` +
      `${h.side.padEnd(8)}y=${h.y}`,
  );
}
