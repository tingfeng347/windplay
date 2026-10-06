(function(root){
 'use strict';
 const C=root.StrikeCore,faces=[{n:[1,0,0],p:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]]},{n:[-1,0,0],p:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]]},{n:[0,1,0],p:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]},{n:[0,-1,0],p:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]},{n:[0,0,1],p:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]},{n:[0,0,-1],p:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]}];
 const palette={concrete:[.86,.85,.77],warehouse:[.73,.77,.73],steel:[.72,.76,.75],darkSteel:[.31,.35,.36],rust:[.77,.45,.26],blue:[.36,.52,.57],olive:[.49,.53,.4],wood:[.77,.68,.48],sand:[.62,.58,.46]};
 function hash(a,b,s){let h=Math.imul(a+101,374761393)^Math.imul(b+211,668265263)^s;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967295;}
 function textures(){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),base=[[180,181,173],[82,90,89],[152,163,162],[152,157,149],[167,118,85],[151,128,91],[67,77,80],[255,255,255],[200,173,96],[128,142,141],[241,234,207],[47,51,48],[93,110,107],[185,178,149],[210,218,209],[255,255,255]];
  for(let tile=0;tile<16;tile++){const ox=tile%4*64,oy=Math.floor(tile/4)*64;for(let y=0;y<64;y++)for(let x=0;x<64;x++){const n=(hash(x,y,tile*113+919)-.5)*(tile===7?0:tile===1?28:18);ctx.fillStyle=`rgb(${base[tile].map(v=>Math.round(v+n)).join(',')})`;ctx.fillRect(ox+x,oy+y,1,1);}
   ctx.strokeStyle='rgba(30,36,34,.25)';ctx.lineWidth=1;
   if([0,3,5,6].includes(tile)){ctx.strokeRect(ox+.5,oy+.5,63,63);ctx.beginPath();ctx.moveTo(ox,oy+31.5);ctx.lineTo(ox+64,oy+31.5);ctx.stroke();}
   if(tile===1){ctx.strokeStyle='rgba(26,30,30,.4)';ctx.beginPath();ctx.moveTo(ox+4,oy+64);ctx.lineTo(ox+11,oy+39);ctx.lineTo(ox+7,oy+26);ctx.lineTo(ox+21,oy+18);ctx.lineTo(ox+26,oy);ctx.stroke();}
   if(tile===2||tile===4){for(let x=0;x<64;x+=16){ctx.fillStyle='rgba(0,0,0,.13)';ctx.fillRect(ox+x,oy,2,64);ctx.fillStyle='rgba(255,255,255,.11)';ctx.fillRect(ox+x+2,oy,1,64);}}
   if(tile===5){for(let y=0;y<64;y+=8){ctx.fillStyle='rgba(0,0,0,.15)';ctx.fillRect(ox,oy+y,64,1);}for(let n=0;n<5;n++){ctx.strokeStyle='rgba(54,37,18,.24)';ctx.strokeRect(ox+n*12,oy+13+n*6,9,1);}}
   if(tile===8){ctx.fillStyle='#202925';for(let x=-64;x<128;x+=26){ctx.beginPath();ctx.moveTo(ox+x,oy);ctx.lineTo(ox+x+13,oy);ctx.lineTo(ox+x+77,oy+64);ctx.lineTo(ox+x+64,oy+64);ctx.closePath();ctx.fill();}}
   if(tile===9){ctx.strokeStyle='#465453';for(let y=0;y<64;y+=8){ctx.beginPath();ctx.moveTo(ox,oy+y);ctx.lineTo(ox+64,oy+y);ctx.stroke();}for(let x=0;x<64;x+=8){ctx.beginPath();ctx.moveTo(ox+x,oy);ctx.lineTo(ox+x,oy+64);ctx.stroke();}}
   if(tile===12){ctx.fillStyle='rgba(216,234,232,.16)';ctx.beginPath();ctx.moveTo(ox+10,oy);ctx.lineTo(ox+30,oy);ctx.lineTo(ox+64,oy+50);ctx.lineTo(ox+64,oy+64);ctx.closePath();ctx.fill();}
   if(tile===15){ctx.fillStyle='#283b39';ctx.fillRect(ox,oy,64,64);ctx.fillStyle='#e0d8b1';ctx.textAlign='center';ctx.font='700 10px sans-serif';ctx.fillText('YARD',ox+32,oy+15);ctx.font='800 28px sans-serif';ctx.fillText('04',ox+32,oy+43);ctx.font='600 6px sans-serif';ctx.fillText('INDUSTRIAL ZONE',ox+32,oy+55);}
  }return c;
 }
 function quad(out,points,normal,color=[1,1,1],tile=7,scale=[1,1],glow=0){const uv=[[0,scale[1]],[scale[0],scale[1]],[scale[0],0],[0,0]];for(const i of[0,1,2,0,2,3])out.push(...points[i],...normal,...uv[i],...color,tile,glow);}
 function box(out,x,y,z,w,h,d,color=[1,1,1],tile=7,glow=0){for(const[i,f]of faces.entries())quad(out,f.p.map(p=>[x+p[0]*w,y+p[1]*h,z+p[2]*d]),f.n,color,tile,i<2?[d/2,h/2]:i<4?[w/2,d/2]:[w/2,h/2],glow);}
 function cylinder(out,x,y,z,r,h,color,tile=2,segments=12){
  for(let n=0;n<segments;n++){const a=n/segments*Math.PI*2,b=(n+1)/segments*Math.PI*2,aa=[x+Math.cos(a)*r,z+Math.sin(a)*r],bb=[x+Math.cos(b)*r,z+Math.sin(b)*r],normal=[Math.cos((a+b)/2),0,Math.sin((a+b)/2)];quad(out,[[aa[0],y,aa[1]],[bb[0],y,bb[1]],[bb[0],y+h,bb[1]],[aa[0],y+h,aa[1]]],normal,color,tile,[r,h/2]);quad(out,[[x,y+h,z],[aa[0],y+h,aa[1]],[bb[0],y+h,bb[1]],[x,y+h,z]],[0,1,0],color,tile);}
 }
 function pipe(out,x,y,z,r,length,axis,color){const temp=[];cylinder(temp,0,0,0,r,length,color,2,10);for(let i=0;i<temp.length;i+=13){let p=[temp[i],temp[i+1],temp[i+2]],n=[temp[i+3],temp[i+4],temp[i+5]];if(axis==='z'){p=[p[0],p[2],p[1]];n=[n[0],n[2],n[1]];}if(axis==='x'){p=[p[1],p[0],p[2]];n=[n[1],n[0],n[2]];}out.push(x+p[0],y+p[1],z+p[2],...n,...temp.slice(i+6,i+13));}}
 function ellipsoid(out,x,y,z,rx,ry,rz,color,tile=6){
  for(let ring=0;ring<7;ring++)for(let n=0;n<12;n++){
   const point=(r,a)=>{const phi=r/7*Math.PI,theta=a/12*Math.PI*2;return [x+Math.sin(phi)*Math.cos(theta)*rx,y+Math.cos(phi)*ry,z+Math.sin(phi)*Math.sin(theta)*rz];};
   const points=[point(ring,n),point(ring,n+1),point(ring+1,n+1),point(ring+1,n)],center=points.reduce((a,p)=>a.map((v,i)=>v+p[i]/4),[0,0,0]),normal=norm([(center[0]-x)/rx,(center[1]-y)/ry,(center[2]-z)/rz]);
   quad(out,points,normal,color,tile,[.2,.2]);
  }
 }
 function limb(out,a,b,r,color,tile=6){
  const temp=[],axis=norm(b.map((v,i)=>v-a[i])),right=norm(cross(Math.abs(axis[1])>.9?[1,0,0]:[0,1,0],axis)),forward=cross(axis,right),length=Math.hypot(...b.map((v,i)=>v-a[i]));cylinder(temp,0,0,0,r,length,color,tile,10);
  for(let i=0;i<temp.length;i+=13){const p=temp.slice(i,i+3),n=temp.slice(i+3,i+6);for(let j=0;j<3;j++)temp[i+j]=a[j]+right[j]*p[0]+axis[j]*p[1]+forward[j]*p[2];for(let j=0;j<3;j++)temp[i+3+j]=right[j]*n[0]+axis[j]*n[1]+forward[j]*n[2];}out.push(...temp);
 }
 function scene(map){
  const out=[];box(out,-12,-.4,-12,88,.4,80,[.95,.98,.93],1);
  // Flat projected shadows anchor the architecture in the afternoon light.
  for(const o of map.objects)if(o.h>1&&o.kind!=='gate'){
   const {x,z,w,d,h}=o;quad(out,[[x,.011,z],[x+w,.011,z],[x+w+h*.38,.011,z+d+h*.17],[x+h*.38,.011,z+d+h*.17]],[0,1,0],[.63,.66,.62],1,[w/2,d/2]);
  }
  // Industrial road markings, storm drains and weathered concrete curbs.
  for(let z=5;z<54;z+=7)box(out,31,.006,z,.15,.01,3.4,[.86,.85,.67],10);
  for(let z=7;z<52;z+=13)box(out,12.5,.012,z,1,.018,.7,[.45,.5,.48],9);
  for(let x=14;x<50;x+=5)box(out,x,.007,49,2,.01,.12,[.8,.8,.67],10);
  for(const o of map.objects){const c=palette[o.color]||[1,1,1],{x,y,z,w,h,d}=o;
   if(o.kind==='silo'){cylinder(out,x+w/2,y,z+d/2,w/2,h,c,2,24);cylinder(out,x+w/2,h,z+d/2,w/2+.12,.15,[.55,.6,.57],2,24);for(let yy=2;yy<h;yy+=3)cylinder(out,x+w/2,yy,z+d/2,w/2+.035,.045,[.35,.42,.4],2,24);box(out,x+w-.08,0,z+d/2-.12,.12,h,.24,[.34,.4,.39],2);continue;}
   if(o.kind==='barrel'){cylinder(out,x+w/2,y,z+d/2,w/2,h,c,o.color==='rust'?4:2,16);cylinder(out,x+w/2,.12,z+d/2,w/2+.014,.055,[.3,.35,.34]);cylinder(out,x+w/2,h-.15,z+d/2,w/2+.014,.055,[.3,.35,.34]);continue;}
   if(o.kind==='gate'){box(out,x,0,z,w,h,d,[.35,.42,.39],9);for(let xx=x;xx<x+w;xx+=.4)box(out,xx,0,z,.04,h,.04,[.38,.43,.4]);continue;}
   const tile=o.kind==='crate'?5:o.kind==='boundary'||o.kind==='office'||o.kind==='shed'?0:o.color==='rust'?4:o.color==='wood'?5:2;
   box(out,x,y,z,w,h,d,c,tile);
   if(o.kind==='warehouse'){
    box(out,x-.25,h,z-.25,w+.5,.35,d+.5,[.31,.37,.35],2);
    const side=x<20?x+w:x-.15;
    for(let zz=z;zz<z+d;zz+=1.3)box(out,side,0,zz,.14,h,.1,[.54,.61,.57],2);
    for(let zz=z+3;zz<z+d-3;zz+=7){box(out,side+(x<20?.14:-.09),.1,zz,.06,4.1,4.5,[.33,.4,.36],2);box(out,side+(x<20?.21:-.12),4.9,zz,.04,1.3,4.5,[.44,.56,.56],12);}
    pipe(out,side+(x<20?.38:-.3),5,z+1,.19,d-2,'z',[.64,.67,.61]);
    const signX=side+(x<20?.24:-.16);quad(out,x<20?[[signX,4,z+5],[signX,4,z+2],[signX,5.5,z+2],[signX,5.5,z+5]]:[[signX,4,z+2],[signX,4,z+5],[signX,5.5,z+5],[signX,5.5,z+2]],x<20?[1,0,0]:[-1,0,0],[1,1,1],15,[1,1]);
    for(let zz=z+2;zz<z+d;zz+=6){box(out,side,4.85,zz,.6,.1,.15,[.35,.4,.37]);box(out,side+(x<20?.6:-.6),4.77,zz,.17,.35,.38,[.9,.88,.69],14,1);}
   }
   if(o.kind==='office'){
    box(out,x-.12,h,z-.12,w+.24,.2,d+.24,[.31,.36,.34],2);
    for(let xx=x+1;xx<x+w-1;xx+=2.5)for(let yy=2;yy<6;yy+=2){box(out,xx,yy,z+d+.02,1.4,1.15,.06,[.36,.48,.49],12);box(out,xx+.64,yy,z+d+.09,.07,1.15,.06,[.53,.6,.57]);}
    box(out,x+w+.015,0,z+d/2-1,.06,2.6,1.8,[.29,.36,.33],2);
   }
   if(o.kind==='container'){
    box(out,x-.06,h-.12,z-.06,w+.12,.17,d+.12,c,2);for(let zz=z+.22;zz<z+d;zz+=.42){box(out,x-.028,.12,zz,.055,h-.28,.065,c,2);box(out,x+w-.028,.12,zz,.055,h-.28,.065,c,2);}
    box(out,x+.08,.15,z+d+.025,w-.16,h-.28,.055,c,2);for(const xx of[x+.13,x+w/2,x+w-.16])box(out,xx,.1,z+d+.08,.055,h-.14,.065,[.42,.47,.41],2);
    for(const yy of[.16,h-.22])box(out,x+.1,yy,z+d+.075,w-.2,.045,.07,[.36,.41,.36],2);
    box(out,x+.35,1.5,z+d+.095,1.35,.38,.015,[.88,.86,.65],8);
   }
   if(o.kind==='crate'){
    for(const xx of[x,x+w-.1])box(out,xx,y,z+d+.013,.1,h,.06,[.39,.34,.23],5);for(const yy of[y,y+h-.12])box(out,x,yy,z+d+.014,w,.12,.065,[.5,.42,.26],5);
    box(out,x+.6,y+.6,z+d+.09,.3,.3,.02,[.7,.68,.43],8);
   }
   if(o.kind==='barrier'){box(out,x+.05,.4,z+d+.009,w-.1,.32,.018,[.98,.95,.8],8);}
   if(o.kind==='shed'){box(out,x-.15,h,z-.15,w+.3,.15,d+.3,[.28,.32,.3],2);box(out,x+2,0,z+d+.02,1.5,2.35,.06,[.32,.36,.32],2);box(out,x+w+.02,1.5,z+1,.04,.65,2,[.22,.33,.31],9);}
   if(o.kind==='sandbag'){for(let xx=x;xx<x+w;xx+=.65)for(let yy=0;yy<.8;yy+=.25)box(out,xx,yy,z,.59,.24,d,[.66,.61,.44],13);}
   if(o.kind==='truck'||o.kind==='truckCab'){
    if(o.kind==='truckCab')box(out,x+.2,1.6,z-.02,w-.4,.8,.035,[.28,.4,.41],12);
    for(const zz of[z+.7,z+d-.8])for(const xx of[x-.13,x+w-.03])pipe(out,xx,.48,zz,.47,.15,'x',[.13,.16,.15]);
   }
   if(o.kind==='step')box(out,x,y+h+.008,z,w,.012,.08,[.86,.78,.48],10);
  }
  // Pipe bridge, railings, antenna, floodlights and perimeter details.
  pipe(out,12,7.8,11,.23,39,'x',[.57,.63,.6]);for(const x of[13,37,49]){box(out,x,0,10.6,.13,7.8,.13,[.35,.41,.39],2);box(out,x,0,11.4,.13,7.8,.13,[.35,.41,.39],2);}
  for(const x of[26.1,34.8]){for(let z=19;z<25;z+=1.5)box(out,x,3.2,z,.04,.9,.04,[.6,.66,.63]);pipe(out,x,4.1,19,.03,6,'z',[.63,.68,.65]);}
  for(const[x,z]of[[25,11],[48,37],[17,49]]){box(out,x,0,z,.13,6,.13,[.36,.42,.39],2);box(out,x-.4,5.8,z-.35,1,.3,.45,[.24,.29,.26]);box(out,x-.33,5.72,z-.28,.85,.08,.34,[.93,.91,.73],14,1);}
  for(let i=0;i<18;i++){const x=3+i*3.7;box(out,x,4.01,55.5,.04,1.2,.04,[.5,.55,.5]);}pipe(out,2.7,4.9,55.5,.025,61,'x',[.53,.57,.53]);
  // Distant skyline gives the map a city-scale horizon without colliding with the arena.
  for(let i=0;i<18;i++){const x=-32+i*7.6,z=-20-(i%3)*9,h=7+(i*13%16);box(out,x,0,z,6,h,8,[.48,.55,.55],3);}
  return out;
 }
 function soldier(out,bot,time){
  const local=[],walk=Math.sin(bot.walk*6)*.14,dead=bot.health<=0;
  if(dead){box(out,bot.x-.36,.1,bot.z-.7,.7,.25,1.4,[.33,.38,.3],6);}else{
   // Rounded helmet, cloth limbs, tactical plate carrier and compact rifle.
   ellipsoid(local,0,1.55,0,.17,.21,.16,[.62,.5,.37],7);ellipsoid(local,0,1.66,.015,.2,.16,.18,[.3,.37,.32],6);box(local,-.175,1.55,-.175,.35,.07,.035,[.12,.19,.18],12);ellipsoid(local,0,1.46,-.06,.155,.075,.13,[.22,.28,.23],6);
   box(local,-.225,.73,-.15,.45,.64,.3,[.36,.43,.35],6);box(local,-.24,.84,-.185,.48,.38,.07,[.19,.25,.21],2);
   for(const x of[-.135,.135]){const offset=walk*(x<0?1:-1),hip=[x,.78,0],knee=[x,.43,offset],ankle=[x,.14,-offset];limb(local,hip,knee,.105,[.31,.38,.29]);limb(local,knee,ankle,.09,[.31,.38,.29]);ellipsoid(local,...knee,.11,.1,.11,[.22,.29,.23]);box(local,x-.095,.035,-offset-.2,.19,.14,.33,[.16,.2,.18],6);}
   for(const [shoulder,elbow,hand]of [[[-.27,1.28,0],[-.36,1.02,-.14],[-.12,1.02,-.59]],[[.27,1.28,0],[.35,.99,-.05],[.09,1.02,-.34]]]){limb(local,shoulder,elbow,.082,[.35,.42,.34]);limb(local,elbow,hand,.075,[.35,.42,.34]);ellipsoid(local,...hand,.083,.08,.09,[.19,.25,.21]);}
   box(local,-.13,.96,-.78,.22,.12,.65,[.12,.17,.16],2);pipe(local,-.01,1.04,-1.03,.025,.35,'z',[.13,.17,.15]);box(local,.05,.81,-.55,.08,.18,.12,[.11,.15,.13]);
   for(let i=0;i<local.length;i+=13){const x=local[i],y=local[i+1],z=local[i+2],nx=local[i+3],nz=local[i+5],a=bot.heading;out.push(bot.x+Math.cos(a)*x-Math.sin(a)*z,bot.y+y,bot.z+Math.sin(a)*x+Math.cos(a)*z,Math.cos(a)*nx-Math.sin(a)*nz,local[i+4],Math.sin(a)*nx+Math.cos(a)*nz,...local.slice(i+6,i+13));}
  }
 }
 function weaponMesh(id,aim,reload,recoil,time,moving){
  const out=[],shift=-.18*aim,raise=aim*(id==='rifle'?.05:.145),drop=reload>0?Math.sin(reload*2)*.15:0,bob=moving?Math.sin(time*9)*.007:0,x=.18+shift,y=-.27+raise-drop+bob,z=.52-recoil*1.3;
  const dark=[.14,.18,.19],metal=[.25,.3,.3],cloth=[.34,.4,.35],glove=[.21,.25,.22];
  if(id==='rifle'){
   box(out,x-.07,y,z,.14,.12,.56,dark,2);box(out,x-.065,y+.12,z+.08,.13,.035,.4,metal,9);
   box(out,x-.045,y-.17,z+.2,.09,.2,.11,dark,6);box(out,x-.045,y-.17,z+.05,.07,.15,.07,[.24,.28,.26],2);
   pipe(out,x,y+.065,z+.54,.027,.32,'z',dark);pipe(out,x,y+.065,z+.84,.033,.05,'z',metal);
   box(out,x-.075,y+.035,z+.32,.15,.08,.21,metal,9);
   box(out,x-.038,y+.145,z+.18,.016,.085,.055,[.12,.16,.15],2);box(out,x+.022,y+.145,z+.18,.016,.085,.055,[.12,.16,.15],2);box(out,x-.022,y+.145,z+.18,.044,.013,.055,[.12,.16,.15],2);box(out,x-.005,y+.20,z+.59,.01,.02,.025,[.55,.61,.56]);
   box(out,x-.085,y-.03,z-.12,.17,.12,.17,dark,2);
   ellipsoid(out,x-.07,y-.045,z+.415,.075,.07,.11,glove,6);limb(out,[x-.24,y-.35,z+.17],[x-.08,y-.1,z+.37],.09,cloth,6);
   ellipsoid(out,x+.07,y-.1,z+.13,.075,.1,.08,glove,6);limb(out,[x+.2,y-.38,z-.05],[x+.085,y-.14,z+.09],.095,cloth,6);
   for(let n=0;n<6;n++)box(out,x-.07,y+.135,z+.09+n*.055,.14,.011,.022,[.23,.27,.27]);
  }else{
   box(out,x-.055,y,z,.11,.105,.29,[.21,.25,.25],2);box(out,x-.04,y-.17,z+.06,.08,.2,.08,dark,6);pipe(out,x,y+.044,z+.27,.024,.04,'z',[.15,.2,.18]);
   box(out,x-.01,y+.11,z+.06,.023,.022,.025,[.66,.69,.62]);box(out,x-.009,y+.11,z+.255,.02,.022,.014,[.65,.67,.6]);
   ellipsoid(out,x,y-.10,z+.10,.10,.13,.09,glove,6);limb(out,[x+.12,y-.36,z-.04],[x+.02,y-.16,z+.09],.105,cloth,6);ellipsoid(out,x-.09,y-.11,z+.16,.09,.075,.09,glove,6);
  }
  return {vertices:out,muzzle:{x,y:y+.065,z:z+(id==='rifle'?.9:.33)}};
 }
 const vertex=`attribute vec3 aPos;attribute vec3 aNormal;attribute vec2 aUV;attribute vec3 aColor;attribute float aTile;attribute float aGlow;uniform mat4 uVP;varying vec3 vWorld;varying vec3 vNormal;varying vec2 vUV;varying vec3 vColor;varying float vTile;varying float vGlow;void main(){vWorld=aPos;vNormal=aNormal;vUV=aUV;vColor=aColor;vTile=aTile;vGlow=aGlow;gl_Position=uVP*vec4(aPos,1.0);}`;
 const fragment=`precision mediump float;uniform sampler2D uTexture;uniform vec3 uEye;uniform vec3 uFog;varying vec3 vWorld;varying vec3 vNormal;varying vec2 vUV;varying vec3 vColor;varying float vTile;varying float vGlow;void main(){vec2 tile=vec2(mod(vTile,4.0),floor(vTile/4.0));vec3 tex=texture2D(uTexture,(tile+0.012+fract(vUV)*0.976)/4.0).rgb;float diffuse=max(0.0,dot(normalize(vNormal),normalize(vec3(-0.52,0.85,0.4))));float light=mix(0.47+diffuse*0.66,1.25,clamp(vGlow,0.0,1.0));vec3 color=tex*vColor*light;float fog=smoothstep(37.0,112.0,length(vWorld-uEye));gl_FragColor=vec4(mix(color,uFog,fog),1.0);}`;
 function perspective(fov,a,n,f){const ff=1/Math.tan(fov/2),nf=1/(n-f);return new Float32Array([ff/a,0,0,0,0,ff,0,0,0,0,(f+n)*nf,-1,0,0,2*f*n*nf,0]);}
 const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 function view(eye,dir){const z=dir.map(v=>-v),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
 function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];o[c*4+r]=v;}return o;}
 class Renderer{
  constructor(canvas,map){this.canvas=canvas;this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance'});if(!this.gl)throw new Error('此浏览器无法启用 WebGL。请开启硬件加速，或换用新版 Chrome、Edge、Firefox、Safari。');const gl=this.gl;
   const compile=(type,src)=>{const shader=gl.createShader(type);gl.shaderSource(shader,src);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
   this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error('无法初始化三维画面');gl.useProgram(this.program);
   this.a={};for(const n of['aPos','aNormal','aUV','aColor','aTile','aGlow'])this.a[n]=gl.getAttribLocation(this.program,n);this.u={};for(const n of['uVP','uTexture','uEye','uFog'])this.u[n]=gl.getUniformLocation(this.program,n);
   const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textures());gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
   const vertices=scene(map);this.static=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.static);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);this.staticCount=vertices.length/13;this.dynamic=gl.createBuffer();this.lastSize='';this.effects=[];this.flash=0;this.aim=0;
  }
  bind(b){const g=this.gl;g.bindBuffer(g.ARRAY_BUFFER,b);for(const[n,size,offset]of[['aPos',3,0],['aNormal',3,12],['aUV',2,24],['aColor',3,32],['aTile',1,44],['aGlow',1,48]]){g.enableVertexAttribArray(this.a[n]);g.vertexAttribPointer(this.a[n],size,g.FLOAT,false,52,offset);}}
  event(e){if(e.type==='shot'){
    this.flash=.065;const right=norm([-e.dir.z,0,e.dir.x]);this.effects.push({type:'shell',x:e.origin.x+e.dir.x*.5+right[0]*.22,y:e.origin.y-.12,z:e.origin.z+e.dir.z*.5+right[2]*.22,vx:right[0]*1.6,vy:1.4,vz:right[2]*1.6,life:.7});
   }if(['shot','enemy-shot','impact','explosion'].includes(e.type))this.effects.push({...e,life:e.type==='explosion'?.55:e.type==='impact'?.3:.07});}
  render(s,dt,options={}){
   const gl=this.gl,canvas=this.canvas,p=s.player,ratio=Math.min(window.devicePixelRatio||1,options.quality==='low'?1:1.65),w=Math.round(canvas.clientWidth*ratio),h=Math.round(canvas.clientHeight*ratio);
   if(`${w},${h}`!==this.lastSize){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);this.lastSize=`${w},${h}`;}
   const fog=[.66,.74,.73];gl.clearColor(...fog,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);this.aim+=(Number(!!options.aim)-this.aim)*Math.min(1,dt*13);
   let eye=[p.x,p.y+1.58,p.z],yaw=p.yaw,pitch=p.pitch;if(options.showcase){const t=performance.now()/1000*.022;eye=[32+Math.sin(t)*11,12,31+Math.cos(t)*11];yaw=-t;pitch=-.31;}
   const d=C.direction(yaw,pitch),dir=[d.x,d.y,d.z],fov=(options.fov||78)-this.aim*24,vp=multiply(perspective(fov*Math.PI/180,w/h,.035,160),view(eye,dir));gl.uniformMatrix4fv(this.u.uVP,false,vp);gl.uniform3fv(this.u.uEye,eye);gl.uniform3fv(this.u.uFog,fog);gl.uniform1i(this.u.uTexture,0);
   this.bind(this.static);gl.drawArrays(gl.TRIANGLES,0,this.staticCount);
   const out=[],time=performance.now()/1000;for(const bot of s.bots)if(bot.respawn<4.2||bot.health>0)soldier(out,bot,time);
   for(const g of s.grenades)cylinder(out,g.x,g.y,g.z,.08,.13,[.28,.35,.22],2,8);
   for(const e of this.effects){e.life-=dt;if(e.type==='shot'||e.type==='enemy-shot'){const o=e.origin,en=e.end,dx=en.x-o.x,dz=en.z-o.z,l=Math.hypot(dx,dz)||1,rx=dz/l*.008,rz=-dx/l*.008;quad(out,[[o.x-rx,o.y,o.z-rz],[en.x-rx,en.y,en.z-rz],[en.x+rx,en.y,en.z+rz],[o.x+rx,o.y,o.z+rz]],[0,1,0],e.type==='shot'?[1,.83,.42]:[1,.52,.3],7,[1,1],1);if(e.type==='enemy-shot')box(out,o.x-.02,o.y-.02,o.z-.02,.04,.04,.04,[1,.76,.39],7,1);}
    if(e.type==='shell'){e.vy-=7*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;box(out,e.x,e.y,e.z,.012,.033,.012,[.75,.62,.32],7);}
    if(e.type==='impact')for(let n=0;n<4;n++){const a=n*Math.PI/2+e.life*6,rr=(.3-e.life)*.5;box(out,e.x+Math.sin(a)*rr,e.y+e.life*.2,e.z+Math.cos(a)*rr,.025,.025,.025,[.95,.72,.36],7,1);}
    if(e.type==='explosion'){for(let n=0;n<22;n++){const a=n*2.399,rr=(.55-e.life)*7,yy=Math.sin(n)*rr*.5;box(out,e.x+Math.sin(a)*rr,e.y+Math.abs(yy),e.z+Math.cos(a)*rr,.18,.18,.18,[1,.6,.18],7,1);}}
   }
   this.effects=this.effects.filter(e=>e.life>0);this.bind(this.dynamic);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(out),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,out.length/13);
   if(!options.showcase&&s.respawning<=0){
    const model=weaponMesh(s.weapon,this.aim,s.reloading,p.recoil,time,Math.hypot(p.vx,p.vz)>1),held=model.vertices;
    this.flash=Math.max(0,this.flash-dt);if(this.flash>0){const m=model.muzzle;for(let n=0;n<4;n++){const a=n*Math.PI/2;box(held,m.x+Math.sin(a)*.04,m.y+Math.cos(a)*.04,m.z,.05,.05,.12,[1,.82,.43],7,1);}}
    const right=[Math.cos(yaw),0,Math.sin(yaw)],up=[-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),Math.cos(yaw)*Math.sin(pitch)];
    for(let i=0;i<held.length;i+=13){const x=held[i],y=held[i+1],z=held[i+2],nx=held[i+3],ny=held[i+4],nz=held[i+5];for(let axis=0;axis<3;axis++){held[i+axis]=eye[axis]+right[axis]*x+up[axis]*y+dir[axis]*z;held[i+3+axis]=right[axis]*nx+up[axis]*ny+dir[axis]*nz;}}
    gl.clear(gl.DEPTH_BUFFER_BIT);this.bind(this.dynamic);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(held),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,held.length/13);
   }
   this.frames=(this.frames||0)+1;
  }
 }
 root.StrikeRenderer={Renderer,scene,weaponMesh};
})(typeof globalThis==='object'?globalThis:this);
