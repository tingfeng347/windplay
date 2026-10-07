/* The eight screens share one scroll score; work links remain usable without it. */
(() => {
  'use strict';

  const hero = document.getElementById('hero-art');
  const stage = document.getElementById('art-stage');
  if (!hero || !stage) return;

  const toggle = document.getElementById('motion-toggle');
  const progressLine = document.querySelector('.art-progress');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const previews = [...document.querySelectorAll('.preview-image')].map(element => ({
    element, top: 0, height: 0, visible: false, current: 0, target: 0, reveal: 1
  }));
  const current = { progress: 0, x: 0, y: 0, velocity: 0 };
  const target = { ...current };
  const written = new WeakMap();
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const enabled = () => !paused && !reduceMotion.matches;

  let paused = false;
  let previousMode = '';
  let rememberedProgress = 0;
  let metrics = null;
  let frameId = null;
  let lastFrame = null;
  let lastScroll = window.scrollY || 0;
  let needsMeasure = false;

  function property(element, name, value) {
    let values = written.get(element);
    if (!values) written.set(element, values = new Map());
    if (values.get(name) === value) return;
    values.set(name, value);
    element.style.setProperty(name, value);
  }

  function render() {
    property(hero, '--progress', current.progress.toFixed(5));
    property(hero, '--pointer-x', current.x.toFixed(5));
    property(hero, '--pointer-y', current.y.toFixed(5));
    property(hero, '--velocity', current.velocity.toFixed(5));
    if (progressLine) property(progressLine, 'stroke-dashoffset', (1 - current.progress).toFixed(5));
    for (const preview of previews) {
      property(preview.element, '--image-shift', `${preview.current.toFixed(2)}px`);
      property(preview.element, '--reveal', preview.reveal.toFixed(5));
    }
  }

  // Reads are grouped here. Scroll and animation frames use these cached dimensions.
  function measure() {
    const scroll = window.scrollY || 0;
    const heroBox = hero.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    const stageStyle = window.getComputedStyle(stage);
    metrics = {
      top: heroBox.top + scroll,
      height: heroBox.height,
      viewport: Math.max(window.innerHeight, 1),
      stageLeft: stageBox.left,
      stageWidth: Math.max(stageBox.width, 1),
      stageHeight: Math.max(stageBox.height, 1),
      stageTop: stageBox.top + scroll,
      sticky: stageStyle.position === 'sticky',
      stickyTop: parseFloat(stageStyle.top) || 0
    };
    for (const preview of previews) {
      const box = preview.element.getBoundingClientRect();
      preview.top = box.top + scroll;
      preview.height = box.height;
    }
    lastScroll = scroll;
    needsMeasure = false;
    updateTargets(0);
  }

  function updateTargets(delta) {
    if (!metrics || !enabled()) return;
    const scroll = window.scrollY || 0;
    const viewport = metrics.viewport;
    target.progress = clamp((scroll - metrics.top + viewport * 0.12)
      / Math.max(metrics.height - viewport * 0.5, 1), 0, 1);
    const heroVisible = metrics.top < scroll + viewport && metrics.top + metrics.height > scroll;
    if (delta && heroVisible) target.velocity = clamp(delta / (viewport * 0.14), -1, 1);
    if (!heroVisible) target.x = target.y = target.velocity = 0;
    for (const preview of previews) {
      preview.visible = preview.top < scroll + viewport && preview.top + preview.height > scroll;
      const center = preview.top - scroll + preview.height / 2;
      preview.target = preview.visible ? clamp((viewport / 2 - center) / viewport, -1, 1) * 20 : 0;
      preview.reveal = preview.visible ? clamp(1 - Math.abs(center - viewport / 2)
        / (viewport / 2 + preview.height / 2), 0, 1) : 0;
    }
  }

  function moving(value) {
    hero.setAttribute('data-moving', String(value));
    for (const preview of previews) preview.element.classList.toggle('is-moving', value && preview.visible);
  }

  function cancel() {
    if (frameId !== null) window.cancelAnimationFrame(frameId);
    frameId = null;
    lastFrame = null;
    moving(false);
  }

  function schedule() {
    if (!enabled() || document.hidden || frameId !== null) return;
    moving(true);
    frameId = window.requestAnimationFrame(tick);
  }

  function approach(value, destination, amount, epsilon) {
    const next = value + (destination - value) * amount;
    return Math.abs(next - destination) < epsilon ? destination : next;
  }

  function tick(time) {
    frameId = null;
    if (!enabled() || document.hidden) return cancel();
    if (needsMeasure) measure();
    const elapsed = lastFrame === null ? 1000 / 60 : clamp(time - lastFrame, 1, 64);
    lastFrame = time;
    const ease = 1 - Math.exp(-elapsed / 95);
    target.velocity *= Math.exp(-elapsed / 140);
    if (Math.abs(target.velocity) < 0.0005) target.velocity = 0;
    current.progress = approach(current.progress, target.progress, ease, 0.0005);
    current.x = approach(current.x, target.x, ease, 0.0005);
    current.y = approach(current.y, target.y, ease, 0.0005);
    current.velocity = approach(current.velocity, target.velocity, ease, 0.0005);
    let unfinished = current.progress !== target.progress || current.x !== target.x
      || current.y !== target.y || current.velocity !== 0 || target.velocity !== 0;
    for (const preview of previews) {
      // Offscreen covers never keep an animation alive.
      preview.current = preview.visible ? approach(preview.current, preview.target, ease, 0.025) : 0;
      unfinished ||= preview.current !== preview.target;
    }
    render();
    if (unfinished) schedule();
    else {
      lastFrame = null;
      moving(false);
    }
  }

  function updateButton() {
    if (!toggle) return;
    toggle.hidden = false;
    const stopped = paused || reduceMotion.matches;
    toggle.setAttribute('aria-pressed', String(stopped));
    toggle.textContent = reduceMotion.matches ? '已减少动态' : paused ? '开启动效' : '暂停动效';
    toggle.disabled = reduceMotion.matches;
    toggle.title = reduceMotion.matches ? '系统已开启减弱动态效果' : '';
  }

  function updateMode() {
    const mode = reduceMotion.matches ? 'reduced' : paused ? 'paused' : 'active';
    cancel();
    if (mode === 'reduced' && previousMode !== 'reduced') rememberedProgress = current.progress;
    if (previousMode === 'reduced' && mode === 'paused') current.progress = rememberedProgress;
    hero.setAttribute('data-motion', mode);
    document.documentElement.classList.add('motion-ready');
    current.x = current.y = current.velocity = target.x = target.y = target.velocity = 0;
    if (mode === 'reduced') current.progress = 0;
    target.progress = current.progress;
    for (const preview of previews) {
      preview.current = preview.target = 0;
      preview.reveal = 1;
    }
    previousMode = mode;
    // A mode changes the runway height, so measure after its attribute is applied.
    measure();
    updateButton();
    render();
    if (enabled()) schedule();
  }

  function invalidateGeometry() {
    needsMeasure = true;
    if (document.hidden) return;
    if (enabled()) schedule();
    else measure();
  }

  window.addEventListener('scroll', () => {
    const scroll = window.scrollY || 0;
    const delta = scroll - lastScroll;
    lastScroll = scroll;
    updateTargets(delta);
    if (enabled()) schedule();
  }, { passive: true });
  window.addEventListener('resize', invalidateGeometry, { passive: true });
  window.addEventListener('load', invalidateGeometry, { once: true });
  document.fonts?.ready.then(invalidateGeometry);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancel();
    else invalidateGeometry();
  });
  stage.addEventListener('pointermove', event => {
    if (!enabled() || !finePointer.matches || event.pointerType === 'touch' || !metrics) return;
    const scroll = window.scrollY || 0;
    const top = metrics.sticky ? Math.min(Math.max(metrics.top - scroll, metrics.stickyTop),
      metrics.top + metrics.height - scroll - metrics.stageHeight) : metrics.stageTop - scroll;
    target.x = clamp((event.clientX - metrics.stageLeft) / metrics.stageWidth - 0.5, -0.5, 0.5);
    target.y = clamp((event.clientY - top) / metrics.stageHeight - 0.5, -0.5, 0.5);
    schedule();
  }, { passive: true });
  stage.addEventListener('pointerleave', () => {
    target.x = target.y = 0;
    schedule();
  }, { passive: true });
  finePointer.addEventListener('change', () => {
    target.x = target.y = 0;
    schedule();
  });
  reduceMotion.addEventListener('change', updateMode);
  if (toggle) toggle.addEventListener('click', () => {
    if (reduceMotion.matches) return;
    paused = !paused;
    updateMode();
  });
  updateMode();
})();
