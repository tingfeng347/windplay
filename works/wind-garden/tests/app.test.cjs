'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');

function element() {
  return { value: '', textContent: '', disabled: false, innerHTML: '', style: {}, events: {},
    classList: { toggle() {}, remove() {}, add() {} }, setAttribute() {},
    addEventListener(name, callback) { this.events[name] = callback; }, replaceChildren() {}, add() {},
    matches() { return false; }, focus() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 520 }; },
    setPointerCapture() { this.captured = true; }, hasPointerCapture() { return !!this.captured; },
    releasePointerCapture() { this.captured = false; }
  };
}
function setup() {
  const ids = new Map(), storage = new Map();
  const document = { hidden: false, events: {},
    getElementById(id) { if (!ids.has(id)) ids.set(id, element()); return ids.get(id); },
    querySelectorAll() { return []; }, addEventListener(name, callback) { this.events[name] = callback; }
  };
  const context = {
    document, performance: { now: () => 0 }, Option: function () {}, confirm: () => true,
    matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {},
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    WindGardenRenderer: class {
      constructor(canvas, getState) { this.getState = getState; }
      hitAt() { return this.getState().garden.plants[0]; }
      cellAt() { return { step: 1, row: 0 }; }
      trigger() {}
    },
    WindGardenAudio: class {
      constructor() { this.running = false; this.unavailable = false; this.stops = 0; }
      setVolume() {} stop() { this.running = false; this.stops++; } async preview() {}
    }, setTimeout, clearInterval, setInterval
  };
  vm.createContext(context);
  for (const name of ['core', 'app']) vm.runInContext(fs.readFileSync(path.join(root, 'src', `${name}.js`), 'utf8'), context);
  return { ids, document, context, storage };
}
const pointer = { button: 0, pointerId: 1, clientX: 10, clientY: 10, preventDefault() {} };

for (const action of ['Escape', 'Delete', 'Undo', 'Example', 'Clear', 'Import']) {
  test(`拖动过程中${action}安全取消指针，继续move/up不会留下半次编辑`, async () => {
    const { ids, document, context } = setup(), canvas = ids.get('garden-canvas');
    if (action === 'Undo') { ids.get('tempo').value = '90'; ids.get('tempo').events.input(); ids.get('tempo').events.change(); }
    canvas.events.pointerdown(pointer); canvas.events.pointermove({ ...pointer, clientX: 30 });
    if (action === 'Undo') document.events.keydown({ key: 'z', ctrlKey: true, target: canvas, preventDefault() {} });
    else if (['Example', 'Clear'].includes(action)) ids.get(action.toLowerCase()).events.click();
    else if (action === 'Import') {
      await ids.get('import-file').events.change({ target: { files: [{ size: 100, text: async () => context.WindGardenCore.serializeGarden(context.WindGardenCore.createGarden()) }], value: 'file' } });
    } else canvas.events.keydown({ key: action, preventDefault() {} });
    assert.equal(canvas.hasPointerCapture(), false, '取消操作应释放capture');
    assert.doesNotThrow(() => canvas.events.pointermove({ ...pointer, clientX: 50 }));
    assert.doesNotThrow(() => canvas.events.pointerup({ ...pointer, clientX: 50 }));
    const state = context.WindGarden.inspect();
    assert.equal(state.selected, null);
    assert.equal(state.plants, action === 'Delete' ? 19 : action === 'Clear' ? 0 : 20);
    if (action === 'Undo') assert.equal(state.tempo, 88);
    ids.get('save').events.click();
  });
}

test('拖动过程中保存先恢复完整状态，保存结果与提示一致', () => {
  const { ids, context, storage } = setup(), canvas = ids.get('garden-canvas');
  canvas.events.pointerdown(pointer); canvas.events.pointermove({ ...pointer, clientX: 30 });
  ids.get('save').events.click();
  assert.equal(canvas.hasPointerCapture(), false);
  const saved = context.WindGardenCore.parseGarden(storage.get('windplay.wind-garden.v1'));
  assert.equal(saved.plants[0].step, 0); assert.equal(saved.plants[0].row, 5);
  assert.match(ids.get('message').textContent, /已保存/);
  assert.equal(ids.get('save').textContent, '已保存');
});

test('拖动中用另一控件改变速度或音量，取消拖动仍保留输入值', () => {
  const { ids, context } = setup(), canvas = ids.get('garden-canvas');
  for (const [id, value] of [['tempo', '90'], ['volume', '40']]) {
    canvas.events.pointerdown(pointer); canvas.events.pointermove({ ...pointer, clientX: 30 });
    ids.get(id).value = value; ids.get(id).events.input(); ids.get(id).events.change();
    assert.equal(canvas.hasPointerCapture(), false);
    assert.equal(context.WindGarden.inspect()[id], Number(value) / (id === 'volume' ? 100 : 1));
  }
  assert.equal(context.WindGarden.inspect().selected, 1);
  assert.equal(context.WindGarden.inspect().plants, 20);
});

test('失去焦点或进入后台会取消尚未提交的拖动', () => {
  const { ids, document, context } = setup(), canvas = ids.get('garden-canvas');
  canvas.events.pointerdown(pointer); canvas.events.pointermove({ ...pointer, clientX: 30 }); canvas.events.blur();
  assert.equal(canvas.hasPointerCapture(), false); assert.equal(context.WindGarden.inspect().undoCount, 0);
  canvas.events.pointerdown(pointer); canvas.events.pointermove({ ...pointer, clientX: 30 });
  document.hidden = true; document.events.visibilitychange();
  assert.equal(canvas.hasPointerCapture(), false); assert.equal(context.WindGarden.inspect().undoCount, 0);
});

test('损坏的导入保持当前花园，并给出可读失败原因', async () => {
  const { ids, context } = setup();
  await ids.get('import-file').events.change({ target: { files: [{ size: 20, text: async () => '{broken' }], value: 'file' } });
  assert.equal(context.WindGarden.inspect().plants, 20); assert.equal(context.WindGarden.inspect().undoCount, 0);
  assert.match(ids.get('message').textContent, /导入失败/); assert.match(ids.get('message').textContent, /当前花园已保留/);
});

test('检查接口返回只读快照，无法从快照改变花园', () => {
  const { context } = setup(), state = context.WindGarden.inspect();
  assert.equal(Object.isFrozen(state), true); assert.throws(() => { state.plants = 0; }, TypeError);
  assert.equal(context.WindGarden.inspect().plants, 20); assert.equal(Object.isFrozen(context.WindGarden), true);
});
