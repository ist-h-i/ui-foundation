import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist/fixture-app');
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.map': 'application/json' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1:5338').pathname);
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
server.listen(5338, '127.0.0.1', () => console.log('Fixture app: http://127.0.0.1:5338'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
