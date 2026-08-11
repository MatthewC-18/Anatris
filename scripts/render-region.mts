// Rasterise any region of the rig to a PNG, straight from node.
//
// The lab's canvas never initialises in the session's browser pane, so this is
// how rig geometry gets LOOKED AT rather than only measured. It shades with the
// lab's own lights and paints with the lab's own per-mesh colors, so a patch that
// reads wrong on screen reads wrong here too -- and PICK reports which mesh
// painted a given pixel, which turns "what is that black shape" into a lookup.
//
// Run: OUT=x.png BOX=xmin,xmax,ymin,ymax VIEW=front|side [SKIN=off] [PICK="x,y;..."]
//      npx tsx --tsconfig tsconfig.scripts.json scripts/render-region.mts
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { colorForMaterialMesh, layerForMaterial, materialIsSkin } from '../src/lib/materialColors.ts';
import { applyMirrorRepair } from './lib/mirrorRepair.mts';
import { pick, rasterize, writePng, type View } from './lib/raster.mts';
import { rigGlbPath } from './lib/rigPath.mts';

const OUT = process.env.OUT ?? 'region.png';
const VIEW = (process.env.VIEW ?? 'front') as View;
const SHOW_SKIN = process.env.SKIN !== 'off';
const BOX = (process.env.BOX ?? '-0.5,0.5,0.9,1.7').split(',').map(Number);
const [XMIN, XMAX, YMIN, YMAX] = BOX;
const W = Number(process.env.W ?? 700);

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group; scene.updateMatrixWorld(true);
// Same rebuild the app does at load, so the render shows what the app shows.
if (process.env.REPAIR !== 'off') applyMirrorRepair(scene);
const matNameOf = (m: THREE.Mesh) => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as THREE.Material | undefined)?.name ?? '';
};
const inDistalRegion = (c: THREE.Vector3) =>
  (c.y > 0.6 && c.y < 0.86 && Math.abs(c.x) > 0.18) || c.y < 0.12;

const { buffer, owners, width: RW, height: H, drawn } = rasterize(scene, {
  view: VIEW,
  box: [XMIN, XMAX, YMIN, YMAX],
  width: W,
  include: (m) =>
    !/g0\d\d$/.test(m.name) && !/_system/i.test(m.name) && !/^General[_ ]terms$/i.test(m.name),
  color: (m) => {
    const mat = matNameOf(m);
    const layer = layerForMaterial(mat);
    if (!layer) return null;
    const g = m.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
    if (inDistalRegion(c) && !materialIsSkin(mat)) return null;
    if (layer === 'skin' && !SHOW_SKIN) return null;
    return colorForMaterialMesh(mat, m.name) ?? 0xbfae9a;
  },
  // Rest pose: the mesh's own world transform is the whole story.
  vertices: (m) => {
    const g = m.geometry;
    const pos = g.getAttribute('position');
    const nrm = g.getAttribute('normal');
    if (!pos) return null;
    const nrmMat = new THREE.Matrix3().getNormalMatrix(m.matrixWorld);
    const positions: THREE.Vector3[] = [];
    const normals: THREE.Vector3[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i); m.localToWorld(v); positions.push(v.clone());
      if (nrm) {
        v.fromBufferAttribute(nrm, i).applyMatrix3(nrmMat).normalize();
        normals.push(v.clone());
      } else normals.push(new THREE.Vector3(0, 0, 1));
    }
    return { positions, normals };
  },
});

writePng(OUT, buffer, RW, H);
console.log(`wrote ${OUT} ${RW}x${H}, ${drawn} triangles, view ${VIEW}, skin ${SHOW_SKIN ? 'on' : 'off'}`);
if (process.env.PICK) pick(process.env.PICK, owners, RW);
