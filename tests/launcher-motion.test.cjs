const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../scripts/launcher-motion.js'), 'utf8');

function eventTarget(value = {}) {
  const listeners = new Map();
  return Object.assign(value, {
    listeners,
    addEventListener(name, callback, options) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push({ callback, options });
    },
    emit(name, event = {}) {
      for (const listener of [...listeners.get(name) || []]) {
        listener.callback(event);
        if (listener.options?.once) listeners.set(name,
          listeners.get(name).filter(candidate => candidate !== listener));
      }
    }
  });
}

function harness({ reduced = false, fine = true, button = true, heroPresent = true } = {}) {
  let sequence = 0;
  let time = 0;
  let reads = 0;
  let heroTop = 100;
  let heroHeight = 1100;
  const frames = new Map();
  const fonts = [];
  const win = eventTarget({ scrollY: 0, innerHeight: 720 });
  const element = geometry => {
    const values = new Map();
    const classes = new Set();
    const attributes = new Map();
    return eventTarget({
      values, attributes, dataset: {}, disabled: false, hidden: true, textContent: '',
      style: { setProperty(name, value) { values.set(name, value); } },
      classList: {
        add(name) { classes.add(name); },
        toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }
      },
      setAttribute(name, value) {
        attributes.set(name, value);
        if (name.startsWith('data-')) this.dataset[name.slice(5)] = value;
      },
      getBoundingClientRect() { reads += 1; return geometry(); }
    });
  };
  const hero = element(() => ({ top: heroTop - win.scrollY,
    height: hero.dataset.motion === 'reduced' ? 620 : heroHeight, left: 0, width: 1200 }));
  const stage = element(() => ({ top: Math.max(heroTop - win.scrollY, 20),
    left: 100, width: 1000, height: 620 }));
  const previews = [1400, 2200].map(top => element(() => ({
    top: top - win.scrollY, left: 100, width: 800, height: 400
  })));
  const toggle = element(() => ({ top: 0, left: 0, width: 100, height: 44 }));
  const progressLine = element(() => ({ top: 0, left: 0, width: 0, height: 0 }));
  const reducedQuery = eventTarget({ matches: reduced });
  const fineQuery = eventTarget({ matches: fine });
  const doc = eventTarget({ hidden: false, documentElement: element(() => ({})),
    fonts: { ready: { then(callback) { fonts.push(callback); } } },
    getElementById(id) {
      return id === 'hero-art' ? (heroPresent ? hero : null) : id === 'art-stage' ? stage
        : id === 'motion-toggle' ? (button ? toggle : null) : null;
    },
    querySelector: () => progressLine,
    querySelectorAll: () => previews
  });
  Object.assign(win, {
    matchMedia: query => query.includes('reduced-motion') ? reducedQuery : fineQuery,
    getComputedStyle() { reads += 1; return { position: 'sticky', top: '20px' }; },
    requestAnimationFrame(callback) { frames.set(++sequence, callback); return sequence; },
    cancelAnimationFrame(id) { frames.delete(id); }
  });
  vm.runInNewContext(source, { window: win, document: doc });
  return {
    win, doc, hero, stage, previews, toggle, progressLine, reducedQuery, fineQuery, frames,
    number(node, name) { return parseFloat(node.values.get(name)); },
    step() {
      time += 1000 / 60;
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(time);
    },
    settle(limit = 150) {
      let count = 0;
      while (frames.size && count < limit) { this.step(); count += 1; }
      assert.equal(frames.size, 0, `Animation did not settle in ${limit} frames`);
      return count;
    },
    scroll(y) { win.scrollY = y; win.emit('scroll'); },
    reduce(matches) { reducedQuery.matches = matches; reducedQuery.emit('change'); },
    resize(top, height, viewport) {
      heroTop = top;
      heroHeight = height;
      win.innerHeight = viewport;
      win.emit('resize');
    },
    readyFonts() { fonts.forEach(callback => callback()); },
    get reads() { return reads; }
  };
}

test('scroll unfolds the eight-screen score, then stops without reading layout each frame', () => {
  const app = harness();
  app.settle();
  const reads = app.reads;
  assert.equal(app.toggle.hidden, false, 'The working pause control must be exposed');
  app.scroll(470);
  app.settle();
  const expected = (470 - 100 + 720 * 0.12) / (1100 - 720 * 0.5);
  assert.ok(Math.abs(app.number(app.hero, '--progress') - expected) < 0.00001);
  assert.ok(Math.abs(app.number(app.progressLine, 'stroke-dashoffset') - (1 - expected)) < 0.00001);
  assert.equal(app.reads, reads, 'Scroll/rAF must use cached geometry');
  assert.equal(app.hero.attributes.get('data-moving'), 'false');
  assert.equal(app.win.listeners.get('scroll')[0].options.passive, true);
});

test('scroll reversals interrupt smoothly, clamp progress and decay the signed impulse', () => {
  const app = harness();
  app.settle();
  app.scroll(500);
  app.step();
  assert.ok(app.number(app.hero, '--velocity') > 0);
  const between = app.number(app.hero, '--progress');
  assert.ok(between > 0 && between < 1);
  app.scroll(-100);
  app.step();
  assert.ok(app.number(app.hero, '--progress') < between);
  assert.ok(Math.abs(app.number(app.hero, '--velocity')) <= 1);
  app.settle();
  assert.equal(app.number(app.hero, '--progress'), 0);
  assert.equal(app.number(app.hero, '--velocity'), 0);
  app.scroll(100000);
  app.settle();
  assert.equal(app.number(app.hero, '--progress'), 1);
});

test('pause freezes the pose and runway while every nonessential response stops', () => {
  const app = harness();
  app.scroll(400);
  app.settle();
  app.stage.emit('pointermove', { pointerType: 'mouse', clientX: 1100, clientY: 20 });
  app.step();
  const pose = app.number(app.hero, '--progress');
  app.toggle.emit('click');
  assert.equal(app.hero.dataset.motion, 'paused');
  assert.equal(app.number(app.hero, '--progress'), pose);
  assert.equal(app.number(app.hero, '--pointer-x'), 0);
  assert.equal(app.number(app.hero, '--velocity'), 0);
  assert.equal(app.toggle.attributes.get('aria-pressed'), 'true');
  assert.equal(app.toggle.textContent, '开启动效');
  app.scroll(900);
  app.stage.emit('pointermove', { pointerType: 'mouse', clientX: 200, clientY: 200 });
  assert.equal(app.frames.size, 0);
  assert.equal(app.number(app.hero, '--progress'), pose);
  app.toggle.emit('click');
  app.settle();
  assert.equal(app.hero.dataset.motion, 'active');
  assert.equal(app.number(app.hero, '--progress'), 1);
  assert.equal(app.toggle.textContent, '暂停动效');
});

test('reduced motion is static and preference changes preserve a manual pause', () => {
  const app = harness({ reduced: true });
  assert.equal(app.hero.dataset.motion, 'reduced');
  assert.equal(app.frames.size, 0);
  assert.equal(app.number(app.hero, '--progress'), 0);
  assert.equal(app.toggle.disabled, true);
  assert.equal(app.toggle.textContent, '已减少动态');
  app.scroll(500);
  app.stage.emit('pointermove', { pointerType: 'mouse', clientX: 1100, clientY: 20 });
  assert.equal(app.frames.size, 0);
  app.reduce(false);
  app.settle();
  const pose = app.number(app.hero, '--progress');
  assert.ok(pose > 0);
  app.toggle.emit('click');
  app.reduce(true);
  assert.equal(app.number(app.hero, '--progress'), 0);
  app.reduce(false);
  assert.equal(app.hero.dataset.motion, 'paused');
  assert.equal(app.number(app.hero, '--progress'), pose);
  assert.equal(app.frames.size, 0);
});

test('hidden tabs cancel queued frames and refresh dimensions when shown', () => {
  const app = harness();
  app.scroll(500);
  assert.ok(app.frames.size > 0);
  app.doc.hidden = true;
  app.doc.emit('visibilitychange');
  assert.equal(app.frames.size, 0);
  const reads = app.reads;
  app.resize(200, 1500, 900);
  app.scroll(700);
  assert.equal(app.frames.size, 0);
  assert.equal(app.reads, reads);
  app.doc.hidden = false;
  app.doc.emit('visibilitychange');
  app.settle();
  const expected = (700 - 200 + 900 * 0.12) / (1500 - 900 * 0.5);
  assert.ok(Math.abs(app.number(app.hero, '--progress') - expected) < 0.00001);
  assert.ok(app.reads > reads);
});

test('only a fine pointer tilts the stage and leaving recenters it within bounded frames', () => {
  const app = harness({ fine: false });
  app.settle();
  app.stage.emit('pointermove', { pointerType: 'mouse', clientX: 10000, clientY: -10000 });
  assert.equal(app.frames.size, 0);
  app.fineQuery.matches = true;
  app.fineQuery.emit('change');
  app.settle();
  app.stage.emit('pointermove', { pointerType: 'touch', clientX: 10000, clientY: -10000 });
  assert.equal(app.frames.size, 0);
  app.stage.emit('pointermove', { pointerType: 'mouse', clientX: 10000, clientY: -10000 });
  app.settle();
  assert.equal(app.number(app.hero, '--pointer-x'), 0.5);
  assert.equal(app.number(app.hero, '--pointer-y'), -0.5);
  app.stage.emit('pointerleave');
  app.settle();
  assert.equal(app.number(app.hero, '--pointer-x'), 0);
  assert.equal(app.number(app.hero, '--pointer-y'), 0);
});

test('only visible preview covers move, and geometry refreshes after fonts or resize', () => {
  const app = harness();
  app.settle();
  assert.equal(app.number(app.previews[0], '--image-shift'), 0);
  app.scroll(1300);
  app.settle();
  assert.ok(Math.abs(app.number(app.previews[0], '--image-shift')) <= 20);
  assert.notEqual(app.number(app.previews[0], '--image-shift'), 0);
  assert.equal(app.number(app.previews[1], '--image-shift'), 0);
  const reads = app.reads;
  app.readyFonts();
  app.settle();
  assert.ok(app.reads > reads);
  app.scroll(2200);
  app.settle();
  assert.equal(app.number(app.previews[0], '--image-shift'), 0);
  assert.ok(Math.abs(app.number(app.previews[1], '--image-shift')) <= 20);
});

test('optional controls and absent surfaces do not prevent ordinary navigation', () => {
  const app = harness({ button: false });
  app.scroll(400);
  app.settle();
  assert.ok(app.number(app.hero, '--progress') > 0);
  const absent = harness({ heroPresent: false });
  assert.equal(absent.frames.size, 0);
  assert.equal(absent.reads, 0);
});
