/* A field of wind threads carries the gallery. Canvas is optional; every work stays a DOM link. */
(() => {
  'use strict';
  const canvas = document.getElementById('hero-wind');
  const stage = document.getElementById('art-stage');
  if (!canvas || !stage) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  let width = 1;
  let height = 1;
  let visible = false;
  let frame = null;
  let lastTime = null;
  let elapsed = 0;
  let ink = '';
  let accent = '';
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const enabled = () => visible && !document.hidden && !reduced.matches && root.dataset.motion === 'active';

  function palette() {
    const isDark = root.dataset.theme ? root.dataset.theme === 'dark' : dark.matches;
    ink = isDark ? 'rgba(176, 204, 198, 0.14)' : 'rgba(51, 101, 88, 0.13)';
    accent = isDark ? 'rgba(143, 214, 193, 0.62)' : 'rgba(43, 113, 94, 0.48)';
  }

  // The same curve describes threads and their travelling specks, keeping the wind coherent.
  function point(t, lane) {
    const wave = Math.sin(t * Math.PI * 2 + elapsed * 0.16 + lane * 0.075);
    const envelope = Math.sin(t * Math.PI);
    return [t * (width + 100) - 50 + pointer.x * envelope * 20,
      height * (0.49 + wave * 0.21) + (lane - 8) * (7 + envelope * 4)
      + Math.sin(t * Math.PI * 4 - elapsed * 0.12) * 24 + pointer.y * envelope * 34];
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    context.lineWidth = 0.75;
    context.strokeStyle = ink;
    const lanes = width < 700 ? 11 : 18;
    for (let lane = 0; lane < lanes; lane += 1) {
      context.beginPath();
      for (let step = 0; step <= 72; step += 1) {
        const [x, y] = point(step / 72, lane);
        if (step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
    context.fillStyle = accent;
    for (let mote = 0; mote < lanes * 2; mote += 1) {
      const t = (mote * 0.618034 + elapsed * (0.024 + (mote % 3) * 0.005)) % 1;
      const [x, y] = point(t, mote % lanes);
      context.globalAlpha = Math.sin(t * Math.PI) * 0.85;
      context.beginPath();
      context.ellipse(x, y, mote % 3 === 0 ? 2.4 : 1.3, 1.1, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function stop() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
  }

  function sync() {
    if (!enabled()) return stop();
    if (frame === null) frame = window.requestAnimationFrame(tick);
  }

  function tick(time) {
    frame = null;
    if (!enabled()) return stop();
    // Limit canvas painting to 30fps and prevent a time jump after returning to the tab.
    if (lastTime === null || time - lastTime >= 32) {
      const delta = lastTime === null ? 0 : Math.min(time - lastTime, 64);
      lastTime = time;
      elapsed += delta / 1000;
      const ease = 1 - Math.exp(-delta / 180);
      pointer.x += (pointer.targetX - pointer.x) * ease;
      pointer.y += (pointer.targetY - pointer.y) * ease;
      draw();
    }
    sync();
  }

  function resize() {
    width = Math.max(stage.clientWidth, 1);
    height = Math.max(stage.clientHeight, 1);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (!reduced.matches) draw();
    sync();
  }

  stage.addEventListener('pointermove', event => {
    if (!enabled() || !fine.matches || event.pointerType === 'touch') return;
    const box = stage.getBoundingClientRect();
    pointer.targetX = Math.max(-1, Math.min(1, (event.clientX - box.left) / width * 2 - 1));
    pointer.targetY = Math.max(-1, Math.min(1, (event.clientY - box.top) / height * 2 - 1));
  }, { passive: true });
  function recenter() { pointer.targetX = pointer.targetY = 0; }
  stage.addEventListener('pointerleave', recenter, { passive: true });
  fine.addEventListener('change', recenter);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => { resize(); sync(); });
  dark.addEventListener('change', () => { palette(); if (!reduced.matches) draw(); });
  new MutationObserver(() => {
    palette();
    if (root.dataset.motion !== 'active') {
      recenter();
      pointer.x = pointer.y = 0;
    }
    if (!reduced.matches) draw();
    sync();
  }).observe(root, { attributes: true, attributeFilter: ['data-motion', 'data-theme'] });
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    sync();
  }).observe(stage);
  palette();
  resize();
})();
