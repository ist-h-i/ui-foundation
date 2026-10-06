from pathlib import Path
from urllib.parse import unquote, urlsplit
import collections, datetime, hashlib, json, os, re, subprocess, tarfile

ROOT = Path('/Users/inouehiroshi/Documents/GitHub/ui-foundation')
OWN = Path('/tmp/ui-foundation-final-integration-independent-review')
OUT = OWN / 'final-review-4510797-v4'
HEAD = '4510797802ae53db7f008006de9bece330b5dd03'
PROOF = 'cbbc4c4b9159cb78f40916e44dd376736b0a073c'
RUN = '8e8748afb5d3314c2860d0ae181c23c1a444c9d0'
PRODUCT = 'a808a79dc5f17c1b87280c2881147c8ab5357a9f'
V = ROOT / 'docs/verification/ui-library-final-catalog'
ENV = dict(os.environ, GIT_OPTIONAL_LOCKS='0')
SHA = lambda b: hashlib.sha256(b).hexdigest()
assert not OUT.exists(), 'Use a new output directory; preserve prior evidence.'
OUT.mkdir()

def save(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, env=ENV, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, check=True).stdout

def blobs(commit, paths):
    ordered = sorted(set(paths))
    result = git('cat-file', '--batch') if not ordered else subprocess.run(
        ['git', 'cat-file', '--batch'], cwd=ROOT, env=ENV,
        input=''.join(commit + ':' + path + '\n' for path in ordered).encode(),
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout
    offset, out = 0, {}
    for path in ordered:
        end = result.index(b'\n', offset)
        header = result[offset:end].decode().split()
        assert len(header) == 3 and header[1] == 'blob', (commit, path, header)
        size = int(header[2]); start = end + 1
        out[path] = result[start:start + size]
        offset = start + size + 1
    assert offset == len(result)
    return out

def verify_records(base, records):
    assert len({x['path'] for x in records}) == len(records), str(base)
    for rec in records:
        data = (base / rec['path']).read_bytes()
        assert SHA(data) == rec['sha256'], (str(base), rec['path'])
        if 'bytes' in rec: assert len(data) == rec['bytes'], rec['path']
    return len(records)

assert git('rev-parse', 'HEAD').decode().strip() == HEAD
assert git('status', '--short') == b''
changes = git('diff', '--name-only', RUN, HEAD).decode().splitlines()
assert len(changes) == 1860 and all(p.startswith('docs/') for p in changes)
nonproof = [p for p in changes if not p.startswith('docs/verification/ui-library-final-catalog/')]
assert nonproof == ['docs/ui-library-matrix.json', 'docs/verification/ui-library-final-catalog-2026-10-06.md']
note = nonproof[1]
assert git('diff', '--name-only', PROOF, HEAD).decode().splitlines() == [note]
before_note = blobs(PROOF, [note])[note]
after_note = blobs(HEAD, [note])[note]
old_sentence = '全UI specの追加strict tscはbefore24/after24の既存generic型診断、actual exit2・正規化差分0。新guard単体strict/構文はactual0だがwhole-spec strict成功へ読み替えない。標準の製品strict Templates/AOTは別のactual0である。'
new_sentence = '媒体回帰spec全体の追加strict tscは元/guard付きの2コピーを対象とし、before24/after24の既存generic型診断、actual exit2・正規化差分0。新guard単体strict/構文はactual0だが媒体回帰spec全体のstrict成功へ読み替えない。標準の製品strict Templates/AOTは別のactual0である。'
assert before_note.decode().count(old_sentence) == 1
assert before_note.decode().replace(old_sentence, new_sentence).encode() == after_note
assert (ROOT / note).read_bytes() == after_note
save('docs-only-inheritance.json', {'head': HEAD, 'parentProofCommit': PROOF,
    'executedSourceCommit': RUN, 'productSourceCommit': PRODUCT, 'changedPaths': changes,
    'all1860ChangesDocsOnly': True, 'cbbcToFinalDelta': [note],
    'scopeCorrection': 'Only two copies of media-regressions spec had extra strict tsc; both exit2 with 24 preexisting diagnostics, new guard strict0.',
    'noteBeforeSha256': SHA(before_note), 'noteAfterSha256': SHA(after_note),
    'workingTreeClean': True, 'sharedMutationByReviewer': False})

run_dir = V / 'final-full-npm-8e8748a'
execution_bytes = (run_dir / 'execution.json').read_bytes(); execution = json.loads(execution_bytes)
capture_bytes = (run_dir / 'capture-manifest.json').read_bytes(); capture = json.loads(capture_bytes)
assert execution['sourceCommit'] == RUN and execution['productCodeCommit'] == PRODUCT
assert execution['exitCode'] == 0 and execution['sourceChanged'] == [] and execution['headAfter'] == RUN
assert execution['trackedInputs'] == 457 and execution['workers'] == 2 and execution['retries'] == 0
assert int((run_dir / 'npm-test.exit').read_text()) == 0
assert capture['actualExit'] == 0 and capture['fullRunPassed'] is True and capture['all181CompletedClaim'] is False
assert capture['counts']['registeredUi'] == capture['counts']['completedUi'] == capture['counts']['passedUi'] == 980
assert capture['counts']['failedUi'] == 0
assert [capture['counts'][k] for k in ['configTests','generationTests','modelTests']] == [70,15,183]
assert all(capture['counts'][k] == [0,0,0] for k in ['nodeFailures','nodeSkipped','nodeCancelled'])
assert verify_records(run_dir, capture['files']) == capture['captureFiles'] == 87
source_before = json.loads((run_dir / 'source-before.json').read_bytes())
source_after = json.loads((run_dir / 'source-after.json').read_bytes())
assert source_before == source_after and len(source_before) == 457
assert verify_records(ROOT, source_before) == 457
tracked_paths = set(git('ls-tree', '-r', '--name-only', RUN).decode().splitlines())
input_paths = {x['path'] for x in source_before}
tracked_input_paths = input_paths & tracked_paths
run_blobs = blobs(RUN, tracked_input_paths); final_blobs = blobs(HEAD, tracked_input_paths)
assert run_blobs == final_blobs
assert all((ROOT / p).read_bytes() == final_blobs[p] for p in final_blobs)
assert all(p.startswith(('.ui/', '.agents/')) for p in input_paths - tracked_paths)
freeze_path = V / 'root-final-source-freeze-8e8748a.json'
freeze_bytes = freeze_path.read_bytes(); freeze = json.loads(freeze_bytes)
assert SHA(freeze_bytes) == '30717c847e505993c1ccb9fcaecddf65765b2fe856b9ca5a44b982f417753066'
assert len(freeze['files']) == 274 and freeze['templateTSFiles'] == 139
assert verify_records(ROOT, freeze['files']) == 274
freeze_blobs = blobs(HEAD, [x['path'] for x in freeze['files']])
assert all(SHA(freeze_blobs[x['path']]) == x['sha256'] for x in freeze['files'])
product_paths = [p for p in freeze_blobs if p.startswith('templates/angular/') and p.endswith('.ts')]
assert len(product_paths) == 139
product_blobs = blobs(PRODUCT, product_paths)
assert all(product_blobs[p] == freeze_blobs[p] for p in product_paths)
save('executed-input-inheritance.json', {'head': HEAD, 'runSourceCommit': RUN,
    'productCodeCommit': PRODUCT, 'runStart': execution['start'], 'runEnd': execution['end'],
    'executionSha256': SHA(execution_bytes), 'sourceVectorSha256': execution['sourceManifestSha256'],
    'trackedInputRecords': 457, 'gitTrackedInputFiles': len(tracked_input_paths),
    'ignoredGeneratedInputFiles': len(input_paths - tracked_paths), 'generatedLiveByteExact': True,
    'beforeAfterEqual': True, 'liveByteExact': True, 'gitRunToFinalByteExact': True,
    'freeze274GitLiveExact': True, 'product139InheritedFromA808Exact': True,
    'sourceOrTestChangesFromExecuted8e': [], 'files': source_before})

log_bytes = (run_dir / 'npm-test.log').read_bytes(); log = log_bytes.decode()
counts = {name:[int(x) for x in re.findall(r'^ℹ ' + name + r' (\d+)\s*$', log,re.M)]
          for name in ['tests','pass','fail','cancelled','skipped','todo']}
assert counts['tests'] == counts['pass'] == [70,15,183]
assert all(counts[k] == [0,0,0] for k in ['fail','cancelled','skipped','todo'])
raw_cases = re.findall(r'^\s*([✓✘])\s+(\d+)\s+\[chromium\] › (tests/ui/[^:]+):\d+:\d+ › (.+?) \([^\n]+\)$', log,re.M)
assert len(raw_cases) == 980 and all(x[0] == '✓' for x in raw_cases)
cases = [{'registeredId':int(n),'declarationSource':p,'name':name} for _,n,p,name in raw_cases]
assert {x['registeredId'] for x in cases} == set(range(1,981))
assert len({x['registeredId'] for x in cases}) == 980
assert re.search(r'^\s*980 passed \(', log,re.M)
save('actual-full-run-audit.json', {'sourceCommit': RUN, 'finalProofCommit': HEAD,
    'actualExit':0,'configurationPassed':70,'generationPassed':15,'modelPassed':183,'uiPassed':980,
    'totalPassed':1248,'failed':0,'skipped':0,'cancelled':0,'retriesConfigured':0,'workers':2,
    'rawLogSha256':SHA(log_bytes),'verifiedCapturedFiles':87,'captureSha256':SHA(capture_bytes),
    'registeredIdsUniqueAndComplete':True,'nodeRawSummaries':counts,
    'actualRegisteredUiCases':sorted(cases,key=lambda x:x['registeredId'])})

matrix_bytes = (ROOT / 'docs/ui-library-matrix.json').read_bytes(); matrix = json.loads(matrix_bytes)
old_matrix = json.loads(blobs(PRODUCT, ['docs/ui-library-matrix.json'])['docs/ui-library-matrix.json'])
protected = ['id','category','component','requestedControls','sourceLine','baseline']
assert len(matrix['requirements']) == 181 and len({r['id'] for r in matrix['requirements']}) == 181
assert [{k:r.get(k) for k in protected} for r in matrix['requirements']] == [{k:r.get(k) for k in protected} for r in old_matrix['requirements']]
assert matrix['baselineCommit'] == old_matrix['baselineCommit'] and matrix['completionRule'] == old_matrix['completionRule']
assert collections.Counter(r['status'] for r in matrix['requirements']) == {'verified':181}
assert matrix['checkpoint']['fullCatalogComplete'] is False
assert matrix['checkpoint']['finalMatrixDocReviewPending'] is True
request_bytes = (ROOT / 'docs/ui-library-request.ja.md').read_bytes()
assert SHA(request_bytes) == '7a0a9ab7ac8d084e6c0a396316ed9d8138012c090be773ac291df280284e105b'
assert request_bytes == blobs(PRODUCT, ['docs/ui-library-request.ja.md'])['docs/ui-library-request.ja.md']
lines=request_bytes.decode().splitlines(); norm=lambda t:re.sub(r'\s+',' ',t.replace('**','')).strip()
mapped=[]
for row in matrix['requirements']:
    if row['category']=='foundation':continue
    cells=lines[row['sourceLine']-1].strip().strip('|').split('|')
    assert len(cells)==2 and norm(cells[0])==norm(row['component']) and norm(cells[1])==norm(row['requestedControls']),row['id']
    mapped.append(row['sourceLine'])
raw_rows=[]
for n,line in enumerate(lines,1):
    if not line.startswith('|'):continue
    cells=line.strip().strip('|').split('|')
    if len(cells)==2 and norm(cells[0]) not in ['コンポーネント','機能','部品'] and not norm(cells[0]).startswith('---'):raw_rows.append(n)
assert len(raw_rows)==172 and set(raw_rows)==set(mapped) and len(mapped)==len(set(mapped))
canonical_path=V/'canonical-prep-8e8748a/requirements-48-controls-8e8748a-canonical.json'
canonical_bytes=canonical_path.read_bytes(); canonical=json.loads(canonical_bytes)
assert SHA(canonical_bytes)=='661022561b31de5872710a7714b5930a7d2ec738f4ca41c05b1b15c380f35720'
assert len(canonical['requirements'])==48 and sum(len(r['controlMapping']) for r in canonical['requirements'])==207
new_by_id={r['id']:r for r in canonical['requirements']}; current_by_id={r['id']:r for r in matrix['requirements']}
ref_paths={ref['path'] for r in canonical['requirements'] for field in ['implementationSources','formalTestReferences'] for ref in r[field]}
ref_blobs=blobs(HEAD,ref_paths); implementation_n=formal_n=0
ref_evidence=[]
for row in canonical['requirements']:
    current=current_by_id[row['id']]
    assert row['originalRequestedControls']==current['requestedControls']
    assert row['controlMapping']==current['controlMapping']
    assert current['remainingControls']==current['verificationPending']==[]
    assert current['verifiedSourceHashes']==row['implementationSources']
    assert [{k:x[k] for k in ['path','sha256']} for x in current['verifiedFormalTests']]==[{k:x[k] for k in ['path','sha256']} for x in row['formalTestReferences']]
    for field in ['implementationSources','formalTestReferences']:
        for ref in row[field]:
            assert SHA(ref_blobs[ref['path']])==ref['sha256'] and (ROOT/ref['path']).read_bytes()==ref_blobs[ref['path']], (row['id'],ref)
            ref_evidence.append({'row':row['id'],'kind':field,**{k:ref[k] for k in ['path','sha256']}})
        if field=='implementationSources':implementation_n+=len(row[field])
        else:formal_n+=len(row[field])
assert (implementation_n,formal_n,len(ref_paths))==(115,94,88)
old133=[]
for before,current in zip(old_matrix['requirements'],matrix['requirements']):
    assert before['id']==current['id']
    for field in ['implementation','evidence']:
        for p in current.get(field,[]): assert (ROOT/p).is_file(),(current['id'],p)
    if current['id'] not in new_by_id:
        changed=[k for k in set(before)|set(current) if before.get(k)!=current.get(k)]
        assert changed==['evidence'] or sorted(changed)==['evidence'],(current['id'],changed)
        assert set(before['evidence']).issubset(current['evidence'])
        old133.append({'id':current['id'],'changedFields':changed,'originalScopeIntact':True})
assert len(old133)==133
save('original181-and-controls207.json', {'head':HEAD,'rows':181,'verified':181,'partial':0,'pending':0,
    'protectedFields':protected,'protectedFieldChanges':[],'originalRequestSha256':SHA(request_bytes),
    'originalTableRows':172,'foundationRows':9,'baselineCommitPreserved':True,
    'existing133OnlyEvidenceAppended':old133,'addedRows':48,'mappedControls':207,
    'implementationReferences':115,'formalReferences':94,'totalGitLiveReferences':209,'uniqueFiles':88,
    'canonicalMapSha256':SHA(canonical_bytes),'matrixSha256':SHA(matrix_bytes),'references':ref_evidence,
    'rootCompletionFlagFalseBeforeReview':True,'rootFinalReviewPendingBeforeReview':True})

prep_path=V/'root-final-181-matrix-preparation.json';prep_bytes=prep_path.read_bytes();prep=json.loads(prep_bytes)
shared=prep['sharedTableExecution'];helper=shared['declarationHelper'];registrar=shared['registrationSource']
modules={registrar,'tests/ui/table-expansion-checks.ts','tests/ui/table-expansion-contracts.ts','tests/ui/table-expansion-unicode.ts'}
table_cases=sorted([{'registeredId':x['registeredId'],'name':x['name']} for x in cases if x['declarationSource']==helper],key=lambda x:x['registeredId'])
assert len(table_cases)==54 and table_cases==shared['actualRegisteredCases']
assert len({x['name'] for x in table_cases})==54 and len({x['registeredId'] for x in table_cases})==54
assert shared['actualSharedSuitePassedCases']==54 and shared['actualSharedSuiteFailedCases']==0
assert SHA((ROOT/helper).read_bytes())==shared['declarationHelperSha256']
assert SHA((ROOT/registrar).read_bytes())==shared['registrationSourceSha256']
assert re.search(r'test\(name,\s*async', (ROOT/helper).read_text().splitlines()[24])
registrar_source=(ROOT/registrar).read_text()
assert all(name in registrar_source for name in ['contractChecks(run,profile)', 'unicodeTableChecks(run,profile)', 'tableChecks(run,profile)'])
shared_refs=[];standalone_refs=[];case_counts=collections.Counter(x['declarationSource'] for x in cases)
for row in matrix['requirements']:
    for ref in row.get('verifiedFormalTests',[]):
        if ref['path'] in modules:
            assert ref['actualPassedCases'] is None and ref['actualFailedCases'] is None
            suite=ref['sharedSuiteExecution']
            assert suite['actualSharedSuitePassedCases']==54 and suite['actualSharedSuiteFailedCases']==0
            assert 'actualRegisteredCases' not in suite and suite['caseRecord']=='docs/verification/ui-library-final-catalog/root-final-181-matrix-preparation.json'
            assert {k:v for k,v in suite.items() if k!='caseRecord'}=={k:v for k,v in shared.items() if k!='actualRegisteredCases'}
            shared_refs.append({'id':row['id'],'path':ref['path'],'perModulePassed':None,'sharedPassed':54})
        else:
            assert ref['actualPassedCases']==case_counts[ref['path']] and ref['actualFailedCases']==0,(row['id'],ref)
            standalone_refs.append({'id':row['id'],'path':ref['path'],'actualRegisteredSuitePassed':case_counts[ref['path']]})
assert len(shared_refs)==30 and len(shared_refs)+len(standalone_refs)==94
preparer=Path('/tmp/ui-foundation-final-integration/prepare-final-matrix.py').read_bytes()
save('shared-table-attribution-audit.json',{'head':HEAD,'preparerSha256':SHA(preparer),'preparerExecutedByReviewer':False,
    'actual54DeclarationHelper':helper,'helperLine':25,'registrar':registrar,
    'fourModulePerCountsNull':True,'sharedReferenceRecords':shared_refs,'actualSharedCases':table_cases,
    'actualCaseNamesAndIdsStoredOnceInRootPreparation':True,'no54Times4Count':True,
    'preparationSha256':SHA(prep_bytes),'nonsharedSuiteReferences':standalone_refs})

inventory_path=V/'root-final-proof-commit-preparation.json'; inventory_bytes=inventory_path.read_bytes();inventory=json.loads(inventory_bytes)
assert inventory['proofFiles']==1858 and inventory['proofBytes']==270652598
assert len(inventory['files'])==1858 and len({r['path'] for r in inventory['files']})==1858
assert set(changes)-{r['path'] for r in inventory['files']}=={'docs/verification/ui-library-final-catalog/root-final-proof-commit-preparation.json','docs/verification/ui-library-final-catalog/root-final-docs-checks.json'}
inventory_records=inventory['files']
for i in range(0,len(inventory_records),32):
    group=inventory_records[i:i+32];old_blobs=blobs(PROOF,[r['path'] for r in group])
    for rec in group:
        b=old_blobs[rec['path']];assert SHA(b)==rec['sha256'] and len(b)==rec['bytes'],rec['path']
        live=(ROOT/rec['path']).read_bytes()
        assert live==b or (rec['path']==note and live==after_note),rec['path']
save('proof-inventory-audit.json',{'snapshotCommit':PROOF,'finalCommit':HEAD,'inventorySha256':SHA(inventory_bytes),
    'recordsVerifiedAgainstSnapshotGit':1858,'snapshotBytes':270652598,
    'currentExactRecords':1857,'onlyCurrentChangedRecord':note,'finalNoteSha256':SHA(after_note),
    'selfAndFinalDocsChecksSeparatelyAccounted':True,'immutableSnapshotNotRewritten':True})

adoption_reports=[]
for path in sorted(V.rglob('root-adoption-manifest.json')):
    data=json.loads(path.read_bytes())
    record_key=next(k for k in ['files','artifacts','copied'] if k in data)
    n=verify_records(path.parent,data[record_key])
    adoption_reports.append({'path':str(path.relative_to(ROOT)),'sha256':SHA(path.read_bytes()),'verifiedRecords':n,
                             'recordKey':record_key,'scope':data.get('scope'),'sourceCommit':data.get('sourceCommit')})
pack_reports=[]
for path in sorted(V.rglob('PACK-MANIFEST.json')):
    data=json.loads(path.read_bytes());n=verify_records(path.parent,data['files'])
    pack_reports.append({'path':str(path.relative_to(ROOT)),'sha256':SHA(path.read_bytes()),'verifiedRecords':n,
                         'historicalScopeFlagsPreserved':True})
archive_reports=[]
for archive,manifest_path,records_key,extra in [
    (V/'generated-consumer-review/artifacts/final-consumer-evidence-a808a79d.tar.gz',V/'generated-consumer-review/evidence/pack-file-inventory.json','files','evidence/pack-file-inventory.json'),
    (V/'lightbox-render-followup/lightbox-followup-evidence.tar.gz',V/'lightbox-render-followup/evidence-manifest.json','artifacts','evidence-manifest.json')]:
    expected={r['path']:r for r in json.loads(manifest_path.read_bytes())[records_key]};seen=set()
    with tarfile.open(archive,'r:gz') as t:
        for member in t.getmembers():
            assert member.isfile(),member.name
            name=member.name.removeprefix('./');assert name not in seen;seen.add(name)
            file=t.extractfile(member);b=file.read();assert len(b)==member.size
            if name in expected:
                rec=expected[name];assert len(b)==rec['bytes'] and SHA(b)==rec['sha256'],name
            else:assert name==extra and b==manifest_path.read_bytes(),name
    assert set(expected)<=seen and seen-set(expected)=={extra}
    archive_reports.append({'path':str(archive.relative_to(ROOT)),'sha256':SHA(archive.read_bytes()),'entries':len(seen),'individualHashesVerified':len(expected),'embeddedInventoryByteExact':True})
assert [r['entries'] for r in archive_reports]==[1485,93]
save('portable-pack-sha-audit.json',{'head':HEAD,'rootAdoptionManifests':adoption_reports,'immutablePackManifests':pack_reports,'archives':archive_reports,'extractionOrSharedWrite':False})

history=[]
for dirname in ['third-full-npm-a808a79d-failed','failure-replay-0190b2b','final-failure-replay-53a7858','fourth-full-npm-53a7858-failed','failure-replay-8e8748a']:
    base=V/dirname;ex=json.loads((base/'execution.json').read_bytes());cap=json.loads((base/'capture-manifest.json').read_bytes())
    verify_records(base,cap['files'])
    history.append({'directory':dirname,'executionSha256':SHA((base/'execution.json').read_bytes()),'actualExit':ex.get('exitCode',ex.get('exit')),
                    'counts':cap.get('counts'),'captureSha256':SHA((base/'capture-manifest.json').read_bytes()),'verifiedRecords':len(cap['files'])})
assert [h['actualExit'] for h in history]==[1,1,0,1,0]
save('historical-exit-and-scope-audit.json',{'currentRunExit':0,'histories':history,'oldFailedAndPassedRunsKeptDistinct':True,
    'mediaExtraTscScope':'before/guarded two copies of media regression spec, exit2/24 diagnostics each; new guard strict0; product AOT separately0',
    'knownBoundsKept':['SVG196 and Tree contrast incomplete not rewritten as axe complete','specialist paint actual1/unknown RGB attribution','MSI/pharmacode undecoded','Lightbox original16 race not reproduced; guarded16 and own consumer4 distinct from root selected5','pre-navigation browser closure origin unresolved; retained actual1 trace','SSR screen reader OS IME touch Firefox Safari actual backend and user comprehension not certified','existing output relocation Skill ownership P2 does not affect configured output sync'],
    'additionalUiFullExecutionByReviewer':False})

docs=[ROOT/'README.md',*sorted((ROOT/'docs').glob('*.md')),*sorted((ROOT/'docs/verification').glob('*.md'))]
links=[];missing=[]
for path in docs:
    text=path.read_text();text=re.sub(r'```.*?```','',text,flags=re.S)
    targets=re.findall(r'!?\[[^\]\n]*\]\((<[^>]+>|[^\s)]+)(?:\s+["\'][^\n]*?["\'])?\)',text)
    targets+=re.findall(r'^\[[^\]]+\]:\s*(<[^>]+>|\S+)',text,re.M)
    for raw in targets:
        target=raw.strip('<>');u=urlsplit(target)
        if u.scheme or u.netloc or not u.path:continue
        local=unquote(u.path);local=re.sub(r':\d+$','',local)
        resolved=ROOT/local[1:] if local.startswith('/') else path.parent/local
        rec={'document':str(path.relative_to(ROOT)),'target':target,'exists':resolved.exists()};links.append(rec)
        if not rec['exists']:missing.append(rec)
assert missing==[],missing
guide_path=ROOT/'docs/ui-library-consumer-guide.ja.md';guide_bytes=guide_path.read_bytes()
assert SHA(guide_bytes)=='3f54fad40b11bcdb42b2bd412858c69efc5204afd2fb6facec9d68aecf2168be'
assert guide_bytes==blobs(HEAD,['docs/ui-library-consumer-guide.ja.md'])['docs/ui-library-consumer-guide.ja.md']
save('current-doc-links-and-guide.json',{'head':HEAD,'currentRepositoryDocumentFiles':len(docs),'localLinkRecords':len(links),'missingLinks':missing,
    'scope':'Current README/docs root/verification lead Markdown, not archived originals whose relative link base is retained in pack manifests.',
    'links':links,'consumerGuideSha256':SHA(guide_bytes),'consumerGuideReadInFullIndependently':True,
    'guideContractConsistent':'Public barrel imports, exact dependency/assets/notice/font source, live dictionary/raw app ownership, invalid native draft preservation, nullable forms, app-owned I/O and explicit limited SSR/AT scope.'})

save('AUDIT-RESULT.json',{'recordedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':HEAD,'productCommit':PRODUCT,'runCommit':RUN,
    'auditActualExitExpected':0,'allAssertionsCompleted':True,'original181Protected':True,'additional48Controls207Canonical':True,
    'all209ReferencesGitLiveExact':True,'actualFullPassed1248':True,'actualUiPassed980':True,
    'proofSnapshot1858HashesCorrect':True,'currentOnlyOneScopeParagraphCorrection':True,
    'source139And457InputsUnchanged':True,'remainingBlockers':[],
    'sharedSourceTestGitHostMutation':False,'globalProcessInspectionDeniedUnneeded':True,
    'ownBrowserServerProcessesStartedDuringThisAudit':0,'noFullUiRerunNeeded':True})
for source,dest in [(ROOT/'docs/ui-library-matrix.json','ui-library-matrix.4510797.snapshot.json'),(ROOT/note,'ui-library-final-catalog.4510797.snapshot.ja.md'),
                    (ROOT/'docs/ui-library-request.ja.md','ui-library-request.original.snapshot.ja.md'),(guide_path,'ui-library-consumer-guide.snapshot.ja.md'),
                    (run_dir/'execution.json','full-npm.execution.snapshot.json'),(run_dir/'capture-manifest.json','full-npm.capture-manifest.snapshot.json'),
                    (V/'root-final-181-matrix-preparation.json','root-final-181-matrix-preparation.snapshot.json'),(V/'root-final-docs-checks.json','root-final-docs-checks.snapshot.json')]:
    (OUT/dest).write_bytes(source.read_bytes())
print(json.dumps({'head':HEAD,'auditAssertionsCompleted':True,'source457Exact':True,'product139Exact':True,'verified181':True,
    'controls207':True,'references209GitLive':True,'fullActualExit':0,'totalPassed':1248,'uiPassed':980,'inventory1858Git':True,
    'archiveEntriesVerified':[x['entries'] for x in archive_reports],'blockers':[],'output':str(OUT)},ensure_ascii=False))
