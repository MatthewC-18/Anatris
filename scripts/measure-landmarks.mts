// Measures the world-space Y of the landmarks the Explorar region fade bands are
// authored against, so REGION_FADE in regiones.ts is set from the real model
// instead of guessed. Prints min/center/max Y per landmark mesh.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';

const buf = readFileSync('C:/Users/Matthew/Documents/Fisio/public/modelo-opt.dec.glb');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group;
scene.updateMatrixWorld(true);

const WANTED = [
  /^Acetabular_labrum/i,
  /^Hip_bone/i,
  /^Sacrum/i,
  /^Coccyx/i,
  /^Femur|^Femu/i,
  /^Patella/i,
  /^Tibia/i,
  /^Fibula/i,
  /^Talus/i,
  /^Calcaneus/i,
  /^Humerus/i,
  /^Scapula/i,
  /^Clavicle/i,
  /^Radius/i,
  /^Ulna/i,
  /^Vertebra_C7/i,
  /^Vertebra_T1_/i,
  /^Vertebra_T12/i,
  /^Vertebra_L1_/i,
  /^Vertebra_L5/i,
  /^Atlas_\(C1\)/i,
  /^Greater_trochanter/i,
  /^Olecranon/i,
  /^Skull/i,
];

const box = new THREE.Box3();
const rows: string[] = [];
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  if (!WANTED.some((re) => re.test(m.name))) return;
  box.setFromObject(m);
  if (!isFinite(box.min.y) || box.isEmpty()) return;
  rows.push(
    `${m.name.padEnd(34)} y[${box.min.y.toFixed(3)} .. ${box.max.y.toFixed(3)}]  x[${box.min.x.toFixed(2)}..${box.max.x.toFixed(2)}]`,
  );
});
rows.sort();
console.log(rows.join('\n'));

const whole = new THREE.Box3().setFromObject(scene);
console.log(`\nwhole scene y[${whole.min.y.toFixed(2)} .. ${whole.max.y.toFixed(2)}]`);
