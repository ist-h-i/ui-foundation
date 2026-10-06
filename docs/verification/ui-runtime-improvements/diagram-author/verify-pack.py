#!/usr/bin/env python3
"""Read-only verification of the portable handoff's file manifest."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'DELIVERY-SHA256.json').read_text())
failures = []
for item in manifest['files']:
    file = root / item['path']
    if not file.is_file():
        failures.append({'path': item['path'], 'reason': 'missing'})
        continue
    data = file.read_bytes()
    actual = hashlib.sha256(data).hexdigest()
    if actual != item['sha256'] or len(data) != item['bytes']:
        failures.append({'path': item['path'], 'reason': 'hash or size mismatch'})
print(json.dumps({'checkedFiles': len(manifest['files']), 'failures': failures}))
raise SystemExit(bool(failures))
