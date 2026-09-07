/**
 * 点阵人像生成器 · 零依赖 · 独立编写
 * 输入：RGBA 像素 / 浏览器 Image；输出：真正的圆点 SVG。
 * 浏览器用 window.Halftone；Node.js 用 require('./halftone.js')。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Halftone = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const defaults = Object.freeze({
    width: 800, spacing: 9, radius: 0.52,
    contrast: 1, gamma: 1, threshold: 0.06, edgeFade: 0.10,
    foreground: '#f4f3ef', background: '#100f0b',
    invert: false, autoLevels: true, sourceColors: true
  });
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const number = (value, fallback, low, high) =>
    Number.isFinite(Number(value)) ? clamp(Number(value), low, high) : fallback;
  const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

  function options(input = {}) {
    return {
      width: Math.round(number(input.width, defaults.width, 64, 1600)),
      spacing: number(input.spacing, defaults.spacing, 3, 24),
      radius: number(input.radius, defaults.radius, 0.15, 0.8),
      contrast: number(input.contrast, defaults.contrast, 0.2, 3),
      gamma: number(input.gamma, defaults.gamma, 0.3, 2.5),
      threshold: number(input.threshold, defaults.threshold, 0, 0.8),
      edgeFade: number(input.edgeFade, defaults.edgeFade, 0, 0.3),
      foreground: color(input.foreground, defaults.foreground),
      background: color(input.background, defaults.background),
      invert: Boolean(input.invert),
      autoLevels: input.autoLevels !== false,
      sourceColors: input.sourceColors !== false
    };
  }

  /**
   * 每个网格求透明度加权的平均 RGB 与亮度，避免锯齿和摩尔纹。
   * 默认保留照片颜色；亮度只控制圆点大小，不改变 RGB。
   * 彩色模式用 sqrt(tone) 控制半径，保留暗色区域；单色沿用线性半径。
   */
  function fromPixels(pixels, width, height, input = {}) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
        !pixels || pixels.length !== width * height * 4) {
      throw new Error('需要有效的 RGBA 像素及对应宽高。');
    }
    const config = options(input);
    const outputWidth = Math.max(1, Math.round(config.width * width / Math.max(width, height)));
    const outputHeight = Math.max(1, Math.round(config.width * height / Math.max(width, height)));
    const scaleX = width / outputWidth;
    const scaleY = height / outputHeight;
    const dots = [];
    const cells = [];
    const step = config.spacing;

    for (let y = step / 2; y < outputHeight; y += step) {
      for (let x = step / 2; x < outputWidth; x += step) {
        const x0 = clamp(Math.floor((x - step / 2) * scaleX), 0, width - 1);
        const x1 = clamp(Math.ceil((x + step / 2) * scaleX), x0 + 1, width);
        const y0 = clamp(Math.floor((y - step / 2) * scaleY), 0, height - 1);
        const y1 = clamp(Math.ceil((y + step / 2) * scaleY), y0 + 1, height);
        let light = 0, alpha = 0, red = 0, green = 0, blue = 0;
        for (let sy = y0; sy < y1; sy++) {
          for (let sx = x0; sx < x1; sx++) {
            const index = (sy * width + sx) * 4;
            const a = pixels[index + 3] / 255;
            light += (0.2126 * pixels[index] + 0.7152 * pixels[index + 1] +
                      0.0722 * pixels[index + 2]) / 255 * a;
            red += pixels[index] * a;
            green += pixels[index + 1] * a;
            blue += pixels[index + 2] * a;
            alpha += a;
          }
        }
        if (alpha === 0) continue;
        const sampledColor = '#' + [red, green, blue].map(channel =>
          Math.round(channel / alpha).toString(16).padStart(2, '0')).join('');
        cells.push({ x, y, light: light / alpha, color: sampledColor,
          opacity: alpha / ((x1 - x0) * (y1 - y0)) });
      }
    }
    // 用亮度分位数拉开主体与暗背景；纯色照片不做不稳定的拉伸。
    const levels = cells.map(cell => cell.light).sort((a, b) => a - b);
    const low = levels[Math.floor(levels.length * 0.05)] || 0;
    const high = levels[Math.min(levels.length - 1, Math.floor(levels.length * 0.95))] || 0;
    const normalize = config.autoLevels && high - low > 0.03;
    for (const cell of cells) {
        const { x, y } = cell;
        let tone = normalize ? clamp((cell.light - low) / (high - low), 0, 1) : cell.light;
        if (config.invert) tone = 1 - tone;
        tone = clamp((tone - 0.5) * config.contrast + 0.5, 0, 1);
        tone = Math.pow(tone, config.gamma);
        tone *= cell.opacity;
        if (tone <= config.threshold) continue;
        if (config.edgeFade > 0) {
          tone *= clamp(Math.min(x, outputWidth - x, y, outputHeight - y) /
            (Math.min(outputWidth, outputHeight) * config.edgeFade), 0, 1);
        }
        const radius = step * config.radius * (config.sourceColors ? Math.sqrt(tone) : tone);
        if (radius >= step * 0.09) dots.push({ x, y, r: radius, luminance: cell.light, color: cell.color });
    }
    return { width: outputWidth, height: outputHeight, dots, config };
  }

  /** Canvas 仅用于读取照片像素；可见结果由 SVG 绘制。 */
  function fromImage(img, input = {}) {
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) throw new Error('照片尚未加载完成。');
    // 控制采样画布大小；长图按完整比例保留，不裁剪。
    const scale = Math.min(1, 1200 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('浏览器无法读取照片像素。');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return fromPixels(ctx.getImageData(0, 0, canvas.width, canvas.height).data,
                      canvas.width, canvas.height, input);
  }

  /** 默认将扰动代码封装到 SVG；仅静态栅格化时传 interactive:false。 */
  function toSVG(model, { interactive = true } = {}) {
    const { width, height, dots, config } = model;
    const circles = dots.map(p =>
      `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${p.r.toFixed(3)}"` +
      (config.sourceColors !== false ? ` fill="${color(p.color, config.foreground)}"` : '') + '/>'
    ).join('');
    // 拆开脚本标签，避免本文件被内联到 HTML 时提前结束外层脚本。
    const script = interactive ? '<scr' + 'ipt type="application/ecmascript"><![CDATA[\n' +
      '(' + startInteractive.toString() + ')(' + interact.toString() + ');\n' + ']]></scr' + 'ipt>' : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="半色调点阵人像"${interactive ? ' data-halftone-interactive="true"' : ''}>` +
      `<title>半色调点阵人像</title><rect width="100%" height="100%" fill="${config.background}"/>` +
      `<g fill="${config.foreground}">${circles}</g>${script}</svg>`;
  }

  // 与 interact 一起序列化到 SVG 中；不依赖 Halftone 或任何外部文件。
  function startInteractive(attach) {
    'use strict';
    const script = document.currentScript;
    const root = document.documentElement;
    const targets = script && script.ownerSVGElement ? [script.ownerSVGElement] :
      root.localName === 'svg' ? [root] :
      Array.from(document.querySelectorAll('svg[data-halftone-interactive="true"]'));
    targets.forEach(svg => {
      if (svg.getAttribute('data-halftone-active') === 'true') return;
      attach(svg);
      svg.setAttribute('data-halftone-active', 'true');
    });
  }

  /** 鼠标附近的点轻微避让、弹回。省略 model 时从 SVG 自身读取坐标。 */
  function interact(svg, model) {
    const nodes = Array.from(svg.querySelectorAll('circle'));
    const viewBox = svg.viewBox.baseVal;
    if (!model) model = {
      width: viewBox.width, height: viewBox.height,
      dots: nodes.map(node => ({ x: Number(node.getAttribute('cx')), y: Number(node.getAttribute('cy')) }))
    };
    const doc = svg.ownerDocument;
    const win = doc.defaultView;
    const reducedMotion = win.matchMedia('(prefers-reduced-motion: reduce)');
    const offsets = model.dots.map(() => ({ x: 0, y: 0 }));
    const pointer = { x: 0, y: 0, active: false };
    let frame = 0, lastTime = 0;
    const reach = Math.min(model.width, model.height) * 0.13;

    function draw(time) {
      const factor = reducedMotion.matches ? 1 :
        1 - Math.exp(-Math.min(40, time - (lastTime || time - 16)) / 70);
      lastTime = time;
      let moving = false;
      model.dots.forEach((dot, index) => {
        const off = offsets[index];
        let tx = 0, ty = 0;
        if (pointer.active) {
          const dx = dot.x - pointer.x, dy = dot.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < reach && distance > 0) {
            const push = (1 - distance / reach) ** 2 * reach * 0.30;
            tx = dx / distance * push; ty = dy / distance * push;
          }
        }
        const oldX = off.x, oldY = off.y;
        off.x += (tx - off.x) * factor; off.y += (ty - off.y) * factor;
        if (Math.abs(tx - off.x) + Math.abs(ty - off.y) < 0.02) {
          off.x = tx; off.y = ty;
        } else moving = true;
        if (off.x !== oldX || off.y !== oldY) {
          nodes[index].setAttribute('cx', (dot.x + off.x).toFixed(2));
          nodes[index].setAttribute('cy', (dot.y + off.y).toFixed(2));
        }
      });
      frame = moving ? win.requestAnimationFrame(draw) : 0;
      if (!frame) lastTime = 0;
    }
    function wake() { if (!frame && !doc.hidden) frame = win.requestAnimationFrame(draw); }
    function move(event) {
      if (event.pointerType === 'touch') return;
      // 用 SVG 的屏幕变换矩阵处理缩放、嵌入容器留白与 viewBox 偏移。
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const point = svg.createSVGPoint();
      point.x = event.clientX; point.y = event.clientY;
      const local = point.matrixTransform(matrix.inverse());
      pointer.x = local.x; pointer.y = local.y;
      if (local.x < viewBox.x || local.y < viewBox.y ||
          local.x > viewBox.x + viewBox.width || local.y > viewBox.y + viewBox.height) {
        leave(); return;
      }
      pointer.active = true; wake();
    }
    function leave() { pointer.active = false; wake(); }
    function reset() {
      win.cancelAnimationFrame(frame); frame = 0; lastTime = 0; pointer.active = false;
      nodes.forEach((node, i) => {
        offsets[i].x = 0; offsets[i].y = 0;
        node.setAttribute('cx', model.dots[i].x.toFixed(2));
        node.setAttribute('cy', model.dots[i].y.toFixed(2));
      });
    }
    function visibility() { if (doc.hidden) reset(); }
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerleave', leave);
    svg.addEventListener('pointercancel', leave);
    win.addEventListener('blur', leave);
    win.addEventListener('pagehide', reset);
    doc.addEventListener('visibilitychange', visibility);
    return function destroy() {
      reset();
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerleave', leave);
      svg.removeEventListener('pointercancel', leave);
      win.removeEventListener('blur', leave);
      win.removeEventListener('pagehide', reset);
      doc.removeEventListener('visibilitychange', visibility);
    };
  }

  return Object.freeze({ defaults, options, fromPixels, fromImage, toSVG, interact });
});
