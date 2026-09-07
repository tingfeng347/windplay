'use strict';
const SAMPLE = '__SAMPLE_DATA__';
const $ = id => document.getElementById(id);
const sliders = ['spacing','radius','contrast','gamma','threshold'];
let currentImage = null, currentModel = null, destroyMotion = null, cloud = null;
let savedView = null;
let renderFrame = 0, loadTicket = 0, pngBusy = false;
let currentTheme = 'dark', followsTheme = true;
const palettes = {
  dark:{foreground:'#f4f3ef',background:'#100f0b'},
  light:{foreground:'#252a33',background:'#ffffff'}
};
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function recolor() {
  $('foreground').disabled = $('sourceColors').checked;
  if (!currentModel) return;
  currentModel = { ...currentModel, config:{ ...currentModel.config,
    foreground:$('foreground').value, background:$('background').value,
    sourceColors:$('sourceColors').checked } };
  showModel();
}
function themeColors() {
  for (const key of ['foreground','background']) $(key).value = palettes[currentTheme][key];
  recolor();
}
function setTheme(name, persist = true) {
  currentTheme = name === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = currentTheme;
  $('themeLight').setAttribute('aria-pressed', String(currentTheme === 'light'));
  $('themeDark').setAttribute('aria-pressed', String(currentTheme === 'dark'));
  if (followsTheme) themeColors();
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
  $('preview').parentElement.style.background = currentModel.config.background;
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
  $('stats').textContent = `${currentModel.dots.length.toLocaleString('zh-CN')} 点 · ${$('threeD').checked ? '3D' : '2D'}`;
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
    currentImage = img; $('source').textContent = '当前：' + label;
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

$('choose').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', event => {
  const file = event.target.files[0]; if (!file) return;
  const ticket = ++loadTicket;
  if (file.size > 20 * 1024 * 1024) { status('请选择小于 20 MB 的照片。', true); return; }
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) { status('请使用 JPG、PNG、WebP 或 AVIF 照片。', true); return; }
  status('正在读取照片…');
  const reader = new FileReader();
  reader.onload = () => { if (ticket === loadTicket) loadImage(reader.result, file.name, ticket); };
  reader.onerror = () => { if (ticket === loadTicket) status('读取失败，请重新选择照片。', true); };
  reader.readAsDataURL(file); event.target.value = '';
});
sliders.forEach(key => $(key).addEventListener('input', schedule));
['autoLevels','invert'].forEach(key => $(key).addEventListener('input', schedule));
['foreground','background'].forEach(key => $(key).addEventListener('input', () => { followsTheme = false; recolor(); }));
$('sourceColors').addEventListener('change', () => {
  syncLabels();
  if (currentImage) render(); else recolor();
});
$('themeLight').addEventListener('click', () => setTheme('light'));
$('themeDark').addEventListener('click', () => setTheme('dark'));
$('resetColors').addEventListener('click', () => { followsTheme = true; themeColors(); });
['threeD','depth'].forEach(key => $(key).addEventListener('input', () => { syncLabels(); showModel(); }));
$('motion').addEventListener('change', setInteraction);
reducedMotion.addEventListener('change', event => {
  if (event.matches) { $('motion').checked = false; setInteraction(); }
});
$('reset').addEventListener('click', () => {
  sliders.forEach(key => { $(key).value = Halftone.defaults[key]; });
  followsTheme = true;
  ['foreground','background'].forEach(key => { $(key).value = palettes[currentTheme][key]; });
  $('autoLevels').checked = true; $('invert').checked = false; $('motion').checked = true;
  $('sourceColors').checked = true;
  $('threeD').checked = true; $('depth').value = 0.38;
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
