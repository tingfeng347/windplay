import * as T from 'three';
import {offlineGLTF} from './offline-gltf.js';
import {watchTexture} from './texture-streaming.js';
import chairData from '../assets/models/chinese_armchair/model.gltf';
import tableData from '../assets/models/chinese_tea_table/model.gltf';

export async function furnitureModels(){
 const [chair,table]=await Promise.all([offlineGLTF(chairData),offlineGLTF(tableData)]),templates={};
 for(const [name,loaded] of [['chair',chair],['table',table]]){
  loaded.scene.traverse(o=>{
   if(!o.isMesh)return;
   o.castShadow=o.receiveShadow=true;const original=o.material;
   o.material=new T.MeshPhysicalMaterial({map:original.map,normalMap:original.normalMap,normalScale:new T.Vector2(.7,.7),roughnessMap:original.roughnessMap,roughness:1,metalness:0,clearcoat:.12,clearcoatRoughness:.32});
   o.material.aoMap=original.roughnessMap.clone();o.material.aoMap.channel=0;o.material.aoMapIntensity=.85;
   for(const texture of [o.material.map,o.material.normalMap,o.material.roughnessMap,o.material.aoMap])if(texture){texture.anisotropy=8;watchTexture(texture);}
  });
  const bounds=new T.Box3().setFromObject(loaded.scene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  loaded.scene.position.set(-center.x,-bounds.min.y,-center.z);const root=new T.Group();root.add(loaded.scene);templates[name]={root,size};
 }
 return {place(name,parent,{x,y,z,w,h,d,angle=0}){
  const {root,size}=templates[name],object=root.clone(true);
  if(name==='chair')object.scale.setScalar(h/size.y);else object.scale.set(w/size.x,h/size.y,d/size.z);
  object.position.set(x,y,z);object.rotation.y=angle;object.name='cc0-chinese-'+name;parent.add(object);return object;
 }};
}
