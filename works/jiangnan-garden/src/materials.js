import * as T from 'three';
import world from './world.cjs';
import {watchTexture} from './texture-streaming.js';
import {advanceSeed,generateSurfaces} from './surface-pixels.js';
import {resourceURL} from './resource-loader.js';
import woodAlbedo from '../assets/textures/wood_table_001_diff_1k.jpg';
import woodNormal from '../assets/textures/wood_table_001_nor_gl_1k.jpg';
import woodRough from '../assets/textures/wood_table_001_rough_1k.jpg';
import beamAlbedo from '../assets/textures/rough_wood_diff_1k.jpg';
import beamNormal from '../assets/textures/rough_wood_nor_gl_1k.jpg';
import beamRough from '../assets/textures/rough_wood_rough_1k.jpg';
import plasterAlbedo from '../assets/textures/white_plaster_rough_02_diff_1k.jpg';
import plasterNormal from '../assets/textures/white_plaster_rough_02_nor_gl_1k.jpg';
import plasterRough from '../assets/textures/white_plaster_rough_02_rough_1k.jpg';

import rockAlbedo from '../assets/textures/rock_3_diff_1k.jpg';
import rockNormal from '../assets/textures/rock_3_nor_gl_1k.jpg';
import rockRough from '../assets/textures/rock_3_rough_1k.jpg';
import barkAlbedo from '../assets/textures/tree_bark_03_diff_1k.jpg';
import barkNormal from '../assets/textures/tree_bark_03_nor_gl_1k.jpg';
import barkRough from '../assets/textures/tree_bark_03_rough_1k.jpg';

import scrollImage from '../assets/textures/wen-zhengming-pine-grove.jpg';
import linenAlbedo from '../assets/textures/rough_linen_diff_1k.jpg';
import linenNormal from '../assets/textures/rough_linen_nor_gl_1k.jpg';
import linenRough from '../assets/textures/rough_linen_rough_1k.jpg';

import roofAlbedo from '../assets/textures/grey_roof_tiles_diff_1k.jpg';
import roofNormal from '../assets/textures/grey_roof_tiles_nor_gl_1k.jpg';
import roofRough from '../assets/textures/grey_roof_tiles_rough_1k.jpg';
import brickAlbedo from '../assets/textures/brick_floor_003_diff_1k.jpg';
import brickNormal from '../assets/textures/brick_floor_003_nor_gl_1k.jpg';
import brickRough from '../assets/textures/brick_floor_003_rough_1k.jpg';
import deckAlbedo from '../assets/textures/wood_planks_dirt_diff_1k.jpg';
import deckNormal from '../assets/textures/wood_planks_dirt_nor_gl_1k.jpg';
import deckRough from '../assets/textures/wood_planks_dirt_rough_1k.jpg';
import soilAlbedo from '../assets/textures/forest_floor_diff_1k.jpg';
import soilNormal from '../assets/textures/forest_floor_nor_gl_1k.jpg';
import soilRough from '../assets/textures/forest_floor_rough_1k.jpg';

const requests=[['ceramic','#b9c2ae'],['paper','#d4c9ab'],['stone','#556c37'],['linen','#aa9c7c'],['linen','#71624c'],...['#4b535c','#50493e','#465148'].map(c=>['linen',c]),['ceramic','#afc4ad']];
let seed=519;const jobs=requests.map(([kind,base])=>{const rgb=new T.Color(base);rgb.convertLinearToSRGB();const job={kind,values:[rgb.r*255,rgb.g*255,rgb.b*255],seed};seed=advanceSeed(seed,1024*1024*(kind==='linen'?1:2));return job;});
const random=world.seeded(seed);
async function proceduralMaterials(){
 const pixels=await generateSurfaces(jobs.slice(1)),surfaces=new Map();let linenRelief;
 for(let i=0;i<pixels.length;i++){
  const textures=pixels[i].map(data=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const context=canvas.getContext('2d'),image=context.createImageData(1024,1024);image.data.set(data);context.putImageData(image,0,0);const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;return texture;});textures[0].colorSpace=T.SRGBColorSpace;
  if(requests[i+1][0]==='linen'){if(linenRelief){textures[1].dispose();textures[2].dispose();textures.splice(1,2,...linenRelief);}else linenRelief=textures.slice(1);}
  surfaces.set(requests[i+1].join(':'),{map:textures[0],bumpMap:textures[1],roughnessMap:textures[2]});
 }
 return (kind,base)=>surfaces.get([kind,base].join(':'));
}
export async function materials(){
 const proceduralStart=performance.now(),procedural=proceduralMaterials().then(result=>{if(document.querySelector?.('#scene'))document.querySelector('#scene').dataset.proceduralMs=Math.round(performance.now()-proceduralStart);return result;}),loader=new T.TextureLoader();
 async function texture(url){return resourceURL(url,local=>loader.loadAsync(local));}
 async function photographic(urls){const textures=await Promise.all(urls.map(texture));textures[0].colorSpace=T.SRGBColorSpace;for(const [i,t] of textures.entries()){watchTexture(t,urls[i]);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;}return {map:textures[0],normalMap:textures[1],roughnessMap:textures[2]};}
 const [wood,plaster,rock,bark,painting,linen,roofScan,brickScan,deckScan,soilScan,beamScan]=await Promise.all([photographic([woodAlbedo,woodNormal,woodRough]),photographic([plasterAlbedo,plasterNormal,plasterRough]),photographic([rockAlbedo,rockNormal,rockRough]),photographic([barkAlbedo,barkNormal,barkRough]),texture(scrollImage),photographic([linenAlbedo,linenNormal,linenRough]),photographic([roofAlbedo,roofNormal,roofRough]),photographic([brickAlbedo,brickNormal,brickRough]),photographic([deckAlbedo,deckNormal,deckRough]),photographic([soilAlbedo,soilNormal,soilRough]),photographic([beamAlbedo,beamNormal,beamRough])]);const surface=await procedural;watchTexture(painting,scrollImage);painting.colorSpace=T.SRGBColorSpace;painting.anisotropy=8;
 const mat=(kind,color,roughness=.75,bump=.035)=>new T.MeshStandardMaterial({...surface(kind,color),roughness,metalness:0,bumpScale:bump});
 const m={wood:new T.MeshPhysicalMaterial({...beamScan,color:'#b7a38d',clearcoat:.02,clearcoatRoughness:.72,roughness:.88,normalScale:new T.Vector2(.6,.6)}),darkWood:new T.MeshPhysicalMaterial({...wood,color:'#cdb7a0',clearcoat:.12,clearcoatRoughness:.54,roughness:.62,normalScale:new T.Vector2(.45,.45)}),stone:new T.MeshPhysicalMaterial({...rock,color:'#8a938d',roughness:.60,normalScale:new T.Vector2(.52,.52),clearcoat:.13,clearcoatRoughness:.40}),rock:new T.MeshStandardMaterial({...rock,color:'#b4b1a1',roughness:.83,normalScale:new T.Vector2(.7,.7)}),plaster:new T.MeshStandardMaterial({...plaster,color:'#efe9d6',roughness:.95,normalScale:new T.Vector2(.4,.4)}),brick:new T.MeshPhysicalMaterial({...brickScan,color:'#91998e',roughness:.76,normalScale:new T.Vector2(.35,.35),clearcoat:.1,clearcoatRoughness:.5}),tile:new T.MeshPhysicalMaterial({...roofScan,color:'#bbc3b3',roughness:.68,normalScale:new T.Vector2(.22,.22),clearcoat:.2,clearcoatRoughness:.32}),earth:new T.MeshStandardMaterial({...soilScan,color:'#b4bd94',roughness:.94,normalScale:new T.Vector2(.75,.75)}),paper:mat('paper','#d4c9ab',.96,.003)};
 m.earth=new T.MeshPhysicalMaterial({...soilScan,color:'#607653',roughness:.80,normalScale:new T.Vector2(.85,.85),clearcoat:.12,clearcoatRoughness:.5});
 // Keep grain/pore size tied to metres rather than stretching a full image over a beam.
 for(const material of [m.wood,m.darkWood,m.plaster]){
  material.onBeforeCompile=shader=>{shader.vertexShader='attribute float grainEnd; varying float agedEnd; varying vec3 agedPosition;\n'+shader.vertexShader;shader.fragmentShader='varying float agedEnd; varying vec3 agedPosition;\n'+shader.fragmentShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n agedPosition=(modelMatrix*vec4(position,1.0)).xyz; agedEnd=grainEnd;');shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
   vec3 materialSize=vec3(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz),length(modelMatrix[2].xyz));
   vec3 materialNormal=abs(normal);vec2 materialScale=materialNormal.y>.7?materialSize.xz:(materialNormal.x>.7?materialSize.zy:materialSize.xy);
   vMapUv*=materialScale/${material===m.wood?'.5':'1.5'};vNormalMapUv*=materialScale/${material===m.wood?'.5':'1.5'};vRoughnessMapUv*=materialScale/${material===m.wood?'.5':'1.5'};`);if(material!==m.plaster){shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 float patina=.5+.25*sin(agedPosition.x*2.7+agedPosition.z*.8)+.15*sin(agedPosition.y*4.1+agedPosition.x*.9);
 diffuseColor.rgb*=mix(.79,1.08,patina);
 float growthRings=.91+.09*sin(length(vMapUv-vec2(.28,.36))*135.0+sin(vMapUv.x*23.0)*.8);diffuseColor.rgb*=mix(1.0,growthRings,agedEnd);`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=clamp(roughnessFactor+(.5-patina)*.24,.60,.94);`);if(material===m.darkWood)shader.fragmentShader=shader.fragmentShader.replace('diffuseColor.rgb*=mix(.79,1.08,patina);','diffuseColor.rgb*=mix(.79,1.08,patina);\n diffuseColor.rgb=pow(max(diffuseColor.rgb,vec3(.001)),vec3(.82));');}};
  if(material===m.plaster){const scale=material.onBeforeCompile;material.onBeforeCompile=shader=>{scale(shader);shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(vec3(.78,.76,.69),diffuseColor.rgb,.68);');};}
  material.customProgramCacheKey=()=> material===m.plaster?'limewashed-pbr-v2':material===m.wood?'structural-aged-wood-v4':'furniture-aged-wood-v4';
 }
 m.windowPaper=m.paper.clone();m.windowPaper.transparent=true;m.windowPaper.opacity=.68;m.windowPaper.side=T.DoubleSide;m.windowPaper.emissive=new T.Color('#d18e42');m.windowPaper.emissiveIntensity=.08;
 m.wetWood=new T.MeshPhysicalMaterial({...deckScan,color:'#bbb098',roughness:.42,normalScale:new T.Vector2(.35,.35),clearcoat:.25,clearcoatRoughness:.3});
 m.wetWood.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
 vec3 s=vec3(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz),length(modelMatrix[2].xyz));vec2 u=abs(normal.y)>.7?s.xz:s.xy;vMapUv*=u/3.0;vNormalMapUv*=u/3.0;vRoughnessMapUv*=u/3.0;`);};m.wetWood.customProgramCacheKey=()=> 'wet-scanned-planks';
 // A complete brick pattern belongs on plinths; one scanned brick face belongs on each separate floor tile.
 m.brick.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n float luma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(.72,.79,.77)*luma;');};m.brick.customProgramCacheKey=()=> 'grey-scanned-brick';
 m.floorBrick=m.brick.clone();m.floorBrick.onBeforeCompile=shader=>{m.brick.onBeforeCompile(shader);shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vMapUv=vMapUv*vec2(.06,.065)+vec2(.19,.42);vNormalMapUv=vNormalMapUv*vec2(.06,.065)+vec2(.19,.42);vRoughnessMapUv=vRoughnessMapUv*vec2(.06,.065)+vec2(.19,.42);');};m.floorBrick.customProgramCacheKey=()=> 'single-scanned-floor-brick';
 m.tile.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vMapUv=vMapUv*vec2(.095,.095)+vec2(.44,.45);vNormalMapUv=vNormalMapUv*vec2(.095,.095)+vec2(.44,.45);vRoughnessMapUv=vRoughnessMapUv*vec2(.095,.095)+vec2(.44,.45);');};m.tile.customProgramCacheKey=()=> 'single-scanned-clay-tile';
 m.moss=mat('stone','#556c37',.98,.075);
 m.bronze=new T.MeshStandardMaterial({color:'#625c3c',metalness:.8,roughness:.5});
 m.linen=new T.MeshPhysicalMaterial({...linen,color:'#e9dbc0',normalScale:new T.Vector2(.55,.55),roughness:.96,sheen:.28,sheenRoughness:.8,sheenColor:new T.Color('#dfd7be'),side:T.DoubleSide});
 // The blue linen scan supplies measured weave relief; recolor the yarn to undyed flax.
 m.linen.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vMapUv*=6.0;vNormalMapUv*=6.0;vRoughnessMapUv*=6.0;');shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n float yarn=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(1.0,.89,.69)*pow(max(yarn,.001),.75)*1.7;');};m.linen.customProgramCacheKey=()=> 'scanned-flax-v1';
 m.silk=new T.MeshPhysicalMaterial({...surface('linen','#aa9c7c'),roughness:.8,bumpScale:.004,sheen:.75,sheenRoughness:.6,sheenColor:new T.Color('#ded1ac'),side:T.DoubleSide});
 m.gauze=m.linen.clone();m.gauze.transparent=false;m.gauze.opacity=1;m.gauze.depthWrite=true;m.gauze.onBeforeCompile=m.linen.onBeforeCompile;m.gauze.customProgramCacheKey=m.linen.customProgramCacheKey;m.gauze.color.set('#e2d4bd');
 m.quilt=new T.MeshPhysicalMaterial({...linen,color:'#b3b9b3',roughness:.95,normalScale:new T.Vector2(1.05,1.05),sheen:.24,sheenRoughness:.9,sheenColor:new T.Color('#9cacae'),side:T.DoubleSide});
 m.quilt.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vMapUv*=3.0;vNormalMapUv*=3.0;vRoughnessMapUv*=3.0;');};m.quilt.customProgramCacheKey=()=> 'indigo-scanned-quilt-v2';
 m.woven=mat('linen','#71624c',.93,.006);
 m.bookCloth=['#4b535c','#50493e','#465148'].map(color=>mat('linen',color,.95,.005));
 m.bark=new T.MeshStandardMaterial({...bark,color:'#797365',roughness:.92,normalScale:new T.Vector2(.85,.85)});
 m.painting=new T.MeshStandardMaterial({map:painting,roughness:1});
 m.ceramic=new T.MeshPhysicalMaterial({...surface('ceramic','#afc4ad'),roughness:.22,bumpScale:.003,clearcoat:.94,clearcoatRoughness:.10,ior:1.48});
 m.lamp=new T.MeshStandardMaterial({color:'#f0d3a1',emissive:'#ffad48',emissiveIntensity:.7,roughness:.9});
 return m;
}
export function leafTexture(shape='leaf'){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.scale(4,4);
 const grad=ctx.createLinearGradient(20,10,110,118);grad.addColorStop(0,shape==='pine'?'#55734b':'#6e8950');grad.addColorStop(.55,'#385a35');grad.addColorStop(1,'#294631');ctx.fillStyle=grad;ctx.beginPath();
 if(shape==='maple'){
  const points=[[64,122],[46,91],[16,103],[23,76],[6,62],[34,56],[22,28],[50,40],[64,5],[77,40],[106,28],[95,56],[122,62],[107,76],[111,103],[81,91]];points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
 }else if(shape==='pine'){
  for(const dx of [-8,-3,3,8]){ctx.moveTo(64,125);ctx.bezierCurveTo(64+dx*2,89,64+dx*2,28,64+dx,3);ctx.bezierCurveTo(66+dx*2,28,66+dx*2,89,64,125);}
 }else{ctx.moveTo(64,4);ctx.bezierCurveTo(shape==='bamboo'?82:116,35,shape==='bamboo'?83:111,90,64,124);ctx.bezierCurveTo(shape==='bamboo'?45:15,88,shape==='bamboo'?43:12,35,64,4);}
 ctx.fill();ctx.save();ctx.clip();ctx.strokeStyle='#aab37770';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(64,13);ctx.lineTo(64,123);ctx.stroke();
 for(let y=26;y<111;y+=9){ctx.lineWidth=.4;ctx.beginPath();ctx.moveTo(64,y);ctx.quadraticCurveTo(79,y-3,99,y-15);ctx.moveTo(64,y);ctx.quadraticCurveTo(48,y-3,28,y-15);ctx.stroke();}ctx.restore();
 const pixels=ctx.getImageData(0,0,512,512);for(let i=0;i<pixels.data.length;i+=4){const v=.94+random()*.12;for(let k=0;k<3;k++)pixels.data[i+k]*=v;}ctx.putImageData(pixels,0,0);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return new T.MeshPhysicalMaterial({map,alphaTest:.45,side:T.DoubleSide,roughness:.58,clearcoat:.18,clearcoatRoughness:.4,color:'#edf0de'});
}
export function waterNormals(){const size=128,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;data[i]=128+Math.sin(x*.22+y*.13)*19;data[i+1]=128+Math.cos(y*.23-x*.12)*19;data[i+2]=245;data[i+3]=255;}const texture=new T.DataTexture(data,size,size);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.needsUpdate=true;return texture;}
