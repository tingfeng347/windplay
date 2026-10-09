const test=require('node:test'),assert=require('node:assert/strict');
test('built architecture has open, connected bays at eye level and a supported roof',async()=>{
 const T=await import('three'),{architecture}=await import('../src/architecture.js'),world=require('../src/world.cjs');
 const ctx={fillStyle:'',strokeStyle:'',lineWidth:1,fillRect(){},beginPath(){},moveTo(){},quadraticCurveTo(){},stroke(){},ellipse(){},fill(){}};
 const previous=global.document;global.document={createElement(){return {width:0,height:0,getContext(){return ctx;}};}};
 try{
  const material=new T.MeshStandardMaterial(),m=Object.fromEntries(['wood','darkWood','stone','brick','plaster','tile','paper','bronze','ceramic','linen','lamp','wetWood','woven','silk','gauze','painting'].map(k=>[k,material]));
  m.bookCloth=[material,material,material];const scene=new T.Scene(),a=architecture(scene,m);scene.updateMatrixWorld(true);
  const clear=(x,z)=>world.canWalk(x,z)&&!a.colliders.some(c=>Math.abs(x-c.x)<c.w/2+.2&&Math.abs(z-c.z)<c.d/2+.2);
  const waypoints=[[-5,1.2],[-5,-3.8],[-9,-3.8],[-5,-3.8],[-1,-3.8]];
  for(let n=1;n<waypoints.length;n++)for(let i=0;i<=100;i++){const t=i/100,x=waypoints[n-1][0]*(1-t)+waypoints[n][0]*t,z=waypoints[n-1][1]*(1-t)+waypoints[n][1]*t;assert.ok(clear(x,z),`blocked passage ${x}, ${z}`);}
  // Column tops intersect bearing beams; sufficient clear height above all three bays.
  for(const x of [-11,-7,-3,1])for(const z of [-8.8,-5.5,-1.8]){
   const column=a.group.children.find(o=>o.isMesh&&Math.abs(o.position.x-x)<.01&&Math.abs(o.position.z-z)<.01&&o.scale.y>3.8&&o.scale.x<.2);
   assert.ok(column,'load-bearing column');const top=new T.Box3().setFromObject(column).max.y;
   const support=a.group.children.find(o=>o.isMesh&&o.scale.x>12&&Math.abs(o.position.y-4.33)<.01&&Math.abs(o.position.z-z)<.01);
   assert.ok(new T.Box3().setFromObject(support).min.y<=top,'column bears a beam');assert.ok(top-.45>3,'room clear height');
  }
  // Every purlin intersects carrying frame members at all four column axes.
  const purlins=a.group.children.filter(o=>o.name==='purlin');assert.equal(purlins.length,7);
  const frame=a.group.children.filter(o=>o.isMesh&&o.name!=='purlin');
  for(const purlin of purlins)for(const x of [-11,-7,-3,1]){
   const bounds=new T.Box3().setFromObject(purlin);
   const contact=frame.some(o=>{
    const b=new T.Box3().setFromObject(o);
    return b.min.x<=x&&b.max.x>=x&&b.intersectsBox(bounds)&&b.min.y<bounds.min.y;
   });assert.ok(contact,`unsupported purlin at x=${x} z=${purlin.position.z}`);
  }
  const quilt=a.group.getObjectByName('folded-quilt'),quiltBounds=new T.Box3().setFromObject(quilt),qp=quilt.geometry.attributes.position;
  for(let i=0;i<qp.count;i++)if(Math.abs(qp.getX(i))<.975&&Math.abs(qp.getZ(i))<1.18)assert.ok(qp.getY(i)>.972,'supported quilt stays above the mattress; hanging hems fall outside it');
  assert.ok(quiltBounds.min.y<.90&&quiltBounds.max.y>1.15,'the thick quilt has a raised filling and hanging hems');
  assert.ok(a.roof.children.some(o=>o.isInstancedMesh&&o.count>1000),'individual roof tiles');
  for(const r of world.ROOMS)assert.ok(clear(r.x,r.z),r.name+' safe arrival');
 }finally{global.document=previous;}
});
