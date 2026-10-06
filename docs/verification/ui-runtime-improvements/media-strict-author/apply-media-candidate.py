"""Apply exact Media test/config bytes to an explicitly supplied checkout.

The package.json proposal belongs to the root integrator and is excluded unless
--include-package is explicitly supplied. All guards run before any write.
"""
import argparse
import hashlib
import json
from pathlib import Path

base = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--include-package', action='store_true')
parser.add_argument('--dry-run', action='store_true')
args = parser.parse_args()
root = args.root.resolve()
assert root.is_dir()
manifest = json.loads((base / 'candidate-manifest.json').read_text())
selected = [r for r in manifest['files'] if args.include_package or r['path'] != 'package.json']
prepared = []
for entry in selected:
    target = root / entry['path']
    assert target.resolve().is_relative_to(root), entry['path']
    assert not target.is_symlink(), entry['path']
    before = target.read_bytes() if target.exists() else None
    if entry['beforeSHA256'] is None:
        assert before is None, entry['path'] + ': expected a new file'
    else:
        assert before is not None and hashlib.sha256(before).hexdigest() == entry['beforeSHA256'], entry['path'] + ': base SHA mismatch'
    after = (base / 'candidate-after' / entry['path']).read_bytes()
    assert hashlib.sha256(after).hexdigest() == entry['afterSHA256']
    prepared.append((entry, target, before, after))
if not args.dry_run:
    written = []
    try:
        for entry, target, before, after in prepared:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(after)
            written.append((target, before))
            assert hashlib.sha256(target.read_bytes()).hexdigest() == entry['afterSHA256']
    except Exception:
        for target, before in reversed(written):
            if before is None:
                target.unlink()
            else:
                target.write_bytes(before)
        raise
print(json.dumps({'dryRun': args.dry_run, 'fileCount': len(prepared), 'packageIncluded': args.include_package, 'guarded': True, 'root': str(root), 'exit': 0}))
