import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});

// --- minimal mat4 (column-major, glTF order) ---
function mul(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;}
function xform(m,p){const[x,y,z]=p;const w=m[3]*x+m[7]*y+m[11]*z+m[15]||1;return[(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,(m[2]*x+m[6]*y+m[10]*z+m[14])/w];}
const ID=[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

// world center per mesh name#prim, using node world matrix * local bbox center
function centers(doc){
  const out=new Map();
  for(const scene of doc.getRoot().listScenes()){
    const walk=(node,pw)=>{
      const w=mul(pw,node.getMatrix());
      const mesh=node.getMesh();
      if(mesh){
        mesh.listPrimitives().forEach((p,i)=>{
          const pos=p.getAttribute('POSITION'); if(!pos)return;
          const mn=pos.getMin([]),mx=pos.getMax([]);
          const lc=[(mn[0]+mx[0])/2,(mn[1]+mx[1])/2,(mn[2]+mx[2])/2];
          out.set(`${mesh.getName()}#${i}`, xform(w,lc));
        });
      }
      node.listChildren().forEach(ch=>walk(ch,w));
    };
    scene.listChildren().forEach(ch=>walk(ch,ID));
  }
  return out;
}
const inDistal=c=>((c[1]>0.6&&c[1]<0.86&&Math.abs(c[0])>0.18)||c[1]<0.12);
const inArm=c=>(Math.abs(c[0])>0.16&&c[1]>0.82&&c[1]<1.4);
const inWrist=c=>(Math.abs(c[0])>0.18&&c[1]>=0.86&&c[1]<0.96);
const sig=c=>`${inDistal(c)?'D':'.'}${inArm(c)?'A':'.'}${inWrist(c)?'W':'.'}`;

const a=centers(await io.read(process.argv[2]));
const b=centers(await io.read(process.argv[3]));
let flips=0, maxShift=0, worst='', n=0, missing=0;
for(const[k,ca]of a){
  const cb=b.get(k); if(!cb){missing++;continue;}
  n++;
  const d=Math.hypot(ca[0]-cb[0],ca[1]-cb[1],ca[2]-cb[2]);
  if(d>maxShift){maxShift=d;worst=k;}
  if(sig(ca)!==sig(cb)){flips++; if(flips<=8)console.log(`  FLIP ${k}: ${sig(ca)} -> ${sig(cb)}  y ${ca[1].toFixed(3)}->${cb[1].toFixed(3)} x ${ca[0].toFixed(3)}->${cb[0].toFixed(3)}`);}
}
console.log(`meshes compared: ${n}  unmatched: ${missing}`);
console.log(`max world-center shift: ${(maxShift*1000).toFixed(1)} mm  (worst: ${worst})`);
console.log(`region-classification FLIPS (distal/arm/wrist culls): ${flips}`);
console.log(flips===0 ? 'PASS: culls classify every mesh identically -> distal hand/foot stays capped' : 'REVIEW: some meshes changed region -> could re-expose broken parts');
