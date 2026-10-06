from pathlib import Path, PurePosixPath
import hashlib
import json
import sys
import tarfile

base = Path(__file__).resolve().parent
manifest = json.loads((base / 'evidence-manifest.json').read_text())
expected = {f['path']: f for f in manifest['files']}
errors = []
for name, record in expected.items():
    path = base / name
    if not path.is_file():
        errors.append({'path': name, 'error': 'missing local artifact'})
        continue
    data = path.read_bytes()
    if len(data) != record['bytes'] or hashlib.sha256(data).hexdigest() != record['sha256']:
        errors.append({'path': name, 'error': 'local byte mismatch'})
with tarfile.open(base / 'diagram-independent-evidence.tar.gz', 'r:gz') as archive:
    names = set()
    for member in archive:
        p = PurePosixPath(member.name)
        if not member.isfile() or p.is_absolute() or '..' in p.parts:
            errors.append({'path': member.name, 'error': 'unsafe archive entry'})
            continue
        names.add(member.name)
        data = archive.extractfile(member).read()
        if member.name == 'evidence-manifest.json':
            if data != (base / member.name).read_bytes():
                errors.append({'path': member.name, 'error': 'manifest byte mismatch'})
        elif member.name not in expected:
            errors.append({'path': member.name, 'error': 'unexpected archive entry'})
        else:
            record = expected[member.name]
            if len(data) != record['bytes'] or hashlib.sha256(data).hexdigest() != record['sha256']:
                errors.append({'path': member.name, 'error': 'archive byte mismatch'})
    missing = (set(expected) | {'evidence-manifest.json'}) - names
    errors.extend({'path': n, 'error': 'missing archive entry'} for n in sorted(missing))
result = {'actualExit': 1 if errors else 0, 'artifacts': len(expected), 'archiveEntries': len(names), 'errors': errors}
(base / 'evidence-pack-validation.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
sys.exit(result['actualExit'])
