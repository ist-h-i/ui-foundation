import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const runtimeEngines = ['@codemirror/autocomplete', '@codemirror/commands', '@codemirror/lang-javascript', '@codemirror/lang-json', '@codemirror/lang-markdown', '@codemirror/merge', '@codemirror/state', '@codemirror/view', '@dagrejs/dagre', 'echarts', 'fast-formula-parser', 'jsonc-parser', 'maplibre-gl', 'marked', 'prosemirror-commands', 'prosemirror-history', 'prosemirror-keymap', 'prosemirror-model', 'prosemirror-schema-basic', 'prosemirror-state', 'prosemirror-view', 'pdfjs-dist', 'qrcode', 'jsbarcode', 'temporal-polyfill'];
export const foundation = ['@angular/cdk', '@angular/common', '@angular/core', '@angular/forms', '@angular/platform-browser', '@lucide/angular', 'rxjs'];
export const consumerBuildTools = ['@angular/compiler', '@angular/compiler-cli', '@babel/core', 'esbuild', 'typescript', 'tailwindcss', '@tailwindcss/cli', '@types/qrcode'];
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const licenseName = /^(?:(?:licen[cs]e|copying)(?:[.-]|$)|notice|third[-_]?party)/i;
const json = async path => JSON.parse(await readFile(path, 'utf8'));

// Missing/malformed responses and production-only scans must never become zero.
export function classifyAudit(result, requiredDevCount = 1) {
  let body;
  try { body = JSON.parse(result.stdout); } catch { return { status: 'Unknown', reason: 'invalid JSON response' }; }
  if (result.error || ![0, 1].includes(result.status) || body.error || body.auditReportVersion !== 2 ||
      !body.vulnerabilities || !body.metadata?.vulnerabilities || !Number.isInteger(body.metadata.dependencies?.dev) ||
      body.metadata.dependencies.dev < requiredDevCount) return { status: 'Unknown', reason: 'failed, incomplete or omitted-dev audit response', response: body };
  const counts = body.metadata.vulnerabilities;
  const severities = ['info', 'low', 'moderate', 'high', 'critical'];
  if (![...severities, 'total'].every(key => Number.isInteger(counts[key]) && counts[key] >= 0) ||
      severities.reduce((sum, key) => sum + counts[key], 0) !== counts.total ||
      Object.keys(body.vulnerabilities).length !== counts.total) return { status: 'Unknown', reason: 'inconsistent audit counts', response: body };
  return { status: counts.high || counts.critical ? 'ActionRequired' : 'Verified', high: counts.high, critical: counts.critical, total: counts.total, response: body };
}

export function noticeContainsOriginal(notice, name, version, bytes) {
  // Header presence and byte preservation are separate requirements. Buffer
  // comparison preserves CRLF as well as copyright/license wording.
  const header = `${name}@${version}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\n)${header}(?=\\s|$)`).test(notice.toString('utf8')) && notice.includes(bytes);
}

export function inventoryMatchesNotice(dependencies, noticePackages) {
  const keys = items => items.map(item => `${item.name}@${item.version}`).sort();
  return JSON.stringify(keys(dependencies)) === JSON.stringify(keys(noticePackages));
}

export function resolveLockedDependency(packages, from, name) {
  let current = from;
  while (true) {
    const candidate = `${current ? `${current}/` : ''}node_modules/${name}`;
    if (packages[candidate]) return candidate;
    if (!current) return undefined;
    const boundary = current.lastIndexOf('/node_modules/');
    current = boundary < 0 ? '' : current.slice(0, boundary);
  }
}

export function dependencyClosure(packages, roots) {
  const reached = new Set();
  const missing = [];
  function visit(path) {
    if (reached.has(path)) return;
    reached.add(path);
    const item = packages[path];
    const peers = Object.keys(item.peerDependencies ?? {}).filter(name => !item.peerDependenciesMeta?.[name]?.optional);
    for (const name of new Set([...Object.keys(item.dependencies ?? {}), ...Object.keys(item.optionalDependencies ?? {}), ...peers])) {
      const dependency = resolveLockedDependency(packages, path, name);
      if (dependency) visit(dependency);
      else if (!item.optionalDependencies?.[name]) missing.push({ from: path, name });
    }
  }
  for (const name of roots) {
    const path = resolveLockedDependency(packages, '', name);
    if (path) visit(path); else missing.push({ from: '', name });
  }
  return { paths: [...reached].sort(), missing };
}

async function regularFiles(directory) {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.isDirectory()) for (const child of await regularFiles(join(directory, item.name))) result.push(join(item.name, child));
    else if (item.isFile()) result.push(item.name);
    else throw new Error(`Non-regular asset: ${join(directory, item.name)}`);
  }
  return result.sort();
}

async function exactAssets(root, packageRoot, delivery) {
  const results = [];
  for (const directory of ['assets/pdf-source', 'assets/third-party']) {
    for (const name of await regularFiles(join(root, directory))) {
      const source = await readFile(join(root, directory, name));
      const targets = [{ kind: 'package', path: join(packageRoot, directory, name) }];
      if (delivery) targets.push({ kind: 'delivery', path: join(delivery, directory === 'assets/pdf-source' ? 'assets/pdf/source' : directory, name) });
      for (const target of targets) {
        let actual;
        try { actual = await readFile(target.path); } catch { /* Missing remains a failure. */ }
        results.push({ kind: target.kind, source: `${directory}/${name}`, target: target.path, sha256: sha256(source), bytes: source.length, exact: !!actual?.equals(source) });
      }
    }
  }
  // Bind the archived source checksums, not merely their file names.
  const mapping = await json(join(root, 'assets/pdf-source/FONT-MAPPING.json'));
  for (const entry of mapping.acquisitions.filter(item => item.file && !item.file.endsWith('.deb'))) {
    const source = await readFile(join(root, 'assets/pdf-source', entry.file));
    results.push({ kind: 'source-acquisition-hash', source: entry.file, sha256: sha256(source), expectedSha256: entry.sha256, exact: sha256(source) === entry.sha256 });
  }
  for (const font of mapping.fonts) {
    const installed = await readFile(join(root, font.installedPath));
    results.push({ kind: 'pdf-font-source-correspondence', source: font.installedPath, sha256: sha256(installed), expectedSha256: font.binarySha256, exact: sha256(installed) === font.binarySha256 });
    if (delivery) {
      let actual;
      try { actual = await readFile(join(delivery, font.distributedPath)); } catch { /* Missing remains a failure. */ }
      results.push({ kind: 'pdf-font-delivery', source: font.installedPath, target: join(delivery, font.distributedPath), expectedSha256: font.binarySha256, exact: !!actual?.equals(installed) });
    }
  }
  if (delivery) for (const [source, destination] of [['node_modules/pdfjs-dist/LICENSE', 'assets/pdf/LICENSE'], ['node_modules/maplibre-gl/LICENSE.txt', 'assets/maplibre/LICENSE.txt']]) {
    const original = await readFile(join(root, source));
    let actual;
    try { actual = await readFile(join(delivery, destination)); } catch { /* Missing remains a failure. */ }
    results.push({ kind: 'worker-license-delivery', source, target: join(delivery, destination), sha256: sha256(original), exact: !!actual?.equals(original) });
  }
  return results;
}

export async function auditPackage({ root, packageRoot, delivery, tarball, skipNetwork = false }) {
  const lockBytes = await readFile(join(root, 'package-lock.json'));
  const lock = JSON.parse(lockBytes);
  const packages = lock.packages;
  if (!packages?.[''] || lock.lockfileVersion < 2) throw new Error('A package-lock with packages is required');
  const cliNotice = await readFile(join(packageRoot, 'dist/CLI-NOTICE.txt'));
  const checkerNotice = await readFile(join(packageRoot, 'dist/CHECKER-NOTICE.txt'));
  const runtimeNotice = Buffer.concat(await Promise.all((await regularFiles(join(packageRoot, 'assets/third-party'))).map(name => readFile(join(packageRoot, 'assets/third-party', name)))));
  const noticePackages = bytes => [...bytes.toString('utf8').matchAll(/^(@?[^\s]+)@(\d[^\s]*)$/gm)].map(match => ({ name: match[1], version: match[2] }));
  const cli = noticePackages(cliNotice);
  const checker = noticePackages(checkerNotice);
  if (!cli.length || !checker.length) throw new Error('Bundle notices have no package inventory');
  const buildInventory = await json(join(packageRoot, 'dist/CLI-DEPENDENCIES.json'));
  if (buildInventory.schema_version !== 1 || !Array.isArray(buildInventory.dependencies) || !buildInventory.dependencies.length) throw new Error('Invalid CLI build dependency inventory');
  const bundleChecks = [{ kind: 'cli-inventory', exact: inventoryMatchesNotice(buildInventory.dependencies, cli) }];
  for (const dependency of buildInventory.dependencies) {
    const metadata = await json(join(root, 'node_modules', dependency.name, 'package.json'));
    bundleChecks.push({ kind: 'cli-version', name: dependency.name, version: dependency.version, exact: metadata.version === dependency.version });
    if (!Array.isArray(dependency.licenseFiles) || !dependency.licenseFiles.length) bundleChecks.push({ kind: 'cli-license-inventory', name: dependency.name, exact: false });
    for (const file of dependency.licenseFiles ?? []) {
      const original = await readFile(join(root, 'node_modules', dependency.name, file.path));
      bundleChecks.push({ kind: 'cli-license-hash', name: dependency.name, file: file.path, sha256: sha256(original), exact: sha256(original) === file.sha256 && noticeContainsOriginal(cliNotice, dependency.name, dependency.version, original) });
    }
  }
  // Independently reproduce only the checker bundle in memory. This verifies
  // the packed bytes and captures the actual esbuild dependency inputs without
  // running the Angular/fixture build or changing any generated file.
  const { build } = await import('esbuild');
  const checkerBuild = await build({ absWorkingDir: root, entryPoints: ['src/check/entry.ts'], bundle: true, platform: 'node', target: 'node22', format: 'cjs', minify: true, write: false, metafile: true, legalComments: 'none', logLevel: 'silent' });
  if (checkerBuild.warnings.length) throw new Error('Checker bundle emitted warnings');
  const checkerNames = [...new Set(Object.keys(checkerBuild.metafile.inputs).filter(path => path.startsWith('node_modules/')).map(path => path.startsWith('node_modules/@') ? path.split('/').slice(1, 3).join('/') : path.split('/')[1]))].sort();
  const checkerDependencies = await Promise.all(checkerNames.map(async name => ({ name, version: (await json(join(root, 'node_modules', name, 'package.json'))).version })));
  const expectedChecker = Buffer.from('/* Generated UI source checker. Edit the owning ui-foundation sources, then sync. See CHECKER-NOTICE.txt. */\n' + checkerBuild.outputFiles[0].text + '\n');
  const actualChecker = await readFile(join(packageRoot, 'dist/check-ui.cjs'));
  bundleChecks.push({ kind: 'checker-input-inventory', dependencies: checkerDependencies, exact: inventoryMatchesNotice(checkerDependencies, checker) }, { kind: 'checker-artifact', sha256: sha256(actualChecker), expectedSha256: sha256(expectedChecker), exact: actualChecker.equals(expectedChecker) });
  const runtime = dependencyClosure(packages, [...runtimeEngines, ...foundation]);
  const toolchain = dependencyClosure(packages, consumerBuildTools);
  const bundled = new Set([...cli, ...checker].map(item => `node_modules/${item.name}`));
  const inventory = [];
  const noticeChecks = [];
  for (const [path, item] of Object.entries(packages).sort(([a], [b]) => a.localeCompare(b))) {
    if (!path) continue;
    const name = path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
    let installed;
    try { installed = await json(join(root, path, 'package.json')); } catch { /* Platform-optional packages can be absent. */ }
    const scopes = [bundled.has(path) && 'cli/checker', runtime.paths.includes(path) && 'generated-app', toolchain.paths.includes(path) && 'consumer-build-tool', !bundled.has(path) && !runtime.paths.includes(path) && !toolchain.paths.includes(path) && 'development/fixture'].filter(Boolean);
    const license = item.license ?? installed?.license ?? installed?.licenses?.map(value => value.type).join(' OR ') ?? null;
    inventory.push({ path, name, version: item.version, license, licenseMetadataSource: item.license ? 'package-lock' : installed?.license || installed?.licenses ? 'installed-package.json' : 'Unknown', integrity: item.integrity ?? null, optional: !!item.optional, installed: !!installed, installedVersionMatches: installed ? installed.version === item.version : null, scopes });
    if (!installed || (!bundled.has(path) && !runtime.paths.includes(path))) continue;
    const files = (await readdir(join(root, path), { withFileTypes: true })).filter(file => file.isFile() && licenseName.test(file.name)).map(file => file.name).sort();
    if (!files.length) noticeChecks.push({ name, version: item.version, path, file: null, status: 'Unknown', reason: 'no root license/notice text; inspect upstream source' });
    for (const file of files) {
      const original = await readFile(join(root, path, file));
      for (const [kind, notice, selected] of [['cli', cliNotice, cli.some(p => p.name === name)], ['checker', checkerNotice, checker.some(p => p.name === name)], ['generated-app', runtimeNotice, runtime.paths.includes(path)]]) {
        if (selected) noticeChecks.push({ kind, name, version: item.version, path, file, sha256: sha256(original), exact: noticeContainsOriginal(notice, name, item.version, original) });
      }
    }
  }
  const run = (args) => spawnSync('npm', args, { cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });
  const auditArgs = ['audit', '--json', '--include=dev', '--include=optional', '--include=peer', '--registry=https://registry.npmjs.org'];
  const auditResult = skipNetwork ? null : run(auditArgs);
  const security = auditResult ? { ...classifyAudit(auditResult, Object.values(packages).filter(item => item.dev).length), command: `npm ${auditArgs.join(' ')}`, exitStatus: auditResult.status, registry: 'https://registry.npmjs.org', npmVersion: run(['--version']).stdout?.trim() || null } : { status: 'Unknown', reason: 'network scan skipped' };
  const assetChecks = await exactAssets(root, packageRoot, delivery);
  const mismatches = inventory.filter(item => item.installedVersionMatches === false || (!item.installed && !item.optional));
  const failures = noticeChecks.filter(check => check.exact === false || check.status === 'Unknown');
  const tarballBytes = tarball ? await readFile(tarball) : undefined;
  return { schemaVersion: 1, observedAt: new Date().toISOString(), node: process.version, lockSha256: sha256(lockBytes), packageRoot, delivery: delivery ?? null, tarball: tarballBytes ? { path: tarball, bytes: tarballBytes.length, sha256: sha256(tarballBytes), extractionBinding: 'Use the package verification receipt to bind this extracted directory to the tarball.' } : null, buildInventory,
    status: security.status === 'ActionRequired' || mismatches.length || failures.length || runtime.missing.length || toolchain.missing.length || assetChecks.some(item => !item.exact) || bundleChecks.some(item => !item.exact) ? 'ActionRequired' : security.status === 'Unknown' || !delivery ? 'Unknown' : 'Verified',
    security, scopes: { bundledCli: cli, bundledChecker: checker, runtimeEngines, foundation, consumerBuildTools, consumerBuildToolClosureInstances: toolchain.paths.length, consumerBuildToolMissingDependencies: toolchain.missing, generatedAppClosureInstances: runtime.paths.length, generatedAppMissingDependencies: runtime.missing, inventoryInstances: inventory.length },
    inventory, installedMismatches: mismatches, bundleChecks, noticeChecks, assetChecks,
    limits: ['Declared runtime dependency/required-peer closure is conservative, not a measured browser bundle.', 'Optional packages absent for this OS remain lock inventory, not executed tests.', 'npm advisory responses are time-bound and do not prove absence of unknown vulnerabilities, malicious code, or application misuse.', 'Preserved notice bytes and SPDX metadata do not establish legal compliance or select the project license.', ...(delivery ? [] : ['No final application delivery path supplied; delivery of source kit/notices is Unknown.'])] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
  const root = resolve(option('--root') ?? dirname(dirname(fileURLToPath(import.meta.url))));
  const packageRoot = option('--package-root');
  const output = option('--output');
  if (!packageRoot || !output) throw new Error('Usage: node scripts/audit-package.mjs --package-root /extracted/package --output /receipt.json [--delivery /built/app] [--skip-network]');
  const receipt = await auditPackage({ root, packageRoot: resolve(packageRoot), delivery: option('--delivery') && resolve(option('--delivery')), tarball: option('--tarball') && resolve(option('--tarball')), skipNetwork: args.includes('--skip-network') });
  await writeFile(resolve(output), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ status: receipt.status, security: receipt.security.status, bundlePackages: receipt.scopes.bundledCli.length, runtimeClosure: receipt.scopes.generatedAppClosureInstances, noticeFailures: receipt.noticeChecks.filter(item => item.exact === false || item.status === 'Unknown').length, assetFailures: receipt.assetChecks.filter(item => !item.exact).length, output: resolve(output) }));
  if (receipt.status !== 'Verified') process.exitCode = 1;
}
