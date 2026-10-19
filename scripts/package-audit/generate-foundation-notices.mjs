import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dependencyClosure, foundation, sha256 } from '../audit-package.mjs';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const closure = dependencyClosure(lock.packages, foundation);
if (closure.missing.length) throw new Error(`Missing foundation dependencies: ${JSON.stringify(closure.missing)}`);
const sections = [];
for (const path of closure.paths) {
  const metadata = JSON.parse(await readFile(join(root, path, 'package.json'), 'utf8'));
  if (metadata.version !== lock.packages[path].version) throw new Error(`Installed version differs from lock: ${path}`);
  const files = (await readdir(join(root, path), { withFileTypes: true })).filter(file => file.isFile() && /^(?:(?:licen[cs]e|copying)(?:[.-]|$)|notice|third[-_]?party)/i.test(file.name)).map(file => file.name).sort();
  if (!files.length) throw new Error(`Unknown: original root license/notice text missing for ${path}`);
  for (const file of files) {
    const bytes = await readFile(join(root, path, file));
    sections.push(Buffer.from(`\n========================================================================\n${metadata.name}@${metadata.version} — ${file} (${path}; ${metadata.license ?? 'license metadata Unknown'})\nOriginal file SHA256: ${sha256(bytes)}\n------------------------------------------------------------------------\n`), bytes, Buffer.from('\n'));
  }
}
const output = resolve(process.argv[2] ?? join(root, 'assets/third-party/FOUNDATION-NOTICES.txt'));
await writeFile(output, Buffer.concat([Buffer.from(`UI foundation: Angular/CDK/Lucide/RxJS foundation original notices\n\nScope: installed declared dependency and required-peer closure of ${foundation.join(', ')} (${closure.paths.length} instances). Optional peers are excluded. Original files are preserved byte-for-byte; dependency versions are locked. This supplements THIRD-PARTY-NOTICES.txt for the additional runtime engines and does not select ui-foundation's own license or establish legal compliance.\n`), ...sections]));
console.log(`Wrote ${closure.paths.length} foundation dependency instances to ${output}`);
