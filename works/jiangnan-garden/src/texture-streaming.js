import {ImageLoader,ImageBitmapLoader} from 'three';
import {resourceURL} from './resource-loader.js';
const definitions=[],byPreview=new Map(),textures=new Set(),images=new Map(),sources=new Map();
export function textureURL(preview,detail){const id=definitions.length;definitions.push({preview,detail});byPreview.set(preview,id);return preview;}
export function watchTexture(texture,url){
 if(!texture)return;
 const id=url!==undefined?byPreview.get(url):texture.userData.streamId;
 if(id===undefined)return;
 texture.userData.streamId=id;textures.add(texture);
 if(!sources.has(texture.source))sources.set(texture.source,{source:texture.source,preview:texture.image,id,textures:new Set(),detailed:false,active:false});
 sources.get(texture.source).textures.add(texture);
}
export function watchModelTextures(loaded,model){
 for(const [texture,association] of loaded.parser.associations)if(texture?.isTexture&&association?.textures!==undefined){const source=model.textures?.[association.textures]?.source;watchTexture(texture,model.images?.[source]?.uri);}
}
// One shared queue follows the current view. In-flight downloads may finish and
// enter the cache, but cannot replace a preview after its detail is deselected.
let desired=new Set(),upgrading;
const failed=new Map();
function keyFor(record){return definitions[record.id].detail+'|'+(record.preview?.constructor.name==='ImageBitmap');}
function replaceImage(record,image,detailed){record.source.data=image;record.detailed=detailed;for(const texture of record.textures)texture.needsUpdate=true;}
export function upgradeTextures(selected=textures,{enabled=true}={}){
 const next=new Set();
 if(enabled)for(const texture of selected){const record=sources.get(texture.source);if(record)next.add(record);}
 for(const record of next)if(!desired.has(record))failed.delete(keyFor(record));
 desired=next;
 if(!enabled)for(const record of sources.values())if(record.detailed)replaceImage(record,record.preview,false);
 async function worker(){
  while(true){
   const record=[...desired].find(r=>!r.detailed&&!r.active&&(failed.get(keyFor(r))??0)<=Date.now());
   if(!record)return;
   record.active=true;const key=keyFor(record),{detail}=definitions[record.id];
   try{
    if(!images.has(key)){
     const loader=record.preview?.constructor.name==='ImageBitmap'?new ImageBitmapLoader().setOptions({premultiplyAlpha:'none'}):new ImageLoader();
     images.set(key,resourceURL(detail,url=>loader.loadAsync(url)));
    }
    const image=await images.get(key);
    if(desired.has(record))replaceImage(record,image,true);
   }catch(error){failed.set(key,Date.now()+30000);images.delete(key);console.warn('Texture detail unavailable',error);}
   finally{record.active=false;}
  }
 }
 upgrading??=Promise.all(Array.from({length:4},worker)).finally(()=>{upgrading=null;});
 return upgrading.then(()=>[...desired].every(record=>record.detailed));
}
