import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const runtimeEngines = ['@codemirror/autocomplete', '@codemirror/commands', '@codemirror/lang-javascript', '@codemirror/lang-json', '@codemirror/lang-markdown', '@codemirror/merge', '@codemirror/state', '@codemirror/view', '@dagrejs/dagre', 'echarts', 'fast-formula-parser', 'jsonc-parser', 'maplibre-gl', 'marked', 'prosemirror-commands', 'prosemirror-history', 'prosemirror-keymap', 'prosemirror-model', 'prosemirror-schema-basic', 'prosemirror-state', 'prosemirror-view', 'pdfjs-dist', 'qrcode', 'jsbarcode', 'temporal-polyfill'];
export const foundation = ['@angular/cdk', '@angular/common', '@angular/core', '@angular/forms', '@angular/platform-browser', '@lucide/angular', 'rxjs'];
export const consumerBuildTools = ['@angular/compiler', '@angular/compiler-cli', '@babel/core', 'esbuild', 'typescript', 'tailwindcss', '@tailwindcss/cli', '@types/qrcode'];
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const licenseName = /^(?:(?:[a-z0-9]+[-_])?(?:licen[cs]e|copying)(?:[.-]|$)|notice|third[-_]?party)/i;
const specialOriginals = { 'murmurhash-js@1.0.0': { path: 'README.md', sha256: 'e137ced8967fc334ec9b5fc5c8500992f9e49d2e9cc0f6e2439e46af2f2481a4' } };
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
  const required = new Set();
  const states = new Set();
  const missing = new Map();
  function visit(path, optionalChain) {
    const state = `${path}:${optionalChain}`;
    if (states.has(state)) return;
    states.add(state);
    reached.add(path);
    if (!optionalChain) required.add(path);
    const item = packages[path];
    const peers = Object.keys(item.peerDependencies ?? {}).filter(name => !item.peerDependenciesMeta?.[name]?.optional);
    for (const name of new Set([...Object.keys(item.dependencies ?? {}), ...Object.keys(item.optionalDependencies ?? {}), ...peers])) {
      const dependency = resolveLockedDependency(packages, path, name);
      const childOptional = optionalChain || Object.hasOwn(item.optionalDependencies ?? {}, name);
      if (dependency) visit(dependency, childOptional);
      else {
        const key = `${path}:${name}`;
        const previous = missing.get(key);
        const bundled = item.bundleDependencies ?? item.bundledDependencies;
        missing.set(key, { from: path, name, optionalChain: previous ? previous.optionalChain && childOptional : childOptional, declaredBundled: bundled === true || (Array.isArray(bundled) && bundled.includes(name)) });
      }
    }
  }
  for (const name of roots) {
    const path = resolveLockedDependency(packages, '', name);
    if (path) visit(path, false); else missing.set(`:${name}`, { from: '', name, optionalChain: false, declaredBundled: false });
  }
  return { paths: [...reached].sort(), requiredPaths: [...required].sort(), missing: [...missing.values()] };
}

export function classifyMissingDependencies(packages, closure, installedPaths, platform = process.platform, arch = process.arch) {
  const inactiveOptional = [], actionable = [];
  const excludes = (values, current) => Array.isArray(values) && (values.includes(`!${current}`) || (values.some(value => !value.startsWith('!')) && !values.includes(current)));
  for (const missing of closure.missing) {
    const parent = packages[missing.from];
    const inactive = missing.optionalChain && !closure.requiredPaths.includes(missing.from) && parent?.optional && !installedPaths.has(missing.from) && (excludes(parent.os, platform) || excludes(parent.cpu, arch));
    if (inactive) inactiveOptional.push({ ...missing, status: 'Unknown', reason: 'Not installed; reachable only through optional edges; locked OS/CPU excludes this host. Bundled declaration does not establish the missing version, source license or execution.', os: parent.os ?? null, cpu: parent.cpu ?? null });
    else actionable.push(missing);
  }
  return { inactiveOptional, actionable };
}

export async function originalNoticeFiles(directory, name, version) {
  const files = (await readdir(directory, { withFileTypes: true })).filter(file => file.isFile() && licenseName.test(file.name)).map(file => ({ path: file.name, kind: 'root-license-notice' }));
  const special = specialOriginals[`${name}@${version}`];
  if (special) {
    const bytes = await readFile(join(directory, special.path));
    if (sha256(bytes) !== special.sha256) throw new Error(`Unrecognized original license source bytes: ${name}@${version}/${special.path}`);
    files.push({ path: special.path, kind: 'allowlisted-original-license-in-readme', expectedSha256: special.sha256 });
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
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

const nativeProofFlags = ['reportPassed', 'tarballMatches', 'metafileHashMatches', 'inputPathsHashMatches', 'outputBindingsVerified', 'noCanvasInputs', 'noNativeInputs', 'noNativeFiles', 'noNativeBinaryCopies'];
export function canExcludeNativeNotice(proof) {
  return proof.name === '@napi-rs/canvas-darwin-arm64' && proof.version === '1.0.10' && proof.platform === 'darwin' && proof.arch === 'arm64' && nativeProofFlags.every(key => proof[key] === true);
}

export async function nativeExclusionProof(root, packageRoot, delivery, tarball) {
  const proof = { name: '@napi-rs/canvas-darwin-arm64', version: '1.0.10', platform: process.platform, arch: process.arch, verified: false, originalLicenseStatus: 'Unknown' };
  if (!delivery || !tarball) return { ...proof, reason: 'Final delivery and candidate tarball are required' };
  try {
    const evidenceRoot = dirname(packageRoot);
    const report = await json(join(evidenceRoot, 'report.json'));
    const bundle = report.smoke?.bundle;
    if (!bundle) return { ...proof, reason: 'No saved browser metafile/output binding' };
    const inside = (base, path) => {
      const target = resolve(base, path);
      if (!target.startsWith(`${resolve(base)}/`)) throw new Error('Evidence path leaves its root');
      return target;
    };
    const metaBytes = await readFile(inside(evidenceRoot, bundle.metafile));
    const meta = JSON.parse(metaBytes);
    const inputPaths = Object.keys(meta.inputs).sort();
    const outputPaths = Object.keys(meta.outputs).sort();
    const canvasInputs = inputPaths.filter(path => /(?:^|[/\\])node_modules[/\\]@napi-rs[/\\]canvas(?:[-/\\]|$)/.test(path));
    const nativeInputs = inputPaths.filter(path => /\.node$/i.test(path));
    const outputChecks = [];
    for (const output of bundle.outputs ?? []) {
      const bytes = await readFile(inside(delivery, output.delivery_path));
      outputChecks.push({ path: output.path, deliveryPath: output.delivery_path, sha256: sha256(bytes), exact: output.path === `public/${output.delivery_path}` && sha256(bytes) === output.sha256 && bytes.length === output.bytes && meta.outputs[output.path]?.bytes === bytes.length });
    }
    const native = await readFile(join(root, 'node_modules/@napi-rs/canvas-darwin-arm64/skia.darwin-arm64.node'));
    const nativeSha256 = sha256(native);
    const nativeFiles = [], nativeBinaryCopies = [];
    for (const [kind, directory] of [['candidate', packageRoot], ['delivery', delivery]]) for (const file of await regularFiles(directory)) {
      if (/\.node$/i.test(file)) nativeFiles.push({ kind, file });
      const bytes = await readFile(join(directory, file));
      if (bytes.length === native.length && sha256(bytes) === nativeSha256) nativeBinaryCopies.push({ kind, file });
    }
    Object.assign(proof, { reportPassed: report.status === 'passed', tarballMatches: sha256(await readFile(tarball)) === report.candidate_sha256, metafileHashMatches: sha256(metaBytes) === bundle.metafile_sha256, inputPathsHashMatches: sha256(JSON.stringify(inputPaths)) === bundle.input_paths_sha256 && inputPaths.length === bundle.input_count,
      outputBindingsVerified: inside(evidenceRoot, bundle.delivery_root) === resolve(delivery) && outputChecks.length > 0 && outputChecks.every(item => item.exact) && JSON.stringify(outputChecks.map(item => item.path).sort()) === JSON.stringify(outputPaths),
      noCanvasInputs: canvasInputs.length === 0, noNativeInputs: nativeInputs.length === 0, noNativeFiles: nativeFiles.length === 0, noNativeBinaryCopies: nativeBinaryCopies.length === 0,
      metafileSha256: sha256(metaBytes), canvasInputs, nativeInputs, outputChecks, nativeSha256, nativeFiles, nativeBinaryCopies });
    proof.verified = canExcludeNativeNotice(proof);
    return proof;
  } catch (error) { return { ...proof, reason: `Missing or invalid exclusion evidence: ${error.message}` }; }
}

export async function ownLicenseChecks(root, packageRoot, delivery) {
  const original = await readFile(join(root, 'LICENSE'));
  const targets = [{ kind: 'self-license-package', path: join(packageRoot, 'LICENSE') }];
  if (delivery) targets.push({ kind: 'self-license-delivery', path: join(delivery, 'ui-foundation/LICENSE.txt') });
  return Promise.all(targets.map(async target => {
    let actual;
    try { actual = await readFile(target.path); } catch { /* Missing is actionable. */ }
    return { kind: target.kind, source: 'LICENSE', target: target.path, sha256: sha256(original), bytes: original.length, exact: !!actual?.equals(original) };
  }));
}

async function exactAssets(root, packageRoot, delivery) {
  const results = await ownLicenseChecks(root, packageRoot, delivery);
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
  const nativeProof = await nativeExclusionProof(root, packageRoot, delivery, tarball);
  for (const [path, item] of Object.entries(packages).sort(([a], [b]) => a.localeCompare(b))) {
    if (!path) continue;
    const name = path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
    let installed;
    try { installed = await json(join(root, path, 'package.json')); } catch { /* Platform-optional packages can be absent. */ }
    const scopes = [bundled.has(path) && 'cli/checker', runtime.paths.includes(path) && 'generated-app', toolchain.paths.includes(path) && 'consumer-build-tool', !bundled.has(path) && !runtime.paths.includes(path) && !toolchain.paths.includes(path) && 'development/fixture'].filter(Boolean);
    const license = item.license ?? installed?.license ?? installed?.licenses?.map(value => value.type).join(' OR ') ?? null;
    inventory.push({ path, name, version: item.version, license, licenseMetadataSource: item.license ? 'package-lock' : installed?.license || installed?.licenses ? 'installed-package.json' : 'Unknown', integrity: item.integrity ?? null, optional: !!item.optional, installed: !!installed, installedVersionMatches: installed ? installed.version === item.version : null, scopes });
    if (!installed || (!bundled.has(path) && !runtime.paths.includes(path))) continue;
    const files = await originalNoticeFiles(join(root, path), name, item.version);
    if (!files.length) {
      const shippingGateExcluded = nativeProof.verified && name === nativeProof.name && item.version === nativeProof.version;
      noticeChecks.push({ name, version: item.version, path, file: null, status: 'Unknown', shippingGateExcluded, reason: shippingGateExcluded ? 'Original license text is Unknown. Exact platform native code is excluded from this measured shipment; see nativeExclusionProof.' : 'no recognized original license/notice text; inspect upstream source' });
      inventory.at(-1).originalLicenseStatus = 'Unknown';
    }
    for (const file of files) {
      const original = await readFile(join(root, path, file.path));
      for (const [kind, notice, selected] of [['cli', cliNotice, cli.some(p => p.name === name)], ['checker', checkerNotice, checker.some(p => p.name === name)], ['generated-app', runtimeNotice, runtime.paths.includes(path)]]) {
        if (selected) noticeChecks.push({ kind, name, version: item.version, path, file: file.path, sourceKind: file.kind, sha256: sha256(original), exact: noticeContainsOriginal(notice, name, item.version, original) });
      }
    }
  }
  const run = (args) => spawnSync('npm', args, { cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });
  const auditArgs = ['audit', '--json', '--include=dev', '--include=optional', '--include=peer', '--registry=https://registry.npmjs.org'];
  const auditResult = skipNetwork ? null : run(auditArgs);
  const security = auditResult ? { ...classifyAudit(auditResult, Object.values(packages).filter(item => item.dev).length), command: `npm ${auditArgs.join(' ')}`, exitStatus: auditResult.status, registry: 'https://registry.npmjs.org', npmVersion: run(['--version']).stdout?.trim() || null } : { status: 'Unknown', reason: 'network scan skipped' };
  const assetChecks = await exactAssets(root, packageRoot, delivery);
  const installedPaths = new Set(inventory.filter(item => item.installed).map(item => item.path));
  const runtimeMissing = classifyMissingDependencies(packages, runtime, installedPaths);
  const toolchainMissing = classifyMissingDependencies(packages, toolchain, installedPaths);
  const mismatches = inventory.filter(item => item.installedVersionMatches === false || (!item.installed && !item.optional));
  const failures = noticeChecks.filter(check => check.exact === false || (check.status === 'Unknown' && !check.shippingGateExcluded));
  const tarballBytes = tarball ? await readFile(tarball) : undefined;
  return { schemaVersion: 1, observedAt: new Date().toISOString(), node: process.version, platform: process.platform, arch: process.arch, verdictScope: 'The actual candidate/consumer shipping gate on this host only; explicitly recorded source-license and inactive optional-platform Unknowns remain Unknown.', lockSha256: sha256(lockBytes), packageRoot, delivery: delivery ?? null, tarball: tarballBytes ? { path: tarball, bytes: tarballBytes.length, sha256: sha256(tarballBytes), extractionBinding: 'Use the package verification receipt to bind this extracted directory to the tarball.' } : null, buildInventory,
    status: security.status === 'ActionRequired' || mismatches.length || failures.length || runtimeMissing.actionable.length || toolchainMissing.actionable.length || assetChecks.some(item => !item.exact) || bundleChecks.some(item => !item.exact) ? 'ActionRequired' : security.status === 'Unknown' || !delivery ? 'Unknown' : 'Verified',
    security, scopes: { bundledCli: cli, bundledChecker: checker, runtimeEngines, foundation, consumerBuildTools, consumerBuildToolClosureInstances: toolchain.paths.length, consumerBuildToolMissingDependencies: toolchain.missing, generatedAppClosureInstances: runtime.paths.length, generatedAppMissingDependencies: runtime.missing, inventoryInstances: inventory.length },
    inventory, installedMismatches: mismatches, bundleChecks, noticeChecks, assetChecks, nativeExclusionProof: nativeProof, missingDependencyDisposition: { generatedApp: runtimeMissing, consumerBuildTools: toolchainMissing },
    limits: ['Declared runtime dependency/required-peer closure is conservative; the separately bound browser metafile measures this consumer only.', 'Optional packages absent for this OS remain lock inventory, not executed tests. Inactive optional-platform missing bundled versions and licenses remain Unknown.', 'The native canvas platform package original-license text remains Unknown even if its exclusion from this exact shipment is verified.', 'npm advisory responses are time-bound and do not prove absence of unknown vulnerabilities, malicious code, or application misuse.', 'Preserved notice bytes and SPDX metadata do not establish legal compliance or select the project license.', ...(delivery ? [] : ['No final application delivery path supplied; delivery of source kit/notices is Unknown.'])] };
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
  console.log(JSON.stringify({ status: receipt.status, security: receipt.security.status, bundlePackages: receipt.scopes.bundledCli.length, runtimeClosure: receipt.scopes.generatedAppClosureInstances, noticeFailures: receipt.noticeChecks.filter(item => item.exact === false || (item.status === 'Unknown' && !item.shippingGateExcluded)).length, noticeUnknowns: receipt.noticeChecks.filter(item => item.status === 'Unknown').length, assetFailures: receipt.assetChecks.filter(item => !item.exact).length, output: resolve(output) }));
  if (receipt.status !== 'Verified') process.exitCode = 1;
}
