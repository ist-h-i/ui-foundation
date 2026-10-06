import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const names = ['tests/ui/media.spec.ts', 'tests/ui/media-regressions.spec.ts', 'tests/ui/media-lifetime.spec.ts'];
const helperName = 'tests/ui/media-test-dom.ts';
const configName = 'tsconfig.ui-media.json';
const usage = 'node scripts/verification/audit-media.mjs [--repo DIR] --baseline REF --output NEW_DIR';

function argumentsFor(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    if (!['--repo', '--baseline', '--output'].includes(flag) || result[flag] !== undefined ||
        !argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(usage);
    result[flag] = argv[index + 1];
  }
  if (!result['--baseline'] || !result['--output']) throw new Error(usage);
  return {repo: resolve(result['--repo'] ?? scriptRoot), baseline: result['--baseline'], output: resolve(result['--output'])};
}

function overlaps(left, right) {
  const within = (parent, child) => {
    const path = relative(parent, child);
    return path === '' || (path !== '..' && !path.startsWith('..' + sep) && !isAbsolute(path));
  };
  return within(left, right) || within(right, left);
}

function audit(ts, text, name) {
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const result = {titles: [], matchers: [], assertionTargets: [], explicitAny: 0,
    suppressions: (text.match(/@ts-(?:ignore|expect-error|nocheck)\b/g) ?? []).length,
    parseErrors: source.parseDiagnostics.length};
  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) result.explicitAny++;
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 'test')
        result.titles.push(node.arguments[0]?.getText(source) ?? '');
      if (ts.isPropertyAccessExpression(node.expression) && /^to[A-Z]/.test(node.expression.name.text)) {
        let receiver = node.expression.expression;
        const negated = ts.isPropertyAccessExpression(receiver) && receiver.name.text === 'not';
        if (negated) receiver = receiver.expression;
        if (ts.isCallExpression(receiver) &&
            ((ts.isIdentifier(receiver.expression) && receiver.expression.text === 'expect') ||
             (ts.isPropertyAccessExpression(receiver.expression) && ts.isIdentifier(receiver.expression.expression) &&
              receiver.expression.expression.text === 'expect' && receiver.expression.name.text === 'poll'))) {
          result.matchers.push({matcher: node.expression.name.text, negated,
            arguments: node.arguments.map(argument => argument.getText(source)),
            labels: receiver.arguments.slice(1).map(argument => argument.getText(source))});
          result.assertionTargets.push(receiver.arguments[0]?.getText(source) ?? '');
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return result;
}

function main() {
  const options = argumentsFor(process.argv.slice(2));
  if (existsSync(options.output) || (() => {try {lstatSync(options.output); return true;} catch (error) {if (error.code === 'ENOENT') return false; throw error;}})())
    throw new Error('Output already exists; refusing overwrite');
  const repo = realpathSync(options.repo);
  const outputParent = realpathSync(dirname(options.output));
  if (overlaps(repo, resolve(outputParent, relative(dirname(options.output), options.output)))) throw new Error('Repository and audit output overlap');
  const baseline = execFileSync('git', ['rev-parse', '--verify', '--end-of-options', options.baseline + '^{commit}'], {cwd: repo, encoding: 'utf8'}).trim();
  if (!/^[0-9a-f]{40,64}$/.test(baseline)) throw new Error('Baseline did not resolve to a commit');
  const require = createRequire(resolve(repo, 'package.json'));
  const ts = require('typescript');
  const files = names.map(name => {
    const before = execFileSync('git', ['show', '--no-ext-diff', '--no-textconv', baseline + ':' + name], {cwd: repo, encoding: 'utf8', maxBuffer: 8_000_000});
    const after = readFileSync(resolve(repo, name), 'utf8');
    const original = audit(ts, before, name), current = audit(ts, after, name);
    return {path: name, beforeSha256: hash(before), afterSha256: hash(after),
      titlesExact: JSON.stringify(original.titles) === JSON.stringify(current.titles),
      matcherArgumentsLabelsExact: JSON.stringify(original.matchers) === JSON.stringify(current.matchers),
      before: original, after: current,
      changedAssertionTargets: current.assertionTargets.flatMap((target, index) => target === original.assertionTargets[index] ? [] : [{index, before: original.assertionTargets[index], after: target}])};
  });
  const helperText = readFileSync(resolve(repo, helperName), 'utf8');
  const helper = audit(ts, helperText, helperName);
  const config = ts.readConfigFile(resolve(repo, configName), ts.sys.readFile);
  const parsed = config.error ? {errors: [config.error], options: {}} : ts.parseJsonConfigFileContent(config.config, ts.sys, repo, undefined, resolve(repo, configName));
  const compilerEntries = new Set((parsed.fileNames ?? []).map(name => realpathSync(name)));
  const missingCompilerSpecs = names.filter(name => !compilerEntries.has(realpathSync(resolve(repo, name))));
  const compilerSources = new Set(ts.createProgram({rootNames: parsed.fileNames ?? [], options: parsed.options})
    .getSourceFiles().map(source => realpathSync(source.fileName)));
  const missingCompilerHelper = !compilerSources.has(realpathSync(resolve(repo, helperName)));
  const strictChecks = Object.fromEntries(ts.optionDeclarations.filter(option => option.strictFlag)
    .map(option => [option.name, ts.getStrictOptionValue(parsed.options, option.name)]));
  const disabledStrictChecks = Object.keys(strictChecks).filter(name => !strictChecks[name]);
  const configSafe = parsed.errors.length === 0 && parsed.options.strict === true && parsed.options.noEmit === true &&
    !parsed.options.incremental && !parsed.options.composite && !parsed.options.noCheck &&
    missingCompilerSpecs.length === 0 && !missingCompilerHelper && disabledStrictChecks.length === 0;
  mkdirSync(options.output); // Exclusive, after input/ref checks; type/AST failures still retain actual logs.
  const compiler = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--project', configName, '--pretty', 'false', '--noEmit', '--incremental', 'false', '--noCheck', 'false'],
    {cwd: repo, encoding: 'utf8', timeout: 120_000, maxBuffer: 8_000_000});
  const stdout = compiler.stdout ?? '', stderr = (compiler.stderr ?? '') + (compiler.error ? '\n' + String(compiler.error) + '\n' : '');
  const compilerPassed = !compiler.error && compiler.signal === null && compiler.status === 0;
  const pass = files.every(file => file.titlesExact && file.matcherArgumentsLabelsExact &&
    file.before.parseErrors === 0 && file.after.parseErrors === 0 && file.after.explicitAny === 0 && file.after.suppressions === 0) &&
    helper.explicitAny === 0 && helper.suppressions === 0 && helper.parseErrors === 0 && configSafe && compilerPassed;
  const report = {schema: 1, scope: 'Selected Media specs and helper: AST baseline comparison and actual strict compiler only',
    base: baseline, requestedBaseline: options.baseline, files, helper,
    helperSha256: hash(helperText), configSha256: hash(readFileSync(resolve(repo, configName))),
    compilerVersion: ts.version, compilerOptions: {strict: parsed.options.strict, noEmit: parsed.options.noEmit,
      skipLibCheck: parsed.options.skipLibCheck, incremental: parsed.options.incremental, composite: parsed.options.composite, noCheck: parsed.options.noCheck},
    configErrors: parsed.errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')),
    missingCompilerSpecs, missingCompilerHelper, strictChecks, disabledStrictChecks,
    matcherCount: files.reduce((count, file) => count + file.after.matchers.length, 0),
    titleCount: files.reduce((count, file) => count + file.after.titles.length, 0),
    afterAny: files.reduce((count, file) => count + file.after.explicitAny, 0) + helper.explicitAny,
    compiler: {actualExit: compiler.status, signal: compiler.signal, processError: compiler.error ? String(compiler.error) : null},
    configSafe, pass, allUiSpecsScope: false, nativeTestsReexecuted: false};
  const reportBytes = JSON.stringify(report, null, 2) + '\n';
  writeFileSync(resolve(options.output, 'media-audit.json'), reportBytes, {flag: 'wx'});
  writeFileSync(resolve(options.output, 'strict.stdout.log'), stdout, {flag: 'wx'});
  writeFileSync(resolve(options.output, 'strict.stderr.log'), stderr, {flag: 'wx'});
  const receipt = {schema: 1, operation: 'media-static-and-strict-audit', createdUtc: new Date().toISOString(),
    baseline, scope: report.scope, pass, actualExit: pass ? 0 : 1,
    runtime: {node: process.version, typescript: ts.version, platform: process.platform, architecture: process.arch},
    files: [['media-audit.json', reportBytes], ['strict.stdout.log', stdout], ['strict.stderr.log', stderr]].map(([path, bytes]) =>
      ({path, bytes: Buffer.byteLength(bytes), sha256: hash(bytes)})), nativeTestsReexecuted: false, historicalApprovalRenewed: false};
  writeFileSync(resolve(options.output, 'audit-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
  process.stdout.write(JSON.stringify({pass, matcherCount: report.matcherCount, titleCount: report.titleCount, afterAny: report.afterAny, compilerActualExit: compiler.status}) + '\n');
  return pass ? 0 : 1;
}

try {process.exitCode = main();}
catch (error) {process.stderr.write('Media audit refused: ' + String(error.message ?? error) + '\n'); process.exitCode = 2;}
