// SACA DEL RIG LO QUE EL LABORATORIO NO PUEDE ENSENAR NUNCA.
//
// El laboratorio de movimiento solo enciende cuatro capas --piel, musculo,
// hueso, conectivo-- y la capa la decide el NOMBRE DEL MATERIAL
// (`layerForMaterial` en src/lib/materialColors.ts). Una malla cuyo material no
// cae en ninguna de las cuatro queda oculta en el arranque y NO HAY BOTON QUE LA
// ENCIENDA: paga la descarga entera para no verse jamas.
//
// Medido con `npm run audit-glb-waste` sobre public/cuerpo-rig.opt.glb:
//
//   Vein           44 mallas    71.766 vertices   7,17% del GLB
//   Artery         67 mallas    64.405 vertices   6,44%
//
// Las raices de los dientes y la dentina (30 mallas, 6.485 vertices) NO se
// quitan aunque esten en esa lista: comparten malla glTF con la corona, y
// quitar una primitiva de una malla compartida RENOMBRA a las que quedan. Ver
// el comentario de `nodoSobra`.
//   (sin material)  2 mallas     1.383 vertices   0,14%  contenedores de grupo
//   Movement        5 mallas       121 vertices   0,01%  flechas de referencia
//   Ligament.001    1 malla         54 vertices   0,01%  el perioniquio del pie
//
// LO QUE NO SE BORRA, Y POR QUE. Los nervios y los ganglios (90 mallas, 56.960
// vertices, 5,7%) se quedan: hoy la pestana Neuro dibuja los dermatomas como
// esquema y mueve los miotomas con el rig, sin geometria de nervio, pero ensenar
// el radial en el 3D es justo la clase de cosa que esta aplicacion querra hacer.
// La fascia y las bolsas serosas (58 mallas) tampoco: la fascia antebraquial
// estaba apagada y el antebrazo se veia como un tubo de hueso pelado, asi que
// ese cubo es de ENCENDER, no de borrar. Y la grasa infrarrotuliana (50
// vertices) es la almohadilla de Hoffa, que duele y se explora.
//
// Y LOS VASOS NO SE PIERDEN: el atlas de Explorar tiene su PROPIO modelo
// (public/modelo-opt.dec.glb, 6.316 mallas), donde nervios, vasos y organos si
// se pueden encender capa a capa. Aqui eran lastre.
//
// NO TOCA LA GEOMETRIA QUE SOBREVIVE. Quita nodos, poda lo que queda huerfano y
// vuelve a codificar con meshopt, que es un codec sin perdida. NO llama a
// `reorder()` ni a `quantize()` ni a `simplify()`: cualquiera de los tres
// reescribiria vertices que el runtime ya tiene medidos (la tabla de pesos
// horneados, el hundido de la fascia, los parches de piel de la rodilla).
// `npm run audit-rig-strip` lo comprueba vertice a vertice.
//
// Uso:  node scripts/strip-rig-glb.mjs <entrada.glb> <salida.glb> [--dry]

import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { statSync } from 'node:fs';

/**
 * Materiales que no pueden caer en ninguna capa viva del laboratorio.
 *
 * Tiene que casar con `layerForMaterial`: si alguien ensena los vasos algun dia,
 * primero cambia esa funcion y este banco deja de estar de acuerdo -- por eso
 * `npm run audit-rig-strip` vuelve a preguntarselo a la funcion de verdad en vez
 * de fiarse de esta lista.
 */
const MATERIALES_MUERTOS = new Set([
  'Vein',
  'Artery',
  'Movement',
  'Ligament.001',
]);

/** Contenedores de grupo de Z-Anatomy: malla sin material y nombre de sistema. */
const CONTENEDOR = /(_system|^General[_ ]terms$)/i;

/**
 * El nombre que vera el runtime.
 *
 * En el glTF el nodo se llama "Anterior tibial veins.l"; three.js lo entrega
 * como `Anterior_tibial_veinsl`. Comparar listas escritas contra el runtime con
 * los nombres crudos del fichero no casa nunca, y falla EN SILENCIO: el filtro
 * no encuentra nada y el GLB sale igual de gordo.
 */
const comoEnRuntime = (s) => String(s ?? '').replace(/ /g, '_').replace(/\./g, '');

const [input, output, ...flags] = process.argv.slice(2);
if (!input || !output) {
  console.error('Uso: node scripts/strip-rig-glb.mjs <entrada.glb> <salida.glb> [--dry]');
  process.exit(1);
}
const dry = flags.includes('--dry');

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
});

const mb = (p) => (statSync(p).size / 1048576).toFixed(2);
const antes = mb(input);

const doc = await io.read(input);
const root = doc.getRoot();

const cuenta = (d) => {
  let mallas = 0;
  let vertices = 0;
  for (const n of d.getRoot().listNodes()) {
    const m = n.getMesh();
    if (!m) continue;
    mallas++;
    for (const p of m.listPrimitives()) vertices += p.getAttribute('POSITION')?.getCount() ?? 0;
  }
  return { mallas, vertices };
};

const c0 = cuenta(doc);

/**
 * SE BORRA EL NODO ENTERO O NO SE BORRA NADA. Y costo una corrida entenderlo.
 *
 * Z-Anatomy mete varios materiales en una sola malla glTF y el cargador de three
 * parte cada primitiva en una malla propia: por eso el fichero tiene 1.920
 * mallas y el runtime ve 2.659. La corona del diente ("Teeth", que SI se ve como
 * hueso) y su raiz ("Teeth-roots", que no se ve nunca) son dos primitivas de la
 * MISMA malla, asi que la tentacion es quitar la primitiva muerta y dejar la
 * viva.
 *
 * NO SE PUEDE: el nombre que ve el runtime DEPENDE DE CUANTAS PRIMITIVAS HAY.
 * Con una sola, three usa el nombre del nodo (`Lower_caninel`); con varias, le
 * pega un sufijo por indice (`Lower_canine`, `Lower_canine_1`, ...). Al quitar
 * las raices, las 28 coronas que quedaban CAMBIARON DE NOMBRE, y el nombre de
 * malla es la clave de medio runtime: la tabla de pesos horneados, el resolutor
 * de musculos, las estructuras clinicas de los tests. El verificador lo cazo:
 * "28 mallas que aparecen de la nada".
 *
 * Asi que las raices y la dentina (6.485 vertices, 0,65% del GLB) se quedan
 * dentro. Cuestan menos que el riesgo.
 */
function nodoSobra(node) {
  const mesh = node.getMesh();
  if (!mesh) return null;
  const prims = mesh.listPrimitives();
  if (prims.length === 0) return null;
  const nombres = prims.map((p) => p.getMaterial()?.getName() ?? null);
  if (nombres.some((n) => n === null)) return null;
  if (!nombres.every((n) => MATERIALES_MUERTOS.has(n))) return null;
  return nombres[0];
}

const porMaterial = new Map();
const apuntar = (motivo, nombre, v) => {
  const g = porMaterial.get(motivo) ?? { mallas: 0, vertices: 0, ejemplos: [] };
  g.mallas++;
  g.vertices += v;
  if (g.ejemplos.length < 3) g.ejemplos.push(nombre);
  porMaterial.set(motivo, g);
};

const victimas = [];
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const prims = mesh.listPrimitives();
  if (prims.length === 0) continue;
  const verts = () => prims.reduce((t, p) => t + (p.getAttribute('POSITION')?.getCount() ?? 0), 0);

  // La bolsa vacia de Z-Anatomy: sin material y con nombre de sistema.
  if (prims.every((p) => p.getMaterial() == null)) {
    if (CONTENEDOR.test(comoEnRuntime(node.getName()))) {
      apuntar('(contenedor de grupo)', node.getName(), verts());
      victimas.push(node);
    }
    continue;
  }

  const motivo = nodoSobra(node);
  if (!motivo) continue;
  apuntar(motivo, node.getName(), verts());
  victimas.push(node);
}

console.log(`ENTRADA  ${input}  ${antes} MB`);
console.log(`         ${c0.mallas} mallas con geometria, ${c0.vertices.toLocaleString('es')} vertices`);
console.log('');
console.log('SE QUITAN:');
let totM = 0;
let totV = 0;
for (const [mat, g] of [...porMaterial.entries()].sort((a, b) => b[1].vertices - a[1].vertices)) {
  totM += g.mallas;
  totV += g.vertices;
  console.log(
    `  ${String(mat).padEnd(22)} ${String(g.mallas).padStart(4)} mallas ${String(g.vertices).padStart(8)} vert   ${g.ejemplos.join(', ')}`,
  );
}
console.log(
  `  ${'TOTAL'.padEnd(22)} ${String(totM).padStart(4)} mallas ${String(totV).padStart(8)} vert   (${((totV / c0.vertices) * 100).toFixed(1)}% de los vertices)`,
);

if (dry) {
  console.log('\n--dry: no se escribe nada.');
  process.exit(0);
}

// DISPONER LA MALLA NO DISPONE SUS PRIMITIVAS, y eso costo una corrida.
// En gltf-transform cada Primitive es una propiedad independiente que SUJETA sus
// accessors; tirar el nodo y la malla las deja huerfanas pero vivas, y entonces
// `prune` no se lleva ni un accessor. El sintoma era elocuente: quitar el 13,8%
// de los vertices dejaba el fichero en 18,17 MB desde 18,21 MB, un 0,2%. Habia
// que borrar las primitivas a mano.
for (const node of victimas) {
  const mesh = node.getMesh();
  node.dispose();
  // La malla queda huerfana si ningun otro nodo la usaba.
  if (mesh && mesh.listParents().filter((p) => p.propertyType === PropertyType.NODE).length === 0) {
    for (const prim of mesh.listPrimitives()) {
      mesh.removePrimitive(prim);
      prim.dispose();
    }
    mesh.dispose();
  }
}

// Poda SOLO lo que quedo colgando de las mallas borradas. NODE y SKIN quedan
// fuera a proposito: un hueso sin malla sigue siendo parte del esqueleto, y las
// cinco pieles compartidas del rig tienen que sobrevivir enteras.
await doc.transform(
  prune({
    propertyTypes: [
      PropertyType.MESH,
      PropertyType.ACCESSOR,
      PropertyType.MATERIAL,
      PropertyType.TEXTURE,
      PropertyType.BUFFER,
    ],
    keepLeaves: true,
    keepAttributes: true,
  }),
);

// FILTER, NO QUANTIZE. Es el metodo con el que se escribio este GLB
// (scripts/decimate-glb.mjs con --no-quantize), porque el rig es SKINNED y sus
// posiciones tienen que seguir en float32: la cuantizacion mete la
// transformacion de vuelta en el NODO, y una malla pielada no la aplica.
// Medido al equivocarse: con QUANTIZE el fichero salia a 18,97 MB, mas gordo
// que el original de 18,21 MB despues de quitarle el 13,8% de los vertices.
doc
  .createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });

await io.write(output, doc);

const c1 = cuenta(doc);
const despues = mb(output);
console.log('');
console.log(`SALIDA   ${output}  ${despues} MB  (eran ${antes} MB, ${(((antes - despues) / antes) * 100).toFixed(1)}% menos)`);
console.log(`         ${c1.mallas} mallas, ${c1.vertices.toLocaleString('es')} vertices`);
console.log(`         huesos ${root.listSkins().length} pieles / ${root.listNodes().length} nodos`);
console.log('');
console.log('Ahora: npm run audit-rig-strip  (compara vertice a vertice lo que sobrevive)');
