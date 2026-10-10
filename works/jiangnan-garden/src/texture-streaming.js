import {ImageLoader,ImageBitmapLoader} from 'three';
const definitions=[],byPreview=new Map(),textures=new Set(),images=new Map();
export function textureURL(preview,detail){const id=definitions.length;definitions.push({preview,detail});byPreview.set(preview,id);return preview;}
export function watchTexture(texture,url){
 if(!texture)return;
 const id=url!==undefined?byPreview.get(url):texture.userData.streamId;
 if(id===undefined)return;
 texture.userData.streamId=id;textures.add(texture);
}
export function watchModelTextures(loaded,model){
 for(const [texture,association] of loaded.parser.associations)if(texture?.isTexture&&association?.textures!==undefined){const source=model.textures?.[association.textures]?.source;watchTexture(texture,model.images?.[source]?.uri);}
}
let upgrading;
export function upgradeTextures(){
 if(upgrading)return upgrading;
 upgrading=(async()=>{
  const queue=[...textures];let next=0,failures=0;
  async function worker(){while(next<queue.length){const texture=queue[next++],{detail}=definitions[texture.userData.streamId],bitmap=texture.image?.constructor.name==='ImageBitmap',key=detail+'|'+bitmap;
   try{if(!images.has(key)){const loader=bitmap?new ImageBitmapLoader().setOptions({premultiplyAlpha:'none'}):new ImageLoader();images.set(key,loader.loadAsync(detail));}const image=await images.get(key);texture.source.data=image;texture.needsUpdate=true;}catch(error){failures++;images.delete(key);console.warn('Texture detail unavailable',error);}
  }}
  await Promise.all(Array.from({length:4},worker));if(failures){upgrading=null;return false;}return true;
 })();return upgrading;
}
