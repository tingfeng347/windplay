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
  assert.match(demo, /<div id="preview"><svg\b/, '演示成品必须内嵌示例点云');
  assert.match(demo, /data:image\/jpeg;base64,/, '演示成品必须内嵌示例照片');
  assert.doesNotMatch(demo, /<(?:link|script)\b[^>]+(?:href|src)="(?!data:)/,
    '演示成品不能依赖外部样式或脚本');
});
