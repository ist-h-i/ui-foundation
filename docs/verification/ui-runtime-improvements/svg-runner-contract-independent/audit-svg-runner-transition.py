#!/usr/bin/env python3
"""Read-only provenance audit of runner-only repair; no simulated native run."""
from pathlib import Path
import hashlib, json, subprocess, itertools, datetime, shutil

ROOT = Path('/Users/inouehiroshi/Documents/GitHub/ui-foundation')
OWN = Path('/tmp/ui-foundation-pr13-independent-final-review')
OUT = OWN / 'followup-svg-runner-2f12'
OTHER = Path('/tmp/ui-foundation-tree-escape-final-review/independent-chart-menu-20261006-124128/integrated-37ecf88/chart/evidence')
COMMIT = '37ecf88b05b6cae1510e3291d7fc75e62217892b'
AFTER = '2f12befdfe27b1c2bdef9fae228e289dd498c8722446e19908b0824dd319e698'
BEFORE = '490967fd0cf3ca0475d7bb36cfc3f945c0c06cced34aee087c744ef32eb29919'
sha = lambda data: hashlib.sha256(data).hexdigest()
git = lambda path: subprocess.check_output(['git', 'show', COMMIT + ':' + path], cwd=ROOT)
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'reviewed-artifacts').mkdir(exist_ok=True)
inputs = []
def read(relative):
    p = OTHER / relative
    data = p.read_bytes()
    target = OUT / 'reviewed-artifacts' / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    inputs.append({'origin': str(p), 'copy': str(target.relative_to(OUT)), 'bytes': len(data), 'sha256': sha(data)})
    return json.loads(data)

live = (ROOT / 'scripts/test-svg-paint.mjs').read_bytes()
old = git('scripts/test-svg-paint.mjs')
assert sha(live) == AFTER and sha(old) == BEFORE
candidate = (OTHER / 'runner-scope-after/runner-after-2f12befd.mjs').read_bytes()
assert candidate == live
(OUT / 'runner-before-37ecf.mjs').write_bytes(old)
(OUT / 'runner-after-2f12.mjs').write_bytes(live)
source = read('runner-scope-after/SOURCE-MANIFEST.json')
assert source['before'] == BEFORE and source['after'] == AFTER
unchanged = []
for item in source['fixtureUnchanged']:
    path = 'tests/consumer-svg-paint/' + item['path']
    actual = (ROOT / path).read_bytes()
    assert actual == git(path) and sha(actual) == item['sha256']
    unchanged.append({'path': path, 'sha256': sha(actual), 'sameAs37': True})

zero = read('zero-frame-guard-probe/execution.json')
assert zero['actualHelperExit'] == 0 and zero['nativeFrameCount'] == 0
assert zero['nativeJsonCreated'] is False and zero['serverStarted'] is False
assert zero['harnessSha256'] == sha(git('tests/consumer-svg-paint/harness/verify-paint.mjs'))
controls = read('runner-scope-after/independent-contract-results.json')
assert controls['runnerSha256'] == AFTER and controls['actualExit'] == 0
assert len(controls['assertionControls']) == 11
negative = [r for r in controls['assertionControls'] if r['expected'] == 'reject-corrupted-results']
assert len(negative) == 10 and all(r['observed'] == 'rejected' for r in negative)
assert controls['browserLaunched'] is False and controls['serverStarted'] is False
assert controls['environment']['hostChanged'] is False
assert not set(['PAINT_CONFIG', 'PAINT_ONE']) & set(controls['environment']['childKeys'])
after_execution = read('runner-scope-after/author-after-hostile-execution.json')
assert after_execution['successful'] is True and after_execution['sourceUnchanged'] is True
assert len(after_execution['steps']) == 6 and all(x['code'] == 0 for x in after_execution['steps'])
assert after_execution['nativeContract']['requiredScenarios'] == 34
assert after_execution['nativeContract']['recordedScenarios'] == 34
assert after_execution['ownServerClosed'] is True
native = read('runner-scope-after/author-after-hostile-candidate-paint-native.json')
source_input = read('runner-scope-after/author-after-hostile-source-input.json')
build = read('runner-scope-after/author-after-hostile-build-results.json')
assert all(x['exit'] == 0 for x in build['results']) and build['publicBarrelOnly'] is True
assert build['production'] is True and build['ngDevMode'] is False
assert build['consumerSha'] == sha(git('tests/consumer-svg-paint/consumer.ts'))

expected = set()
for profile, width, direction in itertools.product(['guided','dense'], [1280,320], ['ltr','rtl']):
    for locale,precision,data in [('ar-EG','2','precision'),('ja-JP','9','precision'),('de-DE','2','precision'),('ar-EG','2','edge'),('ar-EG','2','fractional')]:
        if data == 'fractional' and (width != 320 or direction != 'rtl'):
            continue
        expected.add((profile, width, direction, locale, precision, data))
rows = native['rows']
actual = [tuple(r[k] for k in ['profile','width','direction','locale','precision','data']) for r in rows]
assert len(expected) == len(rows) == len(set(actual)) == 34 and set(actual) == expected
assert native['allExpected'] is True
labels = 0
min_contrast = 1000
for r in rows:
    assert r['passed'] is True and r['errors'] == [] and r['draftAndSelectionPreserved'] is True
    assert r['keyboardSelection'] == 'series/two'
    assert r['font'] == ('200%' if r['width'] == 320 else '100%')
    assert all(x['reachable'] and x['opacity'] == '1' and x['visibility'] == 'visible' for x in r['liveReachability'])
    paint = r['paint']
    for key in ['totalExactMismatchPixels','originalStrictMismatchPixels','expandedReferenceAlphaMismatch','clippedInkPixels']:
        assert paint[key] == 0, key
    assert paint['inkIntersections'] == [] and paint['minimumContrastRatio'] >= 4.5
    assert all(label['inkPixels'] > 0 and label['contrast']['allOpaque'] and label['clips'] == [] for label in paint['labels'])
    labels += len(paint['labels'])
    min_contrast = min(min_contrast, paint['minimumContrastRatio'])
differences = []
chart_checks = []
for item in source_input['sourceFiles']:
    root37 = git(item['path'])
    if sha(root37) != item['sha256']:
        differences.append({'path': item['path'], 'authorAfterSha256': item['sha256'], 'root37Sha256': sha(root37)})
    if item['path'] in ['templates/angular/chart.ts','templates/angular/chart-options.ts']:
        assert sha(root37) == item['sha256']
        chart_checks.append(item)
assert differences, 'The author hostile-env run must not be mislabeled as a byte-exact root37 run'
assert len(chart_checks) == 2
for item in source_input['installed']:
    assert item['actual'] == item['expected']

result = {
  'createdAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
  'verdict': 'APPROVE_SCOPED_RUNNER_FALSE_SUCCESS_REPAIR_2F12_SOURCE_PROVENANCE',
  'wholePrApproval': False,
  'sourceCheckpoint': COMMIT,
  'runnerBeforeSha256': BEFORE,
  'runnerAfterSha256': AFTER,
  'rootLiveAfterMatchesCandidate': True,
  'ownActualExit': 0,
  'scope': 'Read-only runner diff and recorded evidence provenance audit; no repeat native browser/build execution',
  'oldCounterexample': {'actualHelperExit': 0, 'nativeFrames': 0, 'nativeJsonCreated': False, 'permanentRunnerWithHostileEnvExecutedByThisCritic': False},
  'otherIndependentContractControls': {'recordedControls': 11, 'rejectedCorruptRecords': 10, 'acceptedRealRecordedBasis': 1, 'ownExecution': False, 'nativeClaim': False},
  'reviewedAuthorAfterNative': {'cases': 34, 'exactExpectedSet': True, 'labels': labels, 'rgbaDifferences': 0, 'runtimeErrors': 0, 'minimumContrast': min_contrast, 'sourceInputDifferentFromRoot37': differences, 'chartChecks': chart_checks, 'all6StepsExit0': True, 'serverClosed': True, 'ownExecution': False},
  'unchangedFixtureFiles': unchanged,
  'limits': ['Whole PR and final source/doc head remain pending.', 'Author hostile-environment34 has a base9f source stage; it is not relabeled as final integrated root input.', 'Historical helper zero-case exit0 is preserved as a false-success counterexample, not a product pass.', 'Axe incomplete and prior paint counterexamples are not retagged.', 'No new native browser or server was started in this audit.'],
  'blockersInScopedRunnerRepair': [],
  'inputs': inputs,
}
(OUT / 'AUDIT.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: result[k] for k in ['verdict','wholePrApproval','runnerAfterSha256','ownActualExit','blockersInScopedRunnerRepair']}, ensure_ascii=False))
print(json.dumps({'recordedNativeCasesAudited': len(rows), 'differentAuthorSourcePaths': [x['path'] for x in differences], 'labels': labels, 'minimumContrast': min_contrast}, ensure_ascii=False))
