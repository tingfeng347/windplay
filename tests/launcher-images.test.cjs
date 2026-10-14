const assert = require('node:assert/strict');
const { readFile, stat, access } = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');

test('首屏图片总量不超过 300 KiB，单图不超过 40 KiB', async () => {
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const hero = html.slice(html.indexOf('id="hero-art"'), html.indexOf('class="catalog"'));
  const images = [...hero.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/g)];
  let total = 0;
  for (const [, src] of images) {
    const { size } = await stat(path.join(root, src));
    total += size;
    assert.ok(size <= 40 * 1024, `${src}: ${size} bytes exceeds thumbnail budget`);
  }
  assert.equal(images.length, 12);
  assert.ok(total <= 300 * 1024, `${total} bytes exceeds hero budget`);
});

test('原图、派生图片和页面引用一致，所有候选尺寸均可离线加载', async () => {
  const { createHash } = require('node:crypto');
  const sharp = require('sharp');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const manifest = JSON.parse(await readFile(path.join(root, 'assets/launcher/manifest.json'), 'utf8'));
  for (const [source, entry] of Object.entries(manifest.sources)) {
    assert.equal(hash(await readFile(path.join(root, source))), entry.sha256, `原图 ${source} 已变化，请运行 npm run build:images`);
    for (const variant of entry.variants) {
      const bytes = await readFile(path.join(root, variant.file));
      assert.equal(hash(bytes), variant.sha256, `${variant.file} 已变化，请重新生成`);
      assert.ok(variant.file.endsWith(`-${hash(bytes).slice(0, 10)}.webp`), '图片内容变化后必须更新缓存地址');
      assert.equal(bytes.length, variant.bytes);
      const metadata = await sharp(bytes).metadata();
      assert.equal(metadata.width, variant.width);
      assert.equal(metadata.height, variant.height);
      assert.equal(metadata.format, 'webp');
      assert.ok(bytes.length < 180 * 1024, `${variant.file} exceeds preview budget`);
    }
  }
  let count = 0;
  for (const [tag, source] of html.matchAll(/<img\b[^>]*data-image-source="([^"]+)"[^>]*>/g)) {
    count++;
    const entry = manifest.sources[source];
    assert.ok(entry, `Missing source ${source}`);
    assert.match(tag, new RegExp(`width="${entry.width}"`));
    assert.match(tag, new RegExp(`height="${entry.height}"`));
    const src = tag.match(/\ssrc="([^"]+)"/)[1];
    assert.ok(entry.variants.some(v => v.file === src));
    const candidates = tag.match(/(?:data-preview-)?srcset="([^"]+)"/)[1];
    for (const candidate of candidates.split(', ')) {
      const [file, width] = candidate.split(' ');
      await access(path.join(root, file));
      assert.ok(entry.variants.some(v => v.file === file && `${v.width}w` === width));
    }
    if (tag.includes('data-image-role="preview"')) {
      assert.doesNotMatch(tag, /\ssrcset=/, '未浏览的展廊必须只加载小图');
      assert.match(tag, /loading="lazy"/);
    }
  }
  assert.equal(count, 24);
});

function imageHarness({ mode = 'active' } = {}) {
  const vm = require('node:vm');
  const fs = require('node:fs');
  const images = Array.from({ length: 12 }, (_, index) => ({
    src: `small-${index}.webp`, dataset: { previewSrcset: `large-${index}.webp 1280w` }
  }));
  const catalog = { dataset: { motion: mode } };
  const grid = { querySelectorAll: () => images };
  const observers = [];
  const mutations = [];
  const requests = [];
  const events = new Map();
  const document = { hidden: false,
    querySelector: selector => selector === '.catalog' ? catalog : grid,
    addEventListener: (name, fn) => events.set(name, fn)
  };
  class Observer {
    constructor(fn) { this.callback = fn; observers.push(this); }
    observe() {}
  }
  vm.runInNewContext(fs.readFileSync(path.join(root, 'scripts/launcher-images.js'), 'utf8'), {
    document, window: { IntersectionObserver: Observer }, IntersectionObserver: Observer,
    MutationObserver: class { constructor(fn) { mutations.push(fn); } observe() {} },
    Image: class {
      constructor() { requests.push(this); }
      decode() { return new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; }); }
    }
  });
  return { images, requests, document,
    near(value) { observers[0].callback([{ isIntersecting: value }]); },
    visible(indices) { observers[1].callback(images.map((image, index) => ({ target: image, isIntersecting: indices.includes(index) }))); },
    seek(index) { events.get('windplay:previewchange')({ detail: index }); },
    mode(value) { catalog.dataset.motion = value; mutations.forEach(fn => fn()); },
    hidden(value) { document.hidden = value; events.get('visibilitychange')(); }
  };
}

test('展廊仅升级当前和相邻作品，重复事件不重复请求', async () => {
  const app = imageHarness();
  app.visible([0, 1, 2, 3, 4, 5]);
  assert.equal(app.requests.length, 0, '首屏不下载大图');
  app.near(true);
  assert.equal(app.requests.length, 2);
  app.requests.forEach(request => request.resolve());
  await Promise.resolve();
  assert.equal(app.images[0].dataset.imageState, 'ready');
  assert.equal(app.images[2].srcset, undefined);
  app.seek(5);
  assert.equal(app.requests.length, 5);
  assert.deepEqual(app.requests.slice(2).map(request => request.src), ['small-5.webp', 'small-6.webp', 'small-4.webp']);
  app.seek(5);
  app.seek(99);
  assert.equal(app.requests.length, 5);
});

test('后台不发起升级请求，大图失败时保留缩略图', async () => {
  const app = imageHarness();
  app.hidden(true);
  app.near(true);
  assert.equal(app.requests.length, 0);
  app.hidden(false);
  app.requests[0].reject(new Error('Offline'));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(app.images[0].src, 'small-0.webp');
  assert.equal(app.images[0].srcset, undefined);
  assert.equal(app.images[0].dataset.imageState, 'fallback');
});

test('减少动态模式只升级可见卡片，暂停模式仍可浏览相邻作品', async () => {
  const app = imageHarness({ mode: 'reduced' });
  app.near(true);
  assert.equal(app.requests.length, 0);
  app.visible([3]);
  assert.equal(app.requests.length, 1);
  app.requests[0].resolve();
  await Promise.resolve();
  assert.match(app.images[3].sizes, /584px/);
  app.visible([]);
  app.mode('paused');
  assert.match(app.images[3].sizes, /1000px/);
  assert.equal(app.requests.length, 3);
  app.seek(11);
  assert.equal(app.requests.length, 5);
});

test('SVG 封面字形不依赖发布机器安装的字体', async () => {
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const sources = new Set([...html.matchAll(/data-image-source="([^"]+\.svg)"/g)].map(match => match[1]));
  for (const source of sources) {
    const svg = await readFile(path.join(root, source), 'utf8');
    assert.doesNotMatch(svg, /<text\b/, `${source} 的文字应转为路径，避免 Linux 构建缺少中文字库时输出方框`);
  }
});
