(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MetroEngine=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const SEGMENT=48,LANE=3.2,VERSION=1;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const MISSION_DEFS=[{key:'distance',target:500,title:'跑过 500 米'},{key:'coins',target:30,title:'收集 30 枚金币'},{key:'jumps',target:10,title:'完成 10 次跳跃'},{key:'slides',target:5,title:'完成 5 次滑铲'}];
  function hash(v){let h=2166136261;for(const c of String(v)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function rng(seed){let n=hash(seed);return()=>{n+=0x6D2B79F5;let a=n;a=Math.imul(a^a>>>15,a|1);a^=a+Math.imul(a^a>>>7,a|61);return((a^a>>>14)>>>0)/4294967296;};}
  function segment(seed,index){
    const rand=rng(`${seed}:${index}`),start=index*SEGMENT,objects=[],district=Math.floor(index/8)%3;
    const add=(type,lane,d,length=1,height=0)=>{objects.push({id:`${index}:${objects.length}`,type,lane,d:start+d,length,height});};
    const coins=(lane,d,count=5,height=1)=>{for(let i=0;i<count;i++)add('coin',lane,d+i*2.7,1,height);};
    if(index===0){coins(0,10,10);coins(-1,24,5);}
    else{
      const safe=Math.floor(rand()*3)-1,pattern=index===1?0:Math.floor(rand()*5);
      if(pattern===0){add('barrier',safe,12,1.5,1.05);coins(safe,7,7);if(index>2)add('beam',(safe+2)%3-1,34,1.4,2.4);}
      else if(pattern===1){add('beam',safe,12,1.6,2.4);coins(safe,5,9);add('barrier',safe===1?-1:1,34,1.5,1.05);}
      else if(pattern===2){add('train',safe===0?-1:0,10,29,2.75);add('barrier',safe===0?1:-safe,31,1.5,1.05);coins(safe,8,12);}
      else if(pattern===3){add('ramp',safe,6,12,2.75);add('train',safe,18,25,2.75);coins(safe,13,11,3.7);coins(safe===1?0:1,19,5);}
      else{add('train',safe===-1?0:-1,11,30,2.75);add('train',safe===1?0:1,14,26,2.75);coins(safe,5,13);}
      if(index%6===3)add(['magnet','boots','double','shield'][Math.floor(rand()*4)],safe,29,1,pattern===3?3.9:1.2);
    }
    return{index,start,district,objects,variant:rand(),buildings:Array.from({length:4},(_,i)=>({side:i%2?-1:1,height:5+rand()*17,width:4+rand()*5,offset:rand()*9,hue:rand()}))};
  }
  function create(seed='city-01'){
    const s={version:VERSION,seed:String(seed).slice(0,80),status:'ready',time:0,distance:0,speed:14,score:0,points:0,coins:0,lane:0,x:0,y:0,vy:0,slide:0,ground:0,board:0,boards:2,magnet:0,boots:0,double:0,invulnerable:0,jumps:0,slides:0,nearMisses:0,combo:0,bestCombo:0,segments:[],collected:[],missions:MISSION_DEFS.map(m=>({...m,done:false})),events:[],death:null,landed:false};
    ensure(s);return s;
  }
  function ensure(s){const min=Math.max(0,Math.floor((s.distance-65)/SEGMENT)),max=Math.floor((s.distance+285)/SEGMENT);s.segments=s.segments.filter(x=>x.index>=min);const have=new Set(s.segments.map(x=>x.index));for(let i=min;i<=max;i++)if(!have.has(i))s.segments.push(segment(s.seed,i));s.segments.sort((a,b)=>a.index-b.index);const live=new Set(s.segments.flatMap(x=>x.objects.map(o=>o.id)));s.collected=s.collected.filter(id=>live.has(id)||live.has(id.replace(/:passed$/,'')));}
  function event(s,type,text){s.events.push({type,text,time:s.time});if(s.events.length>10)s.events.shift();}
  function move(s,delta){if(s.status!=='running')return false;const old=s.lane;s.lane=clamp(s.lane+Math.sign(delta),-1,1);if(old!==s.lane){event(s,'lane','');return true;}return false;}
  function jump(s){if(s.status!=='running'||s.y>s.ground+.12)return false;s.slide=0;s.vy=s.boots>0?11.6:9.2;s.jumps++;event(s,'jump','');return true;}
  function slide(s){if(s.status!=='running')return false;s.slide=.82;if(s.y>s.ground+.2)s.vy=-16;else s.slides++;event(s,'slide','');return true;}
  function board(s){if(s.status!=='running'||s.board>0||s.boards<=0)return false;s.boards--;s.board=12;event(s,'board','悬浮板启动 · 可抵挡一次碰撞');return true;}
  function overlapping(s,o){const radius=o.type==='train'?1.48:1.34;return Math.abs(s.x-o.lane*LANE)<radius&&s.distance>=o.d-.65&&s.distance<=o.d+o.length+.65;}
  function groundAt(s){let h=0;for(const seg of s.segments)for(const o of seg.objects){if(Math.abs(s.x-o.lane*LANE)>.98||s.distance<o.d||s.distance>o.d+o.length)continue;if(o.type==='ramp')h=Math.max(h,clamp((s.distance-o.d)/o.length,0,1)*o.height);if(o.type==='train'&&s.y>=o.height-.35)h=Math.max(h,o.height);}return h;}
  function obstacleHit(s,o){if(!overlapping(s,o)||s.invulnerable>0)return false;const feet=s.y,head=s.y+(s.slide>0?.72:1.75);if(o.type==='barrier')return feet<o.height-.08;if(o.type==='beam')return feet<2.4&&head>1.15;if(o.type==='train')return feet<o.height-.28;return false;}
  function crash(s,o){
    if(s.board>0){s.board=0;s.invulnerable=1.7;s.combo=0;s.collected.push(o.id);event(s,'shield','悬浮板挡住了撞击！继续跑。');return;}
    s.status='dead';s.death={type:o.type,distance:Math.floor(s.distance)};s.combo=0;event(s,'crash',{train:'撞上了列车，试着换道或从坡道登顶。',barrier:'绊到了路障，提前跳跃或换道。',beam:'撞到了横梁，下滑穿过或换道。'}[o.type]);
  }
  function tick(s,dt){
    if(s.status!=='running')return s;dt=clamp(dt,0,.05);s.time+=dt;s.speed=Math.min(29,14+s.distance/480);s.distance+=s.speed*dt;s.points+=s.speed*dt*(s.double>0?2:1);s.x+=(s.lane*LANE-s.x)*Math.min(1,dt*15);
    for(const k of ['slide','board','magnet','boots','double','invulnerable'])s[k]=Math.max(0,s[k]-dt);
    const oldGround=s.ground;s.ground=groundAt(s);s.landed=false;if(s.ground>oldGround&&s.y<=oldGround+.15&&s.vy<=0)s.y=s.ground;
    s.vy-=23*dt;s.y+=s.vy*dt;if(s.y<=s.ground){s.landed=s.vy<-3;s.y=s.ground;s.vy=0;}
    const used=new Set(s.collected);
    for(const seg of s.segments)for(const o of seg.objects){
      if(used.has(o.id))continue;
      if(['coin','magnet','boots','double','shield'].includes(o.type)){
        const dz=o.d-s.distance,dx=o.lane*LANE-s.x,dy=o.height-(s.y+.9),reach=o.type==='coin'&&s.magnet>0?5.7:1.05;
        if(Math.abs(dz)<reach&&Math.hypot(dx,dy)<reach){used.add(o.id);s.collected.push(o.id);if(o.type==='coin'){s.coins++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);event(s,'coin','');}else{s[o.type==='shield'?'board':o.type]=o.type==='boots'?12:10;event(s,'power',{magnet:'磁力开启 · 金币自动吸附',boots:'弹跳鞋 · 跳得更高',double:'双倍积分 · 加速得分',shield:'悬浮板护盾 · 抵挡一次撞击'}[o.type]);}}
      }else if(obstacleHit(s,o)){crash(s,o);if(s.status==='dead')break;}
      else if(s.distance>o.d+o.length+1&&s.distance<o.d+o.length+2&&['barrier','beam'].includes(o.type)&&Math.abs(s.x-o.lane*LANE)<1.05&&!used.has(`${o.id}:passed`)){s.nearMisses++;s.collected.push(`${o.id}:passed`);}
    }
    for(const m of s.missions)if(!m.done&&s[m.key]>=m.target){m.done=true;event(s,'mission',`挑战完成：${m.title} +500 分`);}
    s.score=Math.floor(s.points+s.coins*12+s.missions.filter(m=>m.done).length*500);
    ensure(s);return s;
  }
  function profile(){return{version:VERSION,best:0,wallet:0,runs:0,totalDistance:0,skins:['courier'],skin:'courier',settings:{sound:true,quality:'high',motion:true}};}
  const SKINS=[{id:'courier',name:'晨光信使',price:0,jacket:'#20aaa2',pants:'#273c60',accent:'#f08062'},{id:'sunset',name:'落日漫游',price:150,jacket:'#ed8f55',pants:'#334e63',accent:'#f5d079'},{id:'midnight',name:'午夜电波',price:350,jacket:'#7c83bf',pants:'#243a51',accent:'#d6e683'}];
  function finish(p,s){const next=JSON.parse(JSON.stringify(p));next.best=Math.max(next.best,s.score);next.wallet+=s.coins+s.missions.filter(m=>m.done).length*20;next.runs++;next.totalDistance+=Math.floor(s.distance);return next;}
  function unlock(p,id){const skin=SKINS.find(x=>x.id===id);if(!skin)return false;if(p.skins.includes(id)){p.skin=id;return true;}if(p.wallet<skin.price)return false;p.wallet-=skin.price;p.skins.push(id);p.skin=id;return true;}
  function restoreProfile(json){try{if(typeof json!=='string'||json.length>20000)return null;const p=JSON.parse(json);if(p.version!==VERSION||!['best','wallet','runs','totalDistance'].every(k=>Number.isSafeInteger(p[k])&&p[k]>=0&&p[k]<1e12)||!Array.isArray(p.skins)||p.skins.length>3||!p.skins.includes('courier')||!p.skins.every(id=>SKINS.some(s=>s.id===id))||!p.skins.includes(p.skin)||!p.settings||typeof p.settings.sound!=='boolean'||typeof p.settings.motion!=='boolean'||!['high','low'].includes(p.settings.quality))return null;return p;}catch{return null;}}
  return{VERSION,SEGMENT,LANE,MISSION_DEFS,SKINS,create,segment,ensure,move,jump,slide,board,tick,groundAt,obstacleHit,profile,finish,unlock,restoreProfile,hash};
});
