from pathlib import Path,PurePosixPath
import json,hashlib,subprocess,datetime,tarfile,re,collections,functools,urllib.parse
ROOT=Path('/Users/inouehiroshi/Documents/GitHub/ui-foundation')
OWN=Path('/tmp/ui-foundation-pr13-independent-final-review')
OUT=OWN/'final-doc-head-947a9';OUT.mkdir(exist_ok=True)
BASE='9f5430ca87e249af204cc335a8610d0d8040621f'
PRODUCT='a1ed5c012c5b35a50e8df1038e04ade71cf044c4'
BEFORE_DOC='df998f4d7a84173079330dde58ae15cbc9001ac5'
HEAD='947a9eef6ab32bb2596b5687a416a5552be8469f'
DOCBASE='docs/verification/ui-runtime-improvements'
sha=lambda b:hashlib.sha256(b).hexdigest()
@functools.lru_cache(maxsize=None)
def git(commit,path):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def tree(commit,path):return subprocess.check_output(['git','rev-parse',commit+':'+path],cwd=ROOT,text=True).strip()
def jsonfile(path):return json.loads(git(HEAD,path))
def assert_regular_relative(path):
 p=PurePosixPath(path);assert not p.is_absolute() and '..' not in p.parts,path
 assert path not in ['', '.', './'],path
 return p
root_before=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip();assert root_before==HEAD
changed=subprocess.check_output(['git','diff','--name-only',PRODUCT,HEAD],cwd=ROOT,text=True).splitlines()
assert len(changed)==236 and all(p.startswith('docs/') for p in changed)
code_paths=['src','templates','tests','scripts','README.md','package.json','package-lock.json','.ui','.agents','skills','examples','assets','tsconfig.json','tsconfig.tools.json','tsconfig.ui-media.json','tsconfig.ui-runtime.json','playwright.config.ts','playwright.cross-browser.config.ts']
assert subprocess.check_output(['git','diff','--name-only',PRODUCT,HEAD,'--',*code_paths],cwd=ROOT)==b''
correction_paths=subprocess.check_output(['git','diff','--name-only',BEFORE_DOC,HEAD],cwd=ROOT,text=True).splitlines()
assert correction_paths==['docs/ui-runtime-improvements.ja.md']
old_doc=git(BEFORE_DOC,correction_paths[0]);new_doc=git(HEAD,correction_paths[0])
assert old_doc.replace('1,226文字'.encode(),'1,226ラベル'.encode())==new_doc
assert old_doc.count('1,226文字'.encode())==1

source_report=json.loads((OWN/'evidence-a1ed5c/source-adoption-transition.json').read_text())
root_report=json.loads((OWN/'evidence-a1ed5c/root-final-evidence-audit.json').read_text())
for protected in source_report['protectedOriginalDocs']:
 assert sha(git(HEAD,protected['path']))==protected['sha256'] and git(BASE,protected['path'])==git(HEAD,protected['path'])
oldproof='docs/verification/ui-library-final-catalog'
assert tree(BASE,oldproof)==tree(PRODUCT,oldproof)==tree(HEAD,oldproof)
oldproof_count=len(subprocess.check_output(['git','ls-tree','-r','--name-only',HEAD,'--',oldproof],cwd=ROOT,text=True).splitlines())
assert oldproof_count==2020

verification=jsonfile(DOCBASE+'/ROOT-FINAL-VERIFICATION.json')
assert verification['finalProductSourceCommit']==PRODUCT and verification['finalFrozenInputs']==458
assert verification['finalRequiredActualExit']==0 and verification['finalInputDrift'] is False
assert verification['finalExecuted']=={'normalTypecheck':0,'affectedCrossBrowserCases':12,'relatedNavigationAndOverlayCases':28,'requiredHostileSvgPaintCases':34}
assert verification['failedSetupRetained']['crossBrowser']['actualExit']==1
assert verification['failedSetupRetained']['crossBrowser']['passed']==8 and verification['failedSetupRetained']['crossBrowser']['chromiumLaunchFailed']==4
assert verification['failedSetupRetained']['svg']['actualExit']==1 and verification['failedSetupRetained']['svg']['executedNativeCases']==0
assert verification['wholePrIndependentApprovalPending'] is True and verification['mergePending'] is True
assert 'capture-time pending' in verification['reviewStateScope']
assert verification['old181Requirements']=={'complete':True,'matrixModified':False,'original1248ResultRerunClaim':False}
for k,v in [('finalCross12IncompleteNodes',52),('finalCross12IncompleteRules',21),('finalSvg34IncompleteNodes',212)]:assert verification['axeLimits'][k]==v
assert verification['axeLimits']['fullAxePassClaim'] is False
assert verification['axeLimits']['screenReaderSpeechMeasured'] is False and verification['axeLimits']['safariDeviceMeasured'] is False

packs=[]
def audit_pack(relative,manifest_name='PACK-MANIFEST.json',expected=None):
 manifest_path=relative+'/'+manifest_name;data=git(HEAD,manifest_path)
 if expected is not None:assert sha(data)==expected
 m=json.loads(data);entries=m['files'];seen=set();byte_count=0
 for entry in entries:
  assert_regular_relative(entry['path']);assert entry['path'] not in seen;seen.add(entry['path'])
  b=git(HEAD,relative+'/'+entry['path']);assert len(b)==entry['bytes'] and sha(b)==entry['sha256'],relative+'/'+entry['path'];byte_count+=len(b)
 record={'path':relative,'manifest':manifest_name,'manifestSha256':sha(data),'filesVerified':len(entries),'bytesVerified':byte_count}
 packs.append(record);return m
assert len(verification['packs'])==11
for p in verification['packs']:
 audit_pack(DOCBASE+'/'+p['directory'],p['manifest'],p['manifestSha256'])

for relative in ['ownership-independent-v3','media-tree-independent','svg-runner-contract-independent','chart-menu-independent']:
 audit_pack(DOCBASE+'/'+relative)
# Diagram inventory is a source/evidence-specific manifest whose verdict was independently approved earlier.
diagram=jsonfile(DOCBASE+'/diagram-independent/diagram-independent-verdict.json')
assert diagram['verdict'].lower()=='approve'
for path in ['ROOT-SOURCE-ADOPTION.json','ROOT-SOURCE-ADOPTION-SUPPLEMENT.json']:
 assert git(PRODUCT,DOCBASE+'/'+path)==git(HEAD,DOCBASE+'/'+path)

chart_base=DOCBASE+'/chart-menu-independent'
whitelist=jsonfile(chart_base+'/ROOT-TARGET-WHITELIST.json')
assert whitelist['sourceHeadChecked']==PRODUCT
for entry in whitelist['files']:
 b=git(HEAD,entry['path']);assert len(b)==entry['bytes'] and sha(b)==entry['sha256']
assert len(whitelist['files'])==20
chart_verdict=jsonfile(chart_base+'/VERDICT.json');assert chart_verdict['verdict']=='APPROVE' and chart_verdict['rootHeadChecked']==PRODUCT
assert chart_verdict['sourceAndOtherAuthorsChangedByCritic'] is False and chart_verdict['remainingScopeBlockers']==[]
assert chart_verdict['nativeIndependent']['chartFrames']==18 and chart_verdict['nativeIndependent']['menuFinalCases']==7
archive_inventory=jsonfile(chart_base+'/FILES-MANIFEST.json')
records={e['path']:e for e in archive_inventory['files']};assert len(records)==len(archive_inventory['files'])==1283
archive_manifest_bytes=git(HEAD,chart_base+'/FILES-MANIFEST.json')
archive_checksums=git(HEAD,chart_base+'/FILES-MANIFEST.sha256')
archive=ROOT/chart_base/'chart-menu-independent-proof-a1ed5c0.tar.gz'
assert archive.read_bytes()==git(HEAD,chart_base+'/chart-menu-independent-proof-a1ed5c0.tar.gz')
seen=set();dirs=0;archive_total=0
archive_prefix='chart-menu-independent-proof/'
with tarfile.open(archive,'r:gz') as t:
 for member in t:
  assert_regular_relative(member.name)
  if member.isdir():
   assert member.name=='chart-menu-independent-proof' or member.name.startswith(archive_prefix),member.name
   dirs+=1;continue
  assert member.isfile(),member.name
  assert member.name.startswith(archive_prefix),member.name
  relative=member.name[len(archive_prefix):];assert_regular_relative(relative)
  assert relative not in seen;seen.add(relative)
  f=t.extractfile(member);digest=hashlib.sha256();size=0
  while True:
   chunk=f.read(1024*1024)
   if not chunk:break
   digest.update(chunk);size+=len(chunk)
  archive_total+=size
  if relative in records:
   row=records[relative];assert size==row['bytes'] and digest.hexdigest()==row['sha256'],member.name
  elif relative=='FILES-MANIFEST.json':assert digest.hexdigest()==sha(archive_manifest_bytes) and size==len(archive_manifest_bytes)
  elif relative=='FILES-MANIFEST.sha256':assert digest.hexdigest()==sha(archive_checksums) and size==len(archive_checksums)
  else:raise AssertionError('Unexpected archive regular file '+member.name)
assert len(seen)==1285 and set(records).issubset(seen)

# Relative Markdown links in changed entry/report documents must resolve inside the frozen Git tree.
links=[];external=[]
for path in changed:
 if not path.endswith('.md'):continue
 text=git(HEAD,path).decode()
 for match in re.finditer(r'(?<!!)\[[^\]]+\]\(([^\)]+)\)',text):
  target=match.group(1).strip().split(' ',1)[0].strip('<>')
  if not target or target.startswith('#'):continue
  if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:',target):external.append({'document':path,'target':target});continue
  target=urllib.parse.unquote(target.split('#',1)[0].split('?',1)[0])
  if target.startswith('/'):
   # Historical absolute paths are origin provenance, not a new frozen-repository link.
   continue
  import posixpath
  resolved=posixpath.normpath(str(PurePosixPath(path).parent/target))
  assert not resolved.startswith('../'),resolved
  assert subprocess.run(['git','cat-file','-e',HEAD+':'+resolved],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0,(path,target,resolved)
  links.append({'document':path,'target':target,'resolved':resolved})
assert not subprocess.check_output(['git','status','--porcelain','-uno'],cwd=ROOT)
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==HEAD

for path in ['docs/ui-runtime-improvements.ja.md','docs/cross-browser-runtime-verification.ja.md',DOCBASE+'/ROOT-FINAL-VERIFICATION.json',chart_base+'/VERDICT.json',chart_base+'/REVIEW.ja.md',chart_base+'/ROOT-ARCHIVE-AUDIT.json']:
 target=OUT/'reviewed-entry-docs'/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(git(HEAD,path))
result={'verdict':'APPROVE_FINAL_PR13_SOURCE_DOCS_EVIDENCE_947A9','reviewedHead':HEAD,'productSourceCommit':PRODUCT,'priorDocHead':BEFORE_DOC,'ownActualExit':0,'sourceDiffAfterProduct':[],'docProofChangedPaths':len(changed),'docCorrection':{'path':correction_paths[0],'beforeSha256':sha(old_doc),'afterSha256':sha(new_doc),'exactOnlyLabelUnitCorrection':True},'original181Protected':True,'original2020ProofTreeUnchanged':True,'original1248RerunClaim':False,'rootFinal458InputsExact':True,'rootPackIndexCount':11,'packs':packs,'chartMenuArchive':{'payloadVerified':1283,'allRegularFilesVerified':1285,'safeDirectories':dirs,'bytesStreamVerified':archive_total,'archiveSha256':sha(archive.read_bytes()),'sourceExtractedOrCopied':False,'duplicatesOrUnsafeFiles':False},'chartMenuSourceWhitelist20Exact':True,'links':links,'externalReferenceLinks':external,'capturePendingRetainedAndScoped':True,'historicalFailuresRetained':True,'scopeOnlyApprovalsRetained':True,'remainingProductOrDocBlockers':[],'limitationsRetained':['No all-UI strict guarantee: Media3 and Runtime4 only.','Original1248 not rerun for PR13.','Cross final12 subset and older37 full36 differ; no duplicate coverage total.','SVG212 and finalcross52 axe incomplete retained, not passed.','RealAT speech/Safari hardware/unmeasured contexts remain outside scope.','OrdinaryIO rollback is not crash/concurrent-root atomicity.','Approval covers exact947a9 source/docs/proof; subsequent evidence-only adoption and GitHub merge require a byte bridge.'],'sharedSourceGitOrHostMutations':False,'newOwnNativeExecution':False,'createdAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(OUT/'FINAL-HEAD-AUDIT.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['verdict','reviewedHead','ownActualExit','docProofChangedPaths','rootPackIndexCount','chartMenuArchive','remainingProductOrDocBlockers']},ensure_ascii=False))
