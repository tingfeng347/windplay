(function () {
  'use strict';
  const E=window.EmberWilds,$=id=>document.getElementById(id),KEY='windplay.ember-wilds.v1';
  let s=E.create(),started=false,saved=null,last=0,lastUI=0,lastSave=0,lastMessage='',toastUntil=0,audio=null,sound=false,helpPaused=false,deathShown=false;
  const keys=new Set(),touch=new Set(),painter=new window.EmberPainter($('world'),$('map'));
  const ICONS={wood:'▰',branch:'⑂',flint:'◈',stone:'⬟',grass:'〃',berry:'●',meat:'◒',cooked:'♨',axe:'⚒',pick:'⛏',campfire:'♨',torch:'♧',spear:'↟',armor:'⛨',trap:'⌗',shelter:'⌂'};
  const escape=str=>String(str).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  try{saved=E.restore(localStorage.getItem(KEY));}catch{}
  if(saved&&!saved.dead){$('continue').hidden=false;$('continue').textContent=`继续第 ${saved.day} 天`;}
  Object.defineProperty(E,'game',{get:()=>JSON.parse(E.serialize(s))});
  function beep(frequency=350,duration=.08){if(!sound)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=frequency;g.gain.setValueAtTime(.08,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');toastUntil=performance.now()+3200;}
  function save(){if(!started)return false;try{localStorage.setItem(KEY,E.serialize(s));lastSave=s.time;return true;}catch{toast('当前浏览器无法保存存档。旅程仍可继续。');return false;}}
  function begin(continueSave=false){s=continueSave&&saved?saved:E.create($('seed').value.trim()||'windplay');started=true;keys.clear();touch.clear();s.paused=false;s.dead=false;deathShown=false;painter.lastMap=-1;$('welcome').hidden=true;$('death-screen').hidden=true;$('pause-screen').hidden=true;lastSave=s.time;lastMessage='';update(true);save();beep(280,.18);}
  $('start').onclick=()=>begin();$('continue').onclick=()=>begin(true);
  function setPaused(value){if(!started||s.dead)return;keys.clear();touch.clear();s.paused=value;$('pause-screen').hidden=!value;$('pause').textContent=value?'继续':'暂停';if(value){save();$('save-status').textContent='旅程已自动保存。';}}
  $('pause').onclick=()=>setPaused(!s.paused);$('resume').onclick=()=>setPaused(false);
  $('save').onclick=()=>{$('save-status').textContent=save()?'旅程已保存，可关闭网页后继续。':'当前浏览器无法保存。';};
  function reset(){if(!started)return;s=E.create($('seed').value.trim()||'windplay');s.paused=false;deathShown=false;painter.lastMap=-1;keys.clear();touch.clear();$('pause-screen').hidden=true;$('death-screen').hidden=true;$('pause').textContent='暂停';lastMessage='';lastSave=0;save();update(true);}
  let restartArmed=false;$('restart').onclick=()=>{if(!restartArmed){restartArmed=true;$('restart').textContent='再次点击，重新开始';return;}restartArmed=false;$('restart').textContent='重新开始';reset();};
  $('rebirth').onclick=reset;$('death-menu').onclick=()=>{started=false;s.paused=true;$('death-screen').hidden=true;$('welcome').hidden=false;$('continue').hidden=true;};
  function showHelp(){helpPaused=s.paused;s.paused=true;keys.clear();touch.clear();$('help-screen').hidden=false;}
  function closeHelp(){$('help-screen').hidden=true;s.paused=helpPaused;}
  $('help').onclick=showHelp;$('help-close').onclick=closeHelp;$('help-done').onclick=closeHelp;
  $('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'音效开':'音效关';$('sound').setAttribute('aria-pressed',sound);if(sound)beep();};
  let journal=true;$('journal-toggle').onclick=()=>{journal=!journal;$('objectives').hidden=!journal;$('journal-toggle').setAttribute('aria-expanded',journal);$('journal-toggle').querySelector('span').textContent=journal?'−':'+';};
  let mapOpen=true;$('map-toggle').onclick=()=>{mapOpen=!mapOpen;$('map').hidden=!mapOpen;$('map-toggle').textContent=mapOpen?'−':'+';$('map-toggle').setAttribute('aria-expanded',mapOpen);};
  function craftToggle(value){const panel=$('craft-panel');if(innerWidth<=760){panel.classList.toggle('mobile-open',value===undefined?!panel.classList.contains('mobile-open'):value);$('craft-open').style.display=panel.classList.contains('mobile-open')?'none':'block';}else{panel.style.display=value===undefined?(panel.style.display==='none'?'block':'none'):value?'block':'none';$('craft-open').style.display=panel.style.display==='none'?'block':'none';}}
  $('craft-close').onclick=()=>craftToggle(false);$('craft-open').onclick=()=>craftToggle(true);
  for(const [key,r]of Object.entries(E.RECIPES)){
    const b=document.createElement('button');b.className='recipe';b.dataset.recipe=key;b.title=r.desc;b.innerHTML=`<span class="icon" aria-hidden="true">${ICONS[key]}</span><span><strong>${r.title}</strong><span class="desc">${r.desc}</span><span class="cost">${Object.entries(r.cost).map(([k,v])=>`<span data-cost="${k}">${E.NAMES[k]} ${v}</span>`).join('')}</span></span><span class="make">制作</span>`;
    b.onclick=()=>{if(!started||s.paused||s.dead)return;if(E.craft(s,key)){beep(500,.1);save();update(true);}};$('recipes').appendChild(b);
  }
  for(const key of Object.keys(s.inventory)){
    const food=['berry','meat','cooked'].includes(key),b=document.createElement(food?'button':'div');b.className=`slot${food?' food':''}`;b.dataset.item=key;b.innerHTML=`<span class="item-icon" aria-hidden="true">${ICONS[key]}</span><b>0</b><small>${E.NAMES[key]}</small>${key==='berry'?'<i class="shortcut">1</i>':key==='cooked'?'<i class="shortcut">2</i>':''}`;if(food){b.title=`点击吃${E.NAMES[key]}${key==='meat'?'（会损伤健康与精神）':''}`;b.onclick=()=>{if(started&&!s.paused&&E.eat(s,key)){beep(420);save();update(true);}};}$('inventory').appendChild(b);
  }
  $('cook').onclick=()=>{if(started&&!s.paused&&E.cook(s)){beep(610,.13);save();update(true);}};
  function interact(){if(started&&!s.paused&&!s.dead){if(E.interact(s))beep(240);update(true);}}
  function attackEnemy(){const enemy=s.entities.filter(e=>['rabbit','spider','wolf'].includes(e.type)&&E.distance(e,s.player)<95).sort((a,b)=>E.distance(a,s.player)-E.distance(b,s.player))[0];return E.attack(s,enemy);}
  $('interact').onclick=interact;$('touch-attack').onclick=()=>{if(started&&!s.paused){attackEnemy();update(true);}};
  window.addEventListener('keydown',event=>{
    if(event.target instanceof HTMLInputElement)return;
    const k=event.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','e','tab'].includes(k)&&started)event.preventDefault();
    if(k==='escape'){if(!$('help-screen').hidden)closeHelp();else setPaused(!s.paused);return;}
    if(!started||s.paused||s.dead)return;keys.add(k);if(event.repeat)return;
    if(k==='1'){E.eat(s,'berry');update(true);}if(k==='2'){E.eat(s,'cooked');update(true);}if(k==='3'){E.eat(s,'meat');update(true);}
    if(k==='c')craftToggle();if(k==='m')$('map-toggle').click();if(k==='q'&&E.craft(s,'torch'))update(true);
  });
  window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur',()=>{keys.clear();touch.clear();if(started&&!s.dead)setPaused(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!s.dead)setPaused(true);});
  $('world').addEventListener('pointermove',event=>{painter.pointer={x:event.clientX,y:event.clientY};});$('world').addEventListener('pointerleave',()=>painter.pointer=null);
  $('world').addEventListener('pointerdown',event=>{
    if(!started||s.paused||s.dead)return;painter.pointer={x:event.clientX,y:event.clientY};const point=painter.toWorld(event.clientX,event.clientY);let e=null,d=75;
    for(const item of s.entities){if(item.available===false||['dead','stump','rubble'].includes(item.type))continue;const pos=painter.toScreen(item.x,item.y);const n=Math.hypot(pos.x-event.clientX,pos.y-25*painter.scale-event.clientY);if(n<d){d=n;e=item;}}
    if(e)E.aim(s,e.x,e.y,e.id);else E.aim(s,point.x,point.y);event.preventDefault();
  });
  for(const b of document.querySelectorAll('[data-dir]')){b.addEventListener('pointerdown',event=>{b.setPointerCapture(event.pointerId);touch.add(b.dataset.dir);event.preventDefault();});const stop=()=>touch.delete(b.dataset.dir);b.addEventListener('pointerup',stop);b.addEventListener('pointercancel',stop);b.addEventListener('lostpointercapture',stop);}
  addEventListener('resize',()=>{painter.resize();if(innerWidth>760){$('craft-panel').classList.remove('mobile-open');$('craft-panel').style.display='';$('craft-open').style.display='';}update(true);});
  function update(force=false){
    if(!force&&performance.now()-lastUI<130)return;lastUI=performance.now();
    for(const key of ['health','hunger','sanity']){$(key).value=Math.ceil(s.player[key]);$(key).textContent=Math.ceil(s.player[key]);document.querySelector(`.vital.${key} .meter i`).style.width=`${s.player[key]}%`;}
    $('day-label').textContent=`第 ${s.day} 天`;$('phase-label').textContent={day:'白昼',dusk:'黄昏',night:'黑夜'}[s.phase];$('weather-label').textContent=`${s.weather==='rain'?'雨':'晴'} · ${Math.round(s.player.temperature)}°C`;$('clock-hand').style.transform=`rotate(${s.time%E.DAY/E.DAY*360}deg)`;
    for(const slot of document.querySelectorAll('[data-item]')){const key=slot.dataset.item;slot.querySelector('b').textContent=s.inventory[key];if(slot.tagName==='BUTTON')slot.disabled=s.inventory[key]===0;}
    for(const b of document.querySelectorAll('[data-recipe]')){const key=b.dataset.recipe;b.disabled=!E.canCraft(s,key)||!started||s.paused;for(const cost of b.querySelectorAll('[data-cost]'))cost.classList.toggle('missing',s.inventory[cost.dataset.cost]<E.RECIPES[key].cost[cost.dataset.cost]);b.querySelector('.make').textContent=E.RECIPES[key].durability&&s.tools[key]>0?'已有':'制作';}
    $('tools').innerHTML=Object.entries(s.tools).filter(([,v])=>v>0).map(([k,v])=>`<i>${ICONS[k]} ${E.NAMES[k]} ${Math.ceil(v)}</i>`).join('')+(s.player.torch>0?`<i>火把 ${Math.ceil(s.player.torch)} 秒</i>`:'');
    const near=E.nearest(s);$('context').textContent=E.actionLabel(s,near);$('interact').textContent=near?'E '+E.actionLabel(s,near):'E 采集 / 交互';
    $('light-status').textContent=s.resting?'休息中，移动结束':s.phase==='night'?(E.light(s)?'光照安全':'黑暗危险！制作火把 / 返回营火'):s.phase==='dusk'?'准备过夜的光':'';document.body.classList.toggle('danger',s.player.darkness>1);$('light-status').classList.toggle('dark-warning',s.phase==='night'&&!E.light(s));
    const fire=s.entities.find(e=>e.type==='campfire'&&E.distance(e,s.player)<155);$('cook').disabled=!started||s.paused||!fire||fire.fuel<=0||s.inventory.berry+s.inventory.meat===0;if(near&&near.type==='campfire')$('context').textContent=`营火剩余燃料 ${Math.ceil(near.fuel)} · E 添木材`;
    $('objectives').innerHTML=E.objectives(s).map(o=>`<div class="objective${o.done?' done':''}"><span>${o.done?'✓':'□'}</span>${escape(o.label)}</div>`).join('');
    const message=s.messages.at(-1);if(started&&message&&message.text!==lastMessage){lastMessage=message.text;toast(message.text);}
    if(s.dead&&started&&!deathShown){deathShown=true;$('death-screen').hidden=false;$('death-stats').textContent=`你在荒野停留了 ${s.day} 天，采集 ${s.stats.gathered} 次，制作 ${s.stats.crafted} 件物品。再出发时，记得在黄昏前点火。`;save();}
  }
  function frame(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
    if(started&&!s.paused&&!s.dead){const x=(keys.has('d')||keys.has('arrowright')||touch.has('right')?1:0)-(keys.has('a')||keys.has('arrowleft')||touch.has('left')?1:0),y=(keys.has('s')||keys.has('arrowdown')||touch.has('down')?1:0)-(keys.has('w')||keys.has('arrowup')||touch.has('up')?1:0);E.tick(s,dt,{x,y,sprint:keys.has('shift')});if(keys.has('e'))interact();if(keys.has(' '))attackEnemy();if(s.time-lastSave>=15)save();}
    painter.render(s);update();if(now>toastUntil)$('toast').classList.remove('visible');requestAnimationFrame(frame);
  }
  update(true);requestAnimationFrame(frame);window.addEventListener('pagehide',save);
})();
