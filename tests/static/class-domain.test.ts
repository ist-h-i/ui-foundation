import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import { proveClassDomain, type ClassDomainContext } from '../../src/check/class-domain.ts';
import { createUtilityResolver } from '../../src/check/tailwind.ts';
import { fallbackUtilityRoots } from '../../src/check/styles.ts';

const utilities = await createUtilityResolver();
function body(text: string): ts.ConciseBody {
  const source = ts.createSourceFile('domain.ts', `const example=()=>${text}`, ts.ScriptTarget.Latest, true);
  const declaration = (source.statements[0] as ts.VariableStatement).declarationList.declarations[0];
  return (declaration.initializer as ts.ArrowFunction).body;
}
const guarded = (regex = '/^[a-zA-Z0-9_+-]+$/') => `{const value=this.input();if(value==null||value==='')return '';if(typeof value!=='string'||!${regex}.test(value))throw new Error('invalid');return value;}`;
function prove(outer = "this.checked()?'language-'+this.checked():null", inner = guarded(), changes: Partial<ClassDomainContext> = {}) {
  return proveClassDomain(body(outer), { utilities, intrinsicRegExpTestIntact: true, resolveComputed: () => body(inner), isTrustedInputRead: expression => ts.isCallExpression(expression) && expression.expression.getText() === 'this.input', ...changes });
}

test('generic guarded input domain proves the current class prefix without evaluating application code', () => {
  assert.ok(prove());
  assert.ok(prove("this.renamed()?'syntaxid-'+this.renamed():null"));
  assert.ok(prove("{return this.checked()?'language-'+this.checked():null}"));
  assert.ok(prove(undefined, `{const v=this.input();if(typeof v!=='string'||!/^[a-z]+$/.test(v))throw new Error();return v;}`));
});

test('removed, bypassed, reordered or non-throwing guards stay incomplete', () => {
  for (const inner of [
    `{const value=this.input();return value;}`,
    guarded().replace("typeof value!=='string'||", ''),
    guarded().replace("throw new Error('invalid')", 'return value'),
    guarded().replace('return value;', "return value+' p-4';"),
    guarded().replace('return value;', 'return this.input();'),
    guarded().replace('const value=this.input();', "const value=this.input();if(flag)return value;"),
    guarded().replace("if(typeof value!=='string'", "if(false && typeof value!=='string'"),
  ]) assert.equal(prove(undefined, inner), false, inner);
  assert.equal(prove("this.checked()?'language-'+this.other():null"), false);
  assert.equal(prove("this.checked()?'language-'+this.checked():'p-4'"), false, 'known finite bad branch must remain on ordinary inspector path');
  assert.equal(prove("this.checked()?'language-'+this.checked():readRuntime()"), false);
});

test('symbolic regex grammar rejects unsafe alphabets, flags, escapes and unanchored constructs', () => {
  for (const regex of ['/^[a-z :]+$/', '/^[a-z\\s]+$/', '/^[a-z]+$/m', '/^[a-z]+$/i', '/^[a-z]+/','/[a-z]+$/', '/^[a-z!]+$/', '/^[a-z\\/]+$/', '/^[a-z\\[\\]]+$/', '/^[A-z]+$/', '/^(a|b)+$/', '/^[^x]+$/']) assert.equal(prove(undefined, guarded(regex)), false, regex);
});

test('actual pinned utility registries and fallback grammar must both be disjoint', () => {
  assert.equal(utilities.disjointClassPrefix?.('language-'), true);
  assert.equal(utilities.disjointClassPrefix?.('syntaxid-'), true);
  for (const prefix of ['p-', 'bg-', 'text-', 'sr-', 'backdrop-', 'border-', 'min-', 'grid-', 'font-', 'from-', 'to-', 'translate-', 'mask-', 'flex-', 'size-', 'space-']) assert.equal(utilities.disjointClassPrefix?.(prefix), false, prefix);
  for (const prefix of ['language', 'Language-', 'language--', 'x:y-', '[x]-', 'x!-', '-language-', 'x/-']) assert.equal(utilities.disjointClassPrefix?.(prefix), false, prefix);
  for (const root of fallbackUtilityRoots()) {
    const prefix = `${root.split('-')[0]}-`;
    assert.equal(utilities.disjointClassPrefix?.(prefix), false, `fallback grammar ${root}`);
  }
  assert.equal(prove("this.checked()?'bg-'+this.checked():null"), false);
  assert.equal(prove(undefined, undefined, { utilities: undefined }), false);
});

test('missing intrinsic, unsafe computed closure and untrusted input evidence never certify', () => {
  assert.equal(prove(undefined, undefined, { intrinsicRegExpTestIntact: undefined }), false);
  assert.equal(prove(undefined, undefined, { intrinsicRegExpTestIntact: false }), false, 'checked-source RegExp.prototype.test replacement');
  assert.equal(prove(undefined, undefined, { resolveComputed: () => undefined }), false, 'owner/member/helper writes and escapes');
  assert.equal(prove(undefined, undefined, { isTrustedInputRead: () => false }), false, 'unidentified input getter');
  assert.equal(prove(undefined, guarded().replace('this.input()', 'readRuntime()')), false);
});

import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { parseConfig, resolveConfig } from '../../src/config.ts';
import { createSourcePolicy } from '../../src/check/policy.ts';
import { checkSources } from '../../src/check/scanner.ts';
test('actual scanner closes computed and input identities and preserves every known bad branch', async t => {
  const root = await mkdtemp(resolve(tmpdir(), 'ui-class-domain-')); t.after(() => rm(root, {recursive:true,force:true})); await mkdir(resolve(root,'app'));
  const input = parseConfig(await readFile(new URL('../../examples/ui.config.example.yaml',import.meta.url),'utf8')); input.checks={source_roots:['app'],approved_components:[],exceptions:[]}; const config=resolveConfig(input);
  const source = `import{Component,computed,input}from'@angular/core';@Component({selector:'app-test',template:'<code [attr.class]="languageClass()"></code>'})class Example{readonly language=input<string|null>(null);readonly checked=computed(()=>{const value=this.language();if(value==null||value==='')return '';if(typeof value!=='string'||!/^[a-zA-Z0-9_+-]+$/.test(value))throw new Error();return value;});readonly languageClass=computed(()=>this.checked()?'language-'+this.checked():null);}`;
  const scan=async (text:string)=>{await writeFile(resolve(root,'app/app.ts'),text);return checkSources({root,config,policy:createSourcePolicy(config)});};
  assert.deepEqual((await scan(source)).diagnostics,[]);
  assert.ok((await scan(source+"@Component({selector:'app-parent',imports:[Example],template:'<app-test />'})class Parent{}")).diagnostics.some(d=>d.rule==='unresolved'), 'composition can enable template references and must not certify an unclosed instance lifetime');
  for(const changed of [
    source.replace("if(typeof value!=='string'||!/^[a-zA-Z0-9_+-]+$/.test(value))throw new Error();",''),
    source.replace('/^[a-zA-Z0-9_+-]+$/','/^[a-z :]+$/'),
    source.replace("'language-'","'text-'"),
    source.replace('readonly checked','checked'),
    source.replace('readonly languageClass','languageClass'),
    source.replace('readonly language=input<string|null>(null)','readonly language=opaque'),
    source.replace('readonly languageClass=', 'constructor(){opaque(this);}readonly languageClass='),
    source.replace('readonly languageClass=', "constructor(){this.checked=opaque();}readonly languageClass="),
    source.replace('readonly languageClass=', "constructor(){(this as any).checked=()=> ' p-4';}readonly languageClass="),
    source.replace('readonly languageClass=', "constructor(){(this as {checked:()=>string}).checked=()=> ' p-4';}readonly languageClass="),
    source.replace('readonly languageClass=', "constructor(){(this as any).languageClass=()=> 'p-4';}readonly languageClass="),
    source + "const instance=new Example();(instance as any).checked=()=> ' p-4';",
    source + "const Constructor=Example;opaque(new Constructor());",
    source + "function replace(instance:Example){Object.assign(instance,{languageClass:()=> 'p-4'});}",
    source + "@Component({selector:'app-parent',template:'<app-test />'})class Parent{child!:Example;ngAfterViewInit(){Object.assign(this.child,{languageClass:()=> 'p-4'});}}",
    source + "class Derived extends Example{}const instance=new Derived();(instance as any).languageClass=()=> 'p-4';",
    source + "function replace(value:{nested:{child:Example}}){opaque(value);}",
    source.replace('{Component,computed,input}', '{Component,computed,input,ViewChild}') + "@Component({selector:'app-parent',imports:[Example],template:'<app-test />'})class Parent{@ViewChild(Example) child:any;ngAfterViewInit(){Object.assign(this.child,{languageClass:()=> 'p-4'});}}",
    source.replace('{Component,computed,input}', '{Component,computed,input,ViewChildren}') + "@Component({selector:'app-parent',imports:[Example],template:'<app-test />'})class Parent{@ViewChildren(Example) children:any;ngAfterViewInit(){Object.assign(this.children.first,{languageClass:()=> 'p-4'});}}",
    source + "const registry={component:Example};opaque(registry);",
    source.replace('{Component,computed,input}', '{Component,computed,input,ViewChild}') + "@Component({selector:'app-parent',imports:[Example],template:'<app-test #child />'})class Parent{@ViewChild('child') child:any;ngAfterViewInit(){Object.assign(this.child,{languageClass:()=> 'p-4'});}}",



    source + 'RegExp.prototype.test=()=>true;',
    source + 'RegExp.prototype.exec=()=>[];',
    source + "Object.defineProperty(RegExp.prototype,'test',{value:()=>true});",
    source + 'Object.getPrototypeOf(/x/).test=()=>true;',
    source + "const regexp=/x/, proto=Object.getPrototypeOf(regexp), key=opaque();proto[key]=()=>true;",
    source + "Object['getPrototypeOf'](/x/).test=()=>true;",
    source + "Reflect.get(/x/,'constructor').prototype.test=()=>true;",
    source + "const {getPrototypeOf}=Object;getPrototypeOf(/x/).test=()=>true;",
    source + "const {__proto__:proto}=/x/;proto.test=()=>true;",
    source + "const key=opaque();Object.assign((/x/ as any)[key],{test:()=>true});",
    source + "const key=opaque();Object.assign((new RegExp('x') as any)[key],{test:()=>true});",
    source + "(/x/).constructor.prototype.test=()=>true;",
    source + "Object.assign(RegExp.prototype,{exec:()=>[]});",
  ]) assert.ok((await scan(changed)).diagnostics.some(d=>d.rule==='unresolved'),changed);
  const bad=await scan(source.replace("'language-'+this.checked():null", "'language-'+this.checked():'p-4'"));
  assert.ok(bad.diagnostics.some(d=>d.severity==='error'&&d.source.includes('p-4')));
});
