import { build } from 'esbuild';
import { transformAsync } from '@babel/core';
import linkerPlugin from '@angular/compiler-cli/linker/babel';
import { needsLinking } from '@angular/compiler-cli/linker';
import { copyFile, cp, mkdir, readFile, rm } from 'node:fs/promises';

await rm('dist/fixture-app', { recursive: true, force: true });
await mkdir('dist/fixture-app', { recursive: true });
await build({
  entryPoints: {main:'build/compiled/tests/fixture-app/main.js', 'assets/sheet-formula.worker':'build/compiled/.ui/generated/angular/sheet-formula.worker.js'},
  outdir: 'dist/fixture-app',
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  sourcemap: true,
  plugins: [{
    name: 'angular-linker',
    setup(builder) {
      builder.onLoad({ filter: /\.mjs$/ }, async ({ path }) => {
        const source = await readFile(path, 'utf8');
        if (!needsLinking(path, source)) return;
        const linked = await transformAsync(source, {
          filename: path,
          babelrc: false,
          configFile: false,
          plugins: [linkerPlugin],
          sourceMaps: 'inline',
        });
        if (!linked?.code) throw new Error(`Angular linker did not produce code for ${path}`);
        return { contents: linked.code, loader: 'js' };
      });
    },
  }],
});
await copyFile('tests/fixture-app/index.html', 'dist/fixture-app/index.html');
await mkdir('dist/fixture-app/assets/maplibre',{recursive:true});
for(const name of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs','maplibre-gl.css'])await copyFile('node_modules/maplibre-gl/dist/'+name,'dist/fixture-app/assets/maplibre/'+name);
await mkdir('dist/fixture-app/assets/pdf',{recursive:true});
await copyFile('node_modules/pdfjs-dist/build/pdf.worker.mjs','dist/fixture-app/assets/pdf/pdf.worker.mjs');
for(const directory of ['cmaps','standard_fonts','wasm','iccs'])await cp('node_modules/pdfjs-dist/'+directory,'dist/fixture-app/assets/pdf/'+directory,{recursive:true});
await cp('assets/media','dist/fixture-app/assets/media',{recursive:true});
await copyFile('node_modules/pdfjs-dist/LICENSE','dist/fixture-app/assets/pdf/LICENSE');
await copyFile('node_modules/maplibre-gl/LICENSE.txt','dist/fixture-app/assets/maplibre/LICENSE.txt');
await cp('assets/pdf-source','dist/fixture-app/assets/pdf/source',{recursive:true});
await cp('assets/third-party','dist/fixture-app/assets/third-party',{recursive:true});
console.log('Built Angular fixture app in dist/fixture-app');
