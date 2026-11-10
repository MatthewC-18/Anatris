// QUE PARTE DEL GLB DEL LABORATORIO NO SE PUEDE ENSENAR NUNCA.
//
// El rig pesa 19,1 MB y trae 2.659 mallas con 1.000.527 vertices. El
// laboratorio solo puede encender cuatro capas --piel, musculo, hueso,
// conectivo-- y la capa la decide el NOMBRE DEL MATERIAL
// (`layerForMaterial`). Una malla cuyo material no cae en ninguna de las
// cuatro queda oculta en el arranque y no hay boton que la encienda: paga la
// descarga, el parse y los pases para nada.
//
// POR QUE ESTE BANCO Y NO `audit-mesh-need`. Ese replica a mano el orden de
// clasificacion de RigModel (deduplicado por distancia, simetria de brazos,
// casquete distal) y HA DERIVADO: declara oculta la barriga del subescapular en
// los dos lados, y la aplicacion de verdad la ensena -- medido en el navegador
// con `window.__rigScene`, las 6 mallas `Subscapularis_*` salen `visible: true`
// y capa `muscle`. Es el fallo de [[render-harness-fidelity]] otra vez. Sus
// TOTALES siguen valiendo (649 mallas / 255.600 vertices ocultos medidos en la
// app contra 644 / 259.662 del banco, 1,6% de diferencia), pero sus veredictos
// malla a malla no.
//
// Este banco NO replica nada: pregunta por el material, que es una tabla pura.
// Lo unico que anade es la promocion que SI existe en la aplicacion --la fascia
// antebraquial, que `meshIsForearmFascia` sube a la capa de musculo-- para no
// contar como muerto algo que se ve.
//
// LO QUE SE MIDE: mallas y vertices por material muerto, y lo que pesarian en
// el fichero. Lo que NO: tiempo. Descolgar las mallas ocultas de la escena NO
// acelera los pases -- medido tres veces por modo con `audit-mesh-need --time`:
// 6371/5738/5478 ms con la escena completa contra 5428/5916/6130 ms con la
// escena podada. Las medianas (5.738 contra 5.916) no se distinguen del ruido,
// porque los pases caros solo recorren piel, musculo y conectivo y estas mallas
// no son ninguna de las tres. El premio de borrarlas es la DESCARGA, no la CPU.
//
// Run: npm run audit-glb-waste

import { readFileSync, statSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { layerForMaterial, meshIsForearmFascia } from '../src/lib/materialColors.ts';

/**
 * Tejido que el laboratorio no ensena pero que la pestana Neuro podria querer
 * algun dia. Se informa aparte para que borrarlo sea una decision y no un
 * descuido: el panel Neuro de hoy dibuja los dermatomas como esquema SVG y
 * mueve los miotomas con el rig, sin geometria de nervio, pero eso puede
 * cambiar.
 */
const RESERVA = /^(Nerve|Lymph)/;

/**
 * Tejido que probablemente haya que ENCENDER, no borrar.
 *
 * La fascia antebraquial estaba apagada y el antebrazo se veia como un tubo de
 * hueso pelado: fue la queja del usuario y se arreglo encendiendola y
 * hundiendola 10 mm (src/lib/rigForearmFascia.ts). La pierna trae la MISMA
 * cosa --`Crural_fascia`, los septos intermusculares-- y sigue apagada, asi que
 * el mismo defecto puede estar en la rodilla y el tobillo sin que nadie lo haya
 * mirado. Las bolsas serosas son el otro caso: un laboratorio de fisioterapia
 * habla de la bursa subacromial y de la infrapatelar constantemente.
 *
 * Borrar esto seria cerrar la puerta a un arreglo, no quitar lastre.
 *
 * MIRADO EN PANTALLA (10 nov 2026, /tobillo/movimiento): la pierna NO tiene el
 * defecto del antebrazo. Los vientres del triceps sural y del tibial anterior
 * cubren la tibia, el sobre de piel fantasma cierra el contorno y el blanco que
 * se ve es rotula y maleolos, que es donde el hueso ES subcutaneo de verdad.
 * Asi que la fascia crural no hace falta HOY. Se deja en este cubo porque el
 * dia que alguien desnude la pierna por capas volvera a hacer falta, no como
 * tarea pendiente.
 */
const ENCENDER = /^(Fascia|Bursa)/;

async function cargar(path: string): Promise<THREE.Group> {
  const buf = readFileSync(path);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return await new Promise((res, rej) => {
    loader.parse(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      '',
      (g) => res(g.scene as THREE.Group),
      rej,
    );
  });
}

interface Grupo {
  mallas: number;
  vertices: number;
  tris: number;
  ejemplos: string[];
}

const ruta = rigGlbPath();
const scene = await cargar(ruta);
const bytes = statSync(ruta).size;

let totM = 0;
let totV = 0;
const vivos = new Map<string, Grupo>();
const muertos = new Map<string, Grupo>();
const fasciaViva: string[] = [];

scene.traverse((o) => {
  const mesh = o as THREE.Mesh;
  if (!mesh.isMesh) return;
  const first = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const mat = (first as THREE.Material | undefined)?.name ?? '';
  const pos = mesh.geometry.getAttribute('position');
  const v = pos?.count ?? 0;
  const idx = mesh.geometry.getIndex();
  const t = Math.round(idx ? idx.count / 3 : v / 3);
  totM++;
  totV += v;

  const capa = layerForMaterial(mat);
  // La promocion que la aplicacion hace de verdad.
  const esFasciaViva = capa === null && meshIsForearmFascia(mesh.name, mat);
  if (esFasciaViva) fasciaViva.push(mesh.name);
  const destino = capa !== null || esFasciaViva ? vivos : muertos;

  const clave = mat || '(sin material)';
  const g = destino.get(clave) ?? { mallas: 0, vertices: 0, tris: 0, ejemplos: [] };
  g.mallas++;
  g.vertices += v;
  g.tris += t;
  if (g.ejemplos.length < 3) g.ejemplos.push(mesh.name);
  destino.set(clave, g);
});

const suma = (m: Map<string, Grupo>) => {
  let mallas = 0;
  let vertices = 0;
  for (const g of m.values()) {
    mallas += g.mallas;
    vertices += g.vertices;
  }
  return { mallas, vertices };
};

const vv = suma(vivos);
const mt = suma(muertos);
const pad = (n: number | string, w: number) => String(n).padStart(w);
const padR = (s: string, w: number) => s.padEnd(w);
const pct = (n: number) => `${((n / totV) * 100).toFixed(1)}%`;

console.log('===== PESO MUERTO DEL GLB DEL LABORATORIO =====');
console.log(`GLB  ${ruta}`);
console.log(`     ${(bytes / 1048576).toFixed(2)} MB en disco`);
console.log('');
console.log(`TOTAL                 ${pad(totM, 5)} mallas  ${pad(totV, 8)} vertices`);
console.log(`MATERIAL CON CAPA     ${pad(vv.mallas, 5)} mallas  ${pad(vv.vertices, 8)} vertices  (${pct(vv.vertices)})`);
console.log(`MATERIAL SIN CAPA     ${pad(mt.mallas, 5)} mallas  ${pad(mt.vertices, 8)} vertices  (${pct(mt.vertices)})`);
if (fasciaViva.length) {
  console.log(`  (de esas, ${fasciaViva.length} son fascia antebraquial, que SI se ve: ${fasciaViva.join(', ')})`);
}

const filas = [...muertos.entries()].sort((a, b) => b[1].vertices - a[1].vertices);
const cubos = {
  borrable: { mallas: 0, vertices: 0 },
  reserva: { mallas: 0, vertices: 0 },
  encender: { mallas: 0, vertices: 0 },
};
console.log('');
console.log('--- POR MATERIAL (ninguno tiene boton en el panel de Capas) ---');
console.log(`  ${padR('material', 22)} ${pad('mallas', 6)} ${pad('vertices', 9)} ${pad('%GLB', 7)}  ejemplos`);
for (const [mat, g] of filas) {
  const cubo = RESERVA.test(mat) ? 'reserva' : ENCENDER.test(mat) ? 'encender' : 'borrable';
  cubos[cubo].mallas += g.mallas;
  cubos[cubo].vertices += g.vertices;
  const marca = cubo === 'reserva' ? '[reserva neuro] ' : cubo === 'encender' ? '[ENCENDER?] ' : '';
  console.log(
    `  ${padR(mat, 22)} ${pad(g.mallas, 6)} ${pad(g.vertices, 9)} ${pad(`${((g.vertices / totV) * 100).toFixed(2)}%`, 7)}  ${marca}${g.ejemplos.join(', ')}`,
  );
}

console.log('');
console.log('--- EL REPARTO QUE IMPORTA ---');
console.log(
  `  BORRABLE SIN DISCUSION  ${pad(cubos.borrable.mallas, 5)} mallas  ${pad(cubos.borrable.vertices, 8)} vertices  (${pct(cubos.borrable.vertices)} del GLB)`,
);
console.log(
  `    -> ~${((bytes * (cubos.borrable.vertices / totV)) / 1048576).toFixed(1)} MB de descarga, a prorrata de vertices`,
);
console.log(
  `  RESERVA NEURO           ${pad(cubos.reserva.mallas, 5)} mallas  ${pad(cubos.reserva.vertices, 8)} vertices  (${pct(cubos.reserva.vertices)} del GLB)`,
);
console.log(
  `  CANDIDATA A ENCENDER    ${pad(cubos.encender.mallas, 5)} mallas  ${pad(cubos.encender.vertices, 8)} vertices  (${pct(cubos.encender.vertices)} del GLB)`,
);
console.log('');
console.log('Los vasos y los dientes no aparecen en ninguna region del laboratorio, y el');
console.log('atlas de Explorar tiene su PROPIO modelo (public/modelo-opt.dec.glb), donde');
console.log('nervios, vasos y organos si se pueden encender. Aqui son lastre.');
console.log('');
console.log('La fila [ENCENDER?] es la que hay que mirar en pantalla antes de tocar nada:');
console.log('la fascia antebraquial estaba en ese cubo y el antebrazo se veia como un tubo');
console.log('de hueso pelado. La pierna trae la crural y los septos, todavia apagados.');
