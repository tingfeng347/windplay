(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EmberWilds = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const SIZE = 2600, DAY = 180, VERSION = 1;
  const NAMES = { wood:'木材', branch:'树枝', flint:'燧石', stone:'石块', grass:'干草', berry:'浆果', meat:'生肉', cooked:'熟食', axe:'斧头', pick:'镐子', spear:'长矛', armor:'木甲', torch:'火把', campfire:'营火', shelter:'庇护所', trap:'陷阱' };
  const RECIPES = {
    axe:{ cost:{branch:3,flint:2}, title:'斧头', desc:'砍树获得木材', durability:36 },
    pick:{ cost:{branch:3,flint:3}, title:'镐子', desc:'开采岩石和燧石', durability:36 },
    campfire:{ cost:{wood:4,stone:2,grass:3}, title:'营火', desc:'照亮黑夜；靠近可烹饪' },
    torch:{ cost:{branch:2,grass:3}, title:'火把', desc:'随身照明 70 秒；可重复制作' },
    spear:{ cost:{branch:4,flint:3,grass:2}, title:'长矛', desc:'提高攻击力，保护自己', durability:50 },
    armor:{ cost:{wood:5,grass:5}, title:'木甲', desc:'吸收 65% 伤害', durability:65 },
    trap:{ cost:{branch:4,grass:4}, title:'陷阱', desc:'捕获靠近的野兔' },
    shelter:{ cost:{wood:7,grass:6,branch:3}, title:'庇护所', desc:'靠近按 E 休息，恢复精神' }
  };
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  function hash(seed) { let h=2166136261; for (const c of String(seed)) { h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0 || 1; }
  function random(s) { let a = s.rng += 0x6D2B79F5; a = Math.imul(a ^ a>>>15, a|1); a ^= a + Math.imul(a ^ a>>>7, a|61); return ((a ^ a>>>14)>>>0)/4294967296; }
  function log(s,message) { s.messages.push({text:message,time:s.time}); if(s.messages.length>7)s.messages.shift(); }
  function entity(s,type,x,y,extra={}) { const e={id:s.nextId++,type,x,y,...extra}; s.entities.push(e); return e; }
  function create(seed='windplay') {
    const s = {version:VERSION,seed:String(seed),rng:hash(seed),nextId:1,size:SIZE,time:0,day:1,phase:'day',dead:false,paused:false,
      player:{x:SIZE/2,y:SIZE/2,health:100,hunger:100,sanity:100,temperature:21,torch:0,attackCooldown:0,actionCooldown:0,darkness:0,invulnerable:0},
      inventory:{branch:0,flint:0,grass:0,wood:0,stone:0,berry:0,meat:0,cooked:0},tools:{},entities:[],messages:[],stats:{gathered:0,crafted:0,kills:0,cooked:0,nights:0},weather:'clear',weatherTimer:80,enemyTimer:145,target:null,resting:false};
    const placements = [['branch',-75,20],['branch',50,80],['branch',110,-30],['flint',20,-85],['flint',-100,-75],['flint',130,100],['grass',-140,70],['grass',-80,130],['grass',90,-130],['berry',-140,-130],['tree',220,-50],['tree',-230,0],['rock',180,160]];
    for(const [type,dx,dy] of placements) entity(s,type,SIZE/2+dx,SIZE/2+dy,{hits:type==='tree'||type==='rock'?3:1,available:true,variant:random(s)});
    for(let i=0;i<230;i++) {
      const x=80+random(s)*(SIZE-160), y=80+random(s)*(SIZE-160); if(Math.hypot(x-SIZE/2,y-SIZE/2)<300)continue;
      const r=random(s), type=r<.3?'tree':r<.43?'rock':r<.59?'grass':r<.7?'berry':r<.85?'branch':'flint';
      entity(s,type,x,y,{hits:type==='tree'||type==='rock'?3:1,available:true,variant:random(s)});
    }
    for(let i=0;i<14;i++)entity(s,'rabbit',220+random(s)*2160,220+random(s)*2160,{health:14,angle:random(s)*Math.PI*2,moveTimer:0,variant:random(s)});
    log(s,'醒来时，口袋是空的。先捡树枝和燧石，制作一把斧头。');
    return s;
  }
  function canCraft(s,key) { const r=RECIPES[key]; return !!r&&!s.dead&&Object.entries(r.cost).every(([k,v])=>(s.inventory[k]||0)>=v)&&(key==='torch'||!r.durability||!(s.tools[key]>0)); }
  function craft(s,key) {
    if(!canCraft(s,key))return false;
    const r=RECIPES[key]; for(const [k,v]of Object.entries(r.cost))s.inventory[k]-=v;
    if(r.durability)s.tools[key]=r.durability;
    else if(key==='torch')s.player.torch+=70;
    else {
      // Find a free building site around the player so stacked recipes remain interactable.
      const offset=key==='shelter'?Math.PI:key==='trap'?Math.PI*.5:0;
      let x,y;for(let i=0;i<12;i++){
        const a=offset+i*Math.PI/6,r=70+Math.floor(i/6)*50;x=clamp(s.player.x+Math.cos(a)*r,30,SIZE-30);y=clamp(s.player.y+Math.sin(a)*r,30,SIZE-30);
        if(!s.entities.some(e=>['campfire','shelter','trap'].includes(e.type)&&Math.hypot(e.x-x,e.y-y)<60))break;
      }
      entity(s,key,x,y,{fuel:key==='campfire'?100:0,caught:false,variant:random(s)});
    }
    s.stats.crafted++;log(s,`制作了${r.title}${key==='campfire'?'。用木材为营火添柴。':''}`);return true;
  }
  function light(s) {
    if(s.player.torch>0)return true;
    return s.entities.some(e=>e.type==='campfire'&&e.fuel>0&&distance(e,s.player)<180);
  }
  function nearest(s,radius=100) {
    let found=null,d=radius;
    for(const e of s.entities){if(e.available===false||e.type==='stump'||e.type==='dead')continue;const n=distance(e,s.player);if(n<d){d=n;found=e;}}
    return found;
  }
  function consumeTool(s,key,cost=1) { if(s.tools[key]>0){s.tools[key]=Math.max(0,s.tools[key]-cost);if(!s.tools[key])log(s,`${NAMES[key]}损坏了，重新制作一把。`);} }
  function damage(s,amount) {
    if(s.dead)return;
    if(s.tools.armor>0){const absorb=Math.min(s.tools.armor,amount*.65);s.tools.armor-=absorb;amount-=absorb;}
    s.player.health=Math.max(0,s.player.health-amount);
    if(s.player.health<=0){s.dead=true;s.target=null;log(s,'余烬熄灭。你留下的足迹，会成为下一次旅程的地图。');}
  }
  function attack(s,e) {
    if(!e||!['wolf','spider','rabbit'].includes(e.type)||s.dead||s.player.attackCooldown>0||distance(e,s.player)>94)return false;
    const power=s.tools.spear>0?18:s.tools.axe>0?9:4;e.health-=power;s.player.attackCooldown=.5;
    if(s.tools.spear>0)consumeTool(s,'spear');else if(s.tools.axe>0)consumeTool(s,'axe');
    if(e.health<=0){s.inventory.meat+=e.type==='wolf'?2:1;s.stats.kills++;e.type='dead';e.until=s.time+12;log(s,'获得生肉。营火旁烹饪后再吃。');}
    return true;
  }
  function interact(s,e=nearest(s)) {
    if(!e||s.dead||s.player.actionCooldown>0||distance(e,s.player)>108)return false;
    s.resting=false;
    if(['wolf','spider','rabbit'].includes(e.type))return attack(s,e);
    if(e.type==='campfire') {
      if(s.inventory.wood>0){s.inventory.wood--;e.fuel=Math.min(180,e.fuel+48);log(s,'为营火添了一块木材。');s.player.actionCooldown=.3;return true;}
      log(s,'需要木材给营火添柴。');return false;
    }
    if(e.type==='shelter') {s.resting=true;s.target=null;log(s,'坐在庇护所里休息。移动会结束休息。');return true;}
    if(e.type==='trap') {
      if(e.caught){s.inventory.meat++;e.caught=false;log(s,'收获陷阱中的野兔。');return true;}
      log(s,'陷阱已布置，等待野兔经过。');return false;
    }
    if(e.available===false)return false;
    if(e.type==='tree'||e.type==='rock') {
      const tool=e.type==='tree'?'axe':'pick';
      if(!(s.tools[tool]>0)){log(s,`需要${NAMES[tool]}。在制作栏里制作。`);return false;}
      consumeTool(s,tool);e.hits--;e.shake=s.time;s.player.actionCooldown=.36;
      if(e.hits<=0){s.inventory[e.type==='tree'?'wood':'stone']+=e.type==='tree'?4:3;if(e.type==='rock')s.inventory.flint+=2;e.type=e.type==='tree'?'stump':'rubble';e.available=false;s.stats.gathered++;log(s,tool==='axe'?'获得 4 木材。':'获得 3 石块和 2 燧石。');}
      return true;
    }
    if(['branch','flint','grass','berry'].includes(e.type)) {
      s.inventory[e.type]+=e.type==='grass'?3:e.type==='berry'?3:1;s.stats.gathered++;e.available=false;e.regrow=s.time+(e.type==='berry'?DAY*2:DAY*3);s.player.actionCooldown=.25;log(s,`采集了${NAMES[e.type]}。`);return true;
    }
    return false;
  }
  function eat(s,key) {
    if(s.dead||!['berry','meat','cooked'].includes(key)||s.inventory[key]<1)return false;
    s.inventory[key]--; const values={berry:[13,1,0],meat:[16,-5,-8],cooked:[30,12,5]}[key];
    s.player.hunger=clamp(s.player.hunger+values[0],0,100);if(values[1]<0)damage(s,-values[1]);else s.player.health=clamp(s.player.health+values[1],0,100);s.player.sanity=clamp(s.player.sanity+values[2],0,100);
    log(s,`吃了${NAMES[key]}${key==='meat'?'。生肉会损伤健康与精神。':'。'}`);return true;
  }
  function cook(s) {
    const fire=s.entities.find(e=>e.type==='campfire'&&e.fuel>0&&distance(e,s.player)<155);
    if(s.dead||!fire||s.inventory.meat+s.inventory.berry===0){log(s,'靠近燃烧的营火，带上浆果或生肉再烹饪。');return false;}
    s.inventory[s.inventory.meat>0?'meat':'berry']--;s.inventory.cooked++;s.stats.cooked++;log(s,'做好了一份热食，恢复饥饿、健康和精神。');return true;
  }
  function aim(s,x,y,id=null) {s.resting=false;s.target={x:clamp(x,25,SIZE-25),y:clamp(y,25,SIZE-25),id};}
  function phaseAt(time) {const t=time%DAY;return t<120?'day':t<150?'dusk':'night';}
  function tick(s,dt,input={}) {
    if(s.dead||s.paused)return s;
    dt=clamp(dt,0,.12);s.time+=dt;s.day=Math.floor(s.time/DAY)+1;const prev=s.phase;s.phase=phaseAt(s.time);
    if(prev!==s.phase){if(s.phase==='night')log(s,'黑夜到了。没有光，荒野会吞掉你。');if(s.phase==='dusk')log(s,'天色转暗，准备营火或火把。');if(s.phase==='day'){s.stats.nights++;log(s,`第 ${s.day} 天。你见到了新的晨光。`);}}
    const p=s.player;p.actionCooldown=Math.max(0,p.actionCooldown-dt);p.attackCooldown=Math.max(0,p.attackCooldown-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);
    let mx=Number(input.x)||0,my=Number(input.y)||0;
    if(mx||my){s.target=null;s.resting=false;}
    else if(s.target){const e=s.entities.find(e=>e.id===s.target.id),target=e&&e.available!==false&&e.type!=='dead'?e:s.target;const d=distance(target,p);
      if(d<(e?77:8)){const success=e?interact(s,e):false;if(!e||e.available===false||e.type==='dead'||(!success&&p.actionCooldown===0&&p.attackCooldown===0)||!['tree','rock','wolf','spider'].includes(e.type))s.target=null;}
      else{mx=(target.x-p.x)/d;my=(target.y-p.y)/d;}}
    const length=Math.hypot(mx,my),speed=input.sprint?215:150;
    if(length>0){p.x=clamp(p.x+mx/Math.max(1,length)*speed*dt,25,SIZE-25);p.y=clamp(p.y+my/Math.max(1,length)*speed*dt,25,SIZE-25);p.facing=Math.atan2(my,mx);p.walk=(p.walk||0)+dt*9;}else p.walk=0;
    p.hunger=clamp(p.hunger-dt*(.067+(input.sprint&&length>0?.065:0)+(s.resting?.04:0)),0,100);
    if(p.hunger===0)damage(s,dt*1.8);
    if(p.torch>0)p.torch=Math.max(0,p.torch-dt*(s.weather==='rain'?1.5:1));
    const lit=light(s);if(s.phase==='night'&&!lit){p.darkness+=dt;p.sanity=clamp(p.sanity-dt*.28,0,100);if(p.darkness>2)damage(s,dt*4);}else{p.darkness=0;p.sanity=clamp(p.sanity+dt*(lit?.045:.018),0,100);}
    s.weatherTimer-=dt;if(s.weatherTimer<=0){s.weather=s.weather==='clear'&&random(s)>.45?'rain':'clear';s.weatherTimer=65+random(s)*100;log(s,s.weather==='rain'?'雨落下来了。靠近营火保持温暖。':'雨停了，云层正在散开。');}
    const targetTemperature=s.weather==='rain'?10:s.phase==='night'?13:23;p.temperature+=(targetTemperature+(lit?10:0)-p.temperature)*dt*.04;
    if(p.temperature<13&&!lit)p.sanity=clamp(p.sanity-dt*.08,0,100);
    if(s.resting){const shelter=s.entities.find(e=>e.type==='shelter'&&distance(e,p)<115);if(!shelter)s.resting=false;else{p.sanity=clamp(p.sanity+dt*.7,0,100);if(p.hunger>20)p.health=clamp(p.health+dt*.2,0,100);}}
    for(const e of s.entities){
      if(e.type==='campfire')e.fuel=Math.max(0,e.fuel-dt*(s.weather==='rain'?1.25:.85));
      if(e.regrow&&s.time>=e.regrow){e.available=true;delete e.regrow;}
      if(e.type==='rabbit'){
        e.moveTimer-=dt;const d=distance(e,p);if(d<140)e.angle=Math.atan2(e.y-p.y,e.x-p.x);else if(e.moveTimer<=0){e.angle=random(s)*Math.PI*2;e.moveTimer=1+random(s)*3;}
        const v=d<140?115:17;e.x=clamp(e.x+Math.cos(e.angle)*dt*v,40,SIZE-40);e.y=clamp(e.y+Math.sin(e.angle)*dt*v,40,SIZE-40);
        const trap=s.entities.find(t=>t.type==='trap'&&!t.caught&&distance(t,e)<42);if(trap){trap.caught=true;e.type='dead';e.until=s.time+2;}
      }
      if(e.type==='wolf'||e.type==='spider'){
        const d=distance(e,p),fire=s.entities.find(f=>f.type==='campfire'&&f.fuel>0&&distance(f,e)<125);e.cooldown=Math.max(0,(e.cooldown||0)-dt);
        let angle=Math.atan2(p.y-e.y,p.x-e.x),v=d<450?(e.type==='wolf'?100:75):15;
        if(fire){angle=Math.atan2(e.y-fire.y,e.x-fire.x);v=90;}else if(d<48){v=0;if(e.cooldown===0){damage(s,e.type==='wolf'?11:7);e.cooldown=1.4;p.invulnerable=.3;log(s,'受到了攻击！长矛可以反击，营火可以驱赶野兽。');}}
        e.x=clamp(e.x+Math.cos(angle)*v*dt,25,SIZE-25);e.y=clamp(e.y+Math.sin(angle)*v*dt,25,SIZE-25);
        if(s.phase==='day'&&distance(e,p)>600){e.type='dead';e.until=s.time+1;}
      }
    }
    s.entities=s.entities.filter(e=>!(e.type==='dead'&&s.time>e.until));
    s.enemyTimer-=dt;if(s.enemyTimer<=0){s.enemyTimer=s.phase==='night'?18:65;const active=s.entities.filter(e=>e.type==='wolf'||e.type==='spider').length;
      if(active<7&&s.time>120){const a=random(s)*Math.PI*2;entity(s,s.day>2&&random(s)>.5?'wolf':'spider',clamp(p.x+Math.cos(a)*430,40,SIZE-40),clamp(p.y+Math.sin(a)*430,40,SIZE-40),{health:s.day>2?40:30,variant:random(s)});}}
    if(p.sanity<20)damage(s,dt*.12);
    return s;
  }
  function serialize(s){return JSON.stringify(s);}
  function restore(json){
    try{
      if(typeof json!=='string'||json.length>2000000)return null;
      const s=JSON.parse(json),bounded=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
      if(!s||s.version!==VERSION||typeof s.seed!=='string'||s.seed.length>100||!s.player||!s.inventory||!s.tools||!s.stats||!bounded(s.time,0,1e8)||!bounded(s.rng,0,Number.MAX_SAFE_INTEGER)||!bounded(s.nextId,1,1e6)||s.size!==SIZE||!['day','dusk','night'].includes(s.phase)||!['clear','rain'].includes(s.weather)||!bounded(s.day,1,1e6)||!bounded(s.weatherTimer,-1,1000)||!bounded(s.enemyTimer,-1,1000)||typeof s.dead!=='boolean')return null;
      const p=s.player;
      if(!bounded(p.x,0,SIZE)||!bounded(p.y,0,SIZE)||!['health','hunger','sanity'].every(k=>bounded(p[k],0,100))||!bounded(p.temperature,-100,100)||!['torch','attackCooldown','actionCooldown','darkness','invulnerable'].every(k=>bounded(p[k],0,1e6)))return null;
      if(!['wood','branch','flint','stone','grass','berry','meat','cooked'].every(k=>bounded(s.inventory[k],0,1e6)))return null;
      if(!Object.entries(s.tools).every(([k,v])=>RECIPES[k]&&RECIPES[k].durability&&bounded(v,0,1000)))return null;
      if(!['gathered','crafted','kills','cooked','nights'].every(k=>bounded(s.stats[k],0,1e6)))return null;
      const types=['tree','rock','grass','berry','branch','flint','rabbit','wolf','spider','campfire','shelter','trap','stump','rubble','dead'];
      if(!Array.isArray(s.entities)||s.entities.length>1000||!s.entities.every(e=>e&&types.includes(e.type)&&bounded(e.id,1,1e6)&&bounded(e.x,0,SIZE)&&bounded(e.y,0,SIZE)&&(!['rabbit','wolf','spider'].includes(e.type)||bounded(e.health,0,100))&&(e.type!=='campfire'||bounded(e.fuel,0,180))&&(e.type!=='rabbit'||bounded(e.angle,-100,100)&&bounded(e.moveTimer,-1,100))&&(!['tree','rock'].includes(e.type)||bounded(e.hits,1,3))&&(e.type!=='dead'||bounded(e.until,0,1e8))))return null;
      if(!Array.isArray(s.messages)||s.messages.length>7||!s.messages.every(m=>m&&typeof m.text==='string'&&m.text.length<1000&&bounded(m.time,0,1e8)))return null;
      s.paused=false;s.target=null;s.resting=false;s.dead=s.dead||p.health===0;return s;
    }catch{return null;}
  }
  function objectives(s) {return [{label:'采集树枝与燧石，制作斧头',done:(s.tools.axe||0)>0||s.stats.crafted>0},{label:'采木、采石，点燃第一座营火',done:s.entities.some(e=>e.type==='campfire')},{label:'在营火边做一份熟食',done:s.stats.cooked>0},{label:'看见第三天的晨光',done:s.day>=3}];}
  function actionLabel(s,e){if(!e)return'靠近资源，按 E 采集';if(['spider','wolf','rabbit'].includes(e.type))return`攻击${{spider:'影蛛',wolf:'荒狼',rabbit:'野兔'}[e.type]}`;if(e.type==='tree')return'用斧头砍树';if(e.type==='rock')return'用镐子采石';if(e.type==='campfire')return'木材添柴';if(e.type==='shelter')return'在庇护所休息';if(e.type==='trap')return e.caught?'收获陷阱':'查看陷阱';return`采集${NAMES[e.type]||'资源'}`;}
  return {SIZE,DAY,VERSION,NAMES,RECIPES,create,random,tick,canCraft,craft,interact,attack,eat,cook,light,nearest,aim,phaseAt,serialize,restore,objectives,actionLabel,distance};
});
