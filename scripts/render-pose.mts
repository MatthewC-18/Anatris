// Rasterise the rig POSED at a clinical angle, straight from node.
//
// render-region.mts only ever shows the rest pose, so "the flexion looks wrong"
// could not be checked from here -- only measured, and a movement can measure
// perfectly and still look broken (an arm that reaches 180 deg by twisting into
// place is exactly that). This poses the rig through boneMap, the same chain the
// app runs, and draws it.
//
// Run: MOVE=glenohumeral-flexion DEG=90 VIEW=side OUT=x.png \
//      npx tsx --tsconfig tsconfig.scripts.json scripts/render-pose.mts
//
//   MOVE   movementId from boneMap (default glenohumeral-abduction)
//   DEG    clinical angle, or a comma list for a contact sheet (0,45,90,135,180)
//   SIDE   R (default) | L
//   VIEW   front (default) | side
//   LAYERS what to draw: all (default) | bone | muscle  -- `bone` answers
//          "do the bones cross each other?", which skin and muscle hide.
//   RAW    off (default) | on -- `on` skips the runtime's wrap/carry/aim, to see
//          what the chain alone does.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { colorForMaterialMesh, layerForMaterial, materialIsSkin } from '../src/lib/materialColors.ts';
import { applyMirrorRepair } from './lib/mirrorRepair.mts';
import { pick, rasterize, writePng, type View } from './lib/raster.mts';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, type Side } from './lib/rigPose.mts';

const MOVE = process.env.MOVE ?? 'glenohumeral-abduction';
const DEGS = (process.env.DEG ?? '90').split(',').map(Number);
const SIDE = (process.env.SIDE ?? 'R') as Side;
const VIEW = (process.env.VIEW ?? 'front') as View;
const LAYERS = (process.env.LAYERS ?? 'all') as 'all' | 'bone' | 'muscle';
const RAW = process.env.RAW === 'on';
const OUT = process.env.OUT ?? 'pose.png';
const BOX = (process.env.BOX ?? '-0.75,0.75,0.75,1.85').split(',').map(Number) as
  [number, number, number, number];
const W = Number(process.env.W ?? 520);

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group;
scene.updateMatrixWorld(true);
if (process.env.REPAIR !== 'off') applyMirrorRepair(scene);

const matNameOf = (m: THREE.Mesh) => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as THREE.Material | undefined)?.name ?? '';
};
const inDistalRegion = (c: THREE.Vector3) =>
  (c.y > 0.6 && c.y < 0.86 && Math.abs(c.x) > 0.18) || c.y < 0.12;

const poser = createRigPoser(scene, MOVE, SIDE, !RAW);

/** Skinned world positions + normals, i.e. what the GPU would draw. */
function posedVertices(m: THREE.Mesh) {
  const g = m.geometry;
  const pos = g.getAttribute('position');
  const nrm = g.getAttribute('normal');
  if (!pos) return null;
  const sk = m as THREE.SkinnedMesh;
  const skinned = !!sk.isSkinnedMesh;
  if (skinned) sk.skeleton.update();
  const positions: THREE.Vector3[] = [];
  const normals: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  const nrmMat = new THREE.Matrix3().getNormalMatrix(m.matrixWorld);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (skinned) sk.applyBoneTransform(i, v);
    m.localToWorld(v);
    positions.push(v.clone());
    if (nrm) {
      // Skinning bends normals too, but the bone transform for a normal needs the
      // inverse-transpose of the skinning matrix, which three does not expose per
      // vertex. The mesh-level normal matrix is close enough to tell a lit surface
      // from an unlit one, which is all the shading here is for.
      v.fromBufferAttribute(nrm, i).applyMatrix3(nrmMat).normalize();
      normals.push(v.clone());
    } else normals.push(new THREE.Vector3(0, 0, 1));
  }
  return { positions, normals };
}

const wantLayer = (layer: string) =>
  LAYERS === 'all' ? true
  : LAYERS === 'bone' ? layer === 'bone'
  : layer === 'muscle' || layer === 'connective' || layer === 'bone';

const tiles: { buffer: Uint8Array; width: number; height: number }[] = [];
for (const deg of DEGS) {
  poser.pose(deg);
  const r = rasterize(scene, {
    view: VIEW,
    box: BOX,
    width: W,
    include: (m) =>
      !/g0\d\d$/.test(m.name) && !/_system/i.test(m.name) && !/^General[_ ]terms$/i.test(m.name),
    color: (m) => {
      const mat = matNameOf(m);
      const layer = layerForMaterial(mat);
      if (!layer || !wantLayer(layer)) return null;
      const g = m.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
      if (inDistalRegion(c) && !materialIsSkin(mat)) return null;
      if (layer === 'skin' && LAYERS !== 'all') return null;
      return colorForMaterialMesh(mat, m.name) ?? 0xbfae9a;
    },
    vertices: posedVertices,
  });
  tiles.push({ buffer: r.buffer, width: r.width, height: r.height });
  console.log(`  ${MOVE} ${deg} deg -> ${r.drawn} triangles`);
  if (DEGS.length === 1 && process.env.PICK) pick(process.env.PICK, r.owners, r.width);
}

// Stitch the angles side by side into one contact sheet, with a hairline between
// tiles so the frames read as separate poses.
const H = tiles[0].height;
const TOTAL = tiles.reduce((a, t) => a + t.width, 0) + (tiles.length - 1);
const sheet = new Uint8Array(TOTAL * H * 3);
let xoff = 0;
for (let t = 0; t < tiles.length; t++) {
  const tile = tiles[t];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < tile.width; x++) {
      const src = (y * tile.width + x) * 3;
      const dst = (y * TOTAL + xoff + x) * 3;
      sheet[dst] = tile.buffer[src];
      sheet[dst + 1] = tile.buffer[src + 1];
      sheet[dst + 2] = tile.buffer[src + 2];
    }
  xoff += tile.width;
  if (t < tiles.length - 1) {
    for (let y = 0; y < H; y++) {
      const dst = (y * TOTAL + xoff) * 3;
      sheet[dst] = 90; sheet[dst + 1] = 110; sheet[dst + 2] = 130;
    }
    xoff += 1;
  }
}
writePng(OUT, sheet, TOTAL, H);
console.log(
  `wrote ${OUT} ${TOTAL}x${H} — ${MOVE} ${SIDE} at ${DEGS.join(', ')} deg, ` +
  `view ${VIEW}, layers ${LAYERS}${RAW ? ', RAW (no wrap/carry/aim)' : ''}`,
);
