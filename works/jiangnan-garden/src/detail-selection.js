import * as T from 'three';

// Static bounds are captured once, including the original members hidden by
// render batching. Testing a whole material batch would select distant rooms.
export function detailSelection(scene,{interior,roof}={}){
 const records=[],matrix=new T.Matrix4(),instance=new T.Matrix4(),frustum=new T.Frustum();
 scene.updateMatrixWorld(true);
 scene.traverse(object=>{
  if(!object.isMesh||object.userData.renderBatch)return;
  const parents=[];for(let parent=object;parent;parent=parent.parent)parents.push(parent);
  const textures=new Set((Array.isArray(object.material)?object.material:[object.material]).flatMap(material=>Object.values(material).filter(value=>value?.isTexture&&value.userData.streamId!==undefined)));
  const tree=object.name==='shared-botanical-tree';if(!textures.size&&!tree)return;
  if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();
  for(let i=0;i<(object.isInstancedMesh?object.count:1);i++){
   matrix.copy(object.matrixWorld);
   if(object.isInstancedMesh){object.getMatrixAt(i,instance);matrix.multiply(instance);}
   records.push({bounds:object.geometry.boundingBox.clone().applyMatrix4(matrix),parents,textures,tree,indoor:parents.includes(interior),roof:parents.includes(roof)});
  }
 });
 return function select(camera,{enabled=true,close=true}={}){
  const textures=new Set();let treeNear=false;if(!enabled||!close)return {textures,treeNear};
  camera.updateMatrixWorld();frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  const p=camera.position,inside=p.x>-11.4&&p.x<1.4&&p.z>-9.4&&p.z<-1;
  const left=p.x<-7?-11.4:p.x>-3?-3:-7,right=p.x<-7?-7:p.x>-3?1.4:-3;
  const nearby=[];
  for(const record of records){
   if(record.parents.some(parent=>!parent.visible&&!parent.userData.detailProxy))continue;
   if(inside&&(!record.indoor||record.roof||record.bounds.max.x<=left||record.bounds.min.x>=right))continue;
   const distance=record.bounds.distanceToPoint(p);
   if(distance>16||!frustum.intersectsBox(record.bounds))continue;
   nearby.push({record,distance});
  }
  // Near surfaces reach the bounded download queue before distant ones.
  nearby.sort((a,b)=>a.distance-b.distance);
  for(const {record} of nearby){for(const texture of record.textures)textures.add(texture);treeNear||=record.tree;}
  return {textures,treeNear};
 };
}
