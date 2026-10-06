import ts from '/Users/inouehiroshi/Documents/GitHub/ui-foundation/node_modules/typescript/lib/typescript.js';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='/tmp/ui-foundation-final-foundation-20261006/baseline';
const current='/tmp/ui-foundation-final-integration-independent-review/repository/templates/angular';
const sha=s=>createHash('sha256').update(s).digest('hex');
function normalized(node,source){
 const file=ts.createSourceFile('one.ts',source,ts.ScriptTarget.Latest,true);
 const normalize=ts.transform(file,[context=>{
  const visit=n=>{
   if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)){
    const name=n.expression.name.text;
    if(/^ui(?:RuntimeText_|Diagnostic_)/.test(name)&&n.arguments.length===1)return visit(n.arguments[0]);
    if(/^uiEffective_/.test(name))return ts.factory.updateCallExpression(n,ts.factory.updatePropertyAccessExpression(n.expression,n.expression.expression,ts.factory.createIdentifier(name.slice('uiEffective_'.length))),n.typeArguments,n.arguments);
   }
   return ts.visitEachChild(n,visit,context);
  };return root=>ts.visitNode(root,visit);
 }]);
 const output=ts.createPrinter({removeComments:true}).printFile(normalize.transformed[0]);normalize.dispose();return output;
}
function members(name,source){
 const file=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true),result=new Map();
 for(const cls of file.statements){
  if(!ts.isClassDeclaration(cls)||!cls.name)continue;
  for(const node of cls.members){
   if(!ts.isMethodDeclaration(node)&&!ts.isConstructorDeclaration(node)&&!ts.isGetAccessorDeclaration(node)&&!ts.isSetAccessorDeclaration(node))continue;
   const label=cls.name.text+'.'+(ts.isConstructorDeclaration(node)?'constructor':node.name.getText(file));
   const text=node.getText(file);
   result.set(label,{line:file.getLineAndCharacterOfPosition(node.getStart(file)).line+1,text,normalized:normalized(node,'class Audit {'+text+'}')});
  }
 }
 return result;
}
const report={sourceUnfrozen:false,approval:'not-granted',purpose:'AST callable comparison after unwrapping only one-argument owned-message and effective-default accessors; residual changes require semantic review, this is not a test or UX certificate.',files:[],counts:{baselineMethods:0,exactMethods:0,messageOnlyMethods:0,residualMethods:0,removedMethods:0,newMethods:0}};
for(const name of (await readdir(base)).filter(v=>v.endsWith('.ts')).sort()){
 const before=await readFile(base+'/'+name,'utf8'),after=await readFile(current+'/'+name,'utf8');
 const left=members(name,before),right=members(name,after);const changed=[];
 for(const [key,b] of left){
  report.counts.baselineMethods++;
  const a=right.get(key);if(!a){report.counts.removedMethods++;changed.push({key,kind:'removed',beforeLine:b.line});continue;}
  if(a.text===b.text){report.counts.exactMethods++;continue;}
  if(a.normalized===b.normalized){report.counts.messageOnlyMethods++;continue;}
  report.counts.residualMethods++;changed.push({key,kind:'residual',beforeLine:b.line,afterLine:a.line,before:b.text,after:a.text});
 }
 for(const [key,a] of right)if(!left.has(key)){report.counts.newMethods++;changed.push({key,kind:'added',afterLine:a.line,after:a.text});}
 if(changed.length||sha(before)!==sha(after))report.files.push({file:name,beforeSha:sha(before),currentSha:sha(after),changed});
}
await writeFile('/tmp/ui-foundation-final-integration-independent-review/evidence/foundation-callable-candidate.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({counts:report.counts,files:report.files.map(({file,changed})=>({file,changes:changed.map(({key,kind})=>({key,kind}))}))},null,2));
