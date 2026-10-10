import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {watchModelTextures} from './texture-streaming.js';
import {resourceBytes,decompressResource} from './resource-loader.js';

// The standalone builder embeds compressed buffers and all image URIs.
export async function offlineGLTF(data){
 const model=structuredClone(data),urls=[];
 try{
  for(const buffer of model.buffers){
   if(!buffer.uri)continue;
   const unpacked=await decompressResource(await resourceBytes(buffer.uri));
   buffer.uri=URL.createObjectURL(new Blob([unpacked],{type:'application/octet-stream'}));urls.push(buffer.uri);
  }
  await Promise.all((model.images||[]).map(async image=>{if(image.uri.startsWith('data:'))return;const bytes=await resourceBytes(image.uri);image.uri=URL.createObjectURL(new Blob([bytes]));urls.push(image.uri);}));
  const loaded=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(JSON.stringify(model),'');
  watchModelTextures(loaded,data);
  return loaded;
 }finally{urls.forEach(url=>URL.revokeObjectURL(url));}
}
