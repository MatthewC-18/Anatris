// src/components/movement/RigViewer.tsx
//
// Dedicated canvas for the movement lab: renders ONLY the skinned biomechanical
// rig (cuerpo-rig.glb) and drives it through rigChannel. Kept separate from the
// main Viewer3D so the heavy master atlas and the rig never load or overlap at
// once, and so the rig's real skeletal deformation is the whole show.
//
// Self-contained: own lighting (same analytic setup as Viewer3D, no network),
// own CameraControls, and a one-shot auto-fit onto the rig once it streams in.

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  AdaptiveDpr,
  AdaptiveEvents,
  CameraControls,
  Environment,
  Lightformer,
  useProgress,
} from '@react-three/drei';
import * as THREE from 'three';
import { RigModel, rigChannel, type RigCommand } from './RigModel';
import { RigLoadingScreen, noteRigPainted, noteRigReady } from './RigLoadingScreen';
import { RigOverlays } from './RigOverlays';
import { ShoulderRhythmArc } from './ShoulderRhythmArc';
import { NeuroSkinLayer } from './NeuroSkinLayer';
import { useIsCompact } from '../../hooks/useIsCompact';
import {
  FRAME_DEGENERATE_SIDE,
  FRAME_MIN_SIDE,
  FRAME_PAD_RATIO,
  extraFrameBonesFor,
  regionFrameBones,
  regionFrameCore,
  regionFrameHeadroom,
} from '../../lib/labFraming';
import { rigSideFor } from '../../lib/boneMap';
import { movementById } from '../../data/romByRegion';
import { buildLabArc } from '../../lib/romPhaseAtAngle';

/**
 * REENCUADRAR. El laboratorio no tenia forma de volver a la vista: la barra de
 * vistas (`ViewToolbar`) solo existe en Explorar, asi que una vez que el usuario
 * tocaba la rueda o arrastraba, la unica salida era recargar la pagina. En una
 * sesion de grabacion eso es una toma perdida por error.
 */
export const frameChannel = (() => {
  const listeners = new Set<() => void>();
  return {
    refit: (): void => listeners.forEach((l) => l()),
    subscribe: (l: () => void): (() => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
})();

/**
 * DPR DE GRABACION. El laboratorio pinta a 1,25x frente a los 2x del atlas, y
 * `performance.min` lo baja a 0,75x MIENTRAS el brazo se mueve, devolviendo la
 * nitidez 120 ms despues de parar: en video eso se ve como un enfoque que llega
 * tarde. `?hd=1` sube a 2x y desactiva la regresion, SOLO para grabar. El tope
 * de 1,25 se queda por defecto: esta ahi por los portatiles de los fisios.
 */
function wantsHd(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('hd') === '1';
  } catch {
    return false;
  }
}

// The rig is 1300+ skinned meshes; skinning is vertex-heavy and each mesh is a
// draw call. Cap DPR low so mid-range physio laptops stay smooth -- geometry,
// not render resolution, is what makes this model read.
//
// PHONES GET THEIR OWN BUDGET. A laptop absorbs 1.25x with MSAA; a phone paints
// those same 1300 draw calls onto a 3x panel with a fraction of the fill rate,
// and playback turned into the stutter the user reported. At 1x without MSAA the
// still frame is barely distinguishable at arm's length and the sweep actually
// runs. Geometry is what carries this model, not resolution.
const RIG_DPR: [number, number] = [1, 1.25];
const RIG_DPR_COMPACT: [number, number] = [1, 1];
/** Solo con `?hd=1`: la resolucion del atlas, para grabar. Ver `wantsHd`. */
const RIG_DPR_HD: [number, number] = [1, 2];

/**
 * Auto-fit the camera onto the rig once it has a valid bounding box, and AGAIN
 * whenever `refitKey` changes.
 *
 * The refit exists for the compact layout. There the canvas is a flex row above
 * the control sheet, so opening or collapsing the sheet changes the canvas box
 * by a third of the screen. `fitToBox` had already run against the old box, and
 * r3f's resize handling only updates the projection aspect -- it does not
 * re-frame. The visible result was the arm sliding out of the left edge partway
 * through an abduction sweep, which is exactly the frame a user is studying.
 */
/**
 * Cuanto tiene que haberse movido un hueso desde el encuadre para que el
 * guardian lo siga: 1 cm, al cuadrado. Ver el bloque del guardian en AutoFit.
 */
const MOVED_SQ = 0.01 * 0.01;

function AutoFit({
  refitKey,
  region,
}: {
  refitKey?: string | number;
  /** Active region. Decides WHAT gets framed (see lib/labFraming.ts). */
  region?: string | null;
}) {
  const { scene } = useThree();
  const controls = useThree((s) => s.controls) as CameraControls | null;
  const framed = useRef(false);
  const lastKey = useRef<string | number | undefined>(undefined);
  /** La caja que la camara tiene puesta ahora mismo. Solo crece. */
  const keptBox = useRef<THREE.Box3 | null>(null);
  /** Donde estaba cada hueso vigilado cuando se encuadro. Ver el guardian. */
  const framedAt = useRef<Map<string, THREE.Vector3>>(new Map());
  /** Fuerza otra pasada de encuadre cuando el usuario pulsa Reencuadrar. */
  const [nudge, setNudge] = useState(0);

  // A changed key means the viewport changed shape OR the studied region
  // changed: either way the current framing is wrong, so let the one-shot guard
  // fire again. Region is part of the key because picking a joint is exactly
  // when the user expects the camera to go to it.
  // Y EL DEMO QUE SE SALE DE SU REGION. Una prueba puede vivir en el panel de
  // una region y mover otra parte del cuerpo: el test de tension neural del
  // miembro superior esta en la lista cervical y mueve el BRAZO. Medido en el
  // navegador: con el encuadre cervical la mano caia a y = -1,65 en coordenadas
  // de pantalla, fuera del borde inferior, asi que el boton parecia no hacer
  // nada. Cuando el comando mueve un miembro que la region no encuadra, se
  // amplia la caja y se reencuadra; al terminar el demo vuelve a la region.
  const [demoBones, setDemoBones] = useState<string[]>([]);
  useEffect(() => {
    const onCmd = (cmd: RigCommand) => {
      const extra = extraFrameBonesFor(region, cmd.movementId, cmd.components ?? []);
      setDemoBones((prev) =>
        prev.length === extra.length && prev.every((b, i) => b === extra[i]) ? prev : extra,
      );
    };
    onCmd(rigChannel.get());
    return rigChannel.subscribe(onCmd);
  }, [region]);

  // EL LADO QUE SE ENCUADRA. Los nombres base de hueso casan en los DOS
  // armatures: medido en la escena viva, los 6 nombres del hombro casaban 12
  // huesos, 6 en Shoulder_Armature_R y 6 en Shoulder_Armature_L, asi que la
  // caja abarcaba los dos brazos. Filtrar al lado activo baja el ancho de 0,79
  // a 0,51 m en hombro y de 0,78 a 0,34 m en codo (medido).
  //
  // `rigSideFor` porque el sufijo del rig es el contrario del lado clinico: el
  // nodo _R esta en +x, que es la IZQUIERDA anatomica (ver boneMap).
  const [rigSuffix, setRigSuffix] = useState<'R' | 'L'>('L');
  useEffect(() => {
    const onSide = (cmd: RigCommand) => {
      const next = rigSideFor(cmd.side);
      setRigSuffix((prev) => (prev === next ? prev : next));
    };
    onSide(rigChannel.get());
    return rigChannel.subscribe(onSide);
  }, []);

  const fitKey = `${refitKey ?? ''}|${region ?? ''}|${rigSuffix}|${demoBones.join(',')}`;
  if (lastKey.current !== fitKey) {
    lastKey.current = fitKey;
    framed.current = false;
  }

  // Un reencuadre a mano vuelve al nucleo, igual que al entrar.
  useEffect(
    () =>
      frameChannel.subscribe(() => {
        framed.current = false;
        keptBox.current = null;
        setNudge((n) => n + 1);
      }),
    [],
  );

  // Las posiciones de mundo de un conjunto de nombres base de hueso, SOLO en el
  // armature del lado activo. Los huesos del raquis no llevan sufijo de lado,
  // asi que los que no cuelgan de ningun `*_Armature_{R|L}` entran siempre.
  const boneMarks = useCallback(
    (names: Set<string>): { id: string; p: THREE.Vector3 }[] => {
      const out: { id: string; p: THREE.Vector3 }[] = [];
      scene.traverse((o) => {
        if (!(o as THREE.Bone).isBone) return;
        // Z-Anatomy duplicates carry a numeric tail ("scapula_1").
        if (!names.has(o.name.replace(/_\d+$/, ''))) return;
        let r: THREE.Object3D | null = o;
        let suffix: string | null = null;
        while (r) {
          const m = /_Armature_([RL])$/.exec(r.name);
          if (m) {
            suffix = m[1];
            break;
          }
          r = r.parent;
        }
        if (suffix != null && suffix !== rigSuffix) return;
        const p = o.getWorldPosition(new THREE.Vector3());
        if (isFinite(p.x)) out.push({ id: o.uuid, p });
      });
      return out;
    },
    [scene, rigSuffix],
  );
  const bonePoints = useCallback(
    (names: Set<string>): THREE.Vector3[] => boneMarks(names).map((m) => m.p),
    [boneMarks],
  );

  // La caja con su margen: el proporcional (los huesos son el EJE del miembro;
  // piel, vientres musculares y la pala de la escapula viven por fuera) y el
  // minimo por lado (un bloque de raquis esta todo en la linea media, asi que
  // su caja mide 0,00 m de ancho y ajustar una camara a un plano la mete dentro
  // del modelo).
  const padBox = useCallback((box: THREE.Box3): THREE.Box3 => {
    if (box.isEmpty()) return box;
    const size = box.getSize(new THREE.Vector3());
    box.expandByScalar(Math.max(size.x, size.y, size.z) * FRAME_PAD_RATIO);
    // EL MINIMO POR LADO SOLO PARA EL LADO DEGENERADO.
    //
    // MEDIDO: la caja del hombro mide 0,21 x 0,32 x 0,07 m. Aplicar el minimo de
    // 0,34 m a los TRES lados engordaba la profundidad de 0,21 a 0,34, y como
    // `fitToBox` retrocede la camara media profundidad, eso son 7 cm de
    // alejamiento regalados sobre un encuadre de 0,46 m. El minimo existe por el
    // raquis, cuyas vertebras estan TODAS en la linea media y dan una caja de
    // 0,00 m de ancho --un plano, al que ajustar una camara la mete dentro del
    // modelo--, asi que solo tiene que actuar donde el lado es de verdad
    // degenerado, no donde simplemente es estrecho.
    const grown = box.getSize(new THREE.Vector3());
    const lift = (v: number) => (v < FRAME_DEGENERATE_SIDE ? (FRAME_MIN_SIDE - v) / 2 : 0);
    const gx = Math.max(0, lift(grown.x));
    const gy = Math.max(0, lift(grown.y));
    const gz = Math.max(0, lift(grown.z));
    box.min.set(box.min.x - gx, box.min.y - gy, box.min.z - gz);
    box.max.set(box.max.x + gx, box.max.y + gy, box.max.z + gz);
    return box;
  }, []);

  /**
   * EL MARGEN DE `fitToBox`, EN PROPORCION Y NO EN METROS.
   *
   * MEDIDO, y era el termino que mas sobraba: con 0,15 m fijos por lado, una
   * caja de 0,46 m de alto se encuadraba en 0,88 m de escena visible --el 91% de
   * margen-- y el resultado era que el "encuadre del hombro" seguia enseniando
   * de la coronilla a las manos. El margen tiene que escalar con lo que se
   * encuadra: una region pequenia, un margen pequenio.
   */
  const padOf = useCallback((box: THREE.Box3): number => {
    const s2 = box.getSize(new THREE.Vector3());
    return Math.max(s2.x, s2.y, s2.z) * 0.07;
  }, []);

  // EL TOPE DE LA RUEDA, DERIVADO DE LO QUE SE ACABA DE ENCUADRAR.
  //
  // Eran numeros fijos (minDistance 0,05 / maxDistance 50) sobre un cuerpo de
  // 1,75 m: medido, con la rueda hacia atras el cuerpo entero cabia en 34 px y
  // las etiquetas del atlas se amontonaban en una columna con doce guias
  // convergiendo en el mismo punto. Con el encuadre del hombro (d~1,5 m) el
  // tope pasa a 3 m, donde el cuerpo sigue ocupando el 69% del alto.
  const clampDolly = useCallback(() => {
    if (!controls) return;
    const d = controls.distance;
    if (!isFinite(d) || d <= 0) return;
    controls.maxDistance = d * 2;
    controls.minDistance = Math.max(0.12, d * 0.08);
  }, [controls]);

  useEffect(() => {
    if (framed.current || !controls) return;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        scene.updateWorldMatrix(true, true);
        const box = new THREE.Box3();

        // EL NUCLEO PRIMERO, NO LA LISTA COMPLETA. El laboratorio encuadraba el
        // cuerpo entero para cada region, asi que elegir "Hombro" abria sobre
        // una figura de 1,75 m con la articulacion estudiada en un pequeno
        // porcentaje del lienzo. Y encuadrar la lista COMPLETA tampoco servia:
        // incluye la mano porque la abduccion la lleva arriba, pero en reposo
        // la mano cuelga a la altura de la cadera y la caja bajaba hasta ahi
        // (ver REGION_FRAME_CORE, con las medidas). Lo que la mano necesita es
        // que la camara la siga, y de eso se encarga el guardian de abajo.
        const wanted = regionFrameCore(region);
        if (wanted) {
          for (const p of bonePoints(new Set([...wanted, ...demoBones]))) box.expandByPoint(p);
          padBox(box);
          // El techo propio de la region, para lo que no es un hueso (la
          // coronilla en la cervical). Ver REGION_FRAME_HEADROOM.
          if (!box.isEmpty()) box.max.y += regionFrameHeadroom(region);
        }

        // Fall back to the whole body: an unknown region, or a rig whose bones
        // this build does not carry. Frame ONLY the skinned body -- the rig GLB
        // also holds far-away Z-Anatomy text panels ("VENOUS SYSTEM", ...) that
        // would blow the box up and shrink the body to a dot off to the side.
        if (box.isEmpty()) {
          const tmp = new THREE.Box3();
          scene.traverse((o) => {
            const m = o as THREE.SkinnedMesh;
            if (!m.isSkinnedMesh || !m.visible) return;
            tmp.setFromObject(m);
            if (isFinite(tmp.min.x) && !tmp.isEmpty()) box.union(tmp);
          });
        }
        if (box.isEmpty() || !isFinite(box.min.x)) return;
        framed.current = true;
        keptBox.current = box.clone();
        // La foto de DONDE ESTA cada hueso vigilado en este encuadre: el
        // guardian solo sigue a los que se muevan desde aqui.
        framedAt.current = new Map(
          boneMarks(new Set([...(regionFrameBones(region) ?? []), ...demoBones])).map((m) => [
            m.id,
            m.p,
          ]),
        );
        const pad = padOf(box);
        void controls.fitToBox(box, true, {
          paddingTop: pad,
          paddingBottom: pad,
          paddingLeft: pad,
          paddingRight: pad,
        });
        // El tope se fija cuando la transicion ha llegado, no antes.
        window.setTimeout(clampDolly, 450);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [controls, scene, fitKey, nudge, bonePoints, boneMarks, padBox, padOf, clampDolly, demoBones, region]);

  // EL GUARDIAN DE ENCUADRE: la camara AMPLIA, y solo amplia.
  //
  // Una sola caja estatica no puede contener a la vez el ritmo escapulohumeral
  // --que se lee de cerca-- y una mano a y=1,91 m al final de la abduccion
  // (medido: 0,531 m de radio desde la glenohumeral). Antes se resolvia metiendo
  // la mano en la caja de apertura, y el precio era abrir sobre medio cuerpo.
  //
  // Asi que se abre sobre el nucleo y, cuando el arco saca de cuadro un hueso
  // que la region declara que debe verse, la caja crece y se vuelve a ajustar.
  // Solo crece: una camara que se acerca y se aleja sola durante una toma es
  // peor que una que se queda ancha. Volver a lo estrecho es el boton de
  // Reencuadrar (tecla R).
  const camera = useThree((s) => s.camera);
  const lastGrow = useRef(0);
  useEffect(() => {
    const full = regionFrameBones(region);
    if (!full) return;
    const names = new Set([...full, ...demoBones]);
    const onCmd = (cmd: RigCommand) => {
      if (!controls || !framed.current || !keptBox.current) return;
      // SOLO MIENTRAS EL ARCO ESTA FUERA DE SU INICIO.
      //
      // MEDIDO, Y ERA UN FALLO DE ESTE MISMO GUARDIAN: en reposo la mano cuelga
      // a y=0,864 m, o sea MUY por debajo del encuadre del hombro, asi que el
      // guardian la veia fuera de cuadro y ampliaba la caja en el primer
      // fotograma. Resultado: la vista volvia a abrir sobre medio cuerpo
      // (`hand_flex` quedo en ndc y = -0,96, pegado al borde inferior), que es
      // exactamente el defecto que el nucleo venia a arreglar.
      //
      // Un hueso fuera de cuadro EN REPOSO lo esta por diseno. Lo que hay que
      // seguir es el que el MOVIMIENTO esta sacando. Asi que la camara solo
      // amplia cuando el angulo se ha ido del inicio anatomico del gesto. Si el
      // movimiento no se conoce todavia --una region de pago cuyo contenido aun
      // no ha llegado-- no se amplia: mejor un encuadre estrecho que uno que se
      // abre solo.
      const mv = cmd.movementId ? movementById(cmd.movementId) : null;
      if (!mv) return;
      if (Math.abs(cmd.angleDeg - buildLabArc(mv).startDeg) <= 8) return;
      const ndc = new THREE.Vector3();
      const need = keptBox.current.clone();
      let grew = false;
      for (const { id, p } of boneMarks(names)) {
        // SOLO LO QUE EL MOVIMIENTO HA DESPLAZADO.
        //
        // MEDIDO, Y ERA EL MISMO DEFECTO QUE EL NUCLEO VENIA A ARREGLAR, por
        // otra puerta. La rodilla abre centrada en la rodilla (cuadro de
        // y 0,188 a 0,717), pero la lista completa de la region lleva
        // `femur_base`, que esta en y=0,865: la CADERA, por encima del borde
        // superior. En cuanto la flexion pasaba de 8 grados el guardian lo veia
        // fuera de cuadro y ampliaba la caja hasta meterlo, asi que la vista
        // volvia a ser un plano de muslo entero justo al empezar a mover. En el
        // codo, lo mismo con `humerus_gh` (el hombro).
        //
        // Ese hueso no se ha movido: estaba fuera de cuadro EN EL ENCUADRE, por
        // diseno. Lo que hay que seguir es lo que el gesto SACA de cuadro. Asi
        // que solo cuenta el hueso que esta a mas de 1 cm de donde estaba
        // cuando se encuadro: en la flexion de rodilla, el pie; en la abduccion
        // de hombro, el antebrazo y la mano.
        const was = framedAt.current.get(id);
        if (was && was.distanceToSquared(p) < MOVED_SQ) continue;
        if (keptBox.current.containsPoint(p)) continue;
        ndc.copy(p).project(camera);
        // 0,88 y no 1,0: un hueso pegado al borde ya esta medio tapado por el
        // propio grosor del miembro, y el panel izquierdo come lienzo.
        if (Math.abs(ndc.x) < 0.88 && Math.abs(ndc.y) < 0.88) continue;
        need.expandByPoint(p);
        grew = true;
      }
      if (!grew) return;
      padBox(need);
      const was = keptBox.current.getSize(new THREE.Vector3());
      const now = need.getSize(new THREE.Vector3());
      // Histeresis: sin esto, cada grado del arco pediria un reajuste de un
      // milimetro y la camara no pararia de respirar.
      if (Math.max(now.x, now.y, now.z) < Math.max(was.x, was.y, was.z) * 1.06) return;
      const t = performance.now();
      if (t - lastGrow.current < 350) return;
      lastGrow.current = t;
      keptBox.current = need;
      const pad = padOf(need);
      void controls.fitToBox(need, true, {
        paddingTop: pad,
        paddingBottom: pad,
        paddingLeft: pad,
        paddingRight: pad,
      });
      window.setTimeout(clampDolly, 450);
    };
    return rigChannel.subscribe(onCmd);
  }, [controls, camera, region, demoBones, boneMarks, padBox, padOf, clampDolly]);

  return null;
}

/**
 * DOUBLE-CLICK TO FOCUS. Free-navigation companion to dollyToCursor: double-click
 * any muscle/bone and the camera flies in and frames THAT structure, so you can
 * inspect any part up close without hunting with the wheel. Skin (body envelope +
 * distal caps) is skipped so you focus the structure underneath, not the glass
 * shell. Skinned-mesh raycasting is CPU work, but a double-click is rare.
 */
function DoubleClickFocus() {
  const { scene, camera, gl } = useThree();
  const controls = useThree((s) => s.controls) as CameraControls | null;

  useEffect(() => {
    if (!controls) return;
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const box = new THREE.Box3();

    const onDblClick = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      const hit = hits.find((h) => {
        const m = h.object as THREE.Mesh;
        // Only solid anatomy: skip the translucent skin shell and its distal caps
        // so the click lands on the muscle/bone the user is pointing at.
        return (
          m.isMesh &&
          m.visible &&
          m.userData.rigLayer !== 'skin' &&
          m.userData.rigLayer !== 'hidden'
        );
      });
      if (!hit) return;
      box.setFromObject(hit.object);
      if (box.isEmpty() || !isFinite(box.min.x)) return;
      void controls.fitToBox(box, true, {
        paddingTop: 0.35,
        paddingBottom: 0.35,
        paddingLeft: 0.35,
        paddingRight: 0.35,
      });
    };

    el.addEventListener('dblclick', onDblClick);
    return () => el.removeEventListener('dblclick', onDblClick);
  }, [controls, scene, camera, gl]);

  return null;
}

/**
 * Premium studio lighting baked into an image-based environment. Pure
 * Lightformers (no HDR file -> fully offline), rendered ONCE (frames={1}) into a
 * small env map: a broad key softbox, a cool fill, and two rim strips that trace
 * the bone/muscle silhouettes with a soft pearly highlight. Materials pick this
 * up through their envMapIntensity. `background={false}` keeps our CSS gradient.
 */
function StudioEnvironment() {
  return (
    <Environment frames={1} resolution={256} background={false}>
      {/* Key: large warm-neutral softbox, front-high-right. */}
      <Lightformer
        form="rect"
        intensity={2.4}
        color="#fff6ec"
        position={[3, 4, 5]}
        scale={[8, 8, 1]}
        target={[0, 1, 0]}
      />
      {/* Fill: cool, opposite side, low intensity to open the shadows. */}
      <Lightformer
        form="rect"
        intensity={0.9}
        color="#cfe0ff"
        position={[-5, 2, -2]}
        scale={[6, 8, 1]}
        target={[0, 1, 0]}
      />
      {/* Rim strips: thin bright bars that carve a premium edge on the silhouette. */}
      <Lightformer
        form="rect"
        intensity={3.2}
        color="#ffffff"
        position={[-3, 3, -5]}
        scale={[0.4, 6, 1]}
        target={[0, 1, 0]}
      />
      <Lightformer
        form="rect"
        intensity={2.2}
        color="#dbe7ff"
        position={[4, 1, -5]}
        scale={[0.4, 6, 1]}
        target={[0, 1, 0]}
      />
      {/* Subtle top ambient bar for a soft overhead sheen on bone. */}
      <Lightformer
        form="rect"
        intensity={1.1}
        color="#eef4ff"
        position={[0, 6, 1]}
        scale={[6, 2, 1]}
        rotation={[Math.PI / 2, 0, 0]}
        target={[0, 1, 0]}
      />
    </Environment>
  );
}

/**
 * Camera + interaction budget. Lives inside the Canvas so it can read r3f's
 * `performance.regress`.
 *
 * A camera change regresses the scene, and regressing does TWO separate things.
 * AdaptiveEvents stops raycasting, which is pure profit: picking a skinned mesh
 * is the most expensive raycast three.js does and there are 1300+ of them here,
 * so it was competing with the drag for the same main thread, and nobody is
 * clicking a muscle mid-swipe anyway. AdaptiveDpr drops the render resolution,
 * which costs image quality.
 *
 * ON PHONES ONLY THE FIRST HALF APPLIES. The compact cap is already 1.0, so a
 * regress meant 0.5x -- about 195 backing pixels across a 390px screen -- and
 * the user reported the model distorting on every pinch and drag. Desktop starts
 * from a bigger budget and nobody complained, so it keeps both halves.
 *
 * smoothTime was 0.4s, long enough that the model visibly trailed the cursor and
 * read as a stutter even when frames were fine.
 */
/**
 * DO NOT regress the scene while the rig is animating.
 *
 * That was tried and it was the wrong tool. `regress()` exists for TRANSIENT
 * interactions: it drops AdaptiveDpr to the `performance.min` floor and snaps
 * back the moment you let go, which is right for a camera flick. A ROM sweep is
 * not transient -- it runs for five to ten seconds -- so regressing on every
 * angle change parked the render at the floor for the whole animation. On a
 * phone that measured 0.349x, i.e. about 136 backing pixels across a 390px
 * screen. It did buy fluidity, and it made the movement impossible to actually
 * read, which is the entire point of the lab.
 *
 * The savings that cost nothing visually are the ones that stay: the compact DPR
 * cap, MSAA off on phones, and the 30 Hz commit throttle in MovementControls.
 * Resolution during the sweep is left alone.
 *
 * If playback still needs to be cheaper, the next lever is the CPU side of
 * `apply()` in RigModel -- the per-frame skeleton walk and `updateMatrixWorld`
 * -- not the pixels. Reducing pixels further just makes the feature illegible.
 */

function NavigationRig({ compact }: { compact: boolean }) {
  const regress = useThree((s) => s.performance.regress);
  return (
    <>
      {/* Resolution stays constant on phones -- see the note above. */}
      {!compact && <AdaptiveDpr pixelated={false} />}
      <AdaptiveEvents />
      {/* Free navigation: dollyToCursor makes the wheel zoom TOWARD the pointer
          (point at a muscle and scroll in), and a small minDistance lets the
          camera get right up to a single muscle. Right-drag trucks (pans) up/
          down/sideways; double-click flies to a structure (DoubleClickFocus). */}
      {/* minDistance/maxDistance los reescribe `AutoFit.clampDolly` con la caja
          recien encuadrada; estos son solo el arranque, antes del primer ajuste. */}
      <CameraControls
        makeDefault
        dollyToCursor
        minDistance={0.05}
        maxDistance={6}
        smoothTime={0.18}
        draggingSmoothTime={0.08}
        onChange={regress}
      />
    </>
  );
}

/**
 * EL CARTEL NO SE RETIRA HASTA QUE HAY UN FOTOGRAMA DE VERDAD.
 *
 * `onReady` dice que el rig esta cargado y vestido, no que se vea. MEDIDO con
 * el reloj de arranque sobre el build de produccion (`vite preview`, modelo en
 * la cache del service worker): `listo` --que es cuando se llama a `onReady`--
 * cae a los 8.068 ms, y el PRIMER FOTOGRAMA EN PANTALLA 3.714 ms despues, a los
 * 11.782. Ese tramo es compilacion de shaders y subida a la GPU, y mientras
 * dura el hilo principal no suelta.
 *
 * En esa carrera el cartel se quito a la vez que aparecia el cuerpo porque el
 * navegador no pudo pintar nada en medio, pero la condicion dependia de una
 * suerte: basta con que React alcance a pintar el arbol sin cartel un
 * fotograma antes para dejar el escenario NEGRO Y SIN NINGUN INDICADOR durante
 * lo que tarde el primer dibujo. Dos fotogramas pintados por el bucle de R3F lo
 * cierran: al segundo `useFrame`, el dibujo del primero ya esta presentado.
 */
function PrimerFotograma({ onPainted }: { onPainted: () => void }) {
  const n = useRef(0);
  const hecho = useRef(false);
  useFrame(() => {
    if (hecho.current) return;
    if (++n.current < 2) return;
    hecho.current = true;
    onPainted();
  });
  return null;
}

/**
 * VOLVER A LA VISTA. El laboratorio no tenia ninguna: `ViewToolbar` solo existe
 * en Explorar, asi que despues de un arrastre o un giro de rueda la unica
 * salida era recargar. La tecla R esta ahi porque en una sesion de grabacion es
 * lo que te deja repetir una toma sin recargar y sin perder la pose.
 */
function RefitButton() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Nunca mientras se escribe en un campo (el buscador, una respuesta).
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
      e.preventDefault();
      frameChannel.refit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // EN LA BARRA DEL ESCENARIO, abajo al centro.
  //
  // Estuvo arriba a la derecha y MEDIDO en el navegador no se podia pulsar: el
  // panel de capas ocupaba esa esquina por encima y `elementFromPoint` en el
  // centro del boton devolvia otro boton. Luego fue una pastilla flotante abajo
  // al centro, que es donde caia tambien la tarjeta de diseccion. Ahora los
  // paneles estan acoplados en los margenes (ver MovementView) y el pie del
  // escenario es solo de las acciones de vista: no hay nada que pueda taparlo.
  return (
    <button
      type="button"
      onClick={() => frameChannel.refit()}
      title="Volver al encuadre de la región (R)"
      aria-label="Reencuadrar la vista"
      className="btn btn-quiet btn-sm"
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
        <path
          d="M2 5.5V3a1 1 0 0 1 1-1h2.5M14 5.5V3a1 1 0 0 0-1-1h-2.5M2 10.5V13a1 1 0 0 0 1 1h2.5M14 10.5V13a1 1 0 0 1-1 1h-2.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      Reencuadrar
      <span className="kbd">R</span>
    </button>
  );
}

export function RigViewer({
  refitKey,
  region,
  stageActions,
}: {
  refitKey?: string | number;
  region?: string | null;
  /** Acciones de vista que el laboratorio anade a la barra del escenario. */
  stageActions?: React.ReactNode;
} = {}) {
  // Read OUT HERE, not inside the Suspense boundary: a reporter that only mounts
  // once the rig has resolved can never show anything but 0 while it loads.
  // `loaded`/`total`/`item` ademas del porcentaje: el gestor de carga es uno
  // para toda la aplicacion, asi que la pantalla necesita saber DE QUE RECURSO
  // son las cifras y si el flujo midio exactamente lo que declaro (ver
  // `flujoExacto` en RigLoadingScreen).
  const { progress, loaded, total, item } = useProgress();
  // Dos condiciones, no una: el rig esta PREPARADO (onReady) y ademas se ha
  // PINTADO (ver PrimerFotograma, con la medida de los 3,7 s que separan una
  // cosa de la otra). `forzado` es el seguro de los 40 s.
  const [prepared, setPrepared] = useState(false);
  const [painted, setPainted] = useState(false);
  const [forzado, setForzado] = useState(false);
  const ready = forzado || (prepared && painted);
  // LA PANTALLA DE CARGA SE DESVANECE, NO SE ARRANCA. Se desmontaba en el mismo
  // render en que aparecia el cuerpo: un corte seco despues de diez segundos de
  // espera. Ahora, cuando el laboratorio ya esta pintado debajo, la pantalla se
  // queda medio segundo mas en estado `leaving` (opacidad a cero, por CSS) y
  // solo entonces se retira del arbol.
  const [loaderGone, setLoaderGone] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setLoaderGone(true), 520);
    return () => clearTimeout(t);
  }, [ready]);
  const compact = useIsCompact();
  // `?hd=1`: resolucion de grabacion. Se lee una vez, no por fotograma.
  const [hd] = useState(wantsHd);

  // The rig itself reports when it's loaded AND styled (onReady). We dismiss the
  // loader on that signal -- NOT on drei's progress reaching 100, which never
  // happens on a cached reload and would freeze the overlay over a live model.
  // A safety timeout dismisses it regardless so the overlay can never get stuck.
  //
  // IT USED TO BE 8 s, AND THE RIG TAKES LONGER THAN THAT. Measured on
  // localhost with a warm cache, onReady fires at ~10,3 s: the whole body has
  // to be parsed, its mirrored meshes rewound and its skin repaired before
  // anything can be drawn. So the failsafe was firing on every single visit,
  // two seconds early, and handing the user a black stage with no explanation
  // for the rest of the wait -- the exact impression the overlay exists to
  // prevent. A failsafe must be longer than the thing it is insuring against;
  // 40 s only trips when something is genuinely wrong.
  useEffect(() => {
    const t = setTimeout(() => setForzado(true), 40000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative h-full w-full viewer-bg">
      <Canvas
        // Tagged so the "Exportar para paciente" feature can grab this exact
        // WebGL canvas (preserveDrawingBuffer is on, so toDataURL/drawImage work).
        id="rig-gl-canvas"
        camera={{ position: [2, 1.5, 4], fov: 45, near: 0.05, far: 100 }}
        dpr={hd ? RIG_DPR_HD : compact ? RIG_DPR_COMPACT : RIG_DPR}
        // Floor for the adaptive quality drop while the CAMERA moves (nothing
        // else regresses -- see the note above NavigationRig). Same on phones:
        // a lower floor here made a drag on mobile blocky for no real gain.
        // FLOOR FOR THE INTERACTION DROP, and the DEBOUNCE that ends it.
        //
        // A physio reviewing the lab wrote "Borroso se aleja o acerca": the scene
        // regresses on EVERY camera change, so a zoom -- a gesture whose whole
        // point is to look closer -- spends its entire duration at reduced
        // resolution, plus r3f's 200 ms debounce afterwards.
        //
        // 0.5 was too deep a cut for what it buys. This scene's cost is thousands
        // of individual meshes each with its own cloned material, which is
        // draw-call bound, not fill bound -- so halving the pixels barely moves
        // the frame rate while being plainly visible. The comment above says as
        // much: dropping the raycast is free, dropping the resolution is not, and
        // the phones were already exempted from this half for the same reason.
        // 0.75 keeps a real saving for the genuinely heavy drags; the shorter
        // debounce brings the sharp frame back as soon as the gesture stops.
        performance={hd ? { min: 1, debounce: 0 } : { min: 0.75, debounce: 120 }}
        gl={{
          // MSAA is a fill-rate tax, and fill rate is exactly what a phone does
          // not have spare while skinning 1300+ meshes per frame.
          antialias: !compact,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
          // ACES filmic gives the muscle reds and ivory bone a richer, more
          // cinematic roll-off than the flat Neutral curve; slightly under 1.0
          // exposure keeps highlights from blowing out under the studio env.
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.95,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        {/* Image-based studio lighting (reflections + soft fill). */}
        <StudioEnvironment />
        {/* Analytic key/fill/rim on top of the IBL for crisp directional shaping. */}
        <hemisphereLight args={[0xbfdfff, 0x0a0f1a, 0.35]} />
        <directionalLight position={[3, 6, 4]} intensity={1.2} color="#fff4e8" />
        <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#cdddff" />
        {/* Back/rim key: raised (was 0.7) so muscle silhouettes get a brighter edge
            and separate from the dark stage — the G1 "flat on black" fix. */}
        <directionalLight position={[-2, 3, -5]} intensity={0.95} color="#ffffff" />
        <ambientLight intensity={0.12} />

        <Suspense fallback={null}>
          {/* Los dos instantes se le cuentan tambien a la pantalla de carga,
              que guarda lo que tarda cada tramo en ESTE equipo para
              coreografiar la siguiente visita (ver RigLoadingScreen). */}
          <RigModel
            onReady={() => {
              noteRigReady();
              setPrepared(true);
            }}
          />
          <PrimerFotograma
            onPainted={() => {
              noteRigPainted();
              setPainted(true);
            }}
          />
          <RigOverlays />
          <ShoulderRhythmArc />
          {/* Paints the selected root's dermatome on the body's own skin. Idle
              until the neuro panel publishes a selection. */}
          <NeuroSkinLayer />
          <AutoFit refitKey={refitKey} region={region} />
          <DoubleClickFocus />
        </Suspense>

        <NavigationRig compact={compact} />
      </Canvas>

      {/* Premium depth: a soft radial spotlight behind the model and a vignette
          in front, both pointer-events-none so the canvas stays fully draggable. */}
      <div className="pointer-events-none absolute inset-0 rig-stage-glow" />
      <div className="pointer-events-none absolute inset-0 rig-vignette" />

      {ready && (
        <div className="stage-bar absolute inset-x-0 bottom-0 z-30">
          <RefitButton />
          {stageActions}
        </div>
      )}

      {!loaderGone && (
        <RigLoadingScreen
          progress={progress}
          loaded={loaded}
          total={total}
          item={item}
          compact={compact}
          leaving={ready}
        />
      )}
    </div>
  );
}
