// One-off: report GLB composition (extensions, verts, skins, textures) to plan
// compression. Run: node scripts/inspect-glb-stats.mjs public/foo.glb ...
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

for (const path of process.argv.slice(2)) {
  const doc = await io.read(path);
  const root = doc.getRoot();
  const meshes = root.listMeshes();
  let prims = 0, verts = 0, tris = 0, skinned = 0;
  for (const m of meshes) for (const p of m.listPrimitives()) {
    prims++;
    const pos = p.getAttribute('POSITION');
    if (pos) verts += pos.getCount();
    const idx = p.getIndices();
    if (idx) tris += idx.getCount() / 3;
    if (p.getAttribute('JOINTS_0')) skinned++;
  }
  const exts = root.listExtensionsUsed().map((e) => e.extensionName);
  const tex = root.listTextures();
  let texBytes = 0;
  for (const t of tex) { const im = t.getImage(); if (im) texBytes += im.byteLength; }
  console.log('\n=== ' + path + ' ===');
  console.log('extensions:', exts.length ? exts.join(', ') : '(none)');
  console.log('meshes:', meshes.length, ' primitives:', prims, ' skinnedPrims:', skinned);
  console.log('vertices:', verts.toLocaleString(), ' triangles:', Math.round(tris).toLocaleString());
  console.log('skins:', root.listSkins().length, ' anims:', root.listAnimations().length, ' materials:', root.listMaterials().length);
  console.log('textures:', tex.length, ' textureBytes:', (texBytes / 1048576).toFixed(1) + ' MB');
}
