import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cp,link,mkdir,mkdtemp,readFile,rm,symlink,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

const repository=fileURLToPath(new URL('../../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const scripts=join(repository,'scripts/verification');
function run(command,args,cwd){
  const result=spawnSync(command,args,{cwd,encoding:'utf8',timeout:120_000,maxBuffer:4_000_000});
  assert.equal(result.error,undefined,String(result.error));
  assert.equal(result.signal,null,result.stderr);
  return result;
}
const payloads=[
  {script:'build-handoff.py',name:'media-tree-independent',manifest:'PACK-MANIFEST.json'},
  {script:'build-public-proof.py',name:'cross-browser-author',manifest:'files-manifest.json'}
];

test('portable evidence tools verify exact historical payloads and reject invalid transfers',async t=>{
  const temporary=await mkdtemp(join(tmpdir(),'ui-verification-transfer-'));
  t.after(()=>rm(temporary,{recursive:true,force:true}));
  const elsewhere=join(temporary,'unrelated-cwd');await mkdir(elsewhere);
  for(const kind of payloads){
    const source=join(repository,'docs/verification/ui-runtime-improvements',kind.name);
    const manifestBytes=await readFile(join(source,kind.manifest));
    const manifest=JSON.parse(manifestBytes);
    const metadata=await readFile(join(source,'ROOT-ADOPTION.json'));
    const args=(input,output,manifestSha=hash(manifestBytes),metadataSha=hash(metadata))=>[
      join(scripts,kind.script),'--source-pack',input,'--manifest',kind.manifest,
      '--manifest-sha256',manifestSha,...(metadataSha?['--transport-metadata-sha256',metadataSha]:[]),
      '--output',output
    ];
    const exported=join(temporary,kind.name);
    await t.test(`${kind.name}: another cwd exports every exact byte`,async()=>{
      const result=run('python3',args(source,exported),elsewhere);
      assert.equal(result.status,0,result.stderr);
      assert.deepEqual(await readFile(join(exported,'payload',kind.manifest)),manifestBytes);
      assert.deepEqual(await readFile(join(exported,'payload','ROOT-ADOPTION.json')),metadata);
      for(const row of manifest.files){
        const bytes=await readFile(join(exported,'payload',row.path));
        assert.equal(bytes.length,row.bytes,row.path);assert.equal(hash(bytes),row.sha256,row.path);
      }
      const receipt=await readFile(join(exported,'transport-receipt.json'),'utf8');
      assert.match(receipt,/transport/i);
      const tarAudit=run('python3',['-c',
        "import sys,tarfile,json,hashlib; t=tarfile.open(sys.argv[1]); m=json.loads(t.extractfile(sys.argv[2]).read()); rows=m['files']; names=[x.name for x in t.getmembers()]; assert len(names)==len(set(names)); assert all(x.isfile() or x.isdir() for x in t.getmembers());\nfor r in rows:\n b=t.extractfile(r['path']).read(); assert len(b)==r['bytes'] and hashlib.sha256(b).hexdigest()==r['sha256'],r['path']\nprint(len(rows))",
        join(exported,'payload.tar.gz'),kind.manifest],elsewhere);
      assert.equal(tarAudit.status,0,tarAudit.stderr);
      assert.equal(Number(tarAudit.stdout.trim()),manifest.fileCount);
    });
    await t.test(`${kind.name}: exported pack can be verified again`,()=>{
      const result=run('python3',args(join(exported,'payload'),join(temporary,kind.name+'-again')),elsewhere);
      assert.equal(result.status,0,result.stderr);
    });
    for(const [label,manifestSha,metadataSha] of [
      ['wrong manifest digest','0'.repeat(64),hash(metadata)],
      ['wrong adoption digest',hash(manifestBytes),'0'.repeat(64)],
      ['missing adoption digest',hash(manifestBytes),null]
    ])await t.test(`${kind.name}: ${label} fails`,()=>{
      assert.notEqual(run('python3',args(source,join(temporary,kind.name+'-'+label.replaceAll(' ','-')),manifestSha,metadataSha),elsewhere).status,0);
    });
    await t.test(`${kind.name}: existing output is preserved`,async()=>{
      const output=join(temporary,kind.name+'-existing');await mkdir(output);await writeFile(join(output,'keep.txt'),'application-owned');
      assert.notEqual(run('python3',args(source,output),elsewhere).status,0);
      assert.equal(await readFile(join(output,'keep.txt'),'utf8'),'application-owned');
    });
    await t.test(`${kind.name}: output inside source is rejected`,()=>{
      assert.notEqual(run('python3',args(join(exported,'payload'),join(exported,'payload','nested-output')),elsewhere).status,0);
    });
    const mutable=join(temporary,kind.name+'-mutable');await cp(join(exported,'payload'),mutable,{recursive:true});
    const victim=join(mutable,manifest.files[0].path);const original=await readFile(victim);
    const linkTarget=join(temporary,kind.name+'-same-byte-link-target');await writeFile(linkTarget,original);
    for(const mode of ['changed-byte','missing-file','symlink','hardlink','unlisted-file','duplicate-path','parent-path','backslash-path']){
      await t.test(`${kind.name}: ${mode} is rejected`,async()=>{
        const extra=join(mutable,'unlisted.tmp');let currentManifest=manifestBytes;
        if(mode==='changed-byte')await writeFile(victim,Buffer.concat([original,Buffer.from('changed')]));
        if(['missing-file','symlink','hardlink'].includes(mode))await rm(victim);
        if(mode==='symlink')await symlink(linkTarget,victim);
        if(mode==='hardlink')await link(linkTarget,victim);
        if(mode==='unlisted-file')await writeFile(extra,'unlisted');
        if(['duplicate-path','parent-path','backslash-path'].includes(mode)){
          const invalid=structuredClone(manifest);
          if(mode==='duplicate-path'){invalid.files.push({...invalid.files[0]});invalid.fileCount++;invalid.totalBytes+=invalid.files[0].bytes;}
          else invalid.files[0].path=mode==='parent-path'?'../outside.txt':'candidate\\outside.txt';
          currentManifest=Buffer.from(JSON.stringify(invalid));await writeFile(join(mutable,kind.manifest),currentManifest);
        }
        const result=run('python3',args(mutable,join(temporary,kind.name+'-'+mode),hash(currentManifest)),elsewhere);
        assert.notEqual(result.status,0,`${mode} unexpectedly accepted`);
        await rm(victim,{force:true});await mkdir(dirname(victim),{recursive:true});await writeFile(victim,original);
        await rm(extra,{force:true});await writeFile(join(mutable,kind.manifest),manifestBytes);
      });
    }
  }
});

test('Media audit uses selected Git baseline and real strict compiler failures',async t=>{
  const temporary=await mkdtemp(join(tmpdir(),'ui-verification-media-'));
  t.after(()=>rm(temporary,{recursive:true,force:true}));
  const fixture=join(temporary,'checkout');const elsewhere=join(temporary,'elsewhere');
  await mkdir(join(fixture,'tests/ui'),{recursive:true});await mkdir(elsewhere);
  await writeFile(join(fixture,'package.json'),'{"type":"module"}');
  await symlink(join(repository,'node_modules'),join(fixture,'node_modules'),'dir');
  const names=['media.spec.ts','media-regressions.spec.ts','media-lifetime.spec.ts'];
  for(const name of names)await writeFile(join(fixture,'tests/ui',name),
    `export {}; declare const test:(title:string,body:()=>void)=>void; declare const expect:(value:unknown,label?:string)=>{toBe:(value:unknown)=>void}; test('${name}  title',()=>{expect('a  b','label  exact').toBe('a  b')});\n`);
  await writeFile(join(fixture,'tests/ui/media-test-dom.ts'),'export const readable=(value:unknown):boolean=>typeof value===\'string\';\n');
  const config={compilerOptions:{strict:true,noEmit:true,skipLibCheck:true,target:'ES2022',module:'NodeNext',moduleResolution:'NodeNext',types:[]},include:['tests/ui/*.ts']};
  await writeFile(join(fixture,'tsconfig.ui-media.json'),JSON.stringify(config));
  for(const args of [['init','--quiet'],['add','package.json','tests','tsconfig.ui-media.json'],['-c','user.name=Verification fixture','-c','user.email=verification-fixture@example.invalid','commit','--quiet','-m','Media baseline fixture']]){
    const result=run('git',args,fixture);assert.equal(result.status,0,result.stderr);
  }
  const baseline=run('git',['rev-parse','HEAD'],fixture).stdout.trim();
  const audit=(name,ref=baseline)=>run(process.execPath,[join(scripts,'audit-media.mjs'),'--repo',fixture,'--baseline',ref,'--output',join(temporary,name)],elsewhere);
  await t.test('unchanged assertions pass from an unrelated cwd',async()=>{
    const result=audit('valid');assert.equal(result.status,0,result.stderr);
    const report=JSON.parse(await readFile(join(temporary,'valid','media-audit.json'),'utf8'));
    assert.equal(report.matcherCount,3);assert.equal(report.titleCount,3);assert.equal(report.afterAny,0);
  });
  await t.test('default repo follows the script checkout rather than process cwd',async()=>{
    await cp(scripts,join(fixture,'scripts/verification'),{recursive:true});
    const result=run(process.execPath,[join(fixture,'scripts/verification/audit-media.mjs'),'--baseline',baseline,'--output',join(temporary,'default-repo')],elsewhere);
    assert.equal(result.status,0,result.stderr);
    const report=JSON.parse(await readFile(join(temporary,'default-repo','media-audit.json'),'utf8'));
    assert.equal(report.matcherCount,3);assert.equal(report.titleCount,3);
  });
  await t.test('missing baseline fails',()=>assert.notEqual(audit('missing','refs/heads/missing-verification-baseline').status,0));
  await t.test('existing audit output is preserved',async()=>{
    const output=join(temporary,'existing');await mkdir(output);await writeFile(join(output,'keep.txt'),'keep');
    assert.notEqual(audit('existing').status,0);assert.equal(await readFile(join(output,'keep.txt'),'utf8'),'keep');
  });
  const file=join(fixture,'tests/ui',names[0]);const original=await readFile(file,'utf8');
  for(const [label,changed] of [
    ['title mismatch',original.replace(`test('${names[0]}  title'`,`test('different title'`)],
    ['title whitespace mismatch',original.replace('  title',' title')],
    ['expectation mismatch',original.replace(".toBe('a  b')",".toBe('changed')")],
    ['expectation literal whitespace mismatch',original.replace(".toBe('a  b')",".toBe('a b')")],
    ['matcher label whitespace mismatch',original.replace('label  exact','label exact')],
    ['explicit any',original+'let prohibited:any;\n'],
    ['suppression',original+'// @ts-ignore\nconst ignored:number=1;\n'],
    ['compiler diagnostic',original+"const invalid:number='text';\n"],
    ['parser error',original+'const broken = ;\n']
  ])await t.test(`${label} fails`,async()=>{
    await writeFile(file,changed);assert.notEqual(audit(label.replaceAll(' ','-')).status,0);await writeFile(file,original);
  });
  await t.test('omitting Media specs from compiler scope fails even when helper compilation succeeds',async()=>{
    await writeFile(file,original+"const invalid:number='text';\n");
    await writeFile(join(fixture,'tsconfig.ui-media.json'),JSON.stringify({...config,include:['tests/ui/media-test-dom.ts']}));
    assert.notEqual(audit('omitted-compiler-scope').status,0);
    const report=JSON.parse(await readFile(join(temporary,'omitted-compiler-scope','media-audit.json'),'utf8'));
    assert.equal(report.compiler.actualExit,0);assert.equal(report.missingCompilerSpecs.length,3);
    await writeFile(file,original);await writeFile(join(fixture,'tsconfig.ui-media.json'),JSON.stringify(config));
  });
  await t.test('disabled strict config fails',async()=>{
    await writeFile(join(fixture,'tsconfig.ui-media.json'),JSON.stringify({...config,compilerOptions:{...config.compilerOptions,strict:false}}));
    assert.notEqual(audit('strict-disabled').status,0);
  });
});
