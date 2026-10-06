from pathlib import Path
import subprocess,json,datetime,hashlib,os
root=Path('/tmp/ui-foundation-collections-contrast-audit')
command=['node',str(root/'contrast-browser.mjs')]
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
with (root/'logs/browser.log').open('w') as log:
 p=subprocess.run(command,cwd=root,env=dict(os.environ,TMPDIR=str(root/'tmp')),stdout=log,stderr=subprocess.STDOUT)
record={'command':command,'cwd':str(root),'startedAtUTC':start,'finishedAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'actualExitCode':p.returncode,'log':str(root/'logs/browser.log'),'logSha256':hashlib.sha256((root/'logs/browser.log').read_bytes()).hexdigest()}
(root/'browser-run.json').write_text(json.dumps(record,indent=2)+'\n')
(root/'browser-run.exit').write_text(str(p.returncode)+'\n')
print(json.dumps(record))
raise SystemExit(p.returncode)
