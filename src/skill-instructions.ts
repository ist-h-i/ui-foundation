import { lstat, readFile, readdir } from 'node:fs/promises';
import { posix, resolve } from 'node:path';

const readme = /^README(?:\.[a-z]+)?\.md$/;
const generatedFiles = new Set([
  'project-context.md',
  'ownership.json',
  'UI-FOUNDATION-LICENSE.txt',
  'references/examples/ui.config.example.yaml',
  'references/examples/ui.config.example.en.yaml',
]);

/** Read the operational files from an installed Skill or its synced copy. */
export async function readSkillInstructions(directory: string, generated = false): Promise<Map<string, string>> {
  const root = resolve(directory);
  const files = new Map<string, string>();
  if (!(await lstat(root)).isDirectory()) throw new Error('Skill root must be a regular directory.');
  async function visit(prefix: string): Promise<void> {
    for (const entry of (await readdir(resolve(root, prefix), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const path = posix.join(prefix, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Skill instruction symlink is unsupported: ${path}`);
      if (generated && (path === 'references/docs' || generatedFiles.has(path))) continue;
      if (!generated && (path === 'references/docs' || generatedFiles.has(path))) {
        throw new Error(`Skill instruction path is reserved for generated files: ${path}`);
      }
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && !generated && readme.test(entry.name)) continue;
      else if (entry.isFile() && /\.(?:md|ts|css)$/.test(path) && !readme.test(entry.name)) {
        files.set(path, await readFile(resolve(root, path), 'utf8'));
      } else {
        throw new Error(`Unsupported Skill instruction file: ${path}. Use Markdown, TypeScript or CSS for operational files.`);
      }
    }
  }
  await visit('');
  if (!files.has('SKILL.md')) throw new Error('The UI development Skill source is missing SKILL.md.');
  return files;
}

export function renderSkillInstruction(path: string, content: string): string {
  if (!path.endsWith('.md')) return content;
  const before = posix.relative(posix.dirname('skills/ui-development/' + path), 'docs') + '/';
  const after = posix.relative(posix.dirname(path), 'references/docs') + '/';
  return content.replaceAll('](' + before, '](' + after)
    .replace(/^( {0,3}\[[^\]\n]+\]:[ \t]+<?)(\S+)/gm, (definition, prefix: string, target: string) =>
      target.startsWith(before) ? prefix + after + target.slice(before.length) : definition);
}
