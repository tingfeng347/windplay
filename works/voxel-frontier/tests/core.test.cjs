const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/core.js');
function flatWorld(){const w=new C.World('flat-test',16,16,32);w.data.fill(0);for(let x=0;x<16;x++)for(let z=0;z<16;z++)w.rawSet(x,0,z,15);return w;}
function flatState(mode='survival'){const s=C.createState('windplay',mode);s.world=flatWorld();Object.assign(s.player,{x:4.5,y:1,z:4.5,yaw:0,pitch:0,vy:0,vx:0,vz:0,grounded:true});return s;}
test('相同种子生成相同地形，不同种子产生不同世界与稳定安全出生点',()=>{
 const a=C.createState('seed-a'),b=C.createState('seed-a'),d=C.createState('seed-b');
 assert.deepEqual(a.world.data,b.world.data);assert.notDeepEqual(a.world.data,d.world.data);
 assert.equal(C.collides(a.world,a.player.x,a.player.y,a.player.z),false);
 assert.ok(a.world.data.includes(4));assert.ok(a.world.data.includes(11));assert.ok(a.world.data.includes(10));
});
test('区块边界修改使两侧网格失效，基岩和越界不可改写',()=>{
 const w=flatWorld();w.dirty.clear();assert.equal(w.set(15,3,4,9),true);
 assert.ok(w.dirty.has('0,0'));assert.ok(w.dirty.has('1,0')===false,'16 宽的世界没有虚构区块');
 assert.equal(w.set(4,0,4,0),false);assert.equal(w.set(-1,3,4,9),false);
 const full=new C.World();full.dirty.clear();full.set(15,35,4,9);assert.ok(full.dirty.has('0,0'));assert.ok(full.dirty.has('1,0'));
});
test('体素射线返回准确法线、邻格与有限挖掘距离',()=>{
 const w=flatWorld();w.set(4,2,1,3);
 const hit=C.raycast(w,{x:4.5,y:2.5,z:4.5},{x:0,y:0,z:-1},6);
 assert.equal(hit.id,3);assert.equal(hit.z,1);assert.deepEqual(hit.normal,[0,0,1]);assert.deepEqual(hit.adjacent,{x:4,y:2,z:2});assert.equal(hit.distance,2.5);
 assert.equal(C.raycast(w,{x:4.5,y:2.5,z:8.5},{x:0,y:0,z:-1},5),null);
});
test('玩家碰撞阻挡墙壁，可落地与跳跃，不穿透地面',()=>{
 const s=flatState('creative');for(let x=0;x<16;x++)for(let y=1;y<4;y++)s.world.set(x,y,2,3);
 for(let n=0;n<180;n++)C.stepPlayer(s,{forward:true},1/60);
 assert.ok(s.player.z>=3.299&&s.player.z<3.4);assert.ok(s.player.y>=.9999);assert.equal(s.player.grounded,true);
 C.stepPlayer(s,{jump:true},1/60);assert.ok(s.player.y>1);assert.ok(s.player.vy>0);
});
test('安全放置不包住玩家，生存扣物资，创造无限放置',()=>{
 const s=flatState();s.inventory[9]=2;
 const overlap={adjacent:{x:4,y:1,z:4}};assert.equal(C.place(s,overlap,9).ok,false);assert.equal(s.inventory[9],2);
 const safe={adjacent:{x:5,y:1,z:4}};assert.equal(C.place(s,safe,9).ok,true);assert.equal(s.inventory[9],1);assert.equal(s.world.get(5,1,4),9);
 const creative=flatState('creative');creative.inventory[8]=0;assert.equal(C.place(creative,safe,8).ok,true);assert.equal(creative.inventory[8],0);
});
test('真实生存采集 → 木板 → 木棍 → 木镐 → 石镐流程完整',()=>{
 const s=flatState();s.inventory=Object.create(null);s.hotbar[0]=4;
 for(let n=0;n<3;n++){s.world.set(2,2,n+2,4);assert.equal(C.mine(s,{x:2,y:2,z:n+2,id:4}).ok,true);}
 assert.equal(s.inventory[4],3);
 assert.equal(C.craft(s,'planks'),true);assert.equal(C.craft(s,'planks'),true);assert.equal(s.inventory[9],8);
 assert.equal(C.craft(s,'sticks'),true);assert.equal(C.craft(s,'wood-pick'),true);assert.equal(s.inventory[21],1);
 s.hotbar[0]=21;
 for(let n=0;n<3;n++){s.world.set(3,2,n+2,3);assert.equal(C.mine(s,{x:3,y:2,z:n+2,id:3}).ok,true);}
 assert.equal(s.inventory[3],3);assert.equal(s.durability[21],67);assert.equal(C.craft(s,'stone-pick'),true);assert.equal(s.inventory[22],1);assert.equal(s.inventory[3],0);
});
test('徒手石矿不掉资源，镐加速且耗耐久；缺材料合成不改背包',()=>{
 const s=flatState();s.hotbar[0]=4;s.world.set(2,2,2,11);C.mine(s,{x:2,y:2,z:2,id:11});assert.equal(s.inventory[30],undefined);
 const hand=C.miningDuration(s,3);s.inventory[21]=1;s.hotbar[0]=21;assert.ok(C.miningDuration(s,3)<hand);
 const before=JSON.stringify(s.inventory);assert.equal(C.craft(s,'iron-pick'),false);assert.equal(JSON.stringify(s.inventory),before);
 s.durability[21]=1;C.wearTool(s);assert.equal(s.inventory[21],0);assert.equal(s.durability[21],undefined);
});
test('生存食物消耗与饥饿/落地伤害只影响生存，飞行稳定上升',()=>{
 const s=flatState();s.player.hunger=10;s.inventory[25]=1;assert.equal(C.eat(s,25),true);assert.equal(s.player.hunger,14);assert.equal(s.inventory[25],0);assert.equal(C.eat(s,25),false);
 s.player.y=10;s.player.vy=-15;const health=s.player.health;for(let n=0;n<100;n++)C.stepPlayer(s,{},1/60);assert.ok(s.player.health<health);
 const creative=flatState('creative');creative.player.flight=true;for(let n=0;n<60;n++)C.stepPlayer(creative,{jump:true},1/60);assert.ok(creative.player.y>9);assert.equal(creative.player.health,20);
});
test('存档往返保留方块、库存、快捷栏、时间与工具耐久',()=>{
 const s=C.createState('serialization','survival');s.world.set(10,30,10,9);s.inventory[21]=1;s.durability[21]=36;s.hotbar[2]=21;s.selected=2;s.time=245;s.blocksPlaced=8;
 const restored=C.deserialize(C.serialize(s));assert.deepEqual(restored.world.data,s.world.data);assert.deepEqual({...restored.inventory},{...s.inventory});assert.deepEqual(restored.hotbar,s.hotbar);assert.equal(restored.durability[21],36);assert.equal(restored.time,245);assert.equal(restored.blocksPlaced,8);
});
test('出生地建造后复活与导入仍找到无碰撞落点',()=>{
 const s=C.createState('respawn','survival'),p=s.player,x=Math.floor(p.x),z=Math.floor(p.z),y=Math.floor(p.y);
 s.world.set(x,y,z,4);s.world.set(x,y+1,z,9);C.respawn(s);assert.equal(C.collides(s.world,s.player.x,s.player.y,s.player.z),false);assert.ok(s.player.y>=y+2);
 const data=JSON.parse(C.serialize(s));data.player.y=y;const restored=C.deserialize(JSON.stringify(data));assert.equal(C.collides(restored.world,restored.player.x,restored.player.y,restored.player.z),false);
});
test('损坏/越界存档被拒绝，额外玩家字段不进入主循环',()=>{
 const original=JSON.parse(C.serialize(C.createState('valid','survival')));
 for(const mutation of [d=>d.version=2,d=>d.selected='oops',d=>d.hotbar[0]=900,d=>d.edits=[[-1,9]],d=>d.edits=[[7000,'9']],d=>d.player.x='NaN',d=>d.inventory[21]=-4,d=>d.time=-1]){
  const data=structuredClone(original);mutation(data);assert.throws(()=>C.deserialize(JSON.stringify(data)));
 }
 const extra=structuredClone(original);extra.player.invulnerable='immortal';extra.player.vy='bad';const s=C.deserialize(JSON.stringify(extra));assert.equal(s.player.invulnerable,0);assert.equal(s.player.vy,0);
});
