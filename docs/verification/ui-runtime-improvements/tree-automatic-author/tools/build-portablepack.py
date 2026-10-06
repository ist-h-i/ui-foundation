from pathlib import Path
import datetime
import difflib
import hashlib
import json
import shutil
import tarfile

STAGE = Path(__file__).resolve().parent.parent
PACK = STAGE / 'portablepack'
assert not PACK.exists(), 'Do not replace an existing evidence pack.'
PACK.mkdir()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


for name in ['REPORT.ja.md', 'REPRODUCTION.md']:
    shutil.copy2(STAGE / name, PACK / name)
shutil.copytree(STAGE / 'evidence', PACK / 'evidence')
shutil.copytree(STAGE / 'tools', PACK / 'tools')
shutil.copytree(STAGE / 'repository', PACK / 'repository',
                ignore=shutil.ignore_patterns('node_modules', 'compiled', 'linker-cache'))

# Preserve the already retained historical failure, without treating it as a current source defect.
historical = Path('/tmp/ui-foundation-tree-escape-final-review/followup-tree-narrow-20261006-102325/evidence/original-failure')
target = PACK / 'evidence/original/historical-beforeEach-browser-closed'
shutil.copytree(historical, target)

candidate_manifest = []
for name in ['tree-axe-contract-helpers.ts', 'tree-axe-contract.spec.ts']:
    source = STAGE / 'repository/tests/ui' / name
    candidate = PACK / 'candidate/tests/ui' / name
    candidate.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, candidate)
    patch = PACK / 'candidate/patches' / (name + '.patch')
    patch.parent.mkdir(parents=True, exist_ok=True)
    patch.write_text(''.join(difflib.unified_diff([], source.read_text().splitlines(keepends=True),
                                               fromfile='/dev/null', tofile='b/tests/ui/' + name)))
    candidate_manifest.append({'path': 'tests/ui/' + name, 'sha256': sha(source),
                               'bytes': source.stat().st_size, 'patch': str(patch.relative_to(PACK)),
                               'patchSha256': sha(patch)})
(PACK / 'candidate/MANIFEST.json').write_text(json.dumps(candidate_manifest, indent=2) + '\n')

rows = json.loads((PACK / 'evidence/classification-final42.json').read_text())
checked_refs = 0
for row in rows:
    refs = row['automaticEvidence'] + [row['freshUnmodifiedAxeResult']]
    assert sha(PACK / row['originalResult']) == row['originalResultSha256']
    for item in refs:
        path = PACK / item['file']
        assert path.is_file() and sha(path) == item['sha256'], item
        checked_refs += 1
        if item.get('jsonPointer'):
            value = json.loads(path.read_text())
            for token in item['jsonPointer'].split('/')[1:]:
                value = value[int(token)] if isinstance(value, list) else value[token]

files = []
for path in sorted(PACK.rglob('*')):
    assert not path.is_symlink(), path
    if path.is_file():
        files.append({'path': str(path.relative_to(PACK)), 'bytes': path.stat().st_size, 'sha256': sha(path)})
(PACK / 'MANIFEST.json').write_text(json.dumps({'files': files}, ensure_ascii=False, indent=2) + '\n')
(PACK / 'MANIFEST.sha256').write_text(''.join(item['sha256'] + '  ' + item['path'] + '\n' for item in files))

archive = STAGE / 'tree-automatic-contract-portablepack.tar.gz'
assert not archive.exists()
with tarfile.open(archive, 'w:gz') as tar:
    tar.add(PACK, arcname='tree-automatic-contract-portablepack', recursive=True)

expected = {item['path']: item for item in files}
expected['MANIFEST.json'] = {'sha256': sha(PACK / 'MANIFEST.json'), 'bytes': (PACK / 'MANIFEST.json').stat().st_size}
expected['MANIFEST.sha256'] = {'sha256': sha(PACK / 'MANIFEST.sha256'), 'bytes': (PACK / 'MANIFEST.sha256').stat().st_size}
seen = set()
with tarfile.open(archive, 'r:gz') as tar:
    for member in tar.getmembers():
        assert not member.issym() and not member.islnk(), member.name
        assert member.name == 'tree-automatic-contract-portablepack' or member.name.startswith('tree-automatic-contract-portablepack/')
        relative = member.name.removeprefix('tree-automatic-contract-portablepack/')
        assert '..' not in Path(relative).parts
        if member.isdir():
            continue
        assert member.isfile() and relative in expected, member.name
        assert relative not in seen
        data = tar.extractfile(member).read()
        assert hashlib.sha256(data).hexdigest() == expected[relative]['sha256'] and len(data) == expected[relative]['bytes']
        seen.add(relative)
assert seen == set(expected), set(expected) - seen
receipt = {'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
           'archive': str(archive), 'archiveSha256': sha(archive), 'archiveBytes': archive.stat().st_size,
           'manifestJsonSha256': sha(PACK / 'MANIFEST.json'), 'manifestTextSha256': sha(PACK / 'MANIFEST.sha256'),
           'payloadFileCount': len(files), 'verifiedArchiveFileCount': len(seen),
           'allTarMembersShaAndSizeVerified': True, 'symlinksIncluded': 0,
           'original42RowsRetained': len(rows), 'automaticEvidenceReferencesShaVerified': checked_refs,
           'candidate': candidate_manifest, 'productTemplateEdits': 0,
           'independentCriticPending': True}
(STAGE / 'PORTABLEPACK-RECEIPT.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
