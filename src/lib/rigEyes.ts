// src/lib/rigEyes.ts
//
// EL MODELO NO TIENE OJOS, Y SE NOTABA.
//
// La cara del GLB del laboratorio tiene la abertura de los parpados y NO trae
// globo ocular: buscado en la escena, no hay esclera, ni cornea, ni iris. Lo que
// habia detras de la abertura eran los siete musculos de cada orbita, en rojo:
// dos ojos encendidos. Se apagaron (ver OCULAR_NAME en RigModel), y entonces lo
// que asomaba era el orbicular de los parpados, que rodea la abertura: el mismo
// rojo, en anillo. En el plano de apertura del laboratorio --el que sale en
// cualquier video-- la cara seguia sin mirar.
//
// Aqui se ponen dos globos: esclera mate y calida, con el iris, su anillo limbar
// y la pupila delante. Es un ESQUEMA de ojo y se ve que lo es, como en cualquier
// modelo anatomico de aula: no finge un iris fotografico.
//
// DONDE: AJUSTADO AL BORDE DE LOS PARPADOS, NO A LOS RECTOS. Los parpados
// resbalan SOBRE el globo, asi que el borde libre de la abertura tiene que caer
// en su superficie. Ese borde se midio en la piel del rig en reposo (las aristas
// de `Orbital_region_*` que no comparten vertice con ningun otro parche): 19
// puntos por lado, x 0,018..0,0452, y 1,583..1,5977, z 0,073..0,0854. Es una
// abertura de 27 x 15 mm, grande (la de un adulto ronda 28 x 10). Estan en
// EYELID_RIM, abajo, y el test los usa.
//
// Lo que se probo, con el hueco maximo entre el borde y el globo (lo que deja
// ver el orbicular) y lo que el globo asoma por delante del borde:
//
//   esfera 23 mm centrada por los rectos   hueco 5,7 mm   (rojo en los cantos)
//   esfera 26 mm, minimos cuadrados        hueco 1,8 mm   (aun rojo en el
//                                                          canto lateral, visto)
//   elipsoide 30,5 x 27 x 27 mm            hueco 0,5 mm   asoma 0,96 mm
//
// Se queda el elipsoide. Es mas grande que un globo medio (24 mm) porque la
// abertura del modelo tambien lo es, y lo que se ve del globo es solo lo que
// cabe en ella. Que sea mas ancho que alto no es una licencia: la cornea de
// verdad tambien lo es (11,7 x 10,6 mm, un 10%).
//
// LA MIRADA. Con el iris en el polo del globo quedaban 3,7 mm de esclera bajo
// el iris y ninguno encima: un ojo que mira hacia arriba. Girado 4,2 grados
// hacia abajo, el parpado superior roza el iris y el inferior deja ver un poco
// de blanco, que es como mira una cara en reposo. Como el globo es de
// revolucion alrededor del eje x (alto = fondo), ese giro no mueve la esclera:
// solo baja el iris.
//
// QUE SIGAN A LA CABEZA. La piel y el musculo de la cara van atados en rigido a
// `vert_C1` (nota v8 de RigModel), asi que los globos se cuelgan de ese hueso
// con `attach`, que conserva la posicion de mundo: una flexion cervical lleva
// los ojos con la cara.
//
// CUANDO SE VEN. El ojo esta DENTRO de la orbita: con la piel o con el musculo
// encendidos es parte de la cara. Con solo hueso, dos bolas blancas flotando en
// las orbitas de una calavera son lo contrario de un atlas: se apagan. No se
// pueden pinchar para diseccionar (no son un musculo) y no entran en la lista
// de capas de RigModel: llevan su propia marca, `rigEye`, no `rigLayer`.

import * as THREE from 'three';

/** Centro del globo izquierdo (+x), en metros de mundo, con el rig en reposo. */
export const EYE_CENTER = { x: 0.0302, y: 1.5924, z: 0.0726 } as const;
/** Semieje vertical y de fondo del globo (es de revolucion alrededor de x). */
export const EYE_RADIUS = 0.0135;
/** Semieje horizontal. */
export const EYE_RX = 0.01525;
/** Cuanto mira hacia abajo, en radianes (4,2 grados). */
export const EYE_GAZE_DOWN = 0.073;
/** Iris de 11 mm; el anillo limbar lo rodea. */
const LIMBUS_R = 0.0061;
const IRIS_R = 0.0055;
const PUPIL_R = 0.0019;

/**
 * El borde libre de los parpados del lado izquierdo (+x), medido en la piel del
 * rig en reposo: las aristas de `Orbital_region_1` y `_2` que no comparten
 * vertice con otro parche de piel (a menos de 0,8 mm). El derecho es su espejo
 * exacto en x. Metros de mundo.
 */
export const EYELID_RIM: readonly (readonly [number, number, number])[] = [
  [0.0428, 1.5935, 0.0786], [0.039, 1.5962, 0.0824], [0.0341, 1.5977, 0.0849],
  [0.0293, 1.5972, 0.0854], [0.024, 1.5954, 0.0837], [0.021, 1.5936, 0.0823],
  [0.0188, 1.5923, 0.0817], [0.018, 1.5914, 0.0814], [0.0443, 1.5912, 0.0756],
  [0.0447, 1.5884, 0.0743], [0.0452, 1.5889, 0.073], [0.0427, 1.5858, 0.0768],
  [0.0396, 1.5842, 0.0792], [0.0359, 1.583, 0.0811], [0.0294, 1.5832, 0.0829],
  [0.0183, 1.5887, 0.0799], [0.018, 1.589, 0.0796], [0.0212, 1.5873, 0.0809],
  [0.0239, 1.5853, 0.0824],
];

/**
 * Distancia (m) de un punto a la superficie del globo izquierdo, a lo largo del
 * rayo desde su centro. Positiva: el punto queda por FUERA (un hueco, por el que
 * se ve lo de detras). Negativa: el globo asoma por delante de el.
 */
export function gapToEye(p: readonly [number, number, number]): number {
  const dx = p[0] - EYE_CENTER.x;
  const dy = p[1] - EYE_CENTER.y;
  const dz = p[2] - EYE_CENTER.z;
  const len = Math.hypot(dx, dy, dz);
  const ux = dx / len;
  const uy = dy / len;
  const uz = dz / len;
  const t = 1 / Math.sqrt((ux / EYE_RX) ** 2 + (uy / EYE_RADIUS) ** 2 + (uz / EYE_RADIUS) ** 2);
  return len - t;
}

/** El nombre de cada globo, para encontrarlos (y no duplicarlos). */
export const EYE_NAME = 'anatris_globo_ocular';

/** Las capas que deciden si los ojos se ven. */
export interface EyeLayers {
  skin: boolean;
  muscle: boolean;
}

/**
 * Con piel o con musculo el ojo es parte de la cara; con solo hueso (o solo
 * tendones, o nada) no: una orbita vacia es lo que ensena el esqueleto.
 */
export function eyesVisibleFor(st: EyeLayers): boolean {
  return st.skin || st.muscle;
}

/**
 * Un casquete centrado en +z y apoyado SOBRE el globo: el iris, el limbo y la
 * pupila. Un disco plano no vale: con su borde a ras del globo, el centro
 * quedaba por DETRAS de la esclera y esta lo tapaba entero; solo asomaba el
 * contorno, como un ojo dibujado con compas.
 *
 * Cada vertice del casquete se lleva por su rayo hasta la superficie del
 * elipsoide (mas `lift`), asi que el iris sigue redondo visto de frente (se
 * estira un 2% en horizontal, no el 13% del globo) y no se hunde en los lados.
 */
function cap(rDisc: number, lift: number, segs: number): THREE.BufferGeometry {
  const theta = Math.asin(Math.min(1, rDisc / EYE_RADIUS));
  const g = new THREE.SphereGeometry(1, segs, 6, 0, Math.PI * 2, 0, theta);
  // SphereGeometry abre el casquete alrededor de +y; girado 90 grados sobre x,
  // +y pasa a +z, que es hacia donde mira la cara.
  g.rotateX(Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const u = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    u.fromBufferAttribute(pos, i).normalize();
    const t = 1 / Math.sqrt((u.x / EYE_RX) ** 2 + (u.y / EYE_RADIUS) ** 2 + (u.z / EYE_RADIUS) ** 2);
    pos.setXYZ(i, u.x * (t + lift), u.y * (t + lift), u.z * (t + lift));
    // La normal del elipsoide en ese punto: (x/a^2, y/b^2, z/c^2).
    n.set((u.x * t) / EYE_RX ** 2, (u.y * t) / EYE_RADIUS ** 2, (u.z * t) / EYE_RADIUS ** 2).normalize();
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  return g;
}

function eye(materials: {
  sclera: THREE.Material;
  limbus: THREE.Material;
  iris: THREE.Material;
  pupil: THREE.Material;
}) {
  const g = new THREE.Group();
  g.name = EYE_NAME;
  // La esfera unidad escalada a los tres semiejes: `scale` lleva tambien las
  // normales (con la matriz normal), asi que el sombreado es el del elipsoide.
  const ballGeo = new THREE.SphereGeometry(1, 48, 32);
  ballGeo.scale(EYE_RX, EYE_RADIUS, EYE_RADIUS);
  const ball = new THREE.Mesh(ballGeo, materials.sclera);
  // Cada capa un pelo por encima de la anterior (0,15 mm): sin eso parpadean.
  const limbus = new THREE.Mesh(cap(LIMBUS_R, 0.00015, 48), materials.limbus);
  const iris = new THREE.Mesh(cap(IRIS_R, 0.0003, 48), materials.iris);
  const pupil = new THREE.Mesh(cap(PUPIL_R, 0.00045, 32), materials.pupil);
  g.add(ball, limbus, iris, pupil);
  g.traverse((o) => {
    o.userData.rigEye = true;
    // Fuera del raycast: un clic en el ojo no es un musculo que diseccionar, y
    // el doble clic que encuadra no debe acercarse a una esfera de adorno.
    (o as THREE.Mesh).raycast = () => {};
  });
  return g;
}

/** El hueso de la cabeza: `vert_C1`, o su copia con sufijo numerico. */
function headBoneOf(scene: THREE.Object3D): THREE.Object3D | null {
  let head: THREE.Object3D | null = null;
  scene.traverse((o) => {
    if (!head && (o as THREE.Bone).isBone && /^vert_C1(_\d+)?$/.test(o.name)) head = o;
  });
  return head;
}

/** Los globos que ya hay en la escena (0 o 2). */
export function eyesIn(scene: THREE.Object3D): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (o.name === EYE_NAME) out.push(o);
  });
  return out;
}

/**
 * Pone los dos globos colgados del hueso de la cabeza. Idempotente: si ya
 * estan (la escena del rig se reutiliza entre montajes), no hace nada.
 *
 * Se llama con el rig EN REPOSO (en la pasada de preparacion, antes del primer
 * fotograma que lo mueva): la posicion se da en mundo y `attach` la convierte a
 * la del hueso.
 *
 * @returns cuantos globos se anadieron (0 si ya estaban o falta el hueso).
 */
export function addEyes(scene: THREE.Object3D): number {
  if (eyesIn(scene).length > 0) return 0;
  const head = headBoneOf(scene);
  if (!head) return 0;
  const materials = {
    // Esclera calida y no blanca pura: con el tono de piel del rig, un blanco
    // de papel se leia como dos bolas de ping-pong.
    sclera: new THREE.MeshStandardMaterial({ color: 0xd9d1c4, roughness: 0.4, metalness: 0 }),
    limbus: new THREE.MeshStandardMaterial({ color: 0x2b211a, roughness: 0.4, metalness: 0 }),
    iris: new THREE.MeshStandardMaterial({ color: 0x5a4330, roughness: 0.3, metalness: 0 }),
    pupil: new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.18, metalness: 0 }),
  };
  let n = 0;
  for (const sx of [1, -1]) {
    const g = eye(materials);
    // Se coloca en coordenadas de MUNDO y despues se cuelga del hueso con
    // `attach`, que guarda la posicion de mundo: asi da igual como este
    // orientado el hueso en reposo. Un objeto SIN padre es justo eso para
    // `attach` --su matriz local se toma como la de mundo--, y el grupo mira a
    // +z (la cara), tambien en mundo, girado hacia abajo lo que dice la mirada.
    g.position.set(sx * EYE_CENTER.x, EYE_CENTER.y, EYE_CENTER.z);
    g.rotation.x = EYE_GAZE_DOWN;
    head.attach(g);
    n++;
  }
  return n;
}
