// Coordinates are metres. Furnishing keeps a connected 1 m wide walking route.
const ROOMS=[{id:'hall',name:'待客堂屋',x:-5,z:-3.8,y:1.95,yaw:0},{id:'study',name:'听雨书房',x:-9,z:-3.8,y:1.95,yaw:0},{id:'bedroom',name:'疏影卧房',x:-1,z:-3.8,y:1.95,yaw:0},{id:'pond',name:'池畔曲廊',x:4,z:10,y:1.75,yaw:Math.PI}];
const WALLS=[
 {x:-5,z:-9.1,w:12.5,d:.3}, {x:-11.25,z:-5.5,w:.3,d:7.4},{x:1.25,z:-5.5,w:.3,d:7.4},
 ...[-7,-3].flatMap(x=>[{x,z:-7.1,w:.15,d:3.8},{x,z:-2.25,w:.15,d:1.2}]),
 {x:-5,z:-7.7,w:2.2,d:.5},{x:-5,z:-5.8,w:1.6,d:1.4},
 {x:-9.4,z:-6.2,w:2.3,d:1},{x:-10.7,z:-8,w:.6,d:1.7},
 {x:-.6,z:-7.4,w:2.1,d:2.9},
 // Site boundary walls.
 {x:-15.8,z:0,w:.35,d:28},{x:15.8,z:0,w:.35,d:28},{x:0,z:-13.8,w:32,d:.35},{x:0,z:13.8,w:32,d:.35}
];
const POND={x:6.4,z:4.4,rx:6.4,rz:4.3};
function pondContains(x,z){const nx=(x-POND.x)/POND.rx,nz=(z-POND.z)/POND.rz;return nx*nx+nz*nz<.98;}
function canWalk(x,z){if(Math.abs(x)>15.3||Math.abs(z)>13.3||pondContains(x,z))return false;return !WALLS.some(w=>Math.abs(x-w.x)<w.w/2+.23&&Math.abs(z-w.z)<w.d/2+.23);}
function move(position,dx,dz){const maxStep=.12,count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/maxStep));let {x,z}=position;for(let i=0;i<count;i++){if(canWalk(x+dx/count,z))x+=dx/count;if(canWalk(x,z+dz/count))z+=dz/count;}return{x,z};}
function terrainHeight(x,z){
 const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
 if(x>-11.7&&x<1.7&&z>-9.7&&z<-.6)return .07;
 const bank=Math.hypot((x-POND.x)/POND.rx,(z-POND.z)/POND.rz);
 if(bank<1.13)return -.25+.40*smooth(.89,1.13,bank);
 const path=Math.min(Math.abs(z-.5),Math.abs(x-12.2),Math.abs(z-11.3),Math.abs(x+12.5),Math.abs(x+4-Math.sin(z*.28)*2));
 const raised=smooth(1.7,3.0,path),hill=(cx,cz,r,h)=>h*Math.exp(-((x-cx)**2+(z-cz)**2)/(r*r));
 return .07+raised*(hill(-9,7,3.8,1.05)+hill(4,-11.8,3.1,.78)+hill(11,-8,2.6,.65)+.09*Math.sin(x*.7)*Math.cos(z*.9));
}
function eyeHeight(x,z){return x>-11.5&&x<1.5&&z>-9.5&&z<-.8?1.95:1.68+terrainHeight(x,z);}
function roofHeight(z){const t=Math.abs(z+5.5)/5.5;return 6.8-2.7*t+.42*t*t*t;}
function lightState(day){day=Math.max(0,Math.min(1,day));return {day,sun:.20+day*1.55,ambient:.18+day*.18,lantern:1-day*.94,fog:.0035+(1-day)*.0045,exposure:1.08-day*.13};}
function seeded(seed=419){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
module.exports={ROOMS,WALLS,POND,pondContains,canWalk,move,terrainHeight,eyeHeight,roofHeight,lightState,seeded};
