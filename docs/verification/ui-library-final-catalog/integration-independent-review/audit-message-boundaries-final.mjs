import ts from '/Users/inouehiroshi/Documents/GitHub/ui-foundation/node_modules/typescript/lib/typescript.js';
import {readFile,readdir,writeFile} from 'node:fs/promises';
const dir='/tmp/ui-foundation-final-integration-independent-review/repository/templates/angular';
const entries=[];
for(const name of (await readdir(dir)).filter(v=>v.endsWith('.ts'))){
 const text=await readFile(dir+'/'+name,'utf8'),file=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);
 const visit=n=>{
  if(ts.isCallExpression(n)&&/uiRuntimeText_/.test(n.expression.getText(file))){
   const chain=[];let p=n.parent;for(let i=0;i<4&&p;i++,p=p.parent)chain.push(ts.SyntaxKind[p.kind]+':'+p.getText(file).slice(0,150));
   let member=n;while(member.parent&&!ts.isMethodDeclaration(member)&&!ts.isPropertyDeclaration(member)&&!ts.isConstructorDeclaration(member))member=member.parent;
   let enclosing=n.parent,outputPayload=false;while(enclosing&&!ts.isStatement(enclosing)){if(ts.isCallExpression(enclosing)&&ts.isPropertyAccessExpression(enclosing.expression)&&enclosing.expression.name.text==='emit')outputPayload=true;enclosing=enclosing.parent;}
   entries.push({file:name,line:file.getLineAndCharacterOfPosition(n.getStart(file)).line+1,member:member.name?.getText(file)??'constructor',message:n.arguments[0]?.getText(file),chain,comparison:ts.isBinaryExpression(n.parent)&&[ts.SyntaxKind.EqualsEqualsToken,ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(n.parent.operatorToken.kind),switch:ts.isCaseClause(n.parent),emit:outputPayload});
  }ts.forEachChild(n,visit);
 };visit(file);
}
const report={sourceUnfrozen:false,approval:'not-granted',scope:'Only new Foundation-owned runtime-message call sites. Call-site syntax audit does not certify business behavior.',count:entries.length,comparisons:entries.filter(v=>v.comparison),switchCases:entries.filter(v=>v.switch),possibleOutputPayloads:entries.filter(v=>v.emit),entries};
await writeFile('evidence/message-boundary-candidate.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({count:report.count,comparisons:report.comparisons,switchCases:report.switchCases,possibleOutputPayloads:report.possibleOutputPayloads},null,2));
