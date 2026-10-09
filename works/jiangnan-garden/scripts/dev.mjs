import { createServer } from 'node:http';
import { build } from './build.mjs';
const port = Number(process.env.PORT || 4173);
createServer(async (req,res) => { try { const html = await build(false); res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}); res.end(req.method==='HEAD' ? '' : html); } catch (e) { res.writeHead(500); res.end(e.message); } }).listen(port,'127.0.0.1',() => console.log(`http://localhost:${port}`));
