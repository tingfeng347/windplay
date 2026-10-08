(function(root){
'use strict';
const L=typeof module!=='undefined'?require('./levels.js'):root.MarioLevels;
const T=32, GROUND=384, STEP=1/120;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function create(index=0, carry={}){
 const level=L.levels[clamp(Math.trunc(index)||0,0,31)];
 const s={index:L.levels.indexOf(level),level,status:'playing',age:0,time:level.time,score:carry.score||0,coins:carry.coins||0,lives:carry.lives||3,camera:0,events:[],solids:[],enemies:[],items:[],shots:[],particles:[],firebars:[],checkpoint:0,bonus:null,route:0,completed:false};
 const big=(carry.power||0)>0;
 s.player={x:80,y:GROUND-(big?54:30),w:24,h:big?54:30,vx:0,vy:0,grounded:true,face:1,power:carry.power||0,invincible:0,star:0,coyote:0,jumpBuffer:0,fireCooldown:0};
 for(let x=0;x<level.length;x++)if(!level.pits.some(([a,w])=>x>=a&&x<a+w))s.solids.push({x:x*T,y:GROUND,w:T,h:64,type:'ground'});
 for(const [x,h] of level.pipes)s.solids.push({x:x*T,y:GROUND-h*T,w:64,h:h*T,type:'pipe',entry:level.theme!=='castle',plant:level.world>=2});
 for(const [x,h] of level.stairs)for(let k=0;k<Math.abs(h);k++)s.solids.push({x:(x+k)*T,y:GROUND-(h>0?k+1:Math.abs(h)-k)*T,w:T,h:(h>0?k+1:Math.abs(h)-k)*T,type:'stone'});
 level.blocks.forEach(([x,y,w],n)=>{for(let k=0;k<w;k++){
  const platform=['trees','bridge','snow'].includes(level.theme)||level.theme==='castle';
  s.solids.push({x:(x+k)*T,y:y*T,w:T,h:T,type:platform?'platform':(k%3===1||w===1?'question':'brick'),content:n===0?'power':(n===2?'star':'coin'),used:false,bump:0});
 }});
 if(level.theme==='cave')for(let x=0;x<level.length-18;x++)s.solids.push({x:x*T,y:32,w:T,h:32,type:'brick'});
 const groundAt=x=>{const a=s.solids.filter(b=>x>=b.x&&x<b.x+b.w&&b.y>=96&&!['brick','question'].includes(b.type));return a.length?Math.min(...a.map(b=>b.y)):GROUND;};
 level.enemies.forEach((x,i)=>{
  let type=level.theme==='water'?(i%3===0?'blooper':'fish'):level.theme==='bridge'?'flyingfish':i%4===2?'koopa':'goomba';
  if(level.id==='8-3'||(level.world>=3&&i%7===4))type='hammer';
  s.enemies.push({x:x*T,y:groundAt(x*T)-(type==='koopa'||type==='hammer'?42:28),w:28,h:type==='koopa'||type==='hammer'?42:28,vx:-36-(level.world*2),vy:0,type,alive:true,phase:i*1.4,hits:0,cooldown:1+i%3});
 });
 if(['4-1','6-1','8-2'].includes(level.id))s.enemies.push({x:550,y:88,w:38,h:32,type:'lakitu',vx:0,vy:0,alive:true,cooldown:3,phase:0});
 if(level.world>=5&&level.theme!=='castle'&&level.theme!=='water')for(let x=60;x<level.length-30;x+=45)s.solids.push({x:x*T,y:GROUND-64,w:32,h:64,type:'cannon',cooldown:3});
 if(['trees','snow'].includes(level.theme))for(let x=37;x<level.length-20;x+=32)s.solids.push({x:x*T,y:280+Math.sin(x)*72,w:96,h:16,type:'moving',baseY:280,phase:x,dx:0,dy:0});
 if(level.theme==='castle'){
  for(let x=36;x<level.length-35;x+=24)s.firebars.push({x:x*T,y:256,length:level.world>=5?6:4,phase:x});
  s.enemies.push({x:(level.length-15)*T,y:GROUND-62,w:58,h:62,type:'bowser',vx:-24,vy:0,alive:true,hits:0,cooldown:2,phase:0});
 }
 s.goal=(level.length-8)*T;
 s.water=level.theme==='water';
 return s;
}
function event(s,name){s.events.push(name);}
function coin(s,n=1){s.coins+=n;s.score+=200*n;while(s.coins>=100){s.coins-=100;s.lives++;event(s,'life');}event(s,'coin');}
function power(s,n){const p=s.player;p.y-=n>0&&p.h===30?24:0;p.h=n>0?54:30;p.power=n;}
function hit(s){const p=s.player;if(p.invincible>0||p.star>0||s.status!=='playing')return;if(p.power){power(s,0);p.invincible=2;p.vx=-p.face*130;event(s,'hurt');}else die(s);}
function die(s){if(s.status!=='playing')return;s.lives--;s.status=s.lives>0?'dead':'gameover';event(s,'death');}
function bump(s,b){if(b.type==='question'&&!b.used){b.used=true;b.bump=.18;s.score+=50;const kind=b.content==='power'?(s.player.power?'flower':'mushroom'):b.content;if(kind==='coin')coin(s);else s.items.push({x:b.x+4,y:b.y-28,w:24,h:26,vx:kind==='flower'?0:65,vy:-30,kind});event(s,'bump');}else if(b.type==='brick'){b.bump=.15;if(s.player.power){b.removed=true;s.score+=50;for(let i=0;i<4;i++)s.particles.push({x:b.x+16,y:b.y+16,vx:(i%2?1:-1)*90,vy:-160-i*20,life:.6});event(s,'break');}}}
function move(s,o,dt,head=false){
 o.x+=o.vx*dt;
 for(const b of s.solids){if(b.removed||b.type==='moving'||!overlap(o,b))continue;if(o.vx>0)o.x=b.x-o.w;else if(o.vx<0)o.x=b.x+b.w;if(head)o.vx=0;else o.vx=-o.vx;}
 const prev=o.y;o.y+=o.vy*dt;o.grounded=false;
 for(const b of s.solids){if(b.removed||!overlap(o,b))continue;if(b.type==='moving'&&!(o.vy>=0&&prev+o.h<=b.y-b.dy+3))continue;
  if(o.vy>=0&&prev+o.h<=b.y+Math.abs(b.dy||0)+6){o.y=b.y-o.h;o.vy=0;o.grounded=true;if(b.type==='moving'){o.x+=b.dx;}}
  else if(o.vy<0&&prev>=b.y+b.h-6){o.y=b.y+b.h;o.vy=0;if(head)bump(s,b);}
 }
}
function enterPipe(s){
 if(s.bonus)return;
 const p=s.player,b=s.solids.find(b=>b.type==='pipe'&&b.entry&&Math.abs(p.y+p.h-b.y)<3&&p.x+p.w/2>b.x+8&&p.x+p.w/2<b.x+b.w-8);
 if(!b)return;
 s.bonus={returnX:b.x+b.w+8,returnY:GROUND-p.h,solids:s.solids,enemies:s.enemies,camera:s.camera,goal:s.goal,water:s.water};
 s.solids=[];s.enemies=[];s.camera=0;s.goal=Infinity;s.water=false;
 for(let x=0;x<28;x++)s.solids.push({x:x*T,y:GROUND,w:T,h:64,type:'ground'});
 for(let x=4;x<20;x++)for(const y of [190,254,318])s.items.push({x:x*T,y,w:20,h:24,kind:'coin',vx:0,vy:0});
 s.solids.push({x:24*T,y:GROUND-64,w:64,h:64,type:'pipe',exit:true});p.x=64;p.y=GROUND-p.h;p.vx=p.vy=0;event(s,'pipe');
}
function exitPipe(s){const b=s.bonus,p=s.player;s.solids=b.solids;s.enemies=b.enemies;s.camera=b.camera;s.goal=b.goal;s.water=b.water;s.items=[];s.bonus=null;p.x=b.returnX;p.y=b.returnY;p.vx=p.vy=0;event(s,'pipe');}
function clear(s){if(s.status!=='playing')return;s.status=s.index===31?'won':'clear';s.completed=true;s.score+=Math.ceil(s.time)*10+1000;event(s,'clear');}
function step(s,input={},dt=STEP){
 if(s.status!=='playing')return;
 dt=clamp(dt,0,1/30);s.age+=dt;s.time-=dt*2.5;if(s.time<=0){s.time=0;die(s);return;}
 const p=s.player;p.invincible=Math.max(0,p.invincible-dt);p.star=Math.max(0,p.star-dt);p.fireCooldown=Math.max(0,p.fireCooldown-dt);
 for(const b of s.solids){b.bump=Math.max(0,(b.bump||0)-dt);if(b.type==='moving'){const old=b.y;b.y=b.baseY+Math.sin(s.age*1.1+b.phase)*72;b.dy=b.y-old;b.dx=0;if(p.grounded&&p.x+p.w>b.x&&p.x<b.x+b.w&&Math.abs(p.y+p.h-old)<2)p.y+=b.dy;}if(b.type==='cannon'&&Math.abs(b.x-p.x)<900){b.cooldown-=dt;if(b.cooldown<=0){b.cooldown=3;s.enemies.push({x:b.x,y:b.y,w:30,h:24,type:'bullet',vx:p.x<b.x?-160:160,vy:0,alive:true,phase:0});}}}
 const underwater=s.water||(s.level.id==='8-4'&&p.x>145*T&&p.x<191*T);
 const dir=(input.right?1:0)-(input.left?1:0),max=underwater?150:input.run?285:190;
 p.vx=clamp(p.vx+dir*(underwater?480:1050)*dt,-max,max);if(!dir)p.vx*=Math.pow(p.grounded?.001:.15,dt);if(dir)p.face=dir;
 p.coyote=p.grounded?.095:Math.max(0,p.coyote-dt);p.jumpBuffer=input.jumpPressed?.12:Math.max(0,p.jumpBuffer-dt);
 if((p.jumpBuffer>0&&p.coyote>0)||(underwater&&input.jumpPressed)){p.vy=underwater?-215:-620;p.grounded=false;p.coyote=0;p.jumpBuffer=0;event(s,'jump');}
 if(!input.jump&&p.vy< -200&&!underwater)p.vy+=1900*dt;
 p.vy=Math.min(underwater?125:850,p.vy+(underwater?320:1300)*dt);
 const previousBottom=p.y+p.h;
 move(s,p,dt,true);p.x=clamp(p.x,0,s.bonus?860:s.level.length*T-32);if(underwater&&p.y<60){p.y=60;p.vy=Math.max(0,p.vy);}
 if(input.down){if(s.bonus&&p.x>23*T)exitPipe(s);else enterPipe(s);}
 if(input.firePressed&&p.power===2&&p.fireCooldown<=0&&s.shots.filter(x=>!x.enemy).length<2){p.fireCooldown=.22;s.shots.push({x:p.x+12,y:p.y+18,w:12,h:12,vx:p.face*380,vy:120,life:2,enemy:false});event(s,'fire');}
 const spawned=[];
 for(const e of s.enemies){if(!e.alive||Math.abs(e.x-p.x)>1050)continue;e.phase+=dt;
  if(e.type==='lakitu'){e.x+=(p.x+200-e.x)*dt;e.y=95+Math.sin(e.phase)*22;e.cooldown-=dt;if(e.cooldown<=0){e.cooldown=3;spawned.push({x:e.x,y:e.y+32,w:28,h:24,vx:-45,vy:0,alive:true,type:'spiny',phase:0});}}
  else if(['fish','blooper'].includes(e.type)){e.x+=e.vx*dt;e.y=220+Math.sin(e.phase*1.8)*105;}
  else if(e.type==='flyingfish'){e.x+=e.vx*dt;e.y=370-Math.abs(Math.sin(e.phase*1.9))*240;}
  else if(e.type==='bullet'){e.x+=e.vx*dt;}
  else{
   e.vy=Math.min(850,e.vy+1450*dt);move(s,e,dt);
   if(e.type==='bowser'||e.type==='hammer'){
    e.cooldown-=dt;if(e.cooldown<=0){e.cooldown=e.type==='bowser'?1.7:1.5;e.vy=-350;s.shots.push({x:e.x,y:e.y+15,w:18,h:18,vx:-170,vy:e.type==='hammer'?-330:0,life:4,enemy:true,hammer:e.type==='hammer'});}
    if(e.type==='bowser'&&Math.abs(e.x-(s.goal-180))>80)e.vx=-e.vx;
   }
  }
  if(e.y>500){e.alive=false;continue;}
  if(overlap(p,e)){
   if(p.star>0){e.alive=false;s.score+=200;event(s,'stomp');}
   else if(p.vy>=0&&previousBottom<=e.y+16&&!['spiny','bowser','blooper','fish'].includes(e.type)){
    p.y=e.y-p.h;p.vy=-340;s.score+=100;event(s,'stomp');
    if(e.type==='koopa'){e.type='shell';e.y+=18;e.h=24;e.vx=0;}
    else if(e.type==='shell'&&e.vx===0){e.vx=p.face*330;p.invincible=.18;}else e.alive=false;
   }else if(e.type==='shell'&&e.vx===0){e.vx=(p.x<e.x?1:-1)*330;p.invincible=.18;event(s,'stomp');}else hit(s);
  }
  if(e.type==='shell'&&Math.abs(e.vx)>100)for(const other of s.enemies)if(other!==e&&other.alive&&overlap(e,other)){other.alive=false;s.score+=200;event(s,'stomp');}
 }
 s.enemies.push(...spawned);
 for(const b of s.solids)if(b.type==='pipe'&&b.plant){const h=clamp(Math.sin(s.age*1.2+b.x)*42+16,0,42);if(h>8&&Math.abs(p.x-b.x)>42&&overlap(p,{x:b.x+20,y:b.y-h,w:24,h}))hit(s);}
 for(const bar of s.firebars)for(let k=1;k<=bar.length;k++){const a=s.age*(.9+s.level.world*.04)+bar.phase;if(overlap(p,{x:bar.x+Math.cos(a)*k*16-6,y:bar.y+Math.sin(a)*k*16-6,w:12,h:12}))hit(s);}
 for(const it of s.items){if(it.taken)continue;if(!['coin','flower'].includes(it.kind)){it.vy=Math.min(850,it.vy+1450*dt);move(s,it,dt);}if(overlap(p,it)){it.taken=true;if(it.kind==='coin')coin(s);else if(it.kind==='star'){p.star=10;s.score+=1000;}else{power(s,it.kind==='flower'?2:Math.max(1,p.power));s.score+=1000;}event(s,'power');}}
 for(const shot of s.shots){shot.life-=dt;shot.x+=shot.vx*dt;if(shot.hammer||!shot.enemy){shot.vy+=1100*dt;shot.y+=shot.vy*dt;}else shot.y+=Math.sin(s.age*8)*dt*20;
  for(const b of s.solids)if(!b.removed&&overlap(shot,b)){if(shot.vy>0&&shot.y+shot.h-shot.vy*dt<=b.y+6){shot.y=b.y-shot.h;shot.vy=-270;}else shot.life=0;}
  if(shot.enemy){if(overlap(p,shot)){hit(s);shot.life=0;}}else for(const e of s.enemies)if(e.alive&&overlap(shot,e)){shot.life=0;e.hits++;if(e.type!=='bowser'||e.hits>=5){e.alive=false;s.score+=200;}event(s,'stomp');break;}
 }
 s.shots=s.shots.filter(x=>x.life>0&&x.y<500);s.items=s.items.filter(x=>!x.taken&&x.y<500);
 for(const it of s.particles){it.life-=dt;it.x+=it.vx*dt;it.vy+=1200*dt;it.y+=it.vy*dt;}s.particles=s.particles.filter(x=>x.life>0);
 // Castle route checks are visible gates: wrong elevation returns to the section entrance.
 if(['4-4','7-4'].includes(s.level.id)&&s.route<2&&p.x>(s.route===0?100:160)*T){const correct=s.route===0?p.y<260:p.y>270;if(correct){s.route++;event(s,'route');}else{p.x=(s.route===0?72:126)*T;p.y=GROUND-p.h;p.vx=p.vy=0;event(s,'wrongroute');}}
 if(p.y>490)die(s);
 if(p.x>=s.goal&&!s.bonus)clear(s);
 s.camera=clamp(p.x-270,0,(s.bonus?28:s.level.length)*T-768);
}
function next(s){return create(Math.min(31,s.index+1),{...s,power:s.player.power});}
function retry(s){return create(s.index,{...s,power:0,lives:s.lives>0?s.lives:3});}
function serialize(s){return JSON.stringify({version:1,index:s.index,score:s.score,coins:s.coins,lives:s.lives,power:s.player.power,completed:s.completed});}
function restore(raw){try{const v=JSON.parse(raw);if(v.version!==1||!Number.isInteger(v.index)||v.index<0||v.index>31)return null;return create(v.completed&&v.index<31?v.index+1:v.index,{score:clamp(Number(v.score)||0,0,9999999),coins:clamp(Number(v.coins)||0,0,99),lives:clamp(Number(v.lives)||3,1,99),power:clamp(Math.trunc(v.power)||0,0,2)});}catch{return null;}}
const api={T,GROUND,STEP,create,step,next,retry,serialize,restore,overlap,power,hit,clear};if(typeof module!=='undefined')module.exports=api;root.MarioEngine=api;
})(typeof window==='undefined'?globalThis:window);
