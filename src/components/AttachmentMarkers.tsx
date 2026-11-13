// src/components/AttachmentMarkers.tsx
//
// Renders 3D "pin" markers at the origin and/or insertion of the currently
// selected muscle, driven by the store's `partFocus`.
//
// WHY THIS EXISTS:
// Z-Anatomy ships tiny point-meshes (materials "Origin-*" / "End-*") that mark
// roughly where a muscle attaches, but they are visually negligible — a couple
// of pixels. Trying to recolor those meshes is pointless. Instead we read their
// WORLD POSITION and draw our own, controllable marker there: a glowing sphere
// with a soft halo and a camera-facing text label. This turns an invisible dot
// into a clear teaching pin ("Insertion: greater tubercle"), anchored at the
// anatomically-correct spot the model already knows.
//
// IMPORTANT — the markers are APPROXIMATE. Z-Anatomy places them near the
// attachment, not with surgical precision. Good enough for teaching the
// landmark a student will palpate; not a substitute for a true insertion
// footprint. Communicate that in UI copy if precision is implied.
//
// This component lives INSIDE the Canvas. It does not touch AnatomyModel's
// material/highlight logic — it only adds overlay geometry.
//
// EL TEXTO YA NO VA AQUI. Cada punto llevaba su propio sprite de texto de 5 cm
// en el mundo, todos con el mismo texto: apilados, ilegibles y mas grandes al
// acercar la camara ("sale muy grande, uno encima de otro, y no se lee"). Los
// puntos se quedan (nucleo + halo, en 3D) y el texto va UNA vez, en pantalla y
// con tamano fijo, con una linea guia a cada punto: AttachmentCallout.tsx, al
// que este componente le publica los puntos.

import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnatomyStore } from '../store/anatomyStore';
import { parseMeshName } from '../lib/parseMeshName';
import { getLandmarks } from '../data/attachmentLandmarks';
import { mergeNearbyMarkers, resolveAttachmentPart } from '../lib/attachmentParts';
import { attachmentCallout } from './AttachmentCallout';
import { pinScreenScale } from '../lib/attachmentCallout';
import type { MuscleResolution } from '../lib/muscleResolver';
import type { SideFilter } from '../store/anatomyStore';

// Colors match the panel/toolbar accent for each part so the UI and the 3D
// read as the same action. Origin = warm amber, Insertion = teal/green.
const ORIGIN_COLOR = 0xffb24d;
const INSERTION_COLOR = 0x2ee6a6;

// Marker sizing is in world units. A physio reviewing the shoulder wrote
// "Origen: puntos muy grandes, no se diferencia" -- at the old 1.2 cm pin and
// 2.6 cm halo, two attachments a few centimetres apart merged into one glowing
// blob and neither could be told from the other. Halved, so a pin reads as a
// point ON a landmark rather than as the landmark.
const PIN_RADIUS = 0.006;
const HALO_RADIUS = 0.013;
// El halo respira: su escala va de 1 - HALO_PULSE a 1 + HALO_PULSE.
const HALO_PULSE = 0.18;
// TOPE EN PANTALLA. El tamano de mundo vale lejos, pero al acercar la camara el
// nucleo llego a 206 px de diametro y el halo a mas del doble (medido en
// capturas, ver pinScreenScale): tapaban el sitio que se queria ver. El halo, en
// lo mas alto de su pulso, no pasa de 22 px; asi el nucleo de la esfera (origen)
// queda en ~8,6 px y el del octaedro (insercion) en ~11,6, los dos dentro del
// anillo de pantalla (12,75 px de diametro interior, AttachmentCallout).
const HALO_MAX_PX = 22;

interface AttachmentTarget {
  position: THREE.Vector3;
  part: 'origin' | 'insertion';
  /** El accidente oseo del mapa de referencias, o vacio. */
  landmark: string;
}

interface AttachmentMarkersProps {
  resolution: MuscleResolution;
}

/** Does a parsed mesh's side pass the current side filter? */
function sidePasses(side: 'left' | 'right' | 'center', filter: SideFilter): boolean {
  if (filter === 'both') return true;
  if (side === 'center') return true;
  return side === filter;
}

export function AttachmentMarkers({ resolution }: AttachmentMarkersProps) {
  const { scene } = useThree();
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);
  const partFocus = useAnatomyStore((s) => s.partFocus);
  const sideFilter = useAnatomyStore((s) => s.sideFilter);

  const groupRef = useRef<THREE.Group>(null);
  const haloRefs = useRef<THREE.Mesh[]>([]);
  const pinRefs = useRef<THREE.Group[]>([]);
  const clockRef = useRef(0);
  // Memoria de trabajo del tope en pantalla, reutilizada en cada fotograma.
  const work = useRef(new THREE.Vector3()).current;

  // Resolve the world positions of the focused part's marker meshes for the
  // selected muscle. Recomputed when selection / part / side changes.
  const [targets, setTargets] = useState<AttachmentTarget[]>([]);

  useEffect(() => {
    if (selectedMuscleId == null || partFocus == null) {
      setTargets([]);
      return;
    }
    // Ensure world matrices are fresh before reading positions.
    scene.updateWorldMatrix(true, true);

    const out: AttachmentTarget[] = [];
    const wpos = new THREE.Vector3();

    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      // Does this mesh belong to the selected muscle?
      const muscle = resolution.muscleByMeshName.get(m.name);
      if (!muscle || muscle.id !== selectedMuscleId) return;
      // Is it the focused part? Z-Anatomy mislabels some attachments (the
      // pectoralis major's sternocostal head, the whole trapezius), so the
      // suffix is corrected against the app's own clinical content first --
      // otherwise "Inserción: cresta del troquíter" gets drawn on the sternum.
      const parsed = parseMeshName(m.name);
      const part = resolveAttachmentPart(muscle.id, m.name, parsed.part);
      if (part !== partFocus) return;
      if (!sidePasses(parsed.side, sideFilter)) return;

      m.getWorldPosition(wpos);
      if (!isFinite(wpos.x)) return;

      // Prefer the specific bony landmark ("Inserción: troquíter") when the
      // muscle has one in the landmark map; otherwise fall back to the generic
      // part name.
      const landmarks = getLandmarks(muscle.id);
      const landmark = landmarks
        ? partFocus === 'origin'
          ? landmarks.origin
          : landmarks.insertion
        : null;

      out.push({
        position: wpos.clone(),
        part: partFocus,
        landmark: landmark ?? '',
      });
    });

    // One landmark, one pin: the model can carry several point-meshes a
    // centimetre apart for a single attachment, and each used to get its own
    // sphere and its own label.
    setTargets(mergeNearbyMarkers(out));
  }, [selectedMuscleId, partFocus, sideFilter, resolution, scene]);

  // Los puntos y su texto, a la etiqueta de pantalla (AttachmentCallout). Una vez
  // por parte: el accidente es el mismo para todos los puntos de un musculo.
  useEffect(() => {
    if (targets.length === 0) {
      attachmentCallout.clear();
      return;
    }
    attachmentCallout.set({
      part: targets[0].part,
      text: targets[0].landmark,
      pins: targets.map((t) => t.position),
    });
  }, [targets]);
  useEffect(() => () => attachmentCallout.clear(), []);

  // Build the marker objects (sphere + halo + label) whenever targets change.
  // We rebuild rather than diff because the set is tiny (1-2 markers).
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Dispose previous children to avoid leaks.
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      disposeObject(child);
    }
    haloRefs.current = [];
    pinRefs.current = [];

    for (const t of targets) {
      const color = t.part === 'origin' ? ORIGIN_COLOR : INSERTION_COLOR;

      const pin = new THREE.Group();
      pin.position.copy(t.position);

      // Solid glowing core. SHAPE carries the part as well as colour: a SPHERE
      // for the origin, an OCTAHEDRON for the insertion. Colour alone was the
      // only difference before, which fails whenever both pins are on screen at
      // once, on a washed-out projector, or for a colour-blind user -- and the
      // review that prompted this said the two could not be told apart.
      const core = new THREE.Mesh(
        t.part === 'origin'
          ? new THREE.SphereGeometry(PIN_RADIUS, 24, 24)
          : new THREE.OctahedronGeometry(PIN_RADIUS * 1.35, 0),
        new THREE.MeshBasicMaterial({ color, depthTest: false }),
      );
      core.renderOrder = 998;
      pin.add(core);

      // Soft translucent halo (animated).
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(HALO_RADIUS, 24, 24),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.28,
          depthTest: false,
          depthWrite: false,
        }),
      );
      halo.renderOrder = 997;
      pin.add(halo);
      haloRefs.current.push(halo);

      group.add(pin);
      pinRefs.current.push(pin);
    }

    return () => {
      // On unmount, clean up.
      if (group) {
        while (group.children.length > 0) {
          const child = group.children[0];
          group.remove(child);
          disposeObject(child);
        }
      }
    };
  }, [targets]);

  // Gentle breathing pulse on the halos so the pin reads as "active".
  useFrame((state, delta) => {
    clockRef.current += delta;
    // El tope en pantalla: cada punto se encoge lo justo para que su halo, con
    // el pulso, no pase de HALO_MAX_PX a la profundidad a la que esta. Lejos no
    // se toca. La camara se pone al dia antes (los controles dejan la inversa a
    // medias hasta el render; ver AttachmentCallout).
    const cam = state.camera as THREE.PerspectiveCamera;
    if (cam.isPerspectiveCamera && pinRefs.current.length > 0) {
      cam.updateMatrixWorld();
      for (const pin of pinRefs.current) {
        pin.getWorldPosition(work).applyMatrix4(cam.matrixWorldInverse);
        pin.scale.setScalar(
          pinScreenScale(
            HALO_RADIUS * 2 * (1 + HALO_PULSE),
            -work.z,
            cam.fov,
            state.size.height,
            HALO_MAX_PX,
            cam.zoom,
          ),
        );
      }
    }
    const s = 1 + Math.sin(clockRef.current * 3) * HALO_PULSE;
    for (const halo of haloRefs.current) {
      halo.scale.setScalar(s);
      const mat = halo.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.22 + (Math.sin(clockRef.current * 3) + 1) * 0.08;
    }
  });

  return <group ref={groupRef} />;
}

/** Recursively dispose geometries / materials / textures of an object. */
function disposeObject(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (mesh as THREE.Mesh).material as
      | THREE.Material
      | THREE.Material[]
      | undefined;
    if (Array.isArray(mat)) mat.forEach(disposeMaterial);
    else if (mat) disposeMaterial(mat);
  });
  const sprite = obj as THREE.Sprite;
  if (sprite.isSprite && sprite.material) disposeMaterial(sprite.material);
}

function disposeMaterial(mat: THREE.Material) {
  const m = mat as THREE.MeshBasicMaterial | THREE.SpriteMaterial;
  if ('map' in m && m.map) m.map.dispose();
  mat.dispose();
}
