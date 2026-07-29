import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { colorForMaterial, materialIsSkin, tissueClassForMaterial } from '../src/lib/materialColors.ts';
const GLB = process.argv[2] || 'C:/Users/Matthew/Documents/Fisio/rig-src/cuerpo-rig.glb';
const buf = readFileSync(GLB); const ab=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
const gltf=await new Promise<any>((res,rej)=>new GLTFLoader().parse(ab,'',res,rej));
const scene=gltf.scene as THREE.Group; scene.updateMatrixWorld(true);
const matName=(m:THREE.Mesh)=>{const f=Array.isArray(m.material)?m.material[0]:m.material;return (f as any)?.name??'';};
const center=(m:THREE.Mesh)=>{const g=m.geometry;if(!g.boundingSphere)g.computeBoundingSphere();return g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);};
const inDistal=(c:THREE.Vector3)=>(c.y>0.6&&c.y<0.86&&Math.abs(c.x)>0.18)||c.y<0.12;
// skin dorsal(z<0) reach at wrist per side, per y-bin
const skinZ=new Map<string,number>();
scene.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh||!materialIsSkin(matName(m)))return;
  const b=new THREE.Box3().setFromObject(m);const c=center(m);
  if(Math.abs(c.x)<0.18||c.y<0.82||c.y>1.0)return;
  const side=Math.sign(c.x)>0?'R':'L';const k=`${side}_${Math.round(c.y*50)/50}`;
  skinZ.set(k,Math.min(skinZ.get(k)??0,b.min.z)); // most dorsal (negative z)
});
// bone meshes in wrist band
interface R{name:string;side:string;c:THREE.Vector3;minZ:number;maxAbsX:number}
const rows:R[]=[];
scene.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;const mn=matName(m);
  if(colorForMaterial(mn)===null)return;if(tissueClassForMaterial(mn)!=='bone')return;
  const c=center(m);if(inDistal(c))return;
  if(!(Math.abs(c.x)>0.18&&c.y>0.82&&c.y<0.98))return;
  const b=new THREE.Box3().setFromObject(m);
  rows.push({name:m.name.slice(0,34),side:c.x>0?'R':'L',c,minZ:b.min.z,maxAbsX:Math.max(Math.abs(b.min.x),Math.abs(b.max.x))});
});
console.log(`GLB: ${GLB}`);
console.log(`wrist-band BONE meshes (|x|>0.18, 0.82<y<0.98): ${rows.length}\n`);
console.log('side y     x     minZ(dorsal)  name');
for(const r of rows.sort((a,b)=>a.minZ-b.minZ)){
  const k=`${r.side}_${Math.round(r.c.y*50)/50}`;const sz=skinZ.get(k);
  const poke=(sz!==undefined)?(sz-r.minZ):NaN; // >0 => bone more dorsal than skin
  const flag=poke>0.005?'  <== BONE past dorsal skin':'';
  console.log(`${r.side}   ${r.c.y.toFixed(2)}  ${r.c.x.toFixed(2).padStart(5)}  ${r.minZ.toFixed(3)}  skinZ=${sz!==undefined?sz.toFixed(3):'  -  '} poke=${isNaN(poke)?' - ':poke.toFixed(3)}  ${r.name}${flag}`);
}
