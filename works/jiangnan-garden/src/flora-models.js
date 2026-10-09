import * as T from 'three';
import {offlineGLTF} from './offline-gltf.js';
import treeData from '../assets/models/tree_small_02/model.gltf';
import fernData from '../assets/models/fern_02/model.gltf';
import shrubData from '../assets/models/shrub_04/model.gltf';

// Real botanical crowns replace repeated, camera-facing spray silhouettes.
export async function floraModels(){
 const [tree,fern,shrub]=await Promise.all([offlineGLTF(treeData),offlineGLTF(fernData),offlineGLTF(shrubData)]);
 for(const root of [tree.scene,fern.scene,shrub.scene])root.traverse(o=>{
  if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;
  o.material.side=T.DoubleSide;o.material.transparent=false;o.material.depthWrite=true;
  if(o.material.map)o.material.map.anisotropy=8;
  o.material.roughness=.85;
 });
 const bounds=new T.Box3().setFromObject(tree.scene),center=bounds.getCenter(new T.Vector3()),height=bounds.max.y-bounds.min.y;
 tree.scene.position.set(-center.x,-bounds.min.y,-center.z);
 const botanicalTree=new T.Group();botanicalTree.add(tree.scene);
 function plantTree(scene,x,z,h,width=1,turn=0){
  const root=botanicalTree.clone(true),scale=h/height;root.position.set(x,0,z);root.scale.set(scale*width,scale,scale*(.90+width*.1));root.rotation.y=turn;
  root.traverse(o=>{if(o.isMesh){
   // Bend the complete carrying tree, including branches and leaves, so repeated
   // specimens grow differently and cast shadows from their actual geometry.
   const original=o.geometry,g=new T.BufferGeometry();g.setIndex(original.index);for(const [key,attribute] of Object.entries(original.attributes))g.setAttribute(key,attribute);
   const p=original.attributes.position,n=original.attributes.normal,positions=new Float32Array(p.count*3),normals=new Float32Array(n.count*3),lx=Math.sin(turn*1.7)*.07,lz=Math.cos(turn*1.2)*.06;
   for(let i=0;i<p.count;i++){const y=p.getY(i),dx=2*lx*y,dz=2*lz*y;positions.set([p.getX(i)+lx*y*y,y,p.getZ(i)+lz*y*y],i*3);const nx=n.getX(i),ny=n.getY(i)-nx*dx-n.getZ(i)*dz,nz=n.getZ(i),len=Math.hypot(nx,ny,nz)||1;normals.set([nx/len,ny/len,nz/len],i*3);}
   g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('normal',new T.BufferAttribute(normals,3));g.computeBoundingBox();g.computeBoundingSphere();o.geometry=g;
   o.material=o.material.clone();o.material.color.multiplyScalar(.84+width*.09);
  }});
  scene.add(root);return root;
 }
 const fernVariants=fern.scene.children,fernPoses=fernVariants.map(()=>[]),shrubSource=shrub.scene.children[0],shrubPoses=[];
 const shrubGeometry=shrubSource.geometry.clone();shrubGeometry.computeBoundingBox();const sb=shrubGeometry.boundingBox,sc=sb.getCenter(new T.Vector3());shrubGeometry.translate(-sc.x,-sb.min.y,-sc.z);shrubSource.material.roughness=.72;
 function plantShrub(scene,x,y,z,scale,turn){const pose=new T.Object3D();pose.position.set(x,y,z);pose.scale.set(scale,scale*(.85+.25*Math.sin(turn*1.7)),scale);pose.rotation.set(Math.sin(turn)*.12,turn,Math.cos(turn)*.1);pose.updateMatrix();shrubPoses.push(pose.matrix);}
 function plantFern(scene,x,y,z,scale,index=0,turn=0){const pose=new T.Object3D();pose.position.set(x,y,z);pose.scale.setScalar(scale);pose.rotation.set(Math.sin(turn)*.08,turn,Math.cos(turn)*.07);pose.updateMatrix();fernPoses[index%fernVariants.length].push(pose.matrix);}
 function flush(scene){for(let i=0;i<fernVariants.length;i++){const source=fernVariants[i],poses=fernPoses[i],plants=new T.InstancedMesh(source.geometry,source.material,poses.length);for(let j=0;j<poses.length;j++)plants.setMatrixAt(j,poses[j]);plants.castShadow=plants.receiveShadow=true;scene.add(plants);}const plants=new T.InstancedMesh(shrubGeometry,shrubSource.material,shrubPoses.length);for(let i=0;i<shrubPoses.length;i++)plants.setMatrixAt(i,shrubPoses[i]);plants.castShadow=plants.receiveShadow=true;scene.add(plants);}
 return {plantTree,plantFern,plantShrub,flush};
}
