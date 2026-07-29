// Decimate (reduce triangle count) a GLB, then re-encode with meshopt.
// Z-Anatomy models are wildly over-tessellated (millions of triangles) for a
// physio teaching tool; halving the triangles cuts download + parse + GPU load.
//
// weld() merges coincident vertices (simplify needs a connected mesh), then
// simplify() runs the meshoptimizer simplifier per primitive. Per-primitive means
// tiny meshes barely change while dense ones shrink; lockBorder keeps mesh-patch
// seams from pulling apart (no cracks in the skin envelope). NO dedup, NO material
// changes — the runtime classifies tissue by MATERIAL NAME.
//
// Skinned rig: pass `--no-quantize` so positions stay float32 and the 5 shared
// skins survive (see compress-glb.mjs — quantize breaks node-space region culls).
// Static model (Explorar): quantize is safe and smaller.
//
// Usage: node scripts/decimate-glb.mjs <in.glb> <out.glb> <ratio> [--no-quantize]

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { weld, simplify, reorder, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import { statSync } from 'node:fs';

const [input, output, ratioArg, ...flags] = process.argv.slice(2);
if (!input || !output || !ratioArg) {
  console.error('Usage: node scripts/decimate-glb.mjs <in.glb> <out.glb> <ratio> [--no-quantize]');
  process.exit(1);
}
const ratio = parseFloat(ratioArg);
const noQuantize = flags.includes('--no-quantize');

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
});

const mb = (p) => (statSync(p).size / 1048576).toFixed(1);
const triCount = (doc) => {
  let t = 0;
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives()) {
      const idx = p.getIndices();
      const pos = p.getAttribute('POSITION');
      t += idx ? idx.getCount() / 3 : pos ? pos.getCount() / 3 : 0;
    }
  return Math.round(t);
};

const before = mb(input);
const doc = await io.read(input);
const r = doc.getRoot();
const m0 = r.listMeshes().length, mat0 = r.listMaterials().length, sk0 = r.listSkins().length, tri0 = triCount(doc);

await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.005, lockBorder: true }),
  reorder({ encoder: MeshoptEncoder }),
  // Static (non-skinned) models can be quantized safely — the dequant transform is
  // baked into the NODE, which non-skinned meshes honor. Skinned rig skips this
  // (positions must stay float32 so node-space region culls keep working).
  ...(noQuantize
    ? []
    : [quantize({ quantizePosition: 12, quantizeNormal: 10, quantizeTexcoord: 11 })]),
);

const ext = doc
  .createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({
    method: noQuantize
      ? EXTMeshoptCompression.EncoderMethod.FILTER
      : EXTMeshoptCompression.EncoderMethod.QUANTIZE,
  });
void ext;

await io.write(output, doc);

const after = mb(output);
const tri1 = triCount(doc);
console.log(`${input} ${before} MB / ${tri0.toLocaleString()} tris`);
console.log(`  -> ${output} ${after} MB / ${tri1.toLocaleString()} tris  (${(100 - (after / before) * 100).toFixed(0)}% smaller, ${(100 - (tri1 / tri0) * 100).toFixed(0)}% fewer tris)`);
console.log(`meshes: ${m0} -> ${r.listMeshes().length}   materials: ${mat0} -> ${r.listMaterials().length}   skins: ${sk0} -> ${r.listSkins().length}  (all must be unchanged)`);
