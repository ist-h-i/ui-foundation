import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfig, resolveConfig, type ResolvedConfig } from './config.ts';
import { renderTailwind, renderTokens } from './tokens.ts';

const toolRoot = fileURLToPath(new URL('../', import.meta.url));
const skillDirectory = '.agents/skills/project-ui';
const ownershipPath = `${skillDirectory}/ownership.json`;
const digest = (content: string) => createHash('sha256').update(content).digest('hex');

export class SyncConflictError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues.join('\n'));
    this.name = 'SyncConflictError';
  }
}

export interface ProjectOptions { root: string; configPath?: string }
export interface SyncOptions extends ProjectOptions { dryRun?: boolean; fromOutput?: string }
export interface Change { path: string; kind: 'create' | 'update' | 'delete' }
interface Manifest {
  version: 1;
  tool_version: string;
  configuration_hash: string;
  files: Record<string, { sha256: string }>;
}
interface Ownership { schema_version: 1; output: string; manifest_path: string }

function ownership(output: string): Ownership {
  return { schema_version: 1, output, manifest_path: `${output}/manifest.json` };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

export function stableJSON(value: unknown): string { return JSON.stringify(canonical(value), null, 2) + '\n'; }

function containedPath(root: string, name: string): string {
  if (!name || isAbsolute(name) || name.includes('\\') || name.split('/').some(part => !part || part === '.' || part === '..')
      || name.split('/').some(part => ['.git', 'node_modules'].includes(part.toLowerCase()))) {
    throw new SyncConflictError([`Unsafe project-relative path: ${name}`]);
  }
  const path = resolve(root, name);
  if (!path.startsWith(root + sep)) throw new SyncConflictError([`Path is outside the project: ${name}`]);
  return path;
}

async function optionalText(path: string): Promise<string | undefined> {
  try { return await readFile(path, 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function rejectSymlinks(root: string, path: string): Promise<void> {
  let current = root;
  for (const part of relative(root, path).split(sep)) {
    current = resolve(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new SyncConflictError([`Symlink is not a managed path: ${relative(root, current)}`]);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
  }
}

async function sourceFiles(directory: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  async function visit(path: string): Promise<void> {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const child = resolve(path, entry.name);
      if (entry.isSymbolicLink()) throw new SyncConflictError([`Template symlink is unsupported: ${child}`]);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile() && /\.(ts|css|md)$/.test(entry.name) && entry.name !== 'README.md') {
        files.set(relative(directory, child).split(sep).join('/'), await readFile(child, 'utf8'));
      }
    }
  }
  await visit(directory);
  return files;
}

function projectContext(config: ResolvedConfig): string {
  return '# プロジェクトのUI設定\n\nYAMLから生成した判断材料です。変更は設定の正本へ戻してください。利用者の文脈からCLIが見た目を推測することはありません。\n\n'
    + '```json\n' + stableJSON({ context: config.context, default_profile: config.default_profile, output: config.output, profiles: config.profiles }) + '```\n';
}

export async function generatedFiles(config: ResolvedConfig): Promise<Map<string, string>> {
  const version = JSON.parse(await readFile(resolve(toolRoot, 'package.json'), 'utf8')).version as string;
  const files = new Map<string, string>([
    [`${config.output}/tokens.css`, renderTokens(config)],
    [`${config.output}/tailwind.css`, renderTailwind(config)],
    [`${config.output}/resolved.json`, stableJSON(config)],
    [`${config.output}/profiles.ts`, '/* Generated profile choices; edit the YAML configuration. */\n'
      + 'export const uiProfiles = ' + stableJSON({ defaultProfile: config.default_profile,
        profiles: Object.entries(config.profiles).map(([id, profile]) => ({ id, label: profile.label })) }).trimEnd() + ' as const;\n'],
    [`${config.output}/policy.json`, stableJSON({ schema_version: 1, default_profile: config.default_profile,
      profiles: config.profiles, styling: 'semantic-tokens', checks: ['configuration', 'defined-color-pairs', 'generated-consistency'],
      not_checked: ['application-source-deviations', 'business-correctness', 'user-understanding'] })],
    [`${skillDirectory}/project-context.md`, projectContext(config)],
    [ownershipPath, stableJSON(ownership(config.output))],
  ]);
  for (const [path, content] of await sourceFiles(resolve(toolRoot, 'templates/angular'))) files.set(`${config.output}/angular/${path}`, content);
  const skill = await sourceFiles(resolve(toolRoot, 'skills/ui-development'));
  if (!skill.has('SKILL.md')) throw new Error('The UI development Skill source is missing.');
  for (const [path, content] of skill) files.set(`${skillDirectory}/${path}`, content);
  const manifest: Manifest = { version: 1, tool_version: version, configuration_hash: digest(stableJSON(config)),
    files: Object.fromEntries([...files].map(([path, content]) => [path, { sha256: digest(content) }])) };
  files.set(`${config.output}/manifest.json`, stableJSON(manifest));
  return files;
}

async function loadProject(options: ProjectOptions): Promise<{ root: string; config: ResolvedConfig; files: Map<string, string>; manifestPath: string }> {
  const root = resolve(options.root);
  const configPath = containedPath(root, options.configPath ?? 'ui.config.yaml');
  await rejectSymlinks(root, configPath);
  const config = resolveConfig(parseConfig(await readFile(configPath, 'utf8')));
  await validateOutput(root, config.output);
  return { root, config, files: await generatedFiles(config), manifestPath: `${config.output}/manifest.json` };
}

async function validateOutput(root: string, name: string): Promise<void> {
  const output = containedPath(root, name);
  const skill = containedPath(root, skillDirectory);
  const outputScope = output.toLowerCase();
  const skillScope = skill.toLowerCase();
  if (outputScope === skillScope || outputScope.startsWith(skillScope + sep) || skillScope.startsWith(outputScope + sep)) {
    throw new SyncConflictError(['output must not overlap the generated Skill directory.']);
  }
  await rejectSymlinks(root, output);
  await rejectSymlinks(root, skill);
}

async function managedFiles(root: string, directory: string): Promise<string[]> {
  const result: string[] = [];
  async function visit(path: string): Promise<void> {
    let entries;
    try { entries = await readdir(path, { withFileTypes: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const child = resolve(path, entry.name);
      if (entry.isSymbolicLink()) throw new SyncConflictError([`Symlink in managed directory: ${relative(root, child)}`]);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) result.push(relative(root, child).split(sep).join('/'));
      else throw new SyncConflictError([`Unsupported managed file: ${relative(root, child)}`]);
    }
  }
  await visit(containedPath(root, directory));
  return result.sort();
}

async function readManifest(root: string, path: string, output: string): Promise<Manifest | undefined> {
  await rejectSymlinks(root, containedPath(root, path));
  const text = await optionalText(containedPath(root, path));
  if (text === undefined) return undefined;
  let manifest: Manifest;
  try { manifest = JSON.parse(text) as Manifest; }
  catch { throw new SyncConflictError([`Invalid manifest: ${path}`]); }
  if (!manifest || manifest.version !== 1 || typeof manifest.tool_version !== 'string'
      || !/^[a-f0-9]{64}$/.test(manifest.configuration_hash) || !manifest.files
      || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) {
    throw new SyncConflictError([`Invalid manifest structure: ${path}`]);
  }
  for (const [name, record] of Object.entries(manifest.files)) {
    containedPath(root, name);
    if (!(name.startsWith(output + '/') || name.startsWith(skillDirectory + '/')) || name === path
        || !record || typeof record.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.sha256)) {
      throw new SyncConflictError([`Invalid manifest ownership: ${name}`]);
    }
  }
  return manifest;
}

async function previousOwnership(root: string, output: string, fromOutput?: string): Promise<{ output: string; path: string; manifest?: Manifest }> {
  await rejectSymlinks(root, containedPath(root, ownershipPath));
  const registryText = await optionalText(containedPath(root, ownershipPath));
  let registry: Ownership | undefined;
  if (registryText !== undefined) {
    try { registry = JSON.parse(registryText) as Ownership; }
    catch { throw new SyncConflictError([`Invalid ownership registry: ${ownershipPath}`]); }
    if (!registry || registry.schema_version !== 1 || typeof registry.output !== 'string'
        || registry.manifest_path !== `${registry.output}/manifest.json`) {
      throw new SyncConflictError([`Invalid ownership registry: ${ownershipPath}`]);
    }
    await validateOutput(root, registry.output);
  }
  if (fromOutput !== undefined) {
    await validateOutput(root, fromOutput);
    if (registry && registry.output !== fromOutput) {
      throw new SyncConflictError([`--from-output must match the owned output: ${registry.output}`]);
    }
  }
  const previousOutput = registry?.output ?? fromOutput ?? output;
  const path = `${previousOutput}/manifest.json`;
  const manifest = await readManifest(root, path, previousOutput);
  if ((registry || fromOutput !== undefined) && !manifest) throw new SyncConflictError([`Previous manifest is missing: ${path}`]);
  if (registryText !== undefined && manifest?.files[ownershipPath]?.sha256 !== digest(registryText)) {
    throw new SyncConflictError([`Ownership registry does not match its manifest: ${ownershipPath}`]);
  }
  return { output: previousOutput, path, manifest };
}

async function atomicWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content, { flag: 'wx' });
    await rename(temporary, path);
  } finally { await rm(temporary, { force: true }); }
}

export async function syncProject(options: SyncOptions): Promise<{ changes: Change[]; written: boolean }> {
  const { root, config, files, manifestPath } = await loadProject(options);
  const owned = await previousOwnership(root, config.output, options.fromOutput);
  if (owned.output !== config.output && owned.output.toLowerCase() === config.output.toLowerCase()) {
    throw new SyncConflictError(['Case-only output relocation is unsupported; use a distinct intermediate output.']);
  }
  const previous = owned.manifest;
  const present = [...await managedFiles(root, config.output), ...await managedFiles(root, skillDirectory),
    ...(owned.output === config.output ? [] : await managedFiles(root, owned.output))];
  const issues: string[] = [];
  const oldContents = new Map<string, string | undefined>();
  for (const path of new Set([...present, ...files.keys(), ...Object.keys(previous?.files ?? {}), ...(previous ? [owned.path] : [])])) {
    await rejectSymlinks(root, containedPath(root, path));
    const content = await optionalText(containedPath(root, path));
    oldContents.set(path, content);
    if (content === undefined) continue;
    if (previous && path === owned.path) continue;
    const record = previous?.files[path];
    if (!record) issues.push(`Unowned file would be overwritten or removed: ${path}`);
    else if (digest(content) !== record.sha256) issues.push(`Generated file was edited: ${path}`);
  }
  if (!previous && present.some(path => path.startsWith(skillDirectory + '/'))) {
    issues.push('For a v1 output move without ownership.json, use sync --from-output <previous-output>.');
  }
  if (issues.length) throw new SyncConflictError(issues);
  const changes: Change[] = [];
  for (const [path, content] of files) if (oldContents.get(path) !== content) {
    changes.push({ path, kind: oldContents.get(path) === undefined ? 'create' : 'update' });
  }
  for (const path of Object.keys(previous?.files ?? {})) if (!files.has(path) && oldContents.get(path) !== undefined) changes.push({ path, kind: 'delete' });
  if (previous && owned.path !== manifestPath) changes.push({ path: owned.path, kind: 'delete' });
  changes.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  if (options.dryRun || changes.length === 0) return { changes, written: false };
  // Commit ownership metadata after file changes; retire only the validated old manifest.
  // Restore every attempted file, including both manifests and the registry, on ordinary I/O failure.
  const ordered = changes.filter(change => change.path !== manifestPath && change.path !== ownershipPath && change.path !== owned.path);
  ordered.push(...changes.filter(change => change.path === manifestPath));
  ordered.push(...changes.filter(change => change.path === ownershipPath));
  if (owned.path !== manifestPath) ordered.push(...changes.filter(change => change.path === owned.path));
  const attempted: Change[] = [];
  try {
    for (const change of ordered) {
      attempted.push(change);
      const path = containedPath(root, change.path);
      if (change.kind === 'delete') await rm(path);
      else await atomicWrite(path, files.get(change.path)!);
    }
  } catch (error) {
    const rollbackErrors: string[] = [];
    for (const change of attempted.reverse()) {
      try {
        const path = containedPath(root, change.path);
        const content = oldContents.get(change.path);
        if (await optionalText(path) === content) continue;
        if (content === undefined) await rm(path, { force: true });
        else await atomicWrite(path, content);
      } catch { rollbackErrors.push(`Restore manually from Git: ${change.path}`); }
    }
    if (rollbackErrors.length) throw new SyncConflictError([String(error), ...rollbackErrors]);
    throw error;
  }
  return { changes, written: true };
}

export async function checkProject(options: ProjectOptions): Promise<{ valid: boolean; differences: string[] }> {
  const { root, config, files } = await loadProject(options);
  const present = [...await managedFiles(root, config.output), ...await managedFiles(root, skillDirectory)];
  const differences: string[] = [];
  for (const [path, expected] of files) {
    await rejectSymlinks(root, containedPath(root, path));
    const actual = await optionalText(containedPath(root, path));
    if (actual !== expected) differences.push(`${actual === undefined ? 'Missing' : 'Changed'}: ${path}`);
  }
  for (const path of present) if (!files.has(path)) differences.push(`Unowned: ${path}`);
  return { valid: differences.length === 0, differences: differences.sort() };
}

export async function initProject(options: ProjectOptions): Promise<string> {
  const root = resolve(options.root);
  const name = options.configPath ?? 'ui.config.yaml';
  const path = containedPath(root, name);
  await rejectSymlinks(root, path);
  const example = await readFile(resolve(toolRoot, 'examples/ui.config.example.yaml'), 'utf8');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, example, { flag: 'wx' });
  return name;
}
