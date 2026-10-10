import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {gunzipSync} from 'three/addons/libs/fflate.module.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {watchModelTextures} from './texture-streaming.js';

// The standalone builder embeds compressed buffers and all image URIs.
export async function offlineGLTF(data){
 const model=structuredClone(data),urls=[];
 try{
  for(const buffer of model.buffers){
   if(!buffer.uri)continue;
   const packed=await fetch(buffer.uri),unpacked=typeof DecompressionStream==='function'?await new Response(packed.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():gunzipSync(new Uint8Array(await packed.arrayBuffer()));
   buffer.uri=URL.createObjectURL(new Blob([unpacked],{type:'application/octet-stream'}));urls.push(buffer.uri);
  }
  const loaded=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(JSON.stringify(model),'');
  watchModelTextures(loaded,model);
  return loaded;
 }finally{urls.forEach(url=>URL.revokeObjectURL(url));}
}
