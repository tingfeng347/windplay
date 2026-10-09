import { build as bundle } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function build(write = true) {
  const [template, css, result] = await Promise.all([
    readFile(resolve(root, 'src/index.html'), 'utf8'),
    readFile(resolve(root, 'src/styles.css'), 'utf8'),
    bundle({ entryPoints:[resolve(root,'src/app.js')], bundle:true, write:false, format:'iife', target:'es2020', minify:true, legalComments:'inline' })
  ]);
  const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const html = template.replace('<link rel="stylesheet" href="styles.css">', () => `<style>${css}</style>`)
    .replace('<script type="module" src="app.js"></script>', () => `<script>${script}</script>`);
  if (/__[A-Z0-9_]+__/.test(html.replace(/__THREE(?:_DEVTOOLS)?__/g,''))) throw new Error('Unresolved build token');
  if (write) for (const dir of ['demo','dist']) {
    await mkdir(resolve(root,dir),{recursive:true});
    await writeFile(resolve(root,dir,'index.html'),html);
  }
  return html;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const html = await build(); console.log(`Built ${root}: ${(html.length/1024).toFixed(0)} KB`);
}
