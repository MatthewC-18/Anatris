// Compress a GLB with EXT_meshopt_compression (the scheme drei's useGLTF already
// decodes at runtime — see rig-src/modelo-opt.glb). Geometry-only, LOSSLESS layout.
//
// OPTION A — NO position quantization. The movement-lab runtime is fragile in two
// ways that forbid the usual meshopt pipeline:
//   1. Tissue + peel layer (skin/muscle/bone/connective) is classified by MATERIAL
//      NAME (materialColors.ts). The source renders every material near-white so
//      only the NAME differs -> dedup() would merge them and break the layers.
//      => never dedup.
//   2. Region culls that hide the shattered distal hand/foot internals
//      (inDistalRegion skin-cap, inArmBand, inWristCuff, isCorruptedSpike) use
//      meshWorldCenter(mesh), which is NODE-matrix based. quantize() bakes a
//      per-mesh dequant transform that SKINNED meshes ignore, so those centers go
//      wrong and the hidden broken pieces reappear ("una mano destrozada").
//      => never quantize positions; keep the 5 shared skins intact.
//
// So we ONLY reorder (GPU cache locality, updates all attrs+indices consistently)
// and meshopt-encode the raw float32 attributes. Smaller win than quantized
// meshopt, but ZERO geometry/material/skin restructuring -> runtime behaves
// identically to the uncompressed rig.
//
// Usage: node scripts/compress-glb.mjs <input.glb> <output.glb>

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { reorder } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { statSync } from 'node:fs';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/compress-glb.mjs <input.glb> <output.glb>');
  process.exit(1);
}

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
});

const mb = (p) => (statSync(p).size / 1048576).toFixed(1);
const before = mb(input);

const doc = await io.read(input);
const r = doc.getRoot();
const matsBefore = r.listMaterials().length;
const meshesBefore = r.listMeshes().length;
const skinsBefore = r.listSkins().length;

// reorder ONLY — no quantize, no dedup, no prune.
await doc.transform(reorder({ encoder: MeshoptEncoder }));

// meshopt-encode the (still float32) attributes. FILTER method keeps attributes
// un-quantized; the codec's delta+entropy stages still shrink the buffers.
doc
  .createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });

await io.write(output, doc);

const after = mb(output);
console.log(`${input} ${before} MB  ->  ${output} ${after} MB  (${(100 - (after / before) * 100).toFixed(0)}% smaller)`);
console.log(`materials: ${matsBefore} -> ${r.listMaterials().length}  meshes: ${meshesBefore} -> ${r.listMeshes().length}  skins: ${skinsBefore} -> ${r.listSkins().length}  (all three must be unchanged)`);
