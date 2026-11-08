// src/lib/rigForearmUnmangle.ts
//
// ENDEREZA LAS MALLAS DEL ANTEBRAZO QUE EL RIG TRAE TUMBADAS.
//
// Cinco grupos de musculos superficiales del antebrazo -- extensor de los dedos,
// extensor del meñique, extensor del indice, el grupo del pulgar, flexor
// profundo de los dedos y palmar largo, con sus mitades tendinosas -- vienen del
// GLB del rig ATRAVESANDO el miembro en vez de recorrerlo: discos de 1,4-2,7 cm
// de largo y 11,8-14,9 cm de radio, con cajas envolventes de 23-39 cm en z, es
// decir asomando un palmo por delante y por detras del cuerpo.
//
// El recorte medido (`trimForearmOutliers`) los ocultaba, con razon: son barras
// cruzando el brazo. Pero al ocultarlos el cuarto distal del antebrazo se
// quedaba HUECO, con el radio y el cubito dentro, y la piel fantasma -- que
// existe para ensenar el musculo de debajo -- ahi solo ensenaba hueso pelado
// pegado a una mano opaca. Es el "la piel del brazo va hasta abajo y deja
// descubierto el hueso del antebrazo" que se reporto.
//
// NO HAY QUE INVENTAR NADA PARA ARREGLARLO. El GLB de Explorar -- el mismo
// modelo, sin riggear -- trae esas mismas mallas BIEN COLOCADAS.
// `npm run build-forearm-unmangle` mide el giro rigido que lleva la version del
// rig encima de la de Explorar y escribe la tabla. Medido: el flexor profundo de
// los dedos pasa de 8,67 cm de su version sana a 0,10 cm; el extensor de los
// dedos de 7,16 a 0,12; el palmar largo de 11,45 a 0,19. Treinta y cuatro
// mallas, giro de 90 grados casi todas.
//
// EL CONTROL NEGATIVO es `Flexor_carpi_radialis`: ya esta a 0,08 cm de su
// version sana, el metodo le calcula 1 grado de giro y la regla de admision lo
// deja en paz. Y el brachioradialis queda FUERA a proposito: esta a 2,17 cm
// pero mide el 33% del largo de la version sana, asi que no es un giro lo que
// le pasa -- es un fragmento, y alinear un fragmento contra el musculo entero
// no significa nada. Ese sigue pendiente de Blender.
//
// SE LLAMA UNA SOLA VEZ, en reposo, antes del recorte y antes de capturar el
// reposo: mueve geometria, no es idempotente.

import * as THREE from 'three';
import { FOREARM_UNMANGLE } from '../data/rigForearmUnmangle';

const TABLE = new Map<string, THREE.Matrix4>(
  FOREARM_UNMANGLE.map(([name, m]) => [name, new THREE.Matrix4().fromArray(m as number[])]),
);

/** Lo que hizo `unmangleForearmMeshes`. */
export interface UnmangleReport {
  /** Mallas enderezadas. */
  meshes: number;
  /** Nombres de la tabla que no estaban en la escena (reexportacion cambiada). */
  missing: string[];
}

/**
 * Lleva cada malla de la tabla a su sitio.
 *
 * La matriz es de MUNDO en reposo, asi que se conjuga con la matriz de la malla
 * para escribir vertices en su espacio local. La geometria se CLONA antes de
 * tocarla: las copias espejadas del GLB comparten buffers, y escribir en uno
 * movería tambien al gemelo del otro brazo (con su matriz, que no es esta).
 *
 * Las normales se rotan y se reescriben como Float32. No se recalculan: las del
 * GLB son Int8 cuantizadas y `computeVertexNormals()` sin borrar antes el
 * atributo las deja a cero y la malla sale NEGRA.
 */
export function unmangleForearmMeshes(scene: THREE.Object3D): UnmangleReport {
  const report: UnmangleReport = { meshes: 0, missing: [] };
  const seen = new Set<string>();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();

  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const world = TABLE.get(mesh.name);
    if (!world) return;
    seen.add(mesh.name);

    const geom = mesh.geometry.clone();
    const pos = geom.getAttribute('position');
    if (!pos) return;

    // mundo -> local de ESTA malla.
    mesh.updateWorldMatrix(true, false);
    const toLocal = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const local = toLocal.multiply(world).multiply(mesh.matrixWorld);
    const rot = new THREE.Matrix3().setFromMatrix4(local);

    const next = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(local);
      next[i * 3] = p.x;
      next[i * 3 + 1] = p.y;
      next[i * 3 + 2] = p.z;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(next, 3));

    const nrm = geom.getAttribute('normal');
    if (nrm) {
      const out = new Float32Array(nrm.count * 3);
      for (let i = 0; i < nrm.count; i++) {
        n.fromBufferAttribute(nrm, i).applyMatrix3(rot).normalize();
        out[i * 3] = n.x;
        out[i * 3 + 1] = n.y;
        out[i * 3 + 2] = n.z;
      }
      geom.setAttribute('normal', new THREE.BufferAttribute(out, 3));
    }

    geom.computeBoundingBox();
    geom.computeBoundingSphere();
    mesh.geometry = geom;
    report.meshes++;
  });

  for (const [name] of FOREARM_UNMANGLE) if (!seen.has(name)) report.missing.push(name);
  return report;
}
