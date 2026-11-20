import { readFile, writeFile } from 'node:fs/promises';
import { CORE_ROLES, type PrimitiveType } from '../src/roles.ts';

const check = process.argv.includes('--check');
const categories = new Map<string, Map<PrimitiveType, string[]>>();
for (const [role, type] of Object.entries(CORE_ROLES)) {
  const separator = role.indexOf('.');
  const category = role.slice(0, separator);
  const name = role.slice(separator + 1);
  const groups = categories.get(category) ?? new Map<PrimitiveType, string[]>();
  const names = groups.get(type) ?? [];
  names.push(name);
  groups.set(type, names);
  categories.set(category, groups);
}
const rows = [...categories].flatMap(([category, groups]) =>
  [...groups].map(([type, names]) => `| ${category} | ${names.join(', ')} | ${type} |`),
).join('\n');

for (const [path, header] of [
  ['docs/design.md', '| カテゴリ | 必須の役割 | 型 |'],
  ['docs/design.en.md', '| Category | Required roles | Type |'],
]) {
  const file = new URL(`../${path}`, import.meta.url);
  const source = await readFile(file, 'utf8');
  const tableHeader = `${header}\n| --- | --- | --- |\n`;
  const start = source.indexOf(tableHeader);
  if (start < 0) throw new Error(`Missing token table in ${path}`);
  const bodyStart = start + tableHeader.length;
  const body = source.slice(bodyStart).match(/^(?:\|[^\n]*\n)*/)?.[0] ?? '';
  const output = source.slice(0, bodyStart) + rows + '\n' + source.slice(bodyStart + body.length);
  if (output === source) continue;
  if (check) {
    console.error(`${path} is out of date. Run npm run docs:tokens.`);
    process.exitCode = 1;
  } else {
    await writeFile(file, output);
  }
}
