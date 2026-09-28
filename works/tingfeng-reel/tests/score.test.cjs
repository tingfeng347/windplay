const assert = require('node:assert/strict');
const test = require('node:test');
const Score = require('../src/score.js');
const { SCENES, DURATION, BEAT } = require('../src/timeline.js');

const { EVENTS, eventsBetween, eventsInRange, section } = Score;

test('事件按时间排序且全部落在一个循环内', () => {
  assert.ok(EVENTS.length > 200);
  for (let i = 1; i < EVENTS.length; i += 1) assert.ok(EVENTS[i].time >= EVENTS[i - 1].time);
  for (const event of EVENTS) assert.ok(event.time >= 0 && event.time < DURATION, `${event.kind}@${event.time}`);
});

test('段落编排：片头无鼓，高潮每拍一个底鼓，结尾停鼓', () => {
  const kicks = (from, to) => eventsBetween(from, to).filter(e => e.kind === 'kick');
  assert.equal(kicks(0, 4).length, 0);
  assert.equal(kicks(8, 24).length, (24 - 8) / BEAT);
  for (const kick of kicks(8, 24)) assert.ok(Math.abs(kick.time / BEAT - Math.round(kick.time / BEAT)) < 1e-6);
  assert.equal(kicks(24, DURATION).length, 0);
  assert.equal(section(0), 'intro');
  assert.equal(section(6), 'drop');
  assert.equal(section(13), 'outro');
});

test('每个场景切入前都有转场风声，大标题落点有冲击音', () => {
  const whooshes = EVENTS.filter(e => e.kind === 'whoosh');
  for (const scene of SCENES.slice(1)) {
    assert.ok(whooshes.some(e => e.time < scene.start && scene.start - e.time < 0.3), `${scene.id} 缺少转场音`);
  }
  const impacts = EVENTS.filter(e => e.kind === 'impact').map(e => e.time);
  assert.ok(impacts.includes(8) && impacts.includes(24));
});

test('打字声出现在打字区间内', () => {
  const types = EVENTS.filter(e => e.kind === 'type');
  assert.ok(types.length > 40);
  assert.ok(types.every(e => e.time >= 0.3 && e.time < 26));
});

test('eventsInRange 跨循环展开并保持连续时钟', () => {
  const from = DURATION - 0.5;
  const to = DURATION + 0.5;
  const events = eventsInRange(from, to);
  assert.ok(events.length > 0);
  assert.ok(events.every(({ at }) => at >= from && at < to));
  const wrapped = events.filter(({ at }) => at >= DURATION);
  assert.deepEqual(wrapped.map(({ event }) => event), eventsBetween(0, 0.5));
  assert.deepEqual(eventsInRange(3, 3), []);
  assert.equal(eventsInRange(0, DURATION * 2).length, EVENTS.length * 2);
});
