from pathlib import Path
import hashlib,json,re,sys
out=Path('/tmp/ui-foundation-pr-20261009')
execution=json.loads((out/'execution.json').read_text())
results=execution['results']
if len(results)!=2 or any(row['exitCode']!=0 or not row['sourceUnchanged'] or not row['headUnchanged'] for row in results):
 raise SystemExit('The final commands have not both completed successfully with unchanged inputs/head')
log=(out/'aggregate.log').read_text()
expected={'test:config':70,'test:generation':23,'test:model':193}
stages={}
for name,count in expected.items():
 marker='> ui-foundation@0.0.0 '+name+'\n'
 section=log.split(marker,1)[1].split('\n> ui-foundation@',1)[0]
 values={}
 for key in ['tests','pass','fail','cancelled','skipped','todo']:
  matches=re.findall(r'(?:ℹ |# )'+key+r' (\d+)',section)
  if len(matches)!=1:raise SystemExit('Unexpected summary for '+name+' '+key)
  values[key]=int(matches[0])
 if values['tests']!=count or values['pass']!=count or any(values[key] for key in ['fail','cancelled','skipped','todo']):
  raise SystemExit('Unsuccessful or incomplete '+name)
 stages[name]=values
ui=log.split('> ui-foundation@0.0.0 test:ui\n',1)[1].split('\n> ui-foundation@0.0.0 test:svg-paint',1)[0]
total=int(re.search(r'Running (\d+) tests using 2 workers',ui)[1])
ui_passes=re.findall(r'^\s*✓\s+\d+ ',ui,re.M)
ui_failures=re.findall(r'^\s*✘\s+.*',ui,re.M)
summary=re.findall(r'(?<!\d)(\d+) passed \(([^)]+)\)',ui)
skip=re.findall(r'(?<!\d)(\d+) skipped',ui)
flaky=re.findall(r'(?<!\d)(\d+) flaky',ui)
if total!=1173 or len(ui_passes)!=total or ui_failures or len(summary)!=1 or int(summary[0][0])!=total or skip or flaky:
 raise SystemExit('UI execution is unsuccessful, incomplete or skipped')
stages['test:ui']={'listedTests':total,'passed':len(ui_passes),'failed':0,'skipped':0,'flaky':0,'retries':0,'workers':2,'reportedDuration':summary[0][1]}
svg=[json.loads(line) for line in log.splitlines() if line.startswith('{"scope":"Generated public Chart consumer')]
if len(svg)!=1 or not svg[0]['successful'] or not svg[0]['nativeContract']['allSuccessful'] or svg[0]['nativeContract']['recordedScenarios']!=34 or any(row['exit']!=0 for row in svg[0]['steps']):
 raise SystemExit('Permanent SVG contract is unsuccessful or incomplete')
stages['test:svg-paint']={'requiredScenarios':34,'recordedScenarios':34,'allSuccessful':True,'steps':svg[0]['steps']}
v=(out/'verification-tools.log').read_text()
verification={key:int(re.findall(r'(?:ℹ |# )'+key+r' (\d+)',v)[-1]) for key in ['tests','pass','fail','cancelled','skipped','todo']}
if verification['tests']!=58 or verification['pass']!=58 or any(verification[key] for key in ['fail','cancelled','skipped','todo']):
 raise SystemExit('Verification-tools execution is unsuccessful or incomplete')
stages['test:verification']=verification
for row in results:
 if hashlib.sha256((out/row['log']).read_bytes()).hexdigest()!=row['logSha256']:
  raise SystemExit('Execution log digest changed')
summary={'testedHead':results[0]['head'],'commands':[{'name':row['name'],'command':row['command'],'startedAt':row['startedAt'],'endedAt':row['endedAt'],'exitCode':row['exitCode'],'sourceFiles':row['sourceFiles'],'sourceUnchanged':row['sourceUnchanged'],'headUnchanged':row['headUnchanged'],'logSha256':row['logSha256']} for row in results],'environment':execution['environment'],'stages':stages,'dedicatedLintScript':False,'staticChecks':'canonical ui:check, tools/Angular/media/runtime strict typechecking, git diff whitespace check; these are distinct from browser, axe and independent semantic/visual review','claimsExclude':['Firefox/WebKit','actual devices and screen readers','business backend save/send/undo','browser zoom; font scaling was root-font 200%']}
(out/'final-test-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False,indent=2))
