"""Decode final axe result objects recorded by Playwright; do not alter verdicts."""
from pathlib import Path
import collections
import hashlib
import json
import zipfile

STAGE = Path(__file__).resolve().parent.parent


def decode(value, refs=None):
    refs = {} if refs is None else refs
    if not isinstance(value, dict):
        return value
    if 'ref' in value:
        return refs[value['ref']]
    if 'o' in value:
        result = {}
        if 'id' in value:
            refs[value['id']] = result
        for member in value['o']:
            result[member['k']] = decode(member['v'], refs)
        return result
    if 'a' in value:
        result = []
        if 'id' in value:
            refs[value['id']] = result
        result.extend(decode(member, refs) for member in value['a'])
        return result
    for key in ['s', 'n', 'b']:
        if key in value:
            return value[key]
    if value.get('v') == 'null':
        return None
    return value


def suites(items):
    for item in items:
        yield item
        yield from suites(item.get('suites', []))


report = json.loads((STAGE / 'evidence/before/playwright-results.json').read_text())
summary = []
for suite in suites(report['suites']):
    for spec in suite.get('specs', []):
        if not spec['title'].startswith('320px/200%/RTL'):
            continue
        profile = suite['title'].split()[-1]
        results = spec['tests'][0]['results']
        assert len(results) == 1 and results[0]['status'] == 'passed' and results[0]['retry'] == 0
        attachment = next(item for item in results[0]['attachments'] if item['name'] == 'trace')
        archive = Path(attachment['path'])
        outputs = []
        with zipfile.ZipFile(archive) as zipped:
            for name in zipped.namelist():
                if not name.endswith('.trace'):
                    continue
                for line in zipped.read(name).decode().splitlines():
                    record = json.loads(line)
                    if record.get('type') != 'after' or 'testEngine' not in line:
                        continue
                    result = decode(record.get('result', {}).get('value'))
                    if isinstance(result, dict) and all(key in result for key in ['violations', 'incomplete', 'passes', 'testEngine']):
                        outputs.append((record, name, result))
        assert len(outputs) == 3, (profile, len(outputs))
        for state, (record, tracefile, result) in zip(['closed', 'tree-select-open', 'cascader-open'], outputs):
            target = STAGE / 'evidence/before/axe-derived' / profile / (state + '.json')
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
            reasons = collections.Counter(check.get('data', {}).get('messageKey', 'unspecified')
                                          for rule in result['incomplete'] for node in rule['nodes']
                                          for check in node['any'] + node['all'] + node['none'])
            summary.append({'profile': profile, 'state': state, 'result': str(target.relative_to(STAGE)),
                            'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                            'trace': str(archive.resolve().relative_to(STAGE.resolve())),
                            'traceSha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
                            'traceFile': tracefile, 'callId': record['callId'],
                            'violations': len(result['violations']),
                            'incompleteNodes': sum(len(rule['nodes']) for rule in result['incomplete']),
                            'incompleteReasons': dict(reasons), 'testEngine': result['testEngine']})
(STAGE / 'evidence/before/axe-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
