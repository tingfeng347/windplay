(function(root){
  'use strict';
  const WIDTH=49,HEIGHT=29,FLOORS=5;
  const FLOOR_NAMES=['苔石入口','遗忘水道','灰烬藏书室','无声陵寝','守火者的王座'];
  const ROLES={warden:{name:'守灯人',hp:38,attack:7,defense:2,potions:3,description:'可靠的护甲与充足补给，适合初次下潜。'},scout:{name:'寻路者',hp:29,attack:9,defense:1,potions:2,description:'更远的视野与更锋利的匕首。'},scholar:{name:'烛火学者',hp:31,attack:6,defense:1,potions:3,description:'每层两次震荡，擅长应对成群敌人。'}};
  const BESTIARY=[{name:'穴鼠',char:'r',hp:9,attack:3,xp:4,color:'#b5bf94'},{name:'骸骨哨兵',char:'s',hp:17,attack:5,xp:8,color:'#e8ddc4'},{name:'灰烬幽灵',char:'w',hp:13,attack:6,xp:9,color:'#98bdc4'}];
  const pos=(x,y)=>y*WIDTH+x;
  function rng(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^(t>>>15),1|t);r^=r+Math.imul(r^(r>>>7),61|r);return((r^(r>>>14))>>>0)/4294967296;};}
  function hash(text){let n=2166136261;for(const c of String(text)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
  function generate(seed,floor){
    const random=rng((seed+floor*7919)>>>0),tiles=Array(WIDTH*HEIGHT).fill('#'),rooms=[];
    // Nine jittered rooms and a connected corridor tree; optional loops offer detours.
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
      const w=8+Math.floor(random()*4),h=5+Math.floor(random()*2);
      const x=2+col*16+Math.floor(random()*2),y=2+row*9+Math.floor(random()*2);
      const room={x,y,w:Math.min(w,WIDTH-x-2),h:Math.min(h,HEIGHT-y-2)};room.cx=x+Math.floor(room.w/2);room.cy=y+Math.floor(room.h/2);rooms.push(room);
      for(let yy=y;yy<y+room.h;yy++)for(let xx=x;xx<x+room.w;xx++)tiles[pos(xx,yy)]='.';
    }
    function corridor(a,b){let x=a.cx,y=a.cy;while(x!==b.cx){tiles[pos(x,y)]='.';x+=Math.sign(b.cx-x);}while(y!==b.cy){tiles[pos(x,y)]='.';y+=Math.sign(b.cy-y);}tiles[pos(x,y)]='.';}
    for(let i=1;i<rooms.length;i++)corridor(rooms[i],rooms[i%3===0?i-3:i-1]);
    corridor(rooms[1],rooms[4]);corridor(rooms[4],rooms[7]);
    const start={x:rooms[0].cx,y:rooms[0].cy},exit={x:rooms[8].cx,y:rooms[8].cy};
    const occupied=new Set([pos(start.x,start.y),pos(exit.x,exit.y)]),items=[],enemies=[];
    if(floor===FLOORS)occupied.add(pos(exit.x,exit.y-1));
    function spot(room){for(let tries=0;tries<100;tries++){const x=room.x+Math.floor(random()*room.w),y=room.y+Math.floor(random()*room.h),p=pos(x,y);if(!occupied.has(p)){occupied.add(p);return {x,y};}}throw new Error('Room has no free tile');}
    function item(type,room,extra={}){items.push({type,...spot(room),...extra});}
    item('potion',rooms[0]);item('gold',rooms[0],{amount:8});
    for(let i=1;i<9;i++){
      item('gold',rooms[i],{amount:7+floor*3+Math.floor(random()*9)});
      if(i%2===0)item('potion',rooms[i]);
      if(i===2)item('weapon',rooms[i],{power:7+floor*2,name:['','旅人的短剑','水纹长刀','刻字战斧','守墓长剑','白焰之刃'][floor]});
      if(i===6)item('armor',rooms[i],{power:2+floor,name:'第 '+floor+' 层护甲'});
      const count=i===8&&floor===FLOORS?0:1+(i===5||i===7?1:0);
      for(let j=0;j<count;j++){
        const type=BESTIARY[Math.min(2,Math.floor(random()*(1+floor/2)))];
        enemies.push({...type,...spot(rooms[i]),id:enemies.length,hp:type.hp+floor*2,maxHp:type.hp+floor*2,attack:type.attack+floor-1,boss:false,awake:false});
      }
      if(i===3||i===7)item('trap',rooms[i]);
    }
    item('key',rooms[6]);item('shrine',rooms[3]);item('merchant',rooms[4]);item('lore',rooms[5]);
    if(floor===FLOORS)enemies.push({x:exit.x,y:exit.y-1,id:enemies.length,name:'失落的守火者',char:'W',hp:62,maxHp:62,attack:11,xp:45,color:'#ef966b',boss:true,awake:false});
    tiles[pos(exit.x,exit.y)]='>';
    return {tiles,rooms,start,exit,items,enemies};
  }
  function log(s,text){s.log.unshift(text);s.log=s.log.slice(0,40);}
  function newGame(seedText='LANTERN',role='warden'){
    if(!ROLES[role])role='warden';const stats=ROLES[role],seed=hash(seedText);
    const s={version:1,seed,seedText:String(seedText).slice(0,32),role,floor:1,turn:0,status:'playing',gold:0,kills:0,relics:0,log:[],seen:[],visible:[],player:{x:0,y:0,hp:stats.hp,maxHp:stats.hp,attack:stats.attack,defense:stats.defense,potions:stats.potions,level:1,xp:0,key:false,charges:role==='scholar'?2:1,weapon:'旧旅剑',armor:'旅行外衣'},shop:null};
    enterFloor(s);log(s,'提起灯，走入苔石入口。找到钥匙 k 与下行阶梯 >。');return s;
  }
  function enterFloor(s){
    const map=generate(s.seed,s.floor);Object.assign(s,map);s.player.x=map.start.x;s.player.y=map.start.y;s.player.key=false;s.player.charges=s.role==='scholar'?2:1;s.seen=Array(WIDTH*HEIGHT).fill(false);s.shop=null;reveal(s);
  }
  function walkable(s,x,y){return x>=0&&x<WIDTH&&y>=0&&y<HEIGHT&&s.tiles[pos(x,y)]!=='#';}
  function lineVisible(s,x0,y0,x1,y1){let dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx+dy;
    for(let steps=0;steps<100;steps++){if(x0===x1&&y0===y1)return true;if(steps>0&&s.tiles[pos(x0,y0)]==='#')return false;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}return false;}
  function reveal(s){const radius=s.role==='scout'?8:6;s.visible=Array(WIDTH*HEIGHT).fill(false);
    for(let y=Math.max(0,s.player.y-radius);y<=Math.min(HEIGHT-1,s.player.y+radius);y++)for(let x=Math.max(0,s.player.x-radius);x<=Math.min(WIDTH-1,s.player.x+radius);x++)if(Math.hypot(x-s.player.x,y-s.player.y)<=radius&&lineVisible(s,s.player.x,s.player.y,x,y)){s.visible[pos(x,y)]=true;s.seen[pos(x,y)]=true;}}
  function defeat(s,e){s.kills++;s.player.xp+=e.xp;s.gold+=e.boss?50:3+s.floor;log(s,'击败'+e.name+'，获得 '+e.xp+' 经验。');
    while(s.player.xp>=s.player.level*18){s.player.xp-=s.player.level*18;s.player.level++;s.player.maxHp+=5;s.player.hp=Math.min(s.player.maxHp,s.player.hp+12);s.player.attack+=1;log(s,'升至 '+s.player.level+' 级：生命上限 +5，攻击 +1，恢复生命。');}
    s.enemies=s.enemies.filter(enemy=>enemy.hp>0);
  }
  function enemyTurn(s){
    const p=s.player;
    // A distance field prevents monsters getting stuck in corners when chasing the lantern.
    const distances=new Map([[pos(p.x,p.y),0]]),queue=[[p.x,p.y]];
    for(let i=0;i<queue.length;i++){const [x,y]=queue[i],d=distances.get(pos(x,y));if(d>=14)continue;for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=pos(nx,ny);if(walkable(s,nx,ny)&&!distances.has(k)){distances.set(k,d+1);queue.push([nx,ny]);}}}
    for(const e of s.enemies){
      if(s.visible[pos(e.x,e.y)])e.awake=true;if(!e.awake)continue;
      const distance=Math.abs(e.x-p.x)+Math.abs(e.y-p.y);
      if(distance===1){
        if(e.boss&&s.turn%3===0){log(s,'守火者举起巨刃。下一击更加猛烈。');e.charged=true;continue;}
        const damage=Math.max(1,e.attack-p.defense)+(e.charged?4:0);e.charged=false;p.hp=Math.max(0,p.hp-damage);log(s,e.name+' 击中你，生命 -'+damage+'。');
        if(p.hp===0){s.status='dead';log(s,'灯火熄灭。你的足迹仍留在石墙之间。');break;}
      }else{
        const candidates=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:e.x+dx,y:e.y+dy})).filter(n=>walkable(s,n.x,n.y)&&!(n.x===p.x&&n.y===p.y)&&!s.enemies.some(other=>other!==e&&other.x===n.x&&other.y===n.y));
        candidates.sort((a,b)=>(distances.get(pos(a.x,a.y))??999)-(distances.get(pos(b.x,b.y))??999));
        const n=candidates[0];if(n&&(distances.get(pos(n.x,n.y))??999)<(distances.get(pos(e.x,e.y))??999)){e.x=n.x;e.y=n.y;}
      }
    }
  }
  function pickup(s){const p=s.player;const found=s.items.find(i=>i.x===p.x&&i.y===p.y);if(!found)return;
    let consume=true;
    switch(found.type){
      case 'gold':s.gold+=found.amount;log(s,'拾起 '+found.amount+' 枚旧金币。');break;
      case 'potion':p.potions++;log(s,'收起一瓶药水。按 H 恢复生命。');break;
      case 'key':p.key=true;log(s,'找到这一层的铜钥匙。可以前往阶梯 >。');break;
      case 'weapon':p.attack=Math.max(p.attack,found.power+p.level-1);p.weapon=found.name;log(s,'装备 '+found.name+'，攻击 '+p.attack+'。');break;
      case 'armor':p.defense=Math.max(p.defense,found.power);p.armor=found.name;log(s,'穿上 '+found.name+'，防御 '+p.defense+'。');break;
      case 'trap':p.hp=Math.max(1,p.hp-(3+s.floor));log(s,'踏上陷阱，生命降至 '+p.hp+'。陷阱不会直接致死。');break;
      case 'shrine':p.hp=p.maxHp;s.relics++;log(s,'古老泉眼让你恢复全部生命。发现一处遗迹。');break;
      case 'lore':s.relics++;log(s,['','墙上刻着：钥匙总在西南的房间。','旧纸页：在商人 & 身旁可购买补给。','石碑：震荡 F 会同时击中身边的敌人。','旅人笔记：守火者蓄力时，退后一步。','最后的碑文：带回火种，让黑暗止步于此。'][s.floor]);break;
      case 'merchant':consume=false;log(s,'抵达行脚商人的摊位。按 E 交易。');break;
    }
    if(consume)s.items=s.items.filter(i=>i!==found);
  }
  function nearbyMerchant(s){return s.items.some(i=>i.type==='merchant'&&Math.abs(i.x-s.player.x)+Math.abs(i.y-s.player.y)<=1);}
  function step(s,action){
    if(s.status!=='playing')return false;
    const p=s.player;let spent=false;s.shop=null;
    if(action.type==='move'){
      const {dx,dy}=action;if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return false;
      const x=p.x+dx,y=p.y+dy;if(!walkable(s,x,y))return false;
      const enemy=s.enemies.find(e=>e.x===x&&e.y===y);
      if(enemy){const damage=Math.max(1,p.attack);enemy.hp-=damage;enemy.awake=true;log(s,'攻击 '+enemy.name+'，造成 '+damage+' 点伤害。');if(enemy.hp<=0)defeat(s,enemy);}
      else{p.x=x;p.y=y;pickup(s);}spent=true;
    }else if(action.type==='wait'){spent=true;log(s,'你倾听了一回合黑暗。');}
    else if(action.type==='heal'){
      if(p.potions<=0){log(s,'没有药水了。寻找 ! 或拜访商人。');return false;}
      if(p.hp===p.maxHp){log(s,'生命已满，留着药水吧。');return false;}
      p.potions--;p.hp=Math.min(p.maxHp,p.hp+20);log(s,'喝下药水，恢复至 '+p.hp+' 生命。');spent=true;
    }else if(action.type==='pulse'){
      if(p.charges<=0){log(s,'本层的震荡已用尽。下层会恢复。');return false;}
      const targets=s.enemies.filter(e=>Math.abs(e.x-p.x)+Math.abs(e.y-p.y)<=2&&lineVisible(s,p.x,p.y,e.x,e.y));
      if(!targets.length){log(s,'两格内没有敌人，保留震荡。');return false;}
      p.charges--;for(const e of targets){e.hp-=p.attack+6;if(e.hp<=0)defeat(s,e);}log(s,'灯焰震荡扫过周围的敌人。');spent=true;
    }else if(action.type==='interact'){
      if(p.x===s.exit.x&&p.y===s.exit.y){
        if(!p.key){log(s,'阶梯封印需要本层的铜钥匙 k。');return false;}
        if(s.floor===FLOORS){if(s.enemies.some(e=>e.boss)){log(s,'守火者仍在。击败 W 才能取回火种。');return false;}s.status='won';s.turn++;log(s,'你带回了不灭的火种。地牢之外，天正在亮。');return true;}
        s.floor++;p.hp=Math.min(p.maxHp,p.hp+8);enterFloor(s);s.turn++;log(s,'下潜至 '+FLOOR_NAMES[s.floor-1]+'，恢复 8 生命，震荡已补满。');return true;
      }
      if(nearbyMerchant(s)){s.shop='open';log(s,'商人：药水 15 金币，磨剑 30 金币，加固护甲 25 金币。');return true;}
      log(s,'站在阶梯 > 上下潜，或在商人 & 身旁交易。');return false;
    }else if(action.type==='buy'){
      if(!nearbyMerchant(s))return false;
      const prices={potion:15,attack:30,defense:25},price=prices[action.item];if(!price)return false;
      s.shop='open';if(s.gold<price){log(s,'金币不足，继续探索房间吧。');return false;}
      s.gold-=price;if(action.item==='potion')p.potions++;else p[action.item]++;log(s,'交易完成。');return true;
    }else return false;
    if(spent){s.turn++;reveal(s);enemyTurn(s);reveal(s);}return spent;
  }
  function serialize(s){const data={...s};delete data.visible;delete data.rooms;return JSON.stringify(data);}
  function restore(raw){
    try{const s=JSON.parse(raw),p=s?.player,integer=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
      if(s?.version!==1||!ROLES[s.role]||!integer(s.seed,0,4294967295)||!integer(s.floor,1,FLOORS)||!['playing','dead','won'].includes(s.status)||!p)return null;
      if(!Array.isArray(s.tiles)||s.tiles.length!==WIDTH*HEIGHT||!s.tiles.every(t=>['#','.','>'].includes(t)))return null;
      if(!integer(p.x,0,WIDTH-1)||!integer(p.y,0,HEIGHT-1)||!walkable(s,p.x,p.y)||!integer(p.maxHp,1,10000)||!integer(p.hp,0,p.maxHp))return null;
      for(const field of ['attack','defense','potions','level','xp','charges'])if(!integer(p[field],0,10000))return null;
      for(const field of ['turn','gold','kills','relics'])if(!integer(s[field],0,10000000))return null;
      if(typeof s.seedText!=='string'||s.seedText.length>32||typeof p.weapon!=='string'||typeof p.armor!=='string'||typeof p.key!=='boolean')return null;
      if(!s.exit||!integer(s.exit.x,0,WIDTH-1)||!integer(s.exit.y,0,HEIGHT-1)||s.tiles[pos(s.exit.x,s.exit.y)]!=='>')return null;
      if(!Array.isArray(s.seen)||s.seen.length!==WIDTH*HEIGHT||!s.seen.every(b=>typeof b==='boolean')||!Array.isArray(s.enemies)||s.enemies.length>50||!Array.isArray(s.items)||s.items.length>100)return null;
      for(const e of s.enemies)if(!e||!walkable(s,e.x,e.y)||!integer(e.x,0,WIDTH-1)||!integer(e.y,0,HEIGHT-1)||!integer(e.hp,1,10000)||!integer(e.maxHp,e.hp,10000)||!integer(e.attack,1,100)||!integer(e.xp,0,100)||typeof e.name!=='string'||typeof e.char!=='string'||e.char.length!==1||typeof e.boss!=='boolean')return null;
      for(const i of s.items){if(!i||!integer(i.x,0,WIDTH-1)||!integer(i.y,0,HEIGHT-1)||!walkable(s,i.x,i.y)||!['gold','potion','key','weapon','armor','trap','shrine','merchant','lore'].includes(i.type))return null;if(i.type==='gold'&&!integer(i.amount,0,1000))return null;if(['weapon','armor'].includes(i.type)&&(!integer(i.power,1,100)||typeof i.name!=='string'))return null;}
      if(!Array.isArray(s.log)||!s.log.every(t=>typeof t==='string'))return null;
      s.log=s.log.slice(0,40);s.shop=null;reveal(s);return s;
    }catch(_){return null;}
  }
  const api={WIDTH,HEIGHT,FLOORS,FLOOR_NAMES,ROLES,BESTIARY,pos,rng,hash,generate,newGame,step,walkable,reveal,lineVisible,nearbyMerchant,serialize,restore};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DelveCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
