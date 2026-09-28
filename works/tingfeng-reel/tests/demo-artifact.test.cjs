const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('demo/index.html 是已构建且可独立打开的完整成品', async () => {
  const [demo, dist] = await Promise.all([
    readFile(path.join(root, 'demo/index.html'), 'utf8'),
    readFile(path.join(root, 'dist/index.html'), 'utf8')
  ]);

  assert.equal(demo, dist, '提交的演示成品必须与最新构建结果一致');
  assert.doesNotMatch(demo, /__[A-Z0-9_]+__/, '演示成品不能含有构建占位符');
  assert.doesNotMatch(demo, /<(?:link|script)\b[^>]+(?:href|src)="(?!data:)/,
    '演示成品不能依赖外部样式或脚本');
  for (const name of ['Timeline', 'Score', 'Models', 'ReelAudio']) assert.match(demo, new RegExp(`root\\.${name} = `));
});

test('成品内嵌所有源码，且与 src 保持一致', async () => {
  const demo = await readFile(path.join(root, 'demo/index.html'), 'utf8');
  for (const name of ['styles.css', 'timeline.js', 'score.js', 'models.js', 'audio.js', 'reel.js']) {
    const source = await readFile(path.join(root, 'src', name), 'utf8');
    assert.ok(demo.includes(source), `demo 未包含最新的 src/${name}`);
  }
});

test('播放器提供声音、维度、主题与返回启动台控件', async () => {
  const demo = await readFile(path.join(root, 'demo/index.html'), 'utf8');
  assert.match(demo, /id="sound"[^>]*aria-pressed="false"/, '声音默认关闭，由用户开启');
  assert.match(demo, /data-dim="2d"/);
  assert.match(demo, /data-dim="3d"/);
  assert.match(demo, /id="theme"/);
  assert.match(demo, /href="\.\.\/\.\.\/\.\.\/index\.html"/);
});
