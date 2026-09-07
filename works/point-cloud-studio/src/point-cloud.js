/**
 * PointCloud · 照片点阵的三维展示与纯画面 HTML 导出 · 零依赖
 * 亮度生成艺术化 Z 纵深；三维旋转、透视与深度排序由数值计算完成。
 * Canvas 负责绘制投影结果，不需要 Three.js、CDN 或 GPU 模型。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PointCloud = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const finite = (x, fallback, min, max) => Number.isFinite(Number(x)) ?
    Math.max(min, Math.min(max, Number(x))) : fallback;
  const validColor = (x, fallback) => /^#[0-9a-f]{6}$/i.test(x) ? x : fallback;

  function prepare(model, input = {}) {
    const threeD = input.threeD !== false;
    const depth = finite(input.depth, 0.38, 0, 1);
    const width = model.width, height = model.height;
    const longSide = Math.max(width, height);
    const view = input.view || {};
    const points = model.dots.map((dot, i) => {
      const x = dot.x - width / 2, y = dot.y - height / 2;
      // 旧版点阵也可输入：缺少原始亮度时从圆点半径近似恢复。
      const light = finite(dot.luminance,
        dot.r / (model.config.spacing * model.config.radius), 0, 1);
      const dome = Math.max(0, 1 - (x / (width * 0.55)) ** 2 - (y / (height * 0.60)) ** 2);
      const grain = Math.sin(i * 127.1 + 17.7) * Math.cos(i * 31.7 + 9.2);
      const z = threeD ? ((light - 0.30) * 0.75 + dome * 0.22 + grain * 0.024) * depth * longSide : 0;
      const pointColor = model.config.sourceColors !== false ?
        validColor(dot.color, validColor(model.config.foreground, '#f4f3ef')) :
        validColor(model.config.foreground, '#f4f3ef');
      return [...[x, y, z, dot.r].map(v => Number(v.toFixed(4))), pointColor];
    });
    return {
      width, height, points, threeD, depth, interactive: input.interactive !== false,
      foreground: validColor(model.config.foreground, '#f4f3ef'),
      background: validColor(model.config.background, '#100f0b'),
      view: {
        yaw: finite(view.yaw, threeD ? 0.12 : 0, -100000, 100000),
        pitch: finite(view.pitch, threeD ? -0.04 : 0, -1.15, 1.15),
        zoom: finite(view.zoom, 1, 0.55, 2.5)
      }
    };
  }

  /** 纯三维投影函数，独立于 DOM，可在 Node.js 中检查数值或生成静态视图。 */
  function project(scene, view, size) {
    const yaw = scene.threeD ? view.yaw : 0;
    const pitch = scene.threeD ? view.pitch : 0;
    const cY = Math.cos(yaw), sY = Math.sin(yaw);
    const cX = Math.cos(pitch), sX = Math.sin(pitch);
    const focal = Math.max(scene.width, scene.height) * 2.4;
    const fit = Math.min(size.width / scene.width, size.height / scene.height) * (scene.threeD ? 0.9 : 1) * view.zoom;
    const result = scene.points.map((p, index) => {
      const rotatedX = p[0] * cY + p[2] * sY;
      const z = p[2] * cY - p[0] * sY;
      const rotatedY = p[1] * cX - z * sX;
      const rotatedZ = p[1] * sX + z * cX;
      const perspective = scene.threeD ? focal / Math.max(focal * 0.1, focal - rotatedZ) : 1;
      return {
        index, x: size.width / 2 + rotatedX * fit * perspective,
        y: size.height / 2 + rotatedY * fit * perspective,
        r: p[3] * fit * perspective, z: rotatedZ, color: p[4] || scene.foreground
      };
    });
    // 由远到近绘制；同一深度时保留稳定顺序。
    if (scene.threeD) result.sort((a, b) => a.z - b.z || a.index - b.index);
    return result;
  }

  /** 独立 Canvas 控制器；导出时连同 project 封装，所有状态属于当前画布。 */
  function mount(canvas, scene, projector = project) {
    const doc = canvas.ownerDocument, win = doc.defaultView;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('浏览器无法创建点云画布。');
    const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
    const initial = { ...scene.view };
    const target = { ...initial }, camera = { ...initial };
    const pointer = { x: 0, y: 0, active: false, nx: 0, ny: 0 };
    const offsets = scene.points.map(() => ({ x: 0, y: 0 }));
    const size = { width: 1, height: 1 };
    let drag = null, frame = 0, lastTime = 0, disposed = false, dpr = 1;

    function paint(context, box, view, usePointer, factor = 1) {
      context.globalAlpha = 1;
      context.fillStyle = scene.background;
      context.fillRect(0, 0, box.width, box.height);
      context.fillStyle = scene.foreground;
      const points = projector(scene, view, box);
      const reach = Math.min(box.width, box.height) * 0.14;
      let moving = false;
      for (const p of points) {
        let dx = 0, dy = 0;
        if (usePointer) {
          const off = offsets[p.index];
          let tx = 0, ty = 0;
          if (scene.interactive && pointer.active) {
            const vx = p.x - pointer.x, vy = p.y - pointer.y;
            const distance = Math.hypot(vx, vy);
            if (distance > 0 && distance < reach) {
              const push = (1 - distance / reach) ** 2 * reach * 0.30;
              tx = vx / distance * push; ty = vy / distance * push;
            }
          }
          off.x += (tx - off.x) * factor; off.y += (ty - off.y) * factor;
          if (Math.abs(tx - off.x) + Math.abs(ty - off.y) < 0.02) {
            off.x = tx; off.y = ty;
          } else moving = true;
          dx = off.x; dy = off.y;
        }
        const x = p.x + dx, y = p.y + dy;
        if (p.r < 0.12 || x + p.r < 0 || y + p.r < 0 || x - p.r > box.width || y - p.r > box.height) continue;
        context.fillStyle = p.color || scene.foreground;
        context.beginPath(); context.arc(x, y, p.r, 0, Math.PI * 2); context.fill();
      }
      return moving;
    }

    function render(time) {
      frame = 0;
      if (disposed || doc.hidden) { lastTime = 0; return; }
      const factor = reduced.matches ? 1 : 1 - Math.exp(-Math.min(40, time - (lastTime || time - 16)) / 70);
      lastTime = time;
      const parallax = scene.threeD && scene.interactive && pointer.active && !drag;
      const desired = {
        yaw: target.yaw + (parallax ? pointer.nx * 0.16 : 0),
        pitch: target.pitch - (parallax ? pointer.ny * 0.12 : 0), zoom: target.zoom
      };
      let moving = false;
      for (const key of ['yaw', 'pitch', 'zoom']) {
        camera[key] += (desired[key] - camera[key]) * factor;
        if (Math.abs(desired[key] - camera[key]) < 0.0001) camera[key] = desired[key];
        else moving = true;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      moving = paint(ctx, size, camera, true, factor) || moving;
      if (moving) frame = win.requestAnimationFrame(render);
      else lastTime = 0;
    }
    function wake() { if (!disposed && !frame && !doc.hidden) frame = win.requestAnimationFrame(render); }
    function release() {
      if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
      drag = null; canvas.style.cursor = scene.threeD ? 'grab' : 'default';
    }
    function leave() { pointer.active = false; pointer.nx = 0; pointer.ny = 0; wake(); }
    function resize() {
      const bounds = canvas.getBoundingClientRect();
      size.width = Math.max(1, bounds.width); size.height = Math.max(1, bounds.height);
      dpr = Math.min(2, win.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(size.width * dpr));
      canvas.height = Math.max(1, Math.round(size.height * dpr));
      offsets.forEach(off => { off.x = 0; off.y = 0; });
      leave();
    }
    function locate(event) {
      const box = canvas.getBoundingClientRect();
      pointer.x = event.clientX - box.left; pointer.y = event.clientY - box.top;
      pointer.nx = Math.max(-1, Math.min(1, pointer.x / size.width * 2 - 1));
      pointer.ny = Math.max(-1, Math.min(1, pointer.y / size.height * 2 - 1));
      pointer.active = true;
    }
    function move(event) {
      if (drag && event.pointerId !== drag.id) return;
      locate(event);
      if (drag && scene.threeD) {
        target.yaw += (event.clientX - drag.x) * 0.006;
        // 屏幕 Y 向下：下拖减小俯仰角，让近处的点跟随鼠标向下。
        target.pitch = Math.max(-1.15, Math.min(1.15, target.pitch - (event.clientY - drag.y) * 0.006));
        drag.x = event.clientX; drag.y = event.clientY;
      }
      wake();
    }
    function down(event) {
      if (!scene.threeD || drag || event.button !== 0) return;
      canvas.focus({ preventScroll: true }); locate(event);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing'; wake();
    }
    function up(event) {
      if (!drag || event.pointerId !== drag.id) return;
      release(); leave();
    }
    function cancel() { release(); leave(); }
    function wheel(event) {
      if (!scene.threeD) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.height : 1);
      target.zoom = Math.max(0.55, Math.min(2.5, target.zoom * Math.exp(-delta * 0.001)));
      wake();
    }
    function resetView() { Object.assign(target, initial); release(); leave(); }
    function key(event) {
      if (!scene.threeD) return;
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home','r','R'].includes(event.key)) event.preventDefault();
      else return;
      if (event.key === 'ArrowLeft') target.yaw -= 0.1;
      if (event.key === 'ArrowRight') target.yaw += 0.1;
      if (event.key === 'ArrowUp') target.pitch = Math.min(1.15, target.pitch + 0.1);
      if (event.key === 'ArrowDown') target.pitch = Math.max(-1.15, target.pitch - 0.1);
      if (event.key === '+' || event.key === '=') target.zoom = Math.min(2.5, target.zoom * 1.1);
      if (event.key === '-') target.zoom = Math.max(0.55, target.zoom / 1.1);
      if (['Home','r','R'].includes(event.key)) resetView();
      wake();
    }
    function visibility() {
      if (doc.hidden) {
        win.cancelAnimationFrame(frame); frame = 0; lastTime = 0;
        release(); pointer.active = false; pointer.nx = 0; pointer.ny = 0;
        offsets.forEach(off => { off.x = 0; off.y = 0; });
        Object.assign(camera, target);
      } else wake();
    }
    const events = [
      [canvas,'pointermove',move],[canvas,'pointerdown',down],[canvas,'pointerup',up],
      [canvas,'pointerleave',leave],[canvas,'pointercancel',cancel],
      [canvas,'lostpointercapture',cancel],[canvas,'dblclick',resetView],
      [canvas,'wheel',wheel,{passive:false}],[canvas,'keydown',key],
      [win,'blur',cancel],[win,'pagehide',cancel],[win,'pageshow',wake],
      [doc,'visibilitychange',visibility]
    ];
    events.forEach(([el,type,fn,opts]) => el.addEventListener(type,fn,opts));
    canvas.style.cursor = scene.threeD ? 'grab' : 'default';
    const observer = new win.ResizeObserver(resize);
    observer.observe(canvas); resize();
    return {
      getView: () => ({ ...target }),
      reset: resetView,
      snapshot: (scale = 2) => {
        const result = doc.createElement('canvas');
        result.width = Math.round(scene.width * scale); result.height = Math.round(scene.height * scale);
        const context = result.getContext('2d');
        if (!context) throw new Error('无法导出点云图像。');
        paint(context, {width:result.width,height:result.height}, target, false);
        return result;
      },
      destroy: () => {
        disposed = true; win.cancelAnimationFrame(frame); observer.disconnect();
        events.forEach(([el,type,fn,opts]) => el.removeEventListener(type,fn,opts));
        release();
      }
    };
  }

  /** 导出的 HTML 只包含点云画面、点坐标与交互运行时，没有编辑器或原照片。 */
  function toHTML(model, input = {}) {
    const scene = prepare(model, input);
    const payload = JSON.stringify(scene).replace(/</g, '\\u003c');
    const label = scene.threeD ? '三维点云：移动鼠标扰动，拖拽旋转，滚轮缩放，双击复位。' : '点阵人像：移动鼠标可产生扰动。';
    const code = '(' + mount.toString() + ')(document.getElementById("cloud"),' + payload + ',' + project.toString() + ');';
    return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>交互点云</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:' + scene.background + '}' +
      'canvas{display:block;width:100%;height:100%;touch-action:none;border:0;outline:none;box-shadow:none}' +
      'canvas:focus,canvas:focus-visible{border:0;outline:none;box-shadow:none}' +
      'noscript{position:fixed;inset:0;display:grid;place-items:center;color:' + scene.foreground + '}</style></head><body>' +
      '<canvas id="cloud" tabindex="0" role="img" aria-label="' + label + '"></canvas>' +
      '<noscript>请启用 JavaScript 以显示交互点云。</noscript>' +
      '<scr' + 'ipt>\n' + code + '\n</scr' + 'ipt></body></html>';
  }

  return Object.freeze({ prepare, project, mount, toHTML });
});
