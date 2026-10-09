// Settle a hanging panel under gravity with edge springs and a compressed tie.
// The rest lengths describe the cloth, rather than a painted funnel silhouette.
const settledPanels=new Map();
let settledBed;
export function settleQuilt(cols=44,rows=50){
 if(settledBed&&settledBed.cols===cols&&settledBed.rows===rows)return settledBed;
 const stride=cols+1,p=new Float32Array(stride*(rows+1)*3),old=new Float32Array(p.length),links=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
  const u=i/cols*2-1,v=j/rows*2-1,k=(j*stride+i)*3;
  p[k]=u*1.30;p[k+2]=v*1.57;
  p[k+1]=1.10+.035*Math.sin(u*8+v*6)+.020*Math.cos(u*17-v*11)-Math.max(0,Math.abs(p[k])-1.075)*2.6-Math.max(0,Math.abs(p[k+2])-1.485)*2.8;
  if(i<cols)links.push([k,k+3,2.72/cols,1]);
  if(j<rows)links.push([k,k+stride*3,3.24/rows,1]);
  if(i<cols&&j<rows)links.push([k,k+(stride+1)*3,Math.hypot(2.72/cols,3.24/rows),.45]);
  if(i>0&&j<rows)links.push([k,k+(stride-1)*3,Math.hypot(2.72/cols,3.24/rows),.45]);
  if(i+2<=cols)links.push([k,k+6,5.44/cols,.16]);
  if(j+2<=rows)links.push([k,k+stride*6,6.48/rows,.16]);
 }
 old.set(p);
 // Contact against the actual mattress and supporting bed frame. Free edges
 // fall outside the timber, while slack settles into compressed folds on top.
 function contact(){for(let k=0;k<p.length;k+=3){const x=p[k],z=p[k+2];if(Math.abs(x)<1.075&&Math.abs(z)<1.485){const support=1.045+.115*Math.exp(-((x-.08)**2/.6+(z+.18)**2/1.1));if(p[k+1]<=support+.025){const n=k/3,i=n%stride,j=Math.floor(n/stride);p[k]+=((i/cols*2-1)*1.30-x)*.12;p[k+2]+=((j/rows*2-1)*1.57-z)*.12;}p[k+1]=Math.max(p[k+1],support);}else p[k+1]=Math.max(p[k+1],.53);}}
 for(let step=0;step<260;step++){
  for(let k=0;k<p.length;k++){const value=p[k];p[k]+=(value-old[k])*.78+(k%3===1?-.0008:0);old[k]=value;}
  for(let pass=0;pass<6;pass++){
   for(const [a,b,length,stiffness] of links){const dx=p[b]-p[a],dy=p[b+1]-p[a+1],dz=p[b+2]-p[a+2],distance=Math.hypot(dx,dy,dz);if(distance<1e-8)continue;const c=(distance-length)/distance*.5*stiffness;p[a]+=dx*c;p[b]-=dx*c;p[a+1]+=dy*c;p[b+1]-=dy*c;p[a+2]+=dz*c;p[b+2]-=dz*c;}
   contact();
  }
 }
 // Padding distributes the sharp wrinkles of a single cloth sheet. Smooth the
 // settled surface in both directions, retaining the mattress contact and hems.
 for(let pass=0;pass<6;pass++){
  const next=p.slice();
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const k=(j*stride+i)*3,adjacent=[];
   if(i>0)adjacent.push(k-3);if(i<cols)adjacent.push(k+3);
   if(j>0)adjacent.push(k-stride*3);if(j<rows)adjacent.push(k+stride*3);
   for(let d=0;d<3;d++)next[k+d]=p[k+d]*.4+adjacent.reduce((sum,a)=>sum+p[a+d],0)/adjacent.length*.6;
  }
  p.set(next);contact();
 }
 settledBed={positions:p,cols,rows};return settledBed;
}
export function settleCurtain(width,height,side,cols=36,rows=56){
 const key=[width,height,side,cols,rows].join(':');if(settledPanels.has(key))return settledPanels.get(key);
 const stride=cols+1,count=stride*(rows+1),p=new Float32Array(count*3),old=new Float32Array(count*3),pins=new Map(),links=[];
 const tieRow=Math.round(rows*(side<0?.62:.57));
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
  const u=i/cols,v=j/rows,k=(j*stride+i)*3;
  p[k]=(u-.5)*width*.70;
  p[k+1]=3.145-v*height;
  p[k+2]=.043*Math.sin(u*37+side*.7)+.012*Math.sin(u*71+v*4);
  if(j===0)pins.set(k,[p[k],p[k+1],p[k+2]]);
  if(j===tieRow&&i%3===0)pins.set(k,[side*.24+(u-.5)*.085,3.145-height*j/rows,.06+.022*Math.sin(u*6.28)]);
  if(i<cols)links.push([k,k+3,width/cols,1]);
  if(j<rows)links.push([k,k+stride*3,height/rows,1]);
  if(i<cols&&j<rows)links.push([k,k+(stride+1)*3,Math.hypot(width/cols,height/rows),.35]);
  if(i+2<=cols)links.push([k,k+6,width/cols*2,.018]);
 }
 old.set(p);
 for(let step=0;step<240;step++){
  for(let k=0;k<p.length;k+=3){if(pins.has(k))continue;for(let d=0;d<3;d++){const value=p[k+d],velocity=(value-old[k+d])*.86;old[k+d]=value;p[k+d]=value+velocity+(d===1?-.0012:0);}}
  for(let pass=0;pass<5;pass++){
   for(const [a,b,length,stiffness] of links){const dx=p[b]-p[a],dy=p[b+1]-p[a+1],dz=p[b+2]-p[a+2],distance=Math.hypot(dx,dy,dz);if(distance<1e-8)continue;const wa=pins.has(a)?0:1,wb=pins.has(b)?0:1;if(!wa&&!wb)continue;const correction=(distance-length)/distance*stiffness/(wa+wb);p[a]+=dx*correction*wa;p[b]-=dx*correction*wb;p[a+1]+=dy*correction*wa;p[b+1]-=dy*correction*wb;p[a+2]+=dz*correction*wa;p[b+2]-=dz*correction*wb;}
   for(const [k,value] of pins)p.set(value,k);
  }
 }
 const result={positions:p,cols,rows};settledPanels.set(key,result);return result;
}
