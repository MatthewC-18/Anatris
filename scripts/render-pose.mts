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
//   LAYERS what to draw: all (default) | bone | muscle | skin. `bone` answers
//          "do the bones cross each other?", which skin and muscle hide; `skin`
//          answers "is the envelope torn?", since a hole shows the background.
//   RAW    off (default) | on -- `on` skips the runtime's wrap/carry/aim, to see
//          what the chain alone does.
//   CLEAR  off (default) | on -- `on` anade la separacion cosmetica del brazo
//          (ARM_CLEARANCE_DEG) que la aplicacion si aplica en reposo. Sin ella
//          la hoja ensena el brazo pegado al flanco y la aplicacion no.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { colorForMaterialMesh, layerForMaterial, materialIsSkin } from '../src/lib/materialColors.ts';
import { applyMirrorRepair } from './lib/mirrorRepair.mts';
import { pick, rasterize, writePng, type View } from './lib/raster.mts';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, type Side } from './lib/rigPose.mts';
import { blendKneeSkin, kneeHeight, KNEE_SKIN_REACH_M } from '../src/lib/rigSkinRepair.ts';

const MOVE = process.env.MOVE ?? 'glenohumeral-abduction';
const DEGS = (process.env.DEG ?? '90').split(',').map(Number);
const SIDE = (process.env.SIDE ?? 'R') as Side;
const VIEW = (process.env.VIEW ?? 'front') as View;
const LAYERS = (process.env.LAYERS ?? 'all') as 'all' | 'bone' | 'muscle' | 'skin';
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

// The load-time skin repairs the APP applies, applied here too. Without them a
// frame from this script is not the frame the user sees, and reviewing a
// movement from it is worthless. Set REPAIR=off to see the raw GLB.
if (process.env.REPAIR !== 'off') {
  // At load the bones are identity, so a plain world centroid is the rest centre.
  const restCentre = (m: THREE.Mesh): THREE.Vector3 | null => {
    const pos = m.geometry.getAttribute('position');
    if (!pos || pos.count === 0) return null;
    const step = Math.max(1, Math.floor(pos.count / 120));
    const v = new THREE.Vector3();
    const acc = new THREE.Vector3();
    let n = 0;
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i);
      m.localToWorld(v);
      acc.add(v); n++;
    }
    return n > 0 ? acc.divideScalar(n) : null;
  };
  const kneeY = kneeHeight(scene);
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh || !materialIsSkin(matNameOf(m))) return;
    const c = restCentre(m);
    if (c && Math.abs(c.y - kneeY) < KNEE_SKIN_REACH_M) blendKneeSkin(m, kneeY);
  });
  scene.updateMatrixWorld(true);
}

const poser = createRigPoser(scene, MOVE, SIDE, !RAW);

/**
 * Skinned world positions + normals, i.e. what the GPU would draw.
 *
 * The normals are RECOMPUTED from the posed triangles rather than carried over
 * from the rest pose. Skinning bends normals too, and the bone transform for a
 * normal is the inverse-transpose of the per-vertex skinning matrix, which three
 * does not expose. Reusing the rest normals shades a heavily rotated limb as if
 * it had never moved, which reads as faceting and dark plates -- and that is
 * indistinguishable, by eye, from skin actually coming apart. Since telling those
 * two apart is the whole job here, it is worth the extra pass.
 */
function posedVertices(m: THREE.Mesh) {
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
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const fn = new THREE.Vector3();
    for (let i = 0; i + 2 < arr.length; i += 3) {
      const a = positions[arr[i]];
      const b = positions[arr[i + 1]];
      const c = positions[arr[i + 2]];
      if (!a || !b || !c) continue;
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      fn.crossVectors(ab, ac); // area-weighted: no normalise before accumulating
      normals[arr[i]].add(fn);
      normals[arr[i + 1]].add(fn);
      normals[arr[i + 2]].add(fn);
    }
  }
  for (const n of normals) {
    if (n.lengthSq() > 1e-20) n.normalize();
    else n.set(0, 0, 1);
  }
  return { positions, normals };
}

const wantLayer = (layer: string) =>
  LAYERS === 'all' ? true
  : LAYERS === 'bone' ? layer === 'bone'
  : LAYERS === 'skin' ? layer === 'skin'
  : layer === 'muscle' || layer === 'connective' || layer === 'bone';

// EL MIEMBRO DE ENFRENTE, EN LA VISTA LATERAL.
//
// Mirando de perfil, la camara ve los DOS miembros superpuestos, y solo uno
// esta posado. En la hoja de dorsiflexion eso aparecia como una segunda hilera
// de dedos que se quedaba abajo mientras el pie subia: durante un rato pareci
// un fallo del rig, y no era mas que el otro pie quieto detras. Lo mismo
// enturbia cadera, rodilla y codo.
//
// Asi que en vista lateral se dibuja solo el lado posado. El umbral deja
// pasar todo lo que esta cerca de la linea media (tronco, cabeza, raquis),
// que no estorba porque no hay copia enfrente. Se puede apagar con
// BOTHSIDES=on para comparar los dos a la vez.
// QUE CUENTA COMO "EL OTRO LADO".
//
// No vale un umbral de distancia a la linea media: con 6 cm se colaba alguna
// tesela de la rodilla de enfrente (las rodillas quedan cerca) y aparecia
// flotando como un parche despegado; con 3 cm se iba la piel del muslo de
// enfrente y dejaba sus aductores al aire. Las dos cosas son defectos que
// INVENTA la herramienta, que es lo que mas cuesta descartar.
//
// La pregunta correcta no es si la malla esta cerca de la linea media, sino si
// la CRUZA: el tronco, la cabeza y el raquis la cruzan y no tienen copia
// enfrente, asi que se quedan; un muslo, una rodilla o un pie no la cruzan y
// se van si son del lado contrario.
const POSED_X_SIGN = SIDE === 'R' ? 1 : -1;
const cullFarLimb = VIEW === 'side' && process.env.BOTHSIDES !== 'on';
const _c = new THREE.Vector3();
const onPosedSide = (m: THREE.Mesh): boolean => {
  if (!cullFarLimb) return true;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const bs = g.boundingSphere;
  if (!bs) return true;
  _c.copy(bs.center).applyMatrix4(m.matrixWorld);
  if (Math.abs(_c.x) <= bs.radius) return true; // cruza la linea media
  return Math.sign(_c.x) === POSED_X_SIGN;
};

// ---------------------------------------------------------------------------
// BREAKS=1: QUE SE VE QUE NO DEBERIA VERSE, CONTADO EN PIXELES.
//
// Los medidores de "musculo fuera de la piel" aproximan la piel por una nube de
// puntos con normales, y eso falla en los dos sentidos: el serrato anterior da
// 27 mm fuera por estar fuera de la piel del BRAZO, y el oblicuo externo, que
// SI se ve en la hoja, no aparece en la lista. Una nube de puntos no es una
// superficie.
//
// El rasterizador si lo es, y ademas es EXACTAMENTE el que dibuja las hojas:
// sabe, pixel a pixel, que malla lo pinto. De modo que con la piel puesta la
// pregunta tiene respuesta exacta y sin modelo -- cuantos pixeles del cuerpo no
// son piel, y de quien son -- y es la unica cifra que corresponde a lo que el
// usuario ve de verdad.
// ---------------------------------------------------------------------------
const breakTally = new Map<string, { px: number; layer: string; first: number }>();
let breakBodyPx = 0;
let breakNonSkinPx = 0;

function tallyBreaks(deg: number, owners: (string | null)[]): void {
  const layerCache = new Map<string, string>();
  const layerByName = (name: string): string => {
    const hit = layerCache.get(name);
    if (hit !== undefined) return hit;
    let out = '';
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (out || !m.isMesh || m.name !== name) return;
      out = layerForMaterial(matNameOf(m)) ?? '';
    });
    layerCache.set(name, out);
    return out;
  };
  for (const name of owners) {
    if (!name) continue;
    breakBodyPx++;
    const layer = layerByName(name);
    if (layer === 'skin') continue;
    breakNonSkinPx++;
    const e = breakTally.get(name);
    if (e) e.px++;
    else breakTally.set(name, { px: 1, layer, first: deg });
  }
}

function reportBreaks(): void {
  const rows = [...breakTally.entries()].sort((a, b) => b[1].px - a[1].px);
  const pct = ((breakNonSkinPx / Math.max(1, breakBodyPx)) * 100).toFixed(3);
  console.log(
    `
--- ROTURAS DE LA PIEL: ${breakNonSkinPx} de ${breakBodyPx} pixeles de cuerpo (${pct}%) ---`,
  );
  console.log('  pixeles   capa         malla                                  grados');
  for (const [name, e] of rows.slice(0, Number(process.env.TOP ?? 20))) {
    console.log(
      `  ${String(e.px).padStart(7)}   ${e.layer.padEnd(11)}  ${name.slice(0, 38).padEnd(38)}  ${e.first}`,
    );
  }
  console.log(`
  ${rows.length} mallas visibles que no son piel.
`);
}

const tiles: { buffer: Uint8Array; width: number; height: number }[] = [];
// LA SEPARACION COSMETICA DEL BRAZO, que la aplicacion aplica y el banco no.
// Sin ella una hoja de revision NO es el fotograma que ve el usuario: la
// aplicacion gira el humero activo 35 grados hacia delante para que el brazo no
// se meta dentro del torax, y ese giro es justo el que deforma la piel del
// brazo. `CLEAR=<grados>` lo reproduce aqui. Ver ARM_CLEARANCE_DEG en
// RigModel.tsx.
const CLEAR = Number(process.env.CLEAR ?? 0);
const clearHum = poser.shoulderBones.get('humerus_gh');

for (const deg of DEGS) {
  poser.pose(deg, { withClearance: process.env.CLEAR === 'on' });
  if (CLEAR && clearHum) {
    clearHum.rotateOnAxis(new THREE.Vector3(1, 0, 0), (-CLEAR * Math.PI) / 180);
    scene.updateMatrixWorld(true);
  }
  const r = rasterize(scene, {
    view: VIEW,
    box: BOX,
    width: W,
    // `visible === false` es como la aplicacion marca lo que oculta al cargar
    // (recorte del antebrazo, duplicados, contenedores). Sin mirarlo, la hoja
    // dibujaba los tendones digitales que la aplicacion ya habia quitado.
    include: (m) =>
      m.visible &&
      onPosedSide(m) &&
      !/g0\d\d$/.test(m.name) && !/_system/i.test(m.name) && !/^General[_ ]terms$/i.test(m.name),
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
    vertices: posedVertices,
  });
  tiles.push({ buffer: r.buffer, width: r.width, height: r.height });
  console.log(`  ${MOVE} ${deg} deg -> ${r.drawn} triangles`);
  if (DEGS.length === 1 && process.env.PICK) pick(process.env.PICK, r.owners, r.width);
  if (process.env.BREAKS) tallyBreaks(deg, r.owners);
}

if (process.env.BREAKS) reportBreaks();

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
