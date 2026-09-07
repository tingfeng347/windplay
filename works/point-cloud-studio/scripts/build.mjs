import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

/** 从 src 和示例照片重建全部成品；浏览器端始终零依赖。 */
export async function build() {
  const [template, css, editor, halftoneSource, cloudSource, photo] = await Promise.all([
    readFile(resolve(root, 'src/index.html'), 'utf8'),
    readFile(resolve(root, 'src/styles.css'), 'utf8'),
    readFile(resolve(root, 'src/editor.js'), 'utf8'),
    readFile(resolve(root, 'src/halftone.js'), 'utf8'),
    readFile(resolve(root, 'src/point-cloud.js'), 'utf8'),
    readFile(resolve(root, 'assets/sample-portrait.jpg'))
  ]);
  // dev 模式下源码会变化，因此每次构建重新载入算法模块。
  for (const name of ['halftone', 'point-cloud']) delete require.cache[require.resolve(`../src/${name}.js`)];
  const Halftone = require('../src/halftone.js');
  const PointCloud = require('../src/point-cloud.js');
  const { data, info } = await sharp(photo).rotate()
    .resize({ width:1200, height:1200, fit:'inside', withoutEnlargement:true })
    .ensureAlpha().raw().toBuffer({ resolveWithObject:true });
  const model = Halftone.fromPixels(data, info.width, info.height);
  const staticSvg = Halftone.toSVG(model, { interactive:false });
  const app = editor.replace('__SAMPLE_DATA__', 'data:image/jpeg;base64,' + photo.toString('base64'));
  const html = template
    .replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}</style>`)
    .replace('__INITIAL_SVG__', () => staticSvg)
    .replace('<script src="halftone.js"></script>', () => `<script>\n${halftoneSource}</script>`)
    .replace('<script src="point-cloud.js"></script>', () => `<script>\n${cloudSource}</script>`)
    .replace('<script src="editor.js"></script>', () => `<script>\n${app}</script>`);
  if (/__[A-Z_]+__/.test(html)) throw new Error('构建模板仍包含未替换的占位符。');
  const png = await sharp(Buffer.from(staticSvg), { density:144 }).png().toBuffer();
  await Promise.all([
    mkdir(resolve(root, 'dist'), { recursive:true }),
    mkdir(resolve(root, 'demo'), { recursive:true })
  ]);
  await writeFile(resolve(root, 'dist/index.html'), html);
  await writeFile(resolve(root, 'demo/index.html'), html);
  await writeFile(resolve(root, 'dist/test-point-cloud.html'), PointCloud.toHTML(model));
  await writeFile(resolve(root, 'dist/test-portrait.svg'), Halftone.toSVG(model));
  await writeFile(resolve(root, 'dist/test-portrait.png'), png);
  await copyFile(resolve(root, 'src/halftone.js'), resolve(root, 'dist/halftone.js'));
  await copyFile(resolve(root, 'src/point-cloud.js'), resolve(root, 'dist/point-cloud.js'));
  console.log(`构建完成：${model.dots.length} 个彩色圆点 → demo/index.html`);
  return model;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  build().catch(error => { console.error(error); process.exitCode = 1; });
}
