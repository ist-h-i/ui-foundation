import datetime, json, pathlib, subprocess, sys, os

root = pathlib.Path(__file__).resolve().parent
label, *argv = sys.argv[1:]
out = root / 'evidence' / (label + '.log')
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
with out.open('wb') as file:
    result = subprocess.run(argv, cwd=root / 'repository', stdout=file, stderr=subprocess.STDOUT, env=os.environ.copy())
record = {'label': label, 'argv': argv, 'cwd': str(root / 'repository'), 'startedUtc': started, 'endedUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'actualExit': result.returncode, 'log': out.name}
(root / 'evidence' / (label + '.exit')).write_text(str(result.returncode) + '\n')
(root / 'evidence' / (label + '.command.json')).write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record))
print(out.read_text()[-2200:])
sys.exit(result.returncode)
