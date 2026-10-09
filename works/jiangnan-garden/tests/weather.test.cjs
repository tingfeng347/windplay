const test=require('node:test'),assert=require('node:assert/strict'),w=require('../src/weather.cjs'),world=require('../src/world.cjs');
test('eaves drips begin at roof height and terminate above ground',()=>{
 for(const d of w.createDrops().filter(d=>d.eave)){
  assert.ok(Math.abs(d.top-(world.roofHeight(d.z)-.08))<1e-8);
  for(let t=0;t<12;t+=.19){const p=w.dropSegment(d,t);assert.ok(p.head>=d.bottom);assert.ok(p.tail<=d.top);assert.ok(p.tail>=p.head);}
 }
});
test('outdoor rain stops on roofs before reaching rooms or covered corridors',()=>{
 let overHouse=0,overCorridor=0;
 for(const d of w.createDrops().filter(d=>!d.eave)){
  const roof=w.roofAt(d.x,d.z);if(roof===null)continue;
  if(d.x<2)overHouse++;else overCorridor++;
  assert.ok(d.bottom>=roof);for(let t=0;t<8;t+=.23)assert.ok(w.dropSegment(d,t).head>=roof);
 }assert.ok(overHouse>0&&overCorridor>0);
});
test('rain stays valid across repeated lifetimes in day and night',()=>{
 for(const d of w.createDrops()){assert.ok(d.top>d.bottom);for(const t of [-100,0,1,30,1000]){const p=w.dropSegment(d,t);assert.ok(Number.isFinite(p.head));assert.ok(p.head>=d.bottom&&p.tail<=d.top);}}
});
