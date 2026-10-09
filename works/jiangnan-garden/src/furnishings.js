import * as T from 'three';
import {settleCurtain,settleQuilt} from './cloth.js';
// Furniture is assembled in metres from joined members; profiles are visible at walking distance.
export function furnishings(a,m){
 const {box,post,beam,group,colliders}=a;
 function mesh(geometry,material,parent=group){const o=new T.Mesh(geometry,material);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function curve(points,r=.025,material=m.darkWood,parent=group){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),32,r,8,false),material,parent);}
 function ring(x,y,z,r,t=.009,material=m.darkWood,parent=group){const o=mesh(new T.TorusGeometry(r,t,8,32),material,parent);o.rotation.x=Math.PI/2;o.position.set(x,y,z);return o;}
 function table(x,z,w=1.8,d=1.2,h=.9){
  if(m.furniture&&w>=1){m.furniture.place('table',group,{x,y:.45,z,w,h:h+.024,d});return;}
  const y=.45+h;
  // Floating boards inside a joined edge frame, with narrow settled joints.
  for(let i=0;i<3;i++)box(x,y+(i===1?.0015:0),z+(i-1)*d/3,w,.045,d/3-.0018,m.darkWood);
  box(x,y-.038,z,w-.045,.028,d-.045,m.wood);
  for(const side of [-1,1]){box(x,y+.024,z+side*(d/2-.028),w-.025,.007,.016,m.wood);box(x+side*(w/2-.028),y+.024,z,.016,.007,d-.025,m.wood);}
  for(const sx of [-1,1])for(const sz of [-1,1]){const px=x+sx*(w/2-.1),pz=z+sz*(d/2-.1);box(px,.45+h/2,pz,.065,h,.065,m.darkWood);box(px,y-.13,pz,.09,.15,.085,m.wood);}
  for(const side of [-1,1]){const zz=z+side*(d/2-.1);box(x,y-.16,zz,w-.18,.12,.035,m.darkWood);box(x,.66,zz,w-.18,.033,.035,m.darkWood);for(const sx of [-1,1])curve([[x+sx*(w/2-.11),y-.23,zz],[x+sx*(w/2-.18),y-.32,zz],[x+sx*(w/2-.33),y-.24,zz]],.014,m.wood);}
  for(const side of [-1,1])box(x+side*(w/2-.1),y-.16,z,.035,.12,d-.18,m.darkWood);
 }
 function chair(x,z,angle=0){
  if(m.furniture){colliders.push({x,z,w:.69,d:.66});m.furniture.place('chair',group,{x,y:.45,z,h:1.29,angle});return;}
  colliders.push({x,z,w:.56,d:.5});const g=new T.Group();g.position.set(x,.45,z);g.rotation.y=angle;group.add(g);g.name='guanmao-chair';
  box(0,.47,0,.55,.045,.49,m.darkWood,g);box(0,.494,0,.46,.007,.40,m.woven,g);
  for(const sx of [-1,1])for(const sz of [-1,1]){post(sx*.225,.235,sz*.2,.025,.47,m.darkWood,g);box(sx*.225,.445,sz*.2,.057,.10,.057,m.wood,g);}
  for(const sx of [-1,1]){curve([[sx*.225,.46,-.2],[sx*.23,.77,-.24],[sx*.23,1.0,-.30],[sx*.23,1.25,-.33]],.025,m.darkWood,g);curve([[sx*.23,.80,.20],[sx*.235,.87,.03],[sx*.23,.88,-.16],[sx*.23,.89,-.26]],.025,m.darkWood,g);post(sx*.23,.64,.20,.019,.31,m.darkWood,g);box(sx*.225,.15,0,.032,.027,.41,m.darkWood,g);}
  curve([[-.36,1.21,-.33],[-.23,1.27,-.34],[0,1.29,-.35],[.23,1.27,-.34],[.36,1.21,-.33]],.035,m.darkWood,g);
  const splat=new T.Shape();splat.moveTo(-.06,.58);splat.bezierCurveTo(-.10,.81,-.055,1.0,-.08,1.24);splat.lineTo(.08,1.24);splat.bezierCurveTo(.055,1.0,.10,.81,.06,.58);splat.closePath();const back=mesh(new T.ExtrudeGeometry(splat,{depth:.03,bevelEnabled:true,bevelSize:.005,bevelThickness:.004,bevelSegments:2,steps:1}),m.wood,g);back.position.z=-.30;back.rotation.x=-.06;
  box(0,.18,-.2,.45,.025,.03,m.darkWood,g);box(0,.12,.2,.45,.025,.03,m.darkWood,g);box(0,.40,.21,.42,.065,.025,m.wood,g);
 }
 function vase(x,y,z,scale=.25,material=m.ceramic){
  const points=[[.05,0],[.47,.035],[.61,.22],[.65,.60],[.38,.90],[.27,1.1],[.32,1.20],[.285,1.20],[.245,1.09],[.245,.96]].map(([r,h])=>new T.Vector2(r*scale,h*scale));const o=mesh(new T.LatheGeometry(points,40),material);o.position.set(x,y,z);ring(x,y+scale*1.20,z,scale*.30,scale*.018,material);ring(x,y+.025*scale,z,scale*.46,scale*.018,material);return o;
 }
 function teaBowl(x,y,z){
  const points=[[.025,0],[.036,.007],[.037,.015],[.07,.062],[.072,.070],[.068,.070],[.063,.062],[.030,.018]].map(p=>new T.Vector2(...p));
  const bowl=mesh(new T.LatheGeometry(points,40),m.ceramic);bowl.position.set(x,y,z);ring(x,y+.070,z,.070,.0025,m.ceramic);
  const tea=mesh(new T.CircleGeometry(.052,32),new T.MeshPhysicalMaterial({color:'#75633b',roughness:.15,clearcoat:1,clearcoatRoughness:.1}));tea.rotation.x=-Math.PI/2;tea.position.set(x,y+.047,z);
 }
 function brush(x,y,z,length=.35,angle=0){
  const g=new T.Group();g.position.set(x,y,z);g.rotation.x=angle;group.add(g);
  post(0,length/2,0,.005,length,m.wood,g);post(0,.024,0,.006,.04,m.bronze,g);
  const tip=mesh(new T.ConeGeometry(.008,.055,12),m.silk,g);tip.rotation.z=Math.PI;tip.position.y=-.02;
  for(let strand=0;strand<5;strand++){const t=strand*Math.PI*.4;curve([[Math.cos(t)*.006,.007,Math.sin(t)*.006],[Math.cos(t)*.003,-.018,Math.sin(t)*.003],[0,-.043,0]],.0006,m.darkWood,g);}
 }
 function inkstone(x,y,z){
  const shape=new T.Shape();shape.moveTo(-.125,-.085);shape.lineTo(.125,-.085);shape.lineTo(.125,.085);shape.lineTo(-.125,.085);shape.closePath();
  const well=new T.Path();well.absellipse(.047,0,.048,.057,0,Math.PI*2,true);shape.holes.push(well);
  const stone=mesh(new T.ExtrudeGeometry(shape,{depth:.024,bevelEnabled:true,bevelSize:.006,bevelThickness:.004,bevelSegments:3,steps:1}),m.tile);stone.rotation.x=-Math.PI/2;stone.position.set(x,y,z);
  const ink=mesh(new T.CircleGeometry(.049,32),new T.MeshPhysicalMaterial({color:'#191d1a',roughness:.18,clearcoat:.7}));ink.rotation.x=-Math.PI/2;ink.scale.y=1.15;ink.position.set(x+.047,y+.008,z);
 }
 function scroll(x,z,w,h,y=2.6){
  box(x,y,z,w,h,.012,m.silk);box(x,y,z+.009,w*.77,h*.82,.006,m.painting||m.paper);
  for(const side of [-1,1]){const rod=post(x,y+side*h/2,z,.018,w+.09,m.darkWood);rod.rotation.z=Math.PI/2;for(const sx of [-1,1]){const knob=mesh(new T.SphereGeometry(.022,12,8),m.darkWood);knob.position.set(x+sx*(w/2+.06),y+side*h/2,z);}}
  curve([[x-w*.28,y+h/2,z],[x,y+h/2+.1,z],[x+w*.28,y+h/2,z]],.004,m.linen);
 }
 function book(x,y,z,row,index){
  const w=.28+.02*(index%3),d=.125,h=.09+.009*(index%3);const cover=m.bookCloth[index%3];
  box(x,y,z,w-.018,h,d-.015,m.paper);for(const side of [-1,1])box(x,y+side*(h/2+.007),z,w,.012,d,cover);
  for(let i=0;i<5;i++)box(x+w/2-.015,y-h/2+i*h/5,z,.003,.002,d-.025,m.linen);
  box(x-w/2+.008,y,z,.017,h+.025,d,cover);for(const side of [-1,1]){const thread=mesh(new T.TorusGeometry(.013,.002,4,12),m.linen);thread.position.set(x-.065,y+h/2+.014,z+side*.038);thread.rotation.x=Math.PI/2;thread.scale.x=.5;}
  box(x+.045,y+h/2+.014,z,.08,.001,.032,m.paper);
 }
 function censer(x,y,z){
  const profile=[[0,0],[.12,.01],[.16,.035],[.17,.09],[.15,.12],[.14,.135],[.15,.145]].map(p=>new T.Vector2(...p));const body=mesh(new T.LatheGeometry(profile,32),m.bronze);body.position.set(x,y,z);
  const lid=mesh(new T.SphereGeometry(.145,24,12,0,Math.PI*2,0,Math.PI/2),m.bronze);lid.scale.y=.38;lid.position.set(x,y+.145,z);ring(x,y+.14,z,.153,.009,m.bronze);
  for(let i=0;i<3;i++){const t=i*Math.PI*2/3;curve([[x+Math.cos(t)*.12,y+.04,z+Math.sin(t)*.12],[x+Math.cos(t)*.13,y-.035,z+Math.sin(t)*.13],[x+Math.cos(t)*.16,y-.06,z+Math.sin(t)*.16]],.014,m.bronze);}
  const knob=mesh(new T.SphereGeometry(.025,12,8),m.bronze);knob.position.set(x,y+.218,z);
 }
 function bed(x,z){
  box(x,.83,z,2.1,.16,2.9,m.darkWood);box(x,.934,z,1.95,.075,2.72,m.woven);
  for(const sx of [-1,1])for(const sz of [-1,1]){const xx=x+sx*1.02,zz=z+sz*1.42;post(xx,1.83,zz,.044,2.73,m.darkWood);post(xx,.62,zz,.065,.48,m.darkWood);const finial=mesh(new T.SphereGeometry(.065,16,12),m.wood);finial.position.set(xx,3.245,zz);for(const yy of [.75,1.05,3.04])ring(xx,yy,zz,.051,.008,m.wood);}
  for(const zz of [z-1.42,z+1.42]){box(x,3.17,zz,2.12,.09,.09,m.darkWood);box(x,2.96,zz,2.04,.13,.04,m.wood);for(let i=0;i<13;i++)box(x-.96+i*.16,2.83,zz,.018,.18,.027,m.darkWood);}
  for(const xx of [x-1.02,x+1.02])box(xx,3.17,z,.09,.09,2.95,m.darkWood);
  // Low pierced headboard is joined to the four posts, not a solid block.
  for(const yy of [1.07,1.48])box(x,yy,z-1.39,2,.055,.055,m.darkWood);for(let i=0;i<15;i++)box(x-.94+i*.134,1.27,z-1.39,.022,.4,.032,m.wood);
  // Gravity settles the closed padded quilt on the mattress; only free hems hang.
  const settledQuilt=settleQuilt(),nx=settledQuilt.cols,nz=settledQuilt.rows,stride=nx+1,count=stride*(nz+1),vertices=[],uvs=[],indices=[];
  for(let side=0;side<2;side++)for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
   const k=(j*stride+i)*3,xx=settledQuilt.positions[k],yy=settledQuilt.positions[k+1],zz=settledQuilt.positions[k+2];
   vertices.push(xx,yy-(side?.045:0),zz);uvs.push(i/nx,j/nz);
  }
  for(let side=0;side<2;side++)for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
   const a=side*count+j*stride+i,b=a+1,c=a+stride,d=c+1;
   if(side)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);
  }
  const perimeter=[];for(let i=0;i<=nx;i++)perimeter.push(i);for(let j=1;j<=nz;j++)perimeter.push(j*stride+nx);for(let i=nx-1;i>=0;i--)perimeter.push(nz*stride+i);for(let j=nz-1;j>0;j--)perimeter.push(j*stride);
  for(let i=0;i<perimeter.length;i++){const a=perimeter[i],b=perimeter[(i+1)%perimeter.length];indices.push(a,b,a+count,b,b+count,a+count);}
  const quilt=new T.BufferGeometry();quilt.setAttribute('position',new T.Float32BufferAttribute(vertices,3));quilt.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));quilt.setIndex(indices);quilt.computeVertexNormals();
  const q=mesh(quilt,m.quilt||m.linen);q.position.set(x,0,z);q.name='folded-quilt';
  curve(perimeter.filter((_,i)=>i%3===0).concat(perimeter[0]).map(i=>[x+vertices[i*3],vertices[i*3+1]-.012,z+vertices[i*3+2]]),.0035,m.silk);
  // Soft rectangular pillow with rounded corners and a sewn, compressed edge.
  const pillowGeo=new T.SphereGeometry(1,48,28),pp=pillowGeo.attributes.position;
  for(let i=0;i<pp.count;i++){const px=pp.getX(i),py=pp.getY(i),pz=pp.getZ(i),round=n=>Math.sign(n)*Math.pow(Math.abs(n),.42);pp.setXYZ(i,round(px)*.57,Math.sign(py)*Math.pow(Math.abs(py),.85)*.145*(.95+.05*Math.cos(px*11+pz*5)),round(pz)*.22);}pillowGeo.computeVertexNormals();
  const pillow=mesh(pillowGeo,m.linen);pillow.position.set(x+.06,1.24,z-.99);pillow.rotation.y=-.12;pillow.name='sewn-pillow';
  const pillowSeam=curve(Array.from({length:49},(_,i)=>{const a=i/48*Math.PI*2,r=n=>Math.sign(n)*Math.pow(Math.abs(n),.42);return [r(Math.cos(a))*.568,-.003,r(Math.sin(a))*.219];}),.0018,m.linen);
  pillowSeam.position.copy(pillow.position);pillowSeam.rotation.copy(pillow.rotation);
  for(const side of [-1,1]){
   const width=side<0?1.18:1.02,height=side<0?2.38:2.27,settled=settleCurtain(width,height,side),geo=new T.PlaneGeometry(width,height,settled.cols,settled.rows);
   geo.attributes.position.array.set(settled.positions);
   geo.computeVertexNormals();const curtain=mesh(geo,m.gauze);curtain.position.set(x+side*.78,0,z+1.62);curtain.rotation.y=side*-.18;curtain.castShadow=true;curtain.name='gathered-gauze';
   for(const edge of [0,settled.cols])curve(Array.from({length:settled.rows+1},(_,j)=>{const k=(j*(settled.cols+1)+edge)*3;return Array.from(settled.positions.slice(k,k+3));}),.0018,m.linen,curtain);
   curve(Array.from({length:settled.cols+1},(_,i)=>{const k=(settled.rows*(settled.cols+1)+i)*3;return Array.from(settled.positions.slice(k,k+3));}),.0023,m.linen,curtain);
   const tieY=3.145-height*(side<0?.62:.57);curve([[x+side*.97,tieY,z+1.68],[x+side*1.04,tieY-.014,z+1.72],[x+side*1.1,tieY,z+1.66]],.006,m.silk);
   for(let i=0;i<7;i++){const loop=mesh(new T.TorusGeometry(.019,.003,6,12),m.linen);loop.position.set(x+side*.78-width*.35+i*width*.70/6,3.14,z+1.62);}
  }

 }
 return {table,chair,vase,scroll,book,censer,bed,teaBowl,brush,inkstone,curve,ring,mesh};
}
