import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

/** Copy the operational contracts with the generated Skill, including offline links. */
export async function renderSkillDocumentation(): Promise<Map<string, string>> {
  const sources = new Map<string, string>();
  for (const directory of ['docs', 'docs/adr']) {
    for (const entry of (await readdir(resolve(root, directory), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      if (entry.isSymbolicLink()) throw new Error(`Skill documentation symlink is unsupported: ${directory}/${entry.name}`);
      if (entry.isFile() && entry.name.endsWith('.md')) sources.set(resolve(root, directory, entry.name), `${directory}/${entry.name}`);
    }
  }
  for (const path of ['docs/ui-library-api.json', 'docs/ui-library-matrix.json', 'examples/ui.config.example.yaml']) sources.set(resolve(root, path), path);
  const result = new Map<string, string>();
  for (const [source, destination] of sources) {
    let text = await readFile(source, 'utf8');
    if (source.endsWith('.md')) {
      // Historical evidence, build scripts and fixture links are not operational
      // dependencies of the installed Skill. Preserve their labels and provenance
      // without leaving broken relative links or implying consumer test success.
      text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (link, label: string, target: string) => {
        if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) return link;
        const path = target.split('#')[0];
        if (sources.has(resolve(dirname(source), path))) return link;
        return `${label}（開発元の参考資料: \`${target}\`。この生成Skillには含めない）`;
      });
    }
    result.set(destination, text);
  }
  return result;
}
