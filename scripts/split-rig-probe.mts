// scripts/split-rig-probe.mts
//
// ¿SE PUEDE PARTIR EL RIG DEL LABORATORIO EN UN GLB POR REGION SIN ROMPER LA
// ANATOMIA? Esta sonda lo mide, no lo opina.
//
// Lo que contesta, cada cosa con su cifra:
//
//   A) INVENTARIO. Cuantas skins hay, que articulaciones (joints) cuelgan de
//      cada una, cuantos nodos con malla usa cada skin, y si alguna primitiva
//      COMPARTE accessors con otra (si los compartiera, recortar mallas no
//      ahorraria bytes).
//   B) REPARTO. Cuanto pesa cada skin en mallas / vertices / triangulos, que es
//      el techo de lo que un GLB por region puede ahorrar.
//   C) RECORTE. Produce de verdad un GLB recortado (solo las skins que se le
//      pidan) en el directorio que se le diga, y dice su tamanio, su recuento de
//      mallas y si los joints siguen ahi.
//   D) EQUIVALENCIA. Carga el GLB entero y el recortado en three, pone LA MISMA
//      pose clinica en los dos, y compara la posicion MUNDIAL de los vertices de
//      las mallas que sobreviven. Si el recorte renumerara los huesos o rompiera
//      los pesos, la piel del recortado se deformaria distinto y aqui saldria la
//      diferencia en milimetros.
//   E) PARSE. Cuesta de parsear el entero contra el recortado, medido en Node
//      (el reloj del navegador no vale: el panel de vista previa estrangula los
//      temporizadores cuando esta oculto).
//
// NO escribe en public/ ni toca ningun fichero del repositorio. La salida va al
// directorio que se pase en --out (por defecto, el temporal del sistema).
//
// Uso:
//   npx tsx --tsconfig tsconfig.scripts.json scripts/split-rig-probe.mts
//   npx tsx --tsconfig tsconfig.scripts.json scripts/split-rig-probe.mts \
//     --out <dir> --keep Spine_Armature,Shoulder_Armature_R,Shoulder_Armature_L \
//     --movement glenohumeral-abduction --side R --etapas ABCDE

import { readFileSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { gzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { NodeIO, type Document, type Node as GltfNode } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder as ThreeMeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser } from './lib/rigPose.mts';

// ---------------------------------------------------------------------------
// argumentos
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const arg = (name: string, def: string): string => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const OUT_DIR = resolve(arg('out', join(tmpdir(), 'split-rig-probe')));
const KEEP = arg('keep', 'Spine_Armature,Shoulder_Armature_R,Shoulder_Armature_L')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const MOVEMENT = arg('movement', 'glenohumeral-abduction');
const SIDE = arg('side', 'R') as 'R' | 'L';
const STAGES = arg('etapas', 'ABCDE').toUpperCase();

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const B = (n: number) => `${n.toLocaleString('es-ES')} B`;
const MB = (n: number) => `${(n / 1e6).toFixed(2)} MB`;
const ms = (t: number) => `${t.toFixed(0)} ms`;
const RIG = rigGlbPath();

/** Tamanio de los dos trozos de un GLB: el JSON (que meshopt NO comprime) y el BIN. */
const chunks = (path: string): { json: number; bin: number } => {
  const b = readFileSync(path);
  let off = 12;
  let json = 0;
  let bin = 0;
  while (off + 8 <= b.byteLength) {
    const len = b.readUInt32LE(off);
    const type = b.readUInt32LE(off + 4);
    if (type === 0x4e4f534a) json = len;
    else if (type === 0x004e4942) bin = len;
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  return { json, bin };
};

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
});

console.log(`rig ...... ${RIG}`);
console.log(`           ${B(statSync(RIG).size)}  (${MB(statSync(RIG).size)})`);
console.log(`salida ... ${OUT_DIR}`);
console.log('');

// ---------------------------------------------------------------------------
// helpers de documento
// ---------------------------------------------------------------------------
interface PrimStats {
  verts: number;
  tris: number;
}
const primStats = (doc: Document): Map<unknown, PrimStats> => {
  const out = new Map<unknown, PrimStats>();
  for (const m of doc.getRoot().listMeshes()) {
    let verts = 0;
    let tris = 0;
    for (const p of m.listPrimitives()) {
      const pos = p.getAttribute('POSITION');
      const idx = p.getIndices();
      verts += pos ? pos.getCount() : 0;
      tris += idx ? idx.getCount() / 3 : pos ? pos.getCount() / 3 : 0;
    }
    out.set(m, { verts, tris: Math.round(tris) });
  }
  return out;
};

/** Nombre de la skin de un nodo, o '(sin skin)'. */
const skinOf = (n: GltfNode): string => {
  const s = n.getSkin();
  if (!s) return '(sin skin)';
  return s.getName() || `(skin anonima #${s.listJoints().length} joints)`;
};

// ---------------------------------------------------------------------------
// A) INVENTARIO
// ---------------------------------------------------------------------------
const t0 = performance.now();
const doc = await io.read(RIG);
const readMs = performance.now() - t0;
const root = doc.getRoot();
const stats = primStats(doc);

if (STAGES.includes('A')) {
  console.log('--- A) INVENTARIO -------------------------------------------------');
  console.log(`io.read (gltf-transform) ... ${ms(readMs)}`);
  console.log(`meshes ${root.listMeshes().length}  nodes ${root.listNodes().length}  ` +
    `skins ${root.listSkins().length}  materials ${root.listMaterials().length}  ` +
    `accessors ${root.listAccessors().length}  buffers ${root.listBuffers().length}  ` +
    `scenes ${root.listScenes().length}  animations ${root.listAnimations().length}  ` +
    `textures ${root.listTextures().length}`);
  console.log('');
  for (const [i, s] of root.listSkins().entries()) {
    const joints = s.listJoints();
    const ibm = s.getInverseBindMatrices();
    console.log(
      `skin[${i}] "${s.getName()}"  joints=${joints.length}  ` +
        `skeleton=${s.getSkeleton()?.getName() ?? '(ninguno)'}  ` +
        `IBM=${ibm ? `accessor count ${ibm.getCount()}` : 'NINGUNO'}`,
    );
    console.log(`          ${joints.map((j) => j.getName()).join(' ')}`);
  }
  console.log('');

  // ¿Comparten accessors dos primitivas distintas? Si lo hicieran, borrar una
  // malla no liberaria sus bytes.
  const accUse = new Map<unknown, number>();
  for (const m of root.listMeshes())
    for (const p of m.listPrimitives()) {
      for (const sem of p.listSemantics()) accUse.set(p.getAttribute(sem), (accUse.get(p.getAttribute(sem)) ?? 0) + 1);
      const idx = p.getIndices();
      if (idx) accUse.set(idx, (accUse.get(idx) ?? 0) + 1);
    }
  const sharedAcc = [...accUse.values()].filter((v) => v > 1).length;
  console.log(`accessors usados por primitivas ... ${accUse.size}`);
  console.log(`  de ellos COMPARTIDOS por >1 prim . ${sharedAcc}  ` +
    `${sharedAcc === 0 ? '(ninguno: recortar mallas SI libera bytes)' : '(OJO)'}`);

  // ¿Alguna malla la instancian varios nodos? Entonces borrar un nodo no borra la malla.
  const meshUse = new Map<unknown, number>();
  for (const n of root.listNodes()) {
    const m = n.getMesh();
    if (m) meshUse.set(m, (meshUse.get(m) ?? 0) + 1);
  }
  const reused = [...meshUse.values()].filter((v) => v > 1).length;
  console.log(`mallas instanciadas por >1 nodo ... ${reused}`);

  // ¿IBM / skinIndex compartidos entre skins?
  const ibmAcc = new Set(root.listSkins().map((s) => s.getInverseBindMatrices()).filter(Boolean));
  console.log(`accessors de IBM distintos ........ ${ibmAcc.size} para ${root.listSkins().length} skins`);
  console.log('');
}

// ---------------------------------------------------------------------------
// B) REPARTO POR SKIN
// ---------------------------------------------------------------------------
interface SkinBucket {
  nodes: number;
  verts: number;
  tris: number;
  bytes: number;
}
const buckets = new Map<string, SkinBucket>();
const bytesOfMesh = (n: GltfNode): number => {
  const m = n.getMesh();
  if (!m) return 0;
  let bytes = 0;
  for (const p of m.listPrimitives()) {
    for (const sem of p.listSemantics()) {
      const a = p.getAttribute(sem)!;
      bytes += a.getCount() * a.getElementSize() * a.getComponentSize();
    }
    const idx = p.getIndices();
    if (idx) bytes += idx.getCount() * idx.getComponentSize();
  }
  return bytes;
};
for (const n of root.listNodes()) {
  const m = n.getMesh();
  if (!m) continue;
  const key = skinOf(n);
  const b = buckets.get(key) ?? { nodes: 0, verts: 0, tris: 0, bytes: 0 };
  const st = stats.get(m)!;
  b.nodes += 1;
  b.verts += st.verts;
  b.tris += st.tris;
  b.bytes += bytesOfMesh(n);
  buckets.set(key, b);
}

if (STAGES.includes('B')) {
  console.log('--- B) REPARTO POR SKIN (= por armature) --------------------------');
  const totN = [...buckets.values()].reduce((a, b) => a + b.nodes, 0);
  const totV = [...buckets.values()].reduce((a, b) => a + b.verts, 0);
  const totB = [...buckets.values()].reduce((a, b) => a + b.bytes, 0);
  console.log('skin                          nodos    %    vertices      tris   bytes crudos   %');
  for (const [k, b] of [...buckets.entries()].sort((a, c) => c[1].nodes - a[1].nodes)) {
    console.log(
      `${k.padEnd(28)} ${String(b.nodes).padStart(5)} ${((100 * b.nodes) / totN).toFixed(1).padStart(5)} ` +
        `${b.verts.toLocaleString('es-ES').padStart(11)} ${b.tris.toLocaleString('es-ES').padStart(9)} ` +
        `${MB(b.bytes).padStart(10)} ${((100 * b.bytes) / totB).toFixed(1).padStart(6)}`,
    );
  }
  console.log(`${'TOTAL'.padEnd(28)} ${String(totN).padStart(5)}       ${totV.toLocaleString('es-ES').padStart(11)}            ${MB(totB).padStart(10)}`);
  console.log('');
}

// ---------------------------------------------------------------------------
// C) RECORTE
// ---------------------------------------------------------------------------
// El nombre LLEVA LAS SKINS, no su numero: con `rig-trim-2skins.glb` el
// recorte de los brazos y el de las piernas se escribian encima el uno del
// otro, y la segunda medida describia un fichero que ya no era el que decia.
const trimmedPath = join(
  OUT_DIR,
  `rig-trim-${KEEP.map((k) => k.replace('_Armature', '').toLowerCase()).join('-')}.glb`,
);

if (STAGES.includes('C')) {
  console.log('--- C) RECORTE ----------------------------------------------------');
  console.log(`conservo las skins: ${KEEP.join(', ')}`);
  const doc2 = await io.read(RIG);
  const r2 = doc2.getRoot();
  const keepSet = new Set(KEEP);
  const dropMeshes: ReturnType<GltfNode['getMesh']>[] = [];
  let dropped = 0;
  let kept = 0;
  for (const n of r2.listNodes()) {
    const m = n.getMesh();
    if (!m) continue;
    const s = n.getSkin();
    const name = s?.getName() ?? '(sin skin)';
    if (keepSet.has(name)) {
      kept++;
      continue;
    }
    dropped++;
    dropMeshes.push(m);
    n.setMesh(null);
    n.dispose();
  }
  // Las mallas sueltas siguen en el Root: hay que tirarlas tambien o se escriben.
  // Y LAS PRIMITIVAS UNA POR UNA, que es el paso que al principio falte:
  // `mesh.dispose()` suelta la malla pero deja sus Primitive vivas como
  // propiedades del documento, y mientras una Primitive apunte a un accessor,
  // `prune` lo cuenta como usado. Sin esto el recorte quito 603 mallas y el
  // fichero solo bajo un 6,2% (883 accessors podados de ~3.000).
  for (const m of dropMeshes) {
    if (!m) continue;
    for (const p of m.listPrimitives()) {
      m.removePrimitive(p);
      p.dispose();
    }
    m.dispose();
  }

  // Solo accessors y bufferViews huerfanos. NO podamos nodos (son los huesos),
  // ni skins, ni materiales: justo lo que no se puede renumerar.
  const { prune } = await import('@gltf-transform/functions');
  const { PropertyType } = await import('@gltf-transform/core');
  await doc2.transform(
    prune({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.BUFFER] }),
  );

  doc2
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });

  await io.write(trimmedPath, doc2);
  const sz = statSync(trimmedPath).size;
  const gz = gzipSync(readFileSync(trimmedPath), { level: 9 }).byteLength;
  const szFull = statSync(RIG).size;
  const gzFull = gzipSync(readFileSync(RIG), { level: 9 }).byteLength;

  console.log(`nodos con malla conservados ... ${kept}`);
  console.log(`nodos con malla eliminados .... ${dropped}`);
  console.log(`meshes   ${root.listMeshes().length} -> ${r2.listMeshes().length}`);
  console.log(`nodes    ${root.listNodes().length} -> ${r2.listNodes().length}`);
  console.log(`skins    ${root.listSkins().length} -> ${r2.listSkins().length}`);
  console.log(`joints   ${root.listSkins().map((s) => s.listJoints().length).join('/')} -> ${r2.listSkins().map((s) => s.listJoints().length).join('/')}`);
  console.log(`material ${root.listMaterials().length} -> ${r2.listMaterials().length}`);
  console.log(`accessor ${root.listAccessors().length} -> ${r2.listAccessors().length}`);
  const cF = chunks(RIG);
  const cT = chunks(trimmedPath);
  console.log(`chunk JSON ${B(cF.json)} -> ${B(cT.json)}`);
  console.log(`chunk BIN  ${B(cF.bin)} -> ${B(cT.bin)}`);
  console.log(`tamanio  ${B(szFull)} -> ${B(sz)}   (${(100 - (100 * sz) / szFull).toFixed(1)}% menos)`);
  console.log(`gzip     ${B(gzFull)} -> ${B(gz)}   (${(100 - (100 * gz) / gzFull).toFixed(1)}% menos)`);
  console.log(`escrito en ${trimmedPath}`);
  console.log('');
}

// ---------------------------------------------------------------------------
// D) EQUIVALENCIA DE DEFORMACION
// ---------------------------------------------------------------------------
const loadThree = async (path: string): Promise<THREE.Group> => {
  const buf = readFileSync(path);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const ld = new GLTFLoader();
  ld.setMeshoptDecoder(ThreeMeshoptDecoder);
  const gl = await new Promise<{ scene: THREE.Group }>((res, rej) => ld.parse(ab, '', res as never, rej));
  return gl.scene;
};

/** Posicion MUNDIAL deformada por la piel de un vertice, como la calcula la GPU. */
const skinnedWorld = (sk: THREE.SkinnedMesh, i: number, out: THREE.Vector3): THREE.Vector3 => {
  out.fromBufferAttribute(sk.geometry.getAttribute('position') as THREE.BufferAttribute, i);
  sk.applyBoneTransform(i, out);
  return sk.localToWorld(out);
};

if (STAGES.includes('D')) {
  console.log('--- D) EQUIVALENCIA DE DEFORMACION --------------------------------');
  console.log(`pose: ${MOVEMENT} lado del rig ${SIDE}`);
  if (!existsSync(trimmedPath)) {
    console.log('no hay GLB recortado; corre la etapa C primero.');
  } else {
    const full = await loadThree(RIG);
    const trim = await loadThree(trimmedPath);

    // huesos: nombres E INDICES de cada skeleton, comparados
    const skelOf = (scene: THREE.Object3D) => {
      const out = new Map<string, string[]>();
      scene.traverse((o) => {
        const sk = o as THREE.SkinnedMesh;
        if (!sk.isSkinnedMesh || !sk.skeleton) return;
        const key = sk.skeleton.bones.length + ':' + (sk.skeleton.bones[0]?.name ?? '?');
        if (!out.has(key)) out.set(key, sk.skeleton.bones.map((b) => b.name));
      });
      return out;
    };
    const sa = skelOf(full);
    const sb = skelOf(trim);
    console.log(`skeletons distintos: entero ${sa.size}, recortado ${sb.size}`);
    let boneMismatch = 0;
    for (const [k, names] of sb) {
      const other = sa.get(k);
      if (!other) {
        console.log(`  skeleton ${k} no existe en el entero (?)`);
        boneMismatch++;
        continue;
      }
      const diff = names.findIndex((n, i) => n !== other[i]);
      if (diff >= 0 || names.length !== other.length) {
        console.log(`  skeleton ${k}: PRIMER INDICE DISTINTO en ${diff} -> "${names[diff]}" vs "${other[diff]}"`);
        boneMismatch++;
      }
    }
    console.log(`orden de huesos ... ${boneMismatch === 0 ? 'IDENTICO en todos los skeletons' : `${boneMismatch} skeletons DISTINTOS`}`);

    // los nodos del armature siguen existiendo?
    for (const a of ['Spine_Armature', 'Shoulder_Armature_R', 'Shoulder_Armature_L', 'Leg_Armature_R', 'Leg_Armature_L']) {
      const inFull = !!full.getObjectByName(a);
      const inTrim = !!trim.getObjectByName(a);
      console.log(`  ${a.padEnd(22)} entero ${inFull ? 'si' : 'NO'}   recortado ${inTrim ? 'si' : 'NO'}`);
    }

    // misma pose en los dos, con el mismo codigo que la aplicacion.
    //
    // `--crudo` pone `apply = false`: la cadena de huesos tal cual, SIN los pases
    // de reparacion de piel que la aplicacion anade al cargar. Es la unica forma
    // de separar dos preguntas distintas: "¿el recorte del GLB cambia la
    // deformacion?" (crudo) y "¿los pases de reparacion dan otro resultado
    // cuando faltan mallas vecinas?" (con reparacion).
    const RAW = argv.includes('--crudo');
    console.log(`pases de reparacion de la aplicacion: ${RAW ? 'NO (--crudo)' : 'SI'}`);
    const DEG = 90;
    const pa = createRigPoser(full, MOVEMENT, SIDE, !RAW);
    pa.pose(DEG);
    full.updateMatrixWorld(true);
    const pb = createRigPoser(trim, MOVEMENT, SIDE, !RAW);
    pb.pose(DEG);
    trim.updateMatrixWorld(true);

    // comparar vertices de las mallas que sobreviven, por nombre de nodo
    const byName = new Map<string, THREE.SkinnedMesh>();
    full.traverse((o) => {
      const sk = o as THREE.SkinnedMesh;
      if (sk.isSkinnedMesh) byName.set(sk.name, sk);
    });
    const _a = new THREE.Vector3();
    const _b = new THREE.Vector3();
    let compared = 0;
    let samples = 0;
    let maxErr = 0;
    let sumErr = 0;
    let worst = '';
    let missing = 0;
    const perMesh: { name: string; err: number }[] = [];
    trim.traverse((o) => {
      const t = o as THREE.SkinnedMesh;
      if (!t.isSkinnedMesh) return;
      const f = byName.get(t.name);
      if (!f) {
        missing++;
        return;
      }
      const posT = t.geometry.getAttribute('position');
      const posF = f.geometry.getAttribute('position');
      if (!posT || !posF || posT.count !== posF.count) {
        missing++;
        return;
      }
      compared++;
      const step = Math.max(1, Math.floor(posT.count / 40));
      let localMax = 0;
      for (let i = 0; i < posT.count; i += step) {
        skinnedWorld(t, i, _a);
        skinnedWorld(f, i, _b);
        const d = _a.distanceTo(_b);
        samples++;
        sumErr += d;
        if (d > localMax) localMax = d;
        if (d > maxErr) {
          maxErr = d;
          worst = t.name;
        }
      }
      if (localMax > 1e-5) perMesh.push({ name: t.name, err: localMax });
    });
    console.log('');
    console.log(`mallas comparadas ......... ${compared}   (sin pareja o con otro recuento: ${missing})`);
    console.log(`vertices muestreados ...... ${samples}`);
    console.log(`error medio ............... ${(1000 * (sumErr / Math.max(samples, 1))).toFixed(4)} mm`);
    console.log(`error maximo .............. ${(1000 * maxErr).toFixed(4)} mm   (${worst})`);
    console.log(`mallas que se mueven algo . ${perMesh.length} de ${compared}`);
    perMesh.sort((x, y) => y.err - x.err);
    for (const p of perMesh.slice(0, 12)) console.log(`   ${(1000 * p.err).toFixed(3).padStart(9)} mm  ${p.name}`);
    console.log(
      maxErr < 1e-5
        ? 'VEREDICTO: las mallas que quedan se deforman IGUAL (error por debajo de 0,01 mm).'
        : 'VEREDICTO: HAY DIFERENCIA. El recorte cambia la deformacion.',
    );
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// R) EQUIVALENCIA EN CRUDO: el GLB solo, sin NINGUN pase de reparacion.
//
// `createRigPoser(..., apply=false)` NO sirve para aislar el fichero: sus pases
// de reparacion de malla (unmangleForearmMeshes, inflateSkinShell,
// repairFaceWinding, blendHipSkin, redistributeSkinRootWeight, relaxSkinSeams,
// smoothTrunkSkin...) corren SIEMPRE, antes de mirar `apply`. Asi que aqui se
// gira UN hueso a mano y se compara. Si sale cero, el recorte del GLB es exacto
// y cualquier diferencia que aparezca con reparacion la produce la reparacion,
// no el recorte.
// ---------------------------------------------------------------------------
if (STAGES.includes('R')) {
  console.log('--- R) EQUIVALENCIA EN CRUDO (GLB solo) ---------------------------');
  if (!existsSync(trimmedPath)) {
    console.log('no hay GLB recortado; corre la etapa C primero.');
  } else {
    const full = await loadThree(RIG);
    const trim = await loadThree(trimmedPath);
    const poseRaw = (scene: THREE.Group) => {
      scene.updateMatrixWorld(true);
      // un hueso de cada armature, girado 90 grados en su eje local X
      for (const armature of ['Spine_Armature', 'Shoulder_Armature_R', 'Shoulder_Armature_L']) {
        const rootNode = scene.getObjectByName(armature);
        if (!rootNode) continue;
        rootNode.traverse((o) => {
          const base = o.name.replace(/_\d+$/, '');
          if (base === 'humerus_gh' || base === 'vert_T8' || base === 'forearm_flex')
            o.rotateX(Math.PI / 2);
        });
      }
      scene.updateMatrixWorld(true);
    };
    poseRaw(full);
    poseRaw(trim);

    const byName = new Map<string, THREE.SkinnedMesh>();
    full.traverse((o) => {
      const sk = o as THREE.SkinnedMesh;
      if (sk.isSkinnedMesh) byName.set(sk.name, sk);
    });
    const _a = new THREE.Vector3();
    const _b = new THREE.Vector3();
    let compared = 0;
    let samples = 0;
    let maxErr = 0;
    let worst = '';
    let missing = 0;
    trim.traverse((o) => {
      const t = o as THREE.SkinnedMesh;
      if (!t.isSkinnedMesh) return;
      const f = byName.get(t.name);
      const posT = t.geometry.getAttribute('position');
      if (!f || !posT || posT.count !== f.geometry.getAttribute('position')?.count) {
        missing++;
        return;
      }
      compared++;
      const step = Math.max(1, Math.floor(posT.count / 40));
      for (let i = 0; i < posT.count; i += step) {
        skinnedWorld(t, i, _a);
        skinnedWorld(f, i, _b);
        const d = _a.distanceTo(_b);
        samples++;
        if (d > maxErr) {
          maxErr = d;
          worst = t.name;
        }
      }
    });
    console.log(`mallas comparadas ......... ${compared}  (sin pareja: ${missing})`);
    console.log(`vertices muestreados ...... ${samples}`);
    console.log(`error maximo .............. ${(1000 * maxErr).toFixed(6)} mm   (${worst})`);
    console.log(
      maxErr < 1e-9
        ? 'VEREDICTO: el recorte del GLB es EXACTO. Mismos huesos, mismos indices, misma piel.'
        : 'VEREDICTO: el recorte del GLB por si mismo ya cambia la deformacion.',
    );
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// S) ¿QUE PASE DE REPARACION DEJA DE DAR EL MISMO RESULTADO?
//
// El recorte del GLB es exacto (etapa R), pero con los pases de la aplicacion
// aparecen milimetros de diferencia (etapa D). Esta etapa los corre UNO A UNO
// en los dos escenarios y dice en cual se separan: el primero que cambie
// `position`, `skinIndex`, `skinWeight` o el esqueleto al que una malla esta
// ligada es el que depende de las mallas vecinas y por tanto el que un GLB
// recortado rompe en silencio.
// ---------------------------------------------------------------------------
if (STAGES.includes('S')) {
  console.log('--- S) EL PASE QUE DEJA DE COINCIDIR ------------------------------');
  if (!existsSync(trimmedPath)) {
    console.log('no hay GLB recortado; corre la etapa C primero.');
  } else {
    const { layerForMaterial } = await import('../src/lib/materialColors.ts');
    const { unmangleForearmMeshes } = await import('../src/lib/rigForearmUnmangle.ts');
    const { inflateSkinShell } = await import('../src/lib/skinShellInflate.ts');
    const { repairFaceWinding } = await import('../src/lib/faceWinding.ts');
    const { bindClaviclesToShoulderGirdle } = await import('../src/lib/clavicleBinding.ts');
    const { bridgeShoulderSkin } = await import('../src/lib/shoulderSkinBridge.ts');
    const { gradeShoulderMuscleBinding } = await import('../src/lib/shoulderMuscleBinding.ts');
    const { blendHipSkin } = await import('../src/lib/rigHipSkin.ts');
    const { regradeAnkleCrossers } = await import('../src/lib/rigAnkleRebind.ts');
    const { smoothTrunkSkin, vertebraHeights } = await import('../src/lib/rigSpineSkin.ts');
    const { blendPelvicOrigins } = await import('../src/lib/rigPelvicOrigin.ts');
    const { redistributeSkinRootWeight } = await import('../src/lib/rigSkinRootWeight.ts');
    const { relaxSkinSeams } = await import('../src/lib/skinSeamRelax.ts');
    const { rebindArmBellies, reweightArmAboveElbow } = await import('../src/lib/rigArmRebind.ts');

    const layerOf = (mesh: THREE.Mesh) => {
      const first = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      return layerForMaterial((first as THREE.Material | undefined)?.name ?? null);
    };
    const skinCls = (mesh: THREE.Mesh) => (layerOf(mesh) === 'skin' ? 'skin' : 'other');

    type Pass = { name: string; run: (s: THREE.Object3D) => void };
    const passes: Pass[] = [
      { name: 'unmangleForearmMeshes', run: (s) => void unmangleForearmMeshes(s) },
      { name: 'inflateSkinShell', run: (s) => void inflateSkinShell(s) },
      { name: 'repairFaceWinding', run: (s) => void repairFaceWinding(s) },
      { name: 'bindClaviclesToShoulderGirdle', run: (s) => void bindClaviclesToShoulderGirdle(s) },
      { name: 'bridgeShoulderSkin', run: (s) => void bridgeShoulderSkin(s) },
      { name: 'gradeShoulderMuscleBinding', run: (s) => void gradeShoulderMuscleBinding(s) },
      { name: 'blendHipSkin', run: (s) => void blendHipSkin(s, skinCls as never) },
      {
        name: 'regradeAnkleCrossers',
        run: (s) =>
          void regradeAnkleCrossers(s, (m: THREE.Mesh) => {
            const l = layerOf(m);
            return l === 'muscle' || l === 'connective' ? 'soft' : 'other';
          }),
      },
      { name: 'smoothTrunkSkin', run: (s) => void smoothTrunkSkin(s, vertebraHeights(s), skinCls as never) },
      {
        name: 'blendPelvicOrigins',
        run: (s) =>
          void blendPelvicOrigins(s, (m: THREE.Mesh) => {
            const l = layerOf(m);
            return l === 'muscle' ? 'muscle' : l === 'connective' ? 'connective' : 'other';
          }),
      },
      {
        name: 'redistributeSkinRootWeight',
        run: (s) =>
          void redistributeSkinRootWeight(s, (m: THREE.Mesh) => {
            const l = layerOf(m);
            return l === 'skin' || l === 'muscle' || l === 'connective' ? l : 'other';
          }),
      },
      { name: 'relaxSkinSeams', run: (s) => void relaxSkinSeams(s) },
      {
        name: 'rebindArmBellies',
        run: (s) =>
          void rebindArmBellies(s, (m: THREE.Mesh) => {
            const l = layerOf(m);
            return l === 'muscle' ? 'muscle' : l === 'skin' ? 'skin' : 'other';
          }),
      },
      { name: 'reweightArmAboveElbow', run: (s) => void reweightArmAboveElbow(s) },
    ];

    // UN SOLO ESCENARIO POR PROCESO, cuando se pide.
    //
    // Medir los dos en el MISMO proceso no vale y esta medido: el primero paga
    // el calentamiento del JIT y la basura del segundo. Dos pasadas dieron
    // 6925/6175 ms (11% menos) y 4196/2697 ms (36% menos) para exactamente el
    // mismo trabajo. Con `--solo entero` / `--solo recortado` cada fichero se
    // mide en su propio proceso y las cifras ya se pueden comparar.
    const SOLO = arg('solo', '');
    if (SOLO) {
      const path = SOLO === 'recortado' ? trimmedPath : RIG;
      const scene = await loadThree(path);
      scene.updateMatrixWorld(true);
      let n = 0;
      scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) n++;
      });
      console.log(`solo ${SOLO}: ${path}`);
      console.log(`mallas three.js ... ${n}`);
      let total = 0;
      for (const p of passes) {
        const a = performance.now();
        p.run(scene);
        scene.updateMatrixWorld(true);
        const d = performance.now() - a;
        total += d;
        console.log(`  ${p.name.padEnd(30)} ${ms(d).padStart(9)}`);
      }
      console.log(`  ${'TOTAL'.padEnd(30)} ${ms(total).padStart(9)}`);
      process.exit(0);
    }

    const full = await loadThree(RIG);
    const trim = await loadThree(trimmedPath);
    full.updateMatrixWorld(true);
    trim.updateMatrixWorld(true);

    const index = (scene: THREE.Object3D) => {
      const m = new Map<string, THREE.SkinnedMesh>();
      scene.traverse((o) => {
        const sk = o as THREE.SkinnedMesh;
        if (sk.isSkinnedMesh) m.set(sk.name, sk);
      });
      return m;
    };
    const iF = index(full);
    const iT = index(trim);

    const diffNames = (): string[] => {
      const out: string[] = [];
      for (const [name, t] of iT) {
        const f = iF.get(name);
        if (!f) continue;
        let bad = false;
        for (const sem of ['position', 'skinIndex', 'skinWeight'] as const) {
          const at = t.geometry.getAttribute(sem);
          const af = f.geometry.getAttribute(sem);
          if (!at || !af || at.count !== af.count) { bad = true; break; }
          const ta = at.array as ArrayLike<number>;
          const fa = af.array as ArrayLike<number>;
          for (let i = 0; i < ta.length; i++) {
            if (Math.abs(ta[i] - fa[i]) > 1e-7) { bad = true; break; }
          }
          if (bad) break;
        }
        if (!bad) {
          const bt = t.skeleton?.bones.map((b) => b.name).join(',') ?? '';
          const bf = f.skeleton?.bones.map((b) => b.name).join(',') ?? '';
          if (bt !== bf) bad = true;
        }
        if (!bad && t.visible !== f.visible) bad = true;
        if (bad) out.push(name);
      }
      return out;
    };

    let already = new Set(diffNames());
    console.log(`de salida (recien cargados) ... ${already.size} mallas distintas`);
    let tFull = 0;
    let tTrim = 0;
    for (const p of passes) {
      const a0 = performance.now();
      p.run(full);
      const a1 = performance.now();
      p.run(trim);
      const a2 = performance.now();
      tFull += a1 - a0;
      tTrim += a2 - a1;
      full.updateMatrixWorld(true);
      trim.updateMatrixWorld(true);
      const now = diffNames();
      const nuevas = now.filter((n) => !already.has(n));
      console.log(
        `${p.name.padEnd(30)} entero ${ms(a1 - a0).padStart(8)}  recortado ${ms(a2 - a1).padStart(8)}  ` +
          `distintas ${String(now.length).padStart(4)}  NUEVAS ${String(nuevas.length).padStart(4)}` +
          (nuevas.length ? `  p.ej. ${nuevas.slice(0, 4).join(', ')}` : ''),
      );
      already = new Set(now);
    }
    console.log('');
    console.log(`SUMA de los pases COMPARTIDOS con el banco de render:`);
    console.log(`  entero (2659 mallas) .... ${ms(tFull)}`);
    console.log(`  recortado (1853) ........ ${ms(tTrim)}   (${(100 - (100 * tTrim) / tFull).toFixed(0)}% menos)`);
    console.log('  OJO: estos son los pases que rigPose comparte con la app, NO todo');
    console.log('  lo que hace RigModel. Es el ahorro del RECORTE sobre ESTA parte.');
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// X) ¿QUE ARMATURES NECESITA CADA REGION DE VERDAD?
//
// "Un GLB por region" solo vale si el contenido de una region se queda dentro
// de su region. Esto lo MIDE: recorre los movimientos de ROM, los demos de los
// tests ortopedicos y los demos de miotomas, resuelve cada movementId en
// BONE_MAP y dice a que armature pertenece el hueso que mueve.
// ---------------------------------------------------------------------------
if (STAGES.includes('X')) {
  console.log('--- X) ARMATURES QUE CADA REGION ACCIONA --------------------------');
  const { BONE_MAP } = await import('../src/lib/boneMap.ts');
  const { ALL_TESTS_BY_REGION, ALL_ROM_BY_REGION } = await import('../src/data/fullContent.ts');
  const { MYOTOMES } = await import('../src/data/neuro/myotomes.ts').catch(() => ({ MYOTOMES: null }) as never);

  /** Armature del hueso que mueve un movementId, segun BONE_MAP. */
  const armaturesOf = (id: string | null | undefined): string[] => {
    if (!id) return [];
    const c = BONE_MAP[id] as
      | { kind: string; armatureBase?: string; armature?: string }
      | undefined;
    if (!c) return ['(sin BONE_MAP)'];
    if (c.kind === 'spine') return ['Spine_Armature'];
    if (c.armatureBase === 'Shoulder_Armature') return ['Shoulder_Armature_R/L'];
    if (c.armatureBase === 'Leg_Armature') return ['Leg_Armature_R/L'];
    if (c.kind === 'chain') return ['Shoulder_Armature_R/L'];
    return [`(${c.kind})`];
  };

  const rows: { region: string; fuente: string; arm: Set<string>; cruza: string[] }[] = [];
  const OWN: Record<string, string> = {
    shoulder: 'Shoulder_Armature_R/L',
    elbow: 'Shoulder_Armature_R/L',
    cervical: 'Spine_Armature',
    thoracic: 'Spine_Armature',
    lumbar: 'Spine_Armature',
    hip: 'Leg_Armature_R/L',
    knee: 'Leg_Armature_R/L',
    ankle: 'Leg_Armature_R/L',
  };

  const add = (region: string, fuente: string, ids: (string | null | undefined)[], tag: string) => {
    const arm = new Set<string>();
    const cruza: string[] = [];
    for (const id of ids)
      for (const a of armaturesOf(id)) {
        arm.add(a);
        if (a !== OWN[region] && a !== '(sin BONE_MAP)' && !a.startsWith('(')) cruza.push(`${id} -> ${a}${tag}`);
      }
    rows.push({ region, fuente, arm, cruza });
  };

  for (const [region, list] of Object.entries(ALL_ROM_BY_REGION as Record<string, { id: string }[]>))
    add(region, 'ROM', list.map((m) => m.id), '');

  for (const [region, list] of Object.entries(
    ALL_TESTS_BY_REGION as Record<string, { id: string; demo?: { movementId: string; components?: { movementId: string }[] } }[]>,
  )) {
    const ids: string[] = [];
    for (const t of list) {
      if (!t.demo) continue;
      ids.push(t.demo.movementId, ...(t.demo.components ?? []).map((c) => c.movementId));
    }
    add(region, 'tests', ids, '');
  }

  const byRegion = new Map<string, Set<string>>();
  for (const r of rows) {
    const s = byRegion.get(r.region) ?? new Set<string>();
    for (const a of r.arm) s.add(a);
    byRegion.set(r.region, s);
    if (r.cruza.length)
      console.log(`${r.region}/${r.fuente}: CRUZA DE REGION -> ${[...new Set(r.cruza)].join(' | ')}`);
  }
  console.log('');
  console.log('region      armatures accionados');
  for (const [region, s] of byRegion)
    console.log(`${region.padEnd(11)} ${[...s].sort().join(' + ')}`);

  if (MYOTOMES) {
    const ids: string[] = [];
    for (const m of Object.values(MYOTOMES as Record<string, { demo?: { movementId: string } }>))
      if (m.demo?.movementId) ids.push(m.demo.movementId);
    const arms = new Set(ids.flatMap(armaturesOf));
    console.log('');
    console.log(`demos de MIOTOMAS (panel Neuro, disponible en toda region): ${ids.length} demos`);
    console.log(`  accionan: ${[...arms].sort().join(' + ')}`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// E) PARSE
// ---------------------------------------------------------------------------
if (STAGES.includes('E')) {
  console.log('--- E) COSTE DE PARSE (three.js, en Node) -------------------------');
  const timeParse = async (path: string, label: string) => {
    const buf = readFileSync(path);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const ld = new GLTFLoader();
    ld.setMeshoptDecoder(ThreeMeshoptDecoder);
    const t = performance.now();
    const gl = await new Promise<{ scene: THREE.Group }>((res, rej) => ld.parse(ab, '', res as never, rej));
    const parseMs = performance.now() - t;
    let meshes = 0;
    let bones = 0;
    gl.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes++;
      if ((o as THREE.Bone).isBone) bones++;
    });
    const t2 = performance.now();
    gl.scene.updateMatrixWorld(true);
    const mwMs = performance.now() - t2;
    console.log(
      `${label.padEnd(22)} ${B(statSync(path).size).padStart(14)}  parse ${ms(parseMs).padStart(8)}  ` +
        `updateMatrixWorld ${ms(mwMs).padStart(7)}  mallas ${meshes}  huesos ${bones}`,
    );
    return parseMs;
  };
  const a = await timeParse(RIG, 'entero');
  if (existsSync(trimmedPath)) {
    const b = await timeParse(trimmedPath, 'recortado');
    console.log(`ahorro de parse ... ${ms(a - b)}  (${(100 - (100 * b) / a).toFixed(0)}%)`);
  }
  console.log('');
}
