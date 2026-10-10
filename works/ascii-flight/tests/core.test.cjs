const test=require('node:test'),assert=require('node:assert/strict'),c=require('../src/core.cjs');
const fly=()=>({...c.createState(),status:'flying'}),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('W raises pitch, S lowers pitch; angle limits and angle-rate hold',()=>{let s=fly();c.step(s,{w:true},.1);near(s.pitch,c.CONTROL_RATE*.1);assert.ok(s.y>27);let pitch=s.pitch;c.step(s,{},.1);near(s.pitch,pitch);s=fly();c.step(s,{s:true},.1);near(s.pitch,-c.CONTROL_RATE*.1);assert.ok(s.y<27);for(let i=0;i<100;i++)c.step(s,{s:true,d:true},.1);near(s.pitch,-c.LIMIT);near(s.roll,c.LIMIT);for(let i=0;i<100;i++)c.step(s,{w:true},.1);near(s.pitch,c.LIMIT);});
test('45 degree bank produces exactly 90 degrees/second yaw and scales linearly',()=>{for(const roll of [-c.LIMIT,-c.LIMIT/2,0,c.LIMIT/2,c.LIMIT]){const s=fly();s.roll=roll;for(let i=0;i<10;i++)c.step(s,{},.1);near(s.yaw,roll/c.LIMIT*Math.PI/2);}});
test('speed clamps to 10–50 m/s and level distance is correct',()=>{let s=fly();for(let i=0;i<100;i++)c.step(s,{z:true},.1);near(s.speed,50);for(let i=0;i<100;i++)c.step(s,{x:true},.1);near(s.speed,10);s=fly();for(let i=0;i<10;i++)c.step(s,{},.1);near(s.distance,25);near(s.z,-25);near(s.y,27);});
test('swept collisions detect passing completely through a narrow building',()=>{const box={kind:'building',x:0,y:5,z:0,xSize:1,ySize:10,zSize:1};assert.equal(c.collision({x:0,y:4,z:-10},{x:0,y:4,z:10},[box]),'撞到楼房');assert.equal(c.collision({x:5,y:4,z:-10},{x:5,y:4,z:10},[box]),null);});
test('gates require a forward plane crossing inside the ring',()=>{const g={x:0,y:20,z:0,nx:0,nz:1,radius:12};assert.ok(c.crossesGate({x:0,y:20,z:-3},{x:0,y:20,z:3},g));assert.ok(!c.crossesGate({x:20,y:20,z:-3},{x:20,y:20,z:3},g));assert.ok(!c.crossesGate({x:0,y:20,z:3},{x:0,y:20,z:-3},g));});
test('city deterministic and routes fit the open streets',()=>{assert.deepEqual(c.city(),c.city());for(const route of c.ROUTES)for(const g of c.gates(route))assert.equal(c.collision(g,g,c.city()),null);});
test('all route segments and spawn have unobstructed flight corridors inside the city',()=>{
 const world=c.city();assert.equal(c.collision(c.createState(),c.createState(),world),null);
 for(const route of c.ROUTES){let previous=c.createState();for(const g of c.gates(route)){
  assert.equal(c.collision(previous,g,world),null,`${route.name}: blocked segment to ${g.x},${g.y},${g.z}`);
  assert.ok(g.x>c.WORLD_BOUNDS.minX&&g.x<c.WORLD_BOUNDS.maxX&&g.z>c.WORLD_BOUNDS.minZ&&g.z<c.WORLD_BOUNDS.maxZ);
  assert.ok(Math.abs(Math.hypot(g.nx,g.nz)-1)<1e-10);previous=g;
 }}
});
test('districts include distinct skylines, layered trees and traversable elevated structures',()=>{
 const world=c.city(),districts=new Set(world.map(o=>o.district).filter(Boolean));
 for(const name of ['downtown','residential','industrial','river','park','landmark'])assert.ok(districts.has(name));
 assert.ok(world.some(o=>o.windows&&o.ySize>100));assert.ok(world.some(o=>o.kind==='tree'&&o.foliage));
 assert.ok(world.some(o=>o.kind==='tree'&&!o.foliage));
 assert.equal(c.collision({x:0,y:27,z:500},{x:0,y:27,z:520},world),null,'passage stays open below the skybridge');
 assert.equal(c.collision({x:0,y:54,z:500},{x:0,y:54,z:520},world),'撞到楼房','skybridge deck is a real obstacle');
});
test('terrain agrees with irregular streets, river crossings, sidewalks and the park',()=>{
 assert.equal(c.groundAt(0,510).kind,'road');assert.equal(c.groundAt(15,510).kind,'pavement');
 assert.equal(c.groundAt(425,300).kind,'water');assert.equal(c.groundAt(425,600).kind,'bridge');
 assert.equal(c.groundAt(-90,700).kind,'park');
});
test('all four routes can be flown with the actual rate-limited controls at 15 m/s',()=>{
 const world=c.city();
 for(const route of c.ROUTES){
  const targets=c.gates(route),state={...fly(),speed:15};let index=0;
  for(let tick=0;tick<8000&&index<targets.length;tick++){
   const g=targets[index],dx=g.x-state.x,dz=g.z-state.z,range=Math.hypot(dx,dz);
   const angle=Math.atan2(dx,dz)-state.yaw,error=Math.atan2(Math.sin(angle),Math.cos(angle));
   const bank=c.clamp(error*1.1,-c.LIMIT,c.LIMIT),pitch=c.clamp(Math.atan2(g.y-state.y,range),-c.LIMIT,c.LIMIT),previous={...state};
   c.step(state,{w:pitch>state.pitch+.008,s:pitch<state.pitch-.008,d:bank>state.roll+.012,a:bank<state.roll-.012},.025);
   assert.equal(c.collision(previous,state,world),null,`${route.name}: collision approaching gate ${index+1}`);
   if(c.crossesGate(previous,state,g))index++;
  }
  assert.equal(index,targets.length,`${route.name}: controller must reach every gate`);
 }
});
