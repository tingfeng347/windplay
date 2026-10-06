(function (global) {
  'use strict';
  const Core = global.WindGardenCore, $ = id => document.getElementById(id);
  const NAMES = { bell: '风铃', reed: '芦笛', pluck: '拨弦' }, STORAGE_KEY = 'windplay.wind-garden.v1';
  const canvas = $('garden-canvas'), media = global.matchMedia('(prefers-reduced-motion: reduce)');
  let garden = Core.createGarden(), selectedId = null, timbre = 'bell', cursor = null, playing = false;
  let playhead = null, reducedMotion = media.matches, drag = null, pendingPlay = false;
  let storageAvailable = true, savedJSON = '', rangeStart = null, startupMessage = '';
  const history = [];
  function announce(message, error = false) { $('message').textContent = message; $('message').classList.toggle('error', error); }
  try {
    const stored = global.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { garden = Core.parseGarden(stored); savedJSON = Core.serializeGarden(garden); startupMessage = '已打开上次保存的花园。让风吹起来，继续这段旋律。'; }
      catch (error) { startupMessage = `上次的存档无法读取：${error.message} 已打开示例旋律，可重新保存或导入 JSON。`; }
    }
    const probe = `${STORAGE_KEY}.probe`; global.localStorage.setItem(probe, '1'); global.localStorage.removeItem(probe);
  } catch (error) {
    storageAvailable = false; startupMessage = `本地保存暂不可用（${error.message}）。编辑仍可继续，请用“导出 JSON”保留花园。`;
  }
  const renderer = new global.WindGardenRenderer(canvas, () => ({ garden, selectedId, timbre, cursor, playing, playhead, reducedMotion }));
  const audio = new global.WindGardenAudio({ getGarden: () => garden,
    onStep(event) {
      playhead = { step: event.step, duration: event.duration, startedAt: performance.now() / 1000 - Math.max(0, audio.now() - event.time) };
      renderer.trigger(event.ids); $('beat-label').textContent = `第 ${event.step + 1} / 16 个半拍`;
    },
    onError(error) { announce(`声音暂不可用：${error.message} 你仍可种植，并让风在画面中经过。`, true); updatePlayback(); },
    onInterrupted() { pause('声音被浏览器中断。点“让风吹起来”可重新开启。'); }
  });
  function selectedPlant() { return garden.plants.find(p => p.id === selectedId) || null; }
  function describe(plant) { return plant ? `${NAMES[plant.timbre]} · ${Core.PITCHES[plant.row].name} · 第 ${plant.step + 1} 个半拍` : '未选择植物'; }
  function updatePlayback() {
    $('play').setAttribute('aria-pressed', String(playing)); $('play').disabled = pendingPlay;
    $('play-label').textContent = playing ? '让风歇一会' : '让风吹起来';
    $('play-icon').innerHTML = playing ? '<path d="M4 3h3v10H4zm5 0h3v10H9z" fill="currentColor"/>' : '<path d="M4 2.5v11L13 8Z" fill="currentColor"/>';
    $('audio-state').classList.toggle('playing', playing); $('audio-state').classList.toggle('visual', audio.unavailable);
    $('audio-label').textContent = audio.unavailable ? '声音不可用，画面可玩' : playing ? '风在唱歌' : audio.context ? '风已暂停' : '点击播放，开启声音';
  }
  function refresh() {
    const selected = selectedPlant();
    if (!selected) selectedId = null;
    $('tempo').value = garden.tempo; $('tempo-value').value = garden.tempo;
    $('volume').value = Math.round(garden.volume * 100); $('volume-value').value = `${Math.round(garden.volume * 100)}%`;
    $('garden-description').textContent = `${garden.plants.length} 株植物${playing ? '，正在随风唱歌' : '，等待一阵风'}`;
    const picker = $('selected-plant'), oldValue = String(selectedId || '');
    picker.replaceChildren(new Option('选择一株植物', ''));
    [...garden.plants].sort((a, b) => a.step - b.step || a.row - b.row || a.id - b.id).forEach(p => picker.add(new Option(describe(p), String(p.id))));
    picker.value = oldValue;
    $('delete-plant').disabled = !selected; $('plant-step').disabled = !selected; $('plant-row').disabled = !selected;
    $('plant-step').value = selected ? selected.step : 0; $('plant-row').value = selected ? selected.row : 5;
    $('undo').disabled = history.length === 0; $('clear').disabled = garden.plants.length === 0;
    $('selection-info').textContent = selected ? describe(selected) : '花朵越高，音越高；越靠右，越晚响。';
    const dirty = savedJSON !== Core.serializeGarden(garden);
    $('save').textContent = dirty ? '保存花园' : '已保存';
    updatePlayback();
  }
  for (let step = 0; step < Core.STEPS; step++) $('plant-step').add(new Option(String(step + 1), String(step)));
  Core.PITCHES.forEach((pitch, row) => $('plant-row').add(new Option(pitch.name, String(row))));
  function remember(previous) { history.push(previous); if (history.length > 30) history.shift(); }
  function commit(next, message, options = {}) {
    if (next === garden) return false;
    if (options.history !== false) remember(garden);
    garden = next; audio.setVolume(garden.volume); refresh(); if (message) announce(message);
    return true;
  }
  function pause(message) {
    audio.stop(); playing = false; pendingPlay = false; playhead = null;
    $('beat-label').textContent = '16 个半拍，一圈旋律'; refresh();
    if (message) announce(message);
  }
  async function togglePlay() {
    if (pendingPlay) return;
    if (playing) { pause('风歇下来了。可以继续种植、移动植物。'); return; }
    pendingPlay = true; updatePlayback();
    const audible = await audio.start();
    pendingPlay = false; playing = audio.running;
    if (document.hidden) { pause(); return; }
    refresh();
    if (playing && audible) announce(garden.plants.length ? '风吹起来了。拖动花朵，下一圈就能听到新的旋律。' : '风吹起来了。点一下空地，种下第一个音。');
  }
  async function audition(plant) {
    if (!plant) return;
    renderer.trigger([plant.id]);
    if (!playing) { await audio.preview(plant); updatePlayback(); }
  }
  function plantAt(cell) {
    cancelDrag();
    try {
      const next = Core.addPlant(garden, { ...cell, timbre });
      if (next === garden) {
        selectedId = garden.plants.find(p => p.step === cell.step && p.row === cell.row && p.timbre === timbre).id;
        refresh(); announce('这里已有一株同样的植物，已选中它。'); return;
      }
      selectedId = next.nextId - 1; commit(next, `种下了${describe(next.plants.find(p => p.id === selectedId))}。`);
      audition(selectedPlant());
    } catch (error) { announce(error.message, true); }
  }
  function moveSelected(cell) {
    cancelDrag();
    const selected = selectedPlant(); if (!selected) return;
    const next = Core.movePlant(garden, selected.id, cell);
    if (next === garden) { announce('这里已经有同样的植物，请换一个位置。'); return; }
    commit(next, `已移动：${describe(next.plants.find(p => p.id === selectedId))}。`); audition(selectedPlant());
  }
  function deleteSelected() {
    cancelDrag();
    const plant = selectedPlant(); if (!plant) return;
    selectedId = null; commit(Core.removePlant(garden, plant.id), `已移除${NAMES[plant.timbre]}。可以撤销。`);
  }
  function undo() {
    cancelDrag();
    if (!history.length) return;
    garden = history.pop(); selectedId = null; cursor = null; audio.setVolume(garden.volume); refresh(); announce('已撤销上一步。');
  }
  function position(event) { const bounds = canvas.getBoundingClientRect(); return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }; }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag) return;
    const point = position(event), plant = renderer.hitAt(point.x, point.y), cell = renderer.cellAt(point.x, point.y);
    if (!plant && !cell) return;
    event.preventDefault(); canvas.focus({ preventScroll: true });
    selectedId = plant ? plant.id : null; cursor = cell;
    drag = { pointerId: event.pointerId, plantId: plant ? plant.id : null, origin: garden, start: point, moved: false, cell };
    canvas.setPointerCapture(event.pointerId); refresh();
  });
  canvas.addEventListener('pointermove', event => {
    const point = position(event), cell = renderer.cellAt(point.x, point.y);
    if (!drag) { if (event.pointerType === 'mouse') cursor = cell; return; }
    if (event.pointerId !== drag.pointerId) return;
    if (Math.hypot(point.x - drag.start.x, point.y - drag.start.y) > 5) drag.moved = true;
    if (drag.plantId && drag.moved && cell) {
      garden = Core.movePlant(garden, drag.plantId, cell); cursor = cell;
      $('selection-info').textContent = describe(garden.plants.find(plant => plant.id === drag.plantId));
    }
  });
  function finishPointer(event, canceled) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const current = drag; drag = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (canceled) { garden = current.origin; refresh(); return; }
    if (current.plantId) {
      if (garden !== current.origin) { remember(current.origin); refresh(); announce(`已移动：${describe(selectedPlant())}。`); audition(selectedPlant()); }
      else { refresh(); announce(`已选中：${describe(selectedPlant())}。`); audition(selectedPlant()); }
    } else if (!current.moved && current.cell) plantAt(current.cell);
    else refresh();
  }
  function cancelDrag() {
    if (!drag) return;
    const current = drag; drag = null; garden = current.origin;
    if (canvas.hasPointerCapture(current.pointerId)) canvas.releasePointerCapture(current.pointerId);
    refresh();
  }
  canvas.addEventListener('pointerup', event => finishPointer(event, false));
  canvas.addEventListener('pointercancel', event => finishPointer(event, true));
  canvas.addEventListener('lostpointercapture', event => { if (drag) finishPointer(event, true); });
  canvas.addEventListener('pointerleave', () => { if (!drag) cursor = null; });
  canvas.addEventListener('blur', cancelDrag);
  canvas.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (['Escape', 'Delete', 'Backspace', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) cancelDrag();
    if (event.key === ' ') { event.preventDefault(); togglePlay(); return; }
    if (event.key === 'Escape') { selectedId = null; cursor = null; refresh(); announce('已取消选择。'); return; }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelected(); return; }
    if (event.key === 'Enter') { event.preventDefault(); const selected = selectedPlant(); if (selected) audition(selected); else plantAt(cursor || { step: 0, row: 5 }); return; }
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!directions[event.key]) return;
    event.preventDefault(); const selected = selectedPlant(), cell = selected || cursor || { step: 0, row: 5 }, delta = directions[event.key];
    const next = { step: Core.clamp(cell.step + delta[0], 0, Core.STEPS - 1), row: Core.clamp(cell.row + delta[1], 0, Core.ROWS - 1) };
    if (selected) {
      if (next.step !== selected.step || next.row !== selected.row) moveSelected(next);
    } else { cursor = next; announce(`种植位置：${Core.PITCHES[next.row].name}，第 ${next.step + 1} 个半拍。按 Enter 种植。`); }
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey && !event.target.matches('input,select,textarea')) { event.preventDefault(); undo(); }
  });
  $('play').addEventListener('click', togglePlay);
  document.querySelectorAll('[data-timbre]').forEach(button => button.addEventListener('click', () => {
    timbre = button.dataset.timbre;
    document.querySelectorAll('[data-timbre]').forEach(other => { const active = other === button; other.classList.toggle('active', active); other.setAttribute('aria-pressed', String(active)); });
    announce(`已选择${NAMES[timbre]}种子。点击花园空地种植。`);
  }));
  $('selected-plant').addEventListener('change', event => {
    const nextId = event.target.value ? Number(event.target.value) : null;
    cancelDrag(); selectedId = nextId; cursor = null; refresh();
    if (selectedPlant()) { announce(`已选中：${describe(selectedPlant())}。可以调整拍点与音高，或用方向键移动。`); audition(selectedPlant()); }
  });
  $('plant-step').addEventListener('change', event => { const plant = selectedPlant(); if (plant) moveSelected({ step: Number(event.target.value), row: plant.row }); refresh(); });
  $('plant-row').addEventListener('change', event => { const plant = selectedPlant(); if (plant) moveSelected({ step: plant.step, row: Number(event.target.value) }); refresh(); });
  $('delete-plant').addEventListener('click', deleteSelected); $('undo').addEventListener('click', undo);
  ['tempo', 'volume'].forEach(id => {
    const input = $(id);
    input.addEventListener('input', () => {
      const value = Number(input.value);
      cancelDrag();
      if (!rangeStart) rangeStart = garden;
      garden = { ...garden, [id]: value / (id === 'volume' ? 100 : 1) };
      audio.setVolume(garden.volume); refresh();
    });
    input.addEventListener('change', () => {
      if (rangeStart) { if (Core.serializeGarden(rangeStart) !== Core.serializeGarden(garden)) remember(rangeStart); rangeStart = null; refresh(); }
    });
  });
  $('save').addEventListener('click', () => {
    cancelDrag();
    if (!storageAvailable) { announce('本地保存暂不可用。请点击“导出 JSON”，把花园保存在文件中。', true); return; }
    try {
      const text = Core.serializeGarden(garden); global.localStorage.setItem(STORAGE_KEY, text); savedJSON = text; refresh(); announce('花园已保存在当前浏览器，下次打开会恢复。');
    } catch (error) { storageAvailable = false; announce(`保存失败：${error.message} 请导出 JSON 保留花园。`, true); }
  });
  $('export').addEventListener('click', () => {
    cancelDrag();
    try {
      const blob = new Blob([Core.serializeGarden(garden)], { type: 'application/json' }), url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = '听风花园.json'; document.body.appendChild(link); link.click(); link.remove();
      global.setTimeout(() => URL.revokeObjectURL(url), 10000); announce('已导出“听风花园.json”。可以在其他设备导入它。');
    } catch (error) { announce(`导出失败：${error.message}`, true); }
  });
  $('import').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 50000) throw new Error('存档文件超过 50 KB，请选择听风花园导出的 JSON。');
      const next = Core.parseGarden(await file.text());
      cancelDrag(); pause(); selectedId = null; cursor = null; commit(next, `已导入 ${next.plants.length} 株植物。可以撤销恢复之前的花园。`);
    } catch (error) { announce(`导入失败：${error.message} 当前花园已保留。`, true); }
    finally { event.target.value = ''; }
  });
  $('example').addEventListener('click', () => { cancelDrag(); selectedId = null; cursor = null; commit(Core.createGarden(), '已种下示例旋律。可以撤销恢复之前的花园。'); });
  $('clear').addEventListener('click', () => {
    cancelDrag();
    if (!garden.plants.length || !global.confirm('清空所有植物？这一步可以撤销。')) return;
    selectedId = null; cursor = null; commit({ ...garden, plants: [] }, '花园已清空。点击空地种植，或撤销恢复。');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelDrag();
      if (playing || pendingPlay) pause('页面进入后台，风已暂停。回来后点“让风吹起来”继续。');
      else audio.stop();
    }
  });
  global.addEventListener('pagehide', () => audio.stop());
  media.addEventListener('change', event => { reducedMotion = event.matches; });
  Object.defineProperty(global, 'WindGarden', { value: Object.freeze({
    inspect: () => Object.freeze({ playing, audioState: audio.unavailable ? 'unavailable' : audio.context ? audio.context.state : 'idle',
      plants: garden.plants.length, selected: selectedId, tempo: garden.tempo, volume: garden.volume,
      currentStep: playhead ? playhead.step : null, storageAvailable, undoCount: history.length })
  }), writable: false, configurable: false });
  refresh(); if (startupMessage) announce(startupMessage, !storageAvailable);
})(globalThis);
