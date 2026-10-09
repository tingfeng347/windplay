import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Keep the structural model and its colliders intact while drawing joined static
// members in material batches. The removable roof retains its own visibility.
export function batchArchitecture(a,m){
 const batches=[];
 for(const root of [a.group,a.roof]){
  root.updateWorldMatrix(true,true);
  const inverse=root.matrixWorld.clone().invert(),sets=new Map();
  root.traverse(o=>{
   if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.userData.renderBatch||!o.visible)return;
   if(root===a.group){let p=o.parent;while(p&&p!==root){if(p===a.roof)return;p=p.parent;}}
   const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
   // Preserve the original metre-scaled grain before baking model matrices.
   if([m.wood,m.darkWood,m.wetWood,m.plaster].includes(o.material)){
    const uv=g.attributes.uv,n=g.attributes.normal,size=new T.Vector3().setFromMatrixScale(o.matrixWorld);
    const seed=Math.sin(o.matrixWorld.elements[12]*12.9898+o.matrixWorld.elements[13]*78.233+o.matrixWorld.elements[14]*34.73)*43758.5453,phase=seed-Math.floor(seed);
    const color=new Float32Array(g.attributes.position.count*3),endGrain=new Float32Array(g.attributes.position.count),shade=o.material===m.plaster?.95+phase*.05:.82+phase*.20;
    const dimensions=[size.x,size.y,size.z],longAxis=dimensions.indexOf(Math.max(...dimensions));
    for(let i=0;i<uv.count;i++){
     const ny=Math.abs(n.getY(i)),nx=Math.abs(n.getX(i));const u=ny>.7?size.x:nx>.7?size.z:size.x,v=ny>.7?size.z:nx>.7?size.y:size.y;
     if(o.geometry.type==='TubeGeometry')uv.setXY(i,uv.getY(i)*o.geometry.parameters.radius*6.28,uv.getX(i)*o.geometry.parameters.path.getLength());
     else if(o.geometry.type==='CylinderGeometry'){
      // Cylinder side UVs already run around the circumference and along the
      // member. Keep that continuous mapping instead of switching axes at
      // arbitrary normal thresholds around a round column.
      const cap=Math.abs(n.getY(i))>.9;
      uv.setXY(i,uv.getX(i)*size.x*(cap?2:Math.PI*2)+phase*.53,uv.getY(i)*(cap?size.z*2:size.y)+phase*.71);
      if([m.wood,m.darkWood].includes(o.material))endGrain[i]=cap?1:0;
     } else {
      const normalAxis=ny>.7?1:nx>.7?0:2,tangents=normalAxis===1?[0,2]:normalAxis===0?[2,1]:[0,1];
      if([m.wood,m.darkWood].includes(o.material)&&longAxis===tangents[0])uv.setXY(i,uv.getY(i)*v+phase*.53,uv.getX(i)*u+phase*.71);
      else uv.setXY(i,uv.getX(i)*u+phase*.53,uv.getY(i)*v+phase*.71);
      if([m.wood,m.darkWood].includes(o.material))endGrain[i]=Math.pow(Math.abs(n.getComponent(i,longAxis)),6);
     }
     color.set([shade,shade*(.97+phase*.03),shade*(.94+phase*.05)],i*3);
    }
    g.setAttribute('color',new T.BufferAttribute(color,3));g.setAttribute('grainEnd',new T.BufferAttribute(endGrain,1));o.material.vertexColors=true;o.material.userData.grainEnd=true;
   }
   g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
   if(!sets.has(o.material))sets.set(o.material,[]);sets.get(o.material).push(g);
   o.visible=false;
  });
  for(const [material,geometries] of sets){
   const mesh=new T.Mesh(mergeGeometries(geometries),material);
   mesh.castShadow=mesh.receiveShadow=true;mesh.userData.renderBatch=true;root.add(mesh);batches.push(mesh);
   geometries.forEach(g=>g.dispose());
  }
 }
 return batches;
}
