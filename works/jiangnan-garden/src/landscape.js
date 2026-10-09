import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Water} from 'three/addons/objects/Water.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {leafTexture,waterNormals} from './materials.js';
import world from './world.cjs';
import weather from './weather.cjs';
export function landscape(scene,m,a,flora){
 const random=world.seeded(9201),{box,post,beam}=a;
 box(0,-.49,0,32,.9,28,m.earth);box(0,-.96,0,32.1,.14,28.1,m.brick);
 const terrain=new T.PlaneGeometry(32,28,100,88),tp=terrain.attributes.position,tu=terrain.attributes.uv;
 for(let i=0;i<tp.count;i++){const x=tp.getX(i),z=-tp.getY(i);tp.setXYZ(i,x,world.terrainHeight(x,z),z);tu.setXY(i,(x+16)/3.2,(z+14)/3.2);}terrain.computeVertexNormals();
 const ground=new T.Mesh(terrain,m.earth);ground.castShadow=ground.receiveShadow=true;scene.add(ground);
 // Uneven wet flagstones; garden beds and pond carve the paving into winding routes.
 const stones=new T.InstancedMesh(new RoundedBoxGeometry(1,.1,1,2,.018),m.stone,1600),dummy=new T.Object3D();let si=0;
 for(let x=-15;x<=15;x+=.86)for(let z=-13;z<=13;z+=.68){
  if(world.pondContains(x,z)||(x>-11.5&&x<1.5&&z>-9.5&&z<-.8))continue;
  const path=(z>-.4&&z<1.4)||(x>11)||(z>10.5&&z<12.1)||(x>-13.5&&x<-11.6)||Math.abs(x+4-Math.sin(z*.28)*2)<1.1;
  if(!path)continue;dummy.position.set(x+(Math.floor(z/.68)%2)*.12,world.terrainHeight(x,z)+.012+random()*.014,z);dummy.scale.set(.79+random()*.025,.8+random()*.3,.605+random()*.025);dummy.rotation.set((random()-.5)*.018,(random()-.5)*.05,(random()-.5)*.018);dummy.updateMatrix();stones.setMatrixAt(si,dummy.matrix);stones.setColorAt(si++,new T.Color().setRGB(.63+random()*.26,.67+random()*.22,.62+random()*.24));
 }stones.count=si;stones.receiveShadow=true;scene.add(stones);
 // Walled enclosure is deliberately off axis; low south parapet leaves the overview open.
 for(const [x,z,w,d,h] of [[-15.8,0,.35,28,2.7],[15.8,0,.35,28,2.4],[0,-13.8,32,.35,2.8],[0,13.8,32,.35,.75]]){box(x,h/2,z,w,h,d,m.plaster);box(x,.25,z,w+.07,.5,d+.07,m.brick);box(x,h+.06,z,w+.18,.13,d+.18,m.tile);}
 const shape=new T.Shape(),shore=[];
 for(let i=0;i<=96;i++){const t=i/96*Math.PI*2,r=1+.055*Math.sin(t*3)+.06*Math.cos(t*2);const x=world.POND.x+Math.cos(t)*world.POND.rx*r,z=world.POND.z+Math.sin(t)*world.POND.rz*r;shore.push([x,z]);i===0?shape.moveTo(x,-z):shape.lineTo(x,-z);}
 const water=new Water(new T.ShapeGeometry(shape,32),{textureWidth:768,textureHeight:768,waterNormals:waterNormals(),sunDirection:new T.Vector3(-.4,1,.3).normalize(),sunColor:0xffffff,waterColor:0x273e32,distortionScale:.22,fog:true});water.rotation.x=-Math.PI/2;water.position.y=.11;scene.add(water);
 const pondBottom=new T.Mesh(new T.ShapeGeometry(shape),m.earth);pondBottom.rotation.x=-Math.PI/2;pondBottom.position.y=-.1;scene.add(pondBottom);
 const rockGeo=new T.IcosahedronGeometry(1,3),pos=rockGeo.attributes.position;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),q=.93+.13*Math.sin(x*8.7+y*4.2)*Math.cos(z*7.8)+.07*Math.sin(y*13+x*5);pos.setXYZ(i,x*q,y*q,z*q);}rockGeo.computeVertexNormals();
 function rock(x,y,z,sx,sy,sz){const obj=new T.Mesh(rockGeo,m.rock);obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);obj.rotation.set(random()*.2,random()*6.28,random()*.3);obj.castShadow=obj.receiveShadow=true;scene.add(obj);return obj;}
 for(let i=0;i<shore.length-1;i++){if(random()<.32)continue;const [px,pz]=shore[i],x=px+(random()-.5)*.34,z=pz+(random()-.5)*.34;rock(x,.015,z,.24+random()*.50,.12+random()*.33,.26+random()*.38);if(i%3===0){const moss=rock(x,.17,z,.34,.08,.24);moss.material=m.moss;}}
 for(let i=0;i<70;i++){const angle=random()*Math.PI*2,r=1.02+random()*.045,x=world.POND.x+Math.cos(angle)*world.POND.rx*r,z=world.POND.z+Math.sin(angle)*world.POND.rz*r;rock(x,.01,z,.07+random()*.14,.04,.09); }
 // Taihu rock clusters: irregular vertical stone with genuine holes between linked lobes.
 for(let i=0;i<11;i++){const x=8.8+(random()-.5)*3,z=-1.1+(random()-.5)*2,sz=.35+random()*.6;rock(x,.55,z,sz,.6+random()*.8,sz*.6);if(i%2===0){rock(x+.18,1.6,z,.35,.75,.4);rock(x-.4,1.15,z,.7,.3,.4);}}
 for(let i=0;i<8;i++)rock(-13+random()*2,.3+random()*.25,7+random()*4,.6+random()*.6,.8,.7);
 const leafMat=leafTexture(),bambooMat=leafTexture('bamboo'),mapleMat=leafTexture('maple'),needleMat=leafTexture('pine');
 const leafGeo=new T.PlaneGeometry(1,1,6,6),lp=leafGeo.attributes.position;for(let i=0;i<lp.count;i++){const x=lp.getX(i),y=lp.getY(i);lp.setZ(i,.08*Math.cos(x*Math.PI)*Math.sin((y+.5)*Math.PI));}leafGeo.computeVertexNormals();
 const leaves=new T.InstancedMesh(leafGeo,leafMat,50000),bambooLeaves=new T.InstancedMesh(leafGeo,bambooMat,16000),mapleLeaves=new T.InstancedMesh(leafGeo,mapleMat,12000),needleLeaves=new T.InstancedMesh(leafGeo,needleMat,12000);for(const mesh of [leaves,bambooLeaves,mapleLeaves,needleLeaves])mesh.castShadow=mesh.receiveShadow=true;let li=0,bi=0,mi=0,ni=0;
 function leaf(x,y,z,s=.3,bamboo=false,species='oval'){
  if(y<4.5&&x>-11.65&&x<1.65&&z>-9.55&&z<-.65)return;
  const target=bamboo?bambooLeaves:species==='maple'?mapleLeaves:species==='pine'?needleLeaves:leaves,index=bamboo?bi++:species==='maple'?mi++:species==='pine'?ni++:li++;if(index>=target.instanceMatrix.count)return;
  dummy.position.set(x,y,z);dummy.rotation.set((random()-.5)*2.0,random()*6.28,(random()-.5)*2.5);dummy.scale.set(s*(bamboo?.32:1),s,1);dummy.updateMatrix();target.setMatrixAt(index,dummy.matrix);target.setColorAt(index,new T.Color().setRGB(.70+random()*.3,.77+random()*.23,.61+random()*.3));
 }
 const branchGeometries=[];
 function branch(start,end,r){
  const p=new T.Vector3(...start),q=new T.Vector3(...end),length=p.distanceTo(q);
  const middle=p.clone().lerp(q,.5);middle.x+=Math.sin(start[1]*2+end[2])*.10*length;middle.y+=length*.055;
  const line=new T.CatmullRomCurve3([p,middle,q]),geo=new T.TubeGeometry(line,12,r,8,false),pos=geo.attributes.position,uv=geo.attributes.uv;
  for(let i=0;i<pos.count;i++){const t=uv.getX(i),center=line.getPointAt(t),point=new T.Vector3().fromBufferAttribute(pos,i);point.sub(center).multiplyScalar(1-.72*t).add(center);pos.setXYZ(i,point.x,point.y,point.z);uv.setY(i,uv.getY(i)*r*8);uv.setX(i,t*length/1.5);}geo.computeVertexNormals();
  branchGeometries.push(geo);
 }
 // Different widths, orientations and trunk lean preserve a real canopy instead of radial repeated branch fans.
 for(const [x,z,h,w,turn] of [[-12,4.5,8.2,1.35,.4],[-9,10,6.4,1.55,2.3],[10,-10.3,9.8,1.3,1.4],[-13.8,-11.6,7.2,1.25,3.5],[1,12.3,5.6,1.2,4.2],[-.6,4.4,4.8,1.35,5.3],[4.7,-11.4,6.8,1.5,.8]]){
  const tree=flora.plantTree(scene,x,z,h,w,turn);tree.position.y=world.terrainHeight(x,z);
 }
 function shrub(x,z,size=1.2){for(let i=0;i<5;i++){const t=random()*6.28,r=Math.sqrt(random())*size*.45,px=x+Math.cos(t)*r,pz=z+Math.sin(t)*r;flora.plantShrub(scene,px,world.terrainHeight(px,pz),pz,size*(.85+random()*.50),random()*6.28);}}
 for(const [x,z,s] of [[-13.6,2,1.3],[-10,6.4,1.5],[-7.4,9,1],[-1.5,8.8,1.3],[3.2,-11.4,1.1],[13.7,-9.8,1.5],[8.5,-2.7,1.1],[14,12.5,1.1]])shrub(x,z,s);
 // Intermediate growth links fern beds to crowns and conceals abrupt bed edges.
 for(const [x,z,h,w] of [[-10.3,4.8,3.5,1.12],[-7.6,8.2,4.1,1.25],[5.2,-9.3,4.2,1.10],[9.4,-6.7,3.8,1.12]]){const tree=flora.plantTree(scene,x,z,h,w,random()*6.28);tree.position.y=world.terrainHeight(x,z);}
 for(let i=0;i<16;i++){const t=i/16*Math.PI*2,x=-8.7+Math.cos(t)*3.3,z=5.8+Math.sin(t)*2.8;if(!world.pondContains(x,z)&&Math.abs(x+4-Math.sin(z*.28)*2)>1.8&&z>2.4)shrub(x,z,.4+random()*.75);}
 // Connected understory grows beneath the tree crowns and into the pond banks.
 // Pockets overlap in height and density, while the stone circulation stays clear.
 const beds=[[-8.7,6.4,4.1,4.1,210],[6.6,-8.5,4.1,4.0,240],[-2.2,9.2,2.1,1.0,40],[-8.7,12.8,5.1,.65,70]];
 let fernIndex=0;
 for(const [bx,bz,rx,rz,count] of beds)for(let n=0;n<count;n++){
  const angle=random()*Math.PI*2,r=Math.sqrt(random()),x=bx+Math.cos(angle)*rx*r,z=bz+Math.sin(angle)*rz*r;
  if(world.pondContains(x,z)||x< -13.5||z>13.25||z>10.4&&z<12.15||z< -12.8||z<1.5&&x<1.8||z<-.8&&x<3)continue;
  if(Math.abs(x+4-Math.sin(z*.28)*2)<1.7)continue;
  flora.plantFern(scene,x,world.terrainHeight(x,z),z,1.15+random()*1.55,fernIndex++,random()*6.28);
 }
 for(let n=0;n<105;n++){
  const t=.42+n/105*Math.PI*1.52,r=1.04+random()*.075,x=world.POND.x+Math.cos(t)*world.POND.rx*r,z=world.POND.z+Math.sin(t)*world.POND.rz*r;
  if(x>11.1||z>9.2||world.pondContains(x,z))continue;
  flora.plantFern(scene,x,world.terrainHeight(x,z),z,.65+random()*.80,fernIndex++,random()*6.28);
 }
 for(let i=0;i<160;i++){const x=-14+random()*28,z=-12+random()*24;if(world.pondContains(x,z)||(x>-11.5&&x<1.5&&z<-.8)||Math.abs(z-1)<1.4||x>11||z>10)continue;for(let j=0;j<5;j++)leaf(x+(random()-.5)*.24,.10+random()*.13,z+(random()-.5)*.24,.10+random()*.08);}
 // Broad banana leaves have a curved midrib and drooping blade beside the north pool wall.
 for(const [x,z] of [[11,-6.4],[13.2,-9.9]])for(let i=0;i<6;i++){
  const angle=i*1.05,height=1.3+random()*.7;branch([x,0,z],[x,height,z],.04);
  const geo=new T.PlaneGeometry(.64,1.75,12,24),p=geo.attributes.position;for(let j=0;j<p.count;j++){const xx=p.getX(j),t=(p.getY(j)+.875)/1.75;p.setXYZ(j,xx*Math.sin(t*Math.PI),height+Math.sin(t*Math.PI)*.35-t*.65,t*1.65);}
  geo.computeVertexNormals();const blade=new T.Mesh(geo,leafMat);blade.position.set(x,0,z);blade.rotation.y=angle;blade.castShadow=blade.receiveShadow=true;scene.add(blade);
 }
 // Bamboo culms with node rings and sparse branching leaves, not solid cones.
 for(let i=0;i<34;i++){const x=-13.6+random()*2.1,z=-6.3+random()*5.7,height=3.1+random()*2.2,lean=(random()-.5)*.4;const bamboo=new T.MeshStandardMaterial({color:new T.Color().setHSL(.24,.25,.2+random()*.1),roughness:.58});const culm=post(x,height/2,z,.035,height,bamboo);culm.rotation.z=lean*.12;for(let y=.4;y<height;y+=.38){post(x+lean*y*.12,y,z,.041,.023,m.darkWood);if(y>height*.45)for(let j=0;j<8;j++){const angle=j*2.4;leaf(x+Math.sin(angle)*(.1+random()*.55),y+random()*.3,z+Math.cos(angle)*.4,.38+random()*.16,true);}}}
 // Lotus leaves and flower stalks at the shallow shore; wet moss and grasses beneath.
 const lotusMat=new T.MeshStandardMaterial({color:'#526d35',roughness:.5,side:T.DoubleSide}),lotusGeo=new T.CircleGeometry(.25,20);
 for(let i=0;i<32;i++){const x=4+random()*2.6,z=6.5+random()*.9;if(!world.pondContains(x,z))continue;const obj=new T.Mesh(lotusGeo,lotusMat);obj.rotation.set(-Math.PI/2+(random()-.5)*.3,0,random()*6);obj.position.set(x,.15+random()*.12,z);scene.add(obj);if(i%7===0){beam([x,.1,z],[x,.56,z],.012,.012,m.moss);for(let petal=0;petal<12;petal++){const geo=new T.SphereGeometry(.05,12,8,0,Math.PI*2,0,Math.PI*.65),flower=new T.Mesh(geo,new T.MeshPhysicalMaterial({color:petal%2?'#d4b9bd':'#dfc9c7',roughness:.7,side:T.DoubleSide,sheen:.4}));flower.scale.set(.65,1.8,.45);const angle=petal*Math.PI/6;flower.position.set(x+Math.cos(angle)*.038,.57,z+Math.sin(angle)*.038);flower.rotation.set(Math.sin(angle)*.6,angle,Math.cos(angle)*.6);scene.add(flower);}}}
 for(let i=0;i<90;i++){const x=-14+random()*27,z=-12+random()*24;if(world.pondContains(x,z)||x>-11.5&&x<1.5&&z<-.8)continue;for(let j=0;j<4;j++)leaf(x+(random()-.5)*.2,.12+random()*.25,z+(random()-.5)*.2,.15,true);}
 // Climbing vines on the outer wall and corridor columns.
 for(let i=0;i<16;i++){const x=14.2,z=-3+i*.75;for(let j=0;j<25;j++)leaf(x+Math.sin(j*.5)*.15,.1+j*.105,z+Math.sin(j)*.1,.2);}
 const branches=new T.Mesh(mergeGeometries(branchGeometries),m.bark);branches.castShadow=branches.receiveShadow=true;scene.add(branches);branchGeometries.forEach(g=>g.dispose());
 leaves.count=Math.min(li,50000);bambooLeaves.count=Math.min(bi,16000);mapleLeaves.count=Math.min(mi,12000);needleLeaves.count=Math.min(ni,12000);scene.add(leaves,bambooLeaves,mapleLeaves,needleLeaves);
 // Small stone lantern by the crooked path.
 post(-2.4,.5,7.4,.13,.85,m.stone);box(-2.4,.88,7.4,.65,.13,.65,m.stone);box(-2.4,1.2,7.4,.44,.54,.44,m.stone);for(const side of [-1,1])box(-2.4+side*.226,1.23,7.4,.01,.3,.22,m.lamp);const cap=new T.Mesh(new T.ConeGeometry(.6,.3,4),m.stone);cap.position.set(-2.4,1.65,7.4);cap.rotation.y=Math.PI/4;scene.add(cap);const light=new T.PointLight('#ffba62',2,5,2);light.position.set(-2.4,1.24,7.7);scene.add(light);a.lights.push(light);
 // Rain and eaves drips share thin transparent line segments, independent of time of day.
 const rainCount=260,positions=new Float32Array(rainCount*6),rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(positions,3));const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:'#b6c9c3',transparent:true,opacity:.14,depthWrite:false}));scene.add(rain);
 const drops=weather.createDrops(random,rainCount);
 const rippleGroup=new T.Group();scene.add(rippleGroup);const rings=[];
 for(let i=0;i<20;i++){const x=2+random()*10,z=1+random()*6;if(!world.pondContains(x,z))continue;const obj=new T.Mesh(new T.RingGeometry(.9,1,40),new T.MeshBasicMaterial({color:'#b5c2ae',transparent:true,opacity:.12,side:T.DoubleSide,depthWrite:false}));obj.rotation.x=-Math.PI/2;obj.position.set(x,.125,z);rippleGroup.add(obj);rings.push({obj,phase:random()*5});}
 // Low rolling water vapour uses a smooth alpha mask, never opaque white billboards.
 const fogCanvas=document.createElement('canvas');fogCanvas.width=fogCanvas.height=128;const fc=fogCanvas.getContext('2d'),fg=fc.createRadialGradient(64,64,2,64,64,64);fg.addColorStop(0,'#c5d0c32a');fg.addColorStop(1,'#c5d0c300');fc.fillStyle=fg;fc.fillRect(0,0,128,128);const fogTex=new T.CanvasTexture(fogCanvas),vapours=[];
 for(let i=0;i<5;i++){const obj=new T.Sprite(new T.SpriteMaterial({map:fogTex,transparent:true,opacity:.25,depthWrite:false}));obj.position.set(3+i*2,.5,3+(i%2)*2);obj.scale.set(6,1.2,1);scene.add(obj);vapours.push(obj);}
 flora.flush(scene);
 return {water,animate(time,day){water.material.uniforms.time.value=time*.15;water.material.uniforms.sunColor.value.setRGB(.18+day*.82,.23+day*.77,.34+day*.66);rain.material.opacity=.08+day*.07;for(let i=0;i<drops.length;i++){const d=drops[i],p=weather.dropSegment(d,time),j=i*6;positions.set([d.x,p.head,d.z,d.x,p.tail,d.z],j);}rainGeo.attributes.position.needsUpdate=true;for(const {obj,phase} of rings){const t=(time*.55+phase)%1;obj.scale.setScalar(.1+t*.85);obj.material.opacity=(1-t)*(.045+day*.065);}vapours.forEach((v,i)=>{v.position.x=3+i*2+Math.sin(time*.06+i)*.6;v.material.opacity=.1+day*.17;});}};
}
