import * as THREE from 'three';

/**
 * LA FASCIA DEL ANTEBRAZO TIENE QUE SER FONDO, Y PARA SERLO HAY QUE HUNDIRLA.
 *
 * El antebrazo era el unico segmento del cuerpo que enseñaba hueso pelado. Lo
 * que cierra ese hueco en el cuerpo real es la fascia antebraquial, que el
 * laboratorio tenia apagada con el resto de la fascia. Encenderla tal cual
 * cierra el hueco... y tapa los vientres, porque la fascia es la superficie
 * EXTERIOR del antebrazo: queda delante de todo y el miembro se convierte en un
 * tubo rojo liso. `renderOrder` no lo arregla --el orden de dibujo no cambia la
 * prueba de profundidad-- y `polygonOffset` solo desempata superficies
 * coincidentes, no superficies separadas.
 *
 * La reparacion es geometrica: hundir la fascia hacia dentro a lo largo de su
 * propia normal. Asi los vientres quedan por delante y la fascia solo asoma por
 * los huecos que habia entre el grupo flexor y el extensor.
 *
 * MEDIDO EN PANTALLA, contando dentro del contorno del miembro fila a fila
 * (misma camara, mismo fotograma, /hombro/movimiento). `relieve` es el salto
 * medio de luminancia entre pixeles vecinos: baja cuando el miembro se aplana
 * en una sola masa de color y sube cuando se leen vientres separados.
 *
 *   ANTEBRAZO -x        marfil (hueso)   relieve   escenario
 *   sin fascia               7,6%         16,10      14,9%
 *   fascia sin hundir        0,2%          7,32      16,3%   <- tubo liso
 *   hundida  3 mm            0,6%          9,34      16,0%
 *   hundida  6 mm            1,2%         11,30      15,9%
 *   hundida 10 mm            2,6%         14,05      15,4%   <- ELEGIDA
 *   hundida 14 mm            5,2%         16,14      15,1%   <- vuelve el hueso
 *
 *   ANTEBRAZO +x        marfil (hueso)   relieve
 *   sin fascia              15,4%         17,53
 *   fascia sin hundir        0,0%          4,86     <- relieve -72%
 *   hundida 10 mm            0,9%         13,81
 *
 * A 10 mm el marfil cae a un tercio del que habia sin fascia y el relieve se
 * queda en el 79-87% del original. A 14 mm el relieve se recupera entero pero el
 * hueso vuelve a asomar (5,2%), que es el defecto que veniamos a cerrar. El
 * brazo y el muslo no se mueven en ninguna fila: la fascia no los toca.
 */
export const FASCIA_SINK_M = 0.01;

/** Marca en la geometria, para que hundir dos veces no encoja el doble. */
const SUNK_KEY = '__fasciaHundida';

/**
 * Hunde la fascia hacia dentro a lo largo de su normal.
 *
 * Trabaja sobre la geometria en reposo, antes del skinning, asi que el
 * desplazamiento viaja con el hueso y no se despega al mover el codo.
 *
 * Es idempotente: si el efecto de preparacion vuelve a correr sobre el mismo
 * GLB cacheado, la segunda pasada no hace nada.
 *
 * @returns true si esta llamada movio los vertices.
 */
export function sinkForearmFascia(mesh: THREE.Mesh, metros = FASCIA_SINK_M): boolean {
  const geom = mesh.geometry as THREE.BufferGeometry | undefined;
  if (!geom) return false;
  if (geom.userData?.[SUNK_KEY]) return false;

  const pos = geom.attributes.position as THREE.BufferAttribute | undefined;
  const nor = geom.attributes.normal as THREE.BufferAttribute | undefined;
  // Sin normales no hay direccion "hacia dentro" que seguir. Y recalcularlas NO
  // es una salida: las normales de este GLB son Int8 cuantizadas y
  // `computeVertexNormals()` sin borrar antes el atributo las deja a cero, que
  // es la mancha negra de [[rig-quantized-normals]].
  if (!pos || !nor || nor.count !== pos.count) return false;

  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) - nor.getX(i) * metros,
      pos.getY(i) - nor.getY(i) * metros,
      pos.getZ(i) - nor.getZ(i) * metros,
    );
  }
  pos.needsUpdate = true;
  geom.computeBoundingSphere();
  geom.computeBoundingBox();
  geom.userData = { ...(geom.userData ?? {}), [SUNK_KEY]: true };
  return true;
}
