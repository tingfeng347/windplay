(function(root){
  'use strict';
  const C=root.VoxelCore,$=id=>document.getElementById(id),canvas=$('world');
  const STORE='windplay.voxel-frontier.v1';
  let renderer,state=C.createState('windplay','creative'),playing=false,paused=true,menu='welcome',chosenMode='creative',mobs=[],keys=Object.create(null),mining=false,miningKey='',miningTime=0,hit=null,attackCooldown=0,savingClock=0,hudClock=0,mapClock=0,lastFrame=0,autoSaveAllowed=false,savedAvailable=false,soundEnabled=false,audioContext=null,lookPointer=null,touchLook=false,toastTimer=0,mobClock=0,lastHealth=20,lastMapSeed=null;
  const iconCache=new Map(),isTouch=window.matchMedia('(pointer:coarse)').matches;
  let mapCache=null;
  function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
  function tone(frequency=.1,type='mine'){
    if(!soundEnabled)return;
    try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type==='mine'?'triangle':'sine';o.frequency.value=frequency;o.frequency.exponentialRampToValueAtTime(Math.max(30,frequency*.45),audioContext.currentTime+.09);g.gain.setValueAtTime(.07,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.13);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+.14);}catch{soundEnabled=false;$('sound').textContent='声音：不可用';}
  }
  function stored(){try{return localStorage.getItem(STORE);}catch{return null;}}
  function save(manual=true){
    try{localStorage.setItem(STORE,C.serialize(state));savedAvailable=true;autoSaveAllowed=true;$('storage-status').textContent='世界已保存在此浏览器。导出存档可跨设备保存。';if(manual)toast('世界已保存');return true;}
    catch{$('storage-status').textContent='此浏览器无法保存，或存储空间不足。请导出存档保存世界。';if(manual)toast('浏览器存储不可用，请导出存档');return false;}
  }
  function itemVisual(id){
    if(C.BLOCKS[id]){if(!iconCache.has(id))iconCache.set(id,renderer.icon(id));return `<img src="${iconCache.get(id)}" alt="">`;}
    return `<span class="item-symbol" aria-hidden="true" style="color:${id===25?'#dc7d78':id===26?'#e9ab6d':id===30?'#818d87':'#e8e2c4'}">${C.ITEMS[id]?.icon||'◆'}</span>`;
  }
  function slotHTML(id,index){
    const selected=index===state.selected,empty=!C.available(state,id),dur=state.durability[id],max=C.ITEMS[id]?.durability;
    const count=state.mode==='creative'?'∞':state.inventory[id]||0;
    return `<button class="slot ${selected?'selected':''} ${empty?'empty':''}" data-slot="${index}" aria-label="快捷栏 ${index+1}：${C.ITEMS[id].name}，${count}" aria-pressed="${selected}"><span class="slot-number">${index+1}</span>${itemVisual(id)}<span class="count">${max&&count>0?'':count}</span>${max&&count>0?`<i class="tool-life" style="right:${6+((1-(dur??max)/max)*80)}%"></i>`:''}</button>`;
  }
  function refreshHotbar(){
    $('hotbar').innerHTML=state.hotbar.map(slotHTML).join('');
    $('inventory-hotbar').innerHTML=state.hotbar.map(slotHTML).join('');
    const id=C.selectedItem(state),item=C.ITEMS[id];$('active-name').textContent=item.name+(state.mode==='survival'&&!C.available(state,id)?' · 没有库存':'');
    document.querySelectorAll('[data-slot]').forEach(button=>button.onclick=()=>{state.selected=+button.dataset.slot;miningTime=0;refreshHotbar();if(menu==='inventory')refreshInventory();});
  }
  function refreshInventory(){
    $('inventory-grid').innerHTML=Object.keys(C.ITEMS).filter(id=>+id>0&&+id!==15&&+id!==10).map(id=>{
      const item=C.ITEMS[id],count=state.mode==='creative'?'∞':state.inventory[id]||0;
      return `<button class="item-tile ${+id===C.selectedItem(state)?'selected':''} ${!C.available(state,+id)?'empty':''}" data-item="${id}" title="${item.name}：${count}" aria-label="${item.name}，库存 ${count}">${itemVisual(+id)}<small>${item.name}</small><span class="count">${count}</span></button>`;
    }).join('');
    document.querySelectorAll('[data-item]').forEach(button=>button.onclick=()=>{
      const id=+button.dataset.item;state.hotbar[state.selected]=id;refreshHotbar();refreshInventory();
      $('item-description').textContent=`${C.ITEMS[id].name}：${C.ITEMS[id].description||(C.ITEMS[id].tool?'左键使用工具，挖掘或攻击会消耗耐久。':'选中后右键放置；按住左键可以挖掘。')}`;
    });
    $('recipes').innerHTML=C.RECIPES.map(r=>{
      const ready=C.canCraft(state,r),ingredients=Object.entries(r.input).map(([id,n])=>`${C.ITEMS[id].name} ×${n}`).join(' + '),out=Object.entries(r.output).map(([id,n])=>`${C.ITEMS[id].name} ×${n}`).join('');
      return `<button class="recipe" data-recipe="${r.id}" ${ready?'':'disabled'} title="合成 ${out}"><div><strong>${r.name}</strong><small>${ingredients}</small></div><span>×${Object.values(r.output)[0]}</span></button>`;
    }).join('');
    document.querySelectorAll('[data-recipe]').forEach(button=>button.onclick=()=>{const recipe=C.RECIPES.find(r=>r.id===button.dataset.recipe);if(C.craft(state,recipe.id)){tone(440,'craft');refreshInventory();refreshHotbar();toast(`已合成 ${Object.entries(recipe.output).map(([id,n])=>C.ITEMS[id].name+' ×'+n).join('')}`);}});
  }
  function openMenu(name){
    mining=false;miningTime=0;keys=Object.create(null);paused=true;menu=name;
    document.querySelectorAll('.screen').forEach(s=>s.hidden=s.id!==name);
    if(document.pointerLockElement)document.exitPointerLock();
    if(name==='inventory'){refreshInventory();refreshHotbar();}
    if(name==='pause'){
      $('pause-summary').textContent=`种子 ${state.world.seed} / 第 ${state.day} 天 / 已挖掘 ${state.blocksMined} 块，放置 ${state.blocksPlaced} 块`;
      $('new-seed').value=state.world.seed;
      $('change-mode').textContent=state.mode==='creative'?'切换至生存（新背包）':'切换至创造模式';
      $('storage-status').textContent=autoSaveAllowed?'自动保存已开启，每 30 秒保存一次。':'当前新世界尚未覆盖旧存档。点击「保存世界」后启用自动保存。';
    }
  }
  async function lock(){
    if(isTouch)return;
    try{await canvas.requestPointerLock();}
    catch{toast('鼠标锁定不可用：按住画面拖动观察，使用屏幕挖掘/放置按钮');$('touch-controls').style.display='block';}
  }
  function resume(){
    if(!playing)return;paused=false;menu=null;document.querySelectorAll('.screen').forEach(s=>s.hidden=true);$('hud').hidden=false;
    keys=Object.create(null);mining=false;lock();
  }
  function spawnMobs(){
    mobs=[];const w=state.world;
    for(let i=0;i<7;i++){
      const x=10+C.hash(i,1,w.seedValue^319)*(w.width-20),z=10+C.hash(i,2,w.seedValue^719)*(w.depth-20),y=w.surface(Math.floor(x),Math.floor(z));
      if(w.get(Math.floor(x),y-1,Math.floor(z))!==6&&w.get(Math.floor(x),y,Math.floor(z))!==10)mobs.push({id:i,x,y,z,type:'sheep',health:10,heading:C.hash(i,5,w.seedValue)*Math.PI*2,age:0,hurt:0});
    }
  }
  function begin(newState,loading=false){
    state=newState;playing=true;paused=false;menu=null;renderer.reset();spawnMobs();lastHealth=state.player.health;savingClock=0;lastMapSeed=null;autoSaveAllowed=loading||!savedAvailable;
    refreshHotbar();updateHud();document.querySelectorAll('.screen').forEach(s=>s.hidden=true);$('hud').hidden=false;
    if(state.player.health<=0){openMenu('death');return;}
    lock();toast(state.mode==='creative'?'创造模式：按 F 开启飞行，按 E 选择方块':'生存模式：先用原木合成一把木镐');
  }
  function targetDirection(){const p=state.player;return {x:Math.sin(p.yaw)*Math.cos(p.pitch),y:Math.sin(p.pitch),z:-Math.cos(p.yaw)*Math.cos(p.pitch)};}
  function attackMob(){
    if(attackCooldown>0)return false;
    const p=state.player,d=targetDirection(),eye={x:p.x,y:p.y+1.62,z:p.z};let best=null,bestT=4;
    for(const mob of mobs){const vx=mob.x-eye.x,vy=mob.y+.75-eye.y,vz=mob.z-eye.z,t=vx*d.x+vy*d.y+vz*d.z;
      const near=Math.hypot(vx-d.x*t,vy-d.y*t,vz-d.z*t);
      if(t>0&&t<bestT&&near<.75&&(!hit||hit.distance>t-.4)){best=mob;bestT=t;}}
    if(!best)return false;
    const item=C.ITEMS[C.selectedItem(state)],damage=item?.damage&&C.available(state,C.selectedItem(state))?item.damage:3;
    best.health-=damage;best.hurt=.4;best.x=C.clamp(best.x+d.x*.35,.5,state.world.width-.5);best.z=C.clamp(best.z+d.z*.35,.5,state.world.depth-.5);
    C.wearTool(state);attackCooldown=.38;tone(110,'hit');refreshHotbar();
    if(best.health<=0){mobs=mobs.filter(m=>m!==best);state.kills++;if(state.mode==='survival')C.addItem(state,best.type==='sheep'?25:30,best.type==='sheep'?3:1);toast(best.type==='sheep'?'获得浆果 ×3':'暗影消散，获得煤 ×1');refreshHotbar();}
    return true;
  }
  function secondary(){
    if(!playing||paused)return;const id=C.selectedItem(state);
    if(C.ITEMS[id]?.food){if(C.eat(state,id)){tone(220,'eat');refreshHotbar();updateHud();toast('吃饱了，再去探险');}else toast('饱食度已满，或没有食物');return;}
    const result=C.place(state,hit,id);if(result.ok){tone(190);refreshHotbar();}else if(result.message)toast(result.message);
  }
  function updateMobs(dt){
    const w=state.world,p=state.player,night=C.daylight(state)<.28;
    mobClock+=dt;
    if(night&&state.mode==='survival'&&mobClock>7&&mobs.filter(m=>m.type==='shade').length<7){
      mobClock=0;const a=C.hash(Math.floor(state.elapsed),state.day,w.seedValue)*Math.PI*2,dist=13;
      const x=C.clamp(p.x+Math.cos(a)*dist,2,w.width-3),z=C.clamp(p.z+Math.sin(a)*dist,2,w.depth-3),y=w.surface(Math.floor(x),Math.floor(z));
      if(w.get(Math.floor(x),y,Math.floor(z))!==10)mobs.push({id:100+state.elapsed,x,y,z,type:'shade',health:14,heading:0,age:0,hurt:0});
    }
    for(const mob of mobs){
      mob.age+=dt;mob.hurt=Math.max(0,mob.hurt-dt);let speed=mob.type==='shade'?1.6:.5;
      const dist=Math.hypot(p.x-mob.x,p.z-mob.z);
      if(mob.type==='shade'&&state.mode==='survival'){
        mob.heading=Math.atan2(p.x-mob.x,p.z-mob.z);
        if(!night){mob.health-=dt*2;speed=.6;}
        if(dist<1.4&&Math.abs(p.y-mob.y)<1.7&&p.invulnerable<=0){
          let lamp=false;for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)for(let dy=-1;dy<=2;dy++)if(w.get(Math.floor(p.x)+dx,Math.floor(p.y)+dy,Math.floor(p.z)+dz)===14)lamp=true;
          if(!lamp){p.health=Math.max(0,p.health-2);p.invulnerable=1.25;tone(70,'hit');}else speed=0;
        }
      }else if(Math.floor(mob.age/3)!==Math.floor((mob.age-dt)/3))mob.heading+=C.hash(mob.id,Math.floor(mob.age),w.seedValue)*2-1;
      if(mob.hurt>0)speed=0;
      const nx=mob.x+Math.sin(mob.heading)*speed*dt,nz=mob.z+Math.cos(mob.heading)*speed*dt,ny=w.surface(Math.floor(nx),Math.floor(nz));
      if(nx>1&&nx<w.width-1&&nz>1&&nz<w.depth-1&&Math.abs(ny-mob.y)<=1.05&&w.get(Math.floor(nx),ny,Math.floor(nz))!==10&&!C.collides(w,nx,ny,nz,1.2,.26)){mob.x=nx;mob.z=nz;mob.y=ny;}
      else mob.heading+=1.1;
    }
    mobs=mobs.filter(m=>m.health>0);
  }
  function updateHud(){
    const p=state.player,day=C.daylight(state),hours=((state.time/480*24)+6)%24;
    $('day-text').textContent=`第 ${state.day} 天 · ${String(Math.floor(hours)).padStart(2,'0')}:${String(Math.floor((hours%1)*60)).padStart(2,'0')}`;
    $('mode-text').textContent=state.mode==='creative'?(p.flight?'创造 · 飞行中':'创造模式'):'生存模式';
    $('coordinates').textContent=`位置 ${Math.floor(p.x)} / ${Math.floor(p.y)} / ${Math.floor(p.z)}`;
    const deg=((p.yaw*180/Math.PI)%360+360)%360;
    $('direction-text').textContent=['北','东北','东','东南','南','西南','西','西北'][Math.round(deg/45)%8]+' / '+(day<.28?'夜晚':day<.55?'黄昏':'白昼');
    $('survival-stats').hidden=state.mode==='creative';
    $('hearts').textContent='♥'.repeat(Math.ceil(p.health/2))+'♡'.repeat(10-Math.ceil(p.health/2));
    $('hunger').textContent='◆'.repeat(Math.ceil(p.hunger/2))+'◇'.repeat(10-Math.ceil(p.hunger/2));
    $('flight-hint').hidden=state.mode!=='creative';$('touch-fly').hidden=state.mode!=='creative';$('touch-down').hidden=!p.flight;
    let quest='造一间只属于你的房子。';
    if(state.mode==='survival')quest=!state.inventory[21]&&!state.inventory[22]&&!state.inventory[32]?'按 E 合成木镐，再去采集石头。':!state.inventory[24]?'有镐了！挖石头，合成一把剑。':state.blocksPlaced<12?'天黑前，用方块搭一个庇护所。':'在灯石附近，静候黎明。';
    $('quest').textContent=quest;
    if(p.health<lastHealth){$('damage-flash').style.opacity='.8';setTimeout(()=>$('damage-flash').style.opacity='0',180);}lastHealth=p.health;
  }
  function drawMap(){
    const ctx=$('map').getContext('2d'),w=state.world,p=state.player;
    if(lastMapSeed!==w.seed||!mapCache){
      const cache=document.createElement('canvas');cache.width=w.width;cache.height=w.depth;const c=cache.getContext('2d');
      const colors={1:'#6f914c',2:'#856941',3:'#89918c',6:'#cdbb80',7:'#bacfcd',8:'#858f89',9:'#ae8859',10:'#457d9b',11:'#6b7770',12:'#8f8074',14:'#e1c587'};
      for(let x=0;x<w.width;x++)for(let z=0;z<w.depth;z++){
        const terrain=w.surface(x,z);let id=w.get(x,terrain-1,z);if(w.get(x,terrain,z)===10)id=10;
        c.fillStyle=colors[id]||'#63884a';c.fillRect(x,z,1,1);if(terrain>22){c.fillStyle='rgba(255,255,255,.13)';c.fillRect(x,z,1,1);}else if(terrain<14&&id!==10){c.fillStyle='rgba(0,0,0,.14)';c.fillRect(x,z,1,1);}
      }
      mapCache=cache;lastMapSeed=w.seed;
    }
    ctx.drawImage(mapCache,0,0,120,120);ctx.fillStyle='#fff7df';ctx.beginPath();ctx.arc(p.x/w.width*120,p.z/w.depth*120,3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#26352c';ctx.lineWidth=1;ctx.stroke();
    ctx.strokeStyle='#fff7df';ctx.beginPath();ctx.moveTo(p.x/w.width*120,p.z/w.depth*120);ctx.lineTo(p.x/w.width*120+Math.sin(p.yaw)*8,p.z/w.depth*120-Math.cos(p.yaw)*8);ctx.stroke();
  }
  function frame(timestamp){
    const dt=Math.min(.05,(timestamp-lastFrame)/1000||.016);lastFrame=timestamp;
    if(playing&&!paused){
      C.stepPlayer(state,{forward:keys.KeyW||keys.ArrowUp,back:keys.KeyS||keys.ArrowDown,left:keys.KeyA||keys.ArrowLeft,right:keys.KeyD||keys.ArrowRight,jump:keys.Space,down:keys.KeyC,sprint:keys.ShiftLeft||keys.ShiftRight},dt);
      hit=C.raycast(state.world,{x:state.player.x,y:state.player.y+1.62,z:state.player.z},targetDirection(),6);
      attackCooldown=Math.max(0,attackCooldown-dt);
      if(mining){
        if(attackMob()){miningTime=0;}
        else if(hit){
          const key=`${hit.x},${hit.y},${hit.z}`;if(miningKey!==key){miningKey=key;miningTime=0;}
          miningTime+=dt;const duration=C.miningDuration(state,hit.id);
          if(miningTime>=duration){const result=C.mine(state,hit);if(result.ok){tone(100+Math.random()*70);refreshHotbar();lastMapSeed=null;if(result.message)toast(result.message);}miningTime=0;miningKey='';}
        }
      }else miningTime=0;
      $('target-name').textContent=hit?C.BLOCKS[hit.id].name:'';$('mine-track').hidden=!mining||!hit;
      if(hit)$('mine-progress').style.width=C.clamp(miningTime/C.miningDuration(state,hit.id)*100,0,100)+'%';
      updateMobs(dt);savingClock+=dt;hudClock+=dt;mapClock+=dt;
      if(savingClock>30){if(autoSaveAllowed)save(false);savingClock=0;}
      if(hudClock>.15){updateHud();hudClock=0;}
      if(mapClock>.4){drawMap();mapClock=0;}
      if(state.player.health<=0)openMenu('death');
    }
    renderer.render(state,mobs,playing&&!paused?hit:null,playing&&!paused?miningTime:0,!playing);
    requestAnimationFrame(frame);
  }
  try{renderer=new root.VoxelRenderer.Renderer(canvas);}catch(error){$('welcome').hidden=true;$('unavailable').hidden=false;$('error-text').textContent=error.message;return;}
  try{const value=stored();if(value){C.deserialize(value);savedAvailable=true;$('continue').hidden=false;}}catch{$('continue').hidden=true;}
  spawnMobs();refreshHotbar();requestAnimationFrame(frame);
  $('random-seed').onclick=()=>$('seed').value='grove-'+Math.random().toString(36).slice(2,9);
  document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{chosenMode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
  $('start').onclick=()=>begin(C.createState($('seed').value.trim()||'windplay',chosenMode));
  $('continue').onclick=()=>{try{const value=stored();if(!value)throw new Error('此浏览器没有存档');begin(C.deserialize(value),true);}catch(e){toast('无法读取存档：'+e.message);}};
  $('inventory-button').onclick=()=>openMenu('inventory');$('pause-button').onclick=()=>openMenu('pause');$('help-button').onclick=()=>openMenu('help');
  $('resume').onclick=resume;document.querySelectorAll('[data-close]').forEach(button=>button.onclick=resume);
  $('save').onclick=()=>save(true);
  $('sound').onclick=()=>{soundEnabled=!soundEnabled;$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').textContent='声音：'+(soundEnabled?'开启':'关闭');tone(440,'craft');};
  $('export').onclick=()=>{const blob=new Blob([C.serialize(state)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='voxel-frontier-'+state.world.seed.replace(/[^a-z0-9-]/gi,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('已导出世界存档');};
  $('import').onclick=()=>$('save-file').click();
  $('save-file').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    if(file.size>4*1024*1024){toast('存档文件过大，请选择 4 MB 内的世界存档');event.target.value='';return;}
    try{const next=C.deserialize(await file.text());begin(next,false);toast('已导入世界；保存后覆盖本地存档');}catch(error){toast('无法导入：'+error.message);}event.target.value='';
  };
  $('new-world').onclick=()=>{const seed=$('new-seed').value.trim()||'grove-'+Math.random().toString(36).slice(2,9);begin(C.createState(seed,state.mode),false);};
  $('change-mode').onclick=()=>{
    state.mode=state.mode==='creative'?'survival':'creative';state.player.flight=false;state.player.health=20;state.player.hunger=20;
    state.inventory=Object.create(null);state.durability=Object.create(null);
    if(state.mode==='creative')for(const id of Object.keys(C.ITEMS)){if(+id>0&&+id!==15)state.inventory[id]=999;}
    else Object.assign(state.inventory,{2:32,4:8,25:8});
    refreshHotbar();updateHud();openMenu('pause');toast(state.mode==='survival'?'已进入生存模式，背包重置为初始物资':'已进入创造模式，所有方块无限使用');
  };
  $('respawn').onclick=()=>{C.respawn(state);lastHealth=20;mobs=mobs.filter(m=>Math.hypot(m.x-state.player.x,m.z-state.player.z)>8);refreshHotbar();updateHud();resume();};
  canvas.oncontextmenu=event=>event.preventDefault();
  canvas.addEventListener('mousedown',event=>{
    if(!playing||paused)return;
    if(!document.pointerLockElement&&!isTouch){lookPointer={x:event.clientX,y:event.clientY};lock();}
    if(event.button===0){mining=true;miningTime=0;attackMob();}
    if(event.button===2)secondary();
  });
  document.addEventListener('mouseup',event=>{if(event.button===0)mining=false;lookPointer=null;});
  document.addEventListener('mousemove',event=>{
    if(!playing||paused)return;
    let dx=0,dy=0;if(document.pointerLockElement===canvas){dx=event.movementX;dy=event.movementY;}
    else if(lookPointer){dx=event.clientX-lookPointer.x;dy=event.clientY-lookPointer.y;lookPointer={x:event.clientX,y:event.clientY};}
    state.player.yaw+=dx*.0025;state.player.pitch=C.clamp(state.player.pitch-dy*.0025,-1.52,1.52);
  });
  document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement===canvas){lookPointer=null;}else if(playing&&!paused&&menu===null&&!isTouch)openMenu('pause');});
  document.addEventListener('keydown',event=>{
    if(!playing)return;
    const k=event.code;if(['KeyW','KeyA','KeyS','KeyD','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(k)&&!['INPUT','TEXTAREA'].includes(event.target.tagName))event.preventDefault();
    if(['INPUT','TEXTAREA'].includes(event.target.tagName))return;
    if(k==='Escape'){if(paused&&menu!=='death')resume();else if(!paused)openMenu('pause');return;}
    if(k==='KeyE'&&!event.repeat){if(menu==='inventory')resume();else if(!paused)openMenu('inventory');return;}
    if(k==='KeyH'&&!event.repeat){if(menu==='help')resume();else if(!paused)openMenu('help');return;}
    if(paused)return;keys[k]=true;
    if(/^Digit[1-9]$/.test(k)){state.selected=+k.slice(-1)-1;miningTime=0;refreshHotbar();}
    if(k==='KeyF'&&!event.repeat&&state.mode==='creative'){state.player.flight=!state.player.flight;state.player.vy=0;updateHud();toast(state.player.flight?'飞行开启：空格上升，C 下降':'飞行关闭');}
    if(k==='KeyR'&&!event.repeat){const id=C.selectedItem(state);if(C.ITEMS[id]?.food)secondary();else{const food=[26,25].find(id=>C.available(state,id));if(food&&C.eat(state,food)){refreshHotbar();updateHud();toast('恢复了饱食度');}else toast('没有食物，或已经吃饱');}}
  });
  document.addEventListener('keyup',event=>keys[event.code]=false);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&!paused)openMenu('pause');});
  window.addEventListener('blur',()=>{keys=Object.create(null);mining=false;if(playing&&!paused)openMenu('pause');});
  canvas.addEventListener('wheel',event=>{if(playing&&!paused){event.preventDefault();state.selected=(state.selected+(event.deltaY>0?1:8))%9;miningTime=0;refreshHotbar();}},{passive:false});
  canvas.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&playing&&!paused){touchLook=true;lookPointer={x:event.clientX,y:event.clientY,id:event.pointerId};canvas.setPointerCapture(event.pointerId);}});
  canvas.addEventListener('pointermove',event=>{if(event.pointerType==='touch'&&touchLook&&lookPointer&&event.pointerId===lookPointer.id&&!paused){const dx=event.clientX-lookPointer.x,dy=event.clientY-lookPointer.y;state.player.yaw+=dx*.006;state.player.pitch=C.clamp(state.player.pitch-dy*.006,-1.52,1.52);lookPointer={x:event.clientX,y:event.clientY,id:event.pointerId};}});
  canvas.addEventListener('pointerup',()=>{touchLook=false;lookPointer=null;});canvas.addEventListener('pointercancel',()=>{touchLook=false;lookPointer=null;});
  const touchKeys={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',down:'KeyC'};
  document.querySelectorAll('[data-touch]').forEach(button=>{const key=touchKeys[button.dataset.touch];button.addEventListener('pointerdown',event=>{event.preventDefault();keys[key]=true;button.setPointerCapture(event.pointerId);});const stop=()=>keys[key]=false;button.addEventListener('pointerup',stop);button.addEventListener('pointercancel',stop);});
  $('touch-mine').addEventListener('pointerdown',event=>{event.preventDefault();mining=true;miningTime=0;$('touch-mine').setPointerCapture(event.pointerId);});$('touch-mine').addEventListener('pointerup',()=>mining=false);$('touch-mine').addEventListener('pointercancel',()=>mining=false);
  $('touch-place').onclick=secondary;$('touch-fly').onclick=()=>{if(state.mode==='creative'){state.player.flight=!state.player.flight;state.player.vy=0;updateHud();}};
  window.addEventListener('pagehide',()=>{if(playing&&autoSaveAllowed)save(false);});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(playing)openMenu('pause');toast('图形环境已重置。请先导出或保存存档，再刷新页面。');});
  root.VoxelFrontier=Object.freeze({game:Object.freeze({get state(){return Object.freeze({mode:state.mode,seed:state.world.seed,player:Object.freeze({...state.player}),inventory:Object.freeze({...state.inventory}),hotbar:Object.freeze([...state.hotbar]),selected:state.selected,time:state.time,day:state.day,blocksMined:state.blocksMined,blocksPlaced:state.blocksPlaced,edits:state.world.edits.size});},get running(){return playing&&!paused;},get menu(){return menu;},get meshCount(){return renderer.meshes.size;},get mobCount(){return mobs.length;}})});
})(typeof globalThis==='object'?globalThis:this);
