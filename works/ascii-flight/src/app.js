import core from './core.cjs';
import {render} from './render.js';
const {createState,step,collision,crossesGate,city,ROUTES,gates,WORLD_BOUNDS}=core;
const parameters=new URLSearchParams(location.search),preview=parameters.has('preview');
document.body.classList.toggle('preview',preview);
const $=id=>document.getElementById(id),canvas=$('view'),world=city(),input={},storeKey='windplay-ascii-flight-best-city-v2';
let state=createState(),routeIndex=0,routeGates=gates(ROUTES[0]),last=0,drawLast=0,noticeUntil=0,drawDirty=true;
function fit(){const rect=canvas.getBoundingClientRect(),scale=Math.min(1,1440/rect.width);canvas.width=preview?1280:Math.max(360,Math.round(rect.width*scale));canvas.height=preview?Math.round(1280*rect.height/Math.max(1,rect.width)):Math.round(rect.height*scale);draw();}
function draw(){render(canvas,state,world,routeGates,state.gate);drawDirty=false;}
function clearInput(){for(const k of Object.keys(input))delete input[k];document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
function notice(text){$('notice').textContent=text;noticeUntil=performance.now()+3500;}
function selectRoute(){routeIndex=$('route').value==='free'?-1:Number($('route').value);routeGates=routeIndex<0?[]:gates(ROUTES[routeIndex]);$('route-note').textContent=routeIndex<0?'没有计时限制，自由探索。小心建筑和树冠。':ROUTES[routeIndex].description;$('route-name').textContent=routeIndex<0?'自由飞行':ROUTES[routeIndex].name;update();draw();}
function start(){clearInput();state=createState();state.status='flying';$('start-panel').hidden=true;$('result').hidden=true;$('pause').disabled=false;$('pause').textContent='暂停';notice('保持平飞，穿过前方金色航门');update();draw();}
function finish(reason){state.status='ended';clearInput();$('result').hidden=false;$('pause').disabled=true;$('result-title').textContent=reason||'航线完成';let text=`飞行 ${state.time.toFixed(1)} 秒，航程 ${Math.round(state.distance)} 米。`;
 if(!reason){let best=null;try{const records=JSON.parse(localStorage.getItem(storeKey)||'{}');best=records[routeIndex];if(!best||state.time<best){records[routeIndex]=state.time;localStorage.setItem(storeKey,JSON.stringify(records));text+=' 新的最快纪录。';}else text+=` 最快 ${best.toFixed(1)} 秒。`;}catch{}}
 $('result-text').textContent=text;update();}
function pause(){if(state.status==='flying'){state.status='paused';clearInput();$('pause').textContent='继续';notice('已暂停 · P / Esc 继续');}else if(state.status==='paused'){state.status='flying';$('pause').textContent='暂停';$('notice').textContent='';}}
function update(){const degrees=v=>Math.round(v*180/Math.PI),sign=v=>(v>=0?'+':'')+v;$('speed').textContent=state.speed.toFixed(0);$('altitude').textContent=state.y.toFixed(0);$('heading').textContent=String((degrees(state.yaw)%360+360)%360).padStart(3,'0');$('pitch').textContent=`俯仰 ${sign(degrees(state.pitch))}°`;$('roll').textContent=`滚转 ${sign(degrees(state.roll))}°`;$('turn').textContent=`偏航 ${sign(degrees(state.roll/core.LIMIT*core.TURN_RATE))}°/s`;$('gate-count').textContent=routeGates.length?`航门 ${state.gate} / ${routeGates.length}`:'自由航线';$('distance').textContent=`航程 ${Math.round(state.distance)} m`;}
function frame(now){
 let elapsed=last?Math.min((now-last)/1000,.25):0;last=now;
 // Integrate slow frames in short steps so control rates stay in seconds.
 while(state.status==='flying'&&elapsed>0){
  const dt=Math.min(elapsed,.05),previous={...state};elapsed-=dt;
  step(state,input,dt);drawDirty=true;
  const hit=collision(previous,state,world);
  if(hit)finish(hit);
  else if(routeGates[state.gate]&&crossesGate(previous,state,routeGates[state.gate])){
   state.gate++;
   if(state.gate===routeGates.length)finish();
   else notice(`航门 ${state.gate} / ${routeGates.length} · 继续前行`);
  }
  if(state.status==='flying'&&(state.x<WORLD_BOUNDS.minX||state.x>WORLD_BOUNDS.maxX||state.z>WORLD_BOUNDS.maxZ||state.z<WORLD_BOUNDS.minZ))finish('飞出城市');
 }
 if(now-drawLast>40&&(state.status==='flying'||drawDirty)){drawLast=now;draw();update();}
 if(now>noticeUntil&&state.status!=='paused')$('notice').textContent='';
 requestAnimationFrame(frame);
}
window.addEventListener('keydown',e=>{if(e.target.matches('select,input,textarea'))return;const key=e.key.toLowerCase();if('wasdzx'.includes(key)){e.preventDefault();input[key]=true;}if(!e.repeat){if(key==='p'||key==='escape')pause();if(key==='r')start();if(key==='enter'&&state.status==='ready')start();}});
window.addEventListener('keyup',e=>delete input[e.key.toLowerCase()]);window.addEventListener('blur',()=>{clearInput();if(state.status==='flying')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.status==='flying')pause();});
for(const button of document.querySelectorAll('[data-key]')){button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);input[button.dataset.key]=true;button.classList.add('held');});const release=()=>{delete input[button.dataset.key];button.classList.remove('held');};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);}
$('start').onclick=start;$('retry').onclick=start;$('reset').onclick=start;$('pause').onclick=pause;$('choose').onclick=()=>{state=createState();$('result').hidden=true;$('start-panel').hidden=false;$('pause').disabled=true;selectRoute();};$('route').onchange=selectRoute;$('help').onclick=()=>{const open=$('instructions').hidden;$('instructions').hidden=!open;$('help').setAttribute('aria-expanded',open);if(open&&state.status==='flying')pause();};
new ResizeObserver(fit).observe(canvas);selectRoute();
if(preview){
 const views={river:{x:240,y:48,z:600,yaw:1.3,pitch:-.25},park:{x:-180,y:32,z:660,yaw:1.2,pitch:-.1},industrial:{x:-360,y:60,z:1120,yaw:-.4,pitch:-.12}};
 Object.assign(state,views[parameters.get('view')]||{});
}
fit();if(!preview)requestAnimationFrame(frame);
