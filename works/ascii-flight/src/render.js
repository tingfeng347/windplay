// A CPU ray tracer writes only printable ASCII glyphs to a 2D canvas.
export function basis(s){
 const cy=Math.cos(s.yaw),sy=Math.sin(s.yaw),cp=Math.cos(s.pitch),sp=Math.sin(s.pitch),cr=Math.cos(s.roll),sr=Math.sin(s.roll);
 return {f:[sy*cp,sp,cy*cp],r:[cy*cr+sy*sp*sr,-cp*sr,-sy*cr+cy*sp*sr],u:[cy*sr-sy*sp*cr,cp*cr,-sy*sr-cy*sp*cr]};
}
function rayBox(o,d,b){
 let near=0,far=600,axis=0;
 for(let i=0;i<3;i++){
  const v=d[i],min=b.bounds[i*2],max=b.bounds[i*2+1];
  if(Math.abs(v)<1e-8){if(o[i]<min||o[i]>max)return null;continue;}
  let a=(min-o[i])/v,c=(max-o[i])/v;if(a>c){const swap=a;a=c;c=swap;}if(a>near){near=a;axis=i;}far=Math.min(far,c);if(near>far)return null;
 }return near>0?{t:near,axis}:null;
}
const colors={building:['#6b9ca5','#a3a9b8','#c5aa7c'],window:'#f0cb89',tree:'#6eaa6e',trunk:'#a68c6a',road:'#7c8396',line:'#c5c1b0',grass:'#426949',gate:'#f5bb55',dim:'#9a7041'};
export function render(canvas,s,world,gates,active){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,cell=9,line=14,cols=Math.floor(w/cell),rows=Math.floor(h/line),b=basis(s),o=[s.x,s.y,s.z],focal=cols*.68;
 for(const obj of world)if(!obj.bounds)obj.bounds=[obj.x-obj.xSize/2,obj.x+obj.xSize/2,obj.y-obj.ySize/2,obj.y+obj.ySize/2,obj.z-obj.zSize/2,obj.z+obj.zSize/2];
 const near=world.filter(o=>{const dx=o.x-s.x,dz=o.z-s.z;return dx*dx+dz*dz<330*330&&(dx*b.f[0]+dz*b.f[2]>-80);}),buffer=new Array(cols*rows),depth=new Float32Array(cols*rows).fill(600);
 ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.font='12px "Courier New",monospace';ctx.textBaseline='top';
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const vx=(x-cols/2)/focal,vy=-(y-rows/2)*line/cell/focal,d=[0,1,2].map(i=>b.f[i]+b.r[i]*vx+b.u[i]*vy);let t=600,hit=null;
  if(d[1]<-0.0001){const ground=-s.y/d[1];if(ground<600){t=ground;hit={kind:'ground'};}}
  for(const obj of near){const r=rayBox(o,d,obj);if(r&&r.t<t){t=r.t;hit={...obj,axis:r.axis};}}
  if(!hit)continue;
  const px=s.x+d[0]*t,py=s.y+d[1]*t,pz=s.z+d[2]*t;let char,color;
  if(hit.kind==='ground'){
   const ax=Math.abs(((px+60)%120+120)%120-60),az=Math.abs(((pz+60)%120+120)%120-60),road=ax<10||az<10;
   const stripe=(ax<.45||az<.45)&&Math.floor((ax<.45?pz:px)/5)%3!==0;
   char=road?(stripe?'=':'.'):', ';char=char[0];color=road?(stripe?colors.line:colors.road):colors.grass;
  }else if(hit.kind==='tree'){
   const leaf=py>3&&Math.abs(px-hit.x)+Math.abs(pz-hit.z)<5;
   if(!leaf&&py>3)continue;
   char=py<3?'|':('*+&'[Math.abs(Math.floor(px*2+pz*3+py))%3]);color=py<3?colors.trunk:colors.tree;
  }else{
   const window=hit.axis!==1&&((py%5+5)%5)>1.6&&((py%5+5)%5)<3.5&&(((hit.axis===0?pz:px)%5+5)%5)>1.4;
   char=window?'H':hit.axis===1?'=':(Math.floor(py)%5===0?'-':'#');color=window?colors.window:colors.building[hit.shade];
  }
  const index=y*cols+x;buffer[index]={char,color,alpha:Math.max(.23,1-t/450)};depth[index]=t;
 }
 // Sample the physical ring; glyphs use the same grid and depth buffer as the city.
 gates.forEach((g,index)=>{
  if(index<active||index>active+2)return;
  for(let a=0;a<Math.PI*2;a+=.025){
   const p=[g.x+g.nz*Math.cos(a)*g.radius-s.x,g.y+Math.sin(a)*g.radius-s.y,g.z-g.nx*Math.cos(a)*g.radius-s.z];
   const z=p.reduce((n,v,i)=>n+v*b.f[i],0);if(z<=1)continue;
   const x=Math.round(cols/2+p.reduce((n,v,i)=>n+v*b.r[i],0)*focal/z),y=Math.round(rows/2-p.reduce((n,v,i)=>n+v*b.u[i],0)*focal/z*cell/line),j=y*cols+x;
   if(x>=0&&x<cols&&y>=0&&y<rows&&z<depth[j]+4){buffer[j]={char:index===active?'O':'+',color:index===active?colors.gate:colors.dim,alpha:1};depth[j]=z;}
  }
 });
 for(let j=0;j<buffer.length;j++){const v=buffer[j];if(!v)continue;ctx.fillStyle=v.color;ctx.globalAlpha=v.alpha;ctx.fillText(v.char,(j%cols)*cell,Math.floor(j/cols)*line);}
 ctx.globalAlpha=1;ctx.fillStyle='#dfe3d3';ctx.fillText('+',Math.floor(cols/2)*cell,Math.floor(rows/2)*line);
}
