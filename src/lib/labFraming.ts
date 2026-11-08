// src/lib/labFraming.ts
//
// Which bones the movement lab's camera should frame for each region.
//
// WHY: the lab framed the WHOLE skinned body, always. Picking "Hombro" and
// getting a 1,75 m figure meant the joint under study was a few percent of the
// canvas, and every user had to zoom by hand before they could read anything --
// on a tool whose entire proposition is reading one joint closely.
//
// Bones, not meshes, because they are the one naming the rig guarantees
// (verified from the GLB; see rig-bones.txt and boneMap.ts). Mesh names come
// from Z-Anatomy and are inconsistent across sides.
//
// The listed bones are the ones that must STAY IN FRAME, which is not the same
// as the ones that move: the shoulder lists the forearm and hand because
// abduction carries them overhead, and the hip lists the shin because flexion
// swings it forward. The runtime unions their world positions at the CURRENT
// pose and pads the result (see RigViewer/AutoFit), so the box follows the rig
// instead of being a baked number that silently rots when the GLB changes.

import { BONE_MAP } from './boneMap';

/** Region id (store.region) -> bone base names to keep in frame. */
export const REGION_FRAME_BONES: Record<string, readonly string[]> = {
  // Girdle plus the whole arm: elevation ends with the hand above the head.
  shoulder: ['clavicle', 'scapula', 'humerus_gh', 'forearm_flex', 'forearm_rot', 'hand_flex'],
  // From the glenohumeral joint down, so the humerus gives the arc its
  // reference limb the way a goniometer does.
  elbow: ['humerus_gh', 'forearm_flex', 'forearm_rot', 'hand_flex'],
  // Vertebral blocks. Each borrows a few of the neighbouring segment's
  // vertebrae, because a regional range is read against the segment above and
  // below it, never in isolation.
  cervical: ['vert_C1', 'vert_C2', 'vert_C3', 'vert_C4', 'vert_C5', 'vert_C6', 'vert_C7',
             'vert_T1', 'vert_T2', 'vert_T3'],
  thoracic: ['vert_C7', 'vert_T1', 'vert_T2', 'vert_T3', 'vert_T4', 'vert_T5', 'vert_T6',
             'vert_T7', 'vert_T8', 'vert_T9', 'vert_T10', 'vert_T11', 'vert_T12', 'vert_L1'],
  lumbar: ['vert_T10', 'vert_T11', 'vert_T12', 'vert_L1', 'vert_L2', 'vert_L3', 'vert_L4',
           'vert_L5', 'vert_sacrum'],
  // Pelvis plus the whole leg: flexion swings the shin forward and up.
  hip: ['vert_sacrum', 'vert_L5', 'femur_base', 'patella', 'shin_flex', 'foot_flex'],
  knee: ['femur_base', 'patella', 'shin_flex', 'foot_flex'],
  ankle: ['shin_flex', 'foot_flex'],
};

/**
 * EL ENCUADRE DE APERTURA: hasta donde llega la vista al entrar, antes de que
 * ningun arco haya movido nada.
 *
 * POR QUE HACEN FALTA DOS LISTAS, MEDIDO EN LA ESCENA VIVA. `REGION_FRAME_BONES`
 * dice que huesos no se pueden salir de cuadro EN NINGUN momento del arco, y eso
 * incluye la mano, porque la abduccion la lleva por encima de la cabeza. Pero en
 * la pose de REPOSO la mano cuelga a y=0,864 m, que es exactamente la altura de
 * `femur_base` (0,865 m): encuadrar esa lista al entrar hacia una caja del
 * acromion a la cadera. Medido a 1440x900: la cabeza empezaba a 84 px del borde
 * superior y el cuerpo se cortaba a medio muslo, ~1,24 m de escena visible para
 * una articulacion de 10 cm.
 *
 * Posiciones de reposo medidas en el navegador (Shoulder_Armature_R):
 * clavicle 1,396 / scapula 1,420 / humerus_gh 1,381 / forearm_flex 1,101 /
 * hand_flex 0,864. Asi que:
 *
 *   - con la lista completa la caja mide 0,47 x 0,56 m;
 *   - solo el nucleo (hasta el codo) mide 0,21 x 0,32 m, que compone acromion a
 *     codo con el esternon y el cuello dentro: la vista que un fisio espera al
 *     abrir "Hombro".
 *
 * Y lo que la mano necesita no es una caja mas grande, es que la camara la siga:
 * una sola caja que contenga a la vez el ritmo escapulohumeral y una mano a
 * y=1,91 m (medido: el radio del miembro desde la glenohumeral es 0,531 m) mide
 * 0,81 m de alto y vuelve a ser medio cuerpo. Ver el guardian de encuadre de
 * `RigViewer`, que amplia la caja --y solo la amplia-- cuando el arco saca un
 * hueso de cuadro.
 */
export const REGION_FRAME_CORE: Record<string, readonly string[]> = {
  // Cintura escapular mas brazo HASTA EL CODO. El codo es el extremo distal del
  // segmento que se lee: deja el humero entero dentro, que es la rama de
  // referencia del goniometro.
  shoulder: ['clavicle', 'scapula', 'humerus_gh', 'forearm_flex'],
  // El codo abre con el humero y el antebrazo; la mano es lo que arrastra.
  elbow: ['humerus_gh', 'forearm_flex', 'forearm_rot'],
  // La cadera abre con la pelvis y el muslo hasta la rodilla.
  hip: ['vert_sacrum', 'vert_L5', 'femur_base', 'patella'],
  // Rodilla: femur y tibia. El pie es lo que arrastra la flexion.
  knee: ['femur_base', 'patella', 'shin_flex'],
  // El raquis y el tobillo no arrastran nada fuera de su propia caja, asi que
  // su nucleo es su lista completa y no hace falta repetirla aqui.
};

/** Huesos del encuadre de APERTURA de una region (o su lista completa). */
export function regionFrameCore(region: string | null | undefined): readonly string[] | null {
  if (region == null) return null;
  return REGION_FRAME_CORE[region] ?? REGION_FRAME_BONES[region] ?? null;
}

/**
 * Extra room around the bone box, as a FRACTION of the box's own larger side.
 *
 * Bones are points on the axis of a limb; the skin, the muscle bellies and the
 * scapula's blade all sit outside them. A single proportional margin covers
 * that without a per-region magic number: a small region gets a small margin, a
 * long one gets a proportionally larger one.
 */
export const FRAME_PAD_RATIO = 0.22;

/**
 * Smallest side the framing box may have, in metres.
 *
 * The vertebrae all sit ON the midline, so a spine region's bone box measures
 * exactly 0.00 m wide (measured: cervical 0.00 x 0.14, thoracic 0.00 x 0.34).
 * A box with a zero side is a plane, and fitting a camera to a plane either
 * divides by zero or flies the camera into it. The trunk is about 0.35 m deep
 * and wide at the chest, so this is also roughly what the user needs to see.
 */
export const FRAME_MIN_SIDE = 0.34;

/**
 * Por debajo de esto un lado de la caja se considera DEGENERADO y se eleva a
 * `FRAME_MIN_SIDE`. Por encima se deja como esta.
 *
 * Antes el minimo se aplicaba a los tres lados sin condicion, y eso engordaba
 * cajas que no eran planas: medido, la del hombro pasa de 0,07 a 0,21 m de
 * profundidad con el margen proporcional, y elevar eso a 0,34 regalaba 7 cm de
 * alejamiento de camara porque `fitToBox` retrocede media profundidad. Un bloque
 * de raquis da literalmente 0,00 m, asi que el caso que el minimo existe para
 * cubrir sigue cubierto de sobra.
 */
export const FRAME_DEGENERATE_SIDE = 0.12;

/** True when this region has a framing recipe. */
export function hasRegionFrame(region: string | null | undefined): boolean {
  return region != null && region in REGION_FRAME_BONES;
}

/** Bone base names to frame, or null to fall back to the whole body. */
export function regionFrameBones(region: string | null | undefined): readonly string[] | null {
  if (region == null) return null;
  return REGION_FRAME_BONES[region] ?? null;
}

/**
 * EL ENCUADRE DE UN DEMO QUE SE SALE DE SU REGIÓN.
 *
 * Una prueba no siempre explora la región en cuyo panel vive. El test de
 * tensión neural del miembro superior está en la lista CERVICAL y lo que mueve
 * es el BRAZO; el de tensión del nervio femoral está en la LUMBAR y mueve la
 * rodilla y la cadera. El encuadre por región deja fuera ese segmento, y
 * medido en el navegador: durante el ULNT la mano caía a y = −1,65 en
 * coordenadas de pantalla, es decir, por debajo del borde inferior. El botón
 * parecía no hacer nada, porque lo que hacía no se veía.
 *
 * Así que el encuadre se amplía con los huesos del miembro que el comando
 * mueve de verdad --su movimiento base y sus componentes-- y la cámara se
 * reajusta al empezar y al terminar el demo.
 *
 * Y SE AMPLIA LO JUSTO. Un primer intento añadía el miembro ENTERO del grupo
 * que el movimiento tocaba, y entonces una inversión de tobillo --dentro de la
 * región del tobillo-- pedía meter el fémur y la rótula en la caja, alejando la
 * cámara de lo único que se está mirando. Lo que hay que ver es el hueso que el
 * movimiento gira y todo lo que arrastra POR DEBAJO, porque eso es lo que se
 * desplaza: de ahí la cadena ordenada de proximal a distal y el corte en el
 * hueso movido.
 */
const LIMB_CHAIN: Record<string, readonly string[]> = {
  shoulder: ['clavicle', 'scapula', 'humerus_gh', 'forearm_flex', 'forearm_rot', 'hand_flex'],
  leg: ['femur_base', 'patella', 'shin_flex', 'foot_flex'],
};

/**
 * Los huesos que hay que tener a la vista para ver este movimiento: el que gira
 * y los que cuelgan de él. Vacío para el raquis (cada región vertebral ya trae
 * sus vértebras) y para un control no accionable.
 */
function framedBonesOfMovement(movementId: string): string[] {
  const c = BONE_MAP[movementId];
  if (!c) return [];
  const suffixFrom = (group: string, bones: string[]): string[] => {
    const chain = LIMB_CHAIN[group];
    if (!chain) return [];
    let first = chain.length;
    for (const b of bones) {
      const i = chain.indexOf(b);
      if (i >= 0 && i < first) first = i;
    }
    return first < chain.length ? [...chain.slice(first)] : [];
  };
  if (c.kind === 'joint') {
    return suffixFrom(c.armatureBase === 'Leg_Armature' ? 'leg' : 'shoulder', [c.bone]);
  }
  if (c.kind === 'chain') {
    const out = new Set<string>();
    for (const t of c.targets) {
      const group = String(t.target.armature);
      for (const b of suffixFrom(group, t.target.bones)) out.add(b);
    }
    return [...out];
  }
  return [];
}

/**
 * Los huesos que hay que añadir al encuadre de `region` para que lo que este
 * comando mueve quepa en pantalla. Vacío cuando la región ya los contiene.
 */
export function extraFrameBonesFor(
  region: string | null | undefined,
  movementId: string | null | undefined,
  components: readonly { movementId: string }[] = [],
): string[] {
  if (!movementId) return [];
  const own = new Set(regionFrameBones(region) ?? []);
  if (!own.size) return [];
  const out = new Set<string>();
  for (const id of [movementId, ...components.map((c) => c.movementId)]) {
    for (const b of framedBonesOfMovement(id)) if (!own.has(b)) out.add(b);
  }
  return [...out].sort();
}
