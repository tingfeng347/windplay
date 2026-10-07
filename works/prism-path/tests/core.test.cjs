const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/core.js');
test('all ten chapters have a reachable finish, require every light, and support restricted rotations',()=>{
 assert.equal(C.levels.length,10);
 for(const l of C.levels){let s=C.create(l.id);const plan=C.solve(s);assert.ok(plan?.length>5,l.name);for(const a of plan)s=C.apply(s,a);assert.equal(s.won,true,l.name);assert.equal(s.lights,l.allLights);assert.equal(C.apply(s,{type:'rotate',direction:1}),s);}
});
test('fold bridges truly project to one adjacent tile in their designated orientation',()=>{
 for(const l of C.levels)for(const e of l.edges.filter(e=>e.view!==undefined)){
 const a=l.nodes[e.a],b=l.nodes[e.b];let x=b.x-a.x,z=b.z-a.z;for(let i=0;i<e.view;i++)[x,z]=[-z,x];
 assert.equal(x-z,1);assert.equal((x+z)/2-(b.y-a.y),.5);
 }
});
test('movement cannot cross inactive optical bridges or closed switch gates',()=>{
 for(const l of C.levels)for(const e of l.edges.filter(e=>e.view!==undefined)){
 let s={...C.create(l.id),node:e.a,view:(e.view+1)%4,switches:255};assert.ok(!C.available(s).includes(e.b));
 s.view=e.view;s.switches=0;if(e.gate)assert.ok(!C.available(s).includes(e.b));s.switches=255;assert.ok(C.available(s).includes(e.b));
 }
});
test('rotation is limited to star dials in later chapters; collected light cannot duplicate',()=>{
 let s=C.create(4);s=C.apply(s,{type:'move',node:1});assert.equal(C.canRotate(s),false);assert.equal(C.apply(s,{type:'rotate',direction:1}),s);
 s=C.apply(s,{type:'move',node:2});const mask=s.lights;s=C.apply(s,{type:'move',node:1});s=C.apply(s,{type:'move',node:2});assert.equal(s.lights,mask);
});
test('malformed and out-of-range progress safely resets',()=>{
 for(const input of ['x','null','{}','{"version":1,"selected":99,"completed":{"0":{"moves":-1,"stars":8}}}'])assert.deepEqual(C.restoreProgress(input),{completed:{},selected:0});
});
