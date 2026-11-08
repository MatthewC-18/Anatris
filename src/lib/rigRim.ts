// EL CONTORNO DE COLOR: DONDE VIVE EL PAPEL DE UN MÚSCULO, Y NO EN SU CARNE.
//
// EL DEFECTO QUE ESTO CIERRA, MEDIDO. El laboratorio señalaba el papel de un
// músculo (motor, freno excéntrico, asistente, estabilizador) poniéndole el
// color del papel en el EMISIVO, y el emisivo es aditivo: no lo atenúa ninguna
// luz. En espacio lineal, el teal del freno (0x2dd4bf) a intensidad 0,68 vale
// [0.018, 0.448, 0.354], y el albedo del músculo (0xc23b3b) vale
// [0.539, 0.044, 0.044]. O sea: el canal VERDE del emisivo era 10,2 veces el
// techo iluminado del músculo y el AZUL 8,1 veces, con cualquier iluminación.
// Compuesto en pantalla (ACES, exposición 0,95) salía #8ed0c4 -- hue 170,
// VERDE MENTA -- al lado de un músculo en reposo #9f1919, hue 0. Los cuatro
// papeles caían en hue 45 / 170 / 208 / 288: ninguno dentro de la banda del
// tejido (0-25°). En el plano estrella del hombro el pectoral salía verde menta
// y el contralateral rojo, y lo primero que piensa un fisio al verlo es que la
// aplicación está rota.
//
// Bajar la mezcla no lo arreglaba --ya se bajó dos veces, de 0,5-0,95 a
// 0,15-0,45 y de ahí a 0,10-0,30-- porque el problema no era la cantidad, era
// la TONALIDAD: el rojo del tejido vive SOLO en el canal rojo y tres de los
// cuatro tonos de papel tienen el rojo casi a cero en lineal (0x2dd4bf R=0,027;
// 0x38bdf8 R=0,040).
//
// LA SEPARACIÓN QUE SÍ FUNCIONA. Hay dos preguntas distintas en pantalla --"¿qué
// tejido es esto?" y "¿qué está haciendo ahora?"-- y estaban escritas en el
// mismo canal. El tono ya está ocupado por la primera: `HUE_JITTER` reparte
// ±13° para que 357 tonos de rojo distingan un músculo de su vecino. Así que:
//
//   - el VIENTRE lleva la brasa: su propio rojo, calentado y encendido;
//   - el CONTORNO lleva el tono del papel, en una banda de Fresnel que ocupa
//     ~12-18% del ancho de la silueta y no toca el centro de la carne.
//
// Este módulo es solo el contorno. Se comparte entre los dos sistemas que
// resaltan músculos --el brillo de actividad de `RigOverlays` y el resalte de
// selección de la disección en `RigModel`-- para que no vuelva a haber dos
// tratamientos distintos del mismo píxel.
//
// POR QUÉ UNA SOLA FUNCIÓN DE MÓDULO Y NO UNA POR MATERIAL: three cachea los
// programas por `onBeforeCompile.toString()`, así que todos los clones que
// pasen por aquí comparten UN programa compilado. Con ~943 mallas de músculo
// visibles, una función distinta por clon serían cientos de compilaciones y un
// tirón visible al encender un arco.
import * as THREE from 'three';

/** Los dos uniformes del contorno, para moverlos sin recompilar. */
export interface RimHandle {
  color: { value: THREE.Color };
  k: { value: number };
}

interface RimCarrier {
  userData: Record<string, unknown>;
  onBeforeCompile: (sh: { uniforms: Record<string, unknown>; fragmentShader: string }) => void;
  needsUpdate: boolean;
}

const RIM_KEY = '__rigRim';

/**
 * Engancha el contorno de Fresnel a un material CLONADO. Nunca a un material
 * compartido: el contorno es por malla resaltada, y escribir en el compartido
 * encendería el borde de las 943.
 */
export function attachRim(mat: THREE.Material): RimHandle {
  const carrier = mat as unknown as RimCarrier;
  const existing = carrier.userData[RIM_KEY] as RimHandle | undefined;
  // UN MANGO HEREDADO DE UN CLON NO SIRVE, Y HAY QUE MIRARLO.
  //
  // MEDIDO sobre three: `Material.clone()` copia `userData` con
  // `JSON.parse(JSON.stringify(...))`, asi que un THREE.Color guardado ahi sale
  // del clon convertido en un objeto PLANO {r,g,b} sin metodos. Y `clone()`
  // tampoco copia `onBeforeCompile`. O sea que un clon de un material que ya
  // llevaba contorno hereda un mango MUERTO y ningun shader: devolverlo tal cual
  // hace que `setRim` llame a `.setHex` sobre un objeto plano y lance.
  //
  // Y es un camino que existe: la diseccion viste la malla con su clon (con
  // contorno) y RigOverlays clona ESE material para el brillo del arco. Ver
  // src/lib/rigMaterialStack.ts, que documenta la misma convivencia de los dos
  // sistemas sobre la misma malla.
  if (existing && (existing.color?.value as THREE.Color | undefined)?.isColor) return existing;
  const handle: RimHandle = { color: { value: new THREE.Color(0x000000) }, k: { value: 0 } };
  carrier.userData[RIM_KEY] = handle;
  carrier.onBeforeCompile = (sh) => {
    sh.uniforms.uRimColor = handle.color;
    sh.uniforms.uRimK = handle.k;
    sh.fragmentShader =
      'uniform vec3 uRimColor;\nuniform float uRimK;\n' +
      sh.fragmentShader.replace(
        '#include <dithering_fragment>',
        [
          // `normal` ya viene volteada por three en las caras traseras, y
          // `vViewPosition` lo declara el shader de standard/physical, así que
          // esto vale igual para los dos.
          'float rimF = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);',
          'gl_FragColor.rgb += uRimColor * rimF * uRimK;',
          '#include <dithering_fragment>',
        ].join('\n'),
      );
  };
  carrier.needsUpdate = true;
  return handle;
}

/** Pone tono e intensidad del contorno. `k` 0 lo apaga sin recompilar. */
export function setRim(mat: THREE.Material, hex: number, k: number): void {
  const handle = (mat as unknown as RimCarrier).userData[RIM_KEY] as RimHandle | undefined;
  if (!handle) return;
  handle.color.value.setHex(hex);
  handle.k.value = k;
}

/**
 * LA BRASA. El emisivo de un músculo encendido es su PROPIO color calentado
 * hacia el naranja, nunca el tono del papel. Medido con `EMBER_MIX` 0,35: a
 * nivel 0,6 compone #d74531 (hue 7) y a nivel 1,0 #e45c40 (hue 10) -- el tono
 * nunca sale de 0-16° -- mientras la luminancia sube de 0,067 en reposo a 0,30
 * en el pico, 4,5 veces. "Encendido" se lee por luminancia, que es el canal
 * libre, y no por tono, que ya estaba ocupado.
 */
export const EMBER = new THREE.Color(0xff6a2a);
export const EMBER_MIX = 0.35;

/** Escribe la brasa sobre un clon, a partir del color de base del tejido. */
export function paintEmber(
  clone: THREE.MeshStandardMaterial,
  baseColor: THREE.Color,
  intensity: number,
): void {
  // El difuso NO se toca: el tejido sigue siendo del color que lo identifica.
  clone.color.copy(baseColor);
  clone.emissive.copy(baseColor).lerp(EMBER, EMBER_MIX);
  clone.emissiveIntensity = intensity;
}
