const test=require('node:test'),assert=require('node:assert/strict');
test('detail follows visible nearby instances, room boundaries, roof visibility and quality',async()=>{
 const T=await import('three'),{detailSelection}=await import('../src/detail-selection.js'),scene=new T.Scene(),interior=new T.Group(),roof=new T.Group();scene.add(interior);interior.add(roof);
 function mesh(parent,x,y,z){const map=new T.Texture();map.userData.streamId=0;const object=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({map}));object.position.set(x,y,z);parent.add(object);return object;}
 const hall=mesh(interior,-5,2,-6),study=mesh(interior,-9,2,-6),outside=mesh(scene,-5,2,-8),roofMesh=mesh(roof,-5,2,-5),behind=mesh(interior,-5,2,0);
 hall.visible=false;hall.userData.detailProxy=true;
 const tree=mesh(scene,4,2,-8);tree.name='shared-botanical-tree';
 const far=mesh(scene,0,2,-70),camera=new T.PerspectiveCamera(90,1,.1,100);camera.position.set(-5,2,-3);camera.lookAt(-5,2,-8);
 const select=detailSelection(scene,{interior,roof}),selected=select(camera);
 assert.deepEqual([...selected.textures],[hall.material.map],'Inside the hall, ignore other rooms, roof and courtyard');assert.equal(selected.treeNear,false);
 camera.position.set(4,2,1);camera.lookAt(4,2,-8);assert.equal(select(camera).treeNear,true);
 assert.ok(!select(camera).textures.has(far.material.map));
 assert.equal(select(camera,{enabled:false}).textures.size,0);assert.equal(select(camera,{enabled:false}).treeNear,false);assert.equal(select(camera,{close:false}).textures.size,0);
 interior.visible=false;assert.ok(!select(camera).textures.has(hall.material.map),'Hidden parents override batch proxies');
 // Aggregate instance bounds span the camera, although each plant is far away.
 const instanced=new T.InstancedMesh(tree.geometry,tree.material,2);instanced.name='shared-botanical-tree';instanced.setMatrixAt(0,new T.Matrix4().makeTranslation(-80,2,-8));instanced.setMatrixAt(1,new T.Matrix4().makeTranslation(80,2,-8));const plants=new T.Scene();plants.add(instanced);
 assert.equal(detailSelection(plants)(camera).treeNear,false);
});
