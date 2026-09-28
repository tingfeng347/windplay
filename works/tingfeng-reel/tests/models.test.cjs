const assert = require('node:assert/strict');
const test = require('node:test');
const { project, glyphCloud, boxBlur, sphere, orbit, AGENT_GRAPH } = require('../src/models.js');

const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-9, `${message}: ${a} ≠ ${b}`);

test('persp=0 时是正交投影：深度不影响屏幕位置', () => {
  const camera = { persp:0, cx:100, cy:50, scale:10 };
  const near = project({ x:1, y:2, z:-0.8 }, camera);
  const far = project({ x:1, y:2, z:0.8 }, camera);
  close(near.x, far.x, 'x');
  close(near.y, far.y, 'y');
  close(near.x, 110, 'x 平移缩放');
  close(near.s, 1, '缩放系数');
});

test('persp=1 时近大远小', () => {
  const camera = { persp:1, dist:3 };
  assert.ok(project({ x:1, y:0, z:-1 }, camera).s > project({ x:1, y:0, z:1 }, camera).s);
});

test('yaw 旋转 90° 把 x 轴转到深度方向', () => {
  const q = project({ x:1, y:0, z:0 }, { yaw:Math.PI / 2, persp:0 });
  close(q.x, 0, 'x');
  close(q.z, -1, 'z');
});

test('pitch=π/2 时轨道从正上方看是圆', () => {
  const camera = { pitch:Math.PI / 2, persp:0, scale:1 };
  for (let i = 0; i < 8; i += 1) {
    const q = project(orbit(i / 8 * Math.PI * 2), camera);
    close(Math.hypot(q.x, q.y), 1, `点 ${i} 半径`);
  }
});

test('glyphCloud 只在蒙版内采样，笔画中心更厚', () => {
  const size = 40;
  const mask = new Uint8Array(size * size);
  for (let y = 10; y < 30; y += 1) for (let x = 10; x < 30; x += 1) mask[y * size + x] = 255;
  const points = glyphCloud(mask, size, size, { step:2, radius:3 });
  assert.ok(points.length > 0);
  for (const p of points) {
    assert.ok(Math.abs(p.x) <= 0.5 + 1e-9 && Math.abs(p.y) <= 0.5 + 1e-9, '点落在方块内');
  }
  const center = points.filter(p => Math.abs(p.x) < 0.1 && Math.abs(p.y) < 0.1 && p.layer === 0);
  const edge = points.filter(p => p.x < -0.45 && p.layer === 0);
  assert.ok(Math.min(...center.map(p => p.v)) > Math.max(...edge.map(p => p.v)));
  assert.ok(points.some(p => p.layer === 1), '中心区域有背面层');
});

test('boxBlur 保持总量近似不变', () => {
  const input = new Float32Array(100);
  input[55] = 1;
  const output = boxBlur(input, 10, 10, 1);
  assert.ok(Math.abs(output.reduce((sum, v) => sum + v, 0) - 1) < 1e-6, '总量');
});

test('sphere 生成单位球面点', () => {
  const points = sphere(50);
  assert.equal(points.length, 50);
  for (const p of points) close(Math.hypot(p.x, p.y, p.z), 1, '半径');
});

test('编排图的边都指向存在的节点', () => {
  const ids = new Set(AGENT_GRAPH.nodes.map(node => node.id));
  for (const [from, to] of AGENT_GRAPH.edges) assert.ok(ids.has(from) && ids.has(to));
});
