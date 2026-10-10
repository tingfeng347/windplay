import * as T from 'three';

// Same bend and inverse-transpose normal as the former CPU loop, before the
// instance's complete botanical/world transform. Shadows use the same shader.
export function bendTreeShader(shader){
 shader.vertexShader='attribute vec2 treeBend;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.xz+=treeBend*position.y*position.y;');
 shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n objectNormal=normalize(vec3(objectNormal.x,objectNormal.y-dot(objectNormal.xz,2.0*treeBend*position.y),objectNormal.z));');
}
export function treeInstances(template){
 const poses=[],sources=[],meshes=[];template.updateMatrixWorld(true);template.traverse(o=>{if(o.isMesh)sources.push(o);});
 function plant(x,z,h,width,turn,height){const root=new T.Object3D(),scale=h/height;root.position.set(x,0,z);root.scale.set(scale*width,scale,scale*(.90+width*.1));root.rotation.y=turn;poses.push({root,width,turn});return root;}
 function flush(scene){
  for(const source of sources){
   const geometry=new T.BufferGeometry();geometry.setIndex(source.geometry.index);for(const [name,attribute] of Object.entries(source.geometry.attributes))geometry.setAttribute(name,attribute);
   const bends=new Float32Array(poses.length*2);poses.forEach(({turn},i)=>bends.set([Math.sin(turn*1.7)*.07,Math.cos(turn*1.2)*.06],i*2));geometry.setAttribute('treeBend',new T.InstancedBufferAttribute(bends,2));
   geometry.computeBoundingBox();geometry.boundingBox.expandByScalar(.2);geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.2;
   const material=source.material.clone();material.onBeforeCompile=bendTreeShader;material.customProgramCacheKey=()=> 'botanical-instance-bend-v1';
   const mesh=new T.InstancedMesh(geometry,material,poses.length);mesh.castShadow=mesh.receiveShadow=true;mesh.name='shared-botanical-tree';
   for(let i=0;i<poses.length;i++){const {root,width}=poses[i];root.updateMatrix();mesh.setMatrixAt(i,new T.Matrix4().multiplyMatrices(root.matrix,source.matrixWorld));mesh.setColorAt(i,new T.Color().setScalar(.84+width*.09));}
   const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:material.map,alphaTest:material.alphaTest,side:material.side});depth.onBeforeCompile=bendTreeShader;depth.customProgramCacheKey=()=> 'botanical-instance-depth-v1';mesh.customDepthMaterial=depth;
   const distance=new T.MeshDistanceMaterial({map:material.map,alphaTest:material.alphaTest,side:material.side});distance.onBeforeCompile=bendTreeShader;distance.customProgramCacheKey=()=> 'botanical-instance-distance-v1';mesh.customDistanceMaterial=distance;
   scene.add(mesh);meshes.push(mesh);
  }
 }
 function detail(root){const originals=[];root.traverse(o=>{if(o.isMesh)originals.push(o.geometry);});if(originals.length!==meshes.length)throw new Error('Tree detail primitive mismatch');for(let i=0;i<meshes.length;i++){const previous=meshes[i].geometry,geometry=new T.BufferGeometry(),source=originals[i];geometry.setIndex(source.index);for(const [name,attribute] of Object.entries(source.attributes))geometry.setAttribute(name,attribute);geometry.setAttribute('treeBend',previous.getAttribute('treeBend'));geometry.computeBoundingBox();geometry.boundingBox.expandByScalar(.2);geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.2;meshes[i].geometry=geometry;previous.dispose();meshes[i].computeBoundingSphere();}}
 return {plant,flush,detail};
}
