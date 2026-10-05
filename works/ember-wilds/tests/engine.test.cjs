const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');
function advance(s,seconds,input={}){for(let i=0;i<Math.ceil(seconds/.1);i++)E.tick(s,.1,input);}
function nearby(s,type){const e=s.entities.find(e=>e.type===type&&e.available!==false);s.player.x=e.x;s.player.y=e.y;s.player.actionCooldown=0;return e;}

test('world generation and simulation are deterministic by seed',()=>{
  const a=E.create('forest'),b=E.create('forest');assert.deepEqual(a,b);advance(a,10,{x:1,y:.5});advance(b,10,{x:1,y:.5});assert.equal(E.serialize(a),E.serialize(b));assert.notDeepEqual(E.create('another').entities,a.entities);
});
test('gathering consumes a resource once and berries regrow',()=>{
  const s=E.create(),e=nearby(s,'berry');assert.equal(E.interact(s,e),true);assert.equal(s.inventory.berry,3);s.player.actionCooldown=0;assert.equal(E.interact(s,e),false);assert.equal(s.inventory.berry,3);s.time=e.regrow;E.tick(s,.1);assert.equal(e.available,true);
});
test('craft recipes consume exactly their costs and tools cannot be duplicated',()=>{
  const s=E.create();s.inventory.branch=5;s.inventory.flint=2;assert.equal(E.craft(s,'axe'),true);assert.equal(s.inventory.branch,2);assert.equal(s.inventory.flint,0);assert.equal(s.tools.axe,36);assert.equal(E.craft(s,'axe'),false);assert.equal(s.inventory.branch,2);assert.equal(E.craft(s,'pick'),false);
});
test('trees and rocks require correct tools and lose durability per strike',()=>{
  const s=E.create(),tree=nearby(s,'tree');assert.equal(E.interact(s,tree),false);s.tools.axe=3;for(let i=0;i<3;i++){s.player.actionCooldown=0;assert.equal(E.interact(s,tree),true);}assert.equal(s.inventory.wood,4);assert.equal(s.tools.axe,0);assert.equal(tree.type,'stump');const rock=nearby(s,'rock');s.tools.pick=36;for(let i=0;i<3;i++){s.player.actionCooldown=0;E.interact(s,rock);}assert.equal(s.inventory.stone,3);assert.equal(s.inventory.flint,2);
});
test('campfire placement, fueling and cooking form a real progression',()=>{
  const s=E.create();Object.assign(s.inventory,{wood:5,stone:2,grass:3,berry:2});assert.equal(E.craft(s,'campfire'),true);const fire=s.entities.find(e=>e.type==='campfire');assert.ok(E.distance(fire,s.player)<100);assert.equal(E.cook(s),true);assert.equal(s.inventory.cooked,1);assert.equal(s.inventory.berry,1);assert.equal(E.interact(s,fire),true);assert.equal(s.inventory.wood,0);assert.equal(fire.fuel,148);s.player.x=100;assert.equal(E.cook(s),false);
});
test('unlit darkness damages health; light prevents darkness damage and fuel expires',()=>{
  const dark=E.create(),lit=E.create();dark.time=150;lit.time=150;lit.player.torch=20;advance(dark,5);advance(lit,5);assert.ok(dark.player.health<90);assert.equal(lit.player.health,100);assert.ok(lit.player.torch<20);lit.player.torch=.1;advance(lit,.2);assert.equal(lit.player.torch,0);
});
test('pause and death stop time and movement; direction is normalized and world is bounded',()=>{
  const s=E.create();s.paused=true;E.tick(s,.1,{x:1});assert.equal(s.time,0);assert.equal(s.player.x,1300);s.paused=false;const old=s.player.x;E.tick(s,.1,{x:1,y:1});assert.ok(s.player.x-old<15);s.player.x=2599;E.tick(s,.1,{x:1});assert.equal(s.player.x,2575);s.dead=true;const time=s.time;E.tick(s,.1);assert.equal(s.time,time);
});
test('combat, armor and lethal food trigger consistent health/death state',()=>{
  const s=E.create();s.entities=[{id:1,type:'spider',x:1300,y:1300,health:30,variant:0}];s.tools.spear=50;assert.equal(E.attack(s,s.entities[0]),true);assert.equal(E.attack(s,s.entities[0]),false);advance(s,.6);assert.equal(E.attack(s,s.entities[0]),true);assert.equal(s.inventory.meat,1);assert.equal(s.stats.kills,1);
  const poisoned=E.create();poisoned.player.health=4;poisoned.inventory.meat=1;assert.equal(E.eat(poisoned,'meat'),true);assert.equal(poisoned.player.health,0);assert.equal(poisoned.dead,true);assert.equal(E.eat(poisoned,'berry'),false);
  const armored=E.create();armored.tools.armor=65;armored.entities=[{id:1,type:'wolf',x:1300,y:1300,health:40}];E.tick(armored,.1);assert.ok(armored.player.health>96);assert.ok(armored.tools.armor<65);
});
test('trap captures nearby wildlife, shelter restores sanity and movement ends rest',()=>{
  const s=E.create();s.inventory.branch=10;s.inventory.grass=20;s.inventory.wood=10;assert.ok(E.craft(s,'trap'));const trap=s.entities.find(e=>e.type==='trap');s.entities.push({id:999,type:'rabbit',x:trap.x,y:trap.y,health:14,angle:0,moveTimer:2});E.tick(s,.1);assert.equal(trap.caught,true);E.interact(s,trap);assert.equal(s.inventory.meat,1);assert.ok(E.craft(s,'shelter'));const shelter=s.entities.find(e=>e.type==='shelter');s.player.actionCooldown=0;s.player.sanity=50;assert.ok(E.interact(s,shelter));advance(s,2);assert.ok(s.player.sanity>51);E.tick(s,.1,{x:1});assert.equal(s.resting,false);
});
test('multiple crafted buildings use distinct nearby places',()=>{
  const s=E.create();Object.assign(s.inventory,{wood:30,stone:10,grass:30,branch:30});for(const key of ['campfire','shelter','trap','campfire'])assert.ok(E.craft(s,key));const buildings=s.entities.filter(e=>['campfire','shelter','trap'].includes(e.type));assert.equal(buildings.length,4);for(let i=0;i<buildings.length;i++)for(let j=0;j<i;j++)assert.ok(E.distance(buildings[i],buildings[j])>=60);
});
test('click navigation gathers resources and stops on unavailable tools',()=>{
  const s=E.create(),branch=s.entities.find(e=>e.type==='branch');E.aim(s,branch.x,branch.y,branch.id);advance(s,3);assert.equal(branch.available,false);assert.equal(s.target,null);const tree=s.entities.find(e=>e.type==='tree');s.player.x=tree.x;s.player.y=tree.y;E.aim(s,tree.x,tree.y,tree.id);advance(s,.5);assert.equal(s.target,null);assert.equal(tree.type,'tree');
});
test('save round trip preserves world/RNG and corrupted storage is rejected',()=>{
  const s=E.create('save-me');advance(s,5);s.inventory.berry=4;const r=E.restore(E.serialize(s));assert.deepEqual(r,s);assert.equal(E.random(r),E.random(s));for(const mutate of [x=>delete x.messages,x=>x.player.y=null,x=>x.inventory.berry=-1,x=>x.entities[0].type='unknown',x=>x.stats.cooked=NaN,x=>x.version=99]){const broken=E.create();mutate(broken);assert.equal(E.restore(E.serialize(broken)),null);}assert.equal(E.restore('invalid JSON'),null);
});
