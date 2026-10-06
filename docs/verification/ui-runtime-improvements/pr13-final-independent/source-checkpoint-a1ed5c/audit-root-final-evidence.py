from pathlib import Path
import json,hashlib,base64,datetime,itertools,collections,shutil
BASE=Path('/tmp/ui-foundation-runtime-improvements')
OWN=Path('/tmp/ui-foundation-pr13-independent-final-review')
STAGE=OWN/'repository-a1ed5c'
OUT=OWN/'evidence-a1ed5c/root-records'
OUT.mkdir(exist_ok=True)
COMMIT='a1ed5c012c5b35a50e8df1038e04ade71cf044c4'
sha=lambda b:hashlib.sha256(b).hexdigest()
inputs=[]
def read(p):
 data=p.read_bytes()
 inputs.append({'origin':str(p),'bytes':len(data),'sha256':sha(data)})
 return json.loads(data)
checks={}
for name in ['final-typecheck-a1ed5c0','final-cross12-a1ed5c0-r2','final-focused28-a1ed5c0','final-svg34-a1ed5c0-r2','final-cross12-a1ed5c0','final-svg34-a1ed5c0']:
 folder=BASE/'checks'/name
 result=read(folder/'RESULT.json')
 before=read(folder/'inputs-before.json');after=read(folder/'inputs-after.json')
 assert result['sourceCommit']==COMMIT and before==after
 assert len(before)==458 and result['inputFiles']==458 and result['inputsUnchanged'] is True
 for entry in before:
  local=(STAGE/entry['path']).read_bytes()
  assert len(local)==entry['bytes'] and sha(local)==entry['sha256'],entry['path']
 expected_exit=1 if name in ['final-cross12-a1ed5c0','final-svg34-a1ed5c0'] else 0
 assert result['actualExit']==expected_exit
 checks[name]=result
 for namepart in ['RESULT.json','inputs-before.json','inputs-after.json','stdout-stderr.log','EVIDENCE-MANIFEST.json']:
  dst=OUT/name/namepart;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(folder/namepart,dst)

def walk(suites):
 for suite in suites:
  for spec in suite.get('specs',[]):
   for test in spec.get('tests',[]):yield spec,test
  yield from walk(suite.get('suites',[]))
def attachment(result,name):
 matches=[a for a in result.get('attachments',[]) if a['name']==name]
 assert len(matches)==1,name
 return json.loads(base64.b64decode(matches[0]['body']))
native_cases={}
for folder,count in [('native-cross12-a1ed5c0-r2',12),('native-focused28-a1ed5c0',28)]:
 d=read(BASE/folder/'results.json');pairs=list(walk(d['suites']))
 assert len(pairs)==count and d['stats']['expected']==count
 for key in ['skipped','unexpected','flaky']:assert d['stats'][key]==0
 assert d['errors']==[]
 rows=[]
 for spec,test in pairs:
  assert spec['ok'] is True and test['status']=='expected' and test['expectedStatus']=='passed'
  assert len(test['results'])==1
  r=test['results'][0];assert r['status']=='passed' and r['retry']==0 and r['errors']==[]
  rows.append({'id':spec['id'],'title':spec['title'],'file':spec['file'],'line':spec['line'],'project':test['projectName'],'status':r['status'],'retry':r['retry']})
 native_cases[folder]=rows

cross=read(BASE/'native-cross12-a1ed5c0-r2/results.json')
engines=collections.Counter();versions={};incomplete=collections.Counter();violations=0
for spec,test in walk(cross['suites']):
 r=test['results'][0];runtime=attachment(r,'runtime-engine');axe=attachment(r,'axe-target')
 engines[runtime['engine']]+=1;versions[runtime['engine']]=runtime['version']
 for key in ['runtimeErrors','consoleWarnings','engineAdvisories','unknownWarnings']:assert runtime[key]==[]
 assert axe['violations']==[]
 for rule in axe['incomplete']:incomplete[rule['id']]+=len(rule['nodes'])
 geometry=attachment(r,'native-geometry');assert geometry['documentWidth']==geometry['viewport']==320
 if spec['title'].startswith('Menu '):
  levels=attachment(r,'menu-level-roving');assert all(len(level['tabStops'])==1 for level in levels)
assert dict(engines)=={'chromium':4,'firefox':4,'webkit':4}
assert dict(incomplete)=={'aria-valid-attr-value':18,'color-contrast':34}
cross_receipt=read(BASE/'native-cross12-a1ed5c0-r2/run-receipt.json')
assert cross_receipt['native']['code']==cross_receipt['build']['code']==0 and cross_receipt['serverClosed'] is True
assert cross_receipt['explicitPlaywrightFilters']==['--grep','Menu |Dialog ']

focused=read(BASE/'native-focused28-a1ed5c0/results.json')
closed_rows=[]
for spec,test in walk(focused['suites']):
 r=test['results'][0]
 found=[a for a in r.get('attachments',[]) if a['name']=='native-menu-closed-contract']
 if found:
  data=json.loads(base64.b64decode(found[0]['body']))
  assert data['opened']['open'] is True and data['closed']['open'] is False and data['reopened']['open'] is True
  assert data['closed']['items'] and all(x['tabIndex']==-1 for x in data['closed']['items'])
  assert any(x['back'] for x in data['closed']['items'])
  assert data['reopened']['focus']=='external-open-menu-item-parent'
  closed_rows.append({'caseId':spec['id'],'data':data})
assert len(closed_rows)==2

svg=read(BASE/'native-svg34-a1ed5c0-r2/candidate-paint-native.json')
svg_execution=read(BASE/'native-svg34-a1ed5c0-r2/execution.json')
svg_input=read(BASE/'native-svg34-a1ed5c0-r2/source-input.json')
svg_build=read(BASE/'native-svg34-a1ed5c0-r2/build-results.json')
assert svg_execution['successful'] is True and svg_execution['sourceUnchanged'] is True and svg_execution['ownServerClosed'] is True
assert len(svg_execution['steps'])==6 and all(x['code']==0 for x in svg_execution['steps'])
for entry in svg_input['sourceFiles']:
 local=(STAGE/entry['path']).read_bytes();assert sha(local)==entry['sha256'] and len(local)==entry['bytes']
for entry in svg_input['installed']:assert entry['actual']==entry['expected']
assert svg_build['publicBarrelOnly'] is True and svg_build['production'] is True and svg_build['ngDevMode'] is False
assert all(x['exit']==0 for x in svg_build['results'])
expected=set()
for profile,width,direction in itertools.product(['guided','dense'],[1280,320],['ltr','rtl']):
 for locale,precision,data in [('ar-EG','2','precision'),('ja-JP','9','precision'),('de-DE','2','precision'),('ar-EG','2','edge'),('ar-EG','2','fractional')]:
  if data=='fractional' and (width!=320 or direction!='rtl'):continue
  expected.add((profile,width,direction,locale,precision,data))
rows=svg['rows'];actual=[tuple(r[k] for k in ['profile','width','direction','locale','precision','data']) for r in rows]
assert svg['allExpected'] is True and len(rows)==len(set(actual))==34 and set(actual)==expected
labels=0;minimum=1000
for r in rows:
 assert r['passed'] is True and r['errors']==[] and r['draftAndSelectionPreserved'] is True
 paint=r['paint'];labels+=len(paint['labels']);minimum=min(minimum,paint['minimumContrastRatio'])
 for key in ['totalExactMismatchPixels','originalStrictMismatchPixels','expandedReferenceAlphaMismatch','clippedInkPixels']:assert paint[key]==0
 assert paint['minimumContrastRatio']>=4.5 and paint['inkIntersections']==[]
 assert all(x['inkPixels']>0 and x['contrast']['allOpaque'] and x['clips']==[] for x in paint['labels'])
 assert all(x['reachable'] and x['opacity']=='1' and x['visibility']=='visible' for x in r['liveReachability'])
 assert r['keyboardSelection']=='series/two'

failed_cross=read(BASE/'native-cross12-a1ed5c0/results.json')
assert failed_cross['stats']['expected']==8 and failed_cross['stats']['unexpected']==4
failures=[]
for spec,test in walk(failed_cross['suites']):
 if test['status']=='unexpected':
  assert test['projectName']=='chromium'
  errors=[x['message'] for r in test['results'] for x in r['errors']]
  assert all('browserType.launch' in x and 'Executable doesn' in x for x in errors)
  failures.append({'id':spec['id'],'title':spec['title'],'errors':errors})
failed_svg=read(BASE/'native-svg34-a1ed5c0/execution.json')
assert failed_svg['successful'] is False and failed_svg['nativeContract'] is None and failed_svg['ownServerClosed'] is True
assert failed_svg['steps'][-1]['code']==1
assert not (BASE/'native-svg34-a1ed5c0/candidate-paint-native.json').exists()
failed_svg_log=(BASE/'native-svg34-a1ed5c0/native-glyph-paint-contrast.log').read_text()
assert 'browserType.launch' in failed_svg_log and 'Executable doesn' in failed_svg_log

result={'scope':'Read-only root recorded actual results and exact458 input audit, not own browser execution and not final doc/PR approval','sourceCommit':COMMIT,'ownActualExit':0,'wholePrApproval':False,'inputFiles':458,'allInputBeforeAfterEqual':True,'inputHashesMatchIndependentCanonicalClone':True,'checks':checks,'nativeCases':native_cases,'cross':{'cases':12,'engineCounts':dict(engines),'versions':versions,'violations':0,'incompleteNodesByRule':dict(incomplete),'runtimeErrors':0,'warnings':0,'serverClosed':True,'scope':'Menu/Dialog subset only; previous37 full36 distinct'},'closedMenuRows':closed_rows,'svg':{'cases':34,'uniqueAndExactExpectedCases':True,'labels':labels,'exactRgbaMismatches':0,'runtimeErrors':0,'minimumContrast':minimum,'retainedDraftAndSelection':True,'all6StepsActual0':True,'sourceUnchanged':True,'serverClosed':True,'sourceFiles':len(svg_input['sourceFiles']),'sourceHashesMatchIndependentCanonicalClone':True},'historicalFailedEnvironment':{'crossActualExit':1,'crossPassed8Failed4':True,'crossFailures':failures,'svgActualExit':1,'svgNativeRows':0,'svgSuccessful':False,'failureIsLaunchBeforeNative':True,'classifiedAsProductPass':False},'inputs':inputs,'createdAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(OWN/'evidence-a1ed5c/root-final-evidence-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['ownActualExit','wholePrApproval','sourceCommit','inputFiles','allInputBeforeAfterEqual','inputHashesMatchIndependentCanonicalClone','cross','svg']},ensure_ascii=False))
