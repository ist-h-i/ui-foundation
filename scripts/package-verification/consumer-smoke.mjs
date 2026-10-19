// Copied into the independent consumer before execution. All imports, compiled
// UI and served assets resolve there while the source checkout is denied.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { build } from 'esbuild';
import { transformAsync } from '@babel/core';
import linkerPlugin from '@angular/compiler-cli/linker/babel';
import { needsLinking } from '@angular/compiler-cli/linker';
import { chromium, expect } from '@playwright/test';

const packageName = process.argv[2];
const output = resolve('public');
await mkdir(output, { recursive: true });
const bundle = await build({
  entryPoints: { main: 'compiled/consumer.js', 'assets/sheet-formula.worker': 'compiled/.ui/generated/angular/sheet-formula.worker.js' },
  outdir: output, splitting: true, bundle: true, format: 'esm', target: 'es2022', minify: true, define: { ngDevMode: 'false' }, metafile: true,
  plugins: [{ name: 'angular-linker', setup(builder) {
    builder.onLoad({ filter: /\.mjs$/ }, async ({ path }) => {
      const source = await readFile(path, 'utf8');
      if (!needsLinking(path, source)) return;
      const linked = await transformAsync(source, { filename: path, babelrc: false, configFile: false, plugins: [linkerPlugin] });
      assert.ok(linked?.code, `linker output: ${path}`);
      return { contents: linked.code, loader: 'js' };
    });
  }}],
});
const sha = value => createHash('sha256').update(value).digest('hex');
assert.ok(bundle.metafile);
const metafileText = JSON.stringify(bundle.metafile, null, 2) + '\n';
// Keep provenance outside public/: the audit artifact does not become an app
// asset. Preserve esbuild's actual inputs/outputs rather than a proposed graph.
await writeFile('bundle-metafile.json', metafileText);
const inputs = Object.keys(bundle.metafile.inputs).sort();
assert.ok(inputs.length > 0, 'the consumer bundle must record its actual inputs');
const canvasInputs = inputs.filter(path => /(?:^|\/)@napi-rs\/canvas(?:[-/]|$)/.test(path));
const nativeInputs = inputs.filter(path => path.endsWith('.node'));
assert.deepEqual(canvasInputs, [], 'optional native canvas must not enter this browser bundle');
assert.deepEqual(nativeInputs, [], 'native addons must not enter this browser bundle');
const outputs = [];
for (const path of Object.keys(bundle.metafile.outputs).sort()) {
  const deliveryPath = relative(output, resolve(path));
  assert.ok(deliveryPath && !isAbsolute(deliveryPath) && deliveryPath !== '..' && !deliveryPath.startsWith('../'), `bundle output leaves the delivery root: ${path}`);
  const bytes = await readFile(resolve(path));
  assert.equal(bytes.length, bundle.metafile.outputs[path].bytes, path);
  outputs.push({ path, delivery_path: deliveryPath, bytes: bytes.length, sha256: sha(bytes) });
}
assert.ok(outputs.length > 0, 'the consumer bundle must emit delivery files');
const bundleEvidence = {
  metafile: 'consumer/bundle-metafile.json', metafile_sha256: sha(metafileText),
  delivery_root: 'consumer/dist', input_count: inputs.length, input_paths_sha256: sha(JSON.stringify(inputs)), outputs,
  optional_native_exclusion: {
    package_family: '@napi-rs/canvas*', scope: 'this-esbuild-browser-bundle-inputs-only',
    canvas_inputs: canvasInputs, native_addon_inputs: nativeInputs, license_status: 'Unknown',
  },
};
const assets = [];
async function copyAsset(source, target) {
  const destination = resolve(output, target);
  await mkdir(resolve(destination, '..'), { recursive: true });
  await cp(source, destination, { recursive: true });
  async function record(path, url) {
    const info = await import('node:fs/promises').then(fs => fs.stat(path));
    if (info.isDirectory()) for (const name of await readdir(path)) await record(resolve(path, name), `${url}/${name}`);
    else assets.push({ url, digest: createHash('sha256').update(await readFile(path)).digest('hex') });
  }
  await record(source, `/${target}`);
}
for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl.css', 'LICENSE.txt']) {
  await copyAsset(`node_modules/maplibre-gl/${name === 'LICENSE.txt' ? '' : 'dist/'}${name}`, `assets/maplibre/${name}`);
}
await copyAsset('node_modules/pdfjs-dist/build/pdf.worker.mjs', 'assets/pdf/pdf.worker.mjs');
for (const name of ['cmaps', 'standard_fonts', 'wasm', 'iccs', 'LICENSE']) await copyAsset(`node_modules/pdfjs-dist/${name}`, `assets/pdf/${name}`);
await copyAsset(`node_modules/${packageName}/assets/pdf-source`, 'assets/pdf/source');
await copyAsset(`node_modules/${packageName}/assets/third-party`, 'assets/third-party');
await copyAsset('.ui/generated/CHECKER-NOTICE.txt', 'assets/CHECKER-NOTICE.txt');
await copyAsset(`node_modules/${packageName}/dist/CLI-NOTICE.txt`, 'assets/CLI-NOTICE.txt');
await cp('.ui/generated/tokens.css', resolve(output, 'tokens.css'));
await cp('.ui/generated/angular/styles.css', resolve(output, 'styles.css'));
await writeFile(resolve(output, 'index.html'), '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="/tokens.css"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/maplibre/maplibre-gl.css"></head><body><package-consumer></package-consumer><script type="module" src="/main.js"></script></body></html>');

// A self-contained, valid PDF fixture: no source-tree media is read or copied.
let pdf = '%PDF-1.4\n';
const pageText = 'BT /F1 14 Tf 20 100 Td (Package PDF) Tj ET\n';
const offsets = [0];
for (const [index, body] of [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  `<< /Length ${Buffer.byteLength(pageText)} >>\nstream\n${pageText}endstream`,
].entries()) { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${body}\nendobj\n`; }
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
await writeFile(resolve(output, 'sample.pdf'), pdf);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.pdf': 'application/pdf', '.wasm': 'application/wasm', '.txt': 'text/plain', '.json': 'application/json' };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const path = resolve(output, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!path.startsWith(`${output}/`)) { response.writeHead(403).end(); return; }
  try { const body = await readFile(path); response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' }).end(body); }
  catch { response.writeHead(404).end(); }
});
let browser;
process.once('SIGTERM', () => {
  void (async () => {
    try { await browser?.close(); }
    finally { server.closeAllConnections(); server.close(() => process.exit(143)); }
  })();
});
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  // Verify delivered bytes against independent installed-package/dependency
  // sources. This includes every PDF source-kit and third-party NOTICE file.
  for (const asset of assets) {
    const response = await fetch(origin + asset.url);
    assert.equal(response.status, 200, asset.url);
    assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'), asset.digest, asset.url);
    if (mime[extname(asset.url)]) assert.equal(response.headers.get('content-type'), mime[extname(asset.url)], asset.url);
  }
  browser = await chromium.launch({ headless: true, channel: 'chromium' });
  const page = await browser.newPage();
  const errors = [];
  const workers = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('worker', worker => workers.push(new URL(worker.url()).pathname));
  await page.goto(origin);
  const input = page.getByRole('textbox', { name: /^Draft/ });
  await input.fill('package draft');
  const editor = await input.elementHandle();
  const fontSizes = [];
  for (const profile of ['guided', 'dense']) {
    await expect(page.locator('section[data-ui-profile]').first()).toHaveAttribute('data-ui-profile', profile);
    await expect(input).toHaveValue('package draft');
    await expect(page.getByTestId('draft')).toHaveText('package draft');
    assert.equal(await input.evaluate((element, previous) => element === previous, editor), true);
    fontSizes.push(await input.evaluate(element => getComputedStyle(element).fontSize));
    if (profile === 'guided') await page.getByRole('button', { name: 'Switch profile', exact: true }).click();
  }
  assert.notEqual(fontSizes[0], fontSizes[1]);
  await expect(page.locator('ui-spreadsheet').getByRole('textbox', { name: 'C1', exact: true })).toHaveValue('5');
  await expect(page.locator('ui-pdf-viewer canvas')).toBeVisible({ timeout: 30_000 });
  await page.locator('ui-pdf-viewer summary').click();
  await expect(page.locator('ui-pdf-viewer')).toContainText('Package PDF');
  await expect(page.locator('ui-map [data-map-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('ui-map canvas')).toBeVisible();
  for (const expected of ['/assets/sheet-formula.worker.js', '/assets/pdf/pdf.worker.mjs', '/assets/maplibre/maplibre-gl-worker.mjs']) assert.ok(workers.includes(expected), `worker not started: ${expected}`);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ strictAot: true, inputAndProfileRetention: true, sheetCalculation: true, pdfCanvas: true, mapCanvas: true, servedAssetHashes: assets.length, fontSizes, workers, bundle: bundleEvidence }));
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
