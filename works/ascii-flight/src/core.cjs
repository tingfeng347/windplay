/* metres, seconds and radians; independent of the renderer. */
const LIMIT=Math.PI/4, TURN_RATE=Math.PI/2, CONTROL_RATE=Math.PI/3;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function createState(){return {x:0,y:27,z:-50,pitch:0,roll:0,yaw:0,speed:25,distance:0,time:0,gate:0,status:'ready'};}
function step(state,input,dt){
 dt=clamp(dt,0,0.1); if(state.status!=='flying')return state;
 state.pitch=clamp(state.pitch+((input.s?1:0)-(input.w?1:0))*CONTROL_RATE*dt,-LIMIT,LIMIT);
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
function city(){
 const random=seeded(8419),objects=[];
 for(let bx=-5;bx<=5;bx++)for(let bz=-3;bz<=14;bz++){
  for(const side of [-1,1]){
   const height=18+random()*68;
   objects.push({kind:'building',x:bx*120+side*(30+random()*5),y:height/2,z:bz*120+32,xSize:25+random()*9,ySize:height,zSize:42,shade:Math.floor(random()*3)});
   const h2=16+random()*42;
   objects.push({kind:'building',x:bx*120+side*35,y:h2/2,z:bz*120+83,xSize:32,ySize:h2,zSize:31,shade:Math.floor(random()*3)});
  }
  for(const x of [-13,13]) for(const z of [22,70,96]) objects.push({kind:'tree',x:bx*120+x,y:5,z:bz*120+z,xSize:5,ySize:10,zSize:5});
 }
 return objects;
}
const ROUTES=[
 {name:'沿街初航',description:'沿主街穿过 8 道航门，熟悉俯仰与油门。',points:[[0,27,50],[0,33,155],[0,39,265],[0,27,380],[0,23,495],[0,35,620],[0,42,735],[0,28,850]]},
 {name:'街角转弯',description:'在十字路口向右转，再沿侧街向前。',points:[[0,27,50],[0,30,180],[0,30,300],[27,30,357],[85,30,360],[120,30,390],[120,27,480],[120,38,600]]},
 {name:'低空巡游',description:'高低交错的航门，穿梭两条长街。',points:[[0,18,50],[0,35,170],[0,22,300],[28,26,357],[90,26,360],[120,34,395],[120,18,500],[120,38,650],[120,20,810]]}
];
function gates(route){let last={x:0,z:-50};return route.points.map(([x,y,z])=>{const length=Math.hypot(x-last.x,z-last.z),g={x,y,z,radius:12,nx:(x-last.x)/length,nz:(z-last.z)/length};last=g;return g;});}
module.exports={LIMIT,TURN_RATE,CONTROL_RATE,clamp,createState,step,segmentBox,collision,crossesGate,seeded,city,ROUTES,gates};
