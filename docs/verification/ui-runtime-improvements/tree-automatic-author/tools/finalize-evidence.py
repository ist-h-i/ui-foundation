"""Map all retained original incomplete nodes to actual complementary evidence."""
from pathlib import Path
import collections
import datetime
import hashlib
import json
import shutil
import subprocess

STAGE = Path(__file__).resolve().parent.parent
REPO = STAGE / 'repository'
ROOT = Path('/Users/inouehiroshi/Documents/GitHub/ui-foundation')
EVIDENCE = STAGE / 'evidence'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def ref(path, pointer=''):
    return {'file': str(path.relative_to(STAGE)), 'sha256': sha(path), 'jsonPointer': pointer}


final = EVIDENCE / 'automatic-keyboard-final'
contracts = {}
paints = {}
for path in final.rglob('automatic-contracts.json'):
    contracts[json.loads(path.read_text())['profile']] = path
for path in final.rglob('automatic-paint.json'):
    paints[json.loads(path.read_text())['profile']] = path
assert set(contracts) == set(paints) == {'guided', 'dense'}

rows = json.loads((EVIDENCE / 'classification-initial42.json').read_text())
for row in rows:
    profile = row['profile']
    current = EVIDENCE / 'before/axe-derived' / profile / (row['state'] + '.json')
    rules = json.loads(current.read_text())['incomplete']
    matching_rule = next(rule for rule in rules if rule['id'] == row['rule'])
    node = next(node for node in matching_rule['nodes'] if node['target'] == row['target'])
    assert any(check.get('data', {}).get('messageKey') == row['reason']
               for check in node['any'] + node['all'] + node['none'])
    assert sha(STAGE / row['originalResult']) == row['originalResultSha256']
    row['freshUnmodifiedAxeResult'] = ref(current)
    row['productSourceDefectFound'] = False
    row['axeVerdictRetained'] = 'incomplete'
    if row['reason'] == 'controlsWithinPopup':
        id = row['target'][0].removeprefix('#')
        index = ['cascade', 'single', 'multi'].index(id)
        path = contracts[profile]
        value = json.loads(path.read_text())[row['state']][index]
        assert value['dom']['targetCounts'] == [1]
        assert value['ax']['available'] is True
        row['classification'] = 'popup_reference_review_branch_resolved_by_DOM_and_native_AX'
        row['cause'] = 'Installed axe 4.13.0 deliberately requests review of aria-controls when aria-haspopup is present.'
        row['automaticEvidence'] = [ref(path, '/' + row['state'] + '/' + str(index))]
        row['verified'] = ['one real referenced dialog', 'native label and combobox name',
                           'expanded state matches native popover',
                           'open popup is a named native AX dialog with matching controls backend node; closed popup ignored']
    elif row['reason'] == 'nonBmp':
        path = paints[profile]
        data = json.loads(path.read_text())
        id = row['target'][0].split(' > ')[0].removeprefix('#')
        if id.startswith('departments-item-'):
            index = ['head', 'lazy', 'last'].index(id.removeprefix('departments-item-'))
            pointer = '/glyphs/' + str(index)
            value = data['glyphs'][index]
        else:
            index = ['head', 'lazy'].index(id.removeprefix('multi-tree-item-'))
            pointer = '/popupGlyphs/' + str(index)
            value = data['popupGlyphs'][index]
        assert value['contrast'] >= 3 and value['painted']['foregroundCorePixels'] > 0 and value['painted']['backgroundPixels'] > 0
        assert value['fonts']['available'] is True
        screenshot = Path(value['screenshot'])
        assert sha(screenshot) == value['screenshotSha256']
        row['classification'] = 'nontext_glyph_heuristic_resolved_by_graphical_paint_and_checked_semantics'
        row['cause'] = 'Installed axe 4.13.0 returns review for a unicode nontext-only glyph before calculating text contrast.'
        row['automaticEvidence'] = [ref(path, pointer), ref(screenshot),
                                    ref(path, '/uncheckedSemantics'), ref(path, '/checkedSemantics'), ref(path, '/mixedSemantics')]
        row['verified'] = ['aria-hidden decorative indication; parent checked false/true/mixed in native AX',
                           'deterministic opaque CSS foreground/background with graphical contrast >=3:1',
                           'raw screenshot contains actual foreground and background pixels; actual platform font paints glyph',
                           'unchecked, checked and mixed have distinct painted geometry independent of color']
        row['paintObservationScope'] = 'Repeated department glyph nodes are measured in an exposed closed-popup state; popup glyph nodes are measured exposed in multi-open state. These are the same exact DOM nodes/classes on the unchanged source, not a claim to screenshot every repeated original overlay state.'
        row['observedContrast'] = value['contrast']
    elif row['reason'] == 'elmPartiallyObscured':
        path = contracts[profile]
        data = json.loads(path.read_text())['clipping']
        index = 0 if row['target'][0].endswith('p:nth-child(1)') else 1
        before = data['before'][index]
        after = data['after'][index]
        assert after['selector'] == row['target'][0]
        assert data['nativePageUp'] and data['focusBefore'] == data['focusAfter']
        assert all(part['visibleArea'] >= part['fullArea'] - .5 and part['hitOwned'] for part in after['visible'])
        assert data['textContrasts'][index] >= 4.5
        row['classification'] = 'native_scroll_clipping_reachable_by_keyboard_with_text_contrast_and_hit_proof'
        row['cause'] = 'Native reopened popover scrolls to its focused candidate, clipping earlier route/status text; axe cannot determine that clipped background.'
        row['automaticEvidence'] = [ref(path, '/clipping/before/' + str(index)),
                                    ref(path, '/clipping/after/' + str(index)),
                                    ref(path, '/clipping/nativePageUp'), ref(path, '/clipping/focusBefore'), ref(path, '/clipping/focusAfter'),
                                    ref(path.parent / 'cascader-clipping-before.png'), ref(path.parent / 'cascader-clipping-after.png')]
        row['verified'] = ['native PageUp sets the popup scrollTop to zero without moving focused candidate',
                           'all text Range fragments fit the actual popup/viewport clipping region',
                           'each visible fragment center hit-test belongs to the same paragraph', 'text foreground/background contrast >=4.5:1']
        row['observedContrast'] = data['textContrasts'][index]
        row['scope'] = 'The before phase explicitly retains clipped/not-owned fragments; only the after-PageUp phase asserts all fragments visible and owned.'
    else:
        raise AssertionError(row['reason'])

assert len(rows) == 42
save(EVIDENCE / 'classification-final42.json', rows)
summary = {'originalNodeInstances': len(rows), 'categories': dict(collections.Counter(row['reason'] for row in rows)),
           'classifications': dict(collections.Counter(row['classification'] for row in rows)),
           'sourceDefectsFound': 0, 'productTemplatesChanged': 0, 'axeResultsRewritten': False,
           'rulesDisabled': [], 'unclassifiedNodes': 0,
           'freshUnmodifiedAxeScans': 6, 'freshUnmodifiedAxeViolations': 0, 'freshUnmodifiedAxeIncompleteNodeInstances': 42,
           'formalBefore': {'passed': 2, 'failed': 0, 'retries': 0},
           'complementaryFinal': {'passed': 6, 'failed': 0, 'retries': 0, 'strictTestTypecheckExit': 0},
           'retainedHarnessAttempt1': {'passed': 4, 'failed': 2, 'cause': 'Test expected a different mixed glyph literal; source uses the valid distinct painted glyph. Fixed detector measures geometry.'},
           'retainedWheelPhase': {'passed': 6, 'failed': 0, 'textReachMethod': 'native wheel only; superseded by separate fresh PageUp phase, not rewritten'},
           'realATSpeechTested': False, 'humanVisualReviewRequired': False,
           'candidateAuthorReviewOnly': True, 'independentCriticPending': True,
           'existing181Completion': 'Parent-owned completed baseline remains unchanged; this is a Tree followup scope, not another global verdict.'}
save(EVIDENCE / 'classification-summary.json', summary)

axe = REPO / 'node_modules/axe-core/axe.js'
save(EVIDENCE / 'axe-cause-source.json', {'version': json.loads((axe.parent / 'package.json').read_text())['version'],
      'installedAxeSourceSha256': sha(axe), 'installedAxePackageSha256': sha(axe.parent / 'package.json'),
      'source': str(axe), 'branches': [
          {'lines': [27523, 27547], 'reason': 'controlsWithinPopup', 'observation': 'aria-controls preCheck sets review data whenever aria-haspopup is present, including an actual existing dialog target.'},
          {'lines': [27190, 27204], 'reason': 'nonBmp', 'observation': 'ignoreUnicode and textIsEmojis take the review return before calculating text contrast.'},
          {'lines': [25204, 25224], 'reason': 'elmPartiallyObscured', 'observation': 'background-color review comes from real obscuring/clip detection; separate keyboard exposure and hit/contrast checks preserve this original condition.'}],
      'primaryReferences': ['https://www.w3.org/WAI/ARIA/apg/patterns/combobox/',
                            'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html',
                            'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
                            'https://developer.chrome.com/docs/devtools/accessibility/reference']})

setup = json.loads((EVIDENCE / 'setup.json').read_text())
own_drift = []
root_drift = []
for item in setup['sourceFiles']:
    path = REPO / item['path']
    if not path.exists() or sha(path) != item['sha256']:
        own_drift.append(item['path'])
    root_path = ROOT / item['path']
    if not root_path.exists() or sha(root_path) != item['sha256']:
        root_drift.append(item['path'])
assert not own_drift, own_drift
templates = sorted((REPO / 'templates/angular').glob('*.ts'))
generated_drift = [str(path.relative_to(REPO)) for path in templates if sha(path) != sha(REPO / '.ui/generated/angular' / path.name)]
assert len(templates) == 139 and not generated_drift, generated_drift
candidate = []
for name in ['tree-axe-contract-helpers.ts', 'tree-axe-contract.spec.ts']:
    path = REPO / 'tests/ui' / name
    tested = final / 'source' / name
    assert sha(path) == sha(tested)
    candidate.append({'path': 'tests/ui/' + name, 'sha256': sha(path), 'bytes': path.stat().st_size, 'exactTestedSource': str(tested.relative_to(STAGE))})
save(EVIDENCE / 'final-source-freeze.json', {'time': datetime.datetime.now(datetime.timezone.utc).isoformat(),
     'baseMain': setup['baseMain'], 'productOwnSourceSnapshotDrift': own_drift, 'rootCurrentSnapshotDriftReadOnly': root_drift,
     'rootOtherAgentsMayEditSeparateScopes': True, 'templateTSCount': len(templates), 'generatedTemplateDrift': generated_drift,
     'treeProductSourceSha256': sha(REPO / 'templates/angular/tree.ts'), 'newCandidateFiles': candidate,
     'rootCurrentSnapshotComparisonNote': 'Comparison only. main.ts is an intentional Tree-only harness entry point; other differences may reflect concurrent parent CLI/ownership work. These differences do not establish drift in the 139 Angular templates.',
     'currentRootAngularTemplateDrift': [path.name for path in templates if sha(path) != sha(ROOT / 'templates/angular' / path.name)],
     'currentRootConfigIdentical': sha(REPO / 'examples/ui.config.example.yaml') == sha(ROOT / 'examples/ui.config.example.yaml'),
     'currentRootStylesIdentical': sha(REPO / 'templates/angular/styles.css') == sha(ROOT / 'templates/angular/styles.css'),
     'rootHeadReadOnly': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
     'sourceSnapshotHasNoProductEdits': True})

cleanup = subprocess.run(['lsof', '-nP', '-iTCP:5338', '-sTCP:LISTEN'], capture_output=True, text=True)
assert cleanup.returncode == 1 and not cleanup.stdout, cleanup.stdout
save(EVIDENCE / 'owned-process-cleanup.json', {'time': datetime.datetime.now(datetime.timezone.utc).isoformat(),
      'command': ['lsof', '-nP', '-iTCP:5338', '-sTCP:LISTEN'], 'exit': cleanup.returncode,
      'stdout': cleanup.stdout, 'stderr': cleanup.stderr, 'listeningProcessFound': False, 'otherProcessesKilled': False})
print(json.dumps({'summary': summary, 'candidate': candidate, 'rootOtherScopeChanges': root_drift}, ensure_ascii=False, indent=2))
