import { build } from 'esbuild';
import { chmod, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isBuiltin } from 'node:module';
import { renderCheckerBundle, renderCheckerLibraries, renderCheckerNotice } from '../src/check/bundle.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
await mkdir(output, { recursive: true });
// Do not remove dist/fixture-app or any other build's output.
await rm(resolve(output, 'checker-lib'), { recursive: true, force: true });
await mkdir(resolve(output, 'checker-lib'));
await writeFile(resolve(output, 'check-ui.cjs'), await renderCheckerBundle());
await writeFile(resolve(output, 'CHECKER-NOTICE.txt'), await renderCheckerNotice());
for (const [name, text] of await renderCheckerLibraries()) await writeFile(resolve(output, 'checker-lib', name), text);

// The source CLI builds its checker from the checkout. The installed CLI reads
// these exact build-time assets instead, without esbuild or node_modules paths.
const result = await build({
  absWorkingDir: root, entryPoints: ['src/cli.ts'], outfile: resolve(output, 'cli.js'),
  bundle: true, platform: 'node', target: 'node22', format: 'esm', minify: true,
  legalComments: 'none', metafile: true, logLevel: 'silent',
  banner: { js: '#!/usr/bin/env node\nimport {createRequire as packageRequire} from "node:module";\nimport {fileURLToPath as packageFilePath} from "node:url";\nimport {dirname as packageDirname} from "node:path";\nconst require=packageRequire(import.meta.url); const __filename=packageFilePath(import.meta.url); const __dirname=packageDirname(__filename);' },
  plugins: [{ name: 'packaged-checker-assets', setup(builder) {
    builder.onLoad({ filter: /[/\\]src[/\\]check[/\\]bundle\.ts$/ }, () => ({ loader: 'js', contents: `
      import {readFile,readdir} from 'node:fs/promises';
      const resource = name => new URL(name, import.meta.url);
      export const renderCheckerBundle = () => readFile(resource('./check-ui.cjs'), 'utf8');
      export const renderCheckerNotice = () => readFile(resource('./CHECKER-NOTICE.txt'), 'utf8');
      export async function renderCheckerLibraries() {
        const directory = resource('./checker-lib/');
        const names = (await readdir(directory)).filter(name => /^lib(?:\\.[a-z0-9.]+)?\\.d\\.ts$/.test(name)).sort();
        return new Map(await Promise.all(names.map(async name => [name, await readFile(new URL(name, directory), 'utf8')])));
      }
    ` }));
  } }],
});
if (result.warnings.length) throw new Error(result.warnings.map(warning => warning.text).join('\n'));
// TypeScript's optional source-map-support import is inside try/catch and is
// only for debugging its own compiler. It is not a runtime requirement.
const external = Object.values(result.metafile!.outputs).flatMap(file => file.imports)
  .filter(item => item.external && !isBuiltin(item.path) && item.path !== 'source-map-support');
if (external.length) throw new Error(`Unexpected runtime dependencies: ${external.map(item => item.path).join(', ')}`);
const packages = [...new Set(Object.keys(result.metafile!.inputs).filter(path => path.startsWith('node_modules/'))
  .map(path => path.startsWith('node_modules/@') ? path.split('/').slice(1, 3).join('/') : path.split('/')[1]))].sort();
const notices: string[] = [];
for (const name of packages) {
  const directory = resolve(root, 'node_modules', name);
  const metadata = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  const licenses = (await readdir(directory)).filter(file => /^(?:(?:licen[cs]e|copying)(?:[.-]|$)|notice|third[-_]?party)/i.test(file)).sort();
  if (!licenses.length) throw new Error(`Missing license text for bundled CLI dependency: ${name}`);
  notices.push(`${name}@${metadata.version}\n${licenses.join('\n')}\n\n` + (await Promise.all(licenses.map(file => readFile(resolve(directory, file), 'utf8')))).join('\n'));
}
await writeFile(resolve(output, 'CLI-NOTICE.txt'), 'Third-party notices for the bundled ui-foundation CLI only.\n\n' + notices.join('\n\n---\n\n') + '\n');
await chmod(resolve(output, 'cli.js'), 0o755);
console.log(`Built npm CLI, checker, standard libraries and notices (${packages.length} bundled CLI dependencies).`);
