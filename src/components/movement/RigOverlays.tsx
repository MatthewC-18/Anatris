// src/components/movement/RigOverlays.tsx
//
// In-canvas premium overlays for the movement lab, layered on top of the skinned
// rig (RigModel) and driven by the SAME rigChannel:
//
//   1. REAL-MUSCLE HIGHLIGHT. The muscles active in the current phase (sent by
//      MovementControls with their role) glow on the active side: their real rig
//      meshes get a role-colored emissive clone material, so the eye goes to the
//      structure that works at that degree. Everything else stays as RigModel
//      painted it.
//   2. ROTATION-AXIS MARKER. A thin didactic axis line + rotation ring through
//      the driven joint, ORIENTED BY the active movement's rig.axis (data, not a
//      hardcoded axis). Toggleable.
//   3. PER-PLANE CAMERA FRAMING. On movement change, the camera eases to a view
//      that reads the plane (frontal for abduction, sagittal for flexion, an
//      oblique for rotation). The initial framing is left to RigViewer/AutoFit.
//
// FULLY REVERSIBLE: on unmount every cloned material is restored to the shared
// one RigModel assigned and disposed, and the marker group is removed. The lab
// canvas also unmounts wholesale when leaving the lab, so nothing leaks.
//
// PERF: the muscle resolution (id -> mesh names) is built ONCE at mount. Per
// command we only diff the small active-muscle set and touch those materials;
// there is no per-frame scene.traverse here.
//
// ASCII-only source; UI has no strings here; no `any`.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, type CameraControls } from '@react-three/drei';
import * as THREE from 'three';

import { layerChannel, rigChannel, type RigCommand } from './RigModel';
import { buildMuscleResolution, type MuscleResolution } from '../../lib/muscleResolver';
import { baseMaterialOf, cloneOverlayMaterial } from '../../lib/rigMaterialStack';
import { parseMeshName, type ParsedSide } from '../../lib/parseMeshName';
import { meshIsStructure } from '../../lib/clinicalStructures';
import { useAllMuscles } from '../../hooks/useMuscleResolution';
import { movementById } from '../../data/romByRegion';
import { readingAngleFor } from '../../lib/labCamera';
import {
  getBoneControl,
  MOVEMENT_PLANE,
  resolveArmatureName,
  rigSideFor,
  type GeomSide,
  type Side,
} from '../../lib/boneMap';
import type { RomMuscleRole } from '../../types/rom';
import { attachRim, paintEmber, setRim } from '../../lib/rigRim';
import { ROLE_TONE } from '../../lib/romRolePalette';
import { calloutChannel, type CalloutItem } from './calloutChannel';

// El tono del papel sale de UNA tabla (src/lib/romRolePalette.ts), compartida
// con la leyenda del panel: tres copias de estos cuatro hexadecimales
// garantizan que dejen de coincidir justo en un fotograma congelado.
const ROLE_GLOW = ROLE_TONE;
// EL TONO DEL PAPEL YA NO TOCA LA CARNE. Vive en el CONTORNO (ver
// src/lib/rigRim.ts, que trae la medicion de por que el pectoral salia verde
// menta) y en el texto del panel. `ROLE_GLOW` se sigue usando, pero como color
// de borde y de leyenda, no como emisivo del vientre.
//
// Cuanto contorno lleva un musculo encendido: un suelo visible desde el primer
// nivel de reclutamiento --para que el papel se lea tambien en un musculo que
// apenas trabaja-- y el resto proporcional al esfuerzo.
const RIM_FLOOR = 0.18;
const RIM_RANGE = 0.45;
// Peak emissive intensity per role (reached at activation level 1). The live glow
// is this scaled by the muscle's activation level, so a muscle fades in as it
// enters its recruitment range and brightens toward its peak effort. TUNED DOWN
// from the first premium pass (prime 1.05/assist 0.6/stab 0.42): at peak the
// muscle self-illuminated so uniformly it lost all form and read as a FLAT amber
// blob. These levels still say "on" clearly but let the studio light keep the
// muscle's dimensional shading -- see paintGlow.
// SUBIDOS AL PASAR A BRASA. Antes estos techos competian con un tono ajeno
// (teal, cian, violeta) que ya saturaba el canal por si solo; ahora el emisivo
// es el propio rojo del tejido, que es el canal MAS estrecho que hay, asi que
// hace falta mas intensidad para que "encendido" se lea. Medido: con 1,05 el
// pico compone #e45c40 y la luminancia sube 4,5x sobre el reposo, sin que el
// tono salga de 0-16 grados.
const ROLE_GLOW_MAX: Record<RomMuscleRole, number> = {
  'prime-mover': 1.05,
  // Un freno trabaja DURO: en una flexion de tronco el erector es el musculo que
  // mas tension soporta de la fase, asi que brilla como un motor, no como un
  // asistente. Lo que cambia es el CONTORNO, no la intensidad.
  'eccentric-control': 1.0,
  assistant: 0.7,
  stabilizer: 0.45,
};
// A faint floor so a barely-recruited muscle is still visibly "on" rather than
// invisible at low levels.
const GLOW_FLOOR = 0.15;

/** Live emissive intensity for a role at an activation level 0..1. */
function glowIntensity(role: RomMuscleRole, level: number): number {
  const l = level <= 0 ? 0 : level > 1 ? 1 : level;
  return GLOW_FLOOR + (ROLE_GLOW_MAX[role] - GLOW_FLOOR) * l;
}

/**
 * BRASA EN EL VIENTRE, PAPEL EN EL CONTORNO.
 *
 * Un musculo encendido sube de luminancia sin cambiar de tono: el emisivo es su
 * PROPIO rojo calentado (ver `paintEmber` en src/lib/rigRim.ts, con la medida de
 * por que el teal del freno salia verde menta y por que bajar la mezcla una
 * tercera vez no lo arreglaba). El difuso no se toca. El papel --motor, freno,
 * asistente, estabilizador-- se lee en el borde de Fresnel, en la leyenda de
 * cuatro chips del panel y en el texto del protagonista.
 */
function paintGlow(
  clone: THREE.MeshStandardMaterial,
  baseColor: THREE.Color,
  role: RomMuscleRole,
  level: number,
): void {
  const l = level <= 0 ? 0 : level > 1 ? 1 : level;
  paintEmber(clone, baseColor, glowIntensity(role, l));
  setRim(clone, ROLE_GLOW[role], RIM_FLOOR + RIM_RANGE * l);
}

// IMPLICATED emphasis: the structure a PATHOLOGY blames (from the readout banner)
// glows a warm "injured" orange and PULSES (see the useFrame), so the eye is drawn
// to WHERE the problem is on the model. Distinct from the cool/amber role glows.
const IMPLICATED_HEX = 0xf97316;
const IMPLICATED_COLOR3 = new THREE.Color(IMPLICATED_HEX);
/** Base emissive for an implicated mesh; the pulse breathes around it. */
const IMPLICATED_EMISSIVE = 1.0;

/** Paint an implicated structure with the warm injured emphasis (pulsed live). */
function paintImplicated(clone: THREE.MeshStandardMaterial, baseColor: THREE.Color): void {
  // Aqui el naranja SI puede entrar en el difuso: 0xf97316 esta en hue 25, al
  // borde de la banda del tejido, asi que una mezcla de 0,45 sobre el rojo deja
  // el musculo en hue ~20 y sigue leyendose como carne. Es el unico resalte que
  // mueve el tono, y lo que de verdad lo separa del resto es el PULSO, que el
  // useFrame le pone y ningun otro resalte tiene.
  clone.color.copy(baseColor).lerp(IMPLICATED_COLOR3, 0.45);
  clone.emissive.copy(IMPLICATED_COLOR3);
  clone.emissiveIntensity = IMPLICATED_EMISSIVE;
  // Y su contorno es el suyo, no el papel que llevara antes el mismo clon.
  setRim(clone, IMPLICATED_HEX, 0.7);
}

/**
 * Lado CLINICO -> nombre anatomico del lado, para elegir mallas.
 *
 * Es la identidad a proposito: 'R' es la derecha del paciente y la malla de la
 * derecha se llama 'right'. El cruce con la geometria del GLB lo resuelve
 * `sideOfMesh`, que es quien mira el signo de x.
 */
function parsedSide(side: Side): 'left' | 'right' {
  return side === 'R' ? 'right' : 'left';
}


// --- Manual-resistance overlay: the therapist's interaction with the patient. ---
// A physio never just watches the movement -- they RESIST it. Instead of a
// stylized prop, we place a REAL therapist HAND (extracted from the anatomy model,
// public/therapist-hand.glb -- palm + digits + wrist, ~2.5k verts) at the distal
// contact, pressing on the segment. That reads premium, not cartoonish.
//
// The GLB is normalized + reoriented; after the Blender Z-up -> glTF Y-up export
// its local frame is: FINGERS along Z (length 1), PALM NORMAL along Y, WIDTH along
// X. placeResistance orients the palm normal (+Y) along the resistance force and
// the fingers (Z) along the limb, then scales to the segment.
const THERAPIST_HAND_URL = '/therapist-hand.glb?v=1';
// A NITRILE-GLOVE blue-teal: unmistakably a clinician's hand, never confused with
// the patient's skin (a skin-toned hand blended into the arm and "no se apreciaba
// que era la mano del fisio").
const THERAPIST_GLOVE = 0x39a9c4;
useGLTF.preload(THERAPIST_HAND_URL);

// Which bone marks the DISTAL end of the segment a given driven bone moves. The
// therapist resists on that distal segment (a physio never resists at the joint
// itself). Verified names from scripts/dump-rig.mjs: humerus_gh -> forearm_flex
// (elbow), forearm_* -> hand_flex (wrist), shin_flex -> foot_flex (ankle).
const DISTAL_OF: Record<string, string> = {
  humerus_gh: 'forearm_flex',
  forearm_flex: 'hand_flex',
  forearm_rot: 'hand_flex',
  shin_flex: 'foot_flex',
  // LA CADERA FALTABA, y sin entrada se cae al descendiente MAS LEJANO, que
  // bajando por el fémur es el pie: en la flexión de cadera resistida la mano
  // del explorador aparecía en el TOBILLO. Se resiste en el muslo distal, justo
  // por encima de la rodilla, que es donde cae `shin_flex`.
  femur_base: 'shin_flex',
};

/** The therapist-hand material: a nitrile glove, clearly not the patient. */
function makeTherapistHandMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: THERAPIST_GLOVE,
    roughness: 0.45,
    metalness: 0.0,
    // A slight self-glow so the glove reads on the dark stage + pops off the skin.
    emissive: new THREE.Color(THERAPIST_GLOVE).multiplyScalar(0.22),
    side: THREE.DoubleSide,
  });
}

interface GlowEntry {
  original: THREE.Material;
  clone: THREE.MeshStandardMaterial;
  /** True when this mesh is emphasized as a pathology's implicated structure. */
  implicated: boolean;
}

export function RigOverlays(): JSX.Element {
  const { scene } = useThree();
  // LA ESCENA, ALCANZABLE EN DESARROLLO. Comprobar a ojo si una estructura se
  // enciende es imposible --un ligamento mide veinte pixeles bajo la piel-- y la
  // nota de resolveMuscleId ya dice que su tabla se verifico "contra el volcado
  // real de mallas (recorrido de window.__scene)", pero esa ventana no existia:
  // habia que ponerla a mano cada vez. Vite la elimina en produccion.
  if (import.meta.env.DEV) {
    (window as unknown as { __scene?: THREE.Object3D }).__scene = scene;
  }
  const controls = useThree((s) => s.controls) as CameraControls | null;
  const camera = useThree((s) => s.camera);
  // Y LA CAMARA, por la misma razon y para una pregunta concreta: si un demo
  // mueve un segmento que el encuadre de la region no contiene, ese segmento se
  // sale de pantalla y el boton parece no hacer nada. Con la camara alcanzable
  // se proyecta el hueso y se mide, en vez de discutirlo.
  if (import.meta.env.DEV) {
    (window as unknown as { __camera?: THREE.Camera }).__camera = camera;
  }
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  // The real therapist hand geometry (loaded once, reused for both hands).
  const handGltf = useGLTF(THERAPIST_HAND_URL) as unknown as { scene: THREE.Group };
  const handGeom = useMemo(() => {
    let g: THREE.BufferGeometry | null = null;
    handGltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !g) g = m.geometry;
    });
    return g;
  }, [handGltf]);
  const handGeomRef = useRef<THREE.BufferGeometry | null>(handGeom);
  handGeomRef.current = handGeom;

  // Muscle-id -> mesh-names resolution and a name -> mesh lookup, built from the
  // rig scene. Held in refs and populated from an EFFECT (post-commit), with a
  // per-frame retry until the rig meshes exist.
  //
  // COLD-LOAD FIX: on the first mount the rig's <primitive> (RigModel) is attached
  // to the scene a tick AFTER this component renders, so building this at RENDER
  // time (useMemo) traversed an EMPTY scene -> the highlight resolved 0 meshes and
  // stayed inert (no glow) until an unrelated HMR remount happened to catch a
  // populated scene. That is why the colors showed during hot-reload but never on
  // a fresh page load. Building in an effect + retrying, then rebroadcasting the
  // current command, makes the glow appear on a cold load without any user input.
  const resolutionRef = useRef<MuscleResolution | null>(null);
  const meshByNameRef = useRef<Map<string, THREE.Mesh>>(new Map());
  // El universo de musculos resolubles: gratuito + premium ya descargado. Ver
  // la nota de `useAllMuscles`, que es donde estaba el defecto.
  const allMuscles = useAllMuscles();

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let tries = 0;
    const build = () => {
      if (cancelled) return;
      const names: string[] = [];
      const byName = new Map<string, THREE.Mesh>();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          names.push(m.name);
          byName.set(m.name, m);
        }
      });
      const res = buildMuscleResolution(allMuscles, names);
      const ready = res.meshNamesByMuscleId.size > 0;
      if (ready || tries > 180) {
        resolutionRef.current = res;
        meshByNameRef.current = byName;
        if (!ready) {
          // eslint-disable-next-line no-console
          console.warn(
            '[RigOverlays] muscle highlight resolved 0 meshes after load; ' +
              'rig mesh names may have changed (scene highlight will be inert).',
          );
        }
        // Rebroadcast the current command so the glow applies to the now-present
        // meshes even if the user has not touched the slider yet.
        rigChannel.set({});
        return;
      }
      tries += 1;
      raf = requestAnimationFrame(build);
    };
    build();
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
    // `allMuscles` ENTRA EN LAS DEPENDENCIAS a proposito: el contenido premium
    // de la region llega DESPUES del primer render, asi que una resolucion
    // construida una sola vez solo conoce el hombro y en el laboratorio de
    // cualquier otra region no se encenderia nada.
  }, [scene, allMuscles]);

  // Currently glowing meshes -> how to restore them.
  const glowRef = useRef<Map<THREE.Mesh, GlowEntry>>(new Map());
  // Mallas que un demo encendio A LA FUERZA porque su capa estaba apagada (la
  // conectiva lo esta por defecto), con la visibilidad que tenian antes. Se
  // devuelven tal cual al terminar el demo: encender un ligamento no puede
  // dejar la capa conectiva puesta a medias cuando el usuario la tenia quitada.
  const forcedVisibleRef = useRef<Map<THREE.Mesh, boolean>>(new Map());
  // Phase accumulator for the implicated-structure pulse (see useFrame).
  const pulseRef = useRef(0);
  // Didactic marker group (added to the scene, removed on unmount).
  const markerRef = useRef<THREE.Group | null>(null);
  // Manual-resistance group: therapist contact hand + force arrow + stabilizing
  // hand. Added to the scene, hidden until a resistance command sets it.
  const resistanceRef = useRef<THREE.Group | null>(null);
  // Track the last framed movement so we only reframe on a real change, and skip
  // the very first frame (AutoFit owns the initial framing).
  const lastFramedRef = useRef<string | null>(null);
  const firstRef = useRef(true);

  useEffect(() => {
    // --- Marker group: axis line + rotation ring, hidden until a command sets it.
    const marker = new THREE.Group();
    marker.renderOrder = 998;
    const axisMat = new THREE.LineBasicMaterial({
      color: 0xfcd34d,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    const axisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -0.32, 0),
      new THREE.Vector3(0, 0.32, 0),
    ]);
    const axisLine = new THREE.Line(axisGeom, axisMat);
    axisLine.renderOrder = 999;
    const ringGeom = new THREE.TorusGeometry(0.16, 0.006, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfcd34d,
      transparent: true,
      opacity: 0.5,
      depthTest: false,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2; // ring lies in the plane perpendicular to +Y
    ring.renderOrder = 999;
    marker.add(axisLine);
    marker.add(ring);
    marker.visible = false;
    scene.add(marker);
    markerRef.current = marker;

    // --- Manual-resistance group: the therapist's real hand pressing on the
    // distal segment (one clean contact hand -- the resisting hand). ---
    const resistance = new THREE.Group();
    const handMat = makeTherapistHandMaterial();
    const geom = handGeomRef.current;
    const contactHand = geom ? new THREE.Mesh(geom, handMat) : new THREE.Object3D();
    resistance.add(contactHand);
    resistance.visible = false;
    scene.add(resistance);
    resistanceRef.current = resistance;

    const yUp = new THREE.Vector3(0, 1, 0);
    const tmpQuat = new THREE.Quaternion();
    const tmpAxis = new THREE.Vector3();
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();

    /**
     * Find the driven joint object for a movement + side, or null.
     *
     * `side` es el lado DEL RIG (sufijo del armature), no el clinico: los dos
     * llamadores pasan `rigSideFor(cmd.side)`. Ver boneMap.rigSideFor.
     */
    const findJoint = (movementId: string, side: GeomSide): THREE.Object3D | null => {
      const ctrl = getBoneControl(movementId);
      if (!ctrl) return null;
      let armatureName: string | null = null;
      let boneName: string | null = null;
      if (ctrl.kind === 'joint') {
        armatureName = resolveArmatureName(ctrl.armatureBase, side);
        boneName = ctrl.bone;
      } else if (ctrl.kind === 'chain') {
        armatureName = resolveArmatureName('Shoulder_Armature', side);
        boneName = 'humerus_gh';
      } else {
        return null; // spine / unsupported: no single-axis marker
      }
      const root = scene.getObjectByName(armatureName);
      if (!root || !boneName) return null;
      let found: THREE.Object3D | null = null;
      root.traverse((o) => {
        if (found) return;
        if (o.name.replace(/_\d+$/, '') === boneName) found = o;
      });
      return found;
    };

    // Shoulder ELEVATION gestures get the dedicated Lyon-style protractor
    // (ShoulderRhythmArc) instead of this axis ring, so suppress the ring for them
    // to avoid two overlapping guides at the joint.
    const ELEVATION_ARC_IDS = new Set([
      'glenohumeral-abduction',
      'glenohumeral-flexion',
    ]);

    /** Orient + place the marker on the driven joint along the movement axis. */
    const placeMarker = (cmd: RigCommand): void => {
      const mk = markerRef.current;
      if (!mk) return;
      const show =
        cmd.showMarkers !== false &&
        !!cmd.movementId &&
        !ELEVATION_ARC_IDS.has(cmd.movementId);
      if (!show) {
        mk.visible = false;
        return;
      }
      const mv = movementById(cmd.movementId);
      const joint = cmd.movementId ? findJoint(cmd.movementId, rigSideFor(cmd.side)) : null;
      if (!mv?.rig || !joint) {
        mk.visible = false;
        return;
      }
      joint.updateWorldMatrix(true, false);
      joint.matrixWorld.decompose(worldPos, worldQuat, worldScale);
      // rig.axis is the bone's LOCAL rotation axis; bring it to world space.
      tmpAxis.set(mv.rig.axis[0], mv.rig.axis[1], mv.rig.axis[2]).normalize();
      tmpAxis.applyQuaternion(worldQuat).normalize();
      // Orient the marker (built around +Y) so +Y aligns with the world axis.
      tmpQuat.setFromUnitVectors(yUp, tmpAxis);
      mk.quaternion.copy(tmpQuat);
      mk.position.copy(worldPos);
      mk.visible = true;
    };

    // Scratch vectors for the resistance placement (avoid per-command allocation).
    const rJoint = new THREE.Vector3();
    const rDistal = new THREE.Vector3();
    const rContact = new THREE.Vector3();
    const rLever = new THREE.Vector3();
    const rForce = new THREE.Vector3();
    const rSurf = new THREE.Vector3();
    const rTmp = new THREE.Vector3();
    const WORLD_DOWN = new THREE.Vector3(0, -1, 0);

    /**
     * Place the therapist's hands + force arrow for a resisted movement.
     *
     * POSITION: the contact hand sits ~85% down the DISTAL segment (the moving
     * lever, e.g. the humerus for shoulder abduction), found via the named distal
     * bone -- a physio resists on the segment, not at the joint. The stabilizing
     * hand sits just proximal to the joint.
     *
     * DIRECTION: the force pushes the segment back toward its ANATOMICAL NEUTRAL
     * (the limb hangs down at rest), which is exactly "opposing the gesture" for
     * every elevation/flexion the lab drives -- and needs no per-movement axis
     * sign. Degenerate only for pure long-axis rotations, where it falls back to
     * straight down. Only the limb joints (single-axis joint / shoulder chain)
     * draw it.
     */
    const placeResistance = (cmd: RigCommand): void => {
      const grp = resistanceRef.current;
      if (!grp) return;
      const ctrl = cmd.movementId ? getBoneControl(cmd.movementId) : null;
      const isLimb = ctrl?.kind === 'joint' || ctrl?.kind === 'chain';
      const on = cmd.resistance === true && !!cmd.movementId && isLimb;
      const joint =
        on && cmd.movementId ? findJoint(cmd.movementId, rigSideFor(cmd.side)) : null;
      if (!on || !joint || !ctrl) {
        grp.visible = false;
        return;
      }
      joint.updateWorldMatrix(true, true);
      joint.getWorldPosition(rJoint);
      // Distal end of the moving segment, by NAME (robust across the twist bones
      // that share the joint origin). Chain (shoulder) moves the humerus.
      const drivenBone = ctrl.kind === 'chain' ? 'humerus_gh' : ctrl.bone;
      const distalName = DISTAL_OF[drivenBone];
      let distalObj: THREE.Object3D | null = null;
      if (distalName) {
        joint.traverse((o) => {
          if (!distalObj && o !== joint && o.name.replace(/_\d+$/, '') === distalName) {
            distalObj = o;
          }
        });
      }
      if (distalObj) {
        (distalObj as THREE.Object3D).getWorldPosition(rDistal);
      } else {
        // Fallback: farthest descendant.
        let bestD = 0;
        let has = false;
        joint.traverse((o) => {
          if (o === joint) return;
          o.getWorldPosition(rTmp);
          const d = rTmp.distanceToSquared(rJoint);
          if (d > bestD) {
            bestD = d;
            rDistal.copy(rTmp);
            has = true;
          }
        });
        if (!has) {
          grp.visible = false;
          return;
        }
      }
      // Full segment length (joint -> distal) sizes the hands + arrow so they are
      // always proportional to the limb, never the giant fixed-size gloves.
      const fullLen = rJoint.distanceTo(rDistal);
      // Contact 82% down the moving segment.
      rContact.copy(rJoint).lerp(rDistal, 0.82);
      // Limb long-axis direction (joint -> distal).
      rLever.copy(rDistal).sub(rJoint).normalize();
      // RESISTANCE direction: toward the contact's rest (limb hanging straight
      // down) -- i.e. opposing the gesture. The therapist pushes THIS way.
      rTmp.copy(rJoint).addScaledVector(WORLD_DOWN, rContact.distanceTo(rJoint));
      rForce.copy(rTmp).sub(rContact);
      if (rForce.lengthSq() < 0.04 * 0.04) rForce.copy(WORLD_DOWN);
      rForce.normalize();
      // The hand sits on the LEADING surface (the side the limb is moving toward =
      // -force) and its palm pushes BACK against the motion (into the limb, along
      // +force). Radial component only (perpendicular to the limb) so it rests on
      // the surface. If degenerate (pure rotation), fall back to the camera side.
      rSurf.copy(rForce).negate();
      rSurf.addScaledVector(rLever, -rSurf.dot(rLever));
      if (rSurf.lengthSq() < 1e-4) {
        cameraRef.current.getWorldPosition(rTmp);
        rSurf.copy(rTmp).sub(rContact).addScaledVector(rLever, -rSurf.dot(rLever));
      }
      rSurf.normalize();

      // A real hand ~0.66 of the upper-arm length.
      const handScale = THREE.MathUtils.clamp(fullLen * 0.66, 0.08, 0.2);
      placeHandGrip(contactHand, rContact, rSurf, rLever, handScale);
      grp.visible = true;
    };

    // Place the therapist hand GRIPPING the limb: palm on the surface (palm normal
    // = -surfaceOut, i.e. into the limb), fingers along the limb, sitting on the
    // camera-facing side so it's always visible. GLB local frame: palm-normal=+Y,
    // fingers=+Z, width=+X.
    const hX = new THREE.Vector3();
    const hY = new THREE.Vector3();
    const hZ = new THREE.Vector3();
    const hBasis = new THREE.Matrix4();
    const PATIENT_FRONT = new THREE.Vector3(0, 0, 1); // the patient faces +Z
    const placeHandGrip = (
      hand: THREE.Object3D,
      at: THREE.Vector3,
      surfaceOut: THREE.Vector3,
      limbAxis: THREE.Vector3,
      scale: number,
    ): void => {
      hY.copy(surfaceOut).negate(); // palm normal points INTO the limb
      // Fingers point POSTERIOR so the WRIST faces the patient's FRONT -- it reads
      // as the therapist reaching from IN FRONT of the patient, not from the
      // shoulder. Perpendicular to the palm normal; fall back to the limb axis if
      // the surface faces front/back (degenerate).
      hZ.copy(PATIENT_FRONT).negate();
      hZ.addScaledVector(hY, -hZ.dot(hY));
      if (hZ.lengthSq() < 1e-4) {
        hZ.copy(limbAxis).addScaledVector(hY, -limbAxis.dot(hY));
      }
      hZ.normalize();
      hX.crossVectors(hY, hZ).normalize();
      hBasis.makeBasis(hX, hY, hZ);
      hand.quaternion.setFromRotationMatrix(hBasis);
      hand.scale.setScalar(scale);
      // Rest the palm on the surface (lift the center out by ~half the hand
      // thickness so the glove sits ON the skin, not sunk into it).
      hand.position.copy(at).addScaledVector(surfaceOut, scale * 0.16);
    };

    // --- Highlight: glow the active muscles' real meshes + emphasize the
    // pathology's IMPLICATED structures, restore the rest.
    const applyHighlight = (cmd: RigCommand): void => {
      const glow = glowRef.current;
      const resolution = resolutionRef.current;
      const meshByName = meshByNameRef.current;
      const wantSide = parsedSide(cmd.side);

      // Resolve a muscle id to its meshes ON THE ACTIVE SIDE.
      //
      // WHERE THE MESH IS decides, not what it is called. Two independent naming
      // faults make the name useless here, both measured on the shipped rig:
      // every mesh of the pronators and of the flexor-pronator mass carries no
      // l/r marker at all, and several that DO carry one carry the wrong one
      // (the extensor carpi radialis patches named "...er"/"...or" sit on the
      // LEFT arm, 53 cm from the right one -- Z-Anatomy's suffixes are mirrored
      // in this export, as the lats helper code notes too). Trusting the name lit
      // the opposite elbow during a test, which is what reads on screen as a
      // muscle floating loose beside the arm being examined.
      //
      // The name is still the fallback for genuinely midline geometry, where the
      // x sign carries no information.
      const LATERAL_M = 0.04;
      const sideOfMesh = (name: string, mesh: THREE.Mesh): ParsedSide => {
        if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
        const c = mesh.geometry.boundingSphere!.center.clone().applyMatrix4(mesh.matrixWorld);
        // +x es la IZQUIERDA anatomica en este GLB. Estaba al contrario, de modo
        // que el brillo iba al brazo opuesto al accionado -- que es justo lo que
        // el comentario de arriba atribuyo a "sufijos espejados" de Z-Anatomy.
        // No lo estan: emparejando 950 mallas, el sufijo `l` cae en +x el 99%
        // de las veces (`npm run audit-laterality`). Lo que estaba espejado era
        // esta lectura.
        if (Math.abs(c.x) >= LATERAL_M) return c.x > 0 ? 'left' : 'right';
        return parseMeshName(name).side;
      };
      const forMuscleMeshes = (muscleId: string, cb: (mesh: THREE.Mesh) => void): void => {
        const names = resolution?.meshNamesByMuscleId.get(muscleId);
        if (!names) return;
        for (const name of names) {
          const mesh = meshByName.get(name);
          if (!mesh || !mesh.visible) continue;
          const side = sideOfMesh(name, mesh);
          if (side !== wantSide && side !== 'center') continue;
          cb(mesh);
        }
      };

      // Target map: normal activation glow first (level drives intensity), then
      // overlay the implicated flag so those meshes get the injured emphasis.
      const targets = new Map<
        THREE.Mesh,
        { role: RomMuscleRole; level: number; implicated: boolean }
      >();
      const list = resolution ? cmd.highlight ?? [] : [];
      // Y de paso, a quien se le pone ETIQUETA. Las etiquetas vivas del
      // escenario (LabCallouts) necesitan saber donde esta cada musculo que se
      // enciende, y eso se resuelve AQUI: las mismas mallas, del mismo lado,
      // con el mismo resolutor. Una segunda resolucion en otro fichero seria la
      // forma mas segura de que la etiqueta y el brillo dejaran de coincidir.
      // La guia apunta a la malla mas grande del musculo, que es su vientre.
      const callouts: CalloutItem[] = [];
      for (const h of list) {
        const level = h.level ?? 1;
        let belly: THREE.Mesh | null = null;
        let bellyR = -1;
        forMuscleMeshes(h.muscleId, (mesh) => {
          if (!targets.has(mesh)) targets.set(mesh, { role: h.role, level, implicated: false });
          // `sideOfMesh` ya ha calculado la esfera de esta malla.
          const r = mesh.geometry.boundingSphere?.radius ?? 0;
          if (r > bellyR) {
            bellyR = r;
            belly = mesh;
          }
        });
        // EN UN DEMO, EL NOMBRE SIN CIFRA. Los paneles de pruebas y de miotomas
        // empujan su musculo con `level: 1` fijo: no es una activacion medida,
        // es "este es el musculo de la prueba". La etiqueta lo imprimia como
        // "Gastrocnemio 100%" en Thompson, una prueba en la que el paciente
        // esta RELAJADO y se le comprime la pantorrilla (captura del demo, a 1
        // grado del bucle ya decia 100%). `detail: ''` quita la cifra
        // (LabCallouts.cifra) y deja el nombre.
        if (belly)
          callouts.push({
            id: h.muscleId,
            role: h.role,
            level,
            mesh: belly,
            ...(cmd.demo ? { detail: '' } : {}),
          });
      }
      calloutChannel.set(callouts);
      // LAS ESTRUCTURAS NO MUSCULARES (ligamento, menisco, capsula, labrum).
      //
      // No pasan por `resolution`, que es un indice de MUSCULOS: se resuelven
      // por patron contra el nombre de malla (CLINICAL_STRUCTURES). Y hay que
      // FORZARLAS VISIBLES, porque la capa conectiva esta apagada por defecto
      // en el laboratorio: sin esto el resalte se aplicaba a mallas invisibles
      // y el boton Demostrar seguia sin encender nada, que es el sintoma que se
      // venia arreglando.
      const structureIds = cmd.structures ?? [];
      const forced = forcedVisibleRef.current;
      const wantedStructureMeshes = new Set<THREE.Mesh>();
      if (structureIds.length) {
        for (const [name, mesh] of meshByName) {
          let hit = false;
          for (const id of structureIds) {
            if (meshIsStructure(id, name)) {
              hit = true;
              break;
            }
          }
          if (!hit) continue;
          // El lado se decide por geometria, igual que en los musculos: los
          // sufijos l/r del GLB no son de fiar (ver la nota de sideOfMesh).
          const side = sideOfMesh(name, mesh);
          if (side !== wantSide && side !== 'center') continue;
          wantedStructureMeshes.add(mesh);
          if (!forced.has(mesh)) forced.set(mesh, mesh.visible);
          mesh.visible = true;
          mesh.userData.demoStructure = true;
        }
      }
      // Devolver las que ya no hacen falta a como estaban.
      let devueltas = 0;
      for (const [mesh, was] of forced) {
        if (wantedStructureMeshes.has(mesh)) continue;
        delete mesh.userData.demoStructure;
        mesh.visible = was;
        forced.delete(mesh);
        devueltas++;
      }
      // "COMO ESTABAN" PUEDE HABER CAMBIADO. `was` es la visibilidad de cuando
      // empezo el demo; si mientras corria se encendio su capa (la bolsa
      // subacromial en Neer, con "Bolsas serosas"), al parar se apagaba justo la
      // del lado del demo con la capa encendida (hallado en la revision de la
      // tanda 2a). Quien sabe la visibilidad de AHORA es RigModel, por capa y por
      // diseccion: un aviso sin cambios a `layerChannel` le hace volver a
      // aplicarla, ya sin la marca del demo.
      if (devueltas > 0) layerChannel.set({});

      const implicatedIds = resolution ? cmd.implicated ?? [] : [];
      for (const id of implicatedIds) {
        forMuscleMeshes(id, (mesh) => {
          const t = targets.get(mesh);
          if (t) t.implicated = true;
          else targets.set(mesh, { role: 'prime-mover', level: 1, implicated: true });
        });
      }
      // La estructura bajo examen lleva el enfasis de "implicada" (el pulso
      // calido), no el brillo de motor: un cruzado anterior no mueve nada, se
      // esta valorando.
      for (const mesh of wantedStructureMeshes) {
        const t = targets.get(mesh);
        if (t) t.implicated = true;
        else targets.set(mesh, { role: 'prime-mover', level: 1, implicated: true });
      }

      // Remove glow from meshes no longer targeted. Only put the original back if
      // the mesh is still wearing OUR clone: RigModel's selection highlight dresses
      // the same meshes, and restoring blindly handed a mesh a material the other
      // system had already replaced (and left ours disposed under it).
      for (const [mesh, entry] of glow) {
        if (!targets.has(mesh)) {
          // `entry.original` es el material DE BASE, nunca el clon del otro
          // sistema: ver src/lib/rigMaterialStack.ts.
          if (mesh.material === entry.clone) mesh.material = entry.original;
          entry.clone.dispose();
          glow.delete(mesh);
        }
      }
      // Add / update glow on targeted meshes, refreshed every command so it tracks
      // the arc. Implicated meshes get the warm injured emphasis (pulsed by the
      // useFrame); the rest get the role glow.
      for (const [mesh, { role, level, implicated }] of targets) {
        let entry = glow.get(mesh);
        if (!entry) {
          // Clone the shared material so only THIS mesh glows. El "original"
          // que se guarda es el DE BASE: si la malla ya llevaba encima el
          // resalte de seleccion, guardar ese clon dejaba al musculo encendido
          // para siempre (src/lib/rigMaterialStack.ts).
          const src = mesh.material as THREE.MeshStandardMaterial;
          const clone = cloneOverlayMaterial(src);
          // El contorno se engancha UNA vez, al clonar: `attachRim` escribe
          // `onBeforeCompile`, y cambiarlo despues costaria recompilar.
          attachRim(clone);
          mesh.material = clone;
          entry = {
            original: baseMaterialOf(src) as THREE.MeshStandardMaterial,
            clone,
            implicated,
          };
          glow.set(mesh, entry);
        }
        entry.implicated = implicated;
        const baseColor = (entry.original as THREE.MeshStandardMaterial).color;
        if (implicated) paintImplicated(entry.clone, baseColor);
        else paintGlow(entry.clone, baseColor, role, level);
      }
    };

    // --- DESDE DONDE SE MIRA CADA MOVIMIENTO, al cambiar de movimiento.
    //
    // Los angulos los decide `labCamera.readingAngleFor`, no esta funcion: el
    // reparto por planos vivia aqui escrito a mano y comparaba la cadena EXACTA
    // ('Sagital', 'Transversal'), asi que los movimientos cuyo plano esta
    // escrito 'Transverso' -- los de cadera y codo -- se quedaban sin vista, y
    // una rotacion de cadera se reproducia desde el tres cuartos de entrada,
    // donde no se aprecia nada. Tambien espejaba el azimut para el lado
    // izquierdo partiendo de que la derecha estaba en +x, que es al contrario
    // (ver boneMap.rigSideFor): la camara se iba al lado opuesto al que se
    // mueve y el tronco tapaba el miembro.
    const planeView = (cmd: RigCommand): { azimuth: number; polar: number; plane: string } => {
      // EL PLANO DE RESPALDO. Un demo puede mover otra region cuyo contenido no
      // ha llegado (el Lasègue en la lumbar mueve la cadera): sin plano la
      // camara se giraba de frente. Ver boneMap.MOVEMENT_PLANE.
      const plane =
        movementById(cmd.movementId)?.plane ?? MOVEMENT_PLANE[cmd.movementId ?? ''] ?? '';
      const angle = readingAngleFor(plane, cmd.side);
      return {
        azimuth: angle ? THREE.MathUtils.degToRad(angle.azimuthDeg) : 0,
        polar: angle ? THREE.MathUtils.degToRad(angle.polarDeg) : 1.35,
        plane,
      };
    };

    const frameForPlane = (cmd: RigCommand): void => {
      if (!controls || !cmd.movementId) return;
      const { azimuth, polar, plane } = planeView(cmd);
      if (firstRef.current) {
        firstRef.current = false;
        lastFramedRef.current = `${cmd.movementId}|${cmd.side}`;
        // Orient the INITIAL view to the gesture's plane so the lab opens already
        // reading the movement -- entering the KNEE (sagittal flexion) lands on a
        // LATERAL/side-on view, where the knee fold reads in profile instead of the
        // muscles piling up in an oblique 3/4. Done instantly (no transition) so it
        // is in place before AutoFit's fitToBox, which only dollies to frame and
        // preserves this orientation. Frontal (shoulder) keeps AutoFit's 3/4 look.
        if (!/^frontal/i.test(plane)) {
          void controls.rotateTo(azimuth, polar, false);
        }
        return;
      }
      // Por gesto Y LADO: el Lasègue cruzado mueve el mismo gesto que el
      // Lasègue con la otra pierna, y la camara tiene que pasarse a ese lado.
      const key = `${cmd.movementId}|${cmd.side}`;
      if (key === lastFramedRef.current) return;
      lastFramedRef.current = key;
      void controls.rotateTo(azimuth, polar, true);
    };

    const onCommand = (cmd: RigCommand): void => {
      applyHighlight(cmd);
      placeMarker(cmd);
      placeResistance(cmd);
      frameForPlane(cmd);
    };

    onCommand(rigChannel.get());
    const unsub = rigChannel.subscribe(onCommand);

    return () => {
      unsub();
      // Sin laboratorio no hay nada que etiquetar.
      calloutChannel.set([]);
      // Restore every glowing mesh and dispose its clone -- again, only the meshes
      // still wearing ours.
      for (const [mesh, entry] of glowRef.current) {
        if (mesh.material === entry.clone) mesh.material = entry.original;
        entry.clone.dispose();
      }
      glowRef.current.clear();
      // Remove + dispose the marker and the resistance group. The therapist-hand
      // meshes SHARE the cached GLB geometry (handGeomRef) -- never dispose that,
      // or the drei useGLTF cache breaks; only dispose our own geometry/materials.
      const sharedHand = handGeomRef.current;
      const disposeGroup = (grp: THREE.Group | null): void => {
        if (!grp) return;
        scene.remove(grp);
        grp.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry && m.geometry !== sharedHand) m.geometry.dispose();
          const mat = m.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose();
        });
      };
      disposeGroup(markerRef.current);
      markerRef.current = null;
      disposeGroup(resistanceRef.current);
      resistanceRef.current = null;
      const habia = forcedVisibleRef.current.size;
      for (const [mesh, was] of forcedVisibleRef.current) {
        delete mesh.userData.demoStructure;
        mesh.visible = was;
      }
      forcedVisibleRef.current.clear();
      // Lo mismo al desmontar: la visibilidad buena es la de las capas de ahora.
      if (habia > 0) layerChannel.set({});
    };
    // resolution/meshByName are read from refs (populated post-load), so they are
    // intentionally not deps; the retry effect rebroadcasts once they are ready.
  }, [scene, controls]);

  // Pulse the implicated ("injured") meshes so the eye is drawn to WHERE the
  // pathology localizes. No-op (early return) when nothing is implicated, so the
  // normal glow stays perfectly steady.
  useFrame((_, dt) => {
    const glow = glowRef.current;
    let any = false;
    for (const [, e] of glow) {
      if (e.implicated) {
        any = true;
        break;
      }
    }
    if (!any) return;
    pulseRef.current += dt;
    const s = 0.7 + 0.4 * Math.sin(pulseRef.current * 3.4); // ~0.3 .. 1.1
    for (const [, e] of glow) {
      if (e.implicated) e.clone.emissiveIntensity = IMPLICATED_EMISSIVE * s;
    }
  });

  return <group />;
}
