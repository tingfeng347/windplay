import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { resolve, relative, extname, isAbsolute } from 'node:path';
import { build, root } from './build.mjs';

await build();
const publicRoot = resolve(root, 'dist');
const port = Number(process.env.PORT || 5179);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 必须是 1～65535 的整数。');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8' };
const server = createServer(async (request, response) => {
  if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  try {
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(publicRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
    const inside = relative(publicRoot, file);
    if (inside.startsWith('..') || isAbsolute(inside)) { response.writeHead(403); response.end(); return; }
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type':mime[extname(file)] || 'application/octet-stream',
      'Cache-Control':'no-store', 'Content-Length':bytes.length });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { response.writeHead(404); response.end('Not found'); }
});

let timer, building = false, dirty = false;
async function rebuild() {
  if (building) { dirty = true; return; }
  building = true;
  try { await build(); console.log('请刷新浏览器查看修改。'); }
  catch (error) { console.error('构建失败：', error.message); }
  finally { building = false; if (dirty) { dirty = false; await rebuild(); } }
}
const watchers = ['src'].map(directory => watch(resolve(root, directory), () => {
  clearTimeout(timer); timer = setTimeout(rebuild, 160);
}));
server.on('error', error => { console.error(error.message); cleanup(); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`开发地址：http://localhost:${port}（Ctrl+C 停止）`));
function cleanup() { clearTimeout(timer); watchers.forEach(w => w.close()); server.close(); }
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
