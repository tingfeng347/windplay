import { access, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '_site');

await rm(output, { recursive:true, force:true });
await mkdir(output, { recursive:true });
await mkdir(resolve(output, 'scripts'), { recursive:true });

await Promise.all([
  cp(resolve(root, 'index.html'), resolve(output, 'index.html')),
  cp(resolve(root, 'styles.css'), resolve(output, 'styles.css')),
  cp(resolve(root, 'scripts/launcher-motion.js'), resolve(output, 'scripts/launcher-motion.js')),
  cp(resolve(root, 'assets'), resolve(output, 'assets'), { recursive:true }),
  writeFile(resolve(output, '.nojekyll'), '')
]);

const entries = await readdir(resolve(root, 'works'), { withFileTypes:true });
let workCount = 0;
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const demo = resolve(root, 'works', entry.name, 'demo');
  try {
    await access(resolve(demo, 'index.html'));
  } catch {
    throw new Error(`作品 ${entry.name} 缺少 demo/index.html`);
  }
  await cp(demo, resolve(output, 'works', entry.name, 'demo'), { recursive:true });
  workCount += 1;
}

const homepage = await readFile(resolve(output, 'index.html'), 'utf8');
if (/__[A-Z0-9_]+__/.test(homepage)) throw new Error('启动台仍包含未替换的占位符。');
if (workCount === 0) throw new Error('启动台至少需要一个作品。');

console.log(`启动台构建完成：${workCount} 个作品 → _site/index.html`);
