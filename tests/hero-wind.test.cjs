const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../scripts/hero-wind.js'), 'utf8');

function harness({ reduced = false, available = true } = {}) {
  const target = value => Object.assign(value, {
    listeners: {},
    addEventListener(name, callback) { this.listeners[name] = callback; },
    emit(name, event) { this.listeners[name]?.(event); }
  });
  let paints = 0;
  let observer;
  let mutation;
  let sequence = 0;
  const frames = new Map();
  const context = new Proxy({}, { get: (_, name) => name === 'clearRect' ? () => paints++ : () => {}, set: () => true });
  const canvas = { getContext: () => available ? context : null };
  const stage = target({ clientWidth: 1200, clientHeight: 620 });
  const root = { dataset: { motion: 'active', theme: 'light' } };
  const query = target({ matches: reduced });
  const document = target({ hidden: false, documentElement: root,
    getElementById: id => id === 'hero-wind' ? canvas : stage });
  const window = { devicePixelRatio: 3,
    matchMedia: q => q.includes('reduced-motion') ? query : target({ matches: false }),
    requestAnimationFrame(callback) { frames.set(++sequence, callback); return sequence; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  vm.runInNewContext(source, { window, document,
    ResizeObserver: class { observe() {} },
    IntersectionObserver: class { constructor(callback) { observer = callback; } observe() {} },
    MutationObserver: class { constructor(callback) { mutation = callback; } observe() {} }
  });
  return { canvas, document, root, query, frames,
    get paints() { return paints; },
    visible(value) { observer([{ isIntersecting: value }]); },
    mode(value) { root.dataset.motion = value; mutation(); },
    step(time) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); }
  };
}

test('wind only animates onscreen, suspends in hidden tabs, and caps canvas resolution', () => {
  const app = harness();
  assert.equal(app.frames.size, 0);
  assert.equal(app.canvas.width, 1800);
  app.visible(true);
  app.step(0);
  const first = app.paints;
  app.step(16);
  assert.equal(app.paints, first, 'Skip paints between 30fps intervals');
  app.step(34);
  assert.equal(app.paints, first + 1);
  app.visible(false);
  assert.equal(app.frames.size, 0);
  app.visible(true);
  app.document.hidden = true;
  app.document.emit('visibilitychange');
  assert.equal(app.frames.size, 0);
  app.document.hidden = false;
  app.document.emit('visibilitychange');
  assert.equal(app.frames.size, 1);
});

test('pause and reduced motion stop wind, with no duplicate loops when resumed', () => {
  const app = harness();
  app.visible(true);
  app.mode('paused');
  assert.equal(app.frames.size, 0);
  app.mode('active');
  app.visible(true);
  assert.equal(app.frames.size, 1);
  app.query.matches = true;
  app.query.emit('change');
  assert.equal(app.frames.size, 0);
  app.query.matches = false;
  app.query.emit('change');
  assert.equal(app.frames.size, 1);
  const reduced = harness({ reduced: true });
  reduced.visible(true);
  assert.equal(reduced.frames.size, 0);
  assert.equal(reduced.paints, 0);
});

test('unavailable canvas leaves normal page navigation untouched', () => {
  const app = harness({ available: false });
  assert.equal(app.frames.size, 0);
  assert.equal(app.paints, 0);
});
