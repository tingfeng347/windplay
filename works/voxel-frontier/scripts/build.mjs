import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SCRIPTS = ['core', 'renderer', 'game'];

/** 把 src 中的样式和脚本内联成单文件成品；浏览器端零依赖、可离线打开。 */
export async function build() {
  const [template, css, ...sources] = await Promise.all([
    readFile(resolve(root, 'src/index.html'), 'utf8'),
    readFile(resolve(root, 'src/styles.css'), 'utf8'),
    ...SCRIPTS.map(name => readFile(resolve(root, `src/${name}.js`), 'utf8'))
  ]);
  let html = template.replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}</style>`);
  SCRIPTS.forEach((name, i) => {
    const tag = `<script src="${name}.js"></script>`;
    if (!html.includes(tag)) throw new Error(`模板缺少 ${tag}`);
    html = html.replace(tag, () => `<script>\n${sources[i]}</script>`);
  });
  if (/__[A-Z0-9_]+__/.test(html)) throw new Error('构建模板仍包含未替换的占位符。');
  await Promise.all([
    mkdir(resolve(root, 'dist'), { recursive:true }),
    mkdir(resolve(root, 'demo'), { recursive:true })
  ]);
  await writeFile(resolve(root, 'dist/index.html'), html);
  await writeFile(resolve(root, 'demo/index.html'), html);
  console.log(`构建完成：${(html.length / 1024).toFixed(1)} KB → demo/index.html`);
  return html;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  build().catch(error => { console.error(error); process.exitCode = 1; });
}
