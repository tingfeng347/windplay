const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../src/core.js'), 'utf8'), context);
const C = context.WindGardenCore;
const plain = value => JSON.parse(JSON.stringify(value));
const emptyGarden = () => C.validateGarden({
  version: 1, tempo: 88, volume: .65, plants: [], nextId: 1
});
const snapshot = value => JSON.stringify(value);

test('示例花园可立即演奏，植物编号唯一，音阶从高到低', () => {
  assert.equal(C.VERSION, 1);
  assert.equal(C.STEPS, 16);
  assert.equal(C.ROWS, 9);
  assert.equal(C.MAX_PLANTS, 48);
  assert.deepEqual(plain(C.TIMBRES), ['bell', 'reed', 'pluck']);
  const garden = C.createGarden();
  assert.equal(garden.tempo, 88);
  assert.equal(garden.volume, .65);
  assert.equal(garden.plants.length, 20);
  assert.equal(new Set(garden.plants.map(plant => plant.id)).size, 20);
  assert.ok(garden.nextId > Math.max(...garden.plants.map(plant => plant.id)));
  assert.deepEqual(plain(C.validateGarden(garden)), plain(garden));
  assert.equal(C.PITCHES.length, C.ROWS);
  assert.ok(C.PITCHES.every((pitch, row) => typeof pitch.name === 'string' &&
    Number.isInteger(pitch.midi) && (!row || pitch.midi < C.PITCHES[row - 1].midi)));
});

test('种植、移动、移除生成独立状态，原存档和旧植物不被修改', () => {
  const start = emptyGarden(), original = snapshot(start);
  const planted = C.addPlant(start, { step: 3, row: 5, timbre: 'bell' });
  assert.notEqual(planted, start);
  assert.equal(snapshot(start), original);
  assert.equal(planted.plants.length, 1);
  const plant = planted.plants[0], plantedSnapshot = snapshot(planted);
  assert.equal(plant.id, start.nextId);
  assert.equal(planted.nextId, start.nextId + 1);
  const moved = C.movePlant(planted, plant.id, { step: 11, row: 1 });
  assert.equal(snapshot(planted), plantedSnapshot);
  assert.deepEqual(plain(moved.plants[0]), { id: plant.id, step: 11, row: 1, timbre: 'bell' });
  assert.notEqual(moved.plants[0], plant);
  const movedSnapshot = snapshot(moved);
  const removed = C.removePlant(moved, plant.id);
  assert.equal(snapshot(moved), movedSnapshot);
  assert.equal(removed.plants.length, 0);
  assert.equal(removed.nextId, moved.nextId, '删除不复用旧编号');
});

test('同格不同音色形成和弦，同格同音色不重复，移动冲突不丢失植物', () => {
  let garden = C.addPlant(emptyGarden(), { step: 2, row: 4, timbre: 'bell' });
  assert.equal(C.addPlant(garden, { step: 2, row: 4, timbre: 'bell' }), garden);
  garden = C.addPlant(garden, { step: 2, row: 4, timbre: 'reed' });
  garden = C.addPlant(garden, { step: 7, row: 1, timbre: 'bell' });
  assert.equal(garden.plants.length, 3);
  const mover = garden.plants[2];
  assert.equal(C.movePlant(garden, mover.id, { step: 2, row: 4 }), garden);
  assert.equal(C.movePlant(garden, mover.id, { step: 7, row: 1 }), garden);
  assert.equal(C.movePlant(garden, 999, { step: 2, row: 4 }), garden);
  assert.equal(C.removePlant(garden, 999), garden);
  assert.equal(garden.plants.length, 3);
});

test('满园拒绝第 49 株，移除后可以继续种植，重复种植不占容量', () => {
  let garden = emptyGarden();
  for (let index = 0; index < C.MAX_PLANTS; index += 1) {
    garden = C.addPlant(garden, { step: index % C.STEPS, row: Math.floor(index / C.STEPS), timbre: 'bell' });
  }
  const before = snapshot(garden);
  assert.throws(() => C.addPlant(garden, { step: 0, row: 8, timbre: 'pluck' }));
  assert.equal(snapshot(garden), before);
  assert.equal(C.addPlant(garden, { step: 0, row: 0, timbre: 'bell' }), garden);
  garden = C.removePlant(garden, garden.plants[0].id);
  garden = C.addPlant(garden, { step: 0, row: 8, timbre: 'pluck' });
  assert.equal(garden.plants.length, C.MAX_PLANTS);
});

test('同一步的演奏事件按编号排序，不改变存档顺序', () => {
  const garden = C.validateGarden({ version: 1, tempo: 88, volume: .65, nextId: 10, plants: [
    { id: 9, step: 4, row: 2, timbre: 'bell' },
    { id: 2, step: 4, row: 6, timbre: 'reed' },
    { id: 5, step: 8, row: 4, timbre: 'pluck' }
  ] });
  const before = snapshot(garden);
  assert.deepEqual(plain(C.eventsAtStep(garden, 4)).map(plant => plant.id), [2, 9]);
  assert.deepEqual(plain(C.eventsAtStep(garden, 0)), []);
  assert.equal(snapshot(garden), before);
  for (const step of [-1, 16, 1.5, NaN, '4']) assert.throws(() => C.eventsAtStep(garden, step));
});

test('16 步组成八拍循环，A4 为 440Hz，高行声音更高', () => {
  assert.equal(C.stepDuration(120), .25);
  assert.ok(Math.abs(C.stepDuration(88) * C.STEPS - 8 * 60 / 88) < 1e-12);
  const a4 = C.PITCHES.findIndex(pitch => pitch.midi === 69);
  assert.ok(a4 >= 0);
  assert.equal(C.frequencyForRow(a4), 440);
  for (let row = 1; row < C.ROWS; row += 1) {
    assert.ok(C.frequencyForRow(row) < C.frequencyForRow(row - 1));
  }
  for (const tempo of [0, 47, 145, NaN, Infinity, '88']) assert.throws(() => C.stepDuration(tempo));
  for (const row of [-1, 9, 1.5, NaN, '2']) assert.throws(() => C.frequencyForRow(row));
  assert.ok(C.stepDuration(48) > C.stepDuration(144));
});

test('画布坐标映射九行十六列，边缘与越界拖动钳制到最近格', () => {
  const position = (x, y) => plain(C.coordinateToCell({ x, y, width: 1600, height: 900 }));
  assert.deepEqual(position(0, 0), { step: 0, row: 0 });
  assert.deepEqual(position(450, 650), { step: 4, row: 6 });
  assert.deepEqual(position(100, 100), { step: 1, row: 1 });
  assert.deepEqual(position(1600, 900), { step: 15, row: 8 });
  assert.deepEqual(position(-30, 1800), { step: 0, row: 8 });
  assert.deepEqual(position(1800, -30), { step: 15, row: 0 });
  for (const data of [
    { x: 1, y: 1, width: 0, height: 900 }, { x: 1, y: 1, width: 1600, height: -1 },
    { x: NaN, y: 1, width: 1600, height: 900 }, { x: 1, y: Infinity, width: 1600, height: 900 },
    { x: '1', y: 1, width: 1600, height: 900 }
  ]) assert.throws(() => C.coordinateToCell(data));
});

test('非法种植与移动位置被拒绝，不留下部分编辑', () => {
  const garden = C.createGarden(), before = snapshot(garden);
  for (const value of [
    { step: -1, row: 0, timbre: 'bell' }, { step: 16, row: 0, timbre: 'bell' },
    { step: 0, row: 9, timbre: 'bell' }, { step: 0, row: .5, timbre: 'bell' },
    { step: '0', row: 0, timbre: 'bell' }, { step: 0, row: 0, timbre: 'unknown' },
    null
  ]) assert.throws(() => C.addPlant(garden, value));
  assert.throws(() => C.movePlant(garden, garden.plants[0].id, { step: 0, row: 9 }));
  assert.equal(snapshot(garden), before);
});

test('JSON 往返保留完整乐谱，清洗额外字段，并恢复安全的下一个编号', () => {
  const value = plain(C.createGarden());
  value.tempo = 108;
  value.volume = .4;
  value.extra = '不应进入花园';
  value.plants[0].active = true;
  value.nextId = 1;
  const before = snapshot(value), clean = C.validateGarden(value);
  assert.equal(snapshot(value), before);
  assert.equal(clean.nextId, Math.max(...clean.plants.map(plant => plant.id)) + 1);
  assert.equal(Object.hasOwn(clean, 'extra'), false);
  assert.equal(Object.hasOwn(clean.plants[0], 'active'), false);
  assert.notEqual(clean.plants, value.plants);
  assert.notEqual(clean.plants[0], value.plants[0]);
  const text = C.serializeGarden(clean);
  assert.match(text, /\n  "version": 1,/);
  assert.deepEqual(plain(C.parseGarden(text)), plain(clean));
  const loaded = C.addPlant(C.parseGarden(text), { step: 15, row: 0, timbre: 'reed' });
  assert.equal(loaded.plants.at(-1).id, clean.nextId);
});

test('损坏、越界、重复和超量存档均被拒绝，边界音量与速度可导入', () => {
  const valid = plain(C.createGarden());
  for (const change of [
    value => { value.version = 2; }, value => { value.tempo = '88'; },
    value => { value.tempo = 47; }, value => { value.tempo = 145; },
    value => { value.volume = -1; }, value => { value.volume = 1.01; },
    value => { value.plants = {}; }, value => { value.plants[0].step = 16; },
    value => { value.plants[0].row = -1; }, value => { value.plants[0].row = 1.5; },
    value => { value.plants[0].timbre = 'piano'; }, value => { value.plants[0].id = 0; },
    value => { value.plants[0].id = 1000000; },
    value => { value.plants[1].id = value.plants[0].id; },
    value => { value.plants.push({ ...value.plants[0], id: 90 }); },
    value => { value.plants = Array.from({ length: 49 }, (_, index) => ({ id: index + 1, step: index % 16, row: Math.floor(index / 16), timbre: 'bell' })); }
  ]) {
    const value = structuredClone(valid);
    change(value);
    assert.throws(() => C.parseGarden(JSON.stringify(value)));
  }
  for (const text of ['{bad json', 'null', '[]', '"garden"', ' '.repeat(50001), null]) {
    assert.throws(() => C.parseGarden(text));
  }
  for (const [tempo, volume] of [[48, 0], [144, 1]]) {
    assert.equal(C.validateGarden({ ...valid, tempo, volume }).tempo, tempo);
  }
});
