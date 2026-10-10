/* metres, seconds and radians; independent of the renderer. */
const LIMIT=Math.PI/4, TURN_RATE=Math.PI/2, CONTROL_RATE=Math.PI/3;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function createState(){return {x:0,y:27,z:-50,pitch:0,roll:0,yaw:0,speed:25,distance:0,time:0,gate:0,status:'ready'};}
function step(state,input,dt){
 dt=clamp(dt,0,0.1); if(state.status!=='flying')return state;
 state.pitch=clamp(state.pitch+((input.w?1:0)-(input.s?1:0))*CONTROL_RATE*dt,-LIMIT,LIMIT);
 state.roll=clamp(state.roll+((input.d?1:0)-(input.a?1:0))*CONTROL_RATE*dt,-LIMIT,LIMIT);
 state.speed=clamp(state.speed+((input.z?1:0)-(input.x?1:0))*10*dt,10,50);
 state.yaw+=state.roll/LIMIT*TURN_RATE*dt;
 const length=state.speed*dt, horizontal=length*Math.cos(state.pitch);
 state.x+=Math.sin(state.yaw)*horizontal; state.y+=Math.sin(state.pitch)*length; state.z+=Math.cos(state.yaw)*horizontal;
 state.distance+=length;state.time+=dt;return state;
}
function segmentBox(a,b,box,padding=0.7){
 let lo=0,hi=1;
 for(const key of ['x','y','z']){
  const min=box[key]-box[key+'Size']/2-padding,max=box[key]+box[key+'Size']/2+padding,d=b[key]-a[key];
  if(Math.abs(d)<1e-8){if(a[key]<min||a[key]>max)return false;continue;}
  let t0=(min-a[key])/d,t1=(max-a[key])/d;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>hi)return false;
 }return true;
}
function collision(a,b,objects){if(b.y<1||b.y>200)return b.y<1?'触地':'超出空域';for(const o of objects)if(segmentBox(a,b,o))return o.kind==='tree'?'撞到树冠':'撞到楼房';return null;}
function crossesGate(a,b,g){
 const da=(a.x-g.x)*g.nx+(a.z-g.z)*g.nz, db=(b.x-g.x)*g.nx+(b.z-g.z)*g.nz;
 if(da>0||db<0||Math.abs(db-da)<1e-8)return false;
 const t=-da/(db-da),dx=a.x+(b.x-a.x)*t-g.x,dy=a.y+(b.y-a.y)*t-g.y,dz=a.z+(b.z-a.z)*t-g.z;
 return Math.hypot(dx,dy,dz)<g.radius;
}
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const WORLD_BOUNDS={minX:-820,maxX:880,minZ:-300,maxZ:1880};
const STREETS_X=[-720,-540,-360,-180,0,180,600,780],STREETS_Z=[-180,0,180,360,600,840,1080,1380,1680];
const riverX=z=>390+Math.sin(z/240)*38;
function groundAt(x,z){
 const dx=Math.min(...STREETS_X.map(s=>Math.abs(x-s))),dz=Math.min(...STREETS_Z.map(s=>Math.abs(z-s)));
 const river=Math.abs(x-riverX(z))<30,road=dx<12||dz<12;
 if(river&&dz>=12)return {kind:'water',stripe:false};
 if(road){const along=dx<dz?z:x;return {kind:river?'bridge':'road',stripe:(Math.min(dx,dz)<.55&&Math.floor(along/6)%3!==0),crosswalk:(dx<10&&dz>15&&dz<21)||(dz<10&&dx>15&&dx<21)};}
 if(x>-170&&x<-20&&z>610&&z<830)return {kind:'park',stripe:false};
 return {kind:dx<17||dz<17?'pavement':'grass',stripe:false};
}
function city(){
 const random=seeded(8419),objects=[];
 const box=(x,y,z,xSize,ySize,zSize,extra={})=>objects.push({kind:'building',x,y,z,xSize,ySize,zSize,shade:0,...extra});
 function tree(x,z,height=9){
  if(groundAt(x,z).kind==='water')return;
  box(x,height*.24,z,1.1,height*.48,1.1,{kind:'tree',foliage:false});
  box(x,height*.68,z,5.5,height*.65,5.5,{kind:'tree',foliage:true,shade:Math.floor(random()*3)});
  box(x+.8,height*.94,z-.6,3.5,height*.34,3.5,{kind:'tree',foliage:true,shade:Math.floor(random()*3)});
 }
 function building(x,z,width,depth,district){
  if(Math.abs(x-riverX(z))<width/2+40)return;
  const industrial=district==='industrial',tall=district==='downtown';
  const height=industrial?15+random()*19:tall?48+random()*85:14+random()*30;
  const shade=industrial?3:tall?Math.floor(random()*2):2+Math.floor(random()*2);
  box(x,height/2,z,width,height,depth,{district,shade,windowStep:industrial?8:tall?4:5,windows:true});
  if(tall){
   const crown=6+random()*14;
   box(x,height+crown/2,z,width*.65,crown,depth*.62,{district,shade,windows:true,windowStep:4});
   if(random()>.6)box(x,height+crown+7,z,1.1,14,1.1,{district,shade:4,windows:false});
  }else{
   box(x+width*.18,height+1.7,z-depth*.15,width*.26,3.4,depth*.28,{district,shade:4,windows:false});
   if(industrial)box(x-width*.28,height+9,z+depth*.2,3,18,3,{district,shade:3,windows:false});
  }
 }
 for(let ix=0;ix<STREETS_X.length-1;ix++)for(let iz=0;iz<STREETS_Z.length-1;iz++){
  const left=STREETS_X[ix],right=STREETS_X[ix+1],front=STREETS_Z[iz],back=STREETS_Z[iz+1];
  const park=left===-180&&front===600;
  const district=front>=1080?'industrial':left>=0&&left<600&&front<600?'downtown':'residential';
  if(park){for(let n=0;n<19;n++)tree(left+28+random()*110,front+30+random()*170,7+random()*11);continue;}
  const slots=Math.max(1,Math.floor((right-left-40)/58));
  for(let n=0;n<slots;n++)for(const z of [front+40,back-40]){
   const x=left+28+(n+.5)*(right-left-56)/slots;
   building(x,z,28+random()*17,29+random()*14,district);
  }
  for(let z=front+100;z<back-60;z+=65)for(const x of [left+40,right-40])building(x,z,30+random()*12,30+random()*16,district);
  for(let z=front+28;z<back-22;z+=42)for(const x of [left+17,right-17])tree(x,z,6+random()*6);
 }
 // River crossings have a deck, parapets and paired piers; the air above remains open.
 for(const z of [180,600,1080,1380]){
  const x=riverX(z);
  box(x,3,z,106,3,24,{district:'river',shade:4,windows:false});
  for(const side of [-1,1]){
   box(x,5.3,z+side*13,106,1.6,1.4,{district:'river',shade:4,windows:false});
   box(x+side*36,1,z,4,4,20,{district:'river',shade:4,windows:false});
  }
 }
 // Two covered passages and an industrial gantry create optional under/over flight choices.
 for(const [x,z,height] of [[0,510,54],[180,720,68]]){
  for(const side of [-1,1])box(x+side*28,height/2,z,4,height,7,{district:'downtown',shade:4,windows:false});
  box(x,height,z,60,5,10,{district:'downtown',shade:1,windows:true,windowStep:4});
 }
 for(const x of [-480,-240]){
  for(const side of [-1,1])box(x+side*20,23,1260,3,46,5,{district:'industrial',shade:5,windows:false});
  box(x,47,1260,46,3,6,{district:'industrial',shade:5,windows:false});
  box(x+8,38,1260,1,18,1,{district:'industrial',shade:4,windows:false});
 }
 // A narrow clock tower and stepped plaza pavilion break up the low western skyline.
 box(-270,27,450,15,54,15,{district:'landmark',shade:2,windows:true,windowStep:9});
 box(-270,58,450,23,8,23,{district:'landmark',shade:4,windows:false});
 for(let level=0;level<3;level++)box(-95,3+level*4,720,46-level*11,4,34-level*8,{district:'park',shade:2,windows:false});
 return objects;
}
const ROUTES=[
 {name:'城市穿针',description:'穿过高楼街谷与两座空中连廊，低飞穿洞，再抬升越过屋顶。',points:[[0,27,50],[0,35,155],[0,42,280],[0,30,400],[0,26,510],[0,38,575],[35,44,600],[125,50,600],[180,48,645],[180,35,720],[180,55,820],[180,78,980]]},
 {name:'滨河回环',description:'从商业区向东穿过河桥，沿对岸转弯，再越桥返回城市。',points:[[0,27,70],[0,36,280],[0,40,540],[35,38,600],[140,35,600],[290,26,600],[410,22,600],[560,30,600],[600,35,645],[600,45,820],[600,38,1015],[560,34,1080],[420,28,1080],[280,34,1080],[210,40,1080],[180,42,1120],[180,54,1290],[180,46,1510]]},
 {name:'公园低空',description:'绕过钟楼与林地，沿西侧街道连续转弯，在树冠和屋顶之间巡游。',points:[[0,18,60],[0,30,300],[-35,30,360],[-145,28,360],[-180,32,410],[-180,30,555],[-180,24,730],[-180,38,805],[-220,40,840],[-320,34,840],[-360,26,880],[-360,24,1030],[-325,30,1080],[-220,32,1080],[-180,36,1130],[-180,45,1310]]},
 {name:'工业远征',description:'长距离穿越仓库、烟囱和吊架，跨越三条街区，完成工业区折返。',points:[[0,30,90],[0,45,330],[0,30,510],[0,55,820],[0,62,1030],[-45,60,1080],[-170,55,1080],[-315,50,1080],[-360,45,1125],[-360,38,1300],[-405,55,1380],[-505,62,1380],[-540,55,1425],[-540,72,1615]]}
];
function gates(route){let last={x:0,z:-50};return route.points.map(([x,y,z])=>{const length=Math.hypot(x-last.x,z-last.z),g={x,y,z,radius:12,nx:(x-last.x)/length,nz:(z-last.z)/length};last=g;return g;});}
module.exports={LIMIT,TURN_RATE,CONTROL_RATE,WORLD_BOUNDS,STREETS_X,STREETS_Z,groundAt,clamp,createState,step,segmentBox,collision,crossesGate,seeded,city,ROUTES,gates};
