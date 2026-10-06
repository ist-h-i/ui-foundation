import collections, hashlib, json, pathlib

root=pathlib.Path(__file__).resolve().parent
author=pathlib.Path('/tmp/ui-foundation-tree-escape-final-review/runtime-axe-gap-20261006-120724/portablepack')
rows=json.loads((author/'evidence/classification-final42.json').read_text())
checked=[];refs=[]
def check_ref(ref):
    file=author/ref['file'];data=file.read_bytes()
    assert hashlib.sha256(data).hexdigest()==ref['sha256'],ref
    pointer=ref.get('jsonPointer','')
    if pointer:
        value=json.loads(data)
        for part in pointer.lstrip('/').split('/'):
            token=part.replace('~1','/').replace('~0','~')
            value=value[int(token)] if isinstance(value,list) else value[token]
        assert value is not None,ref
    refs.append(ref)
for row in rows:
    originalFile=author/row['originalResult'];data=originalFile.read_bytes()
    assert hashlib.sha256(data).hexdigest()==row['originalResultSha256']
    original=json.loads(data)
    rule=next(r for r in original['incomplete'] if r['id']==row['rule'])
    node=rule['nodes'][row['nodeIndex']]
    assert node['target']==row['target']
    assert node['failureSummary']==row['failureSummary']
    reasons=[c.get('data',{}).get('messageKey') for kind in ['any','all','none'] for c in node[kind] if isinstance(c.get('data'),dict)]
    assert row['reason'] in reasons,(row['id'],reasons)
    assert row['axeVerdictRetained']=='incomplete'
    fresh=row['freshUnmodifiedAxeResult'];check_ref(fresh)
    freshResult=json.loads((author/fresh['file']).read_text())
    assert any(r['id']==row['rule'] and any(n['target']==row['target'] for n in r['nodes']) for r in freshResult['incomplete'])
    for ref in row['automaticEvidence']:check_ref(ref)
    checked.append({'id':row['id'],'profile':row['profile'],'state':row['state'],'rule':row['rule'],'target':row['target'],'reason':row['reason'],'incompleteRetained':True,'refs':1+len(row['automaticEvidence'])})
result={'pass':True,'rows':len(rows),'reasonCounts':dict(collections.Counter(r['reason'] for r in rows)),'referenceInstances':len(refs),'checkedRows':checked,'noAxePassRetag':True,'automaticSupplementScope':'Chromium DOM/AX, selected painted glyphs and reachable clipped text; not AT speech or all-state accessibility'}
(root/'evidence'/'tree-original42-and-refs-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='checkedRows'}))
