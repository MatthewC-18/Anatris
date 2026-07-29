// scripts/inspect-armature-roots.mjs
// Rest-pose world position of each armature ROOT and of the shoulder's first bone
// (clavicle) vs the thoracic vertebrae, so we can pick the vertebra whose motion
// the shoulder yoke should ride when the spine bends.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';

const GLB_PATH = process.argv[2] || 'rig-src/cuerpo-rig.glb';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(GLB_PATH);
const root = doc.getRoot();

function trs(t, r, s) {
  const [x, y, z, w] = r; const x2=x+x,y2=y+y,z2=z+z;
  const xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
  const [sx,sy,sz]=s;
  return [(1-(yy+zz))*sx,(xy+wz)*sx,(xz-wy)*sx,0,(xy-wz)*sy,(1-(xx+zz))*sy,(yz+wx)*sy,0,(xz+wy)*sz,(yz-wx)*sz,(1-(xx+yy))*sz,0,t[0],t[1],t[2],1];
}
function mul(a,b){const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;}
const parentOf=new Map();for(const n of root.listNodes())for(const c of n.listChildren())parentOf.set(c,n);
function world(n){let m=trs(n.getTranslation(),n.getRotation(),n.getScale());let p=parentOf.get(n);while(p){m=mul(trs(p.getTranslation(),p.getRotation(),p.getScale()),m);p=parentOf.get(p);}return m;}
const nameOf=(n)=>n?n.getName():'(none)';
const byName=new Map(root.listNodes().map(n=>[n.getName(),n]));
const pos=(n)=>{const m=world(n);return `[${m[12].toFixed(3)}, ${m[13].toFixed(3)}, ${m[14].toFixed(3)}]`;};

for (const nm of ['Shoulder_Armature_R','Shoulder_Armature_L','Leg_Armature_R','Leg_Armature_L','Spine_Armature']) {
  const n=byName.get(nm); console.log(nm.padEnd(22), n?pos(n):'(missing)');
}
console.log('--- shoulder first bones (clavicle) ---');
for (const skin of root.listSkins()) {
  if (!skin.getName().startsWith('Shoulder')) continue;
  const clav = skin.listJoints().find(j=>j.getName()==='clavicle');
  const hum = skin.listJoints().find(j=>j.getName()==='humerus_gh');
  console.log(skin.getName().padEnd(22), 'clavicle', clav?pos(clav):'?', ' humerus_gh', hum?pos(hum):'?');
}
console.log('--- thoracic vertebrae Y ---');
const spine=root.listSkins().find(s=>s.getName()==='Spine_Armature');
for (const j of spine.listJoints()) {
  const nm=j.getName();
  if (nm.startsWith('vert_T')||nm==='vert_C7') console.log(nm.padEnd(10), pos(j));
}
