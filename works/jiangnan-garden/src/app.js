import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import rainyEnvironment from '../assets/environment/lythwood_terrace_1k.hdr';
import {floraModels} from './flora-models.js';
import {furnitureModels} from './furniture-models.js';
import {materials} from './materials.js';
import {architecture} from './architecture.js';
import {landscape} from './landscape.js';
import {batchArchitecture} from './render-batches.js';
import world from './world.cjs';
const preview=new URLSearchParams(location.search).has('preview');
document.body.classList.toggle('preview',preview);
const $=id=>document.getElementById(id),canvas=$('scene');
$('reload').onclick=()=>location.reload();
function showError(text){$('loading').hidden=true;$('error').hidden=false;$('error-text').textContent=text;}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();showError('图形上下文已中断。请重新打开园林，或关闭其他占用显卡的页面。');});
// Let the loading surface paint before generating textures and geometry.
requestAnimationFrame(()=>{init().catch(e=>{console.error(e);showError('需要支持 WebGL 2 的浏览器与硬件加速。请检查浏览器设置后重试。');});});
async function init(){
 const scene=new T.Scene(),renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(preview?1:Math.min(window.devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.outputColorSpace=T.SRGBColorSpace;
 const camera=new T.PerspectiveCamera(43,1,.08,250),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.065;controls.maxPolarAngle=Math.PI*.485;controls.minDistance=3;controls.maxDistance=130;controls.target.set(0,1.1,0);camera.position.set(27,20,31);controls.update();
 const sky=new T.HemisphereLight('#e1e7dc','#4d5b40',1.1);scene.add(sky);
 const sun=new T.DirectionalLight('#fff0d4',2.4);sun.position.set(-16,25,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.5,far:75});sun.shadow.bias=-.00025;sun.shadow.normalBias=.02;sun.shadow.radius=3;scene.add(sun);
 const fill=new T.DirectionalLight('#c7d6dc',.3);fill.position.set(20,8,-15);scene.add(fill);
 scene.fog=new T.FogExp2('#c7d0c8',.009);scene.background=new T.Color('#c7d0c8');
 // A real overcast HDR environment supplies directional diffuse and wet-surface reflections.
 const [hdr,m,flora,furniture]=await Promise.all([new RGBELoader().loadAsync(rainyEnvironment),materials(),floraModels(),furnitureModels()]);m.furniture=furniture;hdr.mapping=T.EquirectangularReflectionMapping;
 const pmrem=new T.PMREMGenerator(renderer),envTarget=pmrem.fromEquirectangular(hdr);scene.environment=envTarget.texture;scene.environmentRotation.y=.8;hdr.dispose();pmrem.dispose();
 const a=architecture(scene,m);batchArchitecture(a,m);const garden=landscape(scene,m,a,flora);
 RectAreaLightUniformsLib.init();const windowBounce=[-9,-5,-1].map(x=>{const light=new T.RectAreaLight('#d4e0e4',1.9,3.25,2.8);light.position.set(x,2.35,-.9);light.lookAt(x,2,-7.5);scene.add(light);return light;});
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,800,600,16);ao.kernelRadius=.75;ao.minDistance=.001;ao.maxDistance=.065;composer.addPass(ao);const bloom=new UnrealBloomPass(new T.Vector2(800,600),.13,.35,1.25);composer.addPass(bloom);composer.addPass(new OutputPass());
 let walking=false,yaw=0,pitch=0,day=1,targetDay=1,quality=true,drag=null,last=performance.now(),elapsed=0,visible=true,lookIdle=0;const input={},night=new T.Color('#172b3e'),dayColor=new T.Color('#c4cec7');
 function fitOverview(){const portrait=camera.aspect<.85;controls.target.set(0,1.1,0);if(portrait){const distance=34/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.aspect)*1.10;camera.position.set(0,1.1+distance*.86,distance*.51);}else{const scale=Math.max(1,1.25/camera.aspect);camera.position.set(27*scale,1.1+18.9*scale,31*scale);}controls.update();}
 function resize(){const rect=canvas.parentElement.getBoundingClientRect();const width=preview?1280:rect.width,height=preview?Math.round(1280*rect.height/Math.max(1,rect.width)):rect.height;renderer.setSize(width,height,false);camera.aspect=rect.width/rect.height;if(!walking)fitOverview();camera.updateProjectionMatrix();composer.setSize(width,height);ao.setSize(Math.min(width,1000),Math.min(height,750));if(preview)composer.render();}
 function pose(){camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);}
 function roomAt(){if(camera.position.z<-1&&camera.position.z>-9.4&&camera.position.x>-11.4&&camera.position.x<1.4)return camera.position.x<-7?'听雨书房':camera.position.x>-3?'疏影卧房':'待客堂屋';return '池岸庭院';}
 function updateViewUI(){document.body.classList.toggle('walking',walking);$('overview').setAttribute('aria-pressed',!walking);$('walk').setAttribute('aria-pressed',walking);$('walk-controls').hidden=!walking;$('crosshair').hidden=!walking;$('place-name').textContent=walking?roomAt():'一池烟雨，半窗闲云';$('place-note').textContent=walking?'WASD 移步 · 拖动转头 · Esc 返回环绕':'拖动环绕 · 滚轮拉近 · 入园看梁柱与陈设';}
 function enter(room){walking=true;controls.enabled=false;clear();camera.position.set(room.x,room.y,room.z);yaw=room.yaw;pitch=.08;camera.fov=65;camera.updateProjectionMatrix();pose();if(!a.roof.visible){a.lights.forEach(l=>{if(l.castShadow)l.shadow.needsUpdate=true;});sun.shadow.needsUpdate=true;}a.roof.visible=true;$('roof').checked=false;updateViewUI();}
 function overview(reset=true){walking=false;controls.enabled=true;clear();camera.fov=43;camera.updateProjectionMatrix();if(reset)fitOverview();controls.update();updateViewUI();}
 function clear(){for(const key of Object.keys(input))delete input[key];document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));drag=null;}
 function canMove(x,z){return world.canWalk(x,z)&&!a.colliders.some(o=>Math.abs(x-o.x)<o.w/2+.2&&Math.abs(z-o.z)<o.d/2+.2);}
 function move(dx,dz){const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));for(let i=0;i<n;i++){if(canMove(camera.position.x+dx/n,camera.position.z))camera.position.x+=dx/n;if(canMove(camera.position.x,camera.position.z+dz/n))camera.position.z+=dz/n;}camera.position.y=world.eyeHeight(camera.position.x,camera.position.z);}
 function lighting(dt){day+=(targetDay-day)*(1-Math.exp(-dt*1.4));if(Math.abs(day-targetDay)<.002)day=targetDay;const light=world.lightState(day);scene.background.copy(night).lerp(dayColor,day);scene.fog.color.copy(scene.background);scene.fog.density=light.fog/(walking?1:Math.max(1,camera.position.distanceTo(controls.target)/46));sky.intensity=light.ambient;sky.color.set('#91a2ba').lerp(new T.Color('#e1e7dc'),day);sun.intensity=light.sun;sun.color.set('#b8c9e4').lerp(new T.Color('#fff0d4'),day);sun.position.set(-16,8+day*17,12);fill.intensity=.14+day*.13;scene.environmentIntensity=.25+day*.9;renderer.toneMappingExposure=light.exposure;
  windowBounce.forEach(l=>{l.intensity=.20+day*3.6;l.color.set('#9cabc6').lerp(new T.Color('#d4e0e4'),day);});a.lights.forEach((l,i)=>{l.intensity=(i===a.lights.length-1?3:18)*light.lantern;});m.lamp.emissiveIntensity=.15+light.lantern*1.8;m.windowPaper.emissiveIntensity=.03+light.lantern*.38;document.body.classList.toggle('night',day<.4);$('time-name').textContent=day>.85?'白昼 · 细雨':day<.15?'夜雨 · 灯暖':'暮色 · 烟雨';garden.animate(elapsed,day);
 }
 function tick(now){const dt=Math.min((now-last)/1000,.05);last=now;if(visible){elapsed+=dt;if(walking){const forward=(input.w||input.arrowup?1:0)-(input.s||input.arrowdown?1:0),side=(input.d||input.arrowright?1:0)-(input.a||input.arrowleft?1:0),speed=input.shift?3.5:1.75,normal=Math.max(1,Math.hypot(forward,side));move((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed*dt/normal,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed*dt/normal);pose();lookIdle+=dt;if(lookIdle>.4){$('place-name').textContent=roomAt();lookIdle=0;}}else controls.update();lighting(dt);composer.render();}requestAnimationFrame(tick);}
 $('overview').onclick=()=>overview();$('walk').onclick=()=>enter({x:-5,y:1.75,z:1.2,yaw:0});$('reset-view').onclick=()=>{overview();if(!a.roof.visible){a.lights.forEach(l=>{if(l.castShadow)l.shadow.needsUpdate=true;});sun.shadow.needsUpdate=true;}a.roof.visible=true;$('roof').checked=false;};
 document.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>enter(world.ROOMS.find(r=>r.id===b.dataset.room)));
 const setDay=v=>{targetDay=v;$('time').value=Math.round(v*100);$('day').setAttribute('aria-pressed',v===1);$('night').setAttribute('aria-pressed',v===0);};$('day').onclick=()=>setDay(1);$('night').onclick=()=>setDay(0);$('time').oninput=e=>setDay(Number(e.target.value)/100);
 $('roof').onchange=e=>{if(walking)overview();a.roof.visible=!e.target.checked;sun.shadow.needsUpdate=true;a.lights.forEach(l=>{if(l.castShadow)l.shadow.needsUpdate=true;});};$('quality').onclick=()=>{quality=!quality;ao.enabled=bloom.enabled=quality;renderer.setPixelRatio(quality?Math.min(devicePixelRatio,1.5):1);sun.shadow.mapSize.set(quality?2048:1024,quality?2048:1024);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}resize();$('quality').setAttribute('aria-pressed',quality);$('quality').textContent=quality?'精细画质':'流畅画质';};
 $('places-toggle').onclick=()=>{const open=$('places-toggle').getAttribute('aria-expanded')!=='true';$('places-toggle').setAttribute('aria-expanded',open);$('places-nav').hidden=!open;};if(matchMedia('(max-width:700px)').matches){$('places-toggle').setAttribute('aria-expanded','false');$('places-nav').hidden=true;}
 $('help').onclick=()=>{const open=$('help-panel').hidden;$('help-panel').hidden=!open;$('help').setAttribute('aria-expanded',open);};
 window.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;const k=e.key.toLowerCase();if(walking&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(k)){e.preventDefault();input[k]=true;}if(k==='escape'){overview();$('help-panel').hidden=true;$('help').setAttribute('aria-expanded',false);}});window.addEventListener('keyup',e=>delete input[e.key.toLowerCase()]);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{visible=!document.hidden;clear();});
 canvas.addEventListener('pointerdown',e=>{if(!walking)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!walking||!drag||drag.id!==e.pointerId)return;yaw-=(e.clientX-drag.x)*.004;pitch=Math.max(-1.2,Math.min(1.2,pitch-(e.clientY-drag.y)*.004));drag.x=e.clientX;drag.y=e.clientY;pose();});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
 document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();input[b.dataset.move]=true;b.classList.add('held');b.setPointerCapture(e.pointerId);});const release=()=>{delete input[b.dataset.move];b.classList.remove('held');};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);});
 // Stable functional metadata is also used by the automated scene contract tests.
 canvas.dataset.ready='true';canvas.dataset.rooms=world.ROOMS.map(r=>r.id).join(',');new ResizeObserver(resize).observe(canvas.parentElement);resize();lighting(0);composer.render();$('loading').hidden=true;if(!preview)requestAnimationFrame(tick);
}
