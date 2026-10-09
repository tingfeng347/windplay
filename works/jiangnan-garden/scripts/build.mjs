import { build as bundle } from 'esbuild';
import {gzipSync} from 'node:zlib';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function build(write = true) {
  const [template, css, result] = await Promise.all([
    readFile(resolve(root, 'src/index.html'), 'utf8'),
    readFile(resolve(root, 'src/styles.css'), 'utf8'),
    bundle({ entryPoints:[resolve(root,'src/app.js')], bundle:true, write:false, format:'iife', target:'es2020', minify:true, legalComments:'inline', loader:{'.jpg':'dataurl','.png':'dataurl','.bin':'dataurl','.hdr':'dataurl'},plugins:[{name:'standalone-gltf',setup(build){build.onLoad({filter:/\.bin$/},async({path})=>({contents:'export default '+JSON.stringify('data:application/gzip;base64,'+gzipSync(await readFile(path),{level:9}).toString('base64'))+';',loader:'js'}));build.onLoad({filter:/\.gltf$/},async({path})=>{const model=JSON.parse(await readFile(path,'utf8'));let source='';for(const [i,entry] of [...model.buffers,...model.images].entries()){source+=`import asset${i} from ${JSON.stringify(resolve(dirname(path),entry.uri))};\n`;entry.uri='';}source+=`const model=${JSON.stringify(model)};\n`;for(const [i] of [...model.buffers,...model.images].entries()){const kind=i<model.buffers.length?'buffers':'images',index=kind==='buffers'?i:i-model.buffers.length;source+=`model.${kind}[${index}].uri=asset${i};\n`;}return {contents:source+'export default model;',loader:'js',resolveDir:dirname(path)};});}}] })
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
