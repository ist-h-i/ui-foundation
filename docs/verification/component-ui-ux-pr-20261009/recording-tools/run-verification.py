import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

root = Path('/Users/inouehiroshi/Documents/GitHub/ui-foundation')
out = Path('/tmp/ui-foundation-pr-20261009')
commands = [('aggregate', ['npm', 'test']), ('verification-tools', ['npm', 'run', 'test:verification'])]
env = dict(os.environ, UI_FIXTURE_PORT='4227', CI='1', FORCE_COLOR='0')
results = []
def inventory():
    paths = set()
    for folder in ['src', 'templates', 'skills', 'examples', '.ui/generated', '.agents/skills/project-ui', 'tests', 'scripts']:
        paths.update(path for path in (root / folder).rglob('*') if path.is_file())
    paths.update(root.glob('*.json'))
    paths.add(root / 'playwright.config.ts')
    return [{'path': str(path.relative_to(root)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()} for path in sorted(paths)]

for name, command in commands:
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    source = subprocess.check_output(['git', 'diff', '--binary'], cwd=root)
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    inputs = inventory()
    (out / (name + '-source-manifest.json')).write_text(json.dumps(inputs, indent=2) + '\n')
    print(json.dumps({'step': name, 'startedAt': started, 'command': command}), flush=True)
    with (out / (name + '.log')).open('w') as log:
        child = subprocess.Popen(command, cwd=root, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        for line in child.stdout:
            log.write(line)
            log.flush()
            if line.startswith('> ') or 'failed' in line.lower() or 'passed (' in line or line.startswith('# tests'):
                print(line.rstrip(), flush=True)
        code = child.wait()
    result = {'name': name, 'command': command, 'startedAt': started, 'endedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'exitCode': code, 'log': name + '.log', 'diffSha256Before': hashlib.sha256(source).hexdigest(), 'diffUnchanged': source == subprocess.check_output(['git', 'diff', '--binary'], cwd=root), 'sourceFiles': len(inputs), 'sourceUnchanged': inputs == inventory(), 'head': head, 'headUnchanged': head == subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(), 'logSha256': hashlib.sha256((out / (name + '.log')).read_bytes()).hexdigest()}
    results.append(result)
    (out / (name + '.exit')).write_text(str(code) + '\n')
    (out / 'execution.json').write_text(json.dumps({'results': results, 'environment': {'node': subprocess.check_output(['node', '--version'], text=True).strip(), 'npm': subprocess.check_output(['npm', '--version'], text=True).strip(), 'CI': '1', 'UI_FIXTURE_PORT': '4227', 'retries': 0, 'workers': 2}}, indent=2) + '\n')
    print(json.dumps(result), flush=True)
sys.exit(0 if all(row['exitCode'] == 0 for row in results) else 1)
