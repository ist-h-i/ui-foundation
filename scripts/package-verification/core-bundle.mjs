import assert from 'node:assert/strict';
import { writeFile, readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { transformAsync } from '@babel/core';
import linkerPlugin from '@angular/compiler-cli/linker/babel';
import { needsLinking } from '@angular/compiler-cli/linker';

await writeFile('compiled/src/styles.css', '@import "../../.ui/generated/tokens.css";\n@import "../../.ui/generated/angular/styles.css";\n');
const { metafile } = await build({
  entryPoints: { main: 'compiled/src/main.js', styles: 'compiled/src/styles.css' },
  bundle: true,
  splitting: true,
  minify: true,
  target: 'es2022',
  format: 'esm',
  outdir: 'dist',
  write: false,
  metafile: true,
  define: { ngDevMode: 'false' },
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

assert.ok(!Object.keys(metafile.inputs).some(path => path.includes('/@lucide/angular/')),
  'basic components and the full catalog must resolve without the optional Angular Lucide adapter');
const outputs = metafile.outputs;
function followStaticImports(path, seen = new Set()) {
  if (seen.has(path)) return seen;
  seen.add(path);
  for (const entry of outputs[path].imports) {
    if (!entry.external && entry.kind !== 'dynamic-import') followStaticImports(entry.path, seen);
  }
  return seen;
}
const initial = followStaticImports('dist/main.js');
const lazy = Object.entries(outputs).find(([, output]) => output.entryPoint === 'compiled/src/form.js');
assert.ok(lazy, 'the form must emit a lazy JavaScript chunk');
assert.ok(!initial.has(lazy[0]), 'the form must remain outside the initial JavaScript');
const isSpecialist = path => /(?:^|\/)(?:maplibre-gl|pdfjs-dist|fast-formula-parser|spreadsheet\.js|sheet-formula\.worker\.js)(?:\/|$)/.test(path);
const specialistInputs = Object.keys(metafile.inputs).filter(isSpecialist);
const specialistOutputs = Object.entries(outputs).filter(([, output]) =>
  Object.entries(output.inputs).some(([input, info]) => isSpecialist(input) && info.bytesInOutput > 0)).map(([path]) => path);
const lazyOnly = [...followStaticImports(lazy[0])].filter(path => !initial.has(path));
console.log(JSON.stringify({
  initialJavaScriptBytes: [...initial].reduce((sum, path) => sum + outputs[path].bytes, 0),
  lazyFormJavaScriptBytes: lazyOnly.reduce((sum, path) => sum + outputs[path].bytes, 0),
  initialCssBytes: outputs['dist/styles.css'].bytes,
  totalBytes: Object.values(outputs).reduce((sum, output) => sum + output.bytes, 0),
  specialistInputs,
  specialistOutputs,
}));
