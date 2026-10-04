import { build } from 'esbuild';
import { transformAsync } from '@babel/core';
import linkerPlugin from '@angular/compiler-cli/linker/babel';
import { needsLinking } from '@angular/compiler-cli/linker';
import { copyFile, mkdir, readFile } from 'node:fs/promises';

await mkdir('dist/fixture-app', { recursive: true });
await build({
  entryPoints: ['build/compiled/tests/fixture-app/main.js'],
  outfile: 'dist/fixture-app/main.js',
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
console.log('Built Angular fixture app in dist/fixture-app');
