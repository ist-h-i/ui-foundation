import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist/fixture-app');
const port = Number(process.env.UI_FIXTURE_PORT ?? 4183);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid UI_FIXTURE_PORT');
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.pdf': 'application/pdf', '.svg': 'image/svg+xml', '.vtt': 'text/vtt', '.wav': 'audio/wav', '.webm': 'video/webm', '.png':'image/png', '.json':'application/json', '.js': 'text/javascript', '.css': 'text/css', '.map': 'application/json' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
    const path = resolve(root, '.' + (pathname === '/' || pathname === '/catalog' || pathname.startsWith('/catalog/') ? '/index.html' : pathname));
    if (!path.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Fixture app: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
