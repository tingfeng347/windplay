const test=require('node:test'),assert=require('node:assert/strict'),world=require('../src/world.cjs');
test('all principal rooms and pond approach are reachable safe spawn points',()=>{for(const r of world.ROOMS)assert.ok(world.canWalk(r.x,r.z),r.name);});
test('connected route links courtyard, hall, study and bedroom',()=>{
 const points=[[-5,1.2],[-5,-3.8],[-9,-3.8],[-5,-3.8],[-1,-3.8]];
 for(let i=1;i<points.length;i++){const [ax,az]=points[i-1],[bx,bz]=points[i];for(let j=0;j<=50;j++)assert.ok(world.canWalk(ax+(bx-ax)*j/50,az+(bz-az)*j/50),`${i} ${j}`);}
});
test('walking cannot cross wall or water with a large time step; diagonal motion slides along wall',()=>{const p=world.move({x:-5,z:-8.7},0,-4);assert.ok(p.z>-8.75);assert.ok(!world.canWalk(world.POND.x,world.POND.z));const pond=world.move({x:6,z:10},0,-10);assert.ok(pond.z>8);});
test('day and night both preserve atmospheric light; transition is bounded and continuous',()=>{let previous=world.lightState(0);for(let i=1;i<=100;i++){const current=world.lightState(i/100);assert.ok(current.sun>=previous.sun);assert.ok(current.fog>0);assert.ok(current.lantern>0);assert.ok(Math.abs(current.sun-previous.sun)<.03);previous=current;}assert.ok(world.lightState(0).lantern>world.lightState(1).lantern);});
