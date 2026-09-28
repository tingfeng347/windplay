const assert = require('node:assert/strict');
const test = require('node:test');
const Timeline = require('../src/timeline.js');

const { SCENES, DURATION, TYPING, BAR, sceneAt, timecode, clock, typed, scramble, rng, wrap } = Timeline;

test('场景首尾相接、落在小节线上，并覆盖整条片子', () => {
  assert.equal(SCENES[0].start, 0);
  for (let i = 1; i < SCENES.length; i += 1) {
    assert.equal(SCENES[i].start, SCENES[i - 1].start + SCENES[i - 1].dur, `${SCENES[i].id} 与上一场景之间有空隙`);
  }
  for (const scene of SCENES) assert.equal(scene.start % BAR, 0, `${scene.id} 没有对齐小节线`);
  assert.equal(DURATION, 28);
  assert.equal(new Set(SCENES.map(scene => scene.id)).size, SCENES.length);
});

test('sceneAt 返回正确场景和局部时间，并随循环回绕', () => {
  assert.equal(sceneAt(0).scene.id, 'intro');
  assert.equal(sceneAt(8).scene.id, 'identity');
  assert.equal(sceneAt(7.999).scene.id, 'agent');
  const flash = sceneAt(16.5);
  assert.equal(flash.scene.id, 'workbench');
  assert.ok(flash.scene.invert);
  assert.ok(Math.abs(flash.local - 0.5) < 1e-9);
  assert.equal(sceneAt(DURATION + 9).scene.id, 'identity');
  assert.equal(sceneAt(-1).scene.id, 'outro');
  assert.equal(wrap(DURATION), 0);
});

test('时间码与播放时钟格式', () => {
  assert.equal(timecode(0), '00:00:00:00');
  assert.equal(timecode(9.5), '00:00:09:15');
  assert.equal(timecode(61 + 29 / 30), '00:01:01:29');
  assert.equal(clock(27.9), '00:27');
});

test('打字窗口有序且落在片长之内', () => {
  for (const [name, [start, end]] of Object.entries(TYPING)) {
    assert.ok(start < end, `${name} 区间为空`);
    assert.ok(start >= 0 && end <= DURATION, `${name} 超出片长`);
  }
});

test('typed 按码点截取，中文不会被截断', () => {
  const window = [0, 1];
  assert.equal(typed('听风', 0.5, window), '听');
  assert.equal(typed('听风', 1, window), '听风');
  assert.equal(typed('abc', -1, window), '');
});

test('scramble 可重复并最终还原为原文', () => {
  assert.equal(scramble('TINGFENG', 1, 3), 'TINGFENG');
  assert.equal(scramble('TINGFENG', 0.4, 3), scramble('TINGFENG', 0.4, 3));
  assert.equal(scramble('A B', 0.5, 1)[1], ' ');
  assert.equal(scramble('ABC', 0, 1).trim(), '');
});

test('随机数发生器可复现', () => {
  const a = rng(42), b = rng(42);
  for (let i = 0; i < 5; i += 1) assert.equal(a(), b());
});
