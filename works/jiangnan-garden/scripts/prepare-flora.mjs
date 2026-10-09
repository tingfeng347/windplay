// Offline preparation of CC0 botanical geometry. Original high-density buffers
// live in the ignored root cache; the editable glTF and compact buffer ship here.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {MeshoptSimplifier} from 'three/addons/libs/meshopt_simplifier.module.js';
await MeshoptSimplifier.ready;
const work=resolve(import.meta.dirname,'..'),repo=resolve(work,'../..');
for(const name of ['tree_small_02','fern_02']){
 const root=resolve(work,'assets/models',name),source=JSON.parse(await readFile(resolve(root,'original.gltf.json'),'utf8'));
 const bytes=await readFile(resolve(repo,'.cache/garden-models',name+'.bin'));
 const dimensions={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},types={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array};
 function decode(index){
  const a=source.accessors[index],v=source.bufferViews[a.bufferView],size=dimensions[a.type],Type=types[a.componentType],result=new Type(a.count*size),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),step=Type.BYTES_PER_ELEMENT;
  for(let i=0;i<a.count;i++)for(let k=0;k<size;k++){const p=(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||size*step)+k*step;result[i*size+k]=a.componentType===5126?view.getFloat32(p,true):a.componentType===5125?view.getUint32(p,true):a.componentType===5123?view.getUint16(p,true):view.getUint8(p);}
  return result;
 }
 const out=structuredClone(source);out.accessors=[];out.bufferViews=[];const chunks=[];let length=0,totalBefore=0,totalAfter=0;
 const quantize=name==='tree_small_02',min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 if(quantize)for(const mesh of source.meshes)for(const p of mesh.primitives){const a=source.accessors[p.attributes.POSITION];for(let k=0;k<3;k++){min[k]=Math.min(min[k],a.min[k]);max[k]=Math.max(max[k],a.max[k]);}}
 const extent=max.map((v,k)=>v-min[k]);
 if(quantize){out.nodes[0].translation=min;out.nodes[0].scale=extent;out.extensionsUsed=[...(out.extensionsUsed||[]),'KHR_mesh_quantization'];out.extensionsRequired=['KHR_mesh_quantization'];}
 function store(data,type,componentType=5126,normalized=false){
  const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}
  const b=Buffer.from(data.buffer,data.byteOffset,data.byteLength),bufferView=out.bufferViews.length;out.bufferViews.push({buffer:0,byteOffset:length,byteLength:b.length});chunks.push(b);length+=b.length;
  const a={bufferView,componentType,count:data.length/dimensions[type],type};
  if(normalized)a.normalized=true;
  if(type==='VEC3'){a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i++) {const k=i%3;a.min[k]=Math.min(a.min[k],data[i]);a.max[k]=Math.max(a.max[k],data[i]);}}
  out.accessors.push(a);return out.accessors.length-1;
 }
 for(const mesh of out.meshes)for(const primitive of mesh.primitives){
  const original=structuredClone(primitive),positions=decode(original.attributes.POSITION),attributes=Object.fromEntries(Object.entries(original.attributes).map(([k,i])=>[k,decode(i)]));
  let indices=new Uint32Array(decode(original.indices));totalBefore+=indices.length/3;
  if(name==='tree_small_02'){
   const normal=attributes.NORMAL,uv=attributes.TEXCOORD_0,stride=5,attr=new Float32Array(positions.length/3*stride);
   for(let i=0;i<positions.length/3;i++){attr.set(normal.subarray(i*3,i*3+3),i*stride);attr.set(uv.subarray(i*2,i*2+2),i*stride+3);}
   const target=Math.min(indices.length,original.material===1?120000*3:16000*3);
   [indices]=MeshoptSimplifier.simplifyWithAttributes(indices,positions,3,attr,stride,[.2,.2,.2,.15,.15],null,target,.003,original.material===1?['LockBorder']:[]);
  }
  const [remap,count]=MeshoptSimplifier.compactMesh(indices);primitive.attributes={};
  for(const [key,data] of Object.entries(attributes)){
   const dim=dimensions[source.accessors[original.attributes[key]].type],compact=new Float32Array(count*dim);
   for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff)for(let k=0;k<dim;k++)compact[remap[i]*dim+k]=data[i*dim+k];
   const type=source.accessors[original.attributes[key]].type;
   if(quantize&&key==='POSITION'){
    const packed=new Uint16Array(compact.length);for(let i=0;i<compact.length;i++)packed[i]=Math.round((compact[i]-min[i%3])/extent[i%3]*65535);primitive.attributes[key]=store(packed,type,5123,true);
   }else if(quantize&&key==='NORMAL'){
    const packed=new Int16Array(compact.length);for(let i=0;i<compact.length;i+=3){const n=compact.subarray(i,i+3).map((v,k)=>v*extent[k]),len=Math.hypot(...n);for(let k=0;k<3;k++)packed[i+k]=Math.round(n[k]/len*32767);}primitive.attributes[key]=store(packed,type,5122,true);
   }else if(quantize&&key.startsWith('TEXCOORD')&&compact.every(v=>v>=0&&v<=1)){
    const packed=Uint16Array.from(compact,v=>Math.round(v*65535));primitive.attributes[key]=store(packed,type,5123,true);
   }else primitive.attributes[key]=store(compact,type);
  }
  primitive.indices=store(indices,'SCALAR',5125);totalAfter+=indices.length/3;
 }
 out.buffers=[{uri:'model.bin',byteLength:length}];out.asset.extras={origin:`https://polyhaven.com/a/${name}`,license:'CC0-1.0',originalBufferSha256:createHash('sha256').update(bytes).digest('hex'),preparation:'MeshoptSimplifier with normals/UV preservation; original geometry proportions and materials retained',trianglesBefore:totalBefore,trianglesAfter:totalAfter};
 await writeFile(resolve(root,'model.bin'),Buffer.concat(chunks));await writeFile(resolve(root,'model.gltf'),JSON.stringify(out));
 console.log(name,totalBefore,'→',totalAfter,'triangles',length,'bytes');
}
