(function(root){
'use strict';
class PrismRenderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.hits=[];this.angle=0;this.scene=null;this.frame=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.resize=new ResizeObserver(()=>this.draw());this.resize.observe(canvas);}
 set(state,animate=false){const old=this.angle;this.scene=state;let target=state.view*Math.PI/2;while(target-old>Math.PI)target-=Math.PI*2;while(target-old< -Math.PI)target+=Math.PI*2;cancelAnimationFrame(this.frame);
 if(!animate||this.reduced.matches){this.angle=target;this.draw();return;}
 const begin=performance.now();const tick=now=>{const t=Math.min(1,(now-begin)/380);this.angle=old+(target-old)*(1-Math.pow(1-t,4));this.draw();if(t<1&&!document.hidden)this.frame=requestAnimationFrame(tick);else{this.angle=target;this.draw();}};this.frame=requestAnimationFrame(tick);}
 project(n,unit=1){const c=Math.cos(this.angle),s=Math.sin(this.angle),x=n.x*c-n.z*s,z=n.x*s+n.z*c;return{x:(x-z)*unit,y:((x+z)*.5-n.y)*unit,depth:x+z+n.y*.015};}
 draw(){if(!this.scene)return;const state=this.scene,l=PrismCore.levels[state.level],canvas=this.canvas,ctx=this.ctx,w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(!w||!h)return;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const raw=l.nodes.map(n=>this.project(n));let minX=Math.min(...raw.map(p=>p.x))-1.4,maxX=Math.max(...raw.map(p=>p.x))+1.4,minY=Math.min(...raw.map(p=>p.y))-2.1,maxY=Math.max(...raw.map(p=>p.y))+4;
 const unit=Math.min(54,(w-30)/(maxX-minX),(h-45)/(maxY-minY));const ox=w/2-(maxX+minX)*unit/2,oy=h/2-(maxY+minY)*unit/2;
 this.point=n=>{const p=this.project(n,unit);return{x:p.x+ox,y:p.y+oy,depth:p.depth};};
 const P=this.point,poly=(points,fill,stroke)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.6;ctx.stroke();}};
 // Broad, grounded shadows make the freestanding geometry legible.
 ctx.fillStyle='#355a5010';for(const n of l.nodes){const p=P(n);ctx.beginPath();ctx.ellipse(p.x+12,p.y+unit*2.45,unit*.8,unit*.26,0,0,Math.PI*2);ctx.fill();}
 const active=PrismCore.available(state),ordered=l.nodes.slice().sort((a,b)=>P(a).depth-P(b).depth);
 this.hits=[];
 for(const n of ordered){
  const p=P(n),r=.49,base=n.y-2.1-(n.id%3)*.4;
  const corners=[{x:n.x-r,y:n.y,z:n.z-r},{x:n.x+r,y:n.y,z:n.z-r},{x:n.x+r,y:n.y,z:n.z+r},{x:n.x-r,y:n.y,z:n.z+r}].map(P);
  for(let i=0;i<4;i++){const j=(i+1)%4;const a=corners[i],b=corners[j];if((a.y+b.y)/2<p.y+.01)continue;poly([a,b,{x:b.x,y:b.y+(n.y-base)*unit},{x:a.x,y:a.y+(n.y-base)*unit}],i%2?l.theme[2]:l.theme[3]);}
  const selected=n.id===state.node;
  poly(corners,active.includes(n.id)?'#fffbea':l.theme[1],selected?'#ae7e44':'#ffffff55');
  if(active.includes(n.id)){ctx.strokeStyle='#6c9284';ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(p.x,p.y,unit*.22,unit*.11,0,0,Math.PI*2);ctx.stroke();}
  if(n.dial){ctx.strokeStyle='#899d87';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(p.x,p.y,unit*.37,unit*.185,0,0,Math.PI*2);ctx.stroke();for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*unit*.3,p.y+Math.sin(a)*unit*.15);ctx.lineTo(p.x+Math.cos(a)*unit*.4,p.y+Math.sin(a)*unit*.2);ctx.stroke();}}
  const folds=l.edges.filter(e=>e.view!==undefined&&(e.a===n.id||e.b===n.id));
  if(folds.length){ctx.fillStyle=folds.some(e=>e.view===state.view&&(!e.gate||(state.switches&e.gate)))?'#d99846':'#9e7f51';ctx.fillRect(p.x-unit*.11,p.y+unit*.17,unit*.22,unit*.055);}
  if(n.kind==='light'&&!(state.lights&n.bit)){const y=p.y-unit*.55;poly([{x:p.x,y:y-unit*.17},{x:p.x+unit*.12,y},{x:p.x,y:y+unit*.17},{x:p.x-unit*.12,y}], '#c28a3e');ctx.fillStyle='#fffdf2';ctx.beginPath();ctx.arc(p.x,y,unit*.035,0,7);ctx.fill();}
  if(n.kind==='switch'){const on=!!(state.switches&n.bit);poly([{x:p.x,y:p.y-unit*.15},{x:p.x+unit*.2,y:p.y},{x:p.x,y:p.y+unit*.15},{x:p.x-unit*.2,y:p.y}],on?'#789876':'#ba774d');ctx.strokeStyle='#fff9df';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y-unit*.08);ctx.lineTo(p.x,p.y+unit*.07);ctx.stroke();}
  if(n.kind==='goal'){
   const archY=p.y-unit*1.3;ctx.strokeStyle=l.theme[2];ctx.lineWidth=unit*.18;ctx.beginPath();ctx.moveTo(p.x-unit*.3,p.y);ctx.lineTo(p.x-unit*.3,archY+unit*.27);ctx.arc(p.x,archY+unit*.27,unit*.3,Math.PI,0);ctx.lineTo(p.x+unit*.3,p.y);ctx.stroke();ctx.strokeStyle=l.theme[1];ctx.lineWidth=unit*.11;ctx.stroke();
   ctx.fillStyle='#bd9757';ctx.beginPath();ctx.arc(p.x,archY-unit*.16,unit*.07,0,7);ctx.fill();
  }
  if(selected){const y=p.y-unit*.17;ctx.fillStyle='#405c5730';ctx.beginPath();ctx.ellipse(p.x,y+unit*.1,unit*.18,unit*.08,0,0,7);ctx.fill();poly([{x:p.x,y:y-unit*.6},{x:p.x-unit*.14,y:y+unit*.06},{x:p.x+unit*.14,y:y+unit*.06}],l.theme[4]);ctx.fillStyle='#fff8e8';ctx.beginPath();ctx.arc(p.x,y-unit*.64,unit*.1,0,7);ctx.fill();ctx.fillStyle=l.theme[4];ctx.beginPath();ctx.moveTo(p.x-unit*.14,y-unit*.68);ctx.lineTo(p.x+unit*.1,y-unit*.7);ctx.lineTo(p.x,y-unit*.96);ctx.closePath();ctx.fill();}
  this.hits.push({id:n.id,x:p.x,y:p.y,unit});
 }
 // A fine gold seam is drawn only when the projected bridge is actually traversable.
 for(const e of l.edges.filter(e=>e.view!==undefined&&e.view===state.view)){
  const a=P(l.nodes[e.a]),b=P(l.nodes[e.b]);ctx.strokeStyle=e.gate&&!(state.switches&e.gate)?'#a45139':'#b88a43';ctx.lineWidth=2;ctx.setLineDash(e.gate&&!(state.switches&e.gate)?[3,4]:[]);ctx.beginPath();ctx.moveTo(a.x+(b.x-a.x)*.47,a.y+(b.y-a.y)*.47);ctx.lineTo(a.x+(b.x-a.x)*.53,a.y+(b.y-a.y)*.53);ctx.stroke();ctx.setLineDash([]);
 }
 }
 hit(x,y){return this.hits.slice().reverse().find(p=>Math.abs(x-p.x)/p.unit+Math.abs(y-p.y)/(p.unit*.55)<.95)?.id;}
}
root.PrismRenderer=PrismRenderer;
})(window);
