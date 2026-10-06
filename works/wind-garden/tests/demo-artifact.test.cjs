const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const scripts = ['core.js', 'audio.js', 'render.js', 'app.js'];

test('独立成品与最新源码一致，不依赖外部资源或未替换标记', async () => {
  const [demo, dist, css, ...sources] = await Promise.all([
    readFile(path.join(root, 'demo/index.html'), 'utf8'),
    readFile(path.join(root, 'dist/index.html'), 'utf8'),
    readFile(path.join(root, 'src/styles.css'), 'utf8'),
    ...scripts.map(name => readFile(path.join(root, 'src', name), 'utf8'))
  ]);
  assert.equal(demo, dist, '跟踪的演示成品必须与最新构建一致');
  assert.doesNotMatch(demo, /__[A-Z0-9_]+__/, '成品不能留有构建占位符');
  assert.doesNotMatch(demo, /<(?:script|link)\b[^>]+(?:src|href)\s*=\s*["'](?!data:)/i,
    '脚本与样式必须内联');
  assert.doesNotMatch(demo, /https?:\/\/[^<\s'"`]+/, '成品不能依赖远程图片、字体、音频或脚本');
  assert.doesNotMatch(css, /@import\s|url\(\s*["']?(?!(?:data:|#))[^)'"\s]+/i,
    '样式不能引用外部文件');
  assert.ok(demo.includes(css), 'styles.css 尚未同步到成品');
  sources.forEach((source, index) => assert.ok(demo.includes(source), `${scripts[index]} 尚未同步到成品`));
  const inlineScripts = [...demo.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(inlineScripts.length, scripts.length, '四个浏览器模块应完整内联');
  inlineScripts.forEach((match, index) => {
    assert.doesNotThrow(() => new vm.Script(match[1], { filename: scripts[index] }), `${scripts[index]} 含语法错误`);
  });
});

test('成品提供可发现的播放、编辑、保存与离线交换入口', async () => {
  const demo = await readFile(path.join(root, 'demo/index.html'), 'utf8');
  for (const id of ['play', 'timbre-bell', 'timbre-reed', 'timbre-pluck', 'tempo', 'volume',
    'selected-plant', 'plant-step', 'plant-row', 'delete-plant', 'undo', 'save', 'export', 'import', 'example', 'clear', 'garden-canvas']) {
    assert.ok(demo.includes(`id="${id}"`), `缺少 ${id} 控件`);
  }
  assert.match(demo, /href="\.\.\/\.\.\/\.\.\/index\.html"/, '独立成品应可以返回作品启动台');
  const canvas = demo.match(/<canvas\b[^>]*>/i)?.[0];
  assert.ok(canvas, '花园画布应存在');
  assert.match(canvas, /id="garden-canvas"/);
  assert.match(canvas, /tabindex="0"/, '花园画布应可以用键盘聚焦');
  assert.match(demo, /aria-live="(?:polite|assertive)"/, '编辑、保存和播放状态应提供可读反馈');
});
