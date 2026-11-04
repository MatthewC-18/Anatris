// src/lib/labCamera.ts
//
// DESDE DONDE SE MIRA CADA MOVIMIENTO.
//
// El laboratorio encuadraba la region correcta (labFraming.ts decide QUE entra
// en cuadro) pero nunca giraba la camara: se quedaba en la posicion inicial,
// un tres cuartos frontal, para los 34 movimientos. Eso significa que una
// flexion de cadera -- que ocurre entera en el plano sagital -- se veia de
// frente, donde 5 grados y 0 grados son el mismo dibujo. Medido en la propia
// aplicacion: al darle a reproducir la flexion de cadera, el panel marcaba 5
// grados y en pantalla no se apreciaba ningun cambio.
//
// Es el mismo error que hace que una foto de perfil no sirva para medir una
// abduccion. Un goniometro se coloca en el plano del movimiento; la camara
// tambien deberia.
//
// Cada movimiento ya declara su plano (`RomMovement.plane`), los 34 sin
// excepcion, asi que no hace falta una tabla nueva que se quede desfasada: la
// vista se deduce del dato que ya existe.

/** Angulos de camara-controls, en grados. */
export interface ReadingAngle {
  /** Giro alrededor del eje vertical. */
  azimuthDeg: number;
  /** Angulo desde el polo norte: 90 es la altura de los ojos. */
  polarDeg: number;
}

/**
 * Donde se pone la camara para leer un movimiento de este plano.
 *
 * - SAGITAL (flexion, extension): de perfil, desde el lado que se mueve. Desde
 *   el otro lado el cuerpo tapa el miembro.
 * - FRONTAL (abduccion, inclinacion lateral, inversion): de frente.
 * - TRANSVERSAL (rotaciones): de frente pero MAS ALTO, mirando algo hacia
 *   abajo. Una rotacion axial no tiene silueta propia en ningun plano vertical;
 *   lo que se ve girar es el eje largo del miembro, y eso se aprecia picando la
 *   camara. No se pone cenital del todo porque entonces se pierde de vista el
 *   resto del cuerpo, que es la referencia.
 *
 * Devuelve null cuando el plano no se reconoce, y entonces quien llama deja la
 * camara como esta en vez de inventarse un angulo.
 */
export function readingAngleFor(
  plane: string | null | undefined,
  side: 'R' | 'L',
): ReadingAngle | null {
  if (!plane) return null;
  // Sin acentos y en minuscula: el dato esta escrito a mano y convive
  // "Transversal" con "Transverso" (los dos aparecen en las regiones de cadera
  // y codo). Comparar la cadena tal cual dejaba sin vista la mitad de las
  // rotaciones.
  const p = plane
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  // El cuerpo mira hacia +Z y su lado DERECHO cae en -X (verificado en
  // AnatomyModel: +X es la izquierda del modelo). Con azimut 0 = camara en +Z
  // y azimut creciente girando hacia +X, mirar el lado derecho desde su propio
  // lado es -90 grados.
  const sideAzimuth = side === 'R' ? -90 : 90;

  if (p.startsWith('sagital')) return { azimuthDeg: sideAzimuth, polarDeg: 90 };
  if (p.startsWith('frontal')) return { azimuthDeg: 0, polarDeg: 90 };
  if (p.startsWith('transvers')) return { azimuthDeg: 0, polarDeg: 55 };
  return null;
}
