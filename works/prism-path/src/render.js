(function(root){
'use strict';
class PrismRenderer{
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.hits=[];this.angle=0;this.scene=null;this.frame=0;this.glow=0;this.step=null;
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  this.resize=new ResizeObserver(()=>this.draw());this.resize.observe(canvas);
 }
 set(state,animate=false){
  const old=this.angle,prev=this.scene;this.scene=state;let target=state.view*Math.PI/2;
  while(target-old>Math.PI)target-=Math.PI*2;while(target-old<-Math.PI)target+=Math.PI*2;
  // Footsteps keep the walk alive between the 150ms grid commits.
  if(prev&&prev.level===state.level&&prev.node!==state.node&&!this.reduced.matches){
   this.step={from:prev.node,to:state.node,start:performance.now()};this.play();
  }
  cancelAnimationFrame(this.frame);
  if(!animate||this.reduced.matches){this.angle=target;this.draw();return;}
  const begin=performance.now();const tick=now=>{const t=Math.min(1,(now-begin)/380);this.angle=old+(target-old)*(1-Math.pow(1-t,4));this.draw();if(t<1&&!document.hidden)this.frame=requestAnimationFrame(tick);else{this.angle=target;this.draw();}};this.frame=requestAnimationFrame(tick);
 }
 play(){if(this.playing)return;this.playing=true;
  const tick=now=>{const ended=this.step&&now-this.step.start>=170;if(ended)this.step=null;this.draw();if(this.step&&!document.hidden)requestAnimationFrame(tick);else this.playing=false;};
  requestAnimationFrame(tick);}
 project(n,unit=1){const c=Math.cos(this.angle),s=Math.sin(this.angle),x=n.x*c-n.z*s,z=n.x*s+n.z*c;return{x:(x-z)*unit,y:((x+z)*.5-n.y)*unit,depth:x+z+n.y*.015};}
 draw(){
  if(!this.scene)return;const state=this.scene,l=PrismCore.levels[state.level],canvas=this.canvas,ctx=this.ctx,w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(!w||!h)return;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const sky=l.theme[0];
  // A faint prismatic fan drifting across the sky: light is the narrator of this garden.
  const drift=(this.angle/(Math.PI*2))%1,ray='255,255,255';
  for(let i=0;i<3;i++){const x=w*(.18+i*.27+drift*.09),g=ctx.createLinearGradient(x-70,0,x+40,h);
   g.addColorStop(0,`rgba(${ray},0)`);g.addColorStop(.45,`rgba(${ray},${.05-i*.012})`);g.addColorStop(1,`rgba(${ray},0)`);
   ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-90,-20);ctx.lineTo(x-10,-20);ctx.lineTo(x+150,h+20);ctx.lineTo(x+60,h+20);ctx.closePath();ctx.fill();}
  // Distant floating islands give the garden a horizon and a sense of altitude.
  ctx.fillStyle=l.theme[2];ctx.globalAlpha=.16;
  const islands=[[.12,.8,64,.34],[.83,.68,42,.3],[.66,.88,88,.26]];
  for(const[fx,fy,iw,squash]of islands){ctx.beginPath();ctx.ellipse(w*fx+drift*26,h*fy,iw,iw*squash,0,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
  const raw=l.nodes.map(n=>this.project(n));
  let minX=Math.min(...raw.map(p=>p.x))-1.4,maxX=Math.max(...raw.map(p=>p.x))+1.4,minY=Math.min(...raw.map(p=>p.y))-2.1,maxY=Math.max(...raw.map(p=>p.y))+4;
  const unit=Math.min(54,(w-30)/(maxX-minX),(h-45)/(maxY-minY));const ox=w/2-(maxX+minX)*unit/2,oy=h/2-(maxY+minY)*unit/2;
  this.point=n=>{const p=this.project(n,unit);return{x:p.x+ox,y:p.y+oy,depth:p.depth};};
  const P=this.point,poly=(points,fill,stroke)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.6;ctx.stroke();}};
  // Broad, grounded shadows make the freestanding geometry legible.
  ctx.fillStyle='#355a5010';for(const n of l.nodes){const p=P(n);ctx.beginPath();ctx.ellipse(p.x+12,p.y+unit*2.45,unit*.8,unit*.26,0,0,Math.PI*2);ctx.fill();}
  const active=PrismCore.available(state),ordered=l.nodes.slice().sort((a,b)=>P(a).depth-P(b).depth);
  const now=performance.now()/1000;
  this.hits=[];
  for(const n of ordered){
   const p=P(n),r=.49,base=n.y-2.1-(n.id%3)*.4;
   const corners=[{x:n.x-r,y:n.y,z:n.z-r},{x:n.x+r,y:n.y,z:n.z-r},{x:n.x+r,y:n.y,z:n.z+r},{x:n.x-r,y:n.y,z:n.z+r}].map(P);
   for(let i=0;i<4;i++){const j=(i+1)%4;const a=corners[i],b=corners[j];if((a.y+b.y)/2<p.y+.01)continue;
    // A long cast shadow down each side face anchors the tower in the light.
    const shade=i%2?'rgba(50,70,62,.10)':'rgba(50,70,62,.06)';
    poly([{x:a.x,y:a.y+(n.y-base)*unit},{x:b.x,y:b.y+(n.y-base)*unit},{x:b.x+unit*.5,y:b.y+(n.y-base)*unit+unit*.4},{x:a.x+unit*.5,y:a.y+(n.y-base)*unit+unit*.4}],shade,null);
    poly([a,b,{x:b.x,y:b.y+(n.y-base)*unit},{x:a.x,y:a.y+(n.y-base)*unit}],i%2?l.theme[2]:l.theme[3]);}
   const selected=n.id===state.node;
   poly(corners,active.includes(n.id)?'#fffbea':l.theme[1],selected?'#ae7e44':'#ffffff55');
   // A hairline inset makes each tile read as cut stone rather than a flat fill.
   ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=.8;ctx.beginPath();
   corners.forEach((c,i)=>{const k=i?ctx.lineTo:ctx.moveTo;k.call(ctx,c.x+(p.x-c.x)*.14,c.y+(p.y-c.y)*.14);});ctx.closePath();ctx.stroke();
   if(active.includes(n.id)){ctx.strokeStyle='#6c9284';ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(p.x,p.y,unit*.22,unit*.11,0,0,Math.PI*2);ctx.stroke();}
   if(n.dial){ctx.strokeStyle='#899d87';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(p.x,p.y,unit*.37,unit*.185,0,0,Math.PI*2);ctx.stroke();for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*unit*.3,p.y+Math.sin(a)*unit*.15);ctx.lineTo(p.x+Math.cos(a)*unit*.4,p.y+Math.sin(a)*unit*.2);ctx.stroke();}}
   const folds=l.edges.filter(e=>e.view!==undefined&&(e.a===n.id||e.b===n.id));
   if(folds.length){ctx.fillStyle=folds.some(e=>e.view===state.view&&(!e.gate||(state.switches&e.gate)))?'#d99846':'#9e7f51';ctx.fillRect(p.x-unit*.11,p.y+unit*.17,unit*.22,unit*.055);}
   if(n.kind==='light'&&!(state.lights&n.bit)){
    // Starlight breathes on a slow four-second cycle.
    const pulse=.82+Math.sin(now*1.57+n.id)*.18,y=p.y-unit*.55;
    const halo=ctx.createRadialGradient(p.x,y,0,p.x,y,unit*.4);
    halo.addColorStop(0,'rgba(255,236,190,.4)');halo.addColorStop(1,'rgba(255,236,190,0)');
    ctx.fillStyle=halo;ctx.beginPath();ctx.arc(p.x,y,unit*.4*pulse,0,7);ctx.fill();
    poly([{x:p.x,y:y-unit*.17*pulse},{x:p.x+unit*.12*pulse,y},{x:p.x,y:y+unit*.17*pulse},{x:p.x-unit*.12*pulse,y}],'#c28a3e');
    ctx.fillStyle='#fffdf2';ctx.beginPath();ctx.arc(p.x,y,unit*.035,0,7);ctx.fill();
   }
   if(n.kind==='switch'){const on=!!(state.switches&n.bit);poly([{x:p.x,y:p.y-unit*.15},{x:p.x+unit*.2,y:p.y},{x:p.x,y:p.y+unit*.15},{x:p.x-unit*.2,y:p.y}],on?'#789876':'#ba774d');ctx.strokeStyle='#fff9df';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y-unit*.08);ctx.lineTo(p.x,p.y+unit*.07);ctx.stroke();}
   if(n.kind==='goal'){
    const archY=p.y-unit*1.3;ctx.strokeStyle=l.theme[2];ctx.lineWidth=unit*.18;ctx.beginPath();ctx.moveTo(p.x-unit*.3,p.y);ctx.lineTo(p.x-unit*.3,archY+unit*.27);ctx.arc(p.x,archY+unit*.27,unit*.3,Math.PI,0);ctx.lineTo(p.x+unit*.3,p.y);ctx.stroke();ctx.strokeStyle=l.theme[1];ctx.lineWidth=unit*.11;ctx.stroke();
    ctx.fillStyle='#bd9757';ctx.beginPath();ctx.arc(p.x,archY-unit*.16,unit*.07,0,7);ctx.fill();
    // The waiting arch glows only when every star has been gathered.
    if(state.lights===l.allLights&&!this.reduced.matches){
     const gp=.7+Math.sin(now*2.2)*.3,glow=ctx.createRadialGradient(p.x,archY,0,p.x,archY,unit*.8);
     glow.addColorStop(0,`rgba(255,238,196,${.22+gp*.14})`);glow.addColorStop(1,'rgba(255,238,196,0)');
     ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,archY,unit*.8,0,7);ctx.fill();}
   }
   this.hits.push({id:n.id,x:p.x,y:p.y,unit});
  }
  // A fine gold seam is drawn only when the projected bridge is actually traversable.
  for(const e of l.edges.filter(e=>e.view!==undefined&&e.view===state.view)){
   const a=P(l.nodes[e.a]),b=P(l.nodes[e.b]);ctx.strokeStyle=e.gate&&!(state.switches&e.gate)?'#a45139':'#b88a43';ctx.lineWidth=2;ctx.setLineDash(e.gate&&!(state.switches&e.gate)?[3,4]:[]);ctx.beginPath();ctx.moveTo(a.x+(b.x-a.x)*.47,a.y+(b.y-a.y)*.47);ctx.lineTo(a.x+(b.x-a.x)*.53,a.y+(b.y-a.y)*.53);ctx.stroke();ctx.setLineDash([]);
  }
  this.traveler(state,l,P,unit,now);
  this.glow=state.won?Math.min(1,this.glow+.05):0;
  if(state.won){
   // The completed garden dissolves into petals of light.
   const g=state.node,c=P(l.nodes[g]);
   for(let i=0;i<12;i++){
    const t=((now*.24+i/12)%1),a=i*Math.PI/6+t*.7,r=t*unit*1.7,fade=(1-t)*this.glow;
    ctx.fillStyle=`rgba(194,138,62,${.5*fade})`;
    ctx.save();ctx.translate(c.x+Math.cos(a)*r,c.y-unit*.6+Math.sin(a)*r*.45-t*unit*.6);ctx.rotate(a);
    ctx.beginPath();ctx.moveTo(0,-unit*.08);ctx.lineTo(unit*.05,0);ctx.lineTo(0,unit*.08);ctx.lineTo(-unit*.05,0);ctx.closePath();ctx.fill();ctx.restore();
   }
  }
 }
 traveler(state,l,P,unit,now){
  const n=l.nodes[state.node],coral=l.theme[4];
  let p=P(n);
  // Interpolate the position between two tiles while a step is in flight.
  if(this.step&&this.step.to===state.node){
   const t=Math.min(1,(performance.now()-this.step.start)/170),ease=1-Math.pow(1-t,3),f=P(l.nodes[this.step.from]);
   p={x:f.x+(p.x-f.x)*ease,y:f.y+(p.y-f.y)*ease-Math.sin(t*Math.PI)*unit*.12,depth:p.depth};
  }
  const walking=!!this.step,step=walking?Math.sin(now*15):0,bob=walking?Math.abs(Math.sin(now*15))*unit*.03:Math.sin(now*1.5)*unit*.015;
  const y=p.y-unit*.17-bob;
  ctx.fillStyle='#405c5730';ctx.beginPath();ctx.ellipse(p.x,p.y-unit*.07,unit*.18,unit*.08,0,0,7);ctx.fill();
  // Robe: a long cone with a wind-swept hem; its shadow side deepens the volume.
  const hem=walking?step*unit*.03:Math.sin(now*1.2)*unit*.012;
  ctx.beginPath();ctx.moveTo(p.x,y-unit*.62);ctx.lineTo(p.x-unit*.15+hem,y+unit*.1);ctx.lineTo(p.x+unit*.15+hem,y+unit*.1);ctx.closePath();
  ctx.fillStyle=coral;ctx.fill();
  ctx.beginPath();ctx.moveTo(p.x,y-unit*.62);ctx.lineTo(p.x+unit*.15+hem,y+unit*.1);ctx.lineTo(p.x+unit*.05+hem*.5,y+unit*.1);ctx.closePath();
  ctx.fillStyle='rgba(60,30,22,.28)';ctx.fill();
  // Legs appear between strides.
  ctx.strokeStyle='rgba(84,44,34,.9)';ctx.lineWidth=unit*.045;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(p.x-unit*.03,y+unit*.04);ctx.lineTo(p.x-unit*.05+step*unit*.05,y+unit*.13);ctx.moveTo(p.x+unit*.03,y+unit*.04);ctx.lineTo(p.x+unit*.05-step*unit*.05,y+unit*.13);ctx.stroke();
  // Head and the tall white crown.
  ctx.fillStyle='#fff8e8';ctx.beginPath();ctx.arc(p.x,y-unit*.68,unit*.1,0,7);ctx.fill();
  ctx.fillStyle=coral;ctx.beginPath();ctx.moveTo(p.x-unit*.14,y-unit*.72);ctx.lineTo(p.x+unit*.1,y-unit*.74);ctx.lineTo(p.x,y-unit*1.02);ctx.closePath();ctx.fill();
 }
 hit(x,y){return this.hits.slice().reverse().find(p=>Math.abs(x-p.x)/p.unit+Math.abs(y-p.y)/(p.unit*.55)<.95)?.id;}
}
root.PrismRenderer=PrismRenderer;
})(window);
