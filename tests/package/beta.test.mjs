import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmod, cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { prepareCandidate, assertFrozenCandidate } from '../../scripts/package-verification/candidate.mjs';
import { run, checkoutIsolation } from '../../scripts/package-verification/run.mjs';

const repository = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
const sha = value => createHash('sha256').update(value).digest('hex');

async function snapshot(root) {
  const result = {};
  async function visit(path) {
    for (const entry of await readdir(resolve(root, path), { withFileTypes: true })) {
      const name = `${path}/${entry.name}`;
      if (entry.isDirectory()) await visit(name);
      else { assert.equal(entry.isSymbolicLink(), false, name); result[name] = sha(await readFile(resolve(root, name))); }
    }
  }
  await visit('.ui'); await visit('.agents');
  return result;
}

function assertSnapshot(actual, expected, message) {
  const changed = [...new Set([...Object.keys(actual), ...Object.keys(expected)])].filter(path => actual[path] !== expected[path]);
  assert.deepEqual(changed, [], message);
}

async function verifySkillReferences(consumer, allowedDocs) {
  const skill = resolve(consumer, '.agents/skills/project-ui');
  for (const path of ['references/docs/ui-components.md', 'references/docs/ui-library-api.json', 'references/docs/components.ja.md', 'references/docs/ui-library-consumer-guide.ja.md', 'references/docs/npm-beta-readiness.ja.md', 'references/docs/npm-beta-release-notes.ja.md', 'references/docs/commands.ja.md', 'references/examples/ui.config.example.yaml']) await readFile(resolve(skill, path));
  let checked = 0;
  const generatedDocs = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) { await visit(path); continue; }
      if (path.startsWith(`${skill}/references/docs/`)) generatedDocs.push(relative(resolve(skill, 'references'), path));
      if (!entry.name.endsWith('.md')) continue;
      for (const [, target] of (await readFile(path, 'utf8')).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
        const reference = resolve(dirname(path), target.split('#')[0]);
        assert.ok(reference.startsWith(`${skill}/`), `Skill reference leaves its package: ${path}: ${target}`);
        await readFile(reference); checked++;
      }
    }
  }
  await visit(skill);
  assert.deepEqual(generatedDocs.sort(), allowedDocs, 'isolated generated Skill documentation must match the tarball allowlist');
  assert.ok(checked > 0, 'the generated Skill must retain its operational documentation links');
  return checked;
}

test('release tarball is isolated from checkout, upgrades safely, and builds/operates a real Angular consumer', { timeout: 720_000 }, async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-foundation-release-'));
  const consumer = resolve(root, 'consumer');
  await mkdir(consumer);
  let candidate, candidateDetails, tarballDigest, finalReport;
  const evidenceBase = process.env.UI_FOUNDATION_PACKAGE_EVIDENCE;
  t.after(async () => {
    try {
      if (candidateDetails) await assertFrozenCandidate(candidateDetails);
      if (evidenceBase && candidate) {
        const evidence = resolve(evidenceBase, `package-test-${new Date().toISOString().replace(/[:.]/g, '-')}`);
        await mkdir(evidence, { recursive: true });
        await cp(candidate, resolve(evidence, 'candidate.tgz'));
        await run('tar', ['-xzf', candidate, '-C', evidence], { cwd: root, timeout: 15_000 });
        for (const [source, target] of [['public', 'dist'], ['bundle-metafile.json', 'bundle-metafile.json'], ['.ui', '.ui'], ['.agents', '.agents'], ['ui.config.yaml', 'ui.config.yaml'], ['consumer.ts', 'consumer.ts'], ['locale-adapter.ts', 'locale-adapter.ts'], ['tsconfig.json', 'tsconfig.json']]) {
          const path = resolve(consumer, source);
          try { await lstat(path); }
          catch (error) { if (error.code === 'ENOENT') continue; throw error; }
          await mkdir(resolve(evidence, 'consumer'), { recursive: true });
          await cp(path, resolve(evidence, 'consumer', target), { recursive: true });
        }
        await writeFile(resolve(evidence, 'report.json'), JSON.stringify({
          status: finalReport ? 'passed' : 'incomplete', candidate_sha256: tarballDigest, candidate_origin: candidateDetails.origin,
          node: process.version, platform: process.platform, arch: process.arch,
          smoke: finalReport ?? null,
        }, null, 2) + '\n');
        t.diagnostic(`package evidence: ${evidence}`);
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  const manifest = JSON.parse(await readFile(resolve(repository, 'package.json'), 'utf8'));
  assert.equal(manifest.private, false, 'the authorized public release candidate must explicitly enable publication');
  assert.equal(manifest.name, '@hiroshi.inoue/ui-foundation');
  assert.equal(manifest.license, 'MIT');
  assert.equal(manifest.version, '0.2.0');
  assert.deepEqual(manifest.publishConfig, { registry: 'https://registry.npmjs.org/', access: 'public', tag: 'release-candidate' });
  const ownLicense = await readFile(resolve(repository, 'LICENSE'));
  const profile = checkoutIsolation(repository);
  const execute = (file, args, cwd = consumer, timeout = 120_000) => run(file, args, { cwd, timeout, signal: t.signal });
  const isolated = (file, args, timeout = 120_000) => execute('/usr/bin/sandbox-exec', ['-p', profile, file, ...args], consumer, timeout);
  // Fail closed when the runner cannot actually deny both source and dependency
  // reads. A temp cwd, cleared NODE_PATH or successful CLI run is insufficient.
  const sentinel = await isolated(process.execPath, ['-e', `
    const fs=require('node:fs');
    for(const path of ${JSON.stringify([resolve(repository, 'package.json'), resolve(repository, 'node_modules/typescript/package.json')])}) {
      let denied=false;
      try { fs.readFileSync(path); } catch(error) { if(!['EPERM','EACCES'].includes(error.code))throw error; denied=true; }
      if(!denied)throw new Error('Checkout remains readable: '+path);
    }
    console.log('checkout-and-node_modules-denied');
  `]);
  assert.match(sentinel, /checkout-and-node_modules-denied/);
  t.diagnostic('enforced checkout and checkout/node_modules read-denial sentinel passed');
  candidateDetails = await prepareCandidate({ repository, root, execute });
  candidate = candidateDetails.tarball;
  tarballDigest = candidateDetails.sha256;
  const allowedDocs = candidateDetails.manifest.files.filter(path => path.startsWith('docs/')).sort();
  assert.ok(allowedDocs.every(path => /^docs\/[a-z0-9-]+(?:\.(?:ja|en))?\.(?:md|json)$/.test(path)), 'package documentation must use explicit filenames');
  assert.deepEqual(candidateDetails.paths.filter(path => path.startsWith('docs/')).sort(), allowedDocs, 'the isolated tarball must contain exactly the allowlisted documentation');
  assert.ok(!allowedDocs.some(path => /(?:adr|verification|development|implementation-plan|release-plan|matrix)/.test(path)), 'developer documentation must not be distributed');
  await writeFile(resolve(consumer, 'package.json'), '{"private":true,"type":"module"}');
  const install = tarball => isolated('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--no-save', tarball]);
  await install(candidate);
  const installed = resolve(consumer, 'node_modules', manifest.name);
  assert.equal((await lstat(installed)).isSymbolicLink(), false);
  const installedManifest = JSON.parse(await readFile(resolve(installed, 'package.json'), 'utf8'));
  assert.deepEqual(installedManifest, candidateDetails.manifest, 'npm must preserve the candidate metadata');
  const cli = (...args) => isolated(process.execPath, [resolve(installed, 'dist/cli.js'), ...args]);
  await cli('init');
  assert.match(await cli('sync', '--dry-run'), /Dry run: no files written/);
  await assert.rejects(readFile(resolve(consumer, '.ui/generated/manifest.json')), { code: 'ENOENT' });
  await mkdir(resolve(consumer, 'src'));
  await writeFile(resolve(consumer, 'src/application.ts'), 'export const consumerApplication = true;\n');
  await cli('sync');
  for (const path of ['node_modules/' + manifest.name + '/LICENSE', '.ui/generated/UI-FOUNDATION-LICENSE.txt', '.agents/skills/project-ui/UI-FOUNDATION-LICENSE.txt']) {
    assert.deepEqual(await readFile(resolve(consumer, path)), ownLicense, path);
  }
  assert.equal(JSON.parse(await cli('check', '--format', 'json')).valid, true);
  const skillReferences = await verifySkillReferences(consumer, allowedDocs);
  const candidateState = await snapshot(consumer);

  async function publicTarball(version, integrity) {
    const [pack] = JSON.parse(await execute('npm', [
      'pack', `${manifest.name}@${version}`, '--json', '--ignore-scripts', '--pack-destination', root,
    ], root));
    const path = resolve(root, pack.filename);
    const digest = createHash('sha512').update(await readFile(path)).digest('base64');
    assert.equal(`sha512-${digest}`, integrity, version);
    return path;
  }

  const predecessor = '0.1.0-beta.4';
  const previousTarball = await publicTarball(predecessor, 'sha512-7UbBKngs68d6qsf2q8jHFT+I4oauJ/cu7mHeJFDQ6+KTv6BOeAtvrzOVmfRMgtPwH09DvIbcelMeFcHFrMixUQ==');
  await install(previousTarball);
  await cli('sync');
  await cli('check');
  const previousState = await snapshot(consumer);
  const previousConfig = await readFile(resolve(consumer, 'ui.config.yaml'));
  const retiredEntries = [
    '.agents/skills/project-ui/SKILL.en.md',
    '.agents/skills/project-ui/SKILL.ja.md',
    '.ui/generated/angular/locale-en.ts',
    '.ui/generated/angular/locale-ja.ts',
  ];
  const editedSkill = resolve(consumer, retiredEntries[1]);
  const ownedSkill = await readFile(editedSkill, 'utf8');
  await writeFile(editedSkill, `${ownedSkill}\nConsumer-owned notes.\n`);
  await install(candidate);
  const editedState = await snapshot(consumer);
  await assert.rejects(cli('sync'), /conflict|manually|edited/i);
  assertSnapshot(await snapshot(consumer), editedState, 'retiring an edited legacy Skill must preserve all prior files');
  await writeFile(editedSkill, ownedSkill);
  const dryRun = await cli('sync', '--dry-run');
  for (const entry of retiredEntries) assert.ok(dryRun.includes(entry), dryRun);
  assertSnapshot(await snapshot(consumer), previousState, 'dry run must preserve the previous output');
  await cli('sync');
  for (const entry of retiredEntries) await assert.rejects(readFile(resolve(consumer, entry)), { code: 'ENOENT' });
  await cli('check');
  assertSnapshot(await snapshot(consumer), candidateState, 'upgrading beta.4 must produce the candidate-owned files');
  await install(previousTarball);
  await cli('sync');
  await cli('check');
  assertSnapshot(await snapshot(consumer), previousState, 'rolling back to beta.4 must restore its owned files');
  assert.deepEqual(await readFile(resolve(consumer, 'ui.config.yaml')), previousConfig);
  assert.equal(await readFile(resolve(consumer, 'src/application.ts'), 'utf8'), 'export const consumerApplication = true;\n');
  t.diagnostic(`public ${predecessor} → candidate → ${predecessor}: reviewed retirement, edited Skill protection, and output rollback passed`);

  const beta5 = await publicTarball('0.1.0-beta.5', 'sha512-QG2sL9xtgi34yXl2009PbgoUMo4j46v/x+shbBobtYiZ4ZUKWnp6eXEv7dZ3u5JHwJRYp6QeURvchoawfHTA5w==');
  await install(beta5);
  await cli('sync');
  await cli('check');
  const beta5State = await snapshot(consumer);
  const formsEntry = '.ui/generated/angular/forms.ts';
  assert.equal(Object.hasOwn(beta5State, formsEntry), false);
  await install(candidate);
  assert.ok((await cli('sync', '--dry-run')).includes(formsEntry));
  assertSnapshot(await snapshot(consumer), beta5State, 'previewing the Angular upgrade must preserve beta.5');
  await cli('sync');
  await cli('check');
  assertSnapshot(await snapshot(consumer), candidateState, 'upgrading beta.5 must generate the candidate-owned files');
  await install(beta5);
  await cli('sync');
  await cli('check');
  assertSnapshot(await snapshot(consumer), beta5State, 'rolling back the Angular upgrade must restore beta.5');
  assert.deepEqual(await readFile(resolve(consumer, 'ui.config.yaml')), previousConfig);
  await install(candidate);
  await cli('sync');
  t.diagnostic('public beta.5 → candidate → beta.5: new forms entry, config preservation and rollback passed');

  // These private, unpublished tarballs model a real differing-version upgrade.
  // Their metadata and explicit template delta never modify the candidate.
  async function versionFixture(version, changed) {
    const directory = resolve(root, version); await mkdir(directory);
    await execute('tar', ['-xzf', candidate, '-C', directory]);
    const source = resolve(directory, 'package');
    await writeFile(resolve(source, 'package.json'), JSON.stringify({ ...installedManifest, version, private: true }));
    if (changed) {
      const path = resolve(source, 'templates/angular/text-input.ts');
      await writeFile(path, `${await readFile(path, 'utf8')}\n// Private synthetic beta upgrade fixture B.\n`);
      await writeFile(resolve(source, 'templates/angular/beta-upgrade.ts'), 'export const privateSyntheticUpgrade = true;\n');
      const skill = resolve(source, 'skills/ui-development/SKILL.md');
      await writeFile(skill, `${await readFile(skill, 'utf8')}\nPrivate synthetic upgrade fixture B.\n`);
    }
    const [fixture] = JSON.parse(await execute('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', directory], source));
    return resolve(directory, fixture.filename);
  }
  const versionA = '0.0.0-beta.package-test.1', versionB = '0.0.0-beta.package-test.2';
  const a = await versionFixture(versionA, false), b = await versionFixture(versionB, true);
  await install(a); await cli('sync');
  assert.equal(JSON.parse(await readFile(resolve(installed, 'package.json'), 'utf8')).version, versionA);
  const baseline = await snapshot(consumer);
  const original = await readFile(resolve(consumer, '.ui/generated/tokens.css'), 'utf8');
  await writeFile(resolve(consumer, '.ui/generated/tokens.css'), `${original}\n/* consumer manual edit */\n`);
  await install(b);
  assert.equal(JSON.parse(await readFile(resolve(installed, 'package.json'), 'utf8')).version, versionB);
  let protectedState = await snapshot(consumer);
  await assert.rejects(cli('sync'), /conflict|manually|edited/i);
  assertSnapshot(await snapshot(consumer), protectedState, 'upgrade must preserve edited output');
  await writeFile(resolve(consumer, '.ui/generated/tokens.css'), original);
  const collision = resolve(consumer, '.ui/generated/angular/beta-upgrade.ts');
  await writeFile(collision, 'application-owned content\n');
  protectedState = await snapshot(consumer);
  await assert.rejects(cli('sync'), /conflict|unowned|owned/i);
  assertSnapshot(await snapshot(consumer), protectedState, 'upgrade must preserve unowned collisions');
  await rm(collision);
  assert.notEqual(process.getuid?.(), 0, 'rollback permission fixture requires a non-root user');
  protectedState = await snapshot(consumer);
  const output = resolve(consumer, '.ui/generated');
  await chmod(output, 0o555);
  try { await assert.rejects(cli('sync'), /EACCES|permission denied/i); }
  finally { await chmod(output, 0o755); }
  assertSnapshot(await snapshot(consumer), protectedState, 'ordinary I/O failure must roll back every generated/skill byte');
  await cli('sync');
  assert.match(await readFile(resolve(consumer, '.ui/generated/angular/text-input.ts'), 'utf8'), /synthetic beta upgrade fixture B/);
  assert.equal(JSON.parse(await cli('check', '--format', 'json')).valid, true);
  await install(a); await cli('sync');
  assertSnapshot(await snapshot(consumer), baseline, 'reinstalling version A and resyncing must restore original owned output');
  await install(candidate); await cli('sync');
  assert.equal(JSON.parse(await readFile(resolve(installed, 'package.json'), 'utf8')).version, manifest.version);
  assertSnapshot(await snapshot(consumer), candidateState, 'the actual candidate must recover its own versioned manifest and output');
  t.diagnostic(`private synthetic ${versionA} → ${versionB} → ${versionA}: edited/unowned protection, ordinary I/O rollback and recovery passed`);

  // Resolve the consumer runtime from the root lock, then install the tarball
  // into that independent tree. No dependency is linked to the source checkout.
  const lock = JSON.parse(await readFile(resolve(repository, 'package-lock.json'), 'utf8'));
  const devDependencies = { ...manifest.devDependencies };
  delete devDependencies.tailwindcss;
  delete devDependencies['@tailwindcss/cli'];
  const runtimeManifest = { name: 'private-beta-package-consumer', version: '0.0.0', private: true, type: 'module', devDependencies };
  lock.name = runtimeManifest.name; lock.version = runtimeManifest.version;
  lock.packages[''] = { ...lock.packages[''], name: runtimeManifest.name, version: runtimeManifest.version, devDependencies };
  delete lock.packages[''].bin;
  await writeFile(resolve(consumer, 'package.json'), JSON.stringify(runtimeManifest));
  await writeFile(resolve(consumer, 'package-lock.json'), JSON.stringify(lock));
  await isolated('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], 180_000);
  await install(candidate);
  for (const name of ['tailwindcss', '@tailwindcss/cli']) {
    await assert.rejects(lstat(resolve(consumer, 'node_modules', name)), { code: 'ENOENT' });
  }
  const typescript = resolve(consumer, 'node_modules/typescript');
  assert.equal((await lstat(typescript)).isSymbolicLink(), false);
  assert.ok(!(await realpath(typescript)).startsWith(repository));
  await cli('check');
  for (const [source, target] of [['consumer.ts', 'consumer.ts'], ['consumer-smoke.mjs', 'consumer-smoke.mjs']]) {
    await cp(resolve(repository, 'scripts/package-verification', source), resolve(consumer, target));
  }
  await cp(resolve(installed, 'skills/ui-development/references/examples/locale-adapter.ts'), resolve(consumer, 'locale-adapter.ts'));
  await writeFile(resolve(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', lib: ['ES2022', 'DOM'], strict: true, experimentalDecorators: true, skipLibCheck: true, noEmitOnError: true, rootDir: '.', outDir: 'compiled' },
    angularCompilerOptions: { strictTemplates: true, strictInjectionParameters: true, compilationMode: 'full' },
    include: ['.ui/generated/angular/**/*.ts', 'consumer.ts'],
  }));
  await isolated(process.execPath, [resolve(consumer, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js'), '-p', 'tsconfig.json'], 180_000);
  const smoke = JSON.parse(await isolated(process.execPath, ['consumer-smoke.mjs', manifest.name], 180_000));
  assert.deepEqual(await readFile(resolve(consumer, 'public/ui-foundation/LICENSE.txt')), ownLicense);
  assert.equal(smoke.stylesWithoutTailwind, true);
  assert.equal(smoke.strictAot, true); assert.equal(smoke.englishWithoutLocaleProvider, true); assert.equal(smoke.inputAndProfileRetention, true);
  assert.equal(smoke.lazyLocaleAdapter, true);
  assert.equal(smoke.sheetCalculation, true); assert.equal(smoke.pdfCanvas, true); assert.equal(smoke.mapCanvas, true);
  assert.ok(smoke.servedAssetHashes > 20);
  const metafileBytes = await readFile(resolve(consumer, 'bundle-metafile.json'));
  const metafile = JSON.parse(metafileBytes);
  assert.equal(smoke.bundle.metafile, 'consumer/bundle-metafile.json');
  assert.equal(smoke.bundle.metafile_sha256, sha(metafileBytes));
  assert.equal(smoke.bundle.delivery_root, 'consumer/dist');
  const inputs = Object.keys(metafile.inputs).sort();
  assert.ok(inputs.length > 0, 'actual esbuild input evidence is required');
  assert.equal(smoke.bundle.input_count, inputs.length);
  assert.equal(smoke.bundle.input_paths_sha256, sha(JSON.stringify(inputs)));
  const canvasInputs = inputs.filter(path => /(?:^|\/)@napi-rs\/canvas(?:[-/]|$)/.test(path));
  const nativeInputs = inputs.filter(path => path.endsWith('.node'));
  assert.deepEqual(canvasInputs, [], 'native canvas exclusion must follow the actual bundle inputs');
  assert.deepEqual(nativeInputs, [], 'actual bundle inputs must not contain native addons');
  assert.deepEqual(smoke.bundle.optional_native_exclusion, {
    package_family: '@napi-rs/canvas*', scope: 'this-esbuild-browser-bundle-inputs-only',
    canvas_inputs: canvasInputs, native_addon_inputs: nativeInputs, license_status: 'Unknown',
  });
  const outputs = [];
  const delivery = resolve(consumer, 'public');
  for (const path of Object.keys(metafile.outputs).sort()) {
    const destination = resolve(consumer, path);
    const deliveryPath = relative(delivery, destination);
    assert.ok(deliveryPath && !isAbsolute(deliveryPath) && deliveryPath !== '..' && !deliveryPath.startsWith('../'), `metafile output must be inside the delivered app: ${path}`);
    const bytes = await readFile(destination);
    assert.equal(bytes.length, metafile.outputs[path].bytes, path);
    outputs.push({ path, delivery_path: deliveryPath, bytes: bytes.length, sha256: sha(bytes) });
  }
  assert.ok(outputs.length > 0, 'the bundle must contain emitted files');
  assert.deepEqual(smoke.bundle.outputs, outputs, 'the report must bind every emitted output to its actual delivery bytes');
  finalReport = { ...smoke, skillReferences };
  await assertFrozenCandidate(candidateDetails);
  t.diagnostic(`candidate origin=${candidateDetails.origin} sha256=${tarballDigest}; ${JSON.stringify(smoke)}`);
});
