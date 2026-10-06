from pathlib import Path
import json,hashlib,tarfile,urllib.request
stage=Path('/tmp/ui-foundation-media-gauge-independent-review');repo=stage/'repository'
source=repo/'assets/pdf-source';dist=repo/'dist/fixture-app/assets/pdf/source'
mapping=json.loads((source/'FONT-MAPPING.json').read_text());rows=[]
sha=lambda data:hashlib.sha256(data).hexdigest()
for p in sorted(source.iterdir()):
 if not p.is_file():continue
 raw=p.read_bytes();built=(dist/p.name).read_bytes()
 response=urllib.request.urlopen('http://127.0.0.1:5342/assets/pdf/source/'+p.name);served=response.read()
 rows.append({'path':str(p.relative_to(repo)),'bytes':len(raw),'sha256':sha(raw),'buildCopyMatches':raw==built,'httpStatus':response.status,'contentType':response.headers['Content-Type'],'servedMatches':raw==served})
fonts=[]
with tarfile.open(source/'fonts-liberation_1.07.4.orig.tar.gz') as archive:
 for item in mapping['fonts']:
  preferred=archive.extractfile('liberation-fonts-1.07.4/'+item['originalSource']).read()
  installed=(repo/item['installedPath']).read_bytes();distributed=(repo/'dist/fixture-app'/item['distributedPath']).read_bytes()
  fonts.append({'font':item['font'],'preferredSourceBytes':len(preferred),'preferredSourceMatchesRecordedSHA':sha(preferred)==item['originalSourceSha256'],'installedMatchesRecordedSHA':sha(installed)==item['binarySha256'],'buildCopyMatches':installed==distributed,'preferredSourceSHA256':sha(preferred),'binarySHA256':sha(installed)})
archives=[]
for name in ['fonts-liberation_1.07.4.orig.tar.gz','fonts-liberation_1.07.4-11.debian.tar.xz']:
 with tarfile.open(source/name) as archive:archives.append({'name':name,'entries':archive.getnames(),'archiveSHA256':sha((source/name).read_bytes())})
dsc=(source/'fonts-liberation_1.07.4-11.dsc').read_text();checks=[]
for line in dsc.split('Checksums-Sha256:\n',1)[1].split('\nFiles:',1)[0].splitlines():
 parts=line.strip().split()
 if len(parts)==3 and (source/parts[2]).exists():raw=(source/parts[2]).read_bytes();checks.append({'file':parts[2],'shaMatches':sha(raw)==parts[0],'bytesMatch':len(raw)==int(parts[1])})
worker=(repo/'node_modules/pdfjs-dist/build/pdf.worker.mjs').read_bytes();response=urllib.request.urlopen('http://127.0.0.1:5342/assets/pdf/pdf.worker.mjs');served=response.read()
workerRow={'mainVersion':json.loads((repo/'node_modules/pdfjs-dist/package.json').read_text())['version'],'servedMatchesInstalled':served==worker,'contentType':response.headers['Content-Type'],'sha256':sha(served)}
wasm=[]
for p in sorted((repo/'dist/fixture-app/assets/pdf/wasm').glob('*.wasm')):
 response=urllib.request.urlopen('http://127.0.0.1:5342/assets/pdf/wasm/'+p.name);served=response.read()
 wasm.append({'file':p.name,'servedMatches':served==p.read_bytes(),'magicMatches':served[:4]==b'\0asm','contentType':response.headers['Content-Type'],'sha256':sha(served)})
failed=[row for row in rows if not row['buildCopyMatches'] or not row['servedMatches']]+[row for row in fonts if not row['preferredSourceMatchesRecordedSHA'] or not row['installedMatchesRecordedSHA'] or not row['buildCopyMatches']]+[row for row in checks if not row['shaMatches'] or not row['bytesMatch']]
if not workerRow['servedMatchesInstalled'] or 'javascript' not in workerRow['contentType']:failed.append(workerRow)
failed += [row for row in wasm if not row['servedMatches'] or not row['magicMatches'] or row['contentType']!='application/wasm']
result={'sourcekit':rows,'fonts':fonts,'archives':archives,'dscChecks':checks,'worker':workerRow,'wasm':wasm,'notExecuted':['FontForge rebuild','PGP signature validation'],'sourcekitFiles':len(rows),'fontBinaryCount':len(fonts),'legalDetermination':None,'failures':failed,'exit':1 if failed else 0}
(stage/'evidence/pdf-sourcekit-independent.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
requirements=json.loads((repo/'docs/ui-library-matrix.json').read_text())['requirements']
(stage/'evidence/media-requirements-original.json').write_text(json.dumps([row for row in requirements if row['id'].startswith('media-')],ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'sourcekitFiles':len(rows),'fontBinaryCount':len(fonts),'dscChecks':len(checks),'worker':workerRow,'wasmCount':len(wasm),'failures':failed,'exit':result['exit']},indent=2))
raise SystemExit(result['exit'])
