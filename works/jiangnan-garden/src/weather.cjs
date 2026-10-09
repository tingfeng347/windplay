const {roofHeight,seeded,pondContains}=require('./world.cjs');
function roofAt(x,z){
 if(x>=-11.9&&x<=1.9&&z>=-11.03&&z<=.03)return roofHeight(z)+.16;
 if(x>=11.45&&x<=14.35&&z>=-4.25&&z<=10.25)return 4.14-Math.abs(x-12.9)*.43;
 if(x>=2.3&&x<=13.3&&z>=9.5&&z<=12.5)return 3.75;
 return null;
}
function createDrops(random=seeded(1920),count=260){
 return Array.from({length:count},(_,i)=>{
  const eave=i<95,x=eave?-11.7+random()*13.4:-15+random()*30,z=eave?(i%2?-10.8:-.15):-12+random()*24;
  const surface=roofAt(x,z),bottom=eave?(pondContains(x,z)?.12:.09):(surface??(pondContains(x,z)?.12:.09));
  const top=eave?roofHeight(z)-.08:8+random()*2;
  return{x,z,top,bottom,phase:random()*5,speed:eave?2.4:4,length:eave?.12:.18,eave};
 });
}
function dropSegment(drop,time){
 const period=(drop.top-drop.bottom)/drop.speed;
 const elapsed=((time+drop.phase)%period+period)%period;
 const head=Math.max(drop.bottom,drop.top-elapsed*drop.speed);
 return{head,tail:Math.min(drop.top,head+drop.length)};
}
module.exports={roofAt,createDrops,dropSegment};
