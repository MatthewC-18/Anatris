// src/lib/rigHipSkin.ts
//
// EL PLIEGUE GLUTEO SE ABRIA Y ENSEÑABA EL GLUTEO MAYOR.
//
// A 45 grados de flexion de cadera aparecia una banda roja entre la nalga y el
// muslo, y a 90 ya era un corte limpio. No es una malla mal ligada: es que la
// piel de la cadera vive en DOS ESQUELETOS distintos.
//
//   Gluteal_region_*, Inguinal_region_*, Femoral_triangle_*
//       -> esqueleto del RAQUIS, 100% en `vert_sacrum`
//   Anterior_region_of_thigh_*, Posterior_region_of_thigh_*
//       -> esqueleto de la PIERNA, en `femur_base`
//
// Ninguna mezcla por vertice puede unirlos, porque el esqueleto del gluteo no
// contiene el femur y el del muslo no contiene el sacro. Al flexionar, el muslo
// gira y la nalga se queda: no hay transicion, hay un borde.
//
// POR QUE NO SE ARREGLA CON `relaxSkinSeams`. Se probo. Aquella pasada suelda
// los vertices coincidentes y, cuando los soldados no se ponen de acuerdo, les
// da el peso del TEJIDO QUE TIENEN DEBAJO. Debajo del pliegue gluteo lo que hay
// es gluteo mayor, que va con la pelvis, tambien por el lado del muslo: el
// resultado fue peor que el fallo, con medio muslo quedandose atras y el
// cuadriceps al aire. Es la herramienta del hombro y alli funciona porque bajo
// la piel del hombro hay musculo que SI va con el brazo.
//
// LO QUE SE HACE AQUI. Las teselas del lado de la pelvis se vuelven a ligar al
// esqueleto de la PIERNA, con dos huesos: el femur y la raiz del armature de la
// pierna, que esta QUIETA. Y quieta no es una suposicion: `vert_sacrum` tampoco
// se mueve nunca (medido: cero centimetros y cero grados en flexion lumbar, en
// rotacion lumbar y en flexion toracica, porque el sacro es la BASE de la
// cadena del raquis). De modo que lo que antes obedecia al sacro y ahora
// obedece a la raiz de la pierna se comporta exactamente igual... salvo que
// ahora puede mezclarse con el femur, que es lo unico que faltaba.
//
// El reparto es por profundidad bajo la articulacion: en la cresta iliaca no se
// toca nada, y a una mano por debajo la piel acompaña al muslo del todo, que es
// donde empieza la piel que ya era del muslo. Entre medias se reparte de forma
// continua, para que la nalga se ESTIRE en vez de partirse.
//
// Seguro en reposo: los pesos suman uno y toda matriz de hueso es identidad en
// el bind, asi que la postura neutra no se mueve ni un pixel; `bindMatrix` se
// conserva al religar, de modo que cambiar de esqueleto tampoco la mueve.

import * as THREE from 'three';
import { dominantBoneName } from './rigArmRebind';

/**
 * Profundidad bajo la articulacion de la cadera, en metros, en la que la piel
 * pasa de ser de la pelvis a ser del muslo.
 *
 * Diez centimetros es, medido en este rig, la distancia entre la articulacion y
 * donde empieza la piel que el GLB ya daba al femur: si la transicion acabase
 * antes quedaria un escalon, y si acabase despues se solaparian dos reglas.
 */
export const HIP_SKIN_BAND_M = 0.1;

/** Mas cerca de la linea media que esto no se toca (perine, pubis, sacro). */
const MIDLINE_M = 0.05;

/** Lo que hizo `blendHipSkin`. */
export interface HipSkinReport {
  /** Teselas de piel de la pelvis religadas al esqueleto de la pierna. */
  meshes: number;
  /** Lados en los que no se encontro el armature o el femur. */
  skipped: string[];
}

const _v = new THREE.Vector3();

/**
 * Reparte la piel de la cadera entre la pelvis y el femur, cruzando esqueletos.
 *
 * `classify` lo decide quien llama, porque la clasificacion por material vive
 * en su lado (la aplicacion ya la tiene calculada mientras recorre).
 *
 * Idempotente en lo que importa: una segunda pasada ya no encuentra teselas con
 * `vert_sacrum` como hueso dominante, porque la primera se las llevo.
 */
export function blendHipSkin(
  scene: THREE.Object3D,
  classify: (mesh: THREE.Mesh) => 'skin' | 'other',
): HipSkinReport {
  const report: HipSkinReport = { meshes: 0, skipped: [] };

  for (const side of ['R', 'L'] as const) {
    const root = scene.getObjectByName(`Leg_Armature_${side}`);
    if (!root) {
      report.skipped.push(`${side}: sin armature`);
      continue;
    }
    let femur: THREE.Object3D | null = null;
    root.traverse((o) => {
      if (!femur && o.name.replace(/_\d+$/, '') === 'femur_base') femur = o;
    });
    if (!femur) {
      report.skipped.push(`${side}: sin femur`);
      continue;
    }
    const femurBone = femur as THREE.Object3D;
    const hip = femurBone.getWorldPosition(new THREE.Vector3());
    // `_R` esta en +x, que es la IZQUIERDA anatomica. Aqui solo importa el
    // signo geometrico: cada armature se queda con la piel de SU lado.
    const sideSign = side === 'R' ? 1 : -1;

    // Un esqueleto de dos huesos por lado: la raiz quieta y el femur. Se crea
    // uno nuevo en vez de ampliar el de la pierna porque ese lo comparten
    // todas las mallas del miembro y no hace falta tocarlas.
    const skeleton = new THREE.Skeleton([
      root as THREE.Bone,
      femurBone as THREE.Bone,
    ]);

    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || classify(mesh) !== 'skin') return;
      const sk = mesh as THREE.SkinnedMesh;
      if (!sk.isSkinnedMesh || !sk.skeleton) return;
      const dom = dominantBoneName(mesh);
      if (dom !== 'vert_sacrum' && dom !== 'femur_base') return;
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      const bs = mesh.geometry.boundingSphere;
      if (!bs) return;
      const c = bs.center.clone().applyMatrix4(mesh.matrixWorld);
      if (Math.abs(c.x) < MIDLINE_M || Math.sign(c.x) !== sideSign) return;

      const pos = mesh.geometry.getAttribute('position');
      if (!pos) return;
      // SE ELIGE POR DONDE LLEGA LA TESELA, NO POR DONDE ESTA SU CENTRO.
      //
      // El primer pase miraba el centro de la esfera envolvente, y eso dejaba
      // escapar justo a las culpables. `Anterior_region_of_thigh_2` tiene el
      // centro a 14 cm POR DEBAJO de la cadera -- parece muslo y nada mas --
      // pero su borde superior sube hasta 8 cm POR ENCIMA de la articulacion, y
      // viene ligada 100% a `femur_base`, sin un solo vertice de transicion. Al
      // girar el femur, ese trozo de piel que esta a la altura de la cresta
      // iliaca se va con el muslo: medido, 7,2 cm, mientras sus vecinas a esa
      // misma altura (`Gluteal_region_4`, `Femoral_triangle_2`) se quedan en
      // 0,0 cm. De ahi el agujero que se abria en la rotacion interna de
      // cadera, por el que se veian el gluteo mayor y el femur.
      //
      // Cogiendolas por su EXTREMO SUPERIOR el degradado por altura hace el
      // resto solo: lo que esta a mas de una mano por debajo de la cadera sigue
      // siendo 100% femur y no se mueve ni un pixel, y lo que sube a la pelvis
      // se queda quieto como sus vecinas.
      if (dom === 'vert_sacrum') {
        // Lado de la PELVIS: alrededor de la articulacion. Por debajo ya es
        // muslo (y lo lleva el esqueleto de la pierna), muy por encima es
        // abdomen y no se entera.
        if (c.y < hip.y - 0.2 || c.y > hip.y + 0.12) return;
      } else {
        // Lado del MUSLO: entra si LLEGA a la cadera, aunque su centro este
        // muy abajo.
        let top = -Infinity;
        for (let i = 0; i < pos.count; i++) {
          _v.fromBufferAttribute(pos, i);
          mesh.localToWorld(_v);
          if (_v.y > top) top = _v.y;
        }
        if (top < hip.y) return;
      }

      const si = mesh.geometry.getAttribute('skinIndex');
      const sw = mesh.geometry.getAttribute('skinWeight');
      if (!pos || !si || !sw) return;
      for (let i = 0; i < pos.count; i++) {
        _v.fromBufferAttribute(pos, i);
        mesh.localToWorld(_v); // en reposo los huesos son identidad
        let t = (hip.y - _v.y) / HIP_SKIN_BAND_M;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        t = t * t * (3 - 2 * t); // smoothstep, para que no quede un pliegue duro
        si.setXYZW(i, 0, 1, 0, 0);
        sw.setXYZW(i, 1 - t, t, 0, 0);
      }
      si.needsUpdate = true;
      sw.needsUpdate = true;
      sk.bind(skeleton, sk.bindMatrix);
      report.meshes++;
    });
  }
  return report;
}
