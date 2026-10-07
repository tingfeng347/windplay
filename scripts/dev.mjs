import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '_site');
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT 必须是 1～65535 的整数。');
}

const mime = {
  '.css':'text/css; charset=utf-8',
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.jpg':'image/jpeg',
  '.png':'image/png',
  '.svg':'image/svg+xml'
};

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405);
    response.end();
    return;
  }

  try {
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    const inside = relative(root, file);
    if (inside.startsWith('..') || isAbsolute(inside)) {
      response.writeHead(403);
      response.end();
      return;
    }

    const bytes = await readFile(file);
    response.writeHead(200, {
      'Content-Type':mime[extname(file)] || 'application/octet-stream',
      'Cache-Control':'no-store',
      'Content-Length':bytes.length
    });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`WindPlay 启动台：http://localhost:${port}（Ctrl+C 停止）`);
});

function cleanup() {
  server.close();
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
