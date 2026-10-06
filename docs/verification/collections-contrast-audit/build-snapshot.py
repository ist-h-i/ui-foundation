from pathlib import Path
import subprocess, json, datetime, os, hashlib

root=Path('/tmp/ui-foundation-collections-contrast-audit')
snapshot=root/'snapshot-main-8d01adc'
env=dict(os.environ,TMPDIR=str(root/'tmp'))
commands=[
 ['node','--import','tsx','src/cli.ts','sync','--config','examples/ui.config.example.yaml'],
 ['node','--import','tsx','src/cli.ts','check','--config','examples/ui.config.example.yaml'],
 ['./node_modules/.bin/ngc','-p','tsconfig.json'],
 ['node','scripts/build.mjs'],
 ['./node_modules/.bin/tailwindcss','-i','tests/fixture-app/styles.css','-o','dist/fixture-app/styles.css'],
]
records=[]
for index,command in enumerate(commands,1):
 path=root/'logs'/f'build-{index}.log'
 start=datetime.datetime.now(datetime.timezone.utc).isoformat()
 with path.open('w') as log:
  process=subprocess.run(command,cwd=snapshot,env=env,stdout=log,stderr=subprocess.STDOUT)
 record={'command':command,'cwd':str(snapshot),'startedAtUTC':start,'finishedAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'actualExitCode':process.returncode,'log':str(path),'logSha256':hashlib.sha256(path.read_bytes()).hexdigest()}
 records.append(record)
 print(json.dumps(record),flush=True)
 if process.returncode!=0:break
result={'sourceHead':'8d01adc6497addd97428507a0d3239dbe093a6a9','commands':records,'actualExitCode':records[-1]['actualExitCode'],'completedCommands':len(records),'expectedCommands':len(commands)}
(root/'build-run.json').write_text(json.dumps(result,indent=2)+'\n')
(root/'build-run.exit').write_text(str(result['actualExitCode'])+'\n')
raise SystemExit(result['actualExitCode'])
