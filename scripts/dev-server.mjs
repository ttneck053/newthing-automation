import http from 'node:http';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const entry = resolve(import.meta.dirname, '../worker/index.js');
const port = Number(process.env.AXSTUDIO_PORT || 4177);
let modified, worker;
const server = http.createServer(async (req, res) => {
  try {
    const time = (await stat(entry)).mtimeMs;
    if (time !== modified) { worker = (await import(pathToFileURL(entry).href + '?v=' + time)).default; modified = time; }
    const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers, ...(!['GET', 'HEAD'].includes(req.method) ? { body: Readable.toWeb(req), duplex: 'half' } : {}) });
    const response = await worker.fetch(request, process.env, { waitUntil: p => p.catch(() => {}) });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(res); else res.end();
  } catch { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('미리보기를 준비하지 못했어요. 빌드 상태를 확인해 주세요.'); }
});
server.listen(port, '0.0.0.0', () => console.log(`Local: http://localhost:${port}/generate`));
