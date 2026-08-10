// scripts/harness/neuro3d.ts
//
// LOOK AT THE 3D DERMATOME without booting the app. Loads the real rig, runs the
// same resolver the app runs (src/lib/neuroSkin.ts) and paints one root.
//
//   npm run dev
//   open http://localhost:5173/scripts/harness/neuro3d.html?figure=lower-limb&root=S1&view=back
//
// Not shipped: vite builds only index.html (no rollupOptions.input), so this page
// never enters dist.
//
// It exists because it caught the bug no unit test could. three's GLTFLoader
// SANITISES node names -- "Anterior region of forearm.001" arrives as
// "Anterior_region_of_forearm_1", and "Dorsum of hand.l" as "Dorsum_of_handl" with
// the laterality letter glued on -- so the first canonicaliser, written against the
// names inside the GLB, matched 1 patch out of 486. Every other check was green.
//
// This harness does NOT reproduce RigModel's duplicate-mesh culling, so the body
// appears doubled and one shell of each pair is left unpainted. That is an artefact
// of the harness, not of the app.
//
// It is also LIT MORE DIMLY than the product, which uses a studio IBL, a rim light
// and a higher exposure. A pigment tuned to read here came out pale in the app once
// already -- trust this page for WHERE a territory lands, not for how saturated it
// should be.
//
// Paths are relative to the repo root because vite serves it as the project root.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { resolvePatches, ownedPatches } from '../../src/lib/neuroSkin';
import { pigmentFor, type PlateFigure } from '../../src/data/neuro/plate';
import { materialIsSkin } from '../../src/lib/materialColors';

const q = new URLSearchParams(location.search);
const figure = (q.get('figure') ?? 'lower-limb') as PlateFigure;
const root = q.get('root') ?? 'S1';
const view = q.get('view') ?? 'front';

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x0b1120, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.5);
key.position.set(2, 3, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9ec5ff, 1.0);
rim.position.set(-2, 2, -3);
scene.add(rim);

const loader = new GLTFLoader();
await MeshoptDecoder.ready;
loader.setMeshoptDecoder(MeshoptDecoder as unknown as Parameters<typeof loader.setMeshoptDecoder>[0]);

const gltf = await loader.loadAsync('/cuerpo-rig.opt.glb');
scene.add(gltf.scene);

// Mimic what RigModel does for skin: tag it, hide everything else, so the harness
// shows the same surface the app shows.
const skin: THREE.Mesh[] = [];
gltf.scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const mat = Array.isArray(m.material) ? m.material[0] : m.material;
  const name = (mat as THREE.Material | undefined)?.name ?? '';
  if (materialIsSkin(name)) {
    m.userData.rigLayer = 'skin';
    m.material = new THREE.MeshStandardMaterial({ color: 0xd7a88f, roughness: 0.72 });
    skin.push(m);
  } else {
    m.visible = false;
  }
});

const c = new THREE.Vector3();
const patches = resolvePatches(
  skin.map((mesh) => {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox!;
    bb.getCenter(c);
    mesh.localToWorld(c);
    const lo = mesh.localToWorld(bb.min.clone());
    const hi = mesh.localToWorld(bb.max.clone());
    return { ref: mesh, name: mesh.name, x: c.x, y: c.y, span: Math.abs(hi.x - lo.x) };
  }),
);

// Two strengths, as the app draws them: solid where the rig is precise, a wash
// where it only knows the region. See confidenceFor in src/lib/neuroSkin.ts.
const mine = ownedPatches(patches, figure, root);
const pigment = new THREE.Color(pigmentFor(figure, root));
for (const { patch, confidence } of mine) {
  const sure = confidence === 'sure';
  patch.ref.material = new THREE.MeshStandardMaterial({
    color: pigment.clone().lerp(new THREE.Color(0xffffff), sure ? 0.06 : 0.02),
    emissive: pigment.clone(),
    emissiveIntensity: sure ? 0.4 : 0.18,
    roughness: 0.55,
    transparent: !sure,
    opacity: sure ? 1 : 0.5,
    depthWrite: sure,
  });
}

// Frame the limb the root belongs to.
const box = new THREE.Box3();
for (const { patch } of mine) box.expandByObject(patch.ref);
const size = box.getSize(new THREE.Vector3());
const centre = box.getCenter(new THREE.Vector3());
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 50);
const dist = Math.max(size.x, size.y) * 1.7 + 0.3;
const z = view === 'back' ? -dist : dist;
camera.position.set(centre.x * 0.3, centre.y, z);
camera.lookAt(centre.x * 0.3, centre.y, 0);

renderer.render(scene, camera);
document.getElementById('tag')!.textContent =
  `${figure} · ${root} · ${view} · ${mine.filter((m) => m.confidence === 'sure').length} firmes + ` +
  `${mine.filter((m) => m.confidence === 'broad').length} lavados de ${skin.length}`;
(window as unknown as { __ready: boolean }).__ready = true;
