import * as T from 'three';
import {offlineGLTF} from './offline-gltf.js';
import {treeInstances} from './tree-instances.js';
import treeData from '../assets/models/tree_small_02/model.gltf';
import fernData from '../assets/models/fern_02/model.gltf';
import shrubData from '../assets/models/shrub_04/model.gltf';

// Real botanical crowns replace repeated, camera-facing spray silhouettes.
export async function floraModels(){
 const [tree,fern,shrub]=await Promise.all([offlineGLTF(treeData.overview),offlineGLTF(fernData),offlineGLTF(shrubData)]);
 for(const root of [tree.scene,fern.scene,shrub.scene])root.traverse(o=>{
  if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;
  o.material.side=T.DoubleSide;o.material.transparent=false;o.material.depthWrite=true;
  if(o.material.map)o.material.map.anisotropy=8;
  o.material.roughness=.85;
 });
 const bounds=new T.Box3().setFromObject(tree.scene),center=bounds.getCenter(new T.Vector3()),height=bounds.max.y-bounds.min.y;
 tree.scene.position.set(-center.x,-bounds.min.y,-center.z);
 const botanicalTree=new T.Group();botanicalTree.add(tree.scene);const trees=treeInstances(botanicalTree);
 function plantTree(scene,x,z,h,width=1,turn=0){return trees.plant(x,z,h,width,turn,height);}
 const fernVariants=fern.scene.children,fernPoses=fernVariants.map(()=>[]),shrubSource=shrub.scene.children[0],shrubPoses=[];
 const shrubGeometry=shrubSource.geometry.clone();shrubGeometry.computeBoundingBox();const sb=shrubGeometry.boundingBox,sc=sb.getCenter(new T.Vector3());shrubGeometry.translate(-sc.x,-sb.min.y,-sc.z);shrubSource.material.roughness=.72;
 function plantShrub(scene,x,y,z,scale,turn){const pose=new T.Object3D();pose.position.set(x,y,z);pose.scale.set(scale,scale*(.85+.25*Math.sin(turn*1.7)),scale);pose.rotation.set(Math.sin(turn)*.12,turn,Math.cos(turn)*.1);pose.updateMatrix();shrubPoses.push(pose.matrix);}
 function plantFern(scene,x,y,z,scale,index=0,turn=0){const pose=new T.Object3D();pose.position.set(x,y,z);pose.scale.setScalar(scale);pose.rotation.set(Math.sin(turn)*.08,turn,Math.cos(turn)*.07);pose.updateMatrix();fernPoses[index%fernVariants.length].push(pose.matrix);}
 function flush(scene){trees.flush(scene);for(let i=0;i<fernVariants.length;i++){const source=fernVariants[i],poses=fernPoses[i],plants=new T.InstancedMesh(source.geometry,source.material,poses.length);for(let j=0;j<poses.length;j++)plants.setMatrixAt(j,poses[j]);plants.castShadow=plants.receiveShadow=true;scene.add(plants);}const plants=new T.InstancedMesh(shrubGeometry,shrubSource.material,shrubPoses.length);for(let i=0;i<shrubPoses.length;i++)plants.setMatrixAt(i,shrubPoses[i]);plants.castShadow=plants.receiveShadow=true;scene.add(plants);}
 let detailed=false,pending=false,wasNear=false;
 function updateDetail(near){if(near&&!wasNear&&!detailed&&!pending){pending=true;offlineGLTF(treeData.detail).then(loaded=>{trees.detail(loaded.scene);detailed=true;}).catch(error=>console.warn('Tree detail unavailable',error)).finally(()=>pending=false);}wasNear=near;return detailed;}
 return {plantTree,plantFern,plantShrub,flush,updateDetail};
}
