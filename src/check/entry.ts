import { lstat, readFile } from 'node:fs/promises';
import { isAbsolute, resolve, sep } from 'node:path';
import { parseConfig, resolveConfig } from '../config.ts';
import { stableJSON, configurationHash } from './canonical.ts';
import { createSourcePolicy } from './policy.ts';
import { checkSources } from './scanner.ts';
import { formatSourceReport } from './report.ts';
import type { SourcePolicy } from './types.ts';

async function safePath(root: string, name: string): Promise<string> {
  if (!name || isAbsolute(name) || /[\\\u0000-\u001f]/.test(name) || name.split('/').some(part => !part || part === '.' || part === '..' || ['.git', 'node_modules'].includes(part.toLowerCase()))) throw new Error(`Unsafe project-relative path: ${name}`);
  let path = root;
  for (const part of name.split('/')) {
    path = resolve(path, part);
    if ((await lstat(path)).isSymbolicLink()) throw new Error(`Symlink is not a check input: ${name}`);
  }
  if (!path.startsWith(root + sep)) throw new Error(`Path is outside the project: ${name}`);
  return path;
}

async function main(args: string[]): Promise<void> {
  let root = process.cwd(), configPath = 'ui.config.yaml', json = false;
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (seen.has(flag)) throw new Error(`Duplicate option: ${flag}`);
    seen.add(flag);
    if (flag === '--help' || flag === '-h') { console.log('Usage: node <output>/check-ui.cjs [--root project] [--config ui.config.yaml] [--format text|json]'); return; }
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    if (flag === '--root') root = resolve(value);
    else if (flag === '--config') configPath = value;
    else if (flag === '--format' && ['json', 'text'].includes(value)) json = value === 'json';
    else throw new Error(`Unknown option or format: ${flag} ${value}`);
  }
  root = resolve(root);
  const config = resolveConfig(parseConfig(await readFile(await safePath(root, configPath), 'utf8')));
  const policyDocument: unknown = JSON.parse(await readFile(await safePath(root, `${config.output}/policy.json`), 'utf8'));
  const policy = policyDocument && typeof policyDocument === 'object' && 'source_policy' in policyDocument ? policyDocument.source_policy as SourcePolicy : undefined;
  const expected = createSourcePolicy(config);
  if (!policy || policy.schema_version !== 1 || policy.configuration_hash !== configurationHash(config)
      || stableJSON(policy.checks) !== stableJSON(expected.checks) || stableJSON(policy.semantic) !== stableJSON(expected.semantic)
      || !Array.isArray(policy.generated_components) || policy.generated_components.some(item => !item || typeof item.file !== 'string' || !item.file.startsWith(`${config.output}/angular/`) || typeof item.name !== 'string' || typeof item.selector !== 'string' || !['component', 'directive'].includes(item.kind))) {
    throw new Error('The source check policy is missing, invalid, or out of sync with the YAML. Run ui:sync using the owning ui-foundation version.');
  }
  const report = await checkSources({ root, config, policy });
  if (json) console.log(JSON.stringify(report));
  else for (const line of formatSourceReport(report)) console.log(line);
  if (!report.valid) process.exitCode = 1;
}

void main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (process.argv.some((arg, index, args) => arg === '--format' && args[index + 1] === 'json')) console.log(JSON.stringify({ valid: false, status: 'failed', error: message }));
  else console.error(message);
  process.exitCode = 1;
});
