import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';

const GLB_PATH = 'public/modelo-opt.glb';
if (!fs.existsSync(GLB_PATH)) { console.error('No GLB en ' + GLB_PATH); process.exit(1); }

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

console.log('Leyendo GLB...');
const doc = await io.read(GLB_PATH);
const root = doc.getRoot();
const names = new Set();
for (const mesh of root.listMeshes()) { const n = mesh.getName(); if (n) names.add(n); }
for (const node of root.listNodes()) { if (node.getMesh()) { const n = node.getName(); if (n) names.add(n); } }

const all = [...names].sort();
fs.writeFileSync('mesh-names-all.txt', all.join('\n'), 'utf8');
console.log('Total: ' + all.length + ' -> mesh-names-all.txt');

const re = /vertebra|spinal|spinae|multifidus|semispinalis|longissimus|iliocostalis|splenius|scalene|sternocleidomastoid|quadratus_lumborum|psoas|iliacus|intertransvers|interspinal|rotatores|levator_cost|longus_colli|longus_capitis|rectus_capitis|obliquus_capitis|rectus_abdominis|oblique|cervic|thoracic|lumbar|sacr|coccy|atlas|axis|nuchae|supraspinous|interspinous|flav|costotransverse|costovertebral|disc/i;
const spine = all.filter((n) => re.test(n.toLowerCase()));
fs.writeFileSync('mesh-names-spine.txt', spine.join('\n'), 'utf8');
console.log('Columna: ' + spine.length + ' -> mesh-names-spine.txt');
