import * as T from 'three';
import world from './world.cjs';
import {furnishings} from './furnishings.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export function architecture(scene,m){
 const group=new T.Group(),roof=new T.Group(),lights=[],colliders=[];scene.add(group);group.add(roof);
 const boxCache=new Map(),postGeo=new T.CylinderGeometry(1,1,1,24);
 function boxGeometry(w,h,d){const key=[w,h,d].join(':');if(!boxCache.has(key)){const g=new RoundedBoxGeometry(w,h,d,2,Math.min(.012,w*.12,h*.12,d*.12));g.scale(1/w,1/h,1/d);boxCache.set(key,g);}return boxCache.get(key);}
 function ensureColor(g,mat){if(mat.vertexColors&&!g.attributes.color){const color=new Float32Array(g.attributes.position.count*3);color.fill(1);g.setAttribute('color',new T.BufferAttribute(color,3));}if(mat.userData.grainEnd&&!g.attributes.grainEnd)g.setAttribute('grainEnd',new T.BufferAttribute(new Float32Array(g.attributes.position.count),1));return g;}
 function box(x,y,z,w,h,d,mat=m.wood,parent=group){const obj=new T.Mesh(ensureColor(boxGeometry(w,h,d),mat),mat);obj.position.set(x,y,z);obj.scale.set(w,h,d);obj.castShadow=obj.receiveShadow=true;parent.add(obj);return obj;}
 function post(x,y,z,r,h,mat=m.wood,parent=group){const obj=new T.Mesh(ensureColor(postGeo,mat),mat);obj.position.set(x,y,z);obj.scale.set(r,h,r);obj.castShadow=obj.receiveShadow=true;parent.add(obj);return obj;}
 function beam(a,b,width=.14,depth=width,mat=m.wood,parent=group){const va=new T.Vector3(...a),vb=new T.Vector3(...b),obj=box(0,0,0,width,va.distanceTo(vb),depth,mat,parent);obj.position.copy(va).add(vb).multiplyScalar(.5);obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vb.sub(va).normalize());return obj;}
 const roofY=world.roofHeight;
 // Three bays; columns carry cross beams, tie beams, purlins and exposed rafters.
 box(-5,.18,-5.4,13.1,.36,8.6,m.stone);box(-5,.4,-5.4,12.6,.1,7.8,m.brick);
 const floor=new T.InstancedMesh(new T.BoxGeometry(.585,.045,.585),m.floorBrick||m.brick,20*12),floorPose=new T.Object3D();let fi=0;const rng=world.seeded(702);for(let ix=0;ix<20;ix++)for(let iz=0;iz<12;iz++){floorPose.position.set(-10.7+ix*.6,.474,-8.65+iz*.6);floorPose.updateMatrix();floor.setMatrixAt(fi,floorPose.matrix);floor.setColorAt(fi++,new T.Color().setScalar(.73+rng()*.25));}floor.receiveShadow=true;group.add(floor);
 for(let x=-11;x<=1;x+=4)for(const z of [-8.8,-5.5,-1.8]){post(x,.53,z,.23,.24,m.stone);post(x,2.45,z,.16,3.85);box(x,4.35,z,.42,.22,.42);colliders.push({x,z,w:.35,d:.35});}
 for(const z of [-8.8,-5.5,-1.8])box(-5,4.33,z,12.5,.28,.22);
 for(let x=-11;x<=1;x+=4){
  box(x,4.48,-5.3,.23,.3,8.8);
  beam([x,4.55,-8.1],[x,5.25,-7.1],.2);beam([x,4.55,-2.6],[x,5.25,-3.6],.2);
  box(x,5.22,-5.5,.23,.23,4.1);post(x,5.84,-5.5,.1,1.22);box(x,6.45,-5.5,.23,.24,1.4);
  for(const z of [-8.8,-1.8])for(const dir of [-1,1])beam([x,3.76,z],[x+dir*.85,4.28,z],.13);
 }
 // Short bearing posts connect each purlin to a carrying beam at every frame.
 // The eaves beyond the last purlin are carried by cantilevered rafters.
 for(const z of [-9.5,-8.3,-7.1,-5.5,-3.9,-2.7,-1.5]){
  const purlin=post(-5,roofY(z)-.24,z,.105,13.5,m.wood);purlin.rotation.z=Math.PI/2;purlin.name='purlin';
  if(z===-5.5)continue; // Ridge already rests on the king post and ridge beam.
  const bottom=roofY(z)-.345,bearingY=Math.abs(z+5.5)<2.05?5.335:4.63;
  for(const x of [-11,-7,-3,1]){const bearing=post(x,(bearingY+bottom)/2,z,.085,bottom-bearingY+.02,m.wood);bearing.name='purlin-bearing';}
 }
 for(let x=-11.6;x<=1.6;x+=.48)for(const side of [-1,1])for(let i=0;i<8;i++){
  const z0=-5.5+side*i*.65,z1=-5.5+side*(i+1)*.65;
  beam([x,roofY(z0)-.13,z0],[x,roofY(z1)-.13,z1],.065,.105,m.wood,roof);
 }
 // Thin curved tiles are real repeated geometry, not a roof-coloured slab.
 const tileGeo=new T.CylinderGeometry(.14,.14,.42,8,1,true,0,Math.PI),tileCount=2*48*17;
 const tiles=new T.InstancedMesh(tileGeo,m.tile,tileCount),dummy=new T.Object3D(),roofRandom=world.seeded(8501);let ti=0;
 for(const side of [-1,1])for(let col=0;col<48;col++)for(let row=0;row<17;row++){
  const z=-5.5+side*(row+.4)*.325,t=Math.abs(z+5.5)/5.5,slope=side*(-2.7+1.26*t*t)/5.5;
  dummy.position.set(-11.8+col*.285+(roofRandom()-.5)*.010,roofY(z)+.16+(col%2)*.035+(roofRandom()-.5)*.012,z+(roofRandom()-.5)*.013);dummy.rotation.set(Math.PI/2+Math.atan(slope),0,(col%2?Math.PI:0)+(roofRandom()-.5)*.025);dummy.scale.set(.98+roofRandom()*.04,.98+roofRandom()*.04,1);dummy.updateMatrix();tiles.setMatrixAt(ti,dummy.matrix);
  // Moisture follows exposure and slow, contiguous patches across many courses.
  const patch=.5+.5*Math.sin(col*.23+Math.sin(row*.34+side)*1.7)*Math.cos(row*.22+side*.8),damp=.70+patch*.22-row/16*.08+(roofRandom()-.5)*.08;
  tiles.setColorAt(ti++,new T.Color().setRGB(damp*(.97-patch*.08),damp,damp*(.94-patch*.1)));
 }
 tiles.castShadow=tiles.receiveShadow=true;roof.add(tiles);
 // Under-tile waterproof decking follows the curve, preventing pinholes.
 const deckPositions=[],deckUV=[],deckIndices=[];
 for(let row=0;row<=24;row++)for(const x of [-11.9,1.9]){const z=-11.03+row*11.06/24;deckPositions.push(x,roofY(z)-.075,z);deckUV.push((x+11.9)/1.5,row*11.06/24/1.5);}
 for(let row=0;row<24;row++){const i=row*2;deckIndices.push(i,i+2,i+1,i+1,i+2,i+3);}
 const deckGeo=new T.BufferGeometry();deckGeo.setAttribute('position',new T.Float32BufferAttribute(deckPositions,3));deckGeo.setAttribute('uv',new T.Float32BufferAttribute(deckUV,2));deckGeo.setIndex(deckIndices);deckGeo.computeVertexNormals();
 const deckMat=m.darkWood.clone();deckMat.side=T.DoubleSide;const deck=new T.Mesh(deckGeo,deckMat);deck.castShadow=deck.receiveShadow=true;deck.name='continuous-roof-deck';roof.add(deck);
 const ridge=post(-5,7.01,-5.5,.17,13.8,m.tile,roof);ridge.rotation.z=Math.PI/2;
 for(const x of [-12,2]){beam([x,6.83,-5.5],[x,7.03,-5.2],.12,.15,m.tile,roof);beam([x,6.83,-5.5],[x,7.03,-5.8],.12,.15,m.tile,roof);}
 // Window voids interrupt the wall instead of being pasted over solid plaster.
 box(-5,1.18,-9.1,12.5,1.52,.24,m.plaster);box(-5,3.785,-9.1,12.5,.67,.24,m.plaster);
 for(const [x,w] of [[-10.7,1.1],[-7,1.7],[-3,1.7],[.7,1.1]])box(x,2.7,-9.1,w,1.5,.24,m.plaster);box(-11.25,2.27,-5.5,.24,3.7,7.4,m.plaster);box(1.25,2.27,-5.5,.24,3.7,7.4,m.plaster);
 for(const x of [-11.25,1.25]){const shape=new T.Shape();shape.moveTo(-3.7,0);shape.lineTo(3.7,0);shape.lineTo(0,2.0);shape.closePath();const obj=new T.Mesh(new T.ShapeGeometry(shape),m.plaster);obj.rotation.y=Math.PI/2;obj.position.set(x,4.12,-5.5);obj.material= m.plaster.clone();obj.material.side=T.DoubleSide;roof.add(obj);}
 function lattice(x,z,w,h,y=2,angle=0,parent=group){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=angle;parent.add(g);for(const [xx,yy,ww,hh] of [[0,-h/2,w,.08],[0,h/2,w,.08],[-w/2,0,.08,h],[w/2,0,.08,h]])box(xx,yy,0,ww,hh,.085,m.darkWood,g);for(let xx=-w/2+.18;xx<w/2;xx+=.23)box(xx,0,0,.026,h,.04,m.darkWood,g);for(let yy=-h/2+.2;yy<h/2;yy+=.25)box(0,yy,0,w,.025,.04,m.darkWood,g);return g;}
 // Front floor-length doors fold to the sides of the three open bays.
 for(const x of [-9,-5,-1])for(const side of [-1,1]){
  const dg=new T.Group();dg.position.set(x+side*1.5,0,-1.8);dg.rotation.y=side*.48;group.add(dg);
  box(0,1.18,0,.85,1.25,.075,m.wood,dg);lattice(0,0,.85,1.65,2.6,0,dg);box(0,3.58,0,.85,.07,.085,m.darkWood,dg);
  post(side*.24,1.95,.06,.04,.05,m.bronze,dg).rotation.x=Math.PI/2;
 }
 for(const x of [-7,-3]){
  box(x,1.08,-7.1,.13,1.25,3.8,m.wood);box(x,3.77,-7.1,.13,.12,3.8,m.darkWood);lattice(x,-7.1,3.8,2.0,2.72,Math.PI/2);for(const z of [-8.98,-7.72,-6.45,-5.2])box(x,2.1,z,.12,3.3,.08,m.darkWood);box(x,2.1,-2.25,.13,3.3,1.2,m.wood);
  lattice(x,-4.7,1.2,2.8,2,Math.PI/2); // Open doorway immediately in front of this partition.
 }
 box(-5,2.7,-9.1,3.9,1.5,.24,m.plaster);for(const x of [-9,-1]){lattice(x,-9.0,2.3,1.5,2.7);const pane=box(x,2.7,-9.08,2.3,1.5,.025,m.windowPaper||m.paper);pane.castShadow=false;}
 // Main chamber furnishings are individually joined wood pieces.
 const {table,chair,vase,scroll,book,censer,bed,teaBowl,brush,inkstone}=furnishings({box,post,beam,group,colliders},m);
 table(-5,-7.7,2.2,.5,1.05);table(-5,-5.8,1.6,1.4,.78);chair(-6.25,-5.85,Math.PI/2);chair(-3.75,-5.85,-Math.PI/2);scroll(-5,-8.91,.68,2.35,2.63);
 table(-6.15,-8,.5,.45,1.25);vase(-6.15,1.725,-8,.21,m.bronze);censer(-5,1.58,-7.7);
 for(const x of [-5.38,-4.62])teaBowl(x,1.255,-5.65);box(-5,1.272,-5.7,.36,.035,.26,m.ceramic);
 // Folding screen behind the hall table, offset to keep both side doors clear.
 for(let i=0;i<3;i++){const panel=box(-5.7+i*.68,1.4,-8.35,.66,1.8,.065,m.wood);panel.rotation.y=(i%2?-.12:.12);lattice(-5.7+i*.68,-8.32,.58,.55,1.9);}
 table(-9.4,-6.2,2.3,1,.82);chair(-9.4,-5.05,Math.PI);box(-9.35,1.30,-6.2,.65,.012,.42,m.paper);
 // Ink stone, brush rest, brushes, paper and water vessel.
 inkstone(-8.65,1.298,-6.25);box(-9.8,1.307,-6.15,.3,.026,.07,m.bronze);for(let i=0;i<3;i++)brush(-9.75+i*.06,1.326,-6.3,.36,Math.PI/2);vase(-10.17,1.295,-6.3,.17);for(let i=0;i<5;i++)brush(-10.20+i*.015,1.48,-6.3,.27+i*.018,-.1+i*.05);
 box(-11,1.8,-8,.06,2.7,1.7,m.darkWood);for(const z of [-8.83,-7.17])box(-10.7,1.8,z,.64,2.7,.055,m.darkWood);for(let i=0;i<5;i++)box(-10.7,.46+i*.67,-8,.64,.065,1.7,m.wood);
 for(let row=0;row<4;row++)for(let j=0;j<9;j++)book(-10.63,.58+row*.67+j%3*.012,-8.7+j*.16,row,j);
 table(-8,-8.25,.5,.48,1.1);vase(-8,1.575,-8.25,.32);
 for(let i=0;i<7;i++){
  const endpoint=[-8+Math.sin(i*2)*.22,2.4+Math.sin(i)*.2,-8.25+Math.cos(i)*.12];
  beam([-8,1.9,-8.25],endpoint,.014,.014,m.darkWood);
  for(let j=0;j<3;j++){const flower=new T.Mesh(new T.SphereGeometry(.025,8,6),m.ceramic);flower.position.set(endpoint[0]+Math.sin(j*2)*.04,endpoint[1]+j*.03,endpoint[2]+Math.cos(j*2)*.03);group.add(flower);}
 }
 table(-9.8,-8.7,1.4,.42,.67);box(-9.8,1.18,-8.7,1.2,.07,.25,m.darkWood);for(let i=0;i<7;i++)box(-9.8,1.22,-8.8+i*.03,1.12,.003,.003,m.bronze);
 bed(-.6,-7.4);
 table(-2.2,-8.5,.55,.6,.6);vase(-2.2,1.075,-8.5,.18);for(let i=0;i<2;i++)box(-2.3+i*.52,1.46,-5.9,.48,2.0,.08,m.wood);
 function lantern(x,y,z,parent=group){const g=new T.Group();g.position.set(x,y,z);parent.add(g);const paper=new T.Mesh(new T.CylinderGeometry(.21,.24,.55,12),m.lamp);g.add(paper);for(const yy of [-.28,.28])post(0,yy,0,.25,.055,m.darkWood,g);for(let i=0;i<8;i++){const a=i*Math.PI/4;box(Math.cos(a)*.23,0,Math.sin(a)*.23,.015,.58,.015,m.darkWood,g);}beam([0,.3,0],[0,.65,0],.02,.02,m.bronze,g);const l=new T.PointLight('#ffbd72',5,10,2);l.position.set(x,y-.36,z);if(z===-3.5){l.castShadow=true;l.shadow.mapSize.set(512,512);l.shadow.bias=-.0004;l.shadow.normalBias=.02;l.shadow.autoUpdate=false;l.shadow.needsUpdate=true;}lights.push(l);group.add(l);return g;}
 for(const x of [-9,-5,-1])lantern(x,3.6,-3.5);for(const x of [-10.8,.8])lantern(x,3.8,-1.0);
 // Asymmetric covered corridor turns around the east bank.
 const corridor=new T.Group();group.add(corridor);
 box(12.9,.25,3,2.2,.18,14,m.wetWood,corridor);
 for(let z=-3.7;z<=9.8;z+=2.7)for(const x of [12,13.8]){post(x,1.8,z,.085,3.0,m.wood,corridor);box(x,1.1,z,.12,.6,.12,m.darkWood,corridor);}
 for(const x of [12,13.8])box(x,3.3,3,.14,.16,14,m.wood,corridor);
 for(let i=0;i<28;i++){const z=-3.75+i*.5;for(const side of [-1,1])beam([12.9,4,z],[12.9+side*1.45,3.35,z],.08,.11,m.wood,corridor);}
 // Small curved clay tiles and ridge caps articulate the corridor at near range.
 const cTileGeo=new T.CylinderGeometry(.115,.115,.34,10,1,true,0,Math.PI);cTileGeo.rotateZ(Math.PI/2);
 const cTiles=new T.InstancedMesh(cTileGeo,m.tile,2*48*6+2*36*5);let ci=0;const pose=new T.Object3D(),tileRng=world.seeded(801);
 for(const side of [-1,1]){
  const deck=box(12.9+side*.72,3.72,3,1.65,.065,14.7,m.darkWood,corridor);deck.rotation.z=side*-.42;
  for(let col=0;col<48;col++)for(let row=0;row<6;row++){
   const xx=side*(row+.35)*.28;pose.position.set(12.9+xx,4.14-Math.abs(xx)*.45, -4.1+col*.30);pose.rotation.set(0,0,side*-.42);pose.scale.set(1,1,1);pose.updateMatrix();cTiles.setMatrixAt(ci,pose.matrix);cTiles.setColorAt(ci++,new T.Color().setScalar(.72+tileRng()*.28));
  }
 }
 for(let col=0;col<48;col++){const cap=post(12.9,4.15,-4.1+col*.30,.13,.32,m.tile,corridor);cap.rotation.x=Math.PI/2;}
 for(const z of [-1,5.5,10])lantern(12.9,2.9,z);
 box(7.8,.23,11,10.5,.2,2.2,m.wetWood,corridor);for(let x=3;x<13;x+=2.5)for(const z of [10.15,11.85])post(x,1.8,z,.075,3.0,m.wood,corridor);
 for(const side of [-1,1]){
  const deck=box(7.8,3.41,11+side*.65,11,.065,1.5,m.darkWood,corridor);deck.rotation.x=side*.42;
  for(let col=0;col<36;col++)for(let row=0;row<5;row++){
   const zz=side*(row+.3)*.28;pose.position.set(2.4+col*.30,3.79-Math.abs(zz)*.45,11+zz);pose.rotation.set(side*.42,Math.PI/2,0);pose.updateMatrix();cTiles.setMatrixAt(ci,pose.matrix);cTiles.setColorAt(ci++,new T.Color().setScalar(.72+tileRng()*.28));
  }
 }
 cTiles.count=ci;cTiles.castShadow=cTiles.receiveShadow=true;corridor.add(cTiles);for(let col=0;col<36;col++){const cap=post(2.4+col*.30,3.8,11,.12,.32,m.tile,corridor);cap.rotation.z=Math.PI/2;}
 lantern(6,2.9,11);
 return {group,roof,lights,colliders,box,post,beam,vase,lantern};
}
