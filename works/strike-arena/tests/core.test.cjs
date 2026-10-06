const test=require('node:test'),assert=require('node:assert/strict'),C=require('../src/core.js');
function clean(){const s=C.createState('range');s.bots=[];s.player.invulnerable=0;s.player.x=32;s.player.z=46;s.player.y=0;s.player.yaw=Math.PI;s.player.pitch=0;return s;}
function bot(id,x,z,y=0){return {id,x,y,z,health:100,heading:0,cooldown:0,path:[],planTimer:0,respawn:0,state:'patrol',hurt:0,walk:0};}
test('工业园地图和带种子敌人生成确定，出生点无碰撞且敌人不重叠',()=>{
 const a=C.createState('veteran',347),b=C.createState('veteran',347);assert.deepEqual(a.map,b.map);assert.deepEqual(a.bots,b.bots);assert.equal(C.collision(a.map,a.player.x,a.player.y,a.player.z),false);
 const points=new Set(a.bots.map(b=>`${b.x},${b.z}`));assert.equal(points.size,a.bots.length);for(const enemy of a.bots)assert.equal(C.collision(a.map,enemy.x,enemy.y,enemy.z),false);
});
test('射线盒求交返回精确距离与法线，平行射线和最远距离正确',()=>{
 const box={min:{x:1,y:1,z:1},max:{x:3,y:3,z:3}};
 assert.deepEqual(C.rayBox({x:2,y:2,z:6},{x:0,y:0,z:-1},box,10),{distance:3,normal:{x:0,y:0,z:1}});
 assert.equal(C.rayBox({x:5,y:2,z:6},{x:0,y:0,z:-1},box,10),null);assert.equal(C.rayBox({x:2,y:2,z:6},{x:0,y:0,z:-1},box,2),null);
 assert.equal(C.raySphere({x:0,y:0,z:4},{x:0,y:0,z:-1},{x:0,y:0,z:0},1),3);
});
test('环境射线挡住子弹与敌人视线，清晰目标的头与身体正确区分',()=>{
 const s=clean();s.player.x=18;s.player.z=30;s.bots=[bot(0,18,20)];const wall=C.bulletHit(s,{x:18,y:1.58,z:30},{x:0,y:0,z:-1});assert.equal(wall.kind,'wall');assert.equal(wall.object.kind,'container');
 assert.equal(C.visible(s.map,{x:18,y:1.58,z:30},{x:18,y:1.58,z:20}),false);
 s.bots=[bot(0,32,50)];const head=C.bulletHit(s,{x:32,y:1.57,z:46},{x:0,y:0,z:1});assert.equal(head.kind,'bot');assert.equal(head.headshot,true);
 const body=C.bulletHit(s,{x:32,y:1,z:46},{x:0,y:0,z:1});assert.equal(body.headshot,false);
});
test('真实开火扣弹并遵守射速/换弹互斥，头部命中击杀计分',()=>{
 const s=clean();s.bots=[bot(0,32,50)];const result=C.fire(s,true,false);assert.equal(result.ok,true);assert.equal(s.ammo.rifle.mag,29);assert.equal(s.kills,1);assert.equal(s.headshots,1);assert.equal(s.hits,1);assert.equal(s.shots,1);
 assert.equal(C.fire(s,true).ok,false);assert.equal(s.ammo.rifle.mag,29);assert.equal(C.reload(s),true);s.fireCooldown=0;assert.equal(C.fire(s,true).ok,false);
});
test('换弹仅补实际储备，切枪取消换弹，空弹匣不凭空开火',()=>{
 const s=clean();s.ammo.rifle={mag:24,reserve:3};assert.equal(C.reload(s),true);for(let n=0;n<50;n++)C.step(s,{},.05);assert.deepEqual(s.ammo.rifle,{mag:27,reserve:0});
 s.ammo.rifle={mag:10,reserve:50};C.reload(s);C.switchWeapon(s,'pistol');assert.equal(s.reloading,0);assert.equal(s.ammo.rifle.mag,10);s.fireCooldown=0;s.ammo.pistol.mag=0;assert.equal(C.fire(s).empty,true);assert.equal(s.shots,0);
});
test('反冲与准星共享真实观察角，瞄准状态降低随机散布',()=>{
 const s=clean();const previous=s.player.pitch;C.fire(s,true);assert.equal(s.player.pitch,previous+.004);const event=s.events.find(e=>e.type==='shot'),expected=C.direction(s.player.yaw,s.player.pitch);
 assert.ok(Math.abs(event.dir.x-expected.x)<C.WEAPONS.rifle.spread*.3);assert.ok(Math.abs(event.dir.y-expected.y)<C.WEAPONS.rifle.spread*.3);assert.ok(s.player.recoil>0);
});
test('玩家碰撞阻挡墙体，平台边缘有实体支撑，跳跃不会穿地或跳出世界',()=>{
 const s=clean();s.player.x=12.8;s.player.z=20;s.player.yaw=-Math.PI/2;for(let n=0;n<180;n++)C.stepPlayer(s,{forward:true},1/60);assert.ok(s.player.x>=12.319);
 Object.assign(s.player,{x:26.5,y:3.22,z:19.5,vy:0,grounded:true});for(let n=0;n<70;n++)C.stepPlayer(s,{},1/60);assert.ok(Math.abs(s.player.y-3.22)<.003);
 C.stepPlayer(s,{jump:true},1/60);assert.ok(s.player.y>3.22);assert.equal(C.collision(s.map,-1,20,15),true);
});
test('阶梯实际可登上装卸平台',()=>{
 const s=clean();Object.assign(s.player,{x:34,y:0,z:34,yaw:0,pitch:0,vy:0,grounded:true});for(let n=0;n<160;n++)C.stepPlayer(s,{forward:true},1/60);assert.ok(s.player.y>2.9,`当前高度 ${s.player.y}`);
});
test('敌人导航绕开障碍，路径节点和连接保持可走',()=>{
 const s=clean(),from={x:18,z:30},to={x:18,z:13},path=C.pathTo(s.map,s.nodes,from,to);assert.ok(path.length>0);
 for(const p of path)assert.equal(C.collision(s.map,p.x,0,p.z,1.75,.4),false);
 let previous=s.nodes.reduce((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)<Math.hypot(b.x-from.x,b.z-from.z)?a:b);for(const p of path){assert.ok(Math.abs(p.x-previous.x)+Math.abs(p.z-previous.z)<=3.01);assert.equal(C.visible(s.map,{...previous,y:.6},{...p,y:.6}),true);previous=p;}
});
test('敌人能看过低箱但枪口被挡时不透射，近距受遮挡会绕行',()=>{
 const s=clean();s.difficulty='veteran';Object.assign(s.player,{x:21.75,z:39,y:0,invulnerable:0});s.bots=[bot(0,21.75,16)];
 assert.equal(C.visible(s.map,{x:21.75,y:1.54,z:16},{x:21.75,y:1.2,z:39}),true);C.stepBots(s,.05);assert.equal(s.events.some(e=>e.type==='enemy-shot'),false);assert.equal(s.player.health,100);
 Object.assign(s.player,{x:24,z:37,y:0});s.bots=[bot(0,24,29)];const before={x:24,z:29};for(let n=0;n<30;n++)C.stepBots(s,.05);assert.ok(Math.hypot(s.bots[0].x-before.x,s.bots[0].z-before.z)>.1);
});
test('护甲吸收伤害，倒下/复活补弹，保护时间避免重复伤害',()=>{
 const s=clean();C.damagePlayer(s,50);assert.equal(s.player.armor,44);assert.equal(s.player.health,81);
 C.damagePlayer(s,1000);assert.equal(s.deaths,1);assert.equal(s.respawning,3);assert.equal(C.damagePlayer(s,100),false);s.ammo.rifle.mag=0;
 for(let n=0;n<70;n++)C.step(s,{},.05);assert.equal(s.respawning<=0,true);assert.equal(s.player.health,100);assert.equal(s.ammo.rifle.mag,30);assert.ok(s.player.invulnerable>0);assert.equal(C.damagePlayer(s,100),false);
});
test('手雷库存/爆炸与目标结束状态正确，暂停后不重复计分',()=>{
 const s=clean();assert.equal(C.grenade(s),true);assert.equal(s.grenadeStock,1);assert.equal(s.grenades.length,1);for(let n=0;n<55;n++)C.step(s,{},.05);assert.equal(s.grenades.length,0);assert.ok(s.events.some(e=>e.type==='explosion'));
 s.kills=14;s.bots=[bot(0,32,50)];C.hitBot(s,s.bots[0],100,true);assert.equal(s.status,'victory');const time=s.time;C.step(s,{},1);assert.equal(s.time,time);assert.equal(C.hitBot(s,s.bots[0],100),false);assert.equal(s.kills,15);
 const timeout=clean();timeout.time=.02;C.step(timeout,{},.05);assert.equal(timeout.status,'timeout');
});
test('最佳战绩严格往返验证，拒绝损坏与不可能的统计',()=>{
 const s=clean();s.kills=7;s.deaths=2;s.headshots=3;s.shots=20;s.hits=10;const stats=C.roundStats(s);assert.equal(stats.score,790);assert.equal(stats.accuracy,50);assert.deepEqual(C.parseStats(JSON.stringify(stats)),stats);
 for(const change of[d=>d.version=2,d=>d.score=-1,d=>d.headshots=9,d=>d.accuracy=150,d=>d.kills='7',d=>d.difficulty='impossible']){const data=structuredClone(stats);change(data);assert.throws(()=>C.parseStats(JSON.stringify(data)));}
});
