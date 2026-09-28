'use strict';
const SAMPLE = '__SAMPLE_DATA__';
const $ = id => document.getElementById(id);
const sliders = ['spacing','radius','contrast','gamma','threshold'];
let currentImage = null, currentModel = null, destroyMotion = null, cloud = null;
let savedView = null;
let renderFrame = 0, loadTicket = 0, pngBusy = false;
let currentTheme = 'dark';
// 点阵以照片自身亮度成像，只在深色画布上还原人像；界面主题不改动画面配色。
const ART = {foreground:'#f4f3ef',background:'#100f0b'};
const DEFAULT_DEPTH = 0.1;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function recolor() {
  $('foreground').disabled = $('sourceColors').checked;
  if (!currentModel) return;
  currentModel = { ...currentModel, config:{ ...currentModel.config,
    foreground:$('foreground').value, background:$('background').value,
    sourceColors:$('sourceColors').checked } };
  showModel();
}
function defaultColors() {
  for (const key of ['foreground','background']) $(key).value = ART[key];
  recolor();
}
const setVar = (el, name, value) => { if (el.style.setProperty) el.style.setProperty(name, value); };
/** 画布上的 HUD 随背景明暗选择浅色或深色描边。 */
function stageInk(hex) {
  const n = parseInt(hex.slice(1), 16);
  const light = (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255;
  return light > 0.55 ? '21,21,19' : '243,241,236';
}
function updateView() {
  if (!$('threeD').checked || !cloud) { $('hudView').textContent = '平面点阵 · 1:1'; return; }
  const view = cloud.getView();
  const degrees = radians => { const d = Math.round(radians * 180 / Math.PI) % 360; return d > 180 ? d - 360 : d < -180 ? d + 360 : d; };
  const sign = n => n < 0 ? '−' + Math.abs(n) : String(n);
  $('hudView').textContent = `YAW ${sign(degrees(view.yaw))}° · PITCH ${sign(degrees(view.pitch))}° · ${Math.round(view.zoom * 100)}%`;
}
function setTheme(name, persist = true) {
  currentTheme = name === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = currentTheme;
  $('themeLight').setAttribute('aria-pressed', String(currentTheme === 'light'));
  $('themeDark').setAttribute('aria-pressed', String(currentTheme === 'dark'));
  if (persist) {
    try { window.localStorage.setItem('point-cloud-editor-theme', currentTheme); } catch (_) {}
  }
}
function status(message, error = false) {
  $('status').textContent = message; $('status').dataset.error = String(error);
}
function config() {
  const values = { width:800, autoLevels:$('autoLevels').checked, invert:$('invert').checked,
    foreground:$('foreground').value, background:$('background').value,
    sourceColors:$('sourceColors').checked };
  sliders.forEach(key => { values[key] = Number($(key).value); });
  return values;
}
function syncLabels() {
  sliders.forEach(key => { $(key + 'Value').value = Number($(key).value).toFixed(key === 'spacing' ? 1 : 2); });
  $('depthValue').value = Number($('depth').value).toFixed(2);
  $('depth').disabled = !$('threeD').checked;
  $('resetView').disabled = !$('threeD').checked;
  $('foreground').disabled = $('sourceColors').checked;
  $('mode2d').setAttribute('aria-pressed', String(!$('threeD').checked));
  $('mode3d').setAttribute('aria-pressed', String($('threeD').checked));
  for (const key of [...sliders, 'depth']) {
    const el = $(key), min = Number(el.min || 0), max = Number(el.max || 1);
    setVar(el, '--fill', `${((Number(el.value) - min) / (max - min || 1) * 100).toFixed(1)}%`);
  }
}
function setInteraction() {
  if ($('threeD').checked) { showModel(); return; }
  if (destroyMotion) { destroyMotion(); destroyMotion = null; }
  if ($('motion').checked && currentModel) {
    destroyMotion = Halftone.interact($('preview').querySelector('svg'), currentModel);
  }
}
function cloudOptions() {
  return { threeD:$('threeD').checked, depth:Number($('depth').value),
    view:$('threeD').checked ? (cloud ? cloud.getView() : savedView || undefined) : {yaw:0,pitch:0,zoom:1}, interactive:true };
}
function showModel() {
  if (!currentModel) return;
  if (cloud) { savedView = cloud.getView(); cloud.destroy(); cloud = null; }
  if (destroyMotion) { destroyMotion(); destroyMotion = null; }
  const stage = $('stage');
  stage.style.background = currentModel.config.background;
  setVar(stage, '--stage-ink', stageInk(currentModel.config.background));
  if ($('threeD').checked) {
    const canvas = document.createElement('canvas');
    canvas.width = currentModel.width; canvas.height = currentModel.height;
    canvas.style.aspectRatio = `${currentModel.width} / ${currentModel.height}`;
    canvas.tabIndex = 0; canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label','三维点云，拖拽旋转，滚轮缩放，双击复位');
    $('preview').replaceChildren(canvas);
    cloud = PointCloud.mount(canvas, PointCloud.prepare(currentModel, {
      ...cloudOptions(), interactive:$('motion').checked
    }));
  } else {
    $('preview').innerHTML = Halftone.toSVG(currentModel, { interactive:false });
    if ($('motion').checked) destroyMotion = Halftone.interact($('preview').querySelector('svg'), currentModel);
  }
  $('gestureHint').textContent = $('threeD').checked ? '拖拽旋转 · 滚轮缩放 · 双击复位' : '移动鼠标扰动 · 移开自动回位';
  stage.classList?.remove('loading');
  $('stats').textContent = `${currentModel.dots.length.toLocaleString('zh-CN')} 点 · ${$('threeD').checked ? '3D' : '2D'} · 纵深 ${Number($('depth').value).toFixed(2)}`;
  updateView();
}
function render() {
  renderFrame = 0;
  if (!currentImage) return;
  try {
    const model = Halftone.fromImage(currentImage, config());
    currentModel = model;
    showModel();
  } catch (error) { status('生成失败：' + error.message, true); }
}
function schedule() { syncLabels(); if (!renderFrame) renderFrame = requestAnimationFrame(render); }
function loadImage(src, label, ticket) {
  const img = new Image();
  img.onload = () => {
    if (ticket !== loadTicket) return;
    if (img.naturalWidth * img.naturalHeight > 50000000) {
      status('照片过大，请先缩小到 5000 万像素以内。', true); return;
    }
    currentImage = img; $('source').textContent = '当前：' + label; $('hudSource').textContent = label;
    status(''); render();
  };
  img.onerror = () => { if (ticket === loadTicket) status('无法读取照片，请使用 JPG、PNG 或 WebP。', true); };
  img.src = src;
}
function loadSample() { loadImage(SAMPLE, '彩色示例人像', ++loadTicket); }
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
// 导出从原始坐标开始；SVG 内嵌扰动脚本，PNG 保存静态图。
function flush() { if (renderFrame) { cancelAnimationFrame(renderFrame); render(); } return currentModel; }

function openFile(file) {
  const ticket = ++loadTicket;
  if (file.size > 20 * 1024 * 1024) { status('请选择小于 20 MB 的照片。', true); return; }
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) { status('请使用 JPG、PNG、WebP 或 AVIF 照片。', true); return; }
  status('正在读取照片…');
  const reader = new FileReader();
  reader.onload = () => { if (ticket === loadTicket) loadImage(reader.result, file.name, ticket); };
  reader.onerror = () => { if (ticket === loadTicket) status('读取失败，请重新选择照片。', true); };
  reader.readAsDataURL(file);
}
$('choose').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', event => {
  const file = event.target.files[0]; if (!file) return;
  openFile(file); event.target.value = '';
});
// 照片可以直接拖到画布上。
let dragDepth = 0;
const dragging = on => { $('stage').classList?.toggle('dragging', on); $('dropHint').hidden = !on; };
$('stage').addEventListener('dragenter', event => { event.preventDefault(); dragDepth += 1; dragging(true); });
$('stage').addEventListener('dragover', event => event.preventDefault());
$('stage').addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) dragging(false); });
$('stage').addEventListener('drop', event => {
  event.preventDefault(); dragDepth = 0; dragging(false);
  const file = event.dataTransfer && event.dataTransfer.files[0];
  if (file) openFile(file);
});
['pointermove','pointerup','wheel','dblclick','keydown'].forEach(type => $('preview').addEventListener(type, updateView, { passive:true }));
sliders.forEach(key => $(key).addEventListener('input', schedule));
['autoLevels','invert'].forEach(key => $(key).addEventListener('input', schedule));
['foreground','background'].forEach(key => $(key).addEventListener('input', recolor));
$('sourceColors').addEventListener('change', () => {
  syncLabels();
  if (currentImage) render(); else recolor();
});
$('themeLight').addEventListener('click', () => setTheme('light'));
$('themeDark').addEventListener('click', () => setTheme('dark'));
$('resetColors').addEventListener('click', defaultColors);
function setMode(threeD) {
  if ($('threeD').checked === threeD) return;
  $('threeD').checked = threeD; syncLabels(); showModel();
}
$('mode2d').addEventListener('click', () => setMode(false));
$('mode3d').addEventListener('click', () => setMode(true));
['threeD','depth'].forEach(key => $(key).addEventListener('input', () => { syncLabels(); showModel(); }));
$('motion').addEventListener('change', setInteraction);
reducedMotion.addEventListener('change', event => {
  if (event.matches) { $('motion').checked = false; setInteraction(); }
});
$('reset').addEventListener('click', () => {
  sliders.forEach(key => { $(key).value = Halftone.defaults[key]; });
  ['foreground','background'].forEach(key => { $(key).value = ART[key]; });
  $('autoLevels').checked = true; $('invert').checked = false; $('motion').checked = true;
  $('sourceColors').checked = true;
  $('threeD').checked = true; $('depth').value = DEFAULT_DEPTH;
  if (cloud) { cloud.destroy(); cloud = null; } savedView = null;
  status('参数已重置'); schedule();
});
$('resetView').addEventListener('click', () => {
  if (cloud) { cloud.destroy(); cloud = null; } savedView = null; showModel();
});
$('sample').addEventListener('click', loadSample);
$('exportHtml').addEventListener('click', () => {
  const model = flush(); if (!model) return;
  saveBlob(new Blob([PointCloud.toHTML(model, cloudOptions())], {type:'text/html;charset=utf-8'}), 'point-cloud.html');
  status('点云 HTML 已生成，仅含画面和交互');
});
$('exportSvg').addEventListener('click', () => {
  const model = flush(); if (!model) return;
  saveBlob(new Blob([Halftone.toSVG(model)], { type:'image/svg+xml;charset=utf-8' }), 'dot-portrait.svg');
  status('交互 SVG 已生成，请用浏览器打开');
});
$('exportPng').addEventListener('click', () => {
  const model = flush(); if (!model || pngBusy) return;
  pngBusy = true; $('exportPng').disabled = true; status('正在生成 PNG…');
  if (cloud && $('threeD').checked) {
    try {
      cloud.snapshot(2).toBlob(blob => {
        if (blob) { saveBlob(blob, 'point-cloud.png'); status('点云 PNG 已生成（2 倍尺寸）'); }
        else status('PNG 生成失败，请重试。', true);
        pngBusy = false; $('exportPng').disabled = false;
      }, 'image/png');
    } catch (error) { status('PNG 导出失败：' + error.message, true); pngBusy = false; $('exportPng').disabled = false; }
    return;
  }
  const url = URL.createObjectURL(new Blob([Halftone.toSVG(model, { interactive:false })], { type:'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  const finish = () => { URL.revokeObjectURL(url); pngBusy = false; $('exportPng').disabled = false; };
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = model.width * 2; canvas.height = model.height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('画布不可用');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) { saveBlob(blob, 'dot-portrait.png'); status('PNG 已生成（2 倍尺寸）'); }
        else status('PNG 生成失败，请先导出 SVG。', true);
        finish();
      }, 'image/png');
    } catch (error) { status('PNG 导出失败：' + error.message, true); finish(); }
  };
  img.onerror = () => { status('PNG 导出失败，请先导出 SVG。', true); finish(); };
  img.src = url;
});
window.addEventListener('pagehide', () => {
  if (destroyMotion) { destroyMotion(); destroyMotion = null; }
  if (cloud) { savedView = cloud.getView(); cloud.destroy(); cloud = null; }
  cancelAnimationFrame(renderFrame); renderFrame = 0;
});
window.addEventListener('pageshow', event => { if (event.persisted) showModel(); });
let savedTheme = 'dark';
try { savedTheme = window.localStorage.getItem('point-cloud-editor-theme') || 'dark'; } catch (_) {}
setTheme(savedTheme, false); syncLabels(); loadSample();
