(function (root) {
  'use strict';
  const BLOCKS = Object.freeze({
    0: { name:'空气', solid:false, tile:0 },
    1: { name:'草方块', solid:true, tile:0, top:1, bottom:2, hardness:0.55, drop:2 },
    2: { name:'泥土', solid:true, tile:2, hardness:0.45 },
    3: { name:'石头', solid:true, tile:3, hardness:1.7, needsPick:true },
    4: { name:'原木', solid:true, tile:4, top:5, hardness:1.0 },
    5: { name:'树叶', solid:true, tile:6, hardness:0.22 },
    6: { name:'沙子', solid:true, tile:7, hardness:0.4 },
    7: { name:'玻璃', solid:true, tile:8, hardness:0.25 },
    8: { name:'石砖', solid:true, tile:9, hardness:1.5, needsPick:true },
    9: { name:'木板', solid:true, tile:10, hardness:0.7 },
    10: { name:'水', solid:false, tile:11, hardness:0.1 },
    11: { name:'煤矿', solid:true, tile:12, hardness:2.1, needsPick:true, drop:30 },
    12: { name:'铁矿', solid:true, tile:13, hardness:2.5, needsPick:true, drop:31 },
    13: { name:'野花', solid:false, tile:14, hardness:0.08, drop:25 },
    14: { name:'灯石', solid:true, tile:15, hardness:0.2 },
    15: { name:'基岩', solid:true, tile:16, hardness:Infinity }
  });
  const ITEMS = Object.freeze({
    ...BLOCKS,
    20: { name:'木棍', icon:'╱', description:'合成工具的材料' },
    21: { name:'木镐', icon:'⛏', tool:'pick', speed:2.6, durability:70 },
    22: { name:'石镐', icon:'⛏', tool:'pick', speed:5, durability:160 },
    23: { name:'石斧', icon:'🪓', tool:'axe', speed:4, durability:130 },
    24: { name:'石剑', icon:'⚔', tool:'sword', damage:7, durability:120 },
    25: { name:'浆果', icon:'●', food:4, description:'右键或 R 食用，恢复 4 点饱食度' },
    26: { name:'烤浆果', icon:'◉', food:8, description:'右键或 R 食用，恢复 8 点饱食度' },
    30: { name:'煤', icon:'◆', description:'灯石与烹饪材料' },
    31: { name:'铁锭', icon:'▰', description:'用于合成耐用的铁镐' },
    32: { name:'铁镐', icon:'⛏', tool:'pick', speed:8, durability:320 }
  });
  const RECIPES = Object.freeze([
    { id:'planks', name:'锯开原木', input:{4:1}, output:{9:4} },
    { id:'sticks', name:'制作木棍', input:{9:2}, output:{20:4} },
    { id:'wood-pick', name:'木镐', input:{9:3,20:2}, output:{21:1} },
    { id:'stone-pick', name:'石镐', input:{3:3,20:2}, output:{22:1} },
    { id:'axe', name:'石斧', input:{3:3,20:2}, output:{23:1} },
    { id:'sword', name:'石剑', input:{3:2,20:1}, output:{24:1} },
    { id:'bricks', name:'石砖', input:{3:4}, output:{8:4} },
    { id:'glass', name:'烧制玻璃', input:{6:3,30:1}, output:{7:3} },
    { id:'lamp', name:'发光灯石', input:{3:1,30:1}, output:{14:4} },
    { id:'food', name:'烤浆果', input:{25:3,30:1}, output:{26:3} },
    { id:'iron-pick', name:'铁镐', input:{31:3,20:2}, output:{32:1} }
  ]);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  function seedHash(value) {
    let h = 2166136261;
    for (const c of String(value)) { h ^= c.charCodeAt(0); h = Math.imul(h,16777619); }
    return h >>> 0;
  }
  function hash(x,z,seed,y=0) {
    let h = Math.imul(x+127,374761393) ^ Math.imul(z+331,668265263) ^ Math.imul(y+93,1442695041) ^ seed;
    h = Math.imul(h ^ h>>>13,1274126177); return ((h ^ h>>>16)>>>0)/4294967295;
  }
  function noise(x,z,seed,scale) {
    const xx = x/scale, zz=z/scale, ix=Math.floor(xx), iz=Math.floor(zz);
    const u=xx-ix,v=zz-iz, sx=u*u*(3-2*u), sz=v*v*(3-2*v);
    const a=hash(ix,iz,seed), b=hash(ix+1,iz,seed), c=hash(ix,iz+1,seed), d=hash(ix+1,iz+1,seed);
    return (a+(b-a)*sx)*(1-sz)+(c+(d-c)*sx)*sz;
  }
  class World {
    constructor(seed='windplay', width=80, depth=80, height=48) {
      this.seed=String(seed).slice(0,64); this.seedValue=seedHash(this.seed);
      this.width=width;this.depth=depth;this.height=height;this.chunkSize=16;this.seaLevel=13;
      this.data=new Uint8Array(width*depth*height);this.edits=new Map();this.dirty=new Set();
      this.generate();
    }
    index(x,y,z) { return (y*this.depth+z)*this.width+x; }
    inside(x,y,z) { return x>=0&&x<this.width&&z>=0&&z<this.depth&&y>=0&&y<this.height; }
    get(x,y,z) {
      if(y>=this.height) return 0;
      if(!this.inside(x,y,z)) return 15;
      return this.data[this.index(x,y,z)];
    }
    rawSet(x,y,z,id) { if(this.inside(x,y,z)) this.data[this.index(x,y,z)]=id; }
    set(x,y,z,id) {
      if(!this.inside(x,y,z)||!BLOCKS[id]||y===0) return false;
      const i=this.index(x,y,z); if(this.data[i]===id) return false;
      this.data[i]=id;this.edits.set(i,id);
      for(const [dx,dz] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]) {
        const cx=Math.floor((x+dx)/16),cz=Math.floor((z+dz)/16);
        if(cx>=0&&cz>=0&&cx<Math.ceil(this.width/16)&&cz<Math.ceil(this.depth/16)) this.dirty.add(`${cx},${cz}`);
      }
      return true;
    }
    solid(x,y,z) { return BLOCKS[this.get(x,y,z)].solid; }
    surface(x,z) { for(let y=this.height-1;y>=0;y--) { const id=this.get(x,y,z);if(id&&id!==10&&id!==13&&id!==5&&id!==4) return y+1; } return 1; }
    terrainHeight(x,z) {
      const a=noise(x,z,this.seedValue,22),b=noise(x,z,this.seedValue^907,8);
      const center=Math.hypot(x-this.width/2,z-this.depth/2);
      const blend=clamp((center-5)/9,0,1);
      return Math.floor(19*(1-blend)+(8+a*21+b*5)*blend);
    }
    generate() {
      const s=this.seedValue;
      for(let x=0;x<this.width;x++) for(let z=0;z<this.depth;z++) {
        const h=this.terrainHeight(x,z);
        for(let y=0;y<=Math.max(h,this.seaLevel);y++) {
          let id=y===0?15:y>h?10:y===h?(h<=this.seaLevel+1?6:1):y>h-4?2:3;
          if(id===3) { const r=hash(x,z,s,y);if(r>.972) id=11;else if(y<12&&r<.017) id=12; }
          this.rawSet(x,y,z,id);
        }
      }
      for(let x=3;x<this.width-3;x++) for(let z=3;z<this.depth-3;z++) {
        const h=this.terrainHeight(x,z),r=hash(x,z,s^1183);
        if(h>this.seaLevel+1&&Math.hypot(x-this.width/2,z-this.depth/2)>7&&r<.011) {
          const tall=4+Math.floor(hash(x,z,s^583)*2);
          for(let y=1;y<=tall;y++) this.rawSet(x,h+y,z,4);
          for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=tall-1;dy<=tall+2;dy++) {
            if(Math.abs(dx)+Math.abs(dz)>3||dy===tall+2&&(Math.abs(dx)>1||Math.abs(dz)>1))continue;
            if(this.get(x+dx,h+dy,z+dz)===0)this.rawSet(x+dx,h+dy,z+dz,5);
          }
        } else if(h>this.seaLevel+1&&r>.955) this.rawSet(x,h+1,z,13);
      }
      // Expose a small stone seam near the clearing so the first pickaxe has a purpose.
      const cx=Math.floor(this.width/2),cz=Math.floor(this.depth/2);
      for(let x=cx+5;x<cx+9;x++)for(let z=cz-4;z<cz;z++)this.rawSet(x,this.terrainHeight(x,z),z,hash(x,z,s)>.7?11:3);
      for(let cx=0;cx<Math.ceil(this.width/16);cx++) for(let cz=0;cz<Math.ceil(this.depth/16);cz++) this.dirty.add(`${cx},${cz}`);
    }
  }
  function collides(world,x,y,z, height=1.8, radius=.3) {
    const minX=Math.floor(x-radius+.0001),maxX=Math.floor(x+radius-.0001);
    const minY=Math.floor(y+.0001),maxY=Math.floor(y+height-.0001);
    const minZ=Math.floor(z-radius+.0001),maxZ=Math.floor(z+radius-.0001);
    for(let xx=minX;xx<=maxX;xx++)for(let yy=minY;yy<=maxY;yy++)for(let zz=minZ;zz<=maxZ;zz++)if(world.solid(xx,yy,zz))return true;
    return false;
  }
  function raycast(world,origin,direction,reach=6) {
    let x=Math.floor(origin.x),y=Math.floor(origin.y),z=Math.floor(origin.z),t=0,normal=[0,0,0];
    const d=[direction.x,direction.y,direction.z],o=[origin.x,origin.y,origin.z];
    const voxel=[x,y,z],step=d.map(v=>v>=0?1:-1);
    const delta=d.map(v=>v===0?Infinity:Math.abs(1/v));
    const max=d.map((v,i)=>v===0?Infinity:((v>0?voxel[i]+1:voxel[i])-o[i])/v);
    for(let n=0;n<256&&t<=reach;n++) {
      const id=world.get(x,y,z);
      if(id&&id!==10) return {x,y,z,id,distance:t,normal,adjacent:{x:x+normal[0],y:y+normal[1],z:z+normal[2]}};
      let axis=max[0]<max[1]?(max[0]<max[2]?0:2):(max[1]<max[2]?1:2);
      t=max[axis];max[axis]+=delta[axis];normal=[0,0,0];normal[axis]=-step[axis];
      if(axis===0)x+=step[0];else if(axis===1)y+=step[1];else z+=step[2];
    }
    return null;
  }
  function defaultPlayer(world) {
    const x=Math.floor(world.width/2)+.5,z=Math.floor(world.depth/2)+.5;
    let y=world.surface(Math.floor(x),Math.floor(z));
    // A saved construction may occupy the original clearing: land on top of it.
    while(y<world.height+1&&collides(world,x,y,z))y++;
    return {x,y,z,vx:0,vy:0,vz:0,yaw:-.65,pitch:-.12,grounded:false,flight:false,health:20,hunger:20,fall:0,invulnerable:0};
  }
  function createState(seed='windplay',mode='creative') {
    const world=new World(seed),inventory=Object.create(null),durability=Object.create(null);
    if(mode==='creative') for(const id of Object.keys(ITEMS)) {if(+id>0&&+id!==15)inventory[id]=999;}
    else Object.assign(inventory,{2:32,4:8,25:8});
    return {world,mode:mode==='survival'?'survival':'creative',player:defaultPlayer(world),inventory,durability,
      hotbar:[2,4,9,3,8,7,14,21,25],selected:0,time:55,day:1,elapsed:0,kills:0,blocksMined:0,blocksPlaced:0};
  }
  function selectedItem(state) { return state.hotbar[state.selected]; }
  function available(state,id) { return state.mode==='creative'||(state.inventory[id]||0)>0; }
  function addItem(state,id,count=1) { state.inventory[id]=clamp((state.inventory[id]||0)+count,0,9999); }
  function miningDuration(state,id) {
    const block=BLOCKS[id]; if(!block||id===15)return Infinity;
    if(state.mode==='creative')return .11;
    const item=ITEMS[selectedItem(state)],tool=available(state,selectedItem(state))&&item?.tool;
    const speed=(block.needsPick&&tool==='pick')||(id===4||id===9)&&tool==='axe'?item.speed:1;
    return block.hardness/speed;
  }
  function wearTool(state) {
    const id=selectedItem(state),item=ITEMS[id];
    if(state.mode==='creative'||!item?.durability||!available(state,id))return;
    state.durability[id]=(state.durability[id]??item.durability)-1;
    if(state.durability[id]<=0) {state.inventory[id]--;delete state.durability[id];}
  }
  function mine(state,hit) {
    if(!hit||hit.id===15||state.world.get(hit.x,hit.y,hit.z)!==hit.id)return {ok:false,message:'基岩无法挖掘'};
    if(!state.world.set(hit.x,hit.y,hit.z,0))return {ok:false};
    state.blocksMined++;
    if(state.mode==='survival') {
      const b=BLOCKS[hit.id],item=ITEMS[selectedItem(state)];
      const canDrop=!b.needsPick||(item?.tool==='pick'&&available(state,selectedItem(state)));
      if(canDrop)addItem(state,b.drop||hit.id);
      if(hit.id===5&&hash(hit.x,hit.z,state.world.seedValue,hit.y)>.7)addItem(state,25,2);
      wearTool(state);
      if(!canDrop)return {ok:true,message:'石矿需要镐才能获得材料'};
    }
    return {ok:true};
  }
  function place(state,hit,id=selectedItem(state)) {
    if(!hit||!BLOCKS[id]||id===0||id===15||!available(state,id))return {ok:false,message:'选中一个有库存的方块'};
    const a=hit.adjacent;
    if(!state.world.inside(a.x,a.y,a.z))return {ok:false,message:'已到世界边界'};
    const existing=state.world.get(a.x,a.y,a.z);
    if(existing&&existing!==10&&existing!==13)return {ok:false,message:'这里已经有方块'};
    const p=state.player;
    if(BLOCKS[id].solid&&a.x+1>p.x-.3&&a.x<p.x+.3&&a.z+1>p.z-.3&&a.z<p.z+.3&&a.y+1>p.y&&a.y<p.y+1.8)return {ok:false,message:'不能把自己封进方块'};
    if(!state.world.set(a.x,a.y,a.z,id))return {ok:false};
    if(state.mode==='survival')state.inventory[id]--;
    state.blocksPlaced++;return {ok:true};
  }
  function canCraft(state,recipe) {return !!recipe&&(state.mode==='creative'||Object.entries(recipe.input).every(([id,n])=>(state.inventory[id]||0)>=n));}
  function craft(state,recipeId) {
    const recipe=RECIPES.find(r=>r.id===recipeId);
    if(!canCraft(state,recipe))return false;
    if(state.mode==='survival')for(const [id,n]of Object.entries(recipe.input))state.inventory[id]-=n;
    for(const [id,n]of Object.entries(recipe.output))addItem(state,+id,n);
    return true;
  }
  function eat(state,id=selectedItem(state)) {
    const item=ITEMS[id];if(!item?.food||!available(state,id))return false;
    if(state.player.hunger>=20)return false;
    if(state.mode==='survival')state.inventory[id]--;
    state.player.hunger=clamp(state.player.hunger+item.food,0,20);return true;
  }
  function stepPlayer(state,input,dt) {
    const p=state.player,w=state.world,creative=state.mode==='creative';dt=clamp(dt,0,.06);
    const water=w.get(Math.floor(p.x),Math.floor(p.y+.5),Math.floor(p.z))===10;
    const speed=p.flight?9:water?2.4:input.sprint?7.1:4.5;
    let forward=(input.forward?1:0)-(input.back?1:0),side=(input.right?1:0)-(input.left?1:0);
    const length=Math.hypot(forward,side)||1;forward/=length;side/=length;
    p.vx=(Math.sin(p.yaw)*forward+Math.cos(p.yaw)*side)*speed;
    p.vz=(-Math.cos(p.yaw)*forward+Math.sin(p.yaw)*side)*speed;
    if(creative&&p.flight)p.vy=((input.jump?1:0)-(input.down?1:0))*speed;
    else {if(input.jump&&(p.grounded||water))p.vy=water?4.6:8.2;p.vy=Math.max(p.vy-(water?4.8:22)*dt,water?-3:-34);}
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(p.vx),Math.abs(p.vy),Math.abs(p.vz))*dt/.25));
    p.grounded=false;
    for(let n=0;n<steps;n++) {
      const dd=dt/steps;
      for(const [axis,velocity]of [['x','vx'],['z','vz'],['y','vy']]) {
        const old=p[axis],next=old+p[velocity]*dd;p[axis]=next;
        if(collides(w,p.x,p.y,p.z)) {
          const direction=p[velocity]>0?1:-1;
          p[axis]=old;
          // Approach the surface closely without embedding the player.
          let lo=0,hi=1;for(let i=0;i<9;i++) {const t=(lo+hi)/2;p[axis]=old+(next-old)*t;if(collides(w,p.x,p.y,p.z))hi=t;else lo=t;}
          p[axis]=old+(next-old)*lo;
          if(axis==='y'&&direction<0) {
            p.grounded=true;
            if(!creative&&p.vy<-11) {p.health=clamp(p.health-Math.floor((-p.vy-10)*.7),0,20);p.invulnerable=.45;}
          }
          p[velocity]=0;
        }
      }
    }
    p.x=clamp(p.x,.31,w.width-.31);p.z=clamp(p.z,.31,w.depth-.31);
    if(p.y>w.height+20)p.y=w.height+20;
    p.invulnerable=Math.max(0,p.invulnerable-dt);
    if(!creative) {
      const effort=forward||side?input.sprint?.085:.025:.012;
      p.hunger=clamp(p.hunger-dt*effort,0,20);
      if(p.hunger<=0)p.health=clamp(p.health-dt*.12,0,20);
      if(p.hunger>16&&p.health<20){p.health=Math.min(20,p.health+dt*.16);p.hunger=Math.max(0,p.hunger-dt*.04);}
    }
    state.elapsed+=dt;state.time+=dt;
    if(state.time>=480){state.time-=480;state.day++;}
    return {water,moving:!!(forward||side)};
  }
  function daylight(state) { return clamp((Math.sin(state.time/480*Math.PI*2)+.2)*.85,.12,1); }
  function respawn(state) {const old=state.player;state.player=defaultPlayer(state.world);state.player.health=20;state.player.hunger=20;state.player.yaw=old.yaw;}
  function serialize(state) {
    const {mode,player,inventory,durability,hotbar,selected,time,day,elapsed,kills,blocksMined,blocksPlaced}=state;
    return JSON.stringify({version:1,seed:state.world.seed,edits:[...state.world.edits],mode,player,inventory,durability,hotbar,selected,time,day,elapsed,kills,blocksMined,blocksPlaced});
  }
  function deserialize(json) {
    const data=JSON.parse(json);
    if(!data||data.version!==1||typeof data.seed!=='string'||data.seed.length>64||!['creative','survival'].includes(data.mode))throw new Error('存档格式不正确');
    if(!Array.isArray(data.edits)||data.edits.length>307200)throw new Error('世界数据不正确');
    const state=createState(data.seed,data.mode),world=state.world;
    for(const pair of data.edits) {
      if(!Array.isArray(pair)||pair.length!==2||!Number.isInteger(pair[0])||pair[0]<0||pair[0]>=world.data.length||!Number.isInteger(pair[1])||!BLOCKS[pair[1]]||Math.floor(pair[0]/(world.width*world.depth))===0)throw new Error('方块数据不正确');
      world.data[pair[0]]=pair[1];world.edits.set(pair[0],pair[1]);
    }
    const p=data.player;
    if(!p||!['x','y','z','yaw','pitch','health','hunger'].every(k=>Number.isFinite(p[k])))throw new Error('玩家数据不正确');
    Object.assign(state.player,{vx:0,vy:0,vz:0,x:clamp(p.x,.31,world.width-.31),z:clamp(p.z,.31,world.depth-.31),y:clamp(p.y,1,world.height+20),yaw:p.yaw%(Math.PI*2),pitch:clamp(p.pitch,-1.5,1.5),health:clamp(p.health,0,20),hunger:clamp(p.hunger,0,20),flight:data.mode==='creative'&&p.flight===true});
    for(const field of ['inventory','durability']) {
      if(!data[field]||typeof data[field]!=='object')throw new Error('背包数据不正确');
      state[field]=Object.create(null);
      for(const [id,n]of Object.entries(data[field]))if(ITEMS[id]&&Number.isInteger(n)&&n>=0&&n<=9999)state[field][id]=n;else throw new Error('物品数量不正确');
    }
    if(!Array.isArray(data.hotbar)||data.hotbar.length!==9||data.hotbar.some(id=>!ITEMS[id]||id===0||id===15))throw new Error('快捷栏数据不正确');
    if(!Number.isInteger(data.selected)||data.selected<0||data.selected>8)throw new Error('快捷栏选择不正确');
    state.hotbar=data.hotbar;state.selected=data.selected;
    for(const field of ['time','day','elapsed','kills','blocksMined','blocksPlaced']){
      if(!Number.isFinite(data[field])||data[field]<0||data[field]>1e9)throw new Error('世界统计不正确');
      state[field]=data[field];
    }
    state.time%=480;state.day=Math.max(1,Math.floor(state.day));
    if(collides(world,state.player.x,state.player.y,state.player.z))respawn(state);
    return state;
  }
  const api={BLOCKS,ITEMS,RECIPES,World,hash,seedHash,noise,clamp,collides,raycast,createState,defaultPlayer,selectedItem,available,addItem,miningDuration,mine,place,wearTool,canCraft,craft,eat,stepPlayer,daylight,respawn,serialize,deserialize};
  root.VoxelCore=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis==='object'?globalThis:this);
