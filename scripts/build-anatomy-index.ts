// scripts/build-anatomy-index.ts
//
// Run with:
//   npx tsx --tsconfig tsconfig.scripts.json scripts/build-anatomy-index.ts
// (or `npm run build-anatomy`)
//
// Reads public/modelo-opt.glb through Three.js GLTFLoader — the same loader
// the runtime viewer uses — so that every entry's `meshName` is guaranteed
// to match what `THREE.Mesh.name` returns in the browser.
//
// Why we don't iterate gltf-transform Meshes any more:
//   - Three.js sanitizes node names (drops "." and replaces " " with "_").
//   - Three.js expands multi-primitive Meshes into multiple THREE.Mesh nodes.
//   - Geometry instancing (e.g. ear ossicles left vs right) creates extra
//     scene meshes that share a single glTF Mesh.
// All of the above mean glTF-side names don't line up with runtime names.
// By traversing the same scene Three.js builds, we get a 1:1 mapping by
// construction.
//
// To keep classification accuracy, we still classify against the *canonical*
// name — i.e. the original Z-Anatomy node name preserved in the glTF
// hierarchy ("Femur.r", "Articular facet for malleus.t", etc.) — discovered
// by walking up the ancestor chain from each mesh. Laterality is taken from
// the first ancestor whose name carries a `.r` / `.l` suffix.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';

import type {
  AnatomyEntry,
  AnatomyIndex,
  AnatomyLayer,
  LayerCounts,
  Side,
} from '../src/types/anatomy';

// -------------------------------------------------------------------------- //
// Paths
// -------------------------------------------------------------------------- //

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const INPUT = resolve(projectRoot, 'public', 'modelo-opt.glb');
const OUTPUT = resolve(projectRoot, 'data', 'anatomy-index.json');
// Copy alongside the GLB so the viewer can fetch it from /anatomy-index.json
const OUTPUT_PUBLIC = resolve(projectRoot, 'public', 'anatomy-index.json');

// -------------------------------------------------------------------------- //
// CLASSIFICATION RULES — preserved verbatim from the previous version.
// Order matters: first match wins.
// -------------------------------------------------------------------------- //

// Tier 1: classify by material name (most reliable).
const MATERIAL_TO_LAYER: Record<string, AnatomyLayer> = {
  // Bones / cartilage / teeth
  Cartilage: 'bones',
  Teeth: 'bones',
  'Teeth-roots': 'bones',
  Dentine: 'bones',

  // Ligaments / capsules / bursae
  Ligament: 'ligaments',
  'Articular capsule': 'ligaments',
  Bursa: 'ligaments',

  // Muscles — anatomical
  Tendon: 'muscles',
  Fascia: 'muscles',
  Diaphragm: 'muscles',
  Trapezius: 'muscles',

  // Muscles — functional groupings (Z-Anatomy)
  Abductor: 'muscles',
  Adductor: 'muscles',
  Flexion: 'muscles',
  Extension: 'muscles',
  'Flexion fingers': 'muscles',
  'Flexion hand/foot': 'muscles',
  'Extension fingers': 'muscles',
  'Extension hand/foot': 'muscles',
  'Extensor extremities': 'muscles',
  'Internal rotator': 'muscles',
  'External rotation': 'muscles',
  Biarticular: 'muscles',
  Superficial: 'muscles',
  Levator: 'muscles',
  Depressor: 'muscles',
  'Orbicularis/Constrictor': 'muscles',
  Masticator: 'muscles',
  Phonation: 'muscles',
  Ingestion: 'muscles',
  Movement: 'reference', // movement indicators are didactic, not muscle

  // Muscle insertion points (origin/end)
  'Muscular origin': 'muscles',
  'Origin mastication': 'muscles',
  'End-Mastication': 'muscles',

  // Vessels
  Artery: 'vessels',
  'Pulmonary artery': 'vessels',
  Vein: 'vessels',
  'Pulmonary vein': 'vessels',

  // Nerves / CNS
  Nerve: 'nerves',
  Nucleus: 'nerves',
  'Nucleus (afferent fibers)': 'nerves',
  'Nucleus (efferent fibers)': 'nerves',
  Brain: 'nerves',
  'Brain-Inner': 'nerves',
  'Frontal lobe': 'nerves',
  Cerebellum: 'nerves',
  'Occipital lobe': 'nerves',
  'Parietal lobe': 'nerves',
  'Temporal lobe': 'nerves',
  'Limbic lobe': 'nerves',
  Insula: 'nerves',
  'Interlobar sulci': 'nerves',
  'White matter': 'nerves',
  LCR: 'nerves',

  // Organs / glandular / mucosal / sensory
  Organ: 'organs',
  Gland: 'organs',
  Mucosa: 'organs',
  Gallbladder: 'organs',
  Intestine: 'organs',
  Bronchi: 'organs',
  Ductus: 'organs',
  Peritoneum: 'organs',
  Eye: 'organs',
  Cornea: 'organs',
  Iris: 'organs',
  Fat: 'organs',

  // Skin
  Nail: 'skin',

  // Reference / didactic
  Text: 'reference',
  'Text-2': 'reference',
  Planes: 'reference',
  Directions: 'reference',
  Lines: 'reference',
  Black: 'reference',
};

const MATERIAL_PREFIX_TO_LAYER: Array<{ prefix: string; layer: AnatomyLayer }> = [
  { prefix: 'Bone', layer: 'bones' },
  { prefix: 'Suture', layer: 'bones' },
  { prefix: 'Skin', layer: 'skin' },
  { prefix: 'Lymph', layer: 'vessels' },
  { prefix: 'Lung', layer: 'organs' },
  { prefix: 'Nerve', layer: 'nerves' },
  { prefix: 'Origin-', layer: 'muscles' },
  { prefix: 'End-', layer: 'muscles' },
  { prefix: 'Bronchi', layer: 'organs' },
  { prefix: 'Organ', layer: 'organs' },
];

// Tier 2: keyword in the canonical (Z-Anatomy) name.
const NAME_KEYWORDS: Array<{ pattern: RegExp; layer: AnatomyLayer }> = [
  // Bones
  { pattern: /\bbone\b/i, layer: 'bones' },
  { pattern: /\bcartilage\b/i, layer: 'bones' },
  {
    pattern:
      /\b(vertebra|sternum|rib|clavicle|scapula|humerus|radius|ulna|carpal|metacarpal|phalan|femur|tibia|fibula|patella|tarsal|metatarsal|pelvis|sacrum|coccyx|skull|mandible|maxilla|process)\b/i,
    layer: 'bones',
  },
  { pattern: /\b(suture|tooth|teeth|dentine|enamel)\b/i, layer: 'bones' },
  // Muscles
  { pattern: /\bmuscle\b/i, layer: 'muscles' },
  { pattern: /\btendon\b/i, layer: 'muscles' },
  { pattern: /\bfascia\b/i, layer: 'muscles' },
  { pattern: /\baponeurosis\b/i, layer: 'muscles' },
  // Ligaments
  { pattern: /\bligament\b/i, layer: 'ligaments' },
  { pattern: /articular capsule/i, layer: 'ligaments' },
  { pattern: /\bbursa\b/i, layer: 'ligaments' },
  { pattern: /\bmeniscus\b/i, layer: 'ligaments' },
  { pattern: /interosseous membrane/i, layer: 'ligaments' },
  // Nerves / CNS
  { pattern: /\bnerve\b/i, layer: 'nerves' },
  { pattern: /\bganglion\b/i, layer: 'nerves' },
  { pattern: /\bplexus\b/i, layer: 'nerves' },
  { pattern: /\bsulc(us|i)\b/i, layer: 'nerves' },
  {
    pattern:
      /\b(cortex|cerebellum|cerebrum|medulla|pons|thalamus|hypothalamus|hippocampus|amygdala|insula)\b/i,
    layer: 'nerves',
  },
  { pattern: /\b(brain|spinal cord)\b/i, layer: 'nerves' },
  { pattern: /\blobe\b/i, layer: 'nerves' },
  // Vessels
  { pattern: /\bartery\b/i, layer: 'vessels' },
  { pattern: /\bvein\b/i, layer: 'vessels' },
  { pattern: /\baorta\b/i, layer: 'vessels' },
  { pattern: /\blymph/i, layer: 'vessels' },
  { pattern: /\bnode(s)?\b/i, layer: 'vessels' },
  // Organs
  {
    pattern:
      /\b(lung|liver|kidney|spleen|pancreas|stomach|intestine|colon|bladder|heart|thymus)\b/i,
    layer: 'organs',
  },
  { pattern: /\b(eye|eyeball|retina|lens|cornea|iris)\b/i, layer: 'organs' },
  { pattern: /\b(pharynx|larynx|trachea|bronchi|esophagus)\b/i, layer: 'organs' },
  { pattern: /\b(uterus|ovary|testis|prostate|ductus deferens)\b/i, layer: 'organs' },
  // Skin
  { pattern: /\bskin\b/i, layer: 'skin' },
  { pattern: /\bnail\b/i, layer: 'skin' },
  { pattern: /\b(hair|eyelash|eyebrow)\b/i, layer: 'skin' },
  // Reference
  { pattern: /\b(plane|axis|direction|movement|circumduction)\b/i, layer: 'reference' },
  { pattern: /^how to/i, layer: 'reference' },
  { pattern: /\.g$/i, layer: 'reference' },
  { pattern: /\.t$/i, layer: 'reference' },
];

// Tier 3: classify by canonical-name suffix.
const SUFFIX_TO_LAYER: Array<{ suffix: string; layer: AnatomyLayer }> = [
  { suffix: '.t', layer: 'reference' },
  { suffix: '.g', layer: 'reference' },
  { suffix: '.e', layer: 'muscles' },
  { suffix: '.o', layer: 'muscles' },
];

const HIDDEN_BY_DEFAULT_KEYWORDS = [
  /^how to/i,
  /\bplane\b/i,
  /\bmovement\b/i,
  /^text/i,
  /\bdirections?\b/i,
  /\.t$/i,
  /\.g$/i,
];

const HIDDEN_BY_DEFAULT_MATERIALS = new Set([
  'Text',
  'Text-2',
  'Planes',
  'Directions',
  'Lines',
  'Movement',
  'Black',
]);

// -------------------------------------------------------------------------- //
// CLASSIFIERS
// -------------------------------------------------------------------------- //

function classifyLayer(canonicalName: string, materialName: string): AnatomyLayer {
  if (materialName in MATERIAL_TO_LAYER) return MATERIAL_TO_LAYER[materialName];
  for (const { prefix, layer } of MATERIAL_PREFIX_TO_LAYER) {
    if (materialName.startsWith(prefix)) return layer;
  }
  for (const { pattern, layer } of NAME_KEYWORDS) {
    if (pattern.test(canonicalName)) return layer;
  }
  for (const { suffix, layer } of SUFFIX_TO_LAYER) {
    if (canonicalName.toLowerCase().endsWith(suffix)) return layer;
  }
  return 'uncategorized';
}

/**
 * Classify laterality by the mesh's world-space X position.
 *
 * The Z-Anatomy `.r` / `.l` suffixes are lost when Three.js sanitizes node
 * names (every dot is stripped), so we can't read laterality from names.
 * Instead we use geometry: the model is symmetric about the X axis, centered
 * on the origin. Verified against bilateral bone pairs in the browser:
 *   Clavicle  +0.08 / -0.08    Femur  +0.09 / -0.09
 *   Humerus   +0.20 / -0.20    Radius +0.26 / -0.26
 * Midline structures (sternum, vertebrae) sit at |x| < threshold.
 *
 * Convention (to be verified visually): +X = body's LEFT, -X = body's RIGHT,
 * matching standard anatomical orientation when viewing the model from front.
 * If selection shows the wrong side, swap 'left' and 'right' below.
 */
const SIDE_X_THRESHOLD = 0.02;

function classifySideFromX(worldX: number): Side {
  if (worldX > SIDE_X_THRESHOLD) return 'left';
  if (worldX < -SIDE_X_THRESHOLD) return 'right';
  return 'center';
}

function isHiddenByDefault(canonicalName: string, materialName: string): boolean {
  if (HIDDEN_BY_DEFAULT_MATERIALS.has(materialName)) return true;
  return HIDDEN_BY_DEFAULT_KEYWORDS.some(
    (re) => re.test(canonicalName) || re.test(materialName),
  );
}

// -------------------------------------------------------------------------- //
// AncestorChain helpers
// -------------------------------------------------------------------------- //

/**
 * Return the names of all ancestors of `obj`, closest first, root last.
 * Empty / unnamed ancestors are skipped.
 */
function collectAncestorNames(obj: THREE.Object3D): string[] {
  const names: string[] = [];
  let cur: THREE.Object3D | null = obj.parent;
  while (cur) {
    if (cur.name) names.push(cur.name);
    cur = cur.parent;
  }
  return names;
}

/**
 * Pick the most useful "canonical name" for a mesh: the first ancestor (or
 * the mesh itself) whose name still contains a dot — i.e., that still looks
 * like a Z-Anatomy identifier with its `.r/.l/.t/.g/.j/.i/.s/.st/.e/.o`
 * suffix intact. If nothing in the chain has a dot, fall back to the closest
 * non-empty name (mesh first, then ancestors).
 *
 * Note: Three.js sanitizes mesh.name itself (drops dots), but parent Object3D
 * nodes — which correspond to glTF Nodes that originally had no mesh, only
 * children — usually keep their names verbatim because they're not promoted
 * to Mesh and don't go through the same sanitization. The diagnostic showed
 * 6678 of 9267 glTF nodes still contain a dot, which is what we exploit here.
 */
function pickCanonicalName(mesh: THREE.Mesh, ancestorNames: string[]): {
  canonicalName: string;
  parentNodeName: string | undefined;
} {
  const ownName = mesh.name || '';
  const chain = [ownName, ...ancestorNames].filter(Boolean);

  // Best: first name in the chain with a dot
  const withDot = chain.find((n) => n.includes('.'));
  if (withDot) {
    return {
      canonicalName: withDot,
      parentNodeName: ancestorNames[0],
    };
  }
  // Fallback: whatever name is closest and non-empty
  return {
    canonicalName: chain[0] ?? '(unnamed)',
    parentNodeName: ancestorNames[0],
  };
}

/**
 * Return the name of the material at the first slot. Materials with multiple
 * slots are very rare on individual primitives in this model.
 */
function getMaterialName(mesh: THREE.Mesh): string {
  const mat = mesh.material;
  if (!mat) return '(none)';
  if (Array.isArray(mat)) return mat[0]?.name || '(none)';
  return mat.name || '(none)';
}

// -------------------------------------------------------------------------- //
// MAIN
// -------------------------------------------------------------------------- //

async function main(): Promise<void> {
  if (!existsSync(INPUT)) {
    throw new Error(`Cannot find GLB at ${INPUT}`);
  }

  console.log(`Reading ${INPUT} through Three.js GLTFLoader...`);

  await MeshoptDecoder.ready;

  const glbBuffer = readFileSync(INPUT);
  const arrayBuffer = glbBuffer.buffer.slice(
    glbBuffer.byteOffset,
    glbBuffer.byteOffset + glbBuffer.byteLength,
  );

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const gltf = await new Promise<{ scene: THREE.Group }>((resolveP, rejectP) => {
    loader.parse(
      arrayBuffer,
      '',
      (result) => resolveP(result as { scene: THREE.Group }),
      (err) => rejectP(err),
    );
  });

  const scene = gltf.scene;

  // Collect every mesh in the same traversal order the runtime viewer uses.
  const meshes: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh);
  });

  console.log(`Found ${meshes.length} meshes in the Three.js scene.`);

  const entries: AnatomyEntry[] = [];
  const counts: LayerCounts = {
    bones: 0,
    muscles: 0,
    ligaments: 0,
    nerves: 0,
    vessels: 0,
    organs: 0,
    skin: 0,
    reference: 0,
    uncategorized: 0,
  };

  // Track duplicate runtime mesh names — should be the same number the
  // diagnostic reported (~760 dups).
  const seenMeshNames = new Map<string, number>();
// Ensure world matrices are computed so mesh.matrixWorld is valid; otherwise
  // every position reads as the origin. parse() doesn't update them for us.
  scene.updateMatrixWorld(true);
  const tmpVec = new THREE.Vector3();
  for (const mesh of meshes) {
    const runtimeName = mesh.name || '(unnamed)';
    const ancestorNames = collectAncestorNames(mesh);
    const { canonicalName, parentNodeName } = pickCanonicalName(mesh, ancestorNames);
    const materialName = getMaterialName(mesh);

    const layer = classifyLayer(canonicalName, materialName);
    mesh.getWorldPosition(tmpVec);
    const side = classifySideFromX(tmpVec.x);
    const hidden = isHiddenByDefault(canonicalName, materialName);

    entries.push({
      meshName: runtimeName,
      canonicalName,
      parentNodeName,
      materialName,
      layer,
      side,
      hiddenByDefault: hidden,
    });
    counts[layer]++;
    seenMeshNames.set(runtimeName, (seenMeshNames.get(runtimeName) ?? 0) + 1);
  }

  // Sort by layer then canonical name for readability.
  entries.sort((a, b) => {
    if (a.layer !== b.layer) return a.layer.localeCompare(b.layer);
    return a.canonicalName.localeCompare(b.canonicalName);
  });

  const index: AnatomyIndex = {
    generatedAt: new Date().toISOString(),
    totalMeshes: entries.length,
    entriesByLayer: counts,
    entries,
  };

  // Write to both data/ (source of truth) and public/ (served at runtime).
  mkdirSync(dirname(OUTPUT), { recursive: true });
  mkdirSync(dirname(OUTPUT_PUBLIC), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(index, null, 2));
  writeFileSync(OUTPUT_PUBLIC, JSON.stringify(index)); // minified in public

  // Reporting
  console.log(`\n✓ Wrote ${OUTPUT}`);
  console.log(`✓ Wrote ${OUTPUT_PUBLIC}`);
  console.log(`  Total meshes: ${index.totalMeshes}`);
  console.log('  By layer:');
  for (const [layer, count] of Object.entries(counts) as Array<[AnatomyLayer, number]>) {
    const pct = ((count / index.totalMeshes) * 100).toFixed(1);
    console.log(`    ${layer.padEnd(15)} ${String(count).padStart(5)} (${pct}%)`);
  }

  const sideCounts: Record<Side, number> = { right: 0, left: 0, center: 0 };
  for (const e of entries) sideCounts[e.side]++;
  console.log('  By side:');
  for (const [side, count] of Object.entries(sideCounts)) {
    console.log(`    ${side.padEnd(7)} ${String(count).padStart(5)}`);
  }

  const dupCount = Array.from(seenMeshNames.values()).filter((n) => n > 1).length;
  console.log(`  Runtime-name duplicates: ${dupCount} (these are bilateral instances)`);

  // Warn on uncategorized
  const uncatPct = (counts.uncategorized / index.totalMeshes) * 100;
  if (uncatPct > 10) {
    console.warn(`\n⚠  ${uncatPct.toFixed(1)}% uncategorized — consider adding more rules.`);
    console.warn('   Sample uncategorized entries (canonicalName / material):');
    entries
      .filter((e) => e.layer === 'uncategorized')
      .slice(0, 20)
      .forEach((e) =>
        console.warn(`     ${e.canonicalName}  (material: ${e.materialName})`),
      );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});