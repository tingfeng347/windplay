/**
 * 时间线 · 零依赖
 * 场景表、打字窗口、时间码与缓动；画面和配乐共用同一份时间定义。
 * 浏览器用 window.Timeline；Node.js 用 require('./timeline.js')。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Timeline = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const BPM = 120;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const FPS = 30;

  // 每个场景都落在小节线上，配乐的鼓点和转场因此天然对齐。
  const SCENES = Object.freeze([
    { id:'intro',     label:'INTRO',          start:0,  dur:4 },
    { id:'agent',     label:'CODING AGENT',   start:4,  dur:4 },
    { id:'identity',  label:'IDENTITY',       start:8,  dur:4 },
    { id:'rag',       label:'RAG · SUPPORT',  start:12, dur:2 },
    { id:'graph',     label:'ORCHESTRATION',  start:14, dur:2 },
    { id:'workbench', label:'WORKBENCH',      start:16, dur:2, invert:true },
    { id:'career',    label:'EVIDENCE',       start:18, dur:2 },
    { id:'a2a',       label:'A2A PROTOCOL',   start:20, dur:2 },
    { id:'arch',      label:'TERMINAL',       start:22, dur:2 },
    { id:'outro',     label:'OUTRO',          start:24, dur:4 }
  ].map(scene => Object.freeze(scene)));

  const DURATION = SCENES[SCENES.length - 1].start + SCENES[SCENES.length - 1].dur;

  /** 绝对时间（秒）上的打字区间；配乐在这些区间里生成键盘声。 */
  const TYPING = Object.freeze({
    introA:  Object.freeze([0.30, 1.15]),
    introB:  Object.freeze([1.15, 1.45]),
    introC:  Object.freeze([1.60, 2.20]),
    introD:  Object.freeze([2.20, 2.45]),
    command: Object.freeze([4.20, 5.00]),
    confirm: Object.freeze([6.40, 6.50]),
    answer:  Object.freeze([13.00, 13.60]),
    career:  Object.freeze([18.25, 19.00]),
    pack:    Object.freeze([22.35, 22.90]),
    outro:   Object.freeze([24.80, 26.00])
  });

  const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
  const lerp = (a, b, p) => a + (b - a) * p;
  /** t 在 [a, b] 内的线性进度，区间外夹到 0 或 1。 */
  const range = (t, a, b) => b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a));
  const wrap = t => ((t % DURATION) + DURATION) % DURATION;

  const ease = Object.freeze({
    outCubic: p => 1 - Math.pow(1 - p, 3),
    inCubic: p => p * p * p,
    inOutCubic: p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
    outExpo: p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p),
    outBack: p => { const c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  });

  function sceneIndexAt(t) {
    const time = wrap(t);
    for (let i = SCENES.length - 1; i >= 0; i -= 1) if (time >= SCENES[i].start) return i;
    return 0;
  }

  function sceneAt(t) {
    const time = wrap(t);
    const index = sceneIndexAt(time);
    const scene = SCENES[index];
    const local = time - scene.start;
    return { index, scene, local, progress: local / scene.dur };
  }

  /** 广播式时间码 HH:MM:SS:FF。 */
  function timecode(t, fps = FPS) {
    const total = Math.floor(Math.max(0, t) * fps + 1e-6);
    const seconds = Math.floor(total / fps);
    return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60, total % fps]
      .map(n => String(n).padStart(2, '0')).join(':');
  }

  /** 播放器用的 MM:SS。 */
  function clock(t) {
    const seconds = Math.floor(Math.max(0, t) + 1e-6);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  /** mulberry32：同一种子总是得到同一串数，画面可以任意拖动回放。 */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let r = Math.imul(a ^ (a >>> 15), 1 | a);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  const hash = n => rng(Math.floor(n * 7919) ^ 0x9E3779B9)();

  /** 按区间进度截取文本；按码点切分，中文不会被截成半个字。 */
  function typed(text, t, window) {
    const chars = Array.from(text);
    return chars.slice(0, Math.round(range(t, window[0], window[1]) * chars.length)).join('');
  }

  const GLYPHS = '#%&*+=<>/\\|01ABCDEFGHKLMNPRSTUVWXYZ';

  /** 从左到右解码：未揭示的位置显示随机字符，空格保持不变。 */
  function scramble(text, p, seed = 1) {
    const chars = Array.from(text);
    const revealed = Math.floor(clamp(p) * (chars.length + 3));
    const frame = Math.floor(p * 36);
    return chars.map((ch, i) => {
      if (ch === ' ' || i < revealed - 3) return ch;
      if (i >= revealed) return p <= 0 ? ' ' : (hash(seed * 131 + i * 17 + frame) < 0.35 ? ' ' : GLYPHS[Math.floor(hash(seed + i * 7 + frame * 3) * GLYPHS.length)]);
      return GLYPHS[Math.floor(hash(seed * 3 + i + frame) * GLYPHS.length)];
    }).join('');
  }

  return Object.freeze({
    BPM, BEAT, BAR, FPS, SCENES, DURATION, TYPING,
    clamp, lerp, range, wrap, ease, sceneIndexAt, sceneAt, timecode, clock, rng, hash, typed, scramble
  });
});
