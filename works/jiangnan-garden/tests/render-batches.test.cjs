const test=require('node:test'),assert=require('node:assert/strict');
test('static batching preserves the constructed geometry and independent roof while reducing draw submissions',async()=>{
 const T=await import('three'),{architecture}=await import('../src/architecture.js'),{batchArchitecture}=await import('../src/render-batches.js');
 const keys=['wood','darkWood','wetWood','stone','brick','plaster','tile','paper','bronze','ceramic','linen','lamp','woven','silk','gauze','painting'];
 const m=Object.fromEntries(keys.map(k=>[k,new T.MeshStandardMaterial()]));m.bookCloth=[m.linen,m.silk,m.woven];
 const scene=new T.Scene(),a=architecture(scene,m);scene.updateMatrixWorld(true);
 const originals=[];a.group.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)originals.push(o);});
 const bounds=originals.reduce((b,o)=>b.union(new T.Box3().setFromObject(o,true)),new T.Box3());
 const triangles=originals.reduce((n,o)=>n+(o.geometry.index?.count??o.geometry.attributes.position.count)/3,0),colliders=JSON.stringify(a.colliders);
 const batches=batchArchitecture(a,m);scene.updateMatrixWorld(true);
 assert.ok(originals.length>1000);assert.ok(batches.length<40,'bounded material draws');
 assert.equal(batches.reduce((n,o)=>n+o.geometry.attributes.position.count/3,0),triangles,'every original triangle is retained');
 const batchedBounds=batches.reduce((b,o)=>b.union(new T.Box3().setFromObject(o,true)),new T.Box3());
 assert.ok(bounds.min.distanceTo(batchedBounds.min)<.001&&bounds.max.distanceTo(batchedBounds.max)<.001,'world positions stay unchanged');
 assert.equal(JSON.stringify(a.colliders),colliders,'circulation blockers are untouched');
 assert.ok(batches.some(o=>o.parent===a.roof)&&batches.some(o=>o.parent===a.group),'roof remains separately removable');
 assert.ok(originals.every(o=>!o.visible),'source members are not drawn twice');
 const laterWall=a.box(0,1,12,2,2,.2,m.plaster),laterPost=a.post(0,1,11,.1,2,m.wood);
 for(const mesh of [laterWall,laterPost]){assert.ok(mesh.geometry.attributes.color,'shared color-enabled materials have a neutral attribute on later landscape members');assert.ok(mesh.geometry.attributes.color.array.every(v=>v===1),'new enclosure walls do not render black');}
});
