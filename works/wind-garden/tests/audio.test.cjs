const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function harness({ unavailable = false, resume } = {}) {
  let wallTime = 0, created = 0, intervalId = 0;
  const intervals = new Map(), events = [], errors = [], oscillators = [], interruptions = [];
  class Param {
    constructor() { this.value = 0; this.calls = []; }
    setValueAtTime(...args) { this.calls.push(['set', ...args]); }
    setTargetAtTime(...args) { this.calls.push(['target', ...args]); }
    linearRampToValueAtTime(...args) { this.calls.push(['linear', ...args]); }
    exponentialRampToValueAtTime(...args) { this.calls.push(['exponential', ...args]); }
    cancelScheduledValues(...args) { this.calls.push(['cancel', ...args]); }
  }
  class Node {
    connect() {} disconnect() {}
    addEventListener(name, fn) { this[name] = fn; }
  }
  class FakeAudioContext extends Node {
    constructor() { super(); created++; this.state = resume ? 'suspended' : 'running'; this.currentTime = 0; this.destination = {}; }
    async resume() { if (resume) await resume(this); else this.state = 'running'; }
    createGain() { const node = new Node(); node.gain = new Param(); return node; }
    createDynamicsCompressor() { const node = new Node(); node.threshold = new Param(); node.ratio = new Param(); return node; }
    createOscillator() {
      const node = new Node(); node.frequency = new Param(); node.starts = []; node.stops = [];
      node.start = time => node.starts.push(time); node.stop = time => node.stops.push(time);
      oscillators.push(node); return node;
    }
  }
  const context = vm.createContext({
    AudioContext: unavailable ? undefined : FakeAudioContext,
    performance: { now: () => wallTime * 1000 }, document: { hidden: false },
    setInterval(fn) { intervals.set(++intervalId, fn); return intervalId; },
    clearInterval(id) { intervals.delete(id); }
  });
  for (const file of ['core', 'audio']) vm.runInContext(fs.readFileSync(path.resolve(__dirname, `../src/${file}.js`), 'utf8'), context);
  let garden = context.WindGardenCore.validateGarden({ version: 1, tempo: 120, volume: .65, nextId: 3,
    plants: [{ id: 1, step: 0, row: 5, timbre: 'bell' }, { id: 2, step: 1, row: 4, timbre: 'pluck' }] });
  const audio = new context.WindGardenAudio({ getGarden: () => garden, onStep: event => events.push(event),
    onError: error => errors.push(error.message), onInterrupted: () => interruptions.push(true) });
  return { audio, events, errors, oscillators, interruptions, intervals, context,
    get created() { return created; },
    setGarden(next) { garden = { ...garden, ...next }; },
    advance(time) { wallTime = time; if (audio.context) audio.context.currentTime = time; audio.tick(); }
  };
}

test('音频仅在用户启动后建立，声音按音频时钟预排，画面在对应时刻触发', async () => {
  const h = harness(); assert.equal(h.created, 0); assert.equal(h.audio.running, false);
  assert.equal(await h.audio.start(), true); assert.equal(h.created, 1); assert.equal(h.intervals.size, 1);
  assert.equal(h.oscillators.length, 3, '风铃由三层正弦部分音构成');
  assert.equal(h.oscillators[0].starts[0], .055); assert.equal(h.events.length, 0);
  h.advance(.06); assert.equal(h.events.length, 1); assert.equal(h.events[0].step, 0);
  assert.deepEqual(Array.from(h.events[0].ids), [1]);
  h.advance(.24); assert.equal(h.oscillators.length, 5, '第二拍拨弦有两层部分音'); assert.equal(h.events.length, 1);
  h.advance(.31); assert.equal(h.events[1].step, 1); assert.equal(h.events[1].duration, .25);
  assert.deepEqual(Array.from(h.events[1].ids), [2]);
});

test('十六步回环，改变速度影响未来的半拍而不会重启旋律', async () => {
  const h = harness(); await h.audio.start();
  for (let time = 0; time < 4.3; time += .025) h.advance(time);
  assert.deepEqual(h.events.slice(0, 17).map(event => event.step), [...Array(16).keys(), 0]);
  const before = h.events.length;
  h.setGarden({ tempo: 60 });
  for (let time = 4.3; time < 5.6; time += .025) h.advance(time);
  assert.ok(h.events.slice(before).some(event => event.duration === .5));
  assert.equal(h.created, 1);
});

test('暂停清理时钟与预排画面，截断所有仍在发声的音符', async () => {
  const h = harness(); await h.audio.start(); h.advance(.24);
  assert.ok(h.audio.visualEvents.length); assert.ok(h.audio.voices.size);
  h.audio.stop(); assert.equal(h.audio.running, false); assert.equal(h.intervals.size, 0); assert.equal(h.audio.visualEvents.length, 0);
  assert.ok(h.oscillators.every(osc => osc.stops.length === 2));
  const count = h.events.length; h.advance(3); assert.equal(h.events.length, count);
});

test('音频不可用时报告原因，并用可视时钟继续经过植物', async () => {
  const h = harness({ unavailable: true }); assert.equal(await h.audio.start(), false);
  assert.equal(h.audio.unavailable, true); assert.equal(h.audio.running, true); assert.equal(h.errors.length, 1);
  assert.match(h.errors[0], /Web Audio/); h.advance(.06); assert.equal(h.events[0].step, 0);
  h.audio.stop(); assert.equal(h.intervals.size, 0);
});

test('浏览器意外中断音频会停下调度并通知界面', async () => {
  const h = harness(); await h.audio.start();
  h.audio.context.state = 'suspended'; h.audio.context.statechange();
  assert.equal(h.audio.running, false); assert.equal(h.intervals.size, 0); assert.equal(h.interruptions.length, 1);
});

test('音频唤醒期间暂停，不会在唤醒完成后重新演奏或后台试听', async () => {
  let release;
  const h = harness({ resume: async ctx => { await new Promise(resolve => { release = resolve; }); ctx.state = 'running'; } });
  const started = h.audio.start(); h.audio.stop(); release(); await started;
  assert.equal(h.audio.running, false); assert.equal(h.intervals.size, 0); assert.equal(h.oscillators.length, 0);
  h.context.document.hidden = true;
  await h.audio.preview({ id: 1, row: 5, timbre: 'bell' }); assert.equal(h.oscillators.length, 0);
});

test('长时间阻塞后跳过错过的半拍，不会一次发出积压的旋律', async () => {
  const h = harness(); await h.audio.start();
  const before = h.oscillators.length; h.advance(30);
  assert.ok(h.oscillators.length - before <= 3); assert.ok(h.audio.nextTime >= 30);
  assert.ok(h.audio.visualEvents.every(event => event.time >= 30));
});
