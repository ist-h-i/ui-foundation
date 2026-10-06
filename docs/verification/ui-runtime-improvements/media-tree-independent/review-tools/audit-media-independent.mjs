import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const baseline='/Users/inouehiroshi/Documents/GitHub/ui-foundation';
const base='9f5430ca87e249af204cc335a8610d0d8040621f';
function normalize(input){return input.replace(/\s+/g,' ').trim();}
function audit(text,name){
 const sf=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const results={titles:[],matchers:[],assertionTargets:[],explicitAny:0,suppressions:(text.match(/@ts-(?:ignore|expect-error|nocheck)/g)??[]).length,parseErrors:sf.parseDiagnostics.length};
 function visit(n){
  if(n.kind===ts.SyntaxKind.AnyKeyword)results.explicitAny++;
  if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test')results.titles.push(n.arguments[0]?.getText(sf));
  if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&/^to[A-Z]/.test(n.expression.name.text)){
   let receiver=n.expression.expression;
   if(ts.isPropertyAccessExpression(receiver)&&receiver.name.text==='not')receiver=receiver.expression;
   if(ts.isCallExpression(receiver)&&(/^expect(?:\.poll)?$/.test(receiver.expression.getText(sf)))){
    results.matchers.push({method:n.expression.name.text,negated:n.expression.expression.getText(sf).endsWith('.not'),expected:n.arguments.map(a=>normalize(a.getText(sf))),labels:receiver.arguments.slice(1).map(a=>normalize(a.getText(sf)))});
    results.assertionTargets.push(normalize(receiver.arguments[0]?.getText(sf)??''));
   }
  }
  ts.forEachChild(n,visit);
 }
 visit(sf);return results;
}
const files=['media.spec.ts','media-regressions.spec.ts','media-lifetime.spec.ts'].map(name=>{
 const rel='tests/ui/'+name;
 const before=audit(execFileSync('git',['show',base+':'+rel],{cwd:baseline,encoding:'utf8'}),name),after=audit(readFileSync(rel,'utf8'),name);
 return {name,before,after,titlesExact:JSON.stringify(before.titles)===JSON.stringify(after.titles),matcherArgumentsAndLabelsExact:JSON.stringify(before.matchers)===JSON.stringify(after.matchers),changedAssertionInputs:before.assertionTargets.flatMap((target,i)=>target===after.assertionTargets[i]?[]:[{index:i,before:target,after:after.assertionTargets[i]}])};
});
const helper=audit(readFileSync('tests/ui/media-test-dom.ts','utf8'),'media-test-dom.ts');
const cfg=ts.readConfigFile('tsconfig.ui-media.json',ts.sys.readFile);if(cfg.error)throw new Error(ts.flattenDiagnosticMessageText(cfg.error.messageText,'\n'));
const parsed=ts.parseJsonConfigFileContent(cfg.config,ts.sys,process.cwd());
const result={base,files,helper,compilerVersion:ts.version,options:{strict:parsed.options.strict,noEmit:parsed.options.noEmit,skipLibCheck:parsed.options.skipLibCheck,include:cfg.config.include},matcherCount:files.reduce((n,f)=>n+f.after.matchers.length,0),titleCount:files.reduce((n,f)=>n+f.after.titles.length,0),afterAny:files.reduce((n,f)=>n+f.after.explicitAny,helper.explicitAny),allUiSpecsScope:false};
result.pass=files.every(f=>f.titlesExact&&f.matcherArgumentsAndLabelsExact&&f.after.explicitAny===0&&f.after.suppressions===0&&f.after.parseErrors===0)&&helper.explicitAny===0&&helper.suppressions===0&&parsed.options.strict===true&&parsed.options.noEmit===true;
writeFileSync('../evidence/media-independent-ast.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pass:result.pass,matchers:result.matcherCount,titles:result.titleCount,afterAny:result.afterAny,changedTargetCount:files.reduce((n,f)=>n+f.changedAssertionInputs.length,0)}));
process.exitCode=result.pass?0:1;
