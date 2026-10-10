import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import sharp from 'sharp';
import {MeshoptEncoder} from 'meshoptimizer';
import {MeshoptSimplifier} from 'three/addons/libs/meshopt_simplifier.module.js';
import {settleCurtain,settleQuilt} from '../src/cloth.js';

const work=resolve(import.meta.dirname,'..'),cache=resolve(work,'../../.cache/garden-optimized');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const dimension={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},size={5121:1,5122:2,5123:2,5125:4,5126:4};
const pending=new Map();
function once(key,run){if(!pending.has(key))pending.set(key,run().catch(e=>{pending.delete(key);throw e;}));return pending.get(key);}

// Keep source photographs and their dimensions intact. WebP is a deployment
// derivative, never a replacement for the attributed original asset.
export function imageAsset(path,overview=false){return once(path+(overview?':preview':''),async()=>{
 const original=await readFile(path),key=digest(Buffer.concat([Buffer.from('webp-q90-v3:'+overview),original]));
 await mkdir(cache,{recursive:true});const output=resolve(cache,key+'.webp');
 try{return {bytes:await readFile(output),extension:'.webp'};}catch{}
 const source=original.toString('latin1').match(/https?:\/\/[^\s\0<>]+/)?.[0]||'repository asset '+path.slice(work.length+1);
 const description='Source: '+source+'; high-quality WebP derivative, '+(overview?'512px distant mip preview':'original resolution retained');
 const xml=description.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const xmp=`<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:impeccable="https://impeccable.style/ns/1.0/"><impeccable:prompt>${xml}</impeccable:prompt></rdf:Description></rdf:RDF></x:xmpmeta>`;
 const webp=await sharp(original).resize(overview?{width:512,height:512,fit:'inside',withoutEnlargement:true}:{}).webp({quality:90,effort:6}).withXmp(xmp).toBuffer();
 // Do not enlarge a small original for the sake of changing its file format.
 if(webp.length>=original.length)return {bytes:original,extension:'.jpg'};
 await writeFile(output,webp);return {bytes:webp,extension:'.webp'};
});}

export function modelAsset(path,overview=false){return once(path+(overview?":overview":""),async()=>{
 await Promise.all([MeshoptEncoder.ready,MeshoptSimplifier.ready]);
 const original=await readFile(path),source=JSON.parse(original),raw=await readFile(resolve(dirname(path),source.buffers[0].uri));
 const key=digest(Buffer.concat([Buffer.from('meshopt-oct12-lod-v2:'+overview),original,raw]));await mkdir(cache,{recursive:true});
 const jsonPath=resolve(cache,key+'.json'),bufferPath=resolve(cache,key+'.bin');
 try{return {model:JSON.parse(await readFile(jsonPath,'utf8')),bytes:await readFile(bufferPath)};}catch{}
 const model=structuredClone(source),views=[],accessors=[],chunks=[];let compressedLength=0,decodedLength=0;
 function store(data,count,stride,mode,template,filter='NONE'){
  const encoded=MeshoptEncoder.encodeGltfBuffer(data,count,stride,mode,0),index=views.length;
  decodedLength=(decodedLength+3)&~3;
  views.push({buffer:1,byteOffset:decodedLength,byteLength:data.byteLength,...(mode==='ATTRIBUTES'?{byteStride:stride}:{}),extensions:{EXT_meshopt_compression:{buffer:0,byteOffset:compressedLength,byteLength:encoded.length,byteStride:stride,count,mode,filter}}});
  chunks.push(encoded);compressedLength+=encoded.length;decodedLength+=data.byteLength;
  accessors.push({...template,bufferView:index,byteOffset:0,count});return accessors.length-1;
 }
 for(const mesh of model.meshes)for(const primitive of mesh.primitives){
  const ia=source.accessors[primitive.indices],iv=source.bufferViews[ia.bufferView],indices=new Uint32Array(ia.count);
  for(let i=0;i<ia.count;i++)indices[i]=ia.componentType===5123?raw.readUInt16LE((iv.byteOffset||0)+(ia.byteOffset||0)+i*2):raw.readUInt32LE((iv.byteOffset||0)+(ia.byteOffset||0)+i*4);
  let active=indices;
  if(overview&&source.materials[primitive.material]?.name.includes('leaves')){
   function floats(id){const a=source.accessors[id],v=source.bufferViews[a.bufferView],d=dimension[a.type],out=new Float32Array(a.count*d);for(let i=0;i<out.length;i++){const offset=(v.byteOffset||0)+(a.byteOffset||0)+i*size[a.componentType];out[i]=a.componentType===5123?raw.readUInt16LE(offset)/65535:raw.readInt16LE(offset)/32767;}return out;}
   const positions=floats(primitive.attributes.POSITION),normals=floats(primitive.attributes.NORMAL),uv=floats(primitive.attributes.TEXCOORD_0),attributes=new Float32Array(positions.length/3*5);
   for(let i=0;i<positions.length/3;i++){attributes.set(normals.subarray(i*3,i*3+3),i*5);attributes.set(uv.subarray(i*2,i*2+2),i*5+3);}
   // Keep every disconnected leaf: no Prune, no random thinning. Only simplify
   // subdivisions at <=0.1% error for the distant overview; close views restore
   // the complete original face set.
   [active]=MeshoptSimplifier.simplifyWithAttributes(indices,positions,3,attributes,5,[.8,.8,.8,.5,.5],null,240000*3,.001,[]);
  }
  const [remap,count]=MeshoptEncoder.reorderMesh(active,true,true),attributes={};
  for(const [name,id] of Object.entries(primitive.attributes)){
   const a=source.accessors[id],v=source.bufferViews[a.bufferView],width=dimension[a.type]*size[a.componentType],stride=Math.ceil(width/4)*4;
   let data=new Uint8Array(count*stride),filter='NONE';
   for(let i=0;i<a.count;i++)if(remap[i]!==0xffffffff){const from=(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||width);data.set(raw.subarray(from,from+width),remap[i]*stride);}
   if(name==='NORMAL'&&a.componentType===5122){
    const normals=new Float32Array(count*4),view=new DataView(data.buffer);
    for(let i=0;i<count;i++)for(let k=0;k<3;k++)normals[i*4+k]=view.getInt16(i*stride+k*2,true)/32767;
    // No faces or positions are removed. Unit normals use octahedral encoding
    // at 12 bits (sub-degree directional error); UVs and positions stay exact.
    data=MeshoptEncoder.encodeFilterOct(normals,count,8,12);filter='OCTAHEDRAL';
   }
   attributes[name]=store(data,count,stride,'ATTRIBUTES',a,filter);
  }
  primitive.attributes=attributes;primitive.indices=store(new Uint8Array(active.buffer),active.length,4,'TRIANGLES',{...ia,componentType:5125});
 }
 model.bufferViews=views;model.accessors=accessors;
 model.buffers=[{byteLength:compressedLength},{byteLength:decodedLength,extensions:{EXT_meshopt_compression:{fallback:true}}}];
 model.extensionsUsed=[...new Set([...(model.extensionsUsed||[]),'EXT_meshopt_compression'])];
 model.extensionsRequired=[...new Set([...(model.extensionsRequired||[]),'EXT_meshopt_compression'])];
 const bytes=gzipSync(Buffer.concat(chunks),{level:9});
 await writeFile(jsonPath,JSON.stringify(model));await writeFile(bufferPath,bytes);return {model,bytes};
});}

// Static gravity has the same result at every visit. Evaluate it at build time,
// and embed the exact Float32 values instead of running thousands of iterations.
export function bakedCloth(){
 const panels=[[1.18,2.38,-1],[1.02,2.27,1]].map(args=>[args.join(':'),settleCurtain(...args)]),quilt=settleQuilt();
 const serialize=cloth=>`{cols:${cloth.cols},rows:${cloth.rows},positions:new Float32Array(${JSON.stringify(Array.from(cloth.positions))})}`;
 return `const panels=new Map([${panels.map(([key,p])=>`[${JSON.stringify(key)},${serialize(p)}]`).join(',')}]);const quilt=${serialize(quilt)};export function settleCurtain(w,h,s){const panel=panels.get([w,h,s].join(':'));if(!panel)throw new Error('Unknown baked curtain');return panel;}export function settleQuilt(){return quilt;}`;
}
