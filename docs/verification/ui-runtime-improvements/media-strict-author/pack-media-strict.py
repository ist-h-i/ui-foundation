"""Pack only this candidate's code and evidence, without dependency/build trees."""
from pathlib import Path
import hashlib
import json
import tarfile
from datetime import datetime, timezone

base = Path(__file__).resolve().parent
digest = lambda data: hashlib.sha256(data).hexdigest()
root_files = [
    'candidate-manifest.json', 'media-strict-review.ja.md', 'media-strict-verdict.json',
    'media-strict-candidate.patch', 'media-strict-source.patch', 'package-script-proposal.patch',
    'apply-media-candidate.py', 'audit-media-candidate.mjs', 'pack-media-strict.py',
]
selected = [base / name for name in root_files]
for directory in ['candidate-before', 'candidate-after', 'evidence']:
    selected.extend(p for p in (base / directory).rglob('*') if p.is_file() and not p.is_symlink())
for name in ['playwright.config.ts', 'playwright.media-verification.config.ts', 'tsconfig.json', 'tsconfig.tools.json', 'tests/ui/catalog-test.ts']:
    selected.append(base / 'repository' / name)
rows = []
for path in sorted(set(selected)):
    relative = path.relative_to(base).as_posix()
    assert not any(part in {'node_modules', '.git', 'dist', '.ui', 'build'} for part in path.relative_to(base).parts)
    data = path.read_bytes()
    rows.append({'path': relative, 'bytes': len(data), 'sha256': digest(data)})
manifest = {
    'at': datetime.now(timezone.utc).isoformat(), 'baseCommit': '9f5430ca87e249af204cc335a8610d0d8040621f',
    'scope': 'Media strict candidate author evidence; separate fresh review and root integration required',
    'artifactCount': len(rows), 'artifacts': rows,
    'excluded': ['node_modules', 'dist', 'build', '.ui', '.agents', '.git', 'immutable-base9f', 'apply-proof', 'assets'],
    'failedAndMixedInputLogsPreserved': True,
    'originalMediaPackModified': False,
    'candidateFiles': 'candidate-manifest.json',
}
manifest_path = base / 'evidence-manifest.json'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
archive_path = base / 'media-strict-evidence.tar.gz'
with tarfile.open(archive_path, 'w:gz') as archive:
    for row in rows:
        archive.add(base / row['path'], arcname=row['path'], recursive=False)
    archive.add(manifest_path, arcname='evidence-manifest.json', recursive=False)
expected = {row['path']: row for row in rows}
expected['evidence-manifest.json'] = {'bytes': manifest_path.stat().st_size, 'sha256': digest(manifest_path.read_bytes())}
with tarfile.open(archive_path, 'r:gz') as archive:
    members = archive.getmembers()
    assert set(member.name for member in members) == set(expected)
    for member in members:
        assert member.isfile() and not member.name.startswith('/') and '..' not in Path(member.name).parts
        data = archive.extractfile(member).read()
        assert len(data) == expected[member.name]['bytes'] and digest(data) == expected[member.name]['sha256']
result = {
    'archive': str(archive_path), 'archiveBytes': archive_path.stat().st_size, 'archiveSHA256': digest(archive_path.read_bytes()),
    'manifest': str(manifest_path), 'manifestSHA256': digest(manifest_path.read_bytes()),
    'report': str(base / 'media-strict-review.ja.md'), 'candidateManifest': str(base / 'candidate-manifest.json'),
    'artifactCount': len(rows), 'archiveEntries': len(expected), 'allArtifactBytesVerified': True, 'actualExit': 0,
}
(base / 'evidence-pack.json').write_text(json.dumps(result, indent=2) + '\n')
(base / 'evidence-pack-validation.json').write_text(json.dumps({'command': ['python3', 'pack-media-strict.py'], 'actualExit': 0, 'verifiedEntries': len(expected), 'missing': [], 'mismatched': [], 'unsafePaths': []}, indent=2) + '\n')
print(json.dumps(result))
