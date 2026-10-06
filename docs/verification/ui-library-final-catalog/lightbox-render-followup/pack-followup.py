"""Package only this owned followup, preserving failed and incomplete evidence."""
import hashlib
import json
from pathlib import Path
import tarfile
from datetime import datetime, timezone

base = Path(__file__).resolve().parent
digest = lambda data: hashlib.sha256(data).hexdigest()
excluded_names = {
    'evidence-manifest.json', 'evidence-pack.json', 'evidence-pack-validation.json',
    'lightbox-followup-evidence.tar.gz',
    'evidence/original-trace-events.json', 'evidence/original-critical-timeline.json',
}
files = []
excluded = []
for path in sorted(base.rglob('*')):
    relative = path.relative_to(base).as_posix()
    if path.is_symlink() or any(p in {'node_modules', '.git', 'dist', '__pycache__'} for p in path.relative_to(base).parts):
        continue
    if not path.is_file():
        continue
    data = path.read_bytes()
    if relative in excluded_names:
        if relative.startswith('evidence/original-'):
            excluded.append({'path': relative, 'bytes': len(data), 'sha256': digest(data),
                             'reason': 'Redundant decoded events; original complete trace ZIP and selected raw/expanded snapshots are packaged'})
        continue
    files.append({'path': relative, 'bytes': len(data), 'sha256': digest(data)})
manifest = {
    'at': datetime.now(timezone.utc).isoformat(),
    'scope': 'Independent Lightbox failure diagnosis and single-line test guard proposal; no product edits',
    'pathBase': '.', 'artifactCount': len(files), 'artifacts': files,
    'excludedRedundantFilesPreservedOnDisk': excluded,
    'excludedDirectories': ['node_modules', 'dist', '.git', '__pycache__'],
    'originalMediaPackIncluded': False,
    'rawFailedCommandsIncluded': True,
    'evidenceLimitations': ['Fresh original sequence reproduced 0 failures in 16 samples',
                            'Whole UI spec standalone strict tsc retains 24 existing diagnostics and exit2',
                            'Own fixture contains previous public-barrel review section; root whole-fixture rerun is outside this pack'],
}
manifest_path = base / 'evidence-manifest.json'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
archive_path = base / 'lightbox-followup-evidence.tar.gz'
with tarfile.open(archive_path, 'w:gz') as archive:
    for entry in files:
        archive.add(base / entry['path'], arcname=entry['path'], recursive=False)
    archive.add(manifest_path, arcname='evidence-manifest.json', recursive=False)
expected = {entry['path']: entry for entry in files}
expected['evidence-manifest.json'] = {'sha256': digest(manifest_path.read_bytes()), 'bytes': manifest_path.stat().st_size}
with tarfile.open(archive_path, 'r:gz') as archive:
    members = archive.getmembers()
    assert set(m.name for m in members) == set(expected)
    assert all(m.isfile() and not m.name.startswith('/') and '..' not in Path(m.name).parts for m in members)
    for member in members:
        data = archive.extractfile(member).read()
        assert len(data) == expected[member.name]['bytes']
        assert digest(data) == expected[member.name]['sha256']
archive_data = archive_path.read_bytes()
pack = {'scope': manifest['scope'], 'archive': str(archive_path), 'archiveBytes': len(archive_data),
        'archiveSHA256': digest(archive_data), 'manifest': str(manifest_path),
        'manifestSHA256': digest(manifest_path.read_bytes()), 'report': str(base / 'lightbox-followup-review.ja.md'),
        'verdict': str(base / 'lightbox-followup-verdict.json'), 'artifactCount': len(files),
        'archiveEntries': len(expected), 'archiveAllArtifactBytesVerified': True, 'exit': 0}
(base / 'evidence-pack.json').write_text(json.dumps(pack, ensure_ascii=False, indent=2) + '\n')
(base / 'evidence-pack-validation.json').write_text(json.dumps({'command': ['python3', 'pack-followup.py'],
    'artifactSHA256Checks': len(expected), 'missing': [], 'mismatched': [], 'unsafePaths': [], 'exit': 0}, indent=2) + '\n')
print(json.dumps(pack, ensure_ascii=False))
