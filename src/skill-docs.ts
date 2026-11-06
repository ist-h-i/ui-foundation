import { lstat, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const example = 'examples/ui.config.example.yaml';
const englishExample = 'examples/ui.config.example.en.yaml';

/** Share the npm files allowlist instead of discovering repository documents. */
export async function renderSkillDocumentation(resourceRoot: string = root): Promise<Map<string, string>> {
  const base = resolve(resourceRoot);
  async function readResource(path: string): Promise<string> {
    let current = base;
    for (const part of path.split('/')) {
      current = resolve(current, part);
      if ((await lstat(current)).isSymbolicLink()) throw new Error(`Skill documentation symlink is unsupported: ${path}`);
    }
    if (!(await lstat(current)).isFile()) throw new Error(`Skill documentation must be a file: ${path}`);
    return readFile(current, 'utf8');
  }
  const metadata: unknown = JSON.parse(await readResource('package.json'));
  const files = metadata && typeof metadata === 'object' && 'files' in metadata ? metadata.files : undefined;
  if (!Array.isArray(files) || !files.every((path): path is string => typeof path === 'string')) {
    throw new Error('Package files must contain an explicit documentation allowlist.');
  }
  const documents = files.filter(path => path === 'docs' || path.startsWith('docs/'));
  if (!documents.length || new Set(documents).size !== documents.length || documents.some(path =>
    !/^docs\/(?:[a-z0-9][a-z0-9.-]*\/)*[a-z0-9][a-z0-9.-]*\.(?:md|json)$/.test(path)
    || path.split('/').some(part => part === '.' || part === '..'))) {
    throw new Error('Documentation allowlist must name explicit files without globs or traversal.');
  }
  if (!files.includes(example)) throw new Error(`Package files must include the Skill example: ${example}`);
  const sources = new Map([...documents, example, ...(files.includes(englishExample) ? [englishExample] : [])].sort().map(path => [resolve(base, path), path]));
  const result = new Map<string, string>();
  for (const [source, destination] of sources) {
    let text = await readResource(destination);
    if (destination.endsWith('.md')) {
      // Only allowlisted documents are local operational dependencies. Optional
      // source examples outside the package retain their labels and provenance.
      text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (link, label: string, target: string) => {
        if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) return link;
        const path = target.split('#')[0];
        if (sources.has(resolve(dirname(source), path))) return link;
        const japanese = destination.endsWith('.ja.md') || ['docs/design.md', 'docs/ui-components.md'].includes(destination);
        return japanese ? `${label}（開発元の参考資料: \`${target}\`。この生成Skillには含めない）`
          : `${label} (authoring reference: \`${target}\`; not included in this generated Skill)`;
      });
    }
    result.set(destination, text);
  }
  return result;
}
