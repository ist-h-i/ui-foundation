import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, cp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { stringify } from 'yaml';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';
import { cropBoundsError, positiveMediaNumber, comparePosition } from '../../templates/angular/media-model.ts';
import { splitterBounds } from '../../templates/angular/layout-model.ts';
import { panelSize, sheetStages } from '../../templates/angular/floating-model.ts';
import { displayInteger } from '../../templates/angular/display-model.ts';
import { parseColor } from '../../templates/angular/choice-model.ts';
import { createTableState, tableConfigurationError } from '../../templates/angular/table-model.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const historicalEvidence = resolve(root, 'tests/fixtures/static-checks/warning-disposition');
const evidence = resolve(root, 'tests/fixtures/static-checks/warning-implementation/newphase');
const currentEvidence = resolve(root, 'tests/fixtures/static-checks/seven-candidates/purpose');
const example = await readFile(resolve(root, 'examples/ui.config.repository.yaml'), 'utf8');
interface Diagnostic {file:string;line:number;column:number;rule:string;source:string;severity:string}
interface Approval {id:string;origin:'legacy'|'candidate';exception:{file:string;line:number;column:number;rule:string;source:string;reason:string};proof_sha256:Record<string,string>}
interface CurrentAudit {
  sites: Record<string, Diagnostic & {exception: string}>;
  dependencies: Record<string, {prior_sha256:string;current_sha256:string;judgment:string}>;
}
const proof = JSON.parse(await readFile(resolve(currentEvidence, 'purpose-proof-current.json'), 'utf8'));
const approvals: Approval[] = proof.current_purpose_proofs;
const candidates = JSON.parse(await readFile(resolve(evidence, 'candidate-purpose-audit.json'), 'utf8')).records as {id:string; baseline_diagnostic:Diagnostic; match_source:string}[];
const originalCandidates = JSON.parse(await readFile(resolve(evidence,'../baseline-classification.json'),'utf8')).records.filter((x: {bucket:string}) => x.bucket === 'reasoned_exception_candidate') as {id:string; diagnostic:Diagnostic; reason_ja:string}[];
const historicalApprovals: Approval[] = JSON.parse(await readFile(resolve(historicalEvidence, 'approved-exceptions.json'), 'utf8')).records;
const baseline: Diagnostic[] = JSON.parse(await readFile(resolve(historicalEvidence, 'baseline-check.json'), 'utf8')).source.diagnostics;
const historicalSites: Diagnostic[] = JSON.parse(await readFile(resolve(currentEvidence, 'purpose-sites-current.json'), 'utf8')).diagnostics;
const messageAuditBytes = await readFile(resolve(currentEvidence, 'message-migration-reaudit.json'));
const messageAudit: CurrentAudit = JSON.parse(messageAuditBytes.toString('utf8'));
const angularAuditBytes = await readFile(resolve(currentEvidence, 'angular-22-reaudit.json'));
const angularAudit: CurrentAudit & {prior_audit_sha256:string} = JSON.parse(angularAuditBytes.toString('utf8'));
const iconAuditBytes = await readFile(resolve(currentEvidence, 'generated-icon-reaudit.json'));
const iconAudit: CurrentAudit & {prior_audit_sha256:string} = JSON.parse(iconAuditBytes.toString('utf8'));
const layoutAuditBytes = await readFile(resolve(currentEvidence, 'layout-entry-reaudit.json'));
const layoutAudit: Pick<CurrentAudit, 'dependencies'> & {
  prior_audit_sha256: string;
  positions: Record<string, Pick<Diagnostic, 'line' | 'column'>>;
} = JSON.parse(layoutAuditBytes.toString('utf8'));
const formAuditBytes = await readFile(resolve(currentEvidence, 'form-dictionary-reaudit.json'));
const formAudit: {
  prior_audit_sha256: string;
  site: Pick<Diagnostic, 'file' | 'line' | 'column'>;
  dependency: {prior_file: string; prior_sha256: string; current_sha256: string; judgment: string};
} = JSON.parse(formAuditBytes.toString('utf8'));
const actionAppearanceAudit: CurrentAudit & {prior_audit_sha256:string} = JSON.parse(
  await readFile(resolve(currentEvidence, 'action-appearance-reaudit.json'), 'utf8'),
);
const typographyAudit: Pick<CurrentAudit, 'dependencies'> & {
  prior_purpose_audit_sha256: string;
  positions: Record<string, Pick<Diagnostic, 'line' | 'column'>>;
} = JSON.parse(await readFile(resolve(currentEvidence, 'typography-reaudit.json'), 'utf8'));
const formAppearanceAudit: CurrentAudit & {prior_audit_sha256: string} =
  JSON.parse(await readFile(resolve(currentEvidence, 'form-appearance-reaudit.json'), 'utf8'));
const currentSites = {...messageAudit.sites, ...angularAudit.sites, ...iconAudit.sites};
for (const [id, {line, column}] of Object.entries({...layoutAudit.positions, ...typographyAudit.positions})) {
  assert.ok(currentSites[id], `${id}: missing previously reviewed site`);
  currentSites[id] = {...currentSites[id], line, column};
}
currentSites.D146 = {...currentSites.D146, ...formAudit.site};
Object.assign(currentSites, actionAppearanceAudit.sites);
for (const [id, site] of Object.entries(formAppearanceAudit.sites)) {
  const priorSite = currentSites[id];
  assert.ok(priorSite, `${id}: missing reviewed site before the form appearance change`);
  for (const key of ['file', 'rule', 'severity', 'exception'] as const) assert.equal(site[key], priorSite[key], id);
  currentSites[id] = site;
}
const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
function currentProofFile(item: Pick<Approval, 'id'>, path: string): string {
  return item.id === 'D146' && path === formAudit.dependency.prior_file ? formAudit.site.file : path;
}
async function validateProofDependencies(item: Pick<Approval, 'id' | 'proof_sha256'>, directory = root): Promise<void> {
  for (const [file, hash] of Object.entries(item.proof_sha256)) {
    let reviewedHash = hash;
    for (const audit of [messageAudit, angularAudit, iconAudit, layoutAudit, typographyAudit, actionAppearanceAudit]) {
      const update = audit.dependencies[file];
      if (!update) continue;
      assert.equal(update.prior_sha256, reviewedHash, `${item.id}: re-audit must match the prior proof dependency`);
      assert.ok(update.judgment.trim(), `${item.id}: changed dependency requires a purpose judgment`);
      reviewedHash = update.current_sha256;
    }
    const currentFile = currentProofFile(item, file);
    if (currentFile !== file) {
      assert.equal(formAudit.dependency.prior_sha256, reviewedHash, 'D146: relocation must start from the previous proof');
      assert.ok(formAudit.dependency.judgment.trim(), 'D146: relocation requires a purpose judgment');
      reviewedHash = formAudit.dependency.current_sha256;
    }
    const appearanceUpdate = formAppearanceAudit.dependencies[currentFile];
    if (appearanceUpdate) {
      assert.equal(appearanceUpdate.prior_sha256, reviewedHash, `${item.id}: form appearance audit must match the prior proof dependency`);
      assert.ok(appearanceUpdate.judgment.trim(), `${item.id}: changed form dependency requires a purpose judgment`);
      reviewedHash = appearanceUpdate.current_sha256;
    }
    assert.equal(sha256(await readFile(resolve(directory, currentFile))), reviewedHash,
      `${item.id}: producer/helper changed; re-audit its purpose before refreshing this proof`);
  }
}

function validateAdmittedSite(config: ReturnType<typeof parseConfig>, id: string, original: {
  file: string; rule: string; source: string; reason: string; line?: number; column?: number;
}, severity: 'warning' | 'error') {
  const site = currentSites[id];
  assert.ok(site, `${id}: current checker evidence required`);
  const file = currentProofFile({id}, original.file);
  assert.equal(site.file, file);
  assert.equal(site.rule, original.rule);
  assert.equal(site.severity, severity, `${id}: the re-audit cannot change the admitted severity`);
  assert.ok(site.source.includes(original.source), `${id}: retain the same matching source`);
  assert.equal(site.exception, original.reason, `${id}: retain the original purpose`);
  assert.equal(config.checks!.exceptions.filter(x => x.file === file && x.rule === original.rule
    && x.source === original.source && x.reason === original.reason
    && x.line === (original.line === undefined ? undefined : site.line)
    && x.column === (original.column === undefined ? undefined : site.column)).length, 1, id);
}

test('project exceptions retain one-site scope, legacy purposes and separately reviewed candidate IDs', async () => {
  const config = parseConfig(example);
  assert.equal(sha256(formAuditBytes), typographyAudit.prior_purpose_audit_sha256, 'historical form dictionary audit changed for Typography');
  assert.equal(sha256(formAuditBytes), actionAppearanceAudit.prior_audit_sha256, 'historical form dictionary audit changed');
  assert.equal(sha256(formAuditBytes), formAppearanceAudit.prior_audit_sha256, 'historical form dictionary audit changed');
  assert.equal(sha256(layoutAuditBytes), formAudit.prior_audit_sha256, 'historical layout entry audit changed');
  assert.equal(sha256(iconAuditBytes), layoutAudit.prior_audit_sha256, 'historical generated-icon audit changed');
  assert.equal(sha256(angularAuditBytes), iconAudit.prior_audit_sha256, 'historical Angular 22 audit changed');
  assert.equal(sha256(messageAuditBytes), angularAudit.prior_audit_sha256, 'historical message-migration audit changed');
  assert.equal(new Set(approvals.map(item => item.id)).size, approvals.length);
  assert.equal(approvals.filter(item => item.origin === 'legacy').length, 32);
  assert.equal(proof.candidate_decisions.length, 32);
  assert.deepEqual(new Set(candidates.map(x=>x.id)),new Set(originalCandidates.map(x=>x.id)));
  for (const candidate of candidates) {
    const original = originalCandidates.find(x=>x.id===candidate.id)!;
    assert.deepEqual(candidate.baseline_diagnostic,original.diagnostic, `${candidate.id}: immutable baseline site`);
    assert.ok(original.diagnostic.source.includes(candidate.match_source), `${candidate.id}: narrow matcher must name the reviewed source`);
  }
  assert.equal(sha256(await readFile(resolve(root,proof.source_report))),proof.source_report_sha256, 'frozen current diagnostic report changed');
  assert.deepEqual(new Set(proof.candidate_decisions.map((item: {id:string}) => item.id)), new Set(candidates.map(item => item.id)));
  for (const item of approvals) {
    const e = item.exception;
    assert.equal(e.rule, 'unresolved');
    assert.ok(e.reason.startsWith(`[${item.id}] `));
    if (item.origin === 'legacy') {
      const original = historicalApprovals.find(x => x.id === item.id)!.exception;
      const matches = baseline.filter(d => d.file === original.file && d.line === original.line && d.column === original.column && d.rule === original.rule && d.source.includes(original.source));
      assert.equal(matches.length, 1, item.id);
      assert.equal(matches[0].severity, 'warning');
      for (const key of ['file', 'rule', 'source', 'reason'] as const) assert.equal(e[key], original[key], `${item.id}: legacy purpose may not be silently broadened`);
    } else {
      const candidate = candidates.find(x => x.id === item.id)!;
      assert.ok(candidate, `${item.id}: not a reviewed E32 candidate`);
      assert.equal(e.file, candidate.baseline_diagnostic.file);
      assert.equal(e.source, candidate.match_source);
      assert.equal(e.line, candidate.baseline_diagnostic.line);
      assert.equal(e.column, candidate.baseline_diagnostic.column);
      const original = originalCandidates.find(x=>x.id===item.id)!;
      assert.equal(e.reason, `[${item.id}] ${original.reason_ja} 用途限定の例外であり、実寸法・描画・操作全体の合格を示さない。`);
      assert.equal(proof.candidate_decisions.find((x: {id:string}) => x.id === item.id).disposition, 'reasoned_exception');
    }
    const matches = historicalSites.filter(d => d.file === e.file && d.line === e.line && d.column === e.column && d.rule === e.rule && d.source.includes(e.source));
    assert.equal(matches.length, 1, `${item.id}: frozen reviewed source site`);
    assert.equal(matches[0].severity, 'warning', `${item.id}: a purpose may not suppress a literal error`);
    validateAdmittedSite(config, item.id, e, 'warning');
    await validateProofDependencies(item);
  }
  for (const decision of proof.candidate_decisions.filter((x: {disposition:string}) => x.disposition !== 'reasoned_exception')) {
    assert.ok(!config.checks!.exceptions.some(x => x.reason.startsWith(`[${decision.id}] `)), `${decision.id}: no unnecessary exception`);
  }
});

test('the checker retains all reviewed display, layout and splitter exceptions after relocating the focus helper', async () => {
  const input = parseConfig(example);
  const files = Object.keys(layoutAudit.dependencies);
  const ids = Object.keys(layoutAudit.positions);
  const reasons = new Set(ids.map(id => currentSites[id].exception));
  const exceptions = input.checks!.exceptions.filter(exception => reasons.has(exception.reason));
  input.checks = {source_roots: files, approved_components: [], exceptions};
  const config = resolveConfig(input);
  const report = await checkSources({root, config, policy: createSourcePolicy(config)});
  assert.equal(report.exceptions.length, ids.length);
  for (const id of ids) {
    const expected = currentSites[id];
    const matches = report.exceptions.filter(diagnostic => diagnostic.exception === expected.exception);
    assert.equal(matches.length, 1, id);
    assert.partialDeepStrictEqual(matches[0], expected, id);
  }
});

test('the checker admits the reviewed Angular and form appearance sites and rejects stale textarea positions', async t => {
  const fixture = await mkdtemp(resolve(tmpdir(), 'ui-angular-purpose-'));
  t.after(() => rm(fixture, {recursive:true, force:true}));
  const appearanceFiles = Object.keys(formAppearanceAudit.dependencies).sort();
  assert.deepEqual(appearanceFiles, ['templates/angular/choice-controls.ts', 'templates/angular/selection-input.ts', 'templates/angular/text-controls.ts']);
  const appearanceSites = approvals.filter(item => Object.keys(item.proof_sha256).some(file => appearanceFiles.includes(currentProofFile(item, file))));
  assert.deepEqual(appearanceSites.map(item => item.id).sort(), ['D012', 'D131', 'D146', 'R159']);
  assert.deepEqual(Object.keys(formAppearanceAudit.sites).sort(), appearanceSites.map(item => item.id).sort());
  const reviewed = approvals.filter(item =>
    appearanceSites.includes(item) || Object.keys(item.proof_sha256).some(file => file in angularAudit.dependencies));
  assert.deepEqual(reviewed.map(item => item.id).sort(), ['D012', 'D131', 'D146', 'D153', 'D158', 'R159', 'R184', 'R186']);
  const input = parseConfig(example);
  const exceptions = input.checks!.exceptions.filter(e => reviewed.some(item => item.exception.reason === e.reason));
  const previousTextarea = angularAudit.sites.D146;
  const files = [...new Set([...exceptions.map(e => e.file), previousTextarea.file])];
  for (const file of files) {
    const target = resolve(fixture, file);
    await mkdir(resolve(target,'..'), {recursive:true});
    await cp(resolve(root, file), target);
  }
  input.checks = {source_roots:files, approved_components:[], exceptions};
  const scan = () => {
    const config = resolveConfig(input);
    return checkSources({root:fixture, config, policy:createSourcePolicy(config)});
  };
  const admitted = await scan();
  assert.equal(admitted.exceptions.length, reviewed.length);
  for (const item of reviewed) {
    const matches = admitted.exceptions.filter(d => d.exception === item.exception.reason);
    assert.equal(matches.length, 1, item.id);
    assert.partialDeepStrictEqual(matches[0], currentSites[item.id], item.id);
  }

  const {exception:reason, ...warning} = currentSites.D146;
  const textarea = exceptions.find(e => e.reason === reason)!;
  for (const {file, line, column} of [previousTextarea, formAudit.site]) {
    Object.assign(textarea, {file, line, column});
    const stale = await scan();
    assert.ok(stale.diagnostics.some(d => d.file === file && d.rule === 'exception-error' && d.source === textarea.source));
    const unapproved = stale.diagnostics.filter(d => d.file === warning.file && d.line === warning.line && d.column === warning.column && d.rule === warning.rule);
    assert.equal(unapproved.length, 1);
    assert.partialDeepStrictEqual(unapproved[0], warning);
    assert.equal(stale.exceptions.length, reviewed.length - 1);
  }
});

test('the table actions fixture retains the one reviewed resize width site', async () => {
  const {exception:reason, ...warning} = actionAppearanceAudit.sites.D175;
  const input = parseConfig(example);
  const exceptions = input.checks!.exceptions.filter(exception => exception.reason === reason);
  assert.equal(exceptions.length, 1);
  input.checks = {source_roots:[warning.file], approved_components:[], exceptions};

  const scan = () => {
    const config = resolveConfig(input);
    return checkSources({root, config, policy:createSourcePolicy(config)});
  };
  const admitted = await scan();
  assert.equal(admitted.exceptions.length, 1);
  assert.partialDeepStrictEqual(admitted.exceptions[0], actionAppearanceAudit.sites.D175);

  const exception = exceptions[0];
  exception.column = warning.column + 1;
  const stale = await scan();
  assert.equal(stale.exceptions.length, 0);
  assert.ok(stale.diagnostics.some(d => d.file === exception.file && d.rule === 'exception-error' && d.source === exception.source));
  const unapproved = stale.diagnostics.filter(d =>
    d.file === warning.file && d.rule === warning.rule && d.line === warning.line && d.column === warning.column);
  assert.equal(unapproved.length, 1);
  assert.partialDeepStrictEqual(unapproved[0], warning);
});

test('the actual proof dependency validator rejects changed producer and helper files', async t => {
  const temporary = await mkdtemp(resolve(tmpdir(), 'ui-purpose-proof-'));
  t.after(() => rm(temporary, { recursive:true, force:true }));
  const covered = new Set<string>();
  for (const item of approvals) {
    for (const previousFile of Object.keys(item.proof_sha256)) {
      const file = currentProofFile(item, previousFile);
      if (covered.has(file)) continue;
      covered.add(file);
      const target = resolve(temporary,file);
      await mkdir(resolve(target,'..'), {recursive:true});
      await cp(resolve(root,file),target);
    }
  }
  for (const item of approvals) await validateProofDependencies(item, temporary);
  for (const file of covered) {
    const target = resolve(temporary,file), original = await readFile(target);
    // A same-length edit exercises the content hash, independent of sink source/position.
    const mutated = Buffer.from(original); mutated[0] = mutated[0] === 32 ? 33 : 32;
    await writeFile(target,mutated);
    const dependent = approvals.find(item => Object.keys(item.proof_sha256).some(previousFile => currentProofFile(item, previousFile) === file))!;
    await assert.rejects(validateProofDependencies(dependent,temporary), /producer\/helper changed/);
    await writeFile(target,original);
  }
  assert.ok(covered.size > 1, 'multiple actual producer/helper dependencies were exercised');
});

test('reviewed purpose helpers reject invalid data at their actual guard boundaries', () => {
  for (const value of [0,-1,NaN,Infinity,'12px']) assert.throws(() => panelSize(value as number));
  assert.equal(panelSize(null),null); assert.equal(panelSize(12),12);
  for (const values of [[],[0],[2],[.5,.4],[NaN],[Infinity]]) assert.throws(() => sheetStages(values,0));
  assert.equal(sheetStages([.25,.5,1],1),.5);
  assert.throws(() => sheetStages([.5,1],2));
  for (const value of [0,101,1.5,NaN,Infinity,'3']) assert.throws(() => displayInteger(value as number,'lines',1,100));
  for (const value of ['var(--ui-color-text)','url(https://example.test/a)','red; color: blue','rgb(Infinity 0 0)','#ggg']) assert.equal(parseColor(value),null);
  for (const value of ['#f00','rgb(255, 0, 0)','hsl(0 100% 50%)']) assert.ok(parseColor(value));
  const bounds = {x1:0,y1:0,x2:50,y2:25};
  assert.equal(cropBoundsError(bounds,100,50,2),null);
  for (const [width,height] of [[0,50],[100,0],[Infinity,50],[100,NaN]]) assert.ok(cropBoundsError(bounds,width,height));
  for (const invalid of [{...bounds,x1:-1},{...bounds,x2:101},{...bounds,y2:NaN},{...bounds,x2:0}]) assert.ok(cropBoundsError(invalid,100,50));
  const rows=[{id:1}], columns=[{id:'id',field:'id' as const,header:'ID',minWidth:80,maxWidth:300}];
  assert.equal(tableConfigurationError(rows,columns,'id',createTableState()),null);
  for (const width of [0,-1,NaN,Infinity,'80px']) {
    assert.ok(tableConfigurationError(rows,[{...columns[0],width:width as number}],'id',createTableState()));
    assert.ok(tableConfigurationError(rows,columns,'id',{...createTableState(),columnWidths:{id:width as number}}));
  }
  assert.ok(tableConfigurationError(rows,[{...columns[0],minWidth:301}],'id',createTableState()));
});

test('ratio and comparison data guards reject CSS payloads and nonfinite/range failures', () => {
  for (const value of [0, -1, NaN, Infinity, -Infinity, 'var(--ui-p-blue)', '12px', null]) {
    assert.throws(() => positiveMediaNumber(value as number, 'ratio'), String(value));
  }
  for (const value of [0.5, 1, 16 / 9]) assert.equal(positiveMediaNumber(value, 'ratio'), value);
  for (const value of [-1, 101, NaN, Infinity, 'var(--ui-space-page)']) assert.throws(() => comparePosition(value as number));
  for (const value of [0, 0.5, 50, 100]) assert.equal(comparePosition(value), value);
});

test('splitter flex coefficients remain finite within the structural interval', () => {
  for (const value of [-100, 0, 50, 100, 200]) {
    const primary = splitterBounds(0, 100, value), secondary = 100 - primary;
    assert.ok(Number.isFinite(primary) && primary >= 0 && primary <= 100);
    assert.ok(Number.isFinite(secondary) && secondary >= 0 && secondary <= 100);
    assert.equal(primary + secondary, 100);
  }
  for (const value of [NaN, Infinity, '0 0 12px']) assert.throws(() => splitterBounds(0, 100, value as number));
});

test('copied CLI suppresses only its exact reviewed warning and still rejects literal violations and stale exceptions', async t => {
  const consumer = await mkdtemp(resolve(tmpdir(), 'ui-reasoned-exception-'));
  t.after(() => rm(consumer, { recursive: true, force: true }));
  await mkdir(resolve(consumer, 'app'));
  await mkdir(resolve(consumer, 'foundation'));
  await cp(resolve(root, '.ui/generated/check-ui.cjs'), resolve(consumer, 'foundation/check-ui.cjs'));
  await cp(resolve(root, '.ui/generated/checker-lib'), resolve(consumer, 'foundation/checker-lib'), { recursive: true });
  const input = parseConfig(example); input.output = 'foundation';
  input.checks = { source_roots: ['app'], approved_components: [], exceptions: [] };
  const save = async () => {
    await writeFile(resolve(consumer, 'ui.config.yaml'), stringify(input));
    await writeFile(resolve(consumer, 'foundation/policy.json'), JSON.stringify({ source_policy: createSourcePolicy(resolveConfig(input)) }));
  };
  const source = `import {Component,input,computed} from '@angular/core'; @Component({selector:'app-test',template:'<div [style.aspect-ratio]="ratioValue()"></div>'}) class App { readonly ratio=input(1); readonly ratioValue=computed(()=>{ const value=this.ratio(); if(!Number.isFinite(value)||value<=0)throw new Error('ratio');return value;}); }`;
  await writeFile(resolve(consumer, 'app/app.ts'), source); await save();
  const run = () => spawnSync(process.execPath, ['foundation/check-ui.cjs', '--config', 'ui.config.yaml', '--format', 'json'], { cwd: consumer, encoding: 'utf8', timeout:60_000, env:{...process.env,NODE_PATH:''} });
  const first = run(); assert.equal(first.status, 0, first.stdout+first.stderr);
  const warning: Diagnostic = JSON.parse(first.stdout).diagnostics[0]; assert.equal(warning.rule, 'unresolved');
  input.checks.exceptions = [{ file:warning.file, rule:warning.rule, source:'[style.aspect-ratio]="ratioValue()"', line:warning.line, column:warning.column, reason:'Fixture-only: guarded unitless ratio as structural data.' }]; await save();
  const accepted = run(); assert.equal(accepted.status, 0, accepted.stdout+accepted.stderr);
  assert.equal(JSON.parse(accepted.stdout).diagnostics.length, 0);
  assert.equal(JSON.parse(accepted.stdout).exceptions.length, 1);
  const reviewedException = {...input.checks.exceptions[0]};
  for (const changed of [{file:'app/other.ts'},{line:warning.line+1},{column:warning.column+1},{source:'ratioOther()'},{rule:'literal-token'}]) {
    input.checks.exceptions = [{...reviewedException,...changed}]; await save();
    const rejected = run(); assert.equal(rejected.status,1,rejected.stdout+rejected.stderr);
    assert.ok(JSON.parse(rejected.stdout).diagnostics.some((d: Diagnostic) => d.rule === 'exception-error'));
  }
  input.checks.exceptions = [reviewedException]; await save();
  await writeFile(resolve(consumer,'app/other.ts'),source.replace('app-test','app-other').replace('class App','class Other'));
  const unrelated = run(); assert.equal(unrelated.status,0,unrelated.stdout+unrelated.stderr);
  assert.equal(JSON.parse(unrelated.stdout).exceptions.length,1);
  assert.ok(JSON.parse(unrelated.stdout).diagnostics.some((d: Diagnostic) => d.file === 'app/other.ts' && d.rule === 'unresolved'));
  await rm(resolve(consumer,'app/other.ts'));
  await writeFile(resolve(consumer, 'app/app.ts'), source+`document.body.style.padding='12px';`);
  const violation = run(); assert.equal(violation.status, 1, violation.stdout+violation.stderr);
  assert.ok(JSON.parse(violation.stdout).diagnostics.some((d: Diagnostic) => d.rule === 'literal-token'));
  await writeFile(resolve(consumer, 'app/app.ts'), source.replace('ratioValue()', 'changedRatio()'));
  const stale = run(); assert.equal(stale.status, 1, stale.stdout+stale.stderr);
  assert.ok(JSON.parse(stale.stdout).diagnostics.some((d: Diagnostic) => d.rule === 'exception-error'));
});

test('newly exposed fixed fragment exceptions retain the precise value and audited producer', async () => {
  const ledger=JSON.parse(await readFile(resolve(currentEvidence,'literal-purpose-proof-current.json'),'utf8'));
  const config=parseConfig(example);
  assert.deepEqual(Object.keys(currentSites).sort(), [...approvals, ...ledger.records].map(record=>record.id).sort());
  for(const record of ledger.records){
    const e=record.exception;
    assert.equal(e.rule,'literal-token');assert.ok(/dynamic expression; fixed (?:12ch|100%)\)/.test(e.source));
    validateAdmittedSite(config, record.id, e, 'error');
    await validateProofDependencies(record);
  }
  assert.equal(sha256(await readFile(resolve(root,ledger.source_report))),ledger.source_report_sha256);
  assert.equal(ledger.records.length,2);
});
