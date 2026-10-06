(function(root){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const WEAPONS=Object.freeze({rifle:{name:'AR-9 卡宾枪',short:'AR-9',magazine:30,reserve:150,damage:27,head:4,interval:.105,reload:1.95,spread:.006,range:110,automatic:true},pistol:{name:'P-12 手枪',short:'P-12',magazine:12,reserve:72,damage:35,head:2.9,interval:.28,reload:1.4,spread:.01,range:80,automatic:false}});
 const DIFFICULTY=Object.freeze({recruit:{name:'新兵',bots:4,accuracy:.3,damage:12,interval:1.15,speed:2.1},veteran:{name:'老兵',bots:5,accuracy:.6,damage:16,interval:.76,speed:2.65},range:{name:'靶场',bots:5,accuracy:0,damage:0,interval:2,speed:1.1}});
 const SPAWNS=Object.freeze([{x:8,z:49},{x:38,z:47},{x:46,z:7},{x:19,z:9},{x:42,z:28},{x:21,z:34},{x:34,z:9},{x:45,z:43}]);
 function makeMap(){
  const objects=[],colliders=[];
  const add=(kind,x,y,z,w,h,d,color,solid=true,extra={})=>{const o={kind,x,y,z,w,h,d,color,...extra};objects.push(o);if(solid)colliders.push({...o,min:{x,y,z},max:{x:x+w,y:y+h,z:z+d}});return o;};
  add('boundary',-1,0,-1,66,4,1,'concrete');add('boundary',-1,0,56,66,4,1,'concrete');add('boundary',-1,0,0,1,4,56,'concrete');add('boundary',64,0,0,1,4,56,'concrete');
  add('warehouse',0,0,1,12,10,28,'warehouse',true,{number:'04'});add('warehouse',51,0,1,13,12,31,'warehouse',true,{number:'07'});
  add('office',0,0,33,12,7,11,'concrete',true,{number:'02'});add('office',52,0,37,12,7,14,'concrete',true,{number:'08'});
  add('silo',14,0,2,5,13,5,'steel',true);add('silo',21,0,2,5,11,5,'steel',true);
  add('container',15,0,17,4.6,2.9,9,'rust',true,{number:'C-12'});add('container',41,0,13,4.6,2.9,10,'blue',true,{number:'C-08'});
  add('container',30,0,37,9,2.9,4.6,'steel',true,{number:'C-21'});add('container',13,0,38,4.6,2.9,7,'olive',true,{number:'C-03'});
  add('shed',27,0,20,7,3.1,7,'concrete',true,{number:'B'});
  // A climbable loading platform with a low step staircase.
  add('platform',26,3.1,19,9,.12,8,'darkSteel',true);
  for(let i=0;i<9;i++)add('step',33,0,26.5+i*.7,2,(9-i)*.35,.7,'steel');
  add('barrier',22,0,30,4,1.3,.8,'concrete');add('barrier',40,0,33,5,1.3,.8,'concrete');
  for(const [x,z,n]of [[21,17,2],[36,15,1],[20,29,1],[43,39,2],[25,44,1],[47,24,1]]){
   add('crate',x,0,z,1.5,1.5,1.5,'wood');if(n===2){add('crate',x+1.6,0,z,1.5,1.5,1.5,'wood');add('crate',x+.8,1.5,z,1.5,1.5,1.5,'wood');}
  }
  for(const [x,z]of [[13,31],[47,34],[37,11],[23,40]]){add('barrel',x,0,z,.8,1.1,.8,'rust');add('barrel',x+.95,0,z+.25,.8,1.1,.8,'steel');}
  add('truck',43,0,46,3,2.1,5.7,'olive');add('truckCab',43,0,44.2,3,2.8,2.2,'olive');
  add('sandbag',36,0,25,4.3,.8,.75,'sand');add('sandbag',36,0,25,1,.8,3,'sand');
  add('gate',27,0,.25,10,4,.1,'steel',false);
  return {width:64,depth:56,objects,colliders,spawns:SPAWNS};
 }
 function rayBox(origin,dir,box,maxDistance=Infinity){
  let tmin=0,tmax=maxDistance,normal={x:0,y:0,z:0};
  for(const axis of ['x','y','z']){
   const d=dir[axis],o=origin[axis],min=box.min[axis],max=box.max[axis];
   if(Math.abs(d)<1e-8){if(o<min||o>max)return null;continue;}
   let near=(min-o)/d,far=(max-o)/d,sign=-Math.sign(d);if(near>far)[near,far]=[far,near];
   if(near>tmin){tmin=near;normal={x:0,y:0,z:0};normal[axis]=sign;}tmax=Math.min(tmax,far);if(tmin>tmax)return null;
  }
  return tmin<=maxDistance?{distance:tmin,normal}:null;
 }
 function raySphere(origin,dir,center,radius,maxDistance=Infinity){
  const x=origin.x-center.x,y=origin.y-center.y,z=origin.z-center.z,b=x*dir.x+y*dir.y+z*dir.z,c=x*x+y*y+z*z-radius*radius,d=b*b-c;
  if(d<0)return null;const t=-b-Math.sqrt(d);return t>=0&&t<=maxDistance?t:null;
 }
 function mapRay(map,origin,dir,range=120){
  let best=null,limit=range;
  for(const box of map.colliders){const hit=rayBox(origin,dir,box,limit);if(hit&&hit.distance<limit){limit=hit.distance;best={...hit,object:box};}}
  if(dir.y<0){const t=-origin.y/dir.y;if(t>=0&&t<limit)best={distance:t,normal:{x:0,y:1,z:0},object:{kind:'floor'}};}
  return best;
 }
 function visible(map,a,b){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,l=Math.hypot(dx,dy,dz);if(l<.001)return true;return !mapRay(map,a,{x:dx/l,y:dy/l,z:dz/l},l-.1);}
 function collision(map,x,y,z,height=1.75,radius=.32){
  if(y<0||x-radius<0||x+radius>map.width||z-radius<0||z+radius>map.depth)return true;
  for(const b of map.colliders)if(x+radius>b.min.x+.0001&&x-radius<b.max.x-.0001&&y+height>b.min.y+.0001&&y<b.max.y-.0001&&z+radius>b.min.z+.0001&&z-radius<b.max.z-.0001)return true;
  return false;
 }
 function direction(yaw,pitch=0){return {x:Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)};}
 function random(state){state.rng=(Math.imul(state.rng,1664525)+1013904223)>>>0;return state.rng/4294967296;}
 function navGrid(map){
  const nodes=[];for(let x=3;x<64;x+=3)for(let z=3;z<56;z+=3)if(!collision(map,x,0,z,1.75,.4))nodes.push({x,z});return nodes;
 }
 function nearest(nodes,x,z){let best=0,dist=Infinity;for(let i=0;i<nodes.length;i++){const d=Math.hypot(nodes[i].x-x,nodes[i].z-z);if(d<dist){dist=d;best=i;}}return best;}
 function pathTo(map,nodes,from,to){
  const start=nearest(nodes,from.x,from.z),end=nearest(nodes,to.x,to.z),queue=[start],previous=new Map([[start,-1]]);
  for(let q=0;q<queue.length;q++){
   const current=queue[q];if(current===end)break;const a=nodes[current];
   for(let i=0;i<nodes.length;i++){if(previous.has(i))continue;const b=nodes[i];if(Math.abs(a.x-b.x)+Math.abs(a.z-b.z)>3.01)continue;
    if(!visible(map,{x:a.x,y:.6,z:a.z},{x:b.x,y:.6,z:b.z}))continue;previous.set(i,current);queue.push(i);}
  }
  if(!previous.has(end))return [];
  const path=[];let n=end;while(n!==start&&n!==-1){path.unshift({...nodes[n]});n=previous.get(n);}return path;
 }
 function playerSpawn(map){const s=SPAWNS[0];return {x:s.x,y:0,z:s.z,yaw:1.25,pitch:-.025,vx:0,vy:0,vz:0,grounded:true,health:100,armor:75,invulnerable:2,recoil:0};}
 function createState(difficulty='recruit',seed=347){
  const map=makeMap(),s={version:1,map,nodes:navGrid(map),difficulty:DIFFICULTY[difficulty]?difficulty:'recruit',rng:seed>>>0,player:playerSpawn(map),weapon:'rifle',ammo:{rifle:{mag:30,reserve:150},pistol:{mag:12,reserve:72}},reloading:0,reloadWeapon:null,fireCooldown:0,kills:0,deaths:0,headshots:0,shots:0,hits:0,time:240,goal:15,status:'playing',respawning:0,bots:[],events:[],grenades:[],grenadeStock:2,elapsed:0};
  for(let i=0;i<DIFFICULTY[s.difficulty].bots;i++)s.bots.push(spawnBot(s,i));return s;
 }
 function spawnBot(state,id){
  const p=state.player,candidates=SPAWNS.slice(1).filter(s=>Math.hypot(s.x-p.x,s.z-p.z)>12&&!collision(state.map,s.x,0,s.z)&&!state.bots.some(b=>b.id!==id&&b.health>0&&b.respawn<=0&&Math.hypot(b.x-s.x,b.z-s.z)<2));
  const spawn=candidates[Math.floor(random(state)*candidates.length)]||SPAWNS[2];
  return {id,x:spawn.x,y:0,z:spawn.z,health:100,heading:0,cooldown:1+random(state),path:[],planTimer:0,respawn:0,state:'patrol',hurt:0,walk:0};
 }
 function emit(s,type,data={}){s.events.push({type,...data});if(s.events.length>80)s.events.shift();}
 function damagePlayer(s,damage){
  const p=s.player;if(p.invulnerable>0||s.respawning>0||s.status!=='playing')return false;
  const armorDamage=Math.min(p.armor,damage*.62);p.armor-=armorDamage;p.health=Math.max(0,p.health-(damage-armorDamage));emit(s,'damage',{amount:damage});
  if(p.health<=0){s.deaths++;s.respawning=3;s.reloading=0;emit(s,'death');}return true;
 }
 function hitBot(s,bot,damage,headshot=false){
  if(bot.health<=0||bot.respawn>0)return false;bot.health=Math.max(0,bot.health-damage);bot.hurt=.25;bot.state='engage';emit(s,'hit',{headshot,x:bot.x,y:bot.y+1.3,z:bot.z});
  if(bot.health<=0){s.kills++;if(headshot)s.headshots++;bot.respawn=4.2;emit(s,'kill',{headshot,id:bot.id});if(s.kills>=s.goal){s.status='victory';emit(s,'round-end');}}return true;
 }
 function bulletHit(s,origin,dir,range=120){
  const wall=mapRay(s.map,origin,dir,range);let limit=wall?.distance??range,best=wall?{kind:'wall',...wall}:null;
  for(const bot of s.bots){if(bot.health<=0||bot.respawn>0)continue;
   const head=raySphere(origin,dir,{x:bot.x,y:bot.y+1.57,z:bot.z},.22,limit);
   const body=rayBox(origin,dir,{min:{x:bot.x-.27,y:bot.y+.25,z:bot.z-.23},max:{x:bot.x+.27,y:bot.y+1.4,z:bot.z+.23}},limit);
   if(head!==null&&head<limit){limit=head;best={kind:'bot',bot,distance:head,headshot:true};}
   if(body&&body.distance<limit){limit=body.distance;best={kind:'bot',bot,distance:body.distance,headshot:false};}
  }
  return best;
 }
 function fire(s,aim=false,moving=false){
  if(s.status!=='playing'||s.respawning>0||s.reloading>0||s.fireCooldown>0)return {ok:false};
  const weapon=WEAPONS[s.weapon],ammo=s.ammo[s.weapon];if(ammo.mag<=0){emit(s,'empty');s.fireCooldown=.22;return {ok:false,empty:true};}
  ammo.mag--;s.shots++;s.fireCooldown=weapon.interval;s.player.recoil=clamp(s.player.recoil+(aim?.012:.021),0,.115);
  s.player.pitch=clamp(s.player.pitch+(aim?.004:.009),-1.45,1.45);
  const spread=weapon.spread*(aim?.28:1)*(moving?2.2:1)*(s.player.grounded?1:2.5);
  const dir=direction(s.player.yaw+(random(s)-.5)*spread,s.player.pitch+(random(s)-.5)*spread),origin={x:s.player.x,y:s.player.y+1.58,z:s.player.z};
  const hit=bulletHit(s,origin,dir,weapon.range),distance=hit?.distance??70,end={x:origin.x+dir.x*distance,y:origin.y+dir.y*distance,z:origin.z+dir.z*distance};
  emit(s,'shot',{origin,dir,end,weapon:s.weapon});
  if(hit?.kind==='bot'){s.hits++;hitBot(s,hit.bot,weapon.damage*(hit.headshot?weapon.head:1),hit.headshot);}else if(hit)emit(s,'impact',{...end,normal:hit.normal});
  return {ok:true,hit,end};
 }
 function reload(s){
  if(s.status!=='playing'||s.respawning>0||s.reloading>0)return false;
  const ammo=s.ammo[s.weapon],w=WEAPONS[s.weapon];if(ammo.mag>=w.magazine||ammo.reserve<=0)return false;
  s.reloading=w.reload;s.reloadWeapon=s.weapon;emit(s,'reload');return true;
 }
 function switchWeapon(s,id){if(!WEAPONS[id]||s.respawning>0)return false;s.weapon=id;s.reloading=0;s.reloadWeapon=null;s.fireCooldown=Math.max(s.fireCooldown,.18);emit(s,'switch');return true;}
 function grenade(s){
  if(s.status!=='playing'||s.respawning>0||s.grenadeStock<=0)return false;
  const p=s.player,d=direction(p.yaw,p.pitch+.2);s.grenadeStock--;s.grenades.push({x:p.x,y:p.y+1.45,z:p.z,vx:d.x*13,vy:d.y*13+2,vz:d.z*13,fuse:2.3});emit(s,'throw');return true;
 }
 function stepPlayer(s,input,dt){
  const p=s.player,map=s.map;
  const speed=input.sprint&&!input.aim?6.3:input.aim?2.1:3.9;
  let f=(input.forward?1:0)-(input.back?1:0),side=(input.right?1:0)-(input.left?1:0),l=Math.hypot(f,side)||1;f/=l;side/=l;
  p.vx=(Math.sin(p.yaw)*f+Math.cos(p.yaw)*side)*speed;p.vz=(-Math.cos(p.yaw)*f+Math.sin(p.yaw)*side)*speed;
  if(input.jump&&p.grounded)p.vy=7;p.vy=Math.max(-24,p.vy-21*dt);const wasGrounded=p.grounded;p.grounded=false;
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(p.vx),Math.abs(p.vy),Math.abs(p.vz))*dt/.2));
  for(let n=0;n<steps;n++)for(const [axis,vel]of [['x','vx'],['z','vz'],['y','vy']]){
   const old=p[axis],next=old+p[vel]*dt/steps;p[axis]=next;
   if(collision(map,p.x,p.y,p.z)){
    if(axis!=='y'&&wasGrounded&&!collision(map,p.x,p.y+.4,p.z)){p.y+=.4;continue;}
    p[axis]=old;let lo=0,hi=1;for(let i=0;i<9;i++){const t=(lo+hi)/2;p[axis]=old+(next-old)*t;if(collision(map,p.x,p.y,p.z))hi=t;else lo=t;}
    p[axis]=old+(next-old)*lo;if(axis==='y'&&p[vel]<0)p.grounded=true;p[vel]=0;
   }
  }
  if(p.y<.003){p.y=0;p.vy=0;p.grounded=true;}
  p.invulnerable=Math.max(0,p.invulnerable-dt);p.recoil=Math.max(0,p.recoil-dt*.12);
  return Math.abs(f)+Math.abs(side)>0;
 }
 function stepBots(s,dt){
  const p=s.player,diff=DIFFICULTY[s.difficulty];
  for(const bot of s.bots){
   if(bot.respawn>0){bot.respawn-=dt;if(bot.respawn<=0)Object.assign(bot,spawnBot(s,bot.id));continue;}
   bot.cooldown=Math.max(0,bot.cooldown-dt);bot.planTimer-=dt;bot.hurt=Math.max(0,bot.hurt-dt);
   const dist=Math.hypot(p.x-bot.x,p.z-bot.z),los=s.respawning<=0&&dist<37&&visible(s.map,{x:bot.x,y:bot.y+1.54,z:bot.z},{x:p.x,y:p.y+1.2,z:p.z});
   if(los){bot.state='engage';bot.heading=Math.atan2(p.x-bot.x,bot.z-p.z);
    const muzzle={x:bot.x+Math.sin(bot.heading)*.72,y:bot.y+1.06,z:bot.z-Math.cos(bot.heading)*.72};
    const firingLOS=visible(s.map,muzzle,{x:p.x,y:p.y+1.2,z:p.z});
    if(bot.cooldown<=0&&s.difficulty!=='range'&&firingLOS){
     bot.cooldown=diff.interval+random(s)*.5;emit(s,'enemy-shot',{origin:muzzle,end:{x:p.x,y:p.y+1.2,z:p.z}});
     const chance=diff.accuracy*(dist>23?.7:1)*(Math.hypot(p.vx,p.vz)>3?.65:1);if(random(s)<chance)damagePlayer(s,diff.damage);
    }
    if(dist<10&&firingLOS)continue;
   }
   if(bot.planTimer<=0||bot.path.length===0){
    const target=los||bot.state==='engage'?p:s.nodes[Math.floor(random(s)*s.nodes.length)];bot.path=pathTo(s.map,s.nodes,bot,target);bot.planTimer=2+random(s);
   }
   const target=bot.path[0];if(!target)continue;
   const dx=target.x-bot.x,dz=target.z-bot.z,l=Math.hypot(dx,dz);if(l<.35){bot.path.shift();continue;}
   if(!los)bot.heading=Math.atan2(dx,-dz);const speed=diff.speed*(los?.45:1),nx=bot.x+dx/l*speed*dt,nz=bot.z+dz/l*speed*dt;
   if(!collision(s.map,nx,bot.y,nz,1.75,.3)){bot.x=nx;bot.z=nz;bot.walk+=dt*speed;}else bot.path=[];
  }
 }
 function stepGrenades(s,dt){
  for(const g of s.grenades){g.fuse-=dt;g.vy-=14*dt;const speed=Math.hypot(g.vx,g.vy,g.vz),dir={x:g.vx/speed,y:g.vy/speed,z:g.vz/speed},hit=mapRay(s.map,g,dir,speed*dt+.12);
   if(hit){for(const axis of ['x','y','z'])if(hit.normal[axis])g['v'+axis]*=-.38;g.vx*=.8;g.vz*=.8;}else{g.x+=g.vx*dt;g.y+=g.vy*dt;g.z+=g.vz*dt;}
   if(g.y<.1){g.y=.1;g.vy=Math.abs(g.vy)*.4;g.vx*=.92;g.vz*=.92;}
   if(g.fuse<=0){emit(s,'explosion',{x:g.x,y:g.y,z:g.z});
    for(const bot of s.bots){const dist=Math.hypot(bot.x-g.x,bot.y+1-g.y,bot.z-g.z);if(dist<7&&visible(s.map,g,{x:bot.x,y:bot.y+1,z:bot.z}))hitBot(s,bot,Math.max(15,150*(1-dist/7)));}
    const dist=Math.hypot(s.player.x-g.x,s.player.y+1-g.y,s.player.z-g.z);if(dist<6&&visible(s.map,g,{x:s.player.x,y:s.player.y+1,z:s.player.z}))damagePlayer(s,95*(1-dist/6));
   }
  }
  s.grenades=s.grenades.filter(g=>g.fuse>0);
 }
 function step(s,input,dt){
  dt=clamp(dt,0,.05);if(s.status!=='playing')return;s.time=Math.max(0,s.time-dt);s.elapsed+=dt;s.fireCooldown=Math.max(0,s.fireCooldown-dt);
  if(s.reloading>0){s.reloading=Math.max(0,s.reloading-dt);if(s.reloading===0){const a=s.ammo[s.reloadWeapon],w=WEAPONS[s.reloadWeapon],count=Math.min(w.magazine-a.mag,a.reserve);a.mag+=count;a.reserve-=count;s.reloadWeapon=null;emit(s,'reloaded');}}
  if(s.respawning>0){s.respawning-=dt;if(s.respawning<=0){s.player=playerSpawn(s.map);s.ammo={rifle:{mag:30,reserve:150},pistol:{mag:12,reserve:72}};s.grenadeStock=2;emit(s,'respawn');}}
  else stepPlayer(s,input,dt);
  stepBots(s,dt);stepGrenades(s,dt);
  if(s.time<=0){s.status=s.kills>=s.goal?'victory':'timeout';emit(s,'round-end');}
 }
 function roundStats(s){return {version:1,kills:s.kills,deaths:s.deaths,headshots:s.headshots,accuracy:s.shots?Math.round(s.hits/s.shots*100):0,score:Math.max(0,s.kills*100+s.headshots*50-s.deaths*30),difficulty:s.difficulty,victory:s.status==='victory'};}
 function parseStats(json){const d=JSON.parse(json);if(!d||d.version!==1||!DIFFICULTY[d.difficulty]||typeof d.victory!=='boolean')throw new Error('战绩格式不正确');for(const k of ['kills','deaths','headshots','accuracy','score'])if(!Number.isInteger(d[k])||d[k]<0||d[k]>1e6)throw new Error('战绩数据不正确');if(d.accuracy>100||d.headshots>d.kills)throw new Error('战绩数据不正确');return {version:1,kills:d.kills,deaths:d.deaths,headshots:d.headshots,accuracy:d.accuracy,score:d.score,difficulty:d.difficulty,victory:d.victory};}
 const api={WEAPONS,DIFFICULTY,SPAWNS,clamp,makeMap,rayBox,raySphere,mapRay,visible,collision,direction,random,navGrid,pathTo,createState,playerSpawn,spawnBot,damagePlayer,hitBot,bulletHit,fire,reload,switchWeapon,grenade,stepPlayer,stepBots,step,roundStats,parseStats};root.StrikeCore=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis==='object'?globalThis:this);
