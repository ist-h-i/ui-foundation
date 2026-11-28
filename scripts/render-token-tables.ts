import { readFile, writeFile } from 'node:fs/promises';
import { CORE_ROLES, OPTIONAL_ROLE_FALLBACKS, type PrimitiveType } from '../src/roles.ts';

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
const requiredRows = [...categories].flatMap(([category, groups]) =>
  [...groups].map(([type, names]) => `| ${category} | ${names.join(', ')} | ${type} |`),
).join('\n');

const optionalRows = Object.entries(OPTIONAL_ROLE_FALLBACKS)
  .map(([role, fallback]) => `| \`${role}\` | \`${fallback}\` |`).join('\n');

function renderTable(source: string, header: string, columnAlignment: string, rows: string, path: string): string {
  const tableHeader = `${header}\n${columnAlignment}\n`;
  const start = source.indexOf(tableHeader);
  if (start < 0) throw new Error(`Missing token table in ${path}: ${header}`);
  const bodyStart = start + tableHeader.length;
  const body = source.slice(bodyStart).match(/^(?:\|[^\n]*\n)*/)?.[0] ?? '';
  return source.slice(0, bodyStart) + rows + '\n' + source.slice(bodyStart + body.length);
}

for (const [path, required, optional] of [
  ['docs/design.md', '| カテゴリ | 必須の役割 | 型 |', '| 任意の役割 | 同じプロファイルでの代替役割 |'],
  ['docs/design.en.md', '| Category | Required roles | Type |', '| Optional role | Fallback in the same profile |'],
]) {
  const file = new URL(`../${path}`, import.meta.url);
  const source = await readFile(file, 'utf8');
  const withRequired = renderTable(source, required, '| --- | --- | --- |', requiredRows, path);
  const output = renderTable(withRequired, optional, '| --- | --- |', optionalRows, path);
  if (output === source) continue;
  if (check) {
    console.error(`${path} is out of date. Run npm run docs:tokens.`);
    process.exitCode = 1;
  } else {
    await writeFile(file, output);
  }
}
