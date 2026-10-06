import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const root='/Users/inouehiroshi/Documents/GitHub/ui-foundation';
const privateRoot='/tmp/ui-foundation-final-integration/repository';
const ts=createRequire(path.join(root,'package.json'))('typescript');
const f=ts.factory,printer=ts.createPrinter(),out='/tmp/ui-foundation-final-integration/cached-message-state-delta';
fs.mkdirSync(out,{recursive:true});const records=[];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function ownedCall(n){return ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.expression.kind===ts.SyntaxKind.ThisKeyword&&/^uiRuntimeText_/.test(n.expression.name.text);}
function containsOwned(n){if(ownedCall(n))return true;let found=false;ts.forEachChild(n,c=>{if(containsOwned(c))found=true;});return found;}
function parts(n){
 if(ts.isParenthesizedExpression(n))return parts(n.expression);
 if(ownedCall(n)){if(n.arguments.length!==1||!ts.isStringLiteral(n.arguments[0]))throw Error('Non-static owned message needs manual capture: '+n.getText());return f.createArrayLiteralExpression([f.createArrowFunction(undefined,undefined,[],undefined,f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),n)]);}
 if(ts.isConditionalExpression(n))return f.createConditionalExpression(n.condition,n.questionToken,parts(n.whenTrue),n.colonToken,parts(n.whenFalse));
 if(ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.PlusToken&&containsOwned(n)){
  const left=parts(n.left),right=parts(n.right);
  return f.createArrayLiteralExpression([...(ts.isArrayLiteralExpression(left)?left.elements:[f.createSpreadElement(left)]),...(ts.isArrayLiteralExpression(right)?right.elements:[f.createSpreadElement(right)])]);
 }
 if(containsOwned(n))throw Error('Unsupported mixed message: '+n.getText());
 return f.createArrayLiteralExpression([f.createCallExpression(f.createIdentifier('String'),undefined,[n])]);
}
for(const file of fs.readdirSync(path.join(root,'templates/angular')).filter(x=>x.endsWith('.ts'))){
 const rel='templates/angular/'+file,target=path.join(root,rel),before=fs.readFileSync(target,'utf8'),sf=ts.createSourceFile(target,before,ts.ScriptTarget.Latest,true),edits=[],states=[],calls=[];
 function scan(n){
  if(ts.isClassDeclaration(n)){
   const affected=new Set();
   function writers(x){if(ts.isCallExpression(x)&&ts.isPropertyAccessExpression(x.expression)&&x.expression.name.text==='set'&&ts.isPropertyAccessExpression(x.expression.expression)&&x.expression.expression.expression.kind===ts.SyntaxKind.ThisKeyword&&x.arguments.length===1&&containsOwned(x.arguments[0])){
    const name=x.expression.expression.name.text;affected.add(name);const replacement=f.updateCallExpression(x,f.updatePropertyAccessExpression(x.expression,x.expression.expression,f.createIdentifier('setMessage')),x.typeArguments,[parts(x.arguments[0])]);edits.push({start:x.getStart(sf),end:x.end,text:printer.printNode(ts.EmitHint.Expression,replacement,sf)});calls.push(name);
   }ts.forEachChild(x,writers);}writers(n);
   for(const member of n.members){if(!ts.isPropertyDeclaration(member)||!member.initializer||!ts.isIdentifier(member.name))continue;const init=member.initializer;if(!ts.isCallExpression(init)||!ts.isIdentifier(init.expression)||init.expression.text!=='signal')continue;
    const initialOwned=init.arguments.some(containsOwned);if(!affected.has(member.name.text)&&!initialOwned)continue;
    if(init.arguments.length!==1)throw Error('Signal options need manual review: '+file+'/'+member.name.text);
    const args=initialOwned?[f.createStringLiteral(''),parts(init.arguments[0])]:[init.arguments[0]];
    const replacement=f.updateCallExpression(init,f.createIdentifier('uiMessageState'),init.typeArguments,args);edits.push({start:init.getStart(sf),end:init.end,text:printer.printNode(ts.EmitHint.Expression,replacement,sf)});states.push(member.name.text);affected.delete(member.name.text);
   }
   if(affected.size)throw Error('No matching own state declaration: '+file+'/'+[...affected]);return;
  }ts.forEachChild(n,scan);
 }scan(sf);if(!edits.length)continue;
 let after=before;for(const e of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,e.start)+e.text+after.slice(e.end);after="import {uiMessageState} from './locale';\n"+after;
 const privateTarget=path.join(privateRoot,rel);if(fs.readFileSync(privateTarget,'utf8')!==before)throw Error('Private/root source changed: '+rel);
 fs.writeFileSync(path.join(out,file+'.before'),before);fs.writeFileSync(path.join(out,file+'.after'),after);records.push({path:rel,beforeSha256:hash(before),afterSha256:hash(after),states,calls: calls.length});
}
// All conversions are prepared and guarded before any source is mutated.
for(const r of records){const after=fs.readFileSync(path.join(out,path.basename(r.path)+'.after'));for(const base of [root,privateRoot]){const t=path.join(base,r.path);if(hash(fs.readFileSync(t))!==r.beforeSha256)throw Error('Concurrent mutation: '+t);fs.writeFileSync(t,after);}}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({time:new Date().toISOString(),scope:'Only library-owned literal translations assigned to string states. Raw application set(value) and captured numeric/application strings retain their values; operations and effect dependencies are unchanged.',files:records},null,2)+'\n');console.log(JSON.stringify({files:records.length,states:records.reduce((n,r)=>n+r.states.length,0),writers:records.reduce((n,r)=>n+r.calls,0)}));
