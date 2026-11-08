// COMO SE VE DE VERDAD EL DEMO DE UNA PRUEBA ORTOPEDICA.
//
// `render-pose.mts` dibuja UN movimiento. El demo de una prueba casi nunca lo
// es: lo que separa a Hawkins de Neer, o a la lata vacia de una abduccion
// cualquiera, son los COMPONENTES que se sostienen mientras la base barre. Sin
// ellos la hoja de revision ensena la pose generica y da por bueno justo lo que
// habia que comprobar.
//
// Esto posa el demo entero --base + componentes + el cero clinico de cada
// componente-- con las mismas reglas que RigModel, y lo rasteriza.
//
// Uso:
//   TEST=empty-can VIEW=front OUT=x.png \
//     npx tsx --tsconfig tsconfig.scripts.json scripts/render-test-demo.mts
//
//   TEST    id de la prueba (de cualquier region)
//   DEG     angulo de la base; por defecto el del demo. Lista para hoja: 0,45,90
//   VIEW    front (por defecto) | side
//   LAYERS  all (por defecto) | bone | muscle | skin
//   BOX     recorte x0,x1,y0,y1 en metros
//   PICK    "x,y;x,y" para preguntar que malla pinto cada pixel
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import {
  colorForMaterialMesh,
  layerForMaterial,
  materialIsSkin,
} from '../src/lib/materialColors.ts';
import { getBoneControl, resolveArmatureName, rigSideFor } from '../src/lib/boneMap.ts';
import { ALL_TESTS_BY_REGION } from '../src/data/fullContent.ts';
import { applyMirrorRepair } from './lib/mirrorRepair.mts';
import { pick, rasterize, writePng, type View } from './lib/raster.mts';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, baseName, type Side } from './lib/rigPose.mts';
import { inDistalRegion } from '../src/lib/rigLimbTrim.ts';

const TEST_ID = process.env.TEST ?? '';
const VIEW = (process.env.VIEW ?? 'front') as View;
const LAYERS = (process.env.LAYERS ?? 'all') as 'all' | 'bone' | 'muscle' | 'skin';
const OUT = process.env.OUT ?? 'test-demo.png';
const W = Number(process.env.W ?? 560);
const D2R = Math.PI / 180;
const AX: Record<string, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

const all = Object.entries(ALL_TESTS_BY_REGION).flatMap(([region, list]) =>
  list.map((t) => ({ region, t })),
);
const hit = all.find((x) => x.t.id === TEST_ID);
if (!hit || !hit.t.demo) {
  console.error(
    TEST_ID
      ? `No hay demo para '${TEST_ID}'. Con demo: ${all.filter((x) => x.t.demo).length}`
      : 'Falta TEST=<id>.',
  );
  if (!TEST_ID) {
    for (const [r, list] of Object.entries(ALL_TESTS_BY_REGION)) {
      console.error(`  ${r}: ${list.filter((t) => t.demo).map((t) => t.id).join(', ')}`);
    }
  }
  process.exit(1);
}
const demo = hit.t.demo;
const DEGS = (process.env.DEG ?? String(demo.angleDeg)).split(',').map(Number);
const SIDE = rigSideFor((demo.side ?? 'R') as Side);
const BOX = (process.env.BOX ?? '-0.75,0.75,0.55,1.85').split(',').map(Number) as
  [number, number, number, number];

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const matNameOf = (m: THREE.Mesh): string => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as THREE.Material | undefined)?.name ?? '';
};
const wantLayer = (l: string): boolean =>
  LAYERS === 'all' || LAYERS === l || (LAYERS === 'bone' && l === 'bone');

const tiles: { buffer: Uint8Array; width: number; height: number }[] = [];
for (const deg of DEGS) {
  const ld = new GLTFLoader();
  ld.setMeshoptDecoder(MeshoptDecoder);
  const gl = await new Promise<any>((r, j) => ld.parse(ab.slice(0), '', r, j));
  const scene = gl.scene as THREE.Group;
  applyMirrorRepair(scene);
  const poser = createRigPoser(scene, demo.movementId, SIDE, true);
  poser.pose(deg);

  // Los componentes, con su cero clinico, exactamente como RigModel.
  for (const comp of demo.components ?? []) {
    const cc = getBoneControl(comp.movementId);
    if (!cc || cc.kind !== 'joint') {
      console.warn(`  aviso: componente no accionable: ${comp.movementId}`);
      continue;
    }
    const armature = scene.getObjectByName(resolveArmatureName(cc.armatureBase, SIDE));
    const find = (n: string): THREE.Object3D | null => {
      let found: THREE.Object3D | null = null;
      armature?.traverse((o) => {
        if (!found && baseName(o.name) === n) found = o;
      });
      return found;
    };
    for (const p of cc.posture ?? []) {
      if (!p.zeroPoint) continue;
      const pb = find(p.bone);
      if (pb) pb.rotateOnAxis(AX[p.axis], p.sign[SIDE] * p.deg * D2R);
    }
    const bone = find(cc.bone);
    if (bone) bone.rotateOnAxis(AX[cc.axis], cc.sign[SIDE] * comp.angleDeg * D2R);
    scene.updateMatrixWorld(true);
  }

  // Posiciones Y NORMALES recalculadas de los triangulos ya posados: reusar las
  // normales del reposo sombrea un miembro girado como si no se hubiera movido,
  // y eso se lee igual que una piel rota (misma razon que en render-pose.mts).
  const posedVertices = (
    m: THREE.Mesh,
  ): { positions: THREE.Vector3[]; normals: THREE.Vector3[] } | null => {
    const g = m.geometry;
    const pos = g.getAttribute('position');
    if (!pos) return null;
    const sk = m as THREE.SkinnedMesh;
    const skinned = !!sk.isSkinnedMesh;
    if (skinned) sk.skeleton.update();
    const positions: THREE.Vector3[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (skinned) sk.applyBoneTransform(i, v);
      m.localToWorld(v);
      positions.push(v.clone());
    }
    const normals: THREE.Vector3[] = positions.map(() => new THREE.Vector3());
    const idx = g.getIndex();
    if (idx) {
      const arr = idx.array as ArrayLike<number>;
      const e1 = new THREE.Vector3();
      const e2 = new THREE.Vector3();
      const fn = new THREE.Vector3();
      for (let i = 0; i + 2 < arr.length; i += 3) {
        const a = positions[arr[i]];
        const b = positions[arr[i + 1]];
        const c = positions[arr[i + 2]];
        if (!a || !b || !c) continue;
        e1.subVectors(b, a);
        e2.subVectors(c, a);
        fn.crossVectors(e1, e2);
        normals[arr[i]].add(fn);
        normals[arr[i + 1]].add(fn);
        normals[arr[i + 2]].add(fn);
      }
      for (const n of normals) if (n.lengthSq() > 0) n.normalize();
    }
    return { positions, normals };
  };

  const POSED_X = SIDE === 'R' ? 1 : -1;
  const _box = new THREE.Box3();
  const _c = new THREE.Vector3();
  const cullFar = VIEW === 'side' && process.env.BOTHSIDES !== 'on';
  const r = rasterize(scene, {
    view: VIEW,
    box: BOX,
    width: W,
    include: (m) => {
      if (!m.visible) return false;
      if (/g0\d\d$/.test(m.name) || /_system/i.test(m.name)) return false;
      if (/^General[_ ]terms$/i.test(m.name)) return false;
      if (!cullFar) return true;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox;
      if (!bb) return true;
      _box.copy(bb).applyMatrix4(m.matrixWorld);
      if (_box.min.x < 0 && _box.max.x > 0) return true;
      _box.getCenter(_c);
      return Math.sign(_c.x) === POSED_X;
    },
    color: (m) => {
      const mat = matNameOf(m);
      const layer = layerForMaterial(mat);
      if (!layer || !wantLayer(layer)) return null;
      const g = m.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
      if (inDistalRegion(c) && !materialIsSkin(mat)) return null;
      if (layer === 'skin' && LAYERS !== 'all' && LAYERS !== 'skin') return null;
      return colorForMaterialMesh(mat, m.name) ?? 0xbfae9a;
    },
    vertices: posedVertices as never,
  });
  tiles.push({ buffer: r.buffer, width: r.width, height: r.height });
  console.log(`  ${TEST_ID} ${deg} deg -> ${r.drawn} triangulos`);
  if (DEGS.length === 1 && process.env.PICK) pick(process.env.PICK, r.owners, r.width);
}

// Hoja de contacto: los angulos uno al lado del otro, con un filo entre ellos.
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
const comps = (demo.components ?? []).map((c) => `${c.movementId}@${c.angleDeg}`).join(' + ');
console.log(
  `wrote ${OUT} ${TOTAL}x${H} — ${hit.region}/${TEST_ID}: ${demo.movementId} ` +
  `${DEGS.join(', ')} deg${comps ? ` + ${comps}` : ''} (lado ${demo.side ?? 'R'}` +
  `${demo.resisted ? ', resistido' : ''})`,
);
