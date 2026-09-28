/**
 * Tingfeng Reel · 渲染与播放器
 * 画面完全由时间 t 决定（render(t) 无隐藏状态），因此可以任意拖动、暂停和循环。
 * 三层画布：back（背景与地面网格）、mid（主体）、front（HUD 与浮层）；
 * 3D 模式下三层在 CSS 空间中拉开纵深，场景里的点云和节点图同时切换到透视投影。
 */
(function () {
  'use strict';

  const { SCENES, DURATION, TYPING, clamp, lerp, range, wrap, ease, sceneAt, timecode, clock, rng, hash, typed, scramble } = window.Timeline;
  const { project, glyphCloud, sphere, orbit, AGENT_GRAPH } = window.Models;

  const W = 1920;
  const H = 1080;
  const TAU = Math.PI * 2;
  const SANS = '"Helvetica Neue", Inter, Arial, "PingFang SC", "Microsoft YaHei", sans-serif';
  const DISPLAY = '"Helvetica Neue", Inter, "Arial Black", Arial, "PingFang SC", sans-serif';
  const SERIF = 'Georgia, "Times New Roman", "Songti SC", "Noto Serif CJK SC", serif';
  const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, "Liberation Mono", "PingFang SC", monospace';
  const CJK = '"Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", "SimSun", serif';

  // 来自 github.com/tingfeng347 的公开资料与仓库 README。
  const PROFILE = Object.freeze({ handle:'tingfeng347', seal:'听风', repos:20, stars:70, since:2023 });

  const PALETTES = Object.freeze({
    dark: Object.freeze({
      bg:'#0a0a0b', ink:'#f3f1ec', ink2:'rgba(243,241,236,0.66)', dim:'rgba(243,241,236,0.4)',
      faint:'rgba(243,241,236,0.1)', line:'rgba(243,241,236,0.2)', panel:'rgba(17,17,19,0.86)',
      accent:'#ff3b2e', accentDim:'rgba(255,59,46,0.42)', accentFaint:'rgba(255,59,46,0.13)',
      cyan:'#35e0ff', onAccent:'#120807', glow:1, vignette:true, split:'screen',
      bgClear:'rgba(10,10,11,0)', accentClear:'rgba(255,59,46,0)'
    }),
    light: Object.freeze({
      bg:'#f1eee6', ink:'#151513', ink2:'rgba(21,21,19,0.72)', dim:'rgba(21,21,19,0.46)',
      faint:'rgba(21,21,19,0.09)', line:'rgba(21,21,19,0.22)', panel:'rgba(252,250,245,0.9)',
      accent:'#e0301e', accentDim:'rgba(224,48,30,0.42)', accentFaint:'rgba(224,48,30,0.1)',
      cyan:'#0095b8', onAccent:'#fff8f4', glow:0.28, vignette:false, split:'multiply',
      bgClear:'rgba(241,238,230,0)', accentClear:'rgba(224,48,30,0)'
    })
  });

  let P = PALETTES.dark;

  // ── 状态 ───────────────────────────────────────────────

  const params = new URLSearchParams(location.search);
  const storage = {
    get(key) { try { return localStorage.getItem(`tingfeng-reel:${key}`); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(`tingfeng-reel:${key}`, value); } catch { /* 隐私模式下忽略 */ } }
  };
  const prefersDark = matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const initialTime = params.has('t') ? clamp(Number(params.get('t')) || 0, 0, DURATION - 0.001) : (reducedMotion ? 9.6 : 0);

  const state = {
    abs: initialTime,
    t: initialTime,
    playing: !params.has('t') && !reducedMotion || params.get('play') === '1',
    theme: pick(params.get('theme'), ['dark', 'light']) || pick(storage.get('theme'), ['dark', 'light']) || (prefersDark.matches ? 'dark' : 'light'),
    dim: pick(params.get('dim'), ['2d', '3d']) || pick(storage.get('dim'), ['2d', '3d']) || '2d',
    mix: 0,
    pointer: { x:0, y:0, sx:0, sy:0 },
    scrubbing: false,
    dirty: true
  };
  state.mix = state.dim === '3d' ? 1 : 0;

  function pick(value, allowed) {
    return allowed.includes(value) ? value : null;
  }

  // ── 画布 ───────────────────────────────────────────────

  const stage = document.getElementById('stage');
  const layers = {};
  for (const canvas of stage.querySelectorAll('canvas')) layers[canvas.dataset.layer] = canvas.getContext('2d');
  let pixelScale = 1;
  const scratch = document.createElement('canvas');
  const scratchCtx = scratch.getContext('2d');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(320, Math.min(2880, Math.round(stage.offsetWidth * dpr)));
    const height = Math.round(width * 9 / 16);
    for (const ctx of Object.values(layers)) {
      ctx.canvas.width = width;
      ctx.canvas.height = height;
    }
    scratch.width = width;
    scratch.height = height;
    pixelScale = width / W;
    state.dirty = true;
  }

  // ── 预计算模型 ─────────────────────────────────────────

  const GLYPH = (() => {
    const size = 240;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently:true });
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${size * 0.9}px ${CJK}`;
    ctx.fillText('风', size / 2, size / 2 + size * 0.03);
    const { data } = ctx.getImageData(0, 0, size, size);
    const mask = new Uint8Array(size * size);
    for (let i = 0; i < mask.length; i += 1) mask[i] = data[i * 4 + 3];
    const points = glyphCloud(mask, size, size, { step:3, radius:6, depth:0.36 });
    const random = rng(347);
    const scatter = points.map(() => ({ x:(random() - 0.5) * 4.2, y:(random() - 0.5) * 3, z:(random() - 0.5) * 3 }));
    const field = [];
    for (let i = 0; i < 260; i += 1) field.push({ x:(random() - 0.5) * 2.2, y:(random() - 0.5) * 2.2, z:(random() - 0.5) * 1.4, v:random() * 0.3 });
    return { points, scatter, field };
  })();

  const DOCS = (() => {
    const random = rng(26);
    return sphere(72).map((p, i) => {
      const r = 0.55 + random() * 0.5;
      return { x:p.x * r, y:p.y * r * 0.8, z:p.z * r, id:i };
    });
  })();
  const TOP_DOCS = DOCS.map((doc, i) => ({ i, d:Math.hypot(doc.x - 0.1, doc.y + 0.05, doc.z - 0.2) })).sort((a, b) => a.d - b.d).slice(0, 5).map(item => item.i);

  // ── 绘制工具 ───────────────────────────────────────────

  function setFont(c, { weight = 400, size = 24, family = SANS, style = '', ls = 0 }) {
    c.font = `${style} ${weight} ${size}px ${family}`.trim();
    if ('letterSpacing' in c) c.letterSpacing = `${ls}px`;
  }

  function measure(c, str, options = {}) {
    c.save();
    setFont(c, options);
    const width = c.measureText(str).width;
    c.restore();
    return width;
  }

  function text(c, str, x, y, options = {}) {
    const { color = P.ink, align = 'left', base = 'alphabetic', alpha = 1, glow = 0, glowColor } = options;
    if (!str || alpha <= 0) return 0;
    c.save();
    setFont(c, options);
    c.textAlign = align;
    c.textBaseline = base;
    c.globalAlpha *= alpha;
    c.fillStyle = color;
    if (glow && P.glow) {
      c.shadowColor = glowColor || color;
      c.shadowBlur = glow * P.glow * pixelScale;
      c.fillText(str, x, y);
      c.shadowBlur = glow * P.glow * pixelScale * 0.3;
    }
    c.fillText(str, x, y);
    const width = c.measureText(str).width;
    c.restore();
    return width;
  }

  const label = (c, str, x, y, options = {}) =>
    text(c, str, x, y, { family:MONO, size:13, weight:500, ls:2.4, color:P.dim, ...options });

  /** 依次打出多个样式片段，返回末尾 x；打字期间和结束后短暂保留闪烁光标。 */
  function typeRun(c, x, y, parts, t, { hold = 0.8, cursorColor = P.accent, block = false } = {}) {
    let cursorX = x;
    let size = parts[0].size || 24;
    for (const part of parts) {
      const shown = typed(part.text, t, part.win);
      cursorX += text(c, shown, cursorX, y, part);
      size = part.size || size;
      if (Array.from(shown).length < Array.from(part.text).length) break;
    }
    const first = parts[0].win[0];
    const last = parts[parts.length - 1].win[1];
    const typing = t >= first && t <= last;
    if (t >= first - 0.35 && t < last + hold && (typing || Math.floor(t * 3.2) % 2 === 0)) {
      c.save();
      c.fillStyle = cursorColor;
      if (block) c.fillRect(cursorX + size * 0.06, y - size * 0.76, size * 0.52, size * 0.9);
      else c.fillRect(cursorX + 5, y - size * 0.78, Math.max(3, size * 0.07), size * 0.92);
      c.restore();
    }
    return cursorX;
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, r);
    else c.rect(x, y, w, h);
  }

  function panel(c, x, y, w, h, { radius = 14, fill = P.panel, stroke = P.line, alpha = 1 } = {}) {
    c.save();
    c.globalAlpha *= alpha;
    roundRect(c, x, y, w, h, radius);
    c.fillStyle = fill;
    c.fill();
    c.strokeStyle = stroke;
    c.lineWidth = 1.2;
    c.stroke();
    c.restore();
  }

  function brackets(c, x, y, w, h, len = 26, color = P.line, width = 1.5) {
    c.save();
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      c.moveTo(cx + dx * len, cy);
      c.lineTo(cx, cy);
      c.lineTo(cx, cy + dy * len);
    }
    c.stroke();
    c.restore();
  }

  /** 方框标签，y 为方框顶部；返回宽度。 */
  function chip(c, str, x, y, { size = 12, color = P.ink2, filled = false, align = 'left', alpha = 1 } = {}) {
    const width = measure(c, str, { family:MONO, size, weight:700, ls:2 }) + size * 1.5;
    const height = size + 14;
    const left = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
    c.save();
    c.globalAlpha *= alpha;
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = 1.2;
    if (filled) c.fillRect(left, y, width, height);
    else c.strokeRect(left + 0.5, y + 0.5, width - 1, height - 1);
    c.restore();
    text(c, str, left + width / 2 + 1, y + height / 2 + 1, { family:MONO, size, weight:700, ls:2, align:'center', base:'middle', color:filled ? P.bg : color, alpha });
    return width;
  }

  function dot(c, x, y, r, color) {
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fillStyle = color;
    c.fill();
  }

  function ring(c, x, y, r, color, width = 1.5, glow = 0) {
    c.save();
    c.beginPath();
    c.arc(x, y, Math.max(0.1, r), 0, TAU);
    c.strokeStyle = color;
    c.lineWidth = width;
    if (glow && P.glow) {
      c.shadowColor = color;
      c.shadowBlur = glow * P.glow * pixelScale;
    }
    c.stroke();
    c.restore();
  }

  /** 横向切片错位 + 色条：只在转场瞬间作用于某一层。 */
  function glitch(c, amount, seed) {
    if (amount <= 0.02) return;
    const { canvas } = c;
    scratchCtx.clearRect(0, 0, scratch.width, scratch.height);
    scratchCtx.drawImage(canvas, 0, 0);
    const random = rng(seed);
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const slices = 3 + Math.floor(amount * 10);
    for (let i = 0; i < slices; i += 1) {
      const y = random() * canvas.height;
      const h = (0.006 + random() * 0.07) * canvas.height;
      const dx = (random() - 0.5) * canvas.width * 0.14 * amount;
      c.clearRect(0, y, canvas.width, h);
      c.drawImage(scratch, 0, y, canvas.width, h, dx, y, canvas.width, h);
    }
    for (let i = 0; i < 2 + amount * 5; i += 1) {
      c.globalAlpha = 0.25 + random() * 0.55 * amount;
      c.fillStyle = random() < 0.6 ? P.accent : P.ink;
      c.fillRect(random() * canvas.width, random() * canvas.height, random() * canvas.width * 0.28, (1 + random() * 5) * pixelScale);
    }
    c.restore();
  }

  function camera(extra = {}) {
    return { persp:state.mix, dist:3.2, ...extra };
  }

  /** 按深度分桶批量画点：几千个点只需要几次 fill。 */
  function drawCloud(c, points, cam, { t, assemble = 1, scatter = null, alpha = 1, dotScale = 1, accentRate = 0.07, wobble = 0.006 }) {
    const buckets = [[], [], [], []];
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      let { x, y, z } = p;
      if (scatter && assemble < 1) {
        const k = ease.outCubic(clamp(assemble * 1.5 - hash(i) * 0.5));
        const s = scatter[i];
        x = lerp(s.x, x, k);
        y = lerp(s.y, y, k);
        z = lerp(s.z, z, k);
      }
      x += Math.sin(t * 1.7 + i * 0.37) * wobble;
      y += Math.cos(t * 1.3 + i * 0.21) * wobble;
      const q = project({ x, y, z }, cam);
      const r = (1.3 + (p.v || 0) * 3.4) * q.s * dotScale;
      const bucket = hash(i + 0.5) < accentRate ? 3 : q.z < -0.12 ? 2 : q.z < 0.12 ? 1 : 0;
      buckets[bucket].push(q.x, q.y, r);
    }
    const styles = [[P.dim, 0.75], [P.ink2, 0.9], [P.ink, 1], [P.accent, 1]];
    c.save();
    buckets.forEach((list, b) => {
      c.globalAlpha = alpha * styles[b][1];
      c.fillStyle = styles[b][0];
      c.beginPath();
      for (let i = 0; i < list.length; i += 3) {
        c.moveTo(list[i] + list[i + 2], list[i + 1]);
        c.arc(list[i], list[i + 1], list[i + 2], 0, TAU);
      }
      c.fill();
    });
    c.restore();
  }

  function sceneEnvelope(local, dur, fadeIn = 0.3, fadeOut = 0.22) {
    return ease.outCubic(range(local, 0, fadeIn)) * (1 - range(local, dur - fadeOut, dur));
  }

  // ── 背景与 HUD ─────────────────────────────────────────

  const FOCUS = {
    intro:[960, 560, 700, 0.5], agent:[960, 560, 800, 0.4], identity:[1480, 520, 640, 1],
    rag:[1300, 500, 600, 0.8], graph:[1180, 540, 620, 0.8], workbench:[960, 560, 800, 0.6],
    career:[960, 540, 900, 0.9], a2a:[1200, 540, 560, 0.9], arch:[960, 600, 700, 0.7], outro:[1440, 540, 700, 0.9]
  };

  function drawBackground(c, t, info) {
    c.fillStyle = P.bg;
    c.fillRect(0, 0, W, H);

    const [fx, fy, fr, fa] = FOCUS[info.scene.id];
    const glow = c.createRadialGradient(fx, fy, 0, fx, fy, fr);
    glow.addColorStop(0, P.accentFaint);
    glow.addColorStop(1, P.accentClear);
    c.globalAlpha = fa;
    c.fillStyle = glow;
    c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;

    const gap = 48;
    const drift = (t * 8) % gap;
    c.fillStyle = P.faint;
    for (let x = gap / 2 - drift; x < W; x += gap) {
      for (let y = gap / 2; y < H; y += gap) c.fillRect(x - 1, y - 1, 2, 2);
    }

    if (state.mix > 0.01) floorGrid(c, t, state.mix);

    if (P.vignette) {
      const v = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.72);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.6)');
      c.fillStyle = v;
      c.fillRect(0, 0, W, H);
    }
  }

  /** 3D 模式的透视地面：给整块舞台一个可以“站上去”的空间。 */
  function floorGrid(c, t, mix) {
    const horizon = 700;
    const vx = W / 2;
    const vy = horizon - 260;
    c.save();
    c.globalAlpha = mix * 0.9;
    c.strokeStyle = P.line;
    c.lineWidth = 1;
    c.beginPath();
    for (let i = -14; i <= 14; i += 1) {
      const bx = vx + i * 150;
      const u = (horizon - vy) / (H - vy);
      c.moveTo(lerp(vx, bx, u), horizon);
      c.lineTo(bx, H);
    }
    for (let k = 0; k < 10; k += 1) {
      const u = ((k + (t * 0.6) % 1) / 10);
      const y = horizon + (H - horizon) * u * u;
      c.moveTo(0, y);
      c.lineTo(W, y);
    }
    c.stroke();
    const fade = c.createLinearGradient(0, horizon - 40, 0, horizon + 120);
    fade.addColorStop(0, P.bg);
    fade.addColorStop(1, P.bgClear);
    c.globalAlpha = mix;
    c.fillStyle = fade;
    c.fillRect(0, horizon - 40, W, 160);
    c.restore();
  }

  function drawHud(c, t, info) {
    const n = SCENES.length;
    brackets(c, 40, 40, W - 80, H - 80, 34, P.line, 1.6);

    label(c, PROFILE.handle.toUpperCase(), 76, 86, { size:14, weight:700, ls:3.2, color:P.ink2 });
    label(c, 'FULL-STACK · AI AGENT · OPEN SOURCE', 76, 108, { size:11 });

    label(c, `TC ${timecode(t)}`, W - 76, 86, { size:14, weight:600, align:'right', color:P.ink2 });
    const rec = 'REC  30 FPS · 16:9';
    label(c, rec, W - 76, 108, { size:11, align:'right' });
    if (Math.floor(t * 2) % 2 === 0) dot(c, W - 76 - measure(c, rec, { family:MONO, size:11, weight:500, ls:2.4 }) - 10, 104, 4, P.accent);

    label(c, `${String(info.index).padStart(2, '0')} — ${info.scene.label}`, 76, H - 88, { size:13, weight:600, color:P.ink2 });
    c.fillStyle = P.faint;
    c.fillRect(76, H - 72, 220, 2);
    c.fillStyle = P.accent;
    c.fillRect(76, H - 72, 220 * info.progress, 2);

    for (let i = 0; i < n; i += 1) {
      c.fillStyle = i === info.index ? P.accent : i < info.index ? P.ink2 : P.faint;
      c.fillRect(W - 76 - (n - i) * 20 + 4, H - 96, 14, 5);
    }
    label(c, `SCN ${String(info.index + 1).padStart(2, '0')}/${n}`, W - 76, H - 68, { size:11, align:'right' });

    // 右侧刻度尺：整条片子的位置。
    c.fillStyle = P.faint;
    for (let i = 0; i <= 28; i += 1) c.fillRect(W - 44 - (i % 4 === 0 ? 10 : 5), 240 + i * 21, i % 4 === 0 ? 10 : 5, 1);
    c.fillStyle = P.accent;
    c.fillRect(W - 60, 240 + (t / DURATION) * 588 - 1, 16, 2);
  }

  function grain(c, t) {
    if (!P.vignette || reducedMotion) return;
    const random = rng(Math.floor(t * 30) + 1);
    c.save();
    c.fillStyle = P.ink;
    for (let i = 0; i < 220; i += 1) {
      c.globalAlpha = 0.03 + random() * 0.07;
      c.fillRect(random() * W, random() * H, 1.5, 1.5);
    }
    c.restore();
  }

  // ── 场景 ───────────────────────────────────────────────

  const Scenes = {
    intro(L, l, t) {
      const c = L.mid;
      const fadeOut = 1 - range(l, 3.5, 3.95);
      const settle = ease.inOutCubic(range(l, 2.5, 3.3));
      const amp = 46 * ease.outCubic(range(l, 0.1, 1.0)) * (1 - 0.6 * settle);
      const x0 = 170;
      const x1 = 1750;
      const wave = (x, lane) => {
        const u = (x - x0) / (x1 - x0);
        const env = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.7);
        return 575 + lane * settle * 30 + amp * env * Math.sin(x * 0.0058 + l * 2.3 + lane * 0.55) * (1 - Math.abs(lane) * 0.15);
      };

      const reach = lerp(x0, x1, ease.outCubic(range(l, 0, 0.9)));
      c.save();
      for (const lane of [-2, -1, 0, 1, 2]) {
        if (lane !== 0 && settle <= 0.001) continue;
        c.beginPath();
        for (let x = x0; x <= reach; x += 6) {
          const y = wave(x, lane);
          if (x === x0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.globalAlpha = fadeOut * (lane === 0 ? 1 : settle * 0.8);
        c.strokeStyle = lane === 0 ? P.ink2 : P.dim;
        c.lineWidth = lane === 0 ? 2 : 1.2;
        c.stroke();
      }
      c.globalAlpha = fadeOut * range(l, 0.4, 0.9);
      label(c, 'INPUT · PROMPT', x0, 660, { size:11 });
      label(c, 'OUTPUT · SHIPPED', x1, 660, { size:11, align:'right' });

      const pop = ease.outBack(range(l, 0.55, 0.95));
      [[0, 34], [1, 22]].forEach(([k, r]) => {
        const x = 760 + k * 420 + Math.sin(l * 1.25 + k * 2.1) * 100;
        const y = wave(x, 0);
        c.globalAlpha = fadeOut * clamp(pop);
        ring(c, x, y, r * pop, P.accent, 1.8, 16);
        dot(c, x, y, 4.5, P.accent);
        c.strokeStyle = P.dim;
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x, y - r - 8);
        c.lineTo(x, y - r - 42);
        c.stroke();
        label(c, `T${k} · ${(0.42 + 0.3 * Math.sin(l * 2 + k)).toFixed(2)}`, x, y - r - 52, { size:11, align:'center', color:P.ink2 });
        label(c, k ? 'TOOL' : 'TOKEN', x, y + r + 26, { size:10, align:'center' });
      });
      c.restore();

      const lift = ease.inOutCubic(range(l, 2.9, 3.6));
      c.save();
      c.globalAlpha = 1 - range(l, 3.0, 3.6);
      typeRun(c, 300, 390 - lift * 40, [
        { text:'build agents in ', win:TYPING.introA, size:70, weight:300, family:SANS, color:P.ink },
        { text:'code,', win:TYPING.introB, size:64, weight:600, family:MONO, color:P.accent, glow:18 }
      ], t, { hold:0.25 });
      c.restore();

      const second = [
        { text:'play with the ', win:TYPING.introC, size:70, weight:300, family:SANS, color:P.ink },
        { text:'wind.', win:TYPING.introD, size:84, style:'italic', weight:400, family:SERIF, color:P.accent, glow:18 }
      ];
      const width = second.reduce((sum, part) => sum + measure(c, part.text, part), 0);
      c.save();
      c.globalAlpha = 1 - range(l, 3.3, 3.9);
      typeRun(c, 1640 - width, 830 + lift * 20, second, t, { hold:0.9 });
      c.restore();
    },

    agent(L, l, t) {
      const c = L.mid;
      const f = L.front;
      const show = sceneEnvelope(l, 4, 0.45, 0.25);
      const x = 250;
      const y = 300 + (1 - ease.outCubic(range(l, 0, 0.45))) * 50;
      const w = 1420;
      const h = 590;

      c.save();
      c.globalAlpha = show;
      panel(c, x, y, w, h, { radius:16 });
      c.fillStyle = P.line;
      c.fillRect(x, y + 52, w, 1);
      [P.accent, P.dim, P.dim].forEach((color, i) => dot(c, x + 28 + i * 20, y + 26, 5, color));
      label(c, 'windcode — ~/projects/windplay', x + w / 2, y + 31, { size:13, align:'center', color:P.ink2, ls:1 });
      label(c, 'DEEPSEEK · CLAUDE · MCP', x + w - 26, y + 31, { size:11, align:'right' });

      const lh = 70;
      const top = y + 118;
      const left = x + 96;
      for (let i = 0; i < 7; i += 1) label(c, String(i + 1), x + 50, top + i * lh - 4, { size:15, align:'right', ls:0, alpha:0.7 });
      text(c, '›', left, top, { family:MONO, size:28, weight:700, color:P.accent });
      typeRun(c, left + 34, top, [
        { text:'windcode "修复失败的测试并提交"', win:TYPING.command, family:MONO, size:27, weight:500, color:P.ink }
      ], t, { hold:0.2, cursorColor:P.ink });

      const rows = [
        { at:5.15, tag:'PLAN', text:'读取项目结构 · 定位 3 个相关文件', tail:'0.4s' },
        { at:5.55, tag:'EDIT', text:'src/timeline.js', add:'+12', del:'−3' },
        { at:5.95, tag:'ASK', text:'bash · npm test', ask:true },
        { at:6.70, tag:'TEST', text:'24 passed · 0 failed', tail:'1.8s', ok:true },
        { at:7.10, tag:'DONE', text:'会话已保存 · Trace 可回放 · 可回滚', ok:true }
      ];
      rows.forEach((row, i) => {
        const p = ease.outCubic(range(t, row.at, row.at + 0.25));
        if (p <= 0) return;
        const ry = top + (i + 1) * lh;
        const rx = left + (1 - p) * 18;
        c.save();
        c.globalAlpha *= p;
        if (row.ask) {
          c.fillStyle = P.accentFaint;
          c.fillRect(x + 72, ry - 38, w - 102, 54);
          c.fillStyle = P.accent;
          c.fillRect(x + 72, ry - 38, 3, 54);
        }
        const tagWidth = chip(c, row.tag, rx, ry - 25, { size:12, color:row.ask || row.ok ? P.accent : P.ink2, filled:row.ask });
        let cx = rx + tagWidth + 22;
        cx += text(c, row.text, cx, ry, { family:MONO, size:24, color:P.ink });
        if (row.add) {
          cx += text(c, `  ${row.add}`, cx, ry, { family:MONO, size:24, color:P.accent });
          text(c, `  ${row.del}`, cx, ry, { family:MONO, size:24, color:P.dim });
        }
        if (row.tail) text(c, row.tail, x + w - 40, ry, { family:MONO, size:18, color:P.dim, align:'right' });
        if (row.ask) {
          const answer = typed('y', t, TYPING.confirm);
          const question = '允许执行？ [y/N] ';
          const qx = x + w - 60 - measure(c, question, { family:MONO, size:22 }) - 16;
          text(c, question, qx, ry, { family:MONO, size:22, color:P.ink2 });
          text(c, answer, x + w - 60, ry, { family:MONO, size:24, weight:700, color:P.accent, glow:12 });
        }
        c.restore();
      });
      c.restore();

      f.save();
      f.globalAlpha = show;
      const tx0 = 300;
      const tx1 = 1620;
      const ty = 200;
      const progress = ease.inOutCubic(range(l, 0.3, 3.5));
      const head = lerp(tx0, tx1, progress);
      label(f, 'TRACE · SESSION 0347 · PLAN → ACT → VERIFY', tx0, ty - 30, { size:11 });
      f.fillStyle = P.line;
      f.fillRect(tx0, ty - 0.5, tx1 - tx0, 1);
      f.fillStyle = P.accent;
      f.fillRect(tx0, ty - 1, head - tx0, 2);
      ['PLAN', 'READ', 'EDIT', 'TEST', 'REVIEW'].forEach((step, i, all) => {
        const sx = lerp(tx0, tx1, i / (all.length - 1));
        const done = head >= sx - 1;
        dot(f, sx, ty, 6, done ? P.accent : P.bg);
        ring(f, sx, ty, 6, done ? P.accent : P.line, 1.4);
        label(f, step, sx, ty + 32, { size:11, align:'center', color:done ? P.ink2 : P.dim });
      });
      ring(f, head, ty, 15, P.accent, 1.6, 18);
      label(f, `t+${(progress * 3.2).toFixed(2)}s`, head, ty - 28, { size:11, align:'center', color:P.accent });
      label(f, 'WINDCODE · TERMINAL CODING AGENT', W - 250, 944, { size:13, align:'right', color:P.ink2, weight:600 });
      label(f, 'TEXTUAL TUI · 权限审批 · 进程沙箱 · 长期记忆', W - 250, 968, { size:11, align:'right' });
      f.restore();
    },

    identity(L, l, t) {
      const c = L.mid;
      const f = L.front;
      const out = 1 - range(l, 3.8, 4);
      const x = 140;

      const nameStyle = { weight:900, size:196, family:DISPLAY, ls:-4 };
      nameStyle.size = Math.min(196, 196 * 1010 / measure(c, 'TINGFENG', nameStyle));
      const reveal = range(l, 0.02, 0.62);
      c.save();
      c.globalAlpha = out;
      const jolt = (1 - ease.outExpo(range(l, 0, 0.35))) * 26;
      text(c, scramble('TINGFENG', reveal, 11), x - jolt, 470, { ...nameStyle, color:P.ink, glow:38 });
      const numberWidth = text(c, scramble('347', range(l, 0.18, 0.7), 12), x + jolt, 470 + nameStyle.size * 0.98, { ...nameStyle, color:P.ink, glow:38 });

      // 印章：“听风”，标题落定后盖上。
      const stamp = ease.outBack(range(l, 0.5, 0.82));
      const sx = x + numberWidth + 44;
      const sy = 470 + nameStyle.size * 0.98 - nameStyle.size * 0.78;
      const sw = 92;
      const sh = 178;
      if (stamp > 0) {
        c.save();
        c.translate(sx + sw / 2, sy + sh / 2);
        const s = lerp(1.7, 1, clamp(stamp));
        c.scale(s, s);
        c.globalAlpha *= clamp(stamp);
        c.fillStyle = P.accentFaint;
        c.fillRect(-sw / 2, -sh / 2, sw, sh);
        c.strokeStyle = P.accent;
        c.lineWidth = 2.4;
        if (P.glow) {
          c.shadowColor = P.accent;
          c.shadowBlur = 20 * P.glow * pixelScale;
        }
        c.strokeRect(-sw / 2, -sh / 2, sw, sh);
        c.restore();
        c.save();
        c.globalAlpha *= clamp(stamp);
        Array.from(PROFILE.seal).forEach((ch, i) => text(c, ch, sx + sw / 2, sy + 52 + i * 78, {
          family:CJK, size:68, weight:900, color:P.accent, align:'center', base:'middle', glow:16
        }));
        c.restore();
      }

      const infoX = sx + sw + 36;
      const infoY = sy + 34;
      [
        ['GITHUB', `@${PROFILE.handle}`],
        ['SINCE', String(PROFILE.since)],
        ['REPOS', `${PROFILE.repos} · ★ ${PROFILE.stars}`],
        ['BASED', 'CHINA']
      ].forEach(([key, value], i) => {
        const p = range(l, 0.75 + i * 0.08, 1.05 + i * 0.08);
        label(c, key, infoX, infoY + i * 38, { size:11, alpha:p });
        label(c, value, infoX + 96, infoY + i * 38, { size:13, color:P.ink2, weight:600, alpha:p, ls:1.6 });
      });

      const lineW = ease.inOutCubic(range(l, 0.55, 1.1)) * 1010;
      c.fillStyle = P.accent;
      c.fillRect(x, 790, lineW, 3);

      const roleA = 'FULL-STACK DEVELOPER & LLM APPLICATIONS EXPLORER';
      const roleB = 'BUILDING CODING AGENTS · OPEN SOURCE · KNOWLEDGE GRAPHS';
      const roleP = range(l, 0.8, 1.3);
      const role = l < 2.1 ? scramble(roleA, roleP, 21) : scramble(roleB, range(l, 2.1, 2.7), 22);
      chip(c, 'ROLE', x, 818, { size:11, color:P.accent, filled:true, alpha:roleP });
      label(c, role, x + 86, 838, { size:16, weight:700, color:P.ink, ls:3.4 });
      label(c, 'PYTHON · TYPESCRIPT · JAVA · FASTAPI · VUE · LANGGRAPH · VLLM', x, 884, { size:11, alpha:range(l, 1.1, 1.5) });
      c.restore();

      // 右侧点云：“风”字从散点汇聚成形。
      const px = 1200;
      const py = 190;
      const pw = 580;
      const ph = 680;
      const frameIn = ease.outCubic(range(l, 0.15, 0.6));
      c.save();
      c.globalAlpha = out * frameIn;
      brackets(c, px, py, pw, ph, 30, P.accent, 1.8);
      c.strokeStyle = P.faint;
      c.strokeRect(px + 0.5, py + 0.5, pw, ph);
      label(c, 'FIG.02 · 风 / POINT CLOUD', px + 20, py + 34, { size:11, color:P.ink2 });
      label(c, `${GLYPH.points.length} PTS`, px + pw - 20, py + 34, { size:11, align:'right', color:P.accent });
      label(c, state.mix > 0.5 ? 'VIEW · PERSPECTIVE' : 'VIEW · ORTHOGRAPHIC', px + 20, py + ph - 22, { size:11 });
      label(c, `YAW ${(Math.sin(t * 0.9) * 32 * state.mix).toFixed(1)}°`, px + pw - 20, py + ph - 22, { size:11, align:'right' });
      const scanY = py + 60 + ((l * 0.5) % 1) * (ph - 120);
      const scan = c.createLinearGradient(0, scanY - 60, 0, scanY);
      scan.addColorStop(0, P.accentClear);
      scan.addColorStop(1, P.accentFaint);
      c.fillStyle = scan;
      c.fillRect(px + 1, scanY - 60, pw - 2, 60);
      c.fillStyle = P.accentDim;
      c.fillRect(px + 1, scanY, pw - 2, 1);
      c.restore();

      const cam = camera({ yaw:state.mix * (Math.sin(t * 0.9) * 0.56 + 0.18), pitch:state.mix * Math.sin(t * 0.6) * 0.16, cx:px + pw / 2, cy:py + ph / 2 + 10, scale:250 });
      drawCloud(f, GLYPH.field, cam, { t, alpha:out * frameIn * 0.5, dotScale:0.8, accentRate:0.02, wobble:0.01 });
      drawCloud(f, GLYPH.points, cam, { t, assemble:range(l, 0.1, 1.4), scatter:GLYPH.scatter, alpha:out, dotScale:1, accentRate:0.03 });
    },

    rag(L, l, t) {
      const c = L.mid;
      const f = L.front;
      const show = sceneEnvelope(l, 2, 0.25, 0.18);
      c.save();
      c.globalAlpha = show;
      label(c, 'SELECTED WORK · 01 / 06', 150, 330, { size:13, color:P.accent, weight:700 });
      text(c, scramble('zst_agent', range(l, 0, 0.4), 31), 146, 452, { family:DISPLAY, weight:900, size:124, ls:-3, glow:30 });
      text(c, '智扫通 · 扫地机器人智能客服', 150, 520, { size:36, weight:500, color:P.ink2 });
      label(c, 'FASTAPI · VUE 3 · RAG · AI AGENT', 150, 572, { size:14, color:P.ink2 });
      text(c, '★ 26', 150, 640, { family:MONO, size:30, weight:700, color:P.accent, glow:14 });
      label(c, 'STARS · 最受欢迎', 250, 636, { size:11 });

      const steps = ['EMBED', 'RETRIEVE', 'RERANK', 'GENERATE'];
      steps.forEach((step, i) => {
        const on = range(l, 0.2 + i * 0.28, 0.3 + i * 0.28);
        const sx = 900 + i * 210;
        chip(c, step, sx, 176, { size:11, color:on > 0.5 ? P.accent : P.dim, filled:on > 0.5 && i === Math.min(3, Math.floor((l - 0.2) / 0.28)) });
        if (i < steps.length - 1) label(c, '→', sx + 172, 196, { size:13, color:on > 0.5 ? P.accent : P.dim });
      });
      c.restore();

      const cam = camera({ yaw:t * 0.35 + state.mix * 0.3, pitch:0.25 * state.mix + 0.12, cx:1330, cy:520, scale:300 });
      const query = project({ x:0.1, y:-0.05, z:0.2 }, cam);
      const link = ease.outCubic(range(l, 0.35, 0.9));
      f.save();
      f.globalAlpha = show;
      DOCS.forEach((doc, i) => {
        const q = project(doc, cam);
        const top = TOP_DOCS.includes(i);
        const size = (top ? 13 : 9) * q.s;
        f.globalAlpha = show * (top && link > 0 ? 1 : 0.35 + 0.4 * clamp(q.z + 0.6));
        f.strokeStyle = top && link > 0 ? P.accent : P.ink2;
        f.lineWidth = 1.2;
        f.strokeRect(q.x - size / 2, q.y - size / 2, size, size);
        if (top && link > 0.5) {
          f.fillStyle = P.accent;
          f.fillRect(q.x - size / 4, q.y - size / 4, size / 2, size / 2);
        }
      });
      f.globalAlpha = show;
      TOP_DOCS.forEach((i, rank) => {
        const q = project(DOCS[i], cam);
        const p = clamp(link * 1.6 - rank * 0.15);
        if (p <= 0) return;
        f.strokeStyle = P.accent;
        f.lineWidth = 1.4;
        f.beginPath();
        f.moveTo(query.x, query.y);
        f.lineTo(lerp(query.x, q.x, p), lerp(query.y, q.y, p));
        f.stroke();
        if (p >= 1) label(f, (0.94 - rank * 0.03).toFixed(2), q.x + 12, q.y - 10, { size:11, color:P.accent, ls:1 });
      });
      const pulse = (l * 1.4) % 1;
      ring(f, query.x, query.y, 10 + pulse * 40, P.accent, 1.4 * (1 - pulse));
      ring(f, query.x, query.y, 14, P.accent, 2, 18);
      dot(f, query.x, query.y, 5, P.accent);
      label(f, 'QUERY', query.x + 22, query.y + 30, { size:11, color:P.accent });
      f.restore();

      const bubble = ease.outCubic(range(l, 0.55, 0.8));
      c.save();
      c.globalAlpha = show * bubble;
      const bx = 960;
      const by = 800 + (1 - bubble) * 20;
      panel(c, bx, by, 760, 112, { radius:12 });
      label(c, 'USER', bx + 24, by + 40, { size:11, color:P.accent });
      text(c, '扫地机器人为什么回充失败？', bx + 100, by + 44, { size:24, color:P.ink });
      label(c, 'AGENT', bx + 24, by + 84, { size:11, color:P.accent });
      typeRun(c, bx + 100, by + 88, [
        { text:'已检索 5 条知识 · 充电座被遮挡，建议清理周边 1m…', win:TYPING.answer, size:22, color:P.ink2 }
      ], t, { hold:0.5 });
      c.restore();
    },

    graph(L, l, t) {
      const c = L.mid;
      const f = L.front;
      const show = sceneEnvelope(l, 2, 0.25, 0.18);
      const yaml = [
        ['agent', ': research-team'],
        ['paradigm', ': plan-and-execute'],
        ['nodes', ':'],
        ['  - ', 'planner'],
        ['  - ', 'researcher'],
        ['    tools', ': [mcp.search]'],
        ['  - ', 'writer'],
        ['runtime', ': [cli, api, sdk]']
      ];
      c.save();
      c.globalAlpha = show;
      label(c, 'SELECTED WORK · 02 / 06', 110, 230, { size:13, color:P.accent, weight:700 });
      panel(c, 110, 260, 470, 420, { radius:12 });
      label(c, 'windagent.yaml', 134, 296, { size:11, color:P.ink2 });
      c.fillStyle = P.line;
      c.fillRect(110, 314, 470, 1);
      yaml.forEach(([key, value], i) => {
        const p = range(l, 0.05 + i * 0.07, 0.2 + i * 0.07);
        if (p <= 0) return;
        const ly = 360 + i * 38;
        const kw = text(c, key, 136, ly, { family:MONO, size:19, color:key.trim() === '-' ? P.dim : P.ink2, alpha:p });
        text(c, value, 136 + kw, ly, { family:MONO, size:19, color:value.startsWith(':') ? P.ink : P.accent, alpha:p });
      });
      text(c, 'WindAgent', 1790, 880, { family:DISPLAY, weight:900, size:104, ls:-3, align:'right', glow:28 });
      text(c, '编排者，不是创造者。', 1790, 938, { family:SERIF, size:32, style:'italic', color:P.ink2, align:'right' });
      label(c, 'YAML DSL · LANGGRAPH · FASTMCP · A2A', 110, 730, { size:12 });
      label(c, 'CLI · WEB API · PYTHON SDK · TS SDK', 110, 756, { size:12 });
      c.restore();

      const cam = camera({ yaw:state.mix * (Math.sin(t * 0.7) * 0.55 - 0.25), pitch:state.mix * 0.3, cx:1180, cy:500, scale:400 });
      const nodes = new Map(AGENT_GRAPH.nodes.map(node => [node.id, { ...node, q:project(node, cam) }]));
      const activeIndex = Math.floor(clamp((l - 0.4) / 0.24, 0, 5));
      f.save();
      f.globalAlpha = show;
      AGENT_GRAPH.edges.forEach(([from, to], i) => {
        const a = nodes.get(from).q;
        const b = nodes.get(to).q;
        const p = ease.inOutCubic(range(l, 0.15 + i * 0.12, 0.45 + i * 0.12));
        if (p <= 0) return;
        const loop = from === 'reviewer';
        f.save();
        f.strokeStyle = loop ? P.dim : P.ink2;
        f.lineWidth = 1.6;
        if (loop) f.setLineDash([6, 8]);
        f.beginPath();
        f.moveTo(a.x, a.y);
        f.lineTo(lerp(a.x, b.x, p), lerp(a.y, b.y, p));
        f.stroke();
        f.restore();
        if (p >= 1) {
          const k = (t * 1.1 + i * 0.37) % 1;
          dot(f, lerp(a.x, b.x, k), lerp(a.y, b.y, k), 4, P.accent);
        }
      });
      AGENT_GRAPH.nodes.forEach((node, i) => {
        const { q } = nodes.get(node.id);
        const p = ease.outBack(range(l, 0.1 + i * 0.1, 0.35 + i * 0.1));
        if (p <= 0) return;
        const r = 30 * q.s * p;
        const active = i === activeIndex;
        dot(f, q.x, q.y, r, active ? P.accent : P.bg);
        ring(f, q.x, q.y, r, active ? P.accent : P.ink2, 1.6, active ? 22 : 0);
        dot(f, q.x, q.y, 3.5, active ? P.onAccent : P.ink2);
        label(f, node.label, q.x, q.y + r + 26, { size:12, align:'center', color:active ? P.accent : P.ink2, weight:600 });
      });
      f.restore();
    },

    workbench(L, l, t) {
      const c = L.mid;
      const f = L.front;
      const show = sceneEnvelope(l, 2, 0.05, 0.15);
      c.save();
      c.globalAlpha = show * 0.9;
      const x = 250;
      const y = 180;
      const w = 1420;
      const h = 720;
      c.strokeStyle = P.line;
      c.lineWidth = 1.2;
      c.strokeRect(x, y, w, h);
      c.strokeRect(x, y, 56, h);
      c.strokeRect(x + 56, y, 260, h);
      c.strokeRect(x + 316, y, w - 316, 44);
      c.strokeRect(x + 316, y + h - 190, w - 316, 190);
      for (let i = 0; i < 5; i += 1) c.strokeRect(x + 16, y + 22 + i * 54, 24, 24);
      c.fillStyle = P.faint;
      for (let i = 0; i < 12; i += 1) c.fillRect(x + 80 + (i % 3) * 18, y + 30 + i * 36, 90 + hash(i) * 110, 10);
      ['reel.js', 'score.js', 'README.md'].forEach((tab, i) => {
        c.fillStyle = i === 0 ? P.faint : 'rgba(0,0,0,0)';
        c.fillRect(x + 316 + i * 170, y, 170, 44);
        label(c, tab, x + 336 + i * 170, y + 28, { size:12, color:i === 0 ? P.ink2 : P.dim, ls:1 });
      });
      for (let i = 0; i < 11; i += 1) {
        c.fillStyle = i % 4 === 1 ? P.accentFaint : P.faint;
        c.fillRect(x + 380 + (i % 3) * 30, y + 80 + i * 36, 160 + hash(i + 40) * 520, 10);
      }
      typeRun(c, x + 340, y + h - 140, [
        { text:'$ dsh plugin --profile web add dsh-vscode-workbench', win:[16.25, 17.1], family:MONO, size:20, color:P.ink2 }
      ], t, { hold:1 });
      label(c, '资源管理器 · MONACO · 源代码管理 · 分屏终端', x + 340, y + h - 90, { size:12 });
      c.restore();

      const word = 'workbench';
      const style = { family:DISPLAY, weight:900, size:236, ls:-8, align:'center' };
      const jitter = (range(l, 0, 0.3) < 1 || (l > 1.0 && l < 1.12)) ? (hash(Math.floor(t * 30)) - 0.5) * 30 : 0;
      const split = 8 + (1 - range(l, 0, 0.4)) * 22;
      c.save();
      c.globalAlpha = show;
      c.globalCompositeOperation = P.split;
      text(c, word, 960 - split + jitter, 640, { ...style, color:P.accent });
      text(c, word, 960 + split + jitter, 640, { ...style, color:P.cyan });
      c.globalCompositeOperation = 'source-over';
      text(c, word, 960 + jitter * 0.4, 640, { ...style, color:P.ink });
      c.restore();

      label(f, 'SELECTED WORK · 03 / 06', 960, 150, { size:13, align:'center', color:P.accent, weight:700, alpha:show });
      label(f, 'DSH · VS CODE WORKBENCH', 250, 950, { size:13, color:P.ink2, weight:600, alpha:show });
      label(f, 'TYPESCRIPT · DEEPSEEK HARNESS PLUGIN', 960, 950, { size:12, align:'center', alpha:show });
      text(f, '★ 11', 1670, 952, { family:MONO, size:22, weight:700, color:P.accent, align:'right', alpha:show });

      const flash = 1 - range(l, 0, 0.14);
      if (flash > 0) {
        f.save();
        f.globalAlpha = flash * 0.85;
        f.fillStyle = P.ink;
        f.fillRect(0, 0, W, H);
        f.restore();
      }
    },

    career(L, l, t) {
      const c = L.mid;
      const f = L.front;
      const inP = ease.outExpo(range(l, 0, 0.32));
      const outP = ease.inCubic(range(l, 1.78, 2));
      const bandX = -W * (1 - inP) + W * outP;
      const show = 1 - outP;
      c.save();
      if (P.glow) {
        c.shadowColor = P.accent;
        c.shadowBlur = 40 * P.glow * pixelScale;
      }
      c.fillStyle = P.accent;
      c.fillRect(bandX, 430, W, 220);
      c.restore();
      c.save();
      c.beginPath();
      c.rect(bandX, 430, W, 220);
      c.clip();
      typeRun(c, 330, 585, [
        { text:'> repo2career', win:TYPING.career, family:MONO, size:128, weight:700, color:P.onAccent }
      ], t, { hold:1.5, cursorColor:P.onAccent, block:true });
      c.restore();

      label(f, 'SELECTED WORK · 04 / 06', 960, 390, { size:13, align:'center', color:P.accent, weight:700, alpha:show * inP });
      c.save();
      c.globalAlpha = show * range(l, 0.35, 0.6);
      label(c, '[ PYTHON · FASTAPI · REACT · DEEPSEEK ]', 960, 714, { size:15, align:'center', color:P.ink2 });
      text(c, '从项目证据到面试表达。', 960, 778, { family:SERIF, style:'italic', size:40, align:'center', color:P.ink });
      c.restore();

      const flow = ['SOURCE', 'EVIDENCE', 'REASON', 'REPORT'];
      const total = flow.reduce((sum, item) => sum + measure(c, item, { family:MONO, size:12, weight:700, ls:2 }) + 18, 0) + (flow.length - 1) * 52;
      let fx = 960 - total / 2;
      flow.forEach((item, i) => {
        const on = range(l, 0.8 + i * 0.18, 0.9 + i * 0.18);
        const w = chip(f, item, fx, 830, { size:12, color:on > 0.5 ? P.accent : P.dim, filled:on > 0.5 && i === flow.length - 1, alpha:show });
        fx += w;
        if (i < flow.length - 1) label(f, '→', fx + 18, 850, { size:14, color:on > 0.5 ? P.accent : P.dim, alpha:show });
        fx += 52;
      });
      [['INPUT', 'GITHUB / PDF / MD'], ['TRACE', 'CODEGRAPH · MINERU'], ['OUTPUT', 'STAR · 面试报告'], ['STARS', '★ 5']].forEach(([key, value], i) => {
        const x = 330 + i * 360;
        label(f, key, x, 950, { size:11, alpha:show });
        label(f, value, x, 972, { size:13, color:i === 3 ? P.accent : P.ink2, weight:600, alpha:show, ls:1.4 });
      });
    },

    a2a(L, l, t) {
      const c = L.mid;
      const f = L.front;
      const b = L.back;
      const show = sceneEnvelope(l, 2, 0.25, 0.18);

      b.save();
      b.globalAlpha = show;
      b.lineWidth = 2;
      b.strokeStyle = P.faint;
      b.globalAlpha = show * 0.7;
      setFont(b, { family:DISPLAY, weight:900, size:460, ls:-10 });
      b.textAlign = 'center';
      b.strokeText('A2A', 1200, 700);
      b.restore();

      c.save();
      c.globalAlpha = show;
      label(c, 'SELECTED WORK · 05 / 06', 140, 330, { size:13, color:P.accent, weight:700 });
      text(c, 'a2a_agent', 132, 470, { family:SERIF, style:'italic', size:132, glow:26 });
      text(c, '主 Agent 扫描 AgentCard，', 140, 548, { size:32, color:P.ink2 });
      text(c, '按能力动态路由子任务。', 140, 596, { size:32, color:P.ink2 });
      label(c, 'PYTHON · A2A PROTOCOL · SKILLS', 140, 660, { size:13 });
      text(c, '★ 2', 140, 720, { family:MONO, size:26, weight:700, color:P.accent });
      c.restore();

      const cx = 1250;
      const cy = 540;
      const cam = camera({ pitch:lerp(Math.PI / 2, 0.42, state.mix), yaw:0, cx, cy, scale:330 });
      f.save();
      f.globalAlpha = show;
      f.beginPath();
      for (let i = 0; i <= 96; i += 1) {
        const q = project(orbit(i / 96 * TAU), cam);
        if (i === 0) f.moveTo(q.x, q.y);
        else f.lineTo(q.x, q.y);
      }
      f.strokeStyle = P.line;
      f.lineWidth = 1.2;
      f.setLineDash([4, 8]);
      f.stroke();
      f.setLineDash([]);

      const agents = [['weather_agent.py', '天气'], ['news_agent.py', '新闻']];
      const drawAgent = ({ name, cn, i, q }) => {
        const s = q.s;
        const pop = ease.outBack(range(l, 0.15 + i * 0.12, 0.45 + i * 0.12));
        if (pop <= 0) return;
        const cardW = 220 * s * pop;
        const cardH = 76 * s * pop;
        const packet = (l * 1.3 + i * 0.5) % 1;
        const going = packet < 0.5;
        const k = going ? packet * 2 : (1 - packet) * 2;
        f.strokeStyle = P.dim;
        f.lineWidth = 1;
        f.beginPath();
        f.moveTo(cx, cy);
        f.lineTo(q.x, q.y);
        f.stroke();
        dot(f, lerp(cx, q.x, k), lerp(cy, q.y, k), 5, going ? P.accent : P.ink);
        panel(f, q.x - cardW / 2, q.y - cardH / 2, cardW, cardH, { radius:10 * s, stroke:P.accentDim });
        label(f, name, q.x, q.y - 4 * s, { size:Math.max(9, 14 * s), align:'center', color:P.ink, weight:700, ls:1 });
        label(f, `AgentCard ✓ · ${cn}`, q.x, q.y + 22 * s, { size:Math.max(8, 11 * s), align:'center', ls:1 });
      };
      // 轨道远端的卡片先画，主 agent 压在上面；近端的卡片再盖住主 agent。
      const placed = agents.map(([name, cn], i) => ({ name, cn, i, q:project(orbit(t * 1.1 + i * Math.PI + 0.6), cam) }));
      placed.filter(a => a.q.z > 0).forEach(drawAgent);
      ring(f, cx, cy, 64, P.accent, 2, 26);
      ring(f, cx, cy, 64 + ((l * 1.5) % 1) * 50, P.accentDim, 1.2);
      dot(f, cx, cy, 6, P.accent);
      label(f, 'agent_loop.py', cx, cy + 96, { size:13, align:'center', color:P.ink, weight:700 });
      placed.filter(a => a.q.z <= 0).forEach(drawAgent);

      label(f, 'TASK →', cx - 150, cy - 110, { size:11, color:P.accent });
      label(f, '← RESULT', cx + 90, cy - 110, { size:11 });
      f.restore();
    },

    arch(L, l, t) {
      const c = L.mid;
      const f = L.front;
      const b = L.back;
      const show = sceneEnvelope(l, 2, 0.25, 0.16);

      b.save();
      b.globalAlpha = show;
      const grow = 1 + l * 0.03;
      b.translate(960, 640);
      b.scale(grow, grow);
      setFont(b, { family:DISPLAY, weight:900, size:640, ls:-20 });
      b.textAlign = 'center';
      b.fillStyle = P.faint;
      b.fillText('06', 0, 180);
      b.restore();

      label(c, 'SELECTED WORK · 06 / 06', 960, 330, { size:13, align:'center', color:P.accent, weight:700, alpha:show });
      const word = 'archtools';
      const style = { family:SERIF, style:'italic', size:176, weight:400 };
      let x = 960 - measure(c, word, style) / 2;
      Array.from(word).forEach((ch, i) => {
        const p = ease.outCubic(range(l, 0.05 + i * 0.035, 0.4 + i * 0.035));
        x += text(c, ch, x, 560 + (1 - p) * 30, { ...style, alpha:show * p, glow:24 });
      });
      label(c, '[ SHELL · ARCH LINUX · TUI ]', 960, 626, { size:15, align:'center', color:P.accent, alpha:show });
      text(c, '一个 TUI，统一 Pacman / AUR / Flatpak 三个源', 960, 684, { family:SERIF, size:30, align:'center', color:P.ink2, alpha:show });

      c.save();
      c.globalAlpha = show;
      const cmdX = 700;
      const end = typeRun(c, cmdX, 776, [
        { text:'$ pack neovim', win:TYPING.pack, family:MONO, size:28, weight:600, color:P.ink }
      ], t, { hold:0.4, cursorColor:P.accent });
      let chipX = Math.max(end + 40, 1000);
      ['pacman', 'aur', 'flatpak'].forEach((src, i) => {
        const on = range(t, 23.0 + i * 0.14, 23.08 + i * 0.14);
        chipX += chip(c, src, chipX, 752, { size:12, color:on > 0.5 ? P.accent : P.dim, filled:on > 0.5 && i === 0 }) + 12;
      });
      c.restore();

      [['pack', '安装'], ['pacr', '卸载'], ['pacd', '降级'], ['★ 4', 'STARS']].forEach(([cmd, desc], i) => {
        const x = 520 + i * 260;
        text(f, cmd, x, 950, { family:MONO, size:20, weight:700, color:i === 3 ? P.accent : P.ink, alpha:show });
        label(f, desc, x, 976, { size:11, alpha:show });
      });
    },

    outro(L, l, t) {
      const c = L.mid;
      const f = L.front;
      const b = L.back;
      const end = 1 - range(l, 3.45, 3.95);

      const cam = camera({ yaw:Math.sin(t * 0.5) * (0.2 + state.mix * 0.5), pitch:state.mix * 0.12, cx:1540, cy:470, scale:330 });
      drawCloud(b, GLYPH.points, cam, { t, alpha:end * 0.15 * range(l, 0, 0.6), dotScale:1.1, accentRate:0.02 });

      c.save();
      c.globalAlpha = end;
      const x = 190;
      label(c, 'FULL-STACK DEVELOPER  /  AI AGENT  /  OPEN SOURCE', x, 340, { size:15, color:P.accent, weight:700, ls:4, alpha:range(l, 0.1, 0.4) });
      const nameStyle = { family:DISPLAY, weight:900, size:172, ls:-5 };
      const nameW = text(c, scramble(PROFILE.handle, range(l, 0, 0.55), 41), x, 520, { ...nameStyle, glow:36 });

      const stamp = ease.outBack(range(l, 0.45, 0.75));
      if (stamp > 0) {
        const sx = x + measure(c, PROFILE.handle, nameStyle) + 34;
        const s = lerp(1.6, 1, clamp(stamp));
        c.save();
        c.translate(sx + 36, 450);
        c.scale(s, s);
        c.globalAlpha *= clamp(stamp);
        c.strokeStyle = P.accent;
        c.lineWidth = 2.2;
        c.fillStyle = P.accentFaint;
        c.fillRect(-36, -70, 72, 140);
        c.strokeRect(-36, -70, 72, 140);
        c.restore();
        c.save();
        c.globalAlpha *= clamp(stamp);
        Array.from(PROFILE.seal).forEach((ch, i) => text(c, ch, sx + 36, 418 + i * 62, { family:CJK, size:52, weight:900, color:P.accent, align:'center', base:'middle', glow:14 }));
        c.restore();
      }

      const lineW = ease.inOutCubic(range(l, 0.3, 1.0)) * 1340;
      c.fillStyle = P.line;
      c.fillRect(x, 572, lineW, 1.5);
      for (let i = 0; i <= 10; i += 1) if (i / 10 * 1340 <= lineW) c.fillRect(x + i * 134, 566, 1.5, 12);

      typeRun(c, x, 660, [
        { text:'build agents in ', win:[24.8, 25.25], family:SERIF, style:'italic', size:46, color:P.ink2 },
        { text:'code', win:[25.25, 25.4], family:SERIF, style:'italic', size:46, color:P.accent },
        { text:', play with the ', win:[25.4, 25.85], family:SERIF, style:'italic', size:46, color:P.ink2 },
        { text:'wind', win:[25.85, 26.0], family:SERIF, style:'italic', size:46, color:P.accent },
        { text:'.', win:[26.0, 26.02], family:SERIF, style:'italic', size:46, color:P.ink2 }
      ], t, { hold:1.4 });

      const links = range(l, 1.4, 1.8);
      label(c, 'github.com/tingfeng347', 1730, 760, { size:18, align:'right', color:P.ink, weight:600, ls:1.2, alpha:links });
      label(c, 'tingfeng347.github.io', 1730, 792, { size:14, align:'right', color:P.ink2, ls:1.2, alpha:links });
      [['REPOS', String(PROFILE.repos)], ['STARS', `★ ${PROFILE.stars}`], ['LANG', 'PYTHON / TS / SHELL'], ['PLAYGROUND', 'WINDPLAY · 2026']].forEach(([key, value], i) => {
        const p = range(l, 1.6 + i * 0.1, 1.9 + i * 0.1);
        label(c, key, x + i * 320, 880, { size:11, alpha:p });
        label(c, value, x + i * 320, 906, { size:15, color:i === 1 ? P.accent : P.ink, weight:700, ls:1.6, alpha:p });
      });
      c.restore();

      const wipe = range(l, 3.5, 4);
      if (wipe > 0 && wipe < 1) {
        f.save();
        f.fillStyle = P.accent;
        f.globalAlpha = 0.9;
        f.fillRect(0, 538, W * ease.inOutCubic(wipe), 4);
        f.restore();
      }
    }
  };

  /** 每个场景切入时的短促错帧，离场时轻微拉扯。 */
  function transitionGlitch(info) {
    if (reducedMotion || info.index === 0) return 0;
    const { local } = info;
    const dur = info.scene.dur;
    return (1 - ease.outCubic(range(local, 0, 0.22))) * 0.95 + range(local, dur - 0.1, dur) * 0.5;
  }

  function render() {
    const t = state.t;
    const info = sceneAt(t);
    const base = state.theme;
    P = PALETTES[info.scene.invert ? (base === 'dark' ? 'light' : 'dark') : base];
    const L = layers;
    for (const ctx of Object.values(L)) {
      ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    drawBackground(L.back, t, info);
    Scenes[info.scene.id](L, info.local, t, info);
    const amount = transitionGlitch(info);
    if (amount > 0) {
      glitch(L.mid, amount, Math.floor(t * 30) + info.index * 97);
      if (amount > 0.4) glitch(L.front, amount * 0.6, Math.floor(t * 30) + 7);
    }
    drawHud(L.front, t, info);
    grain(L.front, t);
    state.dirty = false;
  }

  // ── 2D ⇄ 3D 舞台 ───────────────────────────────────────

  function applyStage(now) {
    const m = state.mix;
    const { pointer } = state;
    pointer.sx += (pointer.x - pointer.sx) * 0.06;
    pointer.sy += (pointer.y - pointer.sy) * 0.06;
    const depth = stage.offsetWidth / 1400;
    const swayX = reducedMotion ? 0 : Math.sin(now * 0.00041) * 2.6;
    const swayY = reducedMotion ? 0 : Math.sin(now * 0.00029) * 4.2;
    const rx = (8 - pointer.sy * 10 + swayX) * m;
    const ry = (pointer.sx * 16 + swayY) * m;
    stage.style.transform = `scale(${1 - 0.1 * m}) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`;
    layers.back.canvas.style.transform = `translateZ(${(-180 * depth * m).toFixed(2)}px) scale(${(1 + 0.14 * m).toFixed(4)})`;
    layers.mid.canvas.style.transform = 'translateZ(0)';
    layers.front.canvas.style.transform = `translateZ(${(90 * depth * m).toFixed(2)}px) scale(${(1 - 0.05 * m).toFixed(4)})`;
  }

  // ── 播放器 ─────────────────────────────────────────────

  const audio = new window.ReelAudio();
  const ui = {
    play: document.getElementById('play'),
    scrub: document.getElementById('scrub'),
    marks: document.getElementById('marks'),
    time: document.getElementById('time'),
    chapter: document.getElementById('chapter'),
    sound: document.getElementById('sound'),
    soundLabel: document.getElementById('sound-label'),
    soundHint: document.getElementById('sound-hint'),
    theme: document.getElementById('theme'),
    fullscreen: document.getElementById('fullscreen'),
    dims: [...document.querySelectorAll('[data-dim]')]
  };
  ui.scrub.max = String(Math.round(DURATION * 1000));
  for (const scene of SCENES.slice(1)) {
    const mark = document.createElement('span');
    mark.style.left = `${(scene.start / DURATION) * 100}%`;
    ui.marks.append(mark);
  }

  function seek(t) {
    state.abs = clamp(t, 0, DURATION - 0.001);
    state.t = wrap(state.abs);
    if (audio.active && state.playing) audio.sync(state.abs);
    state.dirty = true;
  }

  function setPlaying(playing) {
    state.playing = playing;
    ui.play.setAttribute('aria-label', playing ? '暂停' : '播放');
    if (playing && audio.active) audio.sync(state.abs);
    if (!playing) audio.stop();
    wake();
  }

  async function setSound(on) {
    ui.soundHint.hidden = true;
    if (on && !audio.supported) return;
    await audio.setEnabled(on, state.abs);
    if (!state.playing) audio.stop();
    ui.sound.setAttribute('aria-pressed', String(on));
    ui.soundLabel.textContent = on ? '声音 开' : '声音 关';
  }

  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
    storage.set('theme', theme);
    ui.theme.setAttribute('aria-label', theme === 'dark' ? '切换到亮色' : '切换到暗色');
    state.dirty = true;
  }

  function setDim(dim) {
    state.dim = dim;
    storage.set('dim', dim);
    for (const button of ui.dims) button.setAttribute('aria-pressed', String(button.dataset.dim === dim));
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  function jumpScene(delta) {
    const { index } = sceneAt(state.t);
    const next = (index + delta + SCENES.length) % SCENES.length;
    seek(SCENES[next].start + 0.001);
  }

  let idleTimer = 0;
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (state.playing && !state.scrubbing) document.body.classList.add('idle');
    }, 2600);
  }

  ui.play.addEventListener('click', () => setPlaying(!state.playing));
  ui.sound.addEventListener('click', () => setSound(ui.sound.getAttribute('aria-pressed') !== 'true'));
  ui.theme.addEventListener('click', () => setTheme(state.theme === 'dark' ? 'light' : 'dark'));
  ui.fullscreen.addEventListener('click', toggleFullscreen);
  for (const button of ui.dims) button.addEventListener('click', () => setDim(button.dataset.dim));

  ui.scrub.addEventListener('input', () => {
    state.scrubbing = true;
    seek(Number(ui.scrub.value) / 1000);
  });
  ui.scrub.addEventListener('change', () => {
    state.scrubbing = false;
    if (audio.active && state.playing) audio.sync(state.abs);
  });

  window.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement && event.key !== ' ') return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    const actions = {
      ' ': () => setPlaying(!state.playing),
      k: () => setPlaying(!state.playing),
      m: () => setSound(ui.sound.getAttribute('aria-pressed') !== 'true'),
      d: () => setDim(state.dim === '3d' ? '2d' : '3d'),
      t: () => setTheme(state.theme === 'dark' ? 'light' : 'dark'),
      f: toggleFullscreen,
      arrowright: () => jumpScene(1),
      arrowleft: () => jumpScene(-1),
      home: () => seek(0)
    };
    if (!actions[key]) return;
    event.preventDefault();
    actions[key]();
    wake();
  });

  window.addEventListener('pointermove', event => {
    state.pointer.x = event.clientX / innerWidth - 0.5;
    state.pointer.y = event.clientY / innerHeight - 0.5;
    wake();
  });
  window.addEventListener('pointerdown', wake);
  prefersDark.addEventListener?.('change', event => {
    if (!storage.get('theme')) setTheme(event.matches ? 'dark' : 'light');
  });
  new ResizeObserver(resize).observe(stage);

  let lastFrame = performance.now();
  let lastUi = '';
  function frame(now) {
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    if (state.playing && !state.scrubbing) {
      state.abs = audio.active ? audio.now() : state.abs + dt;
      state.t = wrap(state.abs);
      audio.update(state.abs);
      state.dirty = true;
    }
    const target = state.dim === '3d' ? 1 : 0;
    if (Math.abs(target - state.mix) > 0.0005) {
      state.mix += (target - state.mix) * (1 - Math.exp(-dt * (reducedMotion ? 30 : 4.5)));
      if (Math.abs(target - state.mix) < 0.0005) state.mix = target;
      state.dirty = true;
    }
    applyStage(now);
    if (state.dirty) render();

    const info = sceneAt(state.t);
    const signature = `${Math.floor(state.t * 10)}|${info.index}`;
    if (signature !== lastUi) {
      lastUi = signature;
      if (!state.scrubbing) ui.scrub.value = String(Math.round(state.t * 1000));
      ui.scrub.style.setProperty('--progress', `${(state.t / DURATION) * 100}%`);
      ui.time.textContent = `${clock(state.t)} / ${clock(DURATION)}`;
      ui.chapter.textContent = info.scene.label;
    }
    requestAnimationFrame(frame);
  }

  setTheme(state.theme);
  setDim(state.dim);
  setPlaying(state.playing);
  if (audio.supported && !params.has('t')) {
    ui.soundHint.hidden = false;
    setTimeout(() => { ui.soundHint.hidden = true; }, 8000);
  }
  resize();
  render();
  requestAnimationFrame(frame);
})();
