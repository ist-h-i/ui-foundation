import fs from 'node:fs/promises';
import ts from './repository-a1ed5c/node_modules/typescript/lib/typescript.js';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const own=import.meta.dirname;
const printer=ts.createPrinter({removeComments:true});
const digest=value=>createHash('sha256').update(value).digest('hex');
async function inventory(stage){
 const text=await fs.readFile(`${own}/${stage}/tests/ui/navigation-catalog.spec.ts`,'utf8');
 const root=ts.createSourceFile('navigation-catalog.spec.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(root.parseDiagnostics.length,0);
 const expectations=[],titles=[],forbidden=[];
 function visit(node){
  if(ts.isCallExpression(node)){
   const name=node.expression.getText(root);
   if(/^expect(?:\.poll)?\(/.test(name)&&/\.to\w+$/.test(name))expectations.push(printer.printNode(ts.EmitHint.Expression,node,root));
   if(name==='test'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))titles.push(node.arguments[0].text);
   if(/^(test|test\.describe)\.(only|skip|fixme|fail)$/.test(name))forbidden.push(name);
  }
  ts.forEachChild(node,visit);
 }visit(root);
 return {text,sha256:digest(text),expectations,titles,forbidden};
}
const before=await inventory('repository-37ecf'),after=await inventory('repository-a1ed5c');
assert.deepEqual(after.titles,before.titles);
assert.deepEqual(after.forbidden,before.forbidden);
let position=0;
for(const expected of before.expectations){
 const index=after.expectations.indexOf(expected,position);
 assert.ok(index>=0,'Original assertion retained in sequence: '+expected);
 position=index+1;
}
const result={scope:'Independent AST audit of existing navigation title/assertion preservation; new native operations not executed here',beforeSha256:before.sha256,afterSha256:after.sha256,parseDiagnostics:0,originalAssertions:before.expectations.length,finalAssertions:after.expectations.length,originalAssertionOrderPreserved:true,originalTitles:before.titles,skipOnlyFixmeAdded:false,ownActualExit:0,nativeClaim:false,wholePrApproval:false};
await fs.writeFile(`${own}/evidence-a1ed5c/navigation-assertion-transition.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({originalAssertions:result.originalAssertions,finalAssertions:result.finalAssertions,titles:result.originalTitles.length,originalAssertionOrderPreserved:true,ownActualExit:0,nativeClaim:false}));
