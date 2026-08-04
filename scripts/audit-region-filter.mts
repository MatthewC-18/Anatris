// Audits what each Explorar region ACTUALLY shows.
//
// Replicates AnatomyModel's visibility gate (layer on, paintable material,
// hiddenByDefault, origin/insertion markers hidden) on top of
// resolveRegionMeshes, then prints the visible structures grouped by layer so
// leaks ("why is a foot bone in the hip?") are visible as text.
//
// Usage:  npx tsx scripts/audit-region-filter.mts [regionId] [--all]
import { readFileSync } from 'node:fs';
import { REGIONS, resolveRegionMeshes } from '../src/data/regiones.ts';
import { colorForMaterial, materialIsAccessoryTissue } from '../src/lib/materialColors.ts';
import { parseMeshName } from '../src/lib/parseMeshName.ts';

const index = JSON.parse(
  readFileSync('C:/Users/Matthew/Documents/Fisio/public/anatomy-index.json', 'utf8'),
);
const entries: any[] = index.entries;
const DEFAULT_LAYERS = new Set(['bones', 'muscles', 'ligaments']);

const byMesh = new Map<string, any>();
for (const e of entries) byMesh.set(e.meshName, e);

const arg = process.argv[2];
const ids = arg && REGIONS[arg] ? [arg] : Object.keys(REGIONS);

for (const id of ids) {
  const def = REGIONS[id];
  const names = resolveRegionMeshes(def, byMesh.keys());
  const groups = new Map<string, Map<string, number>>();
  let visible = 0;
  for (const name of names) {
    const e = byMesh.get(name);
    if (!e) continue;
    if (colorForMaterial(e.materialName) === null) continue;
    if (!DEFAULT_LAYERS.has(e.layer)) continue;
    if (e.hiddenByDefault) continue;
    const part = parseMeshName(name).part;
    if (part === 'origin' || part === 'insertion') continue;
    if (materialIsAccessoryTissue(e.materialName, name)) continue;
    visible++;
    // Collapse to a canonical-ish structure label so the list is readable.
    const label = name
      .replace(/[lr]?$/, '')
      .replace(/t_\d+_instance_\d+$/, '')
      .replace(/\.\d+$/, '')
      .replace(/_\d+$/, '')
      .replace(/e\d+[lr]?$/, '');
    const g = groups.get(e.layer) ?? new Map<string, number>();
    g.set(label, (g.get(label) ?? 0) + 1);
    groups.set(e.layer, g);
  }
  console.log(`\n=== ${id} (${def.name}) — ${visible} meshes visible by default ===`);
  for (const layer of ['bones', 'muscles', 'ligaments']) {
    const g = groups.get(layer);
    if (!g) continue;
    const list = [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    console.log(`\n  -- ${layer} (${list.length} structures) --`);
    for (const [label, n] of list) console.log(`     ${String(n).padStart(3)}  ${label}`);
  }
}
