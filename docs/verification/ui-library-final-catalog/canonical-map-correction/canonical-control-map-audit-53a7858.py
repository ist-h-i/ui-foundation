from pathlib import Path
import json,hashlib,subprocess,os,datetime
base=Path('/tmp/ui-foundation-final-integration-independent-review');root=Path('/Users/inouehiroshi/Documents/GitHub/ui-foundation')
commit='53a785824b86a34ada3ee8619f710fad57117634';oldPath=base/'evidence/requirements-48-controls-53a7858.json';oldBytes=oldPath.read_bytes();old=json.loads(oldBytes)
corrected=json.loads(oldBytes);changes=[]
oldTest='tests/ui/date-format-draft.spec.ts';newTest='tests/ui/foundation-date-format-retention.spec.ts';newSha='5af3c6c61f2b7ab8f6613a3758db96662130a6e974ed0c8bde9c1c6d61cd4aa3'
for row in corrected['requirements']:
 for ref in row['formalTestReferences']:
  if ref['path']==oldTest:
   changes.append({'rowId':row['id'],'beforePath':ref['path'],'beforeSha256':ref['sha256'],'afterPath':newTest,'afterSha256':newSha})
   ref['path']=newTest;ref['sha256']=newSha
assert {x['rowId'] for x in changes}=={'foundation-07','foundation-08'} and len(changes)==2
paths=sorted({ref['path'] for row in corrected['requirements'] for field in ['implementationSources','formalTestReferences'] for ref in row[field]})
env=dict(os.environ);env['GIT_OPTIONAL_LOCKS']='0'
result=subprocess.run(['git','cat-file','--batch'],cwd=root,env=env,input=''.join(commit+':'+path+'\n' for path in paths).encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
data=result.stdout;offset=0;canonical={};records=[]
for path in paths:
 end=data.index(b'\n',offset);header=data[offset:end].decode().split();assert len(header)==3 and header[1]=='blob',(path,header)
 start=end+1;size=int(header[2]);blob=data[start:start+size];offset=start+size+1
 h=hashlib.sha256(blob).hexdigest();live=root/path;assert live.is_file() and hashlib.sha256(live.read_bytes()).hexdigest()==h,path
 canonical[path]=h;records.append({'path':path,'gitAndLiveSha256':h,'bytes':len(blob)})
assert offset==len(data);assert canonical[newTest]==newSha
referenceCount=0;implementationCount=0;formalCount=0
for before,row in zip(old['requirements'],corrected['requirements']):
 assert before['id']==row['id'] and before['originalRequestedControls']==row['originalRequestedControls'] and before['controlMapping']==row['controlMapping'] and before['implementationSources']==row['implementationSources']
 for field in ['implementationSources','formalTestReferences']:
  for ref in row[field]:
   referenceCount+=1;assert canonical[ref['path']]==ref['sha256'],(row['id'],ref)
  if field=='implementationSources':implementationCount+=len(row[field])
  else:formalCount+=len(row[field])
assert referenceCount==209 and implementationCount==115 and formalCount==94
corrected['canonicalReferenceAudit']='evidence/53a7858-canonical-map-reference-audit.json';corrected['proofPathCorrections']=changes;corrected['rootFreshFullNpmPassed']=False;corrected['finalMatrixApproval']=False
out=base/'evidence/requirements-48-controls-53a7858-canonical.json';assert not out.exists();out.write_text(json.dumps(corrected,ensure_ascii=False,indent=2)+'\n')
report={'recordedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commit':commit,'source':'53 Git blobs and shared canonical files, never private original filenames','oldMappingSha256':hashlib.sha256(oldBytes).hexdigest(),'correctedMappingSha256':hashlib.sha256(out.read_bytes()).hexdigest(),'rows':48,'controls':207,'implementationReferenceCount':implementationCount,'formalReferenceCount':formalCount,'totalReferenceRecords':referenceCount,'uniqueCanonicalFiles':len(paths),'gitCatFileActualExit':result.returncode,'allGitLiveRecordedShaExact':True,'pathOrHashMismatch':[],'proofOnlyCorrections':changes,'allOriginalControlMappingsAndProductHashesPreserved':True,'sourceAndTestMutation':False,'oldMapPreservedByteExact':oldPath.read_bytes()==oldBytes,'canonicalDateFormalReview':{'path':newTest,'sha256':newSha,'cases':'Two native DateRange cases per guided/dense =four registrations. Initial invalid text/native badInput remains raw+same DOM/focus/caret/INVALID+last range while requested provider formats change; repair/clear/reset/calendar adopts requested format. Native Home/Backspace creates badInput without stubbing validity.','claim':'Formal source read and canonical identity verified; final full actual root result still pending.'},'all181Complete':False,'rootFullNpmSuccessClaim':False,'finalMatrixDocApproval':False,'files':records}
(base/'evidence/53a7858-canonical-map-reference-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(base/'evidence/53a7858-canonical-date-formal.spec.ts').write_bytes((root/newTest).read_bytes())
print(json.dumps({k:report[k] for k in ['correctedMappingSha256','rows','controls','implementationReferenceCount','formalReferenceCount','totalReferenceRecords','uniqueCanonicalFiles','allGitLiveRecordedShaExact','proofOnlyCorrections','oldMapPreservedByteExact','rootFullNpmSuccessClaim']},ensure_ascii=False))
