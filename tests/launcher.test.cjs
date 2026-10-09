const assert = require('node:assert/strict');
const { access, readdir, readFile } = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('启动台链接所有公开作品的完整成品', async () => {
  const homepage = await readFile(path.join(root, 'index.html'), 'utf8');
  const entries = await readdir(path.join(root, 'works'), { withFileTypes:true });
  const works = entries.filter(entry => entry.isDirectory() && entry.name !== 'tingfeng-reel').map(entry => entry.name);
  const gallery = homepage.slice(homepage.indexOf('id="hero-art"'), homepage.indexOf('class="catalog"'));

  assert.ok(works.length > 0);
  for (const work of works) {
    const relativeDemo = `works/${work}/demo/index.html`;
    await access(path.join(root, relativeDemo));
    assert.match(homepage, new RegExp(`href=["']${relativeDemo}["']`));
    assert.match(gallery, new RegExp(`href=["']${relativeDemo}["']`), '首屏缩略图画廊必须包含每个作品');
  }
});

test('启动台可以通过文件协议完整加载', async () => {
  const homepage = await readFile(path.join(root, 'index.html'), 'utf8');
  const preview = 'assets/point-cloud-studio-preview.png';

  assert.doesNotMatch(homepage, /(?:href|src)=["']\//, '本地入口必须使用相对路径');
  assert.doesNotMatch(homepage, /__[A-Z0-9_]+__/, '启动台不能含有构建占位符');
  assert.match(homepage, new RegExp(`src=["']${preview}["']`));
  await access(path.join(root, preview));
  const assets = [...homepage.matchAll(/(?:src|href)=["']((?:assets\/[^"']+|scripts\/[^"']+\.js|styles\.css))["']/g)]
    .map(match => match[1]);
  for (const asset of new Set(assets)) await access(path.join(root, asset));
});

 test('Tingfeng Reel 源码保留但不展示，马里奥替换其入口',async()=>{
 const homepage=await readFile(path.join(root,'index.html'),'utf8');
 assert.doesNotMatch(homepage,/tingfeng-reel|Tingfeng Reel/);
 assert.match(homepage,/works\/mario-world\/demo\/index.html/);
 await access(path.join(root,'works/tingfeng-reel/src/index.html'));
 assert.equal((homepage.match(/class="work-card /g)||[]).length,12);
 });
