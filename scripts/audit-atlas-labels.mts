// Prints the names each Explorar region's atlas plate would put in the margins,
// resolved against the REAL model + the app's own visibility rules. The labels
// can't be eyeballed from the agent's preview pane (it never mounts the WebGL
// canvas), so this is how the plate's content gets checked.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-atlas-labels.mts
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import {
  colorForMaterial,
  materialIsAccessoryTissue,
} from '../src/lib/materialColors.ts';
import { parseMeshName } from '../src/lib/parseMeshName.ts';
import { REGIONS, resolveRegionMeshes, resolveRegionFade } from '../src/data/regiones.ts';
import { musclesForRegion } from '../src/data/musclesByRegion.ts';
import { buildMuscleResolution } from '../src/lib/muscleResolver.ts';
import { pickLabelTargets } from '../src/lib/atlasPlate.ts';

const index = JSON.parse(
  readFileSync('C:/Users/Matthew/Documents/Fisio/public/anatomy-index.json', 'utf8'),
);
const byMesh = new Map<string, any>();
for (const e of index.entries) byMesh.set(e.meshName, e);

const buf = readFileSync('C:/Users/Matthew/Documents/Fisio/public/modelo-opt.dec.glb');
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) =>
  ld.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', r, j),
);
const scene = gl.scene as THREE.Group;
scene.updateMatrixWorld(true);

const allMeshes: THREE.Mesh[] = [];
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (m.isMesh) allMeshes.push(m);
});
const allNames = allMeshes.map((m) => m.name);
const LAYERS = new Set(['bones', 'muscles', 'ligaments']);
const box = new THREE.Box3();

for (const id of Object.keys(REGIONS)) {
  const def = REGIONS[id];
  const region = resolveRegionMeshes(def, byMesh.keys());
  const fade = resolveRegionFade(def);

  // AnatomyModel's visibility pass, minus the side filter.
  const visible = allMeshes.filter((m) => {
    const e = byMesh.get(m.name);
    if (!e) return false;
    if (colorForMaterial(e.materialName) === null) return false;
    if (!LAYERS.has(e.layer) || e.hiddenByDefault) return false;
    if (materialIsAccessoryTissue(e.materialName, m.name)) return false;
    const part = parseMeshName(m.name).part;
    if (part === 'origin' || part === 'insertion') return false;
    if (!region.has(m.name)) return false;
    if (fade) {
      box.setFromObject(m);
      if (box.max.y <= fade.min - fade.soft || box.min.y >= fade.max + fade.soft) return false;
    }
    return true;
  });

  const resolution = buildMuscleResolution(musclesForRegion(id), allNames);
  const targets = pickLabelTargets({
    region: id,
    muscles: musclesForRegion(id),
    meshNamesByMuscleId: resolution.meshNamesByMuscleId,
    byMesh,
    visibleMeshes: visible,
  });

  const muscles = targets.filter((t) => t.kind === 'muscle');
  const bones = targets.filter((t) => t.kind === 'bone');
  console.log(`\n=== ${id} (${def.name}) — ${targets.length} etiquetas ===`);
  console.log(`  músculos (${muscles.length}): ${muscles.map((t) => t.text).join(' · ')}`);
  console.log(`  huesos   (${bones.length}): ${bones.map((t) => t.text).join(' · ')}`);
  const paired = targets.filter((t) => t.anchors.length === 2).length;
  console.log(`  con anclaje a ambos lados: ${paired}/${targets.length}`);
}
