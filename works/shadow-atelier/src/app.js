(function () {
  'use strict';
  const C=window.ShadowCore,R=window.ShadowRender,$=id=>document.getElementById(id);
  const canvas=$('scene'),renderer=new R.Renderer(canvas),ranges=Array.from(document.querySelectorAll('[data-axis]'));
  const axes=['俯仰','左右','侧倾'],numerals=['一','二','三','四','五','六'];
  const KEY='windplay-shadow-atelier-v1';
  let progress,storageAvailable=true;
  try{progress=C.parseProgress(localStorage.getItem(KEY));}catch{progress=C.parseProgress(null);storageAvailable=false;}
  let levelIndex=C.LEVELS.findIndex(level=>level.id===progress.lastLevel),level=C.LEVELS[levelIndex];
  let angles=[],projection,held=0,solved=false,moving=false,drag=null,dirty=true,raf=0,lastFrame=0,attempt=0,hints=0,lastBucket=-1;
  for(const item of C.LEVELS){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;$('level-select').append(option);}
  function announce(message){$('play-status').textContent=message;}
  function save() {
    progress.lastLevel=level.id;
    if(storageAvailable)try{localStorage.setItem(KEY,JSON.stringify(progress));}catch{storageAvailable=false;}
    $('storage-status').textContent=storageAvailable?'':'浏览器未开放存储，本次仍可完整游玩。';
  }
  function updateCollection() {
    $('collection-count').value=`${progress.completed.length} / ${C.LEVELS.length}`;
    for(const option of $('level-select').options){const item=C.LEVELS.find(v=>v.id===option.value);option.textContent=item.name+(progress.completed.includes(item.id)?' · 已收藏':'');}
  }
  function refreshControls() {
    for(let i=0;i<3;i++) {
      ranges[i].value=Math.round(angles[i]);ranges[i].disabled=solved||(i===2&&level.axes===2);
      $(`value-${['x','y','z'][i]}`).value=`${Math.round(angles[i])}°`;
      ranges[i].setAttribute('aria-valuetext',`${axes[i]} ${Math.round(angles[i])} 度`);
    }
    $('roll-label').classList.toggle('locked',level.axes===2);
    $('hint').disabled=solved;$('shuffle').textContent=solved?'再拼一次':'重新摆放';
    $('score').value=`${Math.round(projection.score*100)}%`;
    $('match-fill').style.width=`${projection.score*100}%`;
    $('scene-instruction').textContent=solved?'这一束光，已定格。':level.axes===2?'拖动：左右 / 俯仰。侧倾本关已固定。':'拖动：左右 / 俯仰。侧倾可用下方滑杆。';
  }
  function requestDraw() {
    dirty=true;if(!raf&&!document.hidden)raf=requestAnimationFrame(frame);
  }
  function frame(time) {
    raf=0;
    if(document.hidden){lastFrame=0;return;}
    const delta=lastFrame?time-lastFrame:0;lastFrame=time;
    if(!solved) {
      const result=C.advanceStability(held,projection.score,delta,moving);held=result.held;
      if(result.complete)finish();
      else if(held>0&&$('play-status').textContent!=='保持片刻，正在定格。')announce('保持片刻，正在定格。');
    }
    if(dirty){renderer.draw(level,angles,projection,solved);dirty=false;}
    if(!solved&&projection.score>=C.PASS_SCORE)raf=requestAnimationFrame(frame);
    else lastFrame=0;
  }
  function recompute() {
    projection=C.evaluate(level,angles);held=0;refreshControls();
    const bucket=Math.floor(projection.score*10);
    if(projection.score>=C.PASS_SCORE)announce(moving?'已经很接近了，松开后稍作停留。':'已经吻合，保持片刻便能定格。');
    else if(bucket!==lastBucket||$('play-status').textContent.includes('吻合'))announce(bucket>=7?'轮廓快出来了，轻轻微调试试看。':'达到 90%，停留片刻便能定格。');
    lastBucket=bucket;requestDraw();
  }
  function finish() {
    solved=true;moving=false;drag=null;canvas.classList.remove('dragging');canvas.classList.add('solved');
    if(!progress.completed.includes(level.id))progress.completed.push(level.id);
    save();updateCollection();refreshControls();$('freeze-stamp').hidden=false;$('freeze-name').textContent=level.name;
    announce(progress.completed.length===C.LEVELS.length?'六束光都找到了。你可以选一件作品，再拼一次。':`${level.name}已定格并收藏。可以前往下一束光。`);dirty=true;
  }
  function choose(index) {
    levelIndex=(index+C.LEVELS.length)%C.LEVELS.length;level=C.LEVELS[levelIndex];attempt=0;resetPuzzle();
    $('level-select').value=level.id;$('level-number').textContent=`第${numerals[levelIndex]}束光`;$('level-name').textContent=level.name;
    $('level-description').textContent=level.description;$('level-position').textContent=`${levelIndex+1} / ${C.LEVELS.length}`;
    $('reference').setAttribute('aria-label',`${level.name}的目标剪影。${level.description}`);R.drawReference($('reference'),level);save();
  }
  function resetPuzzle() {
    solved=false;moving=false;drag=null;held=0;hints=0;lastBucket=-1;lastFrame=0;
    angles=C.initialAngles(level,attempt);canvas.classList.remove('solved','dragging');$('freeze-stamp').hidden=true;
    $('hint').textContent='给我一点提示';$('hint-copy').textContent=level.axes===2?'这一关只需俯仰和左右。先大幅转动，再微调。':'先大幅转动，再轻轻微调。';recompute();
  }
  for(const input of ranges) {
    input.addEventListener('input',()=>{if(solved)return;angles[Number(input.dataset.axis)]=Number(input.value);recompute();});
    input.addEventListener('pointerdown',()=>{moving=true;held=0;});
    input.addEventListener('pointerup',()=>{moving=false;requestDraw();});
    input.addEventListener('pointercancel',()=>{moving=false;held=0;requestDraw();});
    input.addEventListener('change',()=>{moving=false;requestDraw();});
  }
  canvas.addEventListener('pointerdown',event=> {
    if(solved||drag||(event.pointerType==='mouse'&&event.button!==0))return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,angles:angles.slice(),roll:event.shiftKey&&level.axes===3};
    moving=true;held=0;canvas.setPointerCapture(event.pointerId);canvas.classList.add('dragging');canvas.focus({preventScroll:true});
  });
  canvas.addEventListener('pointermove',event=> {
    if(!drag||event.pointerId!==drag.id)return;
    const factor=event.shiftKey && !drag.roll ? .14 : .48,dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(drag.roll)angles[2]=C.wrapAngle(drag.angles[2]+dx*.35);
    else{angles[1]=C.wrapAngle(drag.angles[1]+dx*factor);angles[0]=C.wrapAngle(drag.angles[0]+dy*factor);}
    recompute();
  });
  function endDrag(event) {
    if(!drag||event.pointerId!==drag.id)return;
    drag=null;moving=false;canvas.classList.remove('dragging');held=0;requestDraw();
  }
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag);
  canvas.addEventListener('keydown',event=> {
    if(solved)return;
    const bindings={ArrowLeft:[1,-1],ArrowRight:[1,1],ArrowUp:[0,-1],ArrowDown:[0,1],q:[2,-1],Q:[2,-1],e:[2,1],E:[2,1]};
    const binding=bindings[event.key];if(!binding||(binding[0]===2&&level.axes===2))return;
    event.preventDefault();angles[binding[0]]=C.wrapAngle(angles[binding[0]]+binding[1]*(event.shiftKey?1:3));recompute();
  });
  $('hint').addEventListener('click',()=> {
    hints=Math.min(hints+1,level.axes+1);
    if(hints===1)$('hint-copy').textContent=level.clue;
    else{const values=level.solution.slice(0,hints-1).map((value,i)=>`${axes[i]} ${value}°`).join('，');$('hint-copy').textContent=`试着调整到：${values}。${hints<=level.axes?'再点一次，可看下一方向。':'微调后松开，等待影子定格。'}`;}
    $('hint').textContent=hints===level.axes+1?'提示已展开':'再给一点提示';
  });
  $('shuffle').addEventListener('click',()=>{attempt++;resetPuzzle();});
  $('level-select').addEventListener('change',event=>choose(C.LEVELS.findIndex(item=>item.id===event.target.value)));
  $('previous').addEventListener('click',()=>choose(levelIndex-1));$('next').addEventListener('click',()=>choose(levelIndex+1));
  window.addEventListener('resize',requestDraw);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(requestDraw).observe(canvas);
  document.addEventListener('visibilitychange',()=> {
    lastFrame=0;held=0;moving=false;drag=null;canvas.classList.remove('dragging');
    if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else requestDraw();
  });
  // Read-only diagnostic snapshot used by the repository's browser checks.
  Object.defineProperty(window,'ShadowAtelier',{value:Object.freeze({inspect:()=>Object.freeze({level:level.id,levelIndex,angles:Object.freeze(angles.slice()),score:projection.score,held,solved,completed:Object.freeze(progress.completed.slice()),storageAvailable,visible:!document.hidden})}),writable:false,configurable:false});
  updateCollection();choose(levelIndex);
})();
