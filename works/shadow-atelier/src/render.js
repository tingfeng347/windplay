(function (root) {
  'use strict';
  const C = root.ShadowCore;
  const WALL = -3.8, FLOOR = -3.12;
  const faceColors=['#676980','#5d5f78','#555970','#73738b','#62647d'];
  const path = (ctx,points) => {ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();};
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  function drawReference(canvas,level) {
    const ctx=canvas.getContext('2d'),size=canvas.width;
    ctx.clearRect(0,0,size,size);ctx.fillStyle='#efeadc';ctx.fillRect(0,0,size,size);
    ctx.fillStyle='#4c4c60';
    for(const polygon of level.targetPolygons){path(ctx,polygon.map(([x,y])=>[size/2+x*size/5.6,size/2-y*size/5.6]));ctx.fill();}
  }
  class Renderer {
    constructor(canvas) {this.canvas=canvas;this.ctx=canvas.getContext('2d');this.width=0;this.height=0;this.ratio=1;}
    resize() {
      const rect=this.canvas.getBoundingClientRect();
      const ratio=Math.min(root.devicePixelRatio||1,2),width=Math.max(1,rect.width),height=Math.max(1,rect.height);
      if(width===this.width&&height===this.height&&ratio===this.ratio)return;
      this.width=width;this.height=height;this.ratio=ratio;
      this.canvas.width=Math.round(width*ratio);this.canvas.height=Math.round(height*ratio);
    }
    draw(level,angles,projection,solved=false) {
      this.resize();
      const ctx=this.ctx,w=this.width,h=this.height;
      ctx.setTransform(this.ratio,0,0,this.ratio,0,0);
      const small=w<500,scale=Math.min(w/(small?11.9:12.4),h/8.5);
      const ox=w*(small?.59:.57),oy=h*.46;
      const screen=p=>[ox+(p[0]+p[2]*.73)*scale,oy+(-p[1]+p[2]*.27)*scale];
      ctx.clearRect(0,0,w,h);
      const plaster=ctx.createLinearGradient(0,0,w,h);plaster.addColorStop(0,'#d6cfbf');plaster.addColorStop(.65,'#e4ddce');plaster.addColorStop(1,'#c9c0af');ctx.fillStyle=plaster;ctx.fillRect(0,0,w,h);
      // Exhibition wall and floor form a fixed, oblique view. The cast shadow is
      // projected onto that wall before the camera projection is applied.
      const wallPoints=[[-8,FLOOR,WALL],[8,FLOOR,WALL],[8,7,WALL],[-8,7,WALL]].map(screen);
      path(ctx,wallPoints);ctx.fillStyle='#d9d0bd';ctx.fill();
      const spot=screen([0,0,WALL]);
      ctx.save();path(ctx,wallPoints);ctx.clip();
      const light=ctx.createRadialGradient(spot[0],spot[1],scale*.3,spot[0],spot[1],scale*3.45);
      light.addColorStop(0,'#fbf5dc');light.addColorStop(.7,'#eee4c8');light.addColorStop(1,'#d9d0bd');
      ctx.fillStyle=light;ctx.fillRect(0,0,w,h);
      // A faint plaster texture belongs to the scene, not to the controls.
      ctx.fillStyle='#7e725a';ctx.globalAlpha=.035;
      for(let i=0;i<155;i++){const x=(i*167.31)%w,y=(i*91.17)%h;ctx.fillRect(x,y,1,1);}
      ctx.globalAlpha=1;ctx.fillStyle=solved?'#505062':'#646171';
      for(const polygon of projection.polygons){path(ctx,polygon.map(([x,y])=>screen([x,y,WALL+.003])));ctx.fill();}
      ctx.restore();
      const floorPoints=[[-8,FLOOR,WALL],[8,FLOOR,WALL],[8,FLOOR,11],[-8,FLOOR,11]].map(screen);
      path(ctx,floorPoints);const floor=ctx.createLinearGradient(0,h*.6,0,h);floor.addColorStop(0,'#c2b39e');floor.addColorStop(1,'#b4a28a');ctx.fillStyle=floor;ctx.fill();
      path(ctx,[[-8,FLOOR,WALL],[8,FLOOR,WALL],[8,FLOOR+.085,WALL],[-8,FLOOR+.085,WALL]].map(screen));ctx.fillStyle='#a99c88';ctx.fill();
      ctx.strokeStyle='#aa9b84';ctx.lineWidth=1;ctx.globalAlpha=.37;
      for(let x=-10;x<=10;x+=1.6){ctx.beginPath();ctx.moveTo(...screen([x,FLOOR,WALL]));ctx.lineTo(...screen([x,FLOOR,10]));ctx.stroke();}ctx.globalAlpha=1;
      const pedestalCenter=screen([0,FLOOR+.1,.25]);
      ctx.save();ctx.translate(...pedestalCenter);ctx.scale(1,.31);const drop=ctx.createRadialGradient(0,0,scale*.6,0,0,scale*2.8);drop.addColorStop(0,'#79695288');drop.addColorStop(1,'#79695200');ctx.fillStyle=drop;ctx.beginPath();ctx.ellipse(scale*.4,scale*.25,scale*3,scale*2,0,0,Math.PI*2);ctx.fill();ctx.restore();
      this.drawPedestal(ctx,screen,scale);
      this.drawLamp(ctx,screen,scale);
      const faces=[],camera=[-.73,.27,1];
      for(const block of C.rotatedBlocks(level,angles))for(const ids of C.FACE_INDICES) {
        const vertices=ids.map(i=>block.vertices[i]);
        const a=vertices[0],b=vertices[1],d=vertices[2],ab=b.map((v,i)=>v-a[i]),ad=d.map((v,i)=>v-a[i]);
        const normal=[ab[1]*ad[2]-ab[2]*ad[1],ab[2]*ad[0]-ab[0]*ad[2],ab[0]*ad[1]-ab[1]*ad[0]];
        if(dot(normal,camera)<=0)continue;
        const length=Math.hypot(...normal),illumination=.6+.4*Math.max(0,normal[2]/length);
        const center=[0,1,2].map(i=>vertices.reduce((sum,p)=>sum+p[i],0)/4);
        faces.push({vertices,depth:dot(center,camera),illumination,tint:block.tint});
      }
      faces.sort((a,b)=>a.depth-b.depth);
      ctx.lineJoin='round';ctx.lineWidth=Math.max(.35,scale*.007);
      for(const face of faces) {
        path(ctx,face.vertices.map(screen));ctx.fillStyle=faceColors[face.tint];ctx.fill();
        ctx.fillStyle=`rgba(24,23,43,${(1-face.illumination)*.7})`;ctx.fill();
        ctx.strokeStyle='#2e31464a';ctx.stroke();
      }
      // A quiet exhibit label is anchored to the wooden base.
      const label=screen([.35,-2.74,1.7]);ctx.save();ctx.translate(...label);ctx.rotate(-.02);ctx.fillStyle='#e4d7bc';ctx.fillRect(-scale*.62,0,scale*1.22,scale*.25);ctx.fillStyle='#5a5145';ctx.font=`${Math.max(8,scale*.1)}px "PingFang SC",sans-serif`;ctx.textAlign='center';ctx.fillText(`影子 ${String(level.index+1).padStart(2,'0')}`,0,scale*.17);ctx.restore();
      if(small) {
        // The reference remains in sight while the mobile controls scroll.
        const center=[w-48,48],radius=35;
        ctx.fillStyle='#efe8d8';ctx.beginPath();ctx.arc(...center,radius,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#4c4c60';
        for(const polygon of level.targetPolygons){path(ctx,polygon.map(([x,y])=>[center[0]+x*12,center[1]-y*12]));ctx.fill();}
        ctx.font='12px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.fillStyle='#454149';ctx.fillText('目标',center[0],97);
      }
    }
    drawPedestal(ctx,screen,scale) {
      const ring=(y,r)=>Array.from({length:42},(_,i)=>{const t=i/42*Math.PI*2;return [Math.cos(t)*r,y,Math.sin(t)*r+.35];});
      const top=ring(-2.72,1.7),bottom=ring(-3.1,1.7);
      for(let i=0;i<42;i++){const n=(i+1)%42;if(Math.sin(i/42*Math.PI*2)>.25){path(ctx,[top[i],top[n],bottom[n],bottom[i]].map(screen));ctx.fillStyle=i%5===0?'#9f7d5c':'#ad8966';ctx.fill();}}
      path(ctx,top.map(screen));ctx.fillStyle='#ccb08b';ctx.fill();ctx.strokeStyle='#9a7b5c';ctx.lineWidth=1;ctx.stroke();
      for(const r of [1.2,1.35,1.55]){path(ctx,ring(-2.715,r).map(screen));ctx.strokeStyle='#b99b7780';ctx.lineWidth=.6;ctx.stroke();}
      // Fine dark pivot connects the sculpture to its plinth without casting an
      // additional puzzle shadow; it is a separate piece of gallery furniture.
      const a=screen([0,-2.71,0]),b=screen([0,-2.28,0]);ctx.strokeStyle='#666473';ctx.lineWidth=Math.max(2,scale*.045);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
    }
    drawLamp(ctx,screen,scale) {
      const foot=screen([-3.15,FLOOR,3.15]),head=screen([-3.15,2.75,3.15]);
      ctx.strokeStyle='#7b756c';ctx.lineWidth=Math.max(3,scale*.06);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...foot);ctx.lineTo(...head);ctx.stroke();
      const left=screen([-3.48,FLOOR,3.05]),right=screen([-2.82,FLOOR,3.25]);ctx.beginPath();ctx.moveTo(...left);ctx.lineTo(...right);ctx.stroke();
      ctx.save();ctx.translate(...head);ctx.rotate(-.23);ctx.fillStyle='#777476';ctx.beginPath();ctx.moveTo(-scale*.36,-scale*.21);ctx.lineTo(scale*.37,-scale*.13);ctx.lineTo(scale*.5,scale*.14);ctx.lineTo(-scale*.4,scale*.2);ctx.closePath();ctx.fill();ctx.strokeStyle='#47484f';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#fff3ca';ctx.beginPath();ctx.ellipse(-scale*.37,0,scale*.055,scale*.17,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
  root.ShadowRender=Object.freeze({Renderer,drawReference});
})(typeof globalThis!=='undefined'?globalThis:this);
