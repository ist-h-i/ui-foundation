import { build } from 'esbuild';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
let assets: Promise<{ script: string; notice: string }> | undefined;
async function checkerAssets(): Promise<{ script: string; notice: string }> {
  const result = await build({ absWorkingDir: root, entryPoints: ['src/check/entry.ts'], bundle: true,
    platform: 'node', target: 'node22', format: 'cjs', minify: true, write: false, metafile: true,
    legalComments: 'none', logLevel: 'silent' });
  if (result.warnings.length) throw new Error(result.warnings.map(warning => warning.text).join('\n'));
  const packages = [...new Set(Object.keys(result.metafile!.inputs).filter(path => path.startsWith('node_modules/'))
    .map(path => path.startsWith('node_modules/@') ? path.split('/').slice(1, 3).join('/') : path.split('/')[1]))].sort();
  const notices: string[] = [];
  for (const name of packages) {
    const directory = resolve(root, 'node_modules', name);
    const metadata = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
    const licenses = (await readdir(directory)).filter(file => /^(?:licen[cs]e|copying)(?:[.-]|$)/i.test(file)).sort();
    if (!licenses.length) throw new Error(`Missing license text for bundled dependency: ${name}`);
    notices.push(`${name}@${metadata.version}\n${licenses.join('\n')}\n\n` + (await Promise.all(licenses.map(file => readFile(resolve(directory, file), 'utf8')))).join('\n'));
  }
  return { script: '/* Generated UI source checker. Edit the owning ui-foundation sources, then sync. See CHECKER-NOTICE.txt. */\n' + result.outputFiles[0].text + '\n',
    notice: 'Third-party notices for check-ui.cjs only. Dependencies are bundled for Node; this is not a browser runtime asset.\n\n' + notices.join('\n\n---\n\n') + '\n' };
}
export async function renderCheckerBundle(): Promise<string> { return (await (assets ??= checkerAssets())).script; }
export async function renderCheckerNotice(): Promise<string> { return (await (assets ??= checkerAssets())).notice; }

let libraries: Promise<Map<string, string>> | undefined;
export async function renderCheckerLibraries(): Promise<Map<string, string>> {
  return libraries ??= (async () => {
    const directory = resolve(root, 'node_modules/typescript/lib');
    const names = (await readdir(directory)).filter(name => /^lib(?:\.[a-z0-9.]+)?\.d\.ts$/.test(name)).sort();
    return new Map(await Promise.all(names.map(async name => [name, await readFile(resolve(directory, name), 'utf8')] as const)));
  })();
}
