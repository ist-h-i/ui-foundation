import ts from 'typescript';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
const stage=resolve('repository');
const configPath=resolve(stage,'tsconfig.ui-media.json');
const read=ts.readConfigFile(configPath,ts.sys.readFile);
if(read.error)throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText,'\n'));
const config=ts.parseJsonConfigFileContent(read.config,ts.sys,stage);
const names=['media.spec.ts','media-regressions.spec.ts','media-lifetime.spec.ts'];
const programs=[];
for(const [name,entries] of [
 ['combined-before',names.map(n=>resolve('before/tests/ui',n))],
 ['combined-after',config.fileNames],
 ['legacy-before',[resolve('evidence/legacy/media-regressions.original.spec.ts')]],
 ['legacy-guard',[resolve('evidence/legacy/media-regressions.guarded.spec.ts')]],
]){
 const options={...config.options,rootDir:process.cwd()};
 const program=ts.createProgram(entries,options);
 const diagnostics=ts.getPreEmitDiagnostics(program).map(d=>{const at=d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start):null;return {path:d.file?relative(process.cwd(),d.file.fileName):null,line:at?at.line+1:null,column:at?at.character+1:null,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')};});
 const projectSources=program.getSourceFiles().filter(f=>!f.fileName.includes('/node_modules/')&&!f.isDeclarationFile).map(f=>relative(process.cwd(),f.fileName));
 programs.push({name,entryFiles:entries.map(p=>relative(process.cwd(),p)),diagnostics,projectSources,projectSourceCount:projectSources.length});
}
function audit(text,path){
 const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),assertions=[],titles=[];let explicitAny=0,suppressions=0;
 const visit=node=>{
  if(node.kind===ts.SyntaxKind.AnyKeyword)explicitAny++;
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='test'&&node.arguments[0])titles.push(node.arguments[0].getText(file));
  if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&/^to[A-Z]/.test(node.expression.name.text)){
   let target=node.expression.expression,not=false;
   if(ts.isPropertyAccessExpression(target)&&target.name.text==='not'){not=true;target=target.expression;}
   if(ts.isCallExpression(target)&&((ts.isIdentifier(target.expression)&&target.expression.text==='expect')||(ts.isPropertyAccessExpression(target.expression)&&target.expression.getText(file)==='expect.poll'))){
    assertions.push({matcher:node.expression.name.text,not,args:node.arguments.map(a=>a.getText(file)),label:target.arguments.slice(1).map(a=>a.getText(file))});
   }
  }
  ts.forEachChild(node,visit);
 };visit(file);
 suppressions=(text.match(/@ts-(?:ignore|expect-error|nocheck)/g)??[]).length;
 return {parseDiagnostics:file.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),explicitAny,suppressions,assertions,titles};
}
const files=[];
for(const name of names){
 const before=await readFile(resolve('before/tests/ui',name),'utf8'),after=await readFile(resolve(stage,'tests/ui',name),'utf8'),old=audit(before,name),candidate=audit(after,name);
 files.push({name,before:old,after:candidate,assertionMatchersExpectedArgumentsAndLabelsUnchanged:JSON.stringify(old.assertions)===JSON.stringify(candidate.assertions),testTitlesUnchanged:JSON.stringify(old.titles)===JSON.stringify(candidate.titles)});
}
const helper=audit(await readFile(resolve(stage,'tests/ui/media-test-dom.ts'),'utf8'),'media-test-dom.ts');
const result={compilerVersion:ts.version,config:'repository/tsconfig.ui-media.json',strict:config.options.strict,noEmit:config.options.noEmit,skipLibCheckInherited:config.options.skipLibCheck,angularTemplateChecking:'Separate ngc build; this tsc command checks TypeScript only',scope:'Media3 spec entries, direct catalog-test and media-test-dom, plus the helper type-only fixture and generated transitive dependencies listed explicitly',allUiSpecsChecked:false,programs,files,helper,exit:programs[0].diagnostics.length===43&&programs[1].diagnostics.length===0&&programs.slice(2).every(p=>p.diagnostics.length===24)&&files.every(f=>f.assertionMatchersExpectedArgumentsAndLabelsUnchanged&&f.testTitlesUnchanged&&!f.after.explicitAny&&!f.after.suppressions&&!f.after.parseDiagnostics.length)&&!helper.explicitAny&&!helper.suppressions?0:1};
await writeFile('evidence/candidate-type-assertion-audit.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({exit:result.exit,diagnostics:programs.map(p=>({name:p.name,count:p.diagnostics.length,projectSources:p.projectSourceCount})),files:files.map(f=>({name:f.name,beforeAny:f.before.explicitAny,afterAny:f.after.explicitAny,assertions:f.after.assertions.length,unchanged:f.assertionMatchersExpectedArgumentsAndLabelsUnchanged,titlesUnchanged:f.testTitlesUnchanged})),strict:result.strict,allUiSpecsChecked:false}));process.exitCode=result.exit;
