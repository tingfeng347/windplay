// Versioned bytes are shared between image, HDR and glTF loaders. Offline data
// URIs bypass the CDN, pack and persistent cache entirely.
import {gunzipSync} from 'three/addons/libs/fflate.module.js';
export async function decompressResource(bytes){
 if(bytes[0]!==31||bytes[1]!==139)return bytes;
 if(typeof DecompressionStream==='undefined')return gunzipSync(bytes);
 return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
}
export function unpackResources(bytes){
 const length=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(0,true);
 if(length>bytes.length-4)throw new Error('Invalid resource pack header');
 const entries=JSON.parse(new TextDecoder().decode(bytes.subarray(4,4+length))),resources=new Map();
 for(const [name,{offset,size}] of Object.entries(entries)){
  if(!Number.isInteger(offset)||!Number.isInteger(size)||offset<0||size<0||offset+size>bytes.length-4-length)throw new Error('Invalid resource pack range');
  resources.set(name,bytes.subarray(4+length+offset,4+length+offset+size));
 }return resources;
}
let cache,pack;const pending=new Map();
const meta=name=>typeof document==='undefined'?null:document.querySelector?.(`meta[name="${name}"]`)?.content;
function record(name){const scene=document.querySelector('#scene');if(scene)scene.dataset[name]=String(Number(scene.dataset[name]||0)+1);}
async function cacheStore(){try{return await (cache??=globalThis.caches?.open('windplay-garden-resources-v1'));}catch{return null;}}
async function verified(url,bytes){
 const expected=new URL(url).pathname.match(/-([a-f0-9]{16})\.[a-z.]+$/)?.[1];
 if(expected&&globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',bytes),actual=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');if(!actual.startsWith(expected))throw new Error('Resource version mismatch');}
 return bytes;
}
async function networkBytes(local){
 const base=meta('windplay-asset-base'),cdn=base&&new URL('assets/'+local.pathname.split('/assets/').pop(),base).href;
 const controllers=[],timers=[];
 async function request(url){const controller=new AbortController();controllers.push(controller);const response=await fetch(url,{credentials:'omit',signal:controller.signal});if(!response.ok)throw new Error(`Resource HTTP ${response.status}`);return verified(url,new Uint8Array(await response.arrayBuffer()));}
 try{
  if(!cdn||new URL(cdn).origin===local.origin)return await request(local.href);
  // A stalled CDN cannot hold up a working same-origin copy. Race complete
  // bodies, not just response headers, and cancel the losing download.
  let startLocal;const fallback=new Promise((resolve,reject)=>{let started=false;startLocal=()=>{if(!started){started=true;record('cdnFallbacks');request(local.href).then(resolve,reject);}};timers.push(setTimeout(startLocal,350));});
  const remote=request(cdn).catch(error=>{startLocal();throw error;});
  return await Promise.any([remote,fallback]);
 }finally{timers.forEach(clearTimeout);controllers.forEach(c=>c.abort());}
}
async function storedBytes(url){
 const local=new URL(url,document.baseURI),versioned=/-[a-f0-9]{16}\.[a-z.]+$/.test(local.pathname),store=versioned?await cacheStore():null;
 let cached;try{cached=await store?.match(local.href);}catch{}
 if(cached){record('assetCacheHits');return new Uint8Array(await cached.arrayBuffer());}
 const bytes=await networkBytes(local);if(store)(async()=>{try{await store.put(local.href,new Response(bytes));const keys=await store.keys?.();if(keys?.length>96)await Promise.all(keys.slice(0,keys.length-96).map(key=>store.delete(key)));}catch{}})();return bytes;
}
export async function resourceBytes(url){
 if(url.startsWith('data:')||url.startsWith('blob:'))return new Uint8Array(await (await fetch(url)).arrayBuffer());
 if(pending.has(url))return pending.get(url);
 const result=(async()=>{
  const packURL=meta('windplay-asset-pack');
  if(packURL&&/\.(?:webp|jpg|png|hdr)$/.test(url)){
   try{pack??=storedBytes(packURL).then(decompressResource).then(unpackResources);const entry=(await pack).get(url);if(entry)return entry;}catch(error){pack=null;throw error;}
  }
  return storedBytes(url);
 })();pending.set(url,result);try{return await result;}catch(error){pending.delete(url);throw error;}
}
export async function resourceURL(url,load){
 if(typeof document==='undefined'||!document.baseURI||url.startsWith('data:')||url.startsWith('blob:'))return load(url);
 const bytes=await resourceBytes(url),blob=URL.createObjectURL(new Blob([bytes]));try{return await load(blob);}finally{URL.revokeObjectURL(blob);}
}
