import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import ts from 'typescript';
import {Conditional,LiteralPrimitive,parseTemplate} from '@angular/compiler';
import {layoutSpace,type LayoutSpace} from '../../templates/angular/layout-model.ts';
const read=async(name:string)=>{const text=await readFile(new URL('../../templates/angular/'+name,import.meta.url),'utf8');return ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);};
function unionValues(type:ts.TypeNode|undefined):string[]{assert.ok(type&&ts.isUnionTypeNode(type));return type.types.map(t=>{assert.ok(ts.isLiteralTypeNode(t)&&ts.isStringLiteral(t.literal));return t.literal.text;});}
function property(object:ts.ObjectLiteralExpression,name:string):ts.Expression{const p=object.properties.find(p=>ts.isPropertyAssignment(p)&&(ts.isIdentifier(p.name)||ts.isStringLiteral(p.name))&&p.name.text===name);assert.ok(p&&ts.isPropertyAssignment(p));return p.initializer;}
function metadata(source:ts.SourceFile,name:string):ts.ObjectLiteralExpression{const c=source.statements.find(s=>ts.isClassDeclaration(s)&&s.name?.text===name);assert.ok(c&&ts.isClassDeclaration(c));const d=ts.getDecorators(c)?.find(d=>ts.isCallExpression(d.expression));assert.ok(d&&ts.isCallExpression(d.expression));const m=d.expression.arguments[0];assert.ok(m&&ts.isObjectLiteralExpression(m));return m;}
function literal(expression:ts.Expression):string{assert.ok(ts.isStringLiteral(expression)||ts.isNoSubstitutionTemplateLiteral(expression));return expression.text;}
function outputs(expression:any):string[]{if(expression?.ast)return outputs(expression.ast);if(expression instanceof Conditional)return [...outputs(expression.trueExp),...outputs(expression.falseExp)];assert.ok(expression instanceof LiteralPrimitive&&typeof expression.value==='string','every final style branch must remain a literal');return [expression.value];}
function boundOutputs(binding:string):Set<string>{const parsed=parseTemplate(`<p [style.gap]="${binding.replaceAll('"','&quot;')}"></p>`,'contract.html');assert.equal(parsed.errors,null);const node=parsed.nodes[0] as any;return new Set(outputs(node.inputs[0].value));}

test('actual FormLayout and Grid final domains stay equal to every declared LayoutSpace output',async()=>{
 const model=await read('layout-model.ts'),type=model.statements.find(s=>ts.isTypeAliasDeclaration(s)&&s.name.text==='LayoutSpace');assert.ok(type&&ts.isTypeAliasDeclaration(type));const values=unionValues(type.type),expected=new Set(values.map(v=>layoutSpace(v as LayoutSpace)));
 for(const[file,name,key]of [['form-layout.ts','FormLayout','[style.--ui-form-gap]'],['layout.ts','Grid','[style.gap]']]){const host=property(metadata(await read(file!),name!),'host');assert.ok(ts.isObjectLiteralExpression(host));assert.deepEqual(boundOutputs(literal(property(host,key!))),expected,`${name}: update renderer boundary when adding spacing variants`);}
});
test('actual Image final domain stays equal to its full public fit union',async()=>{
 const source=await read('image-media.ts'),c=source.statements.find(s=>ts.isClassDeclaration(s)&&s.name?.text==='Image');assert.ok(c&&ts.isClassDeclaration(c));const fit=c.members.find(s=>ts.isPropertyDeclaration(s)&&ts.isIdentifier(s.name)&&s.name.text==='fit');assert.ok(fit&&ts.isPropertyDeclaration(fit)&&fit.initializer&&ts.isCallExpression(fit.initializer));const values=unionValues(fit.initializer.typeArguments?.[0]),template=literal(property(metadata(source,'Image'),'template')),binding=/\[style\.object-fit\]="([^"]+)"/.exec(template)?.[1];assert.ok(binding);assert.deepEqual(boundOutputs(binding),new Set(values),'update renderer boundary when adding image fit variants');
});
