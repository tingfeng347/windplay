(function (root) {
  'use strict';
  const E=root.EmberWilds, C={ink:'#272d22',grass:'#6c7450',soil:'#777950',paper:'#d4c398',bark:'#77704b',leaf:'#3e4f37',rock:'#979685'};
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  class Painter {
    constructor(canvas,map){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.map=map;this.mctx=map.getContext('2d');this.overlay=document.createElement('canvas');this.ow=this.overlay.getContext('2d');this.width=0;this.height=0;this.pointer=null;this.scale=1;this.lastMap=-1;this.resize();}
    resize(){this.width=innerWidth;this.height=innerHeight;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.overlay.width=this.canvas.width;this.overlay.height=this.canvas.height;this.scale=clamp(this.width/1250,.73,1.05);}
    toScreen(x,y){return{x:(x-this.camera.x)*this.scale+this.width/2,y:(y-this.camera.y)*this.scale*.66+this.height*.52};}
    toWorld(x,y){return{x:(x-this.width/2)/this.scale+this.camera.x,y:(y-this.height*.52)/(this.scale*.66)+this.camera.y};}
    path(points,fill,stroke=C.ink,width=2){const c=this.ctx;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
    line(points,color=C.ink,width=1.5){const c=this.ctx;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
    ellipse(x,y,rx,ry,color,stroke){const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();}}
    terrain(s){const c=this.ctx;c.fillStyle='#6d7350';c.fillRect(0,0,this.width,this.height);
      const startX=Math.floor((s.player.x-this.width/this.scale/2)/160)-1,endX=Math.ceil((s.player.x+this.width/this.scale/2)/160)+1;
      const startY=Math.floor((s.player.y-this.height/this.scale/.66/2)/160)-2,endY=Math.ceil((s.player.y+this.height/this.scale/.66/2)/160)+2;
      for(let gy=startY;gy<=endY;gy++)for(let gx=startX;gx<=endX;gx++){
        const p=this.toScreen(gx*160,gy*160),h=Math.sin(gx*72.35+gy*127.72),h2=Math.cos(gx*23.87-gy*81.39);
        this.ellipse(p.x,p.y,110*this.scale,66*this.scale,h>0?'#747955':'#666e4a');
        c.save();c.translate(p.x,p.y);c.scale(this.scale,this.scale);c.globalAlpha=.4;
        for(let i=0;i<9;i++){const xx=Math.sin(i*9.3+h*34)*95,yy=Math.cos(i*7.4+h2*12)*57;this.line([[xx-3,yy+4],[xx,yy-2],[xx+1,yy+4]],i%2?'#91936a':'#4c5838',.8);}
        c.restore();
      }
      // A winding pale path gives the wilderness a distinctive ink-map structure.
      c.strokeStyle='#a59b7139';c.lineWidth=74*this.scale;c.beginPath();for(let y=0;y<=E.SIZE;y+=50){const p=this.toScreen(1300+Math.sin(y/310)*170,y);y?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.stroke();
      c.strokeStyle='#c0b2801c';c.lineWidth=38*this.scale;c.stroke();
      const top=this.toScreen(0,0),bottom=this.toScreen(E.SIZE,E.SIZE);c.fillStyle='#303c2b';if(top.x>0)c.fillRect(0,0,top.x,this.height);if(bottom.x<this.width)c.fillRect(bottom.x,0,this.width-bottom.x,this.height);if(top.y>0)c.fillRect(0,0,this.width,top.y);if(bottom.y<this.height)c.fillRect(0,bottom.y,this.width,this.height-bottom.y);
    }
    tree(e,t){const c=this.ctx,v=e.variant||.5,lean=(v-.5)*16,shake=e.shake&&t-e.shake<.18?Math.sin((t-e.shake)*50)*4:0;c.translate(shake,0);
      this.ellipse(9,4,37,13,'#2633213d');
      this.path([[-8,0],[-5,-63],[lean-2,-100],[lean+6,-97],[6,-40],[13,0]],'#74633e');
      this.line([[-3,-6],[0,-54],[lean+2,-94]],'#a08c58',1.5);this.line([[1,-24],[-19,-54],[-30,-64]],C.ink,3);
      if(v<.55){
        this.path([[lean-1,-139],[-17,-113],[-9,-115],[-34,-91],[-23,-92],[-49,-61],[-21,-69],[-27,-50],[-4,-60],[0,-43],[16,-53],[37,-50],[27,-70],[50,-67],[32,-91],[40,-92],[16,-117],[22,-114]],'#405238',C.ink,2.1);
        this.line([[-25,-80],[-5,-74],[2,-88],[18,-81],[29,-83]],'#86916a',1);this.line([[-6,-102],[3,-117],[16,-101]],'#7a865d',1);this.line([[-13,-57],[-1,-66],[10,-56],[24,-61]],'#879065',1);
      }else{
        this.line([[lean,-70],[-19,-91],[-26,-112],[-20,-132]],C.ink,4);this.line([[lean+2,-81],[27,-104],[31,-127],[24,-141]],C.ink,4);this.line([[-16,-88],[-40,-90],[-49,-101]],C.ink,3);
        for(let i=0;i<9;i++){const x=Math.sin(i*3.7+v)*35,y=-101+Math.cos(i*1.8)*23;this.path([[x-19,y],[x-13,y-14],[x-1,y-20],[x+16,y-15],[x+23,y-2],[x+14,y+8],[x-7,y+10]],i%3===0?'#70704b':'#59623e',C.ink,1.6);this.line([[x-11,y-3],[x-2,y+1],[x+12,y-5]],'#939069',.7);}
      }
      this.line([[-15,3],[-5,0],[4,2],[15,0],[21,3]],'#303a25',1.3);
    }
    rock(e){this.ellipse(6,6,35,12,'#25332240');this.path([[-33,0],[-27,-23],[-10,-48],[15,-42],[33,-19],[27,4],[4,10]],'#898b78');this.path([[-10,-48],[2,-20],[33,-19],[15,-42]],'#a3a38d');this.line([[-27,-23],[-12,-17],[2,-20],[5,4]],'#555d4b',1.8);for(let i=0;i<5;i++)this.line([[-20+i*4,-13],[-24+i*4,-2]],'#535c46',.8);this.line([[9,-32],[18,-25],[22,-28]],'#ddd4ad',1);}
    grass(e){const c=this.ctx;this.ellipse(0,3,20,7,'#25332230');for(let i=0;i<7;i++){const x=(i-3)*4,h=17+(i%3)*7;this.path([[0,3],[x-9,-h*.6],[x-4,-h],[x,-5],[x+7,-h*.85],[x+4,3]],i%2?'#aa9e60':'#959556',C.ink,.7);}this.line([[-15,3],[0,5],[18,2]],'#4a5131',1.1);}
    berry(e){this.ellipse(0,3,24,8,'#25332230');for(let i=0;i<5;i++){const x=Math.sin(i*2.4)*18,y=-12+Math.cos(i*3.4)*10;this.path([[x-15,y+4],[x-12,y-11],[x,y-20],[x+15,y-9],[x+12,y+6]],'#525b38',C.ink,1.2);}for(let i=0;i<9;i++){const x=Math.sin(i*5.1)*19,y=-13+Math.cos(i*2.7)*13;this.ellipse(x,y,3.2,3.7,'#a66b55',C.ink);}this.line([[-3,2],[1,-16]],'#a3a475',1);}
    campfire(e,t){this.ellipse(0,3,38,15,'#26332149');for(let i=0;i<7;i++){const a=i*Math.PI/3.5;this.ellipse(Math.cos(a)*26,Math.sin(a)*10,9,6,'#898c76',C.ink);}this.line([[-21,8],[20,-5]],'#453d2c',6);this.line([[-19,-3],[19,9]],'#615035',6);
      if(e.fuel>0){const flick=Math.sin(t*9)*4;this.path([[-15,0],[-12,-14],[-18,-23],[-8,-18],[-4,-47-flick],[6,-30],[12,-39+flick],[17,-15],[12,4]],'#d6974e','#6b512f',1.3);this.path([[-8,2],[-7,-13],[-1,-28],[5,-12],[8,3]],'#f0d184',null);for(let i=0;i<3;i++){const tt=(t*.25+i*.34)%1;this.ellipse(Math.sin(tt*6+i)*9,-46-tt*42,7+tt*6,4+tt*4,`rgba(220,210,170,${(1-tt)*.22})`);}}
      else this.ellipse(0,-1,13,5,'#43453a');
    }
    shelter(){this.ellipse(0,7,51,17,'#27331f44');this.path([[-46,0],[-3,-80],[45,5],[14,12]],'#aaa073');this.path([[-46,0],[-3,-80],[1,6]],'#7b7955');this.path([[1,7],[-3,-64],[21,9]],'#383e2c');this.line([[-3,-84],[-3,-22]],'#2f3725',3);for(let i=0;i<7;i++)this.line([[12+i*4,-15-i*3],[28+i*2,2-i]],'#716d49',1);this.line([[-47,2],[46,9]],'#303927',3);}
    trap(e){this.ellipse(0,3,21,7,'#26332236');this.path([[-20,3],[-11,-22],[10,-24],[21,1],[0,8]],'#927744');for(let i=0;i<4;i++)this.line([[-12+i*8,-21],[-13+i*9,6]],'#d3bb83',2);this.line([[-18,-7],[17,-11]],'#473c2b',2);if(e.caught){this.ellipse(0,-4,7,7,'#c8bea4',C.ink);this.ellipse(-3,-15,2,9,'#c8bea4',C.ink);}}
    animal(e,t){this.ellipse(0,3,e.type==='rabbit'?12:24,7,'#2633213d');if(e.type==='rabbit'){const hop=Math.sin(t*7+e.id)*2;this.ellipse(0,-10-hop,12,11,'#bdbba0',C.ink);this.ellipse(9,-16-hop,7,7,'#cbc5aa',C.ink);this.ellipse(7,-30-hop,2.8,12,'#ccc4a5',C.ink);this.ellipse(13,-28-hop,2.7,11,'#ccc4a5',C.ink);this.ellipse(11,-18-hop,1.5,1.5,C.ink);this.ellipse(-10,-8-hop,4,4,'#e1d6b7',C.ink);}
      else if(e.type==='spider'){for(let i=0;i<4;i++){const y=-7-i*4;this.line([[-5,y],[-21-i*2,y-8],[-30,y+8]],'#282b24',2);this.line([[5,y],[21+i*2,y-8],[30,y+8]],'#282b24',2);}this.ellipse(0,-13,14,15,'#343e2e',C.ink);this.ellipse(0,-27,9,7,'#3d4431',C.ink);this.ellipse(-4,-29,2,2,'#daaa65');this.ellipse(4,-29,2,2,'#daaa65');}
      else{this.path([[-23,-2],[-22,-26],[-8,-31],[2,-27],[10,-47],[16,-33],[26,-36],[21,-15],[7,-7],[1,7],[-9,7]],'#4c4c38');this.path([[10,-47],[18,-50],[18,-35]],'#353c2b');this.ellipse(20,-30,2,2,'#d99d67');this.line([[-21,-20],[-38,-34],[-28,-8]],'#343e2c',4);this.line([[-13,0],[-15,9]],C.ink,4);this.line([[0,2],[1,11]],C.ink,4);}}
    player(p,t){const c=this.ctx,bob=p.walk?Math.sin(p.walk)*2:Math.sin(t*2)*.6;this.ellipse(0,5,18,7,'#25332261');c.translate(0,bob);const step=p.walk?Math.sin(p.walk)*4:0;this.line([[-6,-4],[-7,11+step]],'#252c25',5);this.line([[6,-4],[8,11-step]],'#252c25',5);
      this.path([[-14,-14],[-8,-38],[9,-38],[17,-13],[7,-5],[-9,-5]],'#cbbd90');this.path([[-10,-34],[-17,-12],[-9,-16],[-4,-32]],'#a49b76');this.line([[-7,-29],[-3,-14],[8,-12]],'#625f43',1.2);this.path([[-10,-38],[-7,-55],[5,-61],[12,-52],[10,-38],[2,-31]],'#d2bd8a');this.path([[-11,-45],[-14,-57],[-4,-67],[7,-62],[15,-57],[13,-43],[8,-52],[3,-47],[-3,-55]],'#2f3227');this.ellipse(5,-43,1.2,1.5,C.ink);
      this.path([[-10,-34],[8,-33],[11,-26],[-2,-28],[-16,-16],[-15,-27]],'#ac6650');this.line([[11,-24],[19,-9]],'#272e23',3);
      if(p.torch>0){this.line([[20,-5],[21,-33]],'#58462d',3);this.path([[17,-32],[17,-42],[21,-48-Math.sin(t*8)*3],[25,-38],[24,-30]],'#e7af59','#6c4f30',.7);}
      if(p.invulnerable>0){c.globalAlpha=.8;this.ellipse(0,-26,25,36,'#e7a67922');}
    }
    drawEntity(e,s){const p=this.toScreen(e.x,e.y);if(p.x< -100||p.x>this.width+100||p.y< -160||p.y>this.height+100)return;const c=this.ctx;c.save();c.translate(p.x,p.y);c.scale(this.scale,this.scale);
      if(this.hover===e.id||s.target&&s.target.id===e.id){this.ellipse(0,4,33,13,'#dbc38925','#d8c38b');}
      switch(e.type){case'tree':this.tree(e,s.time);break;case'rock':this.rock(e);break;case'grass':if(e.available)this.grass(e);else this.line([[-11,3],[-5,-3],[0,3],[6,-1],[10,2]],'#59603d');break;case'berry':if(e.available)this.berry(e);else{this.line([[-14,3],[0,-20],[13,3]],'#424c30',3);this.line([[0,-13],[-10,-20]],'#424c30',2);}break;case'branch':if(e.available){this.line([[-14,3],[16,-7]],'#3e3e29',4);this.line([[0,-2],[1,-13]],'#3e3e29',2);this.line([[-12,2],[14,-6]],'#b4a16c',1);}break;case'flint':if(e.available)this.path([[-9,3],[-7,-7],[5,-12],[11,-1],[4,6]],'#bab5a0');break;case'stump':this.path([[-11,2],[-10,-14],[8,-13],[11,3]],'#6e6645');this.ellipse(-1,-13,9,4,'#a99562',C.ink);break;case'rubble':this.path([[-20,0],[-12,-8],[-2,-3],[7,-10],[19,-1],[10,5]],'#898b75',C.ink,1);break;case'campfire':this.campfire(e,s.time);break;case'shelter':this.shelter();break;case'trap':this.trap(e);break;case'rabbit':case'wolf':case'spider':this.animal(e,s.time);break;case'player':this.player(s.player,s.time);break;case'dead':this.ellipse(0,1,13,4,'#534633');break;}
      if(['spider','wolf'].includes(e.type)&&E.distance(e,s.player)<240){c.fillStyle='#353a28';c.fillRect(-18,-58,36,3);c.fillStyle='#ba8c67';c.fillRect(-18,-58,36*clamp(e.health/40,0,1),3);}
      c.restore();}
    night(s){const c=this.ow;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);const f=s.time%E.DAY,opacity=s.phase==='day'?0:s.phase==='dusk'?(f-120)/30*.76:.88;if(opacity<=0)return;c.fillStyle=`rgba(13,19,14,${opacity})`;c.fillRect(0,0,this.width,this.height);c.globalCompositeOperation='destination-out';
      const hole=(x,y,r)=>{const p=this.toScreen(x,y),radius=r*this.scale;const g=c.createRadialGradient(p.x,p.y-15,0,p.x,p.y-15,radius);g.addColorStop(0,'rgba(0,0,0,.99)');g.addColorStop(.45,'rgba(0,0,0,.96)');g.addColorStop(.8,'rgba(0,0,0,.6)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.beginPath();c.ellipse(p.x,p.y-15,radius,radius*.82,0,0,Math.PI*2);c.fill();};
      s.entities.filter(e=>e.type==='campfire'&&e.fuel>0).forEach(e=>hole(e.x,e.y,220));if(s.player.torch>0)hole(s.player.x,s.player.y,140);else hole(s.player.x,s.player.y,36);c.globalCompositeOperation='source-over';this.ctx.drawImage(this.overlay,0,0,this.width,this.height);
      if(s.player.darkness>1){this.ctx.fillStyle=`rgba(113,53,30,${Math.min(.15,s.player.darkness*.008)})`;this.ctx.fillRect(0,0,this.width,this.height);}
    }
    minimap(s){if(s.time-this.lastMap<.2)return;this.lastMap=s.time;const c=this.mctx,size=156,k=size/E.SIZE;c.fillStyle='#515b3d';c.fillRect(0,0,size,size);for(const e of s.entities){if(e.available===false)continue;c.fillStyle=e.type==='tree'?'#303f2a':e.type==='rock'?'#9a9b80':e.type==='berry'?'#a06c54':e.type==='campfire'?'#e6b773':e.type==='shelter'?'#d6c195':null;if(!c.fillStyle||!['tree','rock','berry','campfire','shelter'].includes(e.type))continue;c.fillRect(e.x*k-1,e.y*k-1,e.type==='campfire'?4:2,e.type==='campfire'?4:2);}c.strokeStyle='#c0c0a755';c.lineWidth=1;c.strokeRect((s.player.x-this.width/2/this.scale)*k,(s.player.y-this.height/2/this.scale/.66)*k,this.width/this.scale*k,this.height/this.scale/.66*k);c.fillStyle='#eee1bc';c.beginPath();c.arc(s.player.x*k,s.player.y*k,3,0,Math.PI*2);c.fill();c.strokeStyle='#272d22';c.stroke();}
    render(s){this.camera={x:s.player.x,y:s.player.y};const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.lineJoin='round';c.lineCap='round';this.terrain(s);
      this.hover=null;if(this.pointer){const world=this.toWorld(this.pointer.x,this.pointer.y);let d=60;for(const e of s.entities){if(e.available===false||['stump','rubble','dead'].includes(e.type))continue;const dd=Math.hypot(world.x-e.x,world.y-e.y+35);if(dd<d){d=dd;this.hover=e.id;}}}
      const objects=[...s.entities,{id:0,type:'player',x:s.player.x,y:s.player.y}];objects.sort((a,b)=>a.y-b.y).forEach(e=>this.drawEntity(e,s));
      if(s.target&&!s.target.id){const p=this.toScreen(s.target.x,s.target.y);this.ellipse(p.x,p.y,8*this.scale,4*this.scale,'#dcc08a22','#dac28b');}
      this.night(s);
      if(s.weather==='rain'){c.strokeStyle='#b5c0aa50';c.lineWidth=.8;for(let i=0;i<75;i++){const x=(i*113.77+s.time*71)%this.width,y=(i*57.36+s.time*480)%this.height;c.beginPath();c.moveTo(x,y);c.lineTo(x-8,y+17);c.stroke();}}
      const vignette=c.createRadialGradient(this.width/2,this.height*.5,this.height*.25,this.width/2,this.height*.5,Math.max(this.width,this.height)*.65);vignette.addColorStop(0,'#1b271100');vignette.addColorStop(1,'#15211066');c.fillStyle=vignette;c.fillRect(0,0,this.width,this.height);this.minimap(s);this.canvas.style.cursor=this.hover?'pointer':'crosshair';}
  }
  root.EmberPainter=Painter;
})(globalThis);
