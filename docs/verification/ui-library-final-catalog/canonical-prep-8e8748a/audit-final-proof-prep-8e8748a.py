from pathlib import Path
from urllib.parse import urlsplit, unquote
import collections, datetime, hashlib, json, os, re, subprocess

ROOT = Path('/Users/inouehiroshi/Documents/GitHub/ui-foundation')
BASE = Path('/tmp/ui-foundation-final-integration-independent-review')
COMMIT = '8e8748afb5d3314c2860d0ae181c23c1a444c9d0'
PRODUCT = 'a808a79dc5f17c1b87280c2881147c8ab5357a9f'
OLD_COMMIT = '53a785824b86a34ada3ee8619f710fad57117634'
OUT = BASE / 'proof-prep-8e8748a'
assert not OUT.exists()
OUT.mkdir()
SHA = lambda data: hashlib.sha256(data).hexdigest()
ENV = dict(os.environ, GIT_OPTIONAL_LOCKS='0')


def git_blobs(commit, paths):
    ordered = sorted(set(paths))
    result = subprocess.run(['git', 'cat-file', '--batch'], cwd=ROOT, env=ENV,
        input=''.join(commit + ':' + path + '\n' for path in ordered).encode(),
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    offset, blobs = 0, {}
    for path in ordered:
        end = result.stdout.index(b'\n', offset)
        header = result.stdout[offset:end].decode().split()
        assert len(header) == 3 and header[1] == 'blob', (path, header)
        size = int(header[2]); start = end + 1
        blobs[path] = result.stdout[start:start + size]
        offset = start + size + 1
    assert offset == len(result.stdout)
    return blobs


old_path = BASE / 'evidence/requirements-48-controls-53a7858-canonical.json'
old_bytes = old_path.read_bytes(); old = json.loads(old_bytes)
new = json.loads(old_bytes); changes = []
for row in new['requirements']:
    for ref in row['formalTestReferences']:
        if ref['path'] == 'tests/ui/media-regressions.spec.ts':
            assert ref['sha256'] == '784bb0cf44bf5aaf320032298caa9821b38c087132d9c06c9b17a36fab37996e'
            change = {'rowId': row['id'], 'path': ref['path'], 'beforeSha256': ref['sha256'],
                'afterSha256': '3e3b32025f0c3e04cc5d71efadebfe7a5afbb1123dac255e5b07a3d72fe2d4a7'}
            changes.append(change); ref['sha256'] = change['afterSha256']
assert len(changes) == 4 and {c['rowId'] for c in changes} == {'media-04', 'media-06', 'media-07', 'media-10'}

freeze_path = ROOT / 'docs/verification/ui-library-final-catalog/root-final-source-freeze-8e8748a.json'
freeze_bytes = freeze_path.read_bytes(); freeze = json.loads(freeze_bytes)
assert SHA(freeze_bytes) == '30717c847e505993c1ccb9fcaecddf65765b2fe856b9ca5a44b982f417753066'
assert len(freeze['files']) == 274 and freeze['sourceCommit'] == COMMIT and freeze['templateTSFiles'] == 139
paths = {ref['path'] for row in new['requirements'] for field in ['implementationSources', 'formalTestReferences'] for ref in row[field]}
blobs = git_blobs(COMMIT, paths | {f['path'] for f in freeze['files']})
reference_records = []
for path in sorted(paths):
    assert (ROOT / path).read_bytes() == blobs[path], path
    reference_records.append({'path': path, 'gitAndLiveSha256': SHA(blobs[path]), 'bytes': len(blobs[path])})
implementation_count = formal_count = 0
for before, row in zip(old['requirements'], new['requirements']):
    assert {k: v for k, v in before.items() if k != 'formalTestReferences'} == {k: v for k, v in row.items() if k != 'formalTestReferences'}
    for field in ['implementationSources', 'formalTestReferences']:
        for ref in row[field]: assert ref['sha256'] == SHA(blobs[ref['path']]), (row['id'], ref)
        if field == 'implementationSources': implementation_count += len(row[field])
        else: formal_count += len(row[field])
assert implementation_count == 115 and formal_count == 94 and len(paths) == 88
assert new['rows'] == 48 and new['controlCount'] == 207
for file in freeze['files']:
    path = file['path']; assert SHA(blobs[path]) == file['sha256'] and len(blobs[path]) == file['bytes'] and (ROOT / path).read_bytes() == blobs[path], path
product_paths = sorted(p for p in blobs if p.startswith('templates/angular/') and p.endswith('.ts'))
assert len(product_paths) == 139
product_baseline = git_blobs(PRODUCT, product_paths)
assert all(product_baseline[p] == blobs[p] for p in product_paths)
old_freeze_bytes = (BASE / 'evidence/root-53a7858-final-source-freeze.snapshot.json').read_bytes()
old_freeze = {f['path']: f for f in json.loads(old_freeze_bytes)['files']}
assert set(old_freeze) == {f['path'] for f in freeze['files']}
freeze_delta = [f['path'] for f in freeze['files'] if f['sha256'] != old_freeze[f['path']]['sha256']]
assert sorted(freeze_delta) == ['tests/ui/collection-catalog.spec.ts', 'tests/ui/media-regressions.spec.ts']
assert SHA(blobs['tests/ui/collection-catalog.spec.ts']) == 'c98c92afb4649cfa6b4aaaecf1e5be29e78c6c13b3c26846b2f4141dcbe5fe1c'
assert SHA(blobs['tests/ui/media-regressions.spec.ts']) == '3e3b32025f0c3e04cc5d71efadebfe7a5afbb1123dac255e5b07a3d72fe2d4a7'

matrix_path = ROOT / 'docs/ui-library-matrix.json'; matrix_bytes = matrix_path.read_bytes(); matrix = json.loads(matrix_bytes)
baseline_matrix = json.loads(git_blobs(PRODUCT, ['docs/ui-library-matrix.json'])['docs/ui-library-matrix.json'])
fields = ['id', 'category', 'component', 'requestedControls', 'sourceLine']
original_tuple = lambda row: {field: row.get(field) for field in fields}
assert len(matrix['requirements']) == 181 and len({r['id'] for r in matrix['requirements']}) == 181
assert [original_tuple(r) for r in matrix['requirements']] == [original_tuple(r) for r in baseline_matrix['requirements']]
request_bytes = (ROOT / 'docs/ui-library-request.ja.md').read_bytes()
assert SHA(request_bytes) == '7a0a9ab7ac8d084e6c0a396316ed9d8138012c090be773ac291df280284e105b'
assert request_bytes == git_blobs(PRODUCT, ['docs/ui-library-request.ja.md'])['docs/ui-library-request.ja.md']
lines = request_bytes.decode().splitlines(); norm = lambda x: re.sub(r'\s+', ' ', x.replace('**', '')).strip()
mapped = []
for row in matrix['requirements']:
    if row['category'] == 'foundation': continue
    cells = lines[row['sourceLine'] - 1].strip().strip('|').split('|')
    assert len(cells) == 2 and norm(cells[0]) == norm(row['component']) and norm(cells[1]) == norm(row['requestedControls']), row['id']
    mapped.append(row['sourceLine'])
source_rows = []
for number, line in enumerate(lines, 1):
    if not line.startswith('|'): continue
    cells = line.strip().strip('|').split('|')
    if len(cells) == 2 and norm(cells[0]) not in ['コンポーネント', '機能', '部品'] and not norm(cells[0]).startswith('---'): source_rows.append(number)
assert len(source_rows) == 172 and set(source_rows) == set(mapped) and len(mapped) == len(set(mapped))
source_missing, proof_missing = [], []
for row in matrix['requirements']:
    for name in row.get('implementation', []):
        if not (ROOT / name).is_file(): source_missing.append({'row': row['id'], 'path': name})
    for name in row.get('evidence', []):
        if not (ROOT / name).is_file(): proof_missing.append({'row': row['id'], 'path': name})
assert not source_missing and not proof_missing
matrix_by_id = {r['id']: r for r in matrix['requirements']}
assert all(row['originalRequestedControls'] == matrix_by_id[row['id']]['requestedControls'] for row in new['requirements'])

replay_dir = ROOT / 'docs/verification/ui-library-final-catalog/failure-replay-8e8748a'
replay = json.loads((replay_dir / 'execution.json').read_text()); results = json.loads((replay_dir / 'results.json').read_text())
assert replay['sourceCommit'] == COMMIT and replay['exitCode'] == 0 and replay['sourceChanged'] == [] and replay['trackedInputs'] == 457
assert replay['retries'] == 0 and replay['productSourceChanges'] == [] and results['stats']['expected'] == 5 and all(results['stats'][k] == 0 for k in ['unexpected', 'skipped', 'flaky']) and results['errors'] == []
replay_capture = json.loads((replay_dir / 'capture-manifest.json').read_text())
for file in replay_capture['files']: assert SHA((replay_dir / file['path']).read_bytes()) == file['sha256'], file['path']
failed_dir = ROOT / 'docs/verification/ui-library-final-catalog/fourth-full-npm-53a7858-failed'
failed = json.loads((failed_dir / 'execution.json').read_text()); failed_capture = json.loads((failed_dir / 'capture-manifest.json').read_text())
assert failed['sourceCommit'] == OLD_COMMIT and failed['exitCode'] == 1 and failed['sourceChanged'] == [] and failed_capture['captureFiles'] == 94
assert failed_capture['counts']['passedUi'] == 977 and failed_capture['counts']['failedUi'] == 3 and failed_capture['counts']['nodeFailures'] == [0, 0, 0]
for file in failed_capture['files']: assert SHA((failed_dir / file['path']).read_bytes()) == file['sha256'], file['path']

new['parentSourceCommit'] = COMMIT; new['parentCandidateFreeze'] = SHA(freeze_bytes)
new['canonicalReferenceAudit'] = 'proof-prep-8e8748a/canonical-reference-audit.json'
new['formalTestDelta'] = 'proof-prep-8e8748a/source-inheritance.json'
new['newFormalReferencesUpdatedOnly'] = changes
new['rootFreshFocusedReplay5Passed'] = True
new['rootFreshFocusedReplay5Evidence'] = 'docs/verification/ui-library-final-catalog/failure-replay-8e8748a/execution.json'
new['rootFreshFullNpmPassed'] = False; new['finalMatrixApproval'] = False
out_map = OUT / 'requirements-48-controls-8e8748a-canonical.json'; out_map.write_text(json.dumps(new, ensure_ascii=False, indent=2) + '\n')
reference_audit = {'commit': COMMIT, 'rows': 48, 'controls': 207, 'implementationReferences': 115, 'formalReferences': 94, 'totalReferences': 209, 'uniqueFiles': 88, 'referenceMismatches': [], 'gitLiveExact': True, 'changes': changes, 'oldMapSha256': SHA(old_bytes), 'newMapSha256': SHA(out_map.read_bytes()), 'oldMapPreservedByteExact': old_path.read_bytes() == old_bytes, 'allOriginalControlsAndImplementationHashesPreserved': True, 'files': reference_records, 'rootFullNpmPassed': False, 'all181Completed': False, 'finalMatrixDocApproval': False}
(OUT / 'canonical-reference-audit.json').write_text(json.dumps(reference_audit, ensure_ascii=False, indent=2) + '\n')
inheritance = {'commit': COMMIT, 'productCommit': PRODUCT, 'freezeSha256': SHA(freeze_bytes), 'freezeFilesGitAndLiveExact': 274, 'productSourcesInheritedByteExact': 139, 'productMismatches': [], 'deltaFrom53Freeze': freeze_delta, 'productChange': False, 'sourceAndTestMutationByReviewer': False, 'old53FreezeSha256': SHA(old_freeze_bytes), 'rootFullNpmPassed': False}
(OUT / 'source-inheritance.json').write_text(json.dumps(inheritance, ensure_ascii=False, indent=2) + '\n')
(OUT / 'root-final-source-freeze-8e8748a.snapshot.json').write_bytes(freeze_bytes)
(OUT / 'matrix-8e8748a-prep.snapshot.json').write_bytes(matrix_bytes)
(OUT / 'request-original.snapshot.ja.md').write_bytes(request_bytes)
raw_inheritance = {'failedFull53': {'actualExit': 1, 'sourceChanged': [], 'counts': failed_capture['counts'], 'verifiedCapturedFiles': 94, 'captureManifestSha256': SHA((failed_dir / 'capture-manifest.json').read_bytes())}, 'rootCanonicalSelected8e': {'actualExit': 0, 'casesPassed': 5, 'workers': 2, 'retries': 0, 'unexpected': 0, 'flaky': 0, 'skipped': 0, 'sourceChanged': [], 'captureManifestSha256': SHA((replay_dir / 'capture-manifest.json').read_bytes()), 'verifiedCapturedFiles': len(replay_capture['files'])}, 'actorLightbox4Scope': 'Copied formal candidate ran against existing own public consumer, not root fixture byteexact clone; distinct from root canonical selected5.', 'rootWhole8ePassed': False}
(OUT / 'raw-results-inheritance.json').write_text(json.dumps(raw_inheritance, ensure_ascii=False, indent=2) + '\n')
for folder, names in [(failed_dir, ['execution.json', 'capture-manifest.json']), (replay_dir, ['execution.json', 'capture-manifest.json', 'results.json'])]:
    destination = OUT / folder.name; destination.mkdir()
    for name in names: (destination / name).write_bytes((folder / name).read_bytes())
report = {'recordedUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'stage': 'Readonly final proof preparation; final full and docs pending', 'commit': COMMIT, 'originalRows': 181, 'originalTableRows': 172, 'originalFoundationRows': 9, 'originalRequestSha256': SHA(request_bytes), 'original181FieldsVsProductCommitPreserved': True, 'original48RequestedControlsVsMatrixPreserved': True, 'matrixSha256': SHA(matrix_bytes), 'matrixStatus': dict(collections.Counter(r['status'] for r in matrix['requirements'])), 'sourceReferencesMissing': source_missing, 'evidenceReferencesMissing': proof_missing, 'canonicalMapSha256': SHA(out_map.read_bytes()), 'changedFormalReferenceRecords': 4, 'referencesVerifiedAgainstGitAndLive': 209, 'product139InheritedExact': True, 'rawFailedRunPreserved': True, 'rootCanonicalSelected5Passed': True, 'rootFullNpmPassed': False, 'all181Complete': False, 'finalMatrixAndDocsApproval': False}
(OUT / 'PREP-VERDICT.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False))
