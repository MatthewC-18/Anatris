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
  //
  // `vert_C1` NO ES UN DESPISTE EN UNA LISTA DE HOMBRO: es el punto mas alto
  // que este rig tiene (y=1,543; no hay ningun hueso dentro del craneo), y sin
  // el la caja se queda en la escapula, a y=1,420, que deja la cabeza fuera.
  // Ver el bloque de REGION_FRAME_CORE, donde esta la medida del corte.
  shoulder: ['vert_C1', 'clavicle', 'scapula', 'humerus_gh', 'forearm_flex', 'forearm_rot',
             'hand_flex'],
  // From the glenohumeral joint down, so the humerus gives the arc its
  // reference limb the way a goniometer does.
  elbow: ['humerus_gh', 'forearm_flex', 'forearm_rot', 'hand_flex'],
  // Vertebral blocks. Each borrows a few of the neighbouring segment's
  // vertebrae, because a regional range is read against the segment above and
  // below it, never in isolation.
  //
  // LA CORONILLA DE LA CERVICAL NO SE ARREGLA CON ESTA LISTA. Medido: con
  // estos huesos el cuadro va de y=1,274 a 1,669 y la coronilla esta en 1,709
  // (entraba el 82% de la cabeza). El rig no tiene ningun hueso por encima de
  // `vert_C1`, y alargar la lista hasta T12 sube el borde a 1,708 pero
  // convierte el primer plano cervical en un plano de raquis entero (0,394 ->
  // 0,730 m de escena). Se resuelve con un margen superior propio de la
  // region: ver REGION_FRAME_HEADROOM, mas abajo.
  cervical: ['vert_C1', 'vert_C2', 'vert_C3', 'vert_C4', 'vert_C5', 'vert_C6', 'vert_C7',
             'vert_T1', 'vert_T2', 'vert_T3'],
  // La toracica tambien sube hasta `vert_C1` por la misma razon que el hombro:
  // con la lista que llegaba solo a C7 el borde superior caia en y=1,593 y la
  // cabeza se cortaba a la altura de las orbitas (la region orbital va de 1,591
  // a 1,616). Entraba el 48% del alto de la cabeza; con C1 entra el 100%.
  thoracic: ['vert_C1', 'vert_C7', 'vert_T1', 'vert_T2', 'vert_T3', 'vert_T4', 'vert_T5',
             'vert_T6', 'vert_T7', 'vert_T8', 'vert_T9', 'vert_T10', 'vert_T11', 'vert_T12',
             'vert_L1'],
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
 *   - el nucleo (hasta el codo, mas la cabeza) mide 0,22 x 0,44 m, que compone
 *     cabeza y cuello con el acromion y el humero entero: la vista que un fisio
 *     espera al abrir "Hombro".
 *
 * Y lo que la mano necesita no es una caja mas grande, es que la camara la siga:
 * una sola caja que contenga a la vez el ritmo escapulohumeral y una mano a
 * y=1,91 m (medido: el radio del miembro desde la glenohumeral es 0,531 m) mide
 * 0,81 m de alto y vuelve a ser medio cuerpo. Ver el guardian de encuadre de
 * `RigViewer`, que amplia la caja --y solo la amplia-- cuando el arco saca un
 * hueso de cuadro.
 *
 *
 * Y LO QUE EL NUCLEO TENIA MAL: ENCUADRABA EL SEGMENTO, NO LA ARTICULACION.
 *
 * Medido reproduciendo la cadena entera fuera del navegador (posiciones de
 * reposo del GLB que se publica -> `regionFrameCore` -> `padBox` -> `padOf` ->
 * `fitToBox` de camera-controls, que redondea azimut y polar al eje mas
 * cercano, con la camara del lienzo: fov 45, RigViewer.tsx). Lienzo 1,6:1; el
 * resultado no cambia con el aspect mientras el lienzo sea mas ancho que alto,
 * porque en todas estas cajas quien limita es el ALTO.
 *
 *   HOMBRO. Nucleo clavicula/escapula/humero/codo: el punto mas alto era la
 *   escapula a y=1,420 y el borde superior del encuadre caia en y=1,565. La
 *   piel de la cabeza va de 1,488 a 1,709, asi que entraba el 35% de su alto y
 *   el corte pasaba por la boca (el orbicular de los labios esta en
 *   1,509..1,554): un torso decapitado ensenando los dientes, en la region
 *   estrella y en la pantalla de entrada.
 *
 *   CODO. Nucleo humero/antebrazo: `forearm_flex` (1,101) y `forearm_rot`
 *   (1,093) NO son el antebrazo, son la articulacion; el unico punto distal
 *   que tiene el miembro es la muneca (`hand_flex`, 0,864). Asi que la caja
 *   iba del hombro al codo y la encuadraba entera: el codo quedaba al 25% del
 *   alto, contra el borde de abajo, y del antebrazo (0,829..1,118) entraba el
 *   56%. Justo la rama movil del goniometro, cortada.
 *
 *   RODILLA. Nucleo femur/rotula/tibia: `femur_base` esta en y=0,865, o sea LA
 *   CADERA, y `patella` y `shin_flex` estan en el MISMO punto (separados
 *   4,2e-5 m, medido). La caja iba de la cadera a la rodilla sin ningun punto
 *   distal: la rodilla quedaba al 23% del alto y de la tibia (0,039..0,540)
 *   entraba el 52%. El usuario elegia "Rodilla" y la camara le ensenaba un
 *   muslo.
 *
 * LA REGLA QUE SALE DE AHI: una articulacion de miembro se encuadra POR LA
 * ARTICULACION, no por el segmento que cuelga de ella. Con los huesos de la
 * propia articulacion la caja es degenerada --un punto-- y `padBox` la eleva a
 * un cubo de `FRAME_MIN_SIDE`, que son 0,53 m de escena centrados en el eje
 * del movimiento (medido; la profundidad de 0,34 m aporta 0,14 de esos 0,53
 * porque `fitToBox` retrocede media profundidad).
 *
 * ANTES -> DESPUES, medido:
 *
 *   codo:    escena 0,559 -> 0,528 m | codo al 25% -> 50% del alto |
 *            antebrazo 56% -> 99% | humero 100% -> 86% (se pierde el extremo
 *            del hombro, que no es rama de ningun goniometro del codo)
 *   rodilla: escena 0,760 -> 0,528 m | rodilla al 23% -> 50% |
 *            tibia 52% -> 70% | femur 100% -> 63% (el 63% DISTAL, que es el
 *            que marca el eje del muslo)
 *   hombro:  escena 0,609 -> 0,833 m | cabeza 35% -> 100%
 *   toracica: escena 0,629 -> 0,797 m | cabeza 48% -> 100% (se cortaba por las
 *            orbitas). Aqui el techo no se toca en el nucleo sino en la lista
 *            completa, porque el raquis no tiene nucleo propio; asi el guardian
 *            tambien vigila `vert_C1`, que es lo que se quiere: la flexion
 *            toracica lleva la cabeza hacia delante y hacia abajo.
 *
 * Y LAS DOS OPCIONES QUE SE MIDIERON Y SE DESCARTARON para la rodilla, porque
 * "que se vea el segmento distal" tiene soluciones peores que el defecto:
 *
 *   - rodilla a tobillo [patella, shin_flex, foot_flex]: la tibia entra al
 *     100%, pero la rodilla se va al 77% del alto y del femur queda el 39%.
 *     Es el mismo defecto girado del reves.
 *   - cadera a tobillo (la lista completa): centra la rodilla al 49%, pero son
 *     1,443 m de escena, el 84% del alto del cuerpo. Medio cuerpo otra vez.
 */
export const REGION_FRAME_CORE: Record<string, readonly string[]> = {
  // Cintura escapular mas brazo HASTA EL CODO, mas la cabeza.
  //
  // El codo es el extremo distal del segmento que se lee: deja el humero
  // entero dentro, que es la rama de referencia del goniometro. Y `vert_C1`
  // (y=1,543) es el techo: el rig no tiene ningun hueso dentro del craneo, asi
  // que es el unico punto que puede empujar el borde superior por encima de la
  // coronilla (1,709). Barrido medido de las siete cervicales:
  //
  //   +C7 techo 1,609 (55% de la cabeza)   +C4 techo 1,669 (82%)
  //   +C2 techo 1,715 (100%, holgura 6 mm) +C1 techo 1,739 (100%, holgura 30 mm)
  //
  // C2 es el minimo aritmetico, pero deja la coronilla pegada al borde: 6 mm
  // sobre un encuadre de 0,80 m. C1 cuesta 31 mm mas de escena (0,802 ->
  // 0,833, un 3,9%) y deja 30 mm de aire. Sin cabeza ni cuello no hay
  // referencia de tronco contra la que leer el ritmo escapulohumeral que el
  // panel de la izquierda esta describiendo.
  shoulder: ['vert_C1', 'clavicle', 'scapula', 'humerus_gh', 'forearm_flex'],
  // El codo: los dos huesos DE LA ARTICULACION. Su caja mide 0,024 x 0,008 x
  // 0,010 m, degenerada por los tres lados, asi que es el cubo minimo centrado
  // en el codo. La mano y el hombro son lo que arrastra, y de eso se encarga el
  // guardian de `RigViewer`.
  elbow: ['forearm_flex', 'forearm_rot'],
  // La cadera abre con la pelvis y el muslo hasta la rodilla. Medido, aqui el
  // defecto no se da: la cadera cae al 64% del alto (no contra un borde) y el
  // femur entra entero. Se deja como estaba.
  hip: ['vert_sacrum', 'vert_L5', 'femur_base', 'patella'],
  // La rodilla: los dos huesos DE LA ARTICULACION, que en este rig estan en el
  // mismo punto. Caja degenerada -> cubo minimo centrado en la interlinea.
  knee: ['patella', 'shin_flex'],
  // El raquis y el tobillo no arrastran nada fuera de su propia caja, asi que
  // su nucleo es su lista completa y no hace falta repetirla aqui. El tobillo
  // tambien se midio: la articulacion cae al 23% del alto, pero ahi el cuerpo
  // SE ACABA (el pie va de 0,000 a 0,090) y la tibia entra al 100%, asi que es
  // el encuadre correcto y no el defecto de la rodilla.
};

/**
 * MARGEN EXTRA POR ENCIMA DE LA CAJA, en metros, para las regiones cuyo punto
 * mas alto de interes NO es un hueso.
 *
 * El rig no tiene ningun hueso por encima de `vert_C1` (y=1,543) y la piel del
 * craneo llega a 1,709. Una lista de huesos no puede apuntar a algo que no
 * existe, asi que el encuadre cervical --que es el unico que abre tan cerrado
 * sobre el cuello-- cortaba la coronilla: medido, el cuadro iba de y=1,274 a
 * 1,669 y entraba el 82% de la cabeza. Alargar la lista de huesos lo arregla a
 * costa de convertir el primer plano cervical en un plano de raquis entero
 * (0,394 -> 0,730 m de escena), que es peor.
 *
 * Subir el techo de la caja 6 cm antes de ajustar la camara sube el borde
 * superior exactamente esos 6 cm (la mitad por el centro, la mitad por el
 * alto): de 1,669 a 1,729, con 2 cm de aire sobre la coronilla, y la escena
 * pasa de 0,395 a 0,455 m. El hombro y la toracica no lo necesitan: sus cajas
 * ya suben hasta `vert_C1` con su margen proporcional, que es mayor.
 */
export const REGION_FRAME_HEADROOM: Record<string, number> = {
  cervical: 0.06,
};

/** El margen superior extra de una region, o 0. */
export function regionFrameHeadroom(region: string | null | undefined): number {
  return region ? (REGION_FRAME_HEADROOM[region] ?? 0) : 0;
}

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
 *
 * Y DESDE EL NUCLEO POR ARTICULACION TIENE UN SEGUNDO OFICIO, asi que este
 * numero ya no se puede mover a ojo: el codo y la rodilla abren con los huesos
 * de su propia articulacion, que dan una caja degenerada por los tres lados, y
 * es este minimo el que la convierte en el cubo del encuadre de apertura.
 * Medido con fov 45: un cubo de 0,34 m son 0,528 m de escena visible (0,387 de
 * la cara mas 0,141 que aporta la profundidad, porque `fitToBox` retrocede
 * media profundidad). Cambiar 0,34 cambia el zoom de apertura de esas dos
 * regiones; hay un test que lo sujeta.
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
