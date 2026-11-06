import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {test} from 'node:test';
import ts from 'typescript';
import {uiEnglishMessages} from '../../templates/angular/locale-en.ts';
import {uiJapaneseMessages} from '../../templates/angular/locale-ja.ts';
import {resolveUiLocale,uiMessage} from '../../templates/angular/locale-model.ts';
const parameters=(value:string)=>[...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
test('English and Japanese dictionaries retain all interpolation parameters and Japanese child scopes restore defaults',()=>{
 assert.ok(Object.keys(uiEnglishMessages).length>900);
 for(const [key,value] of Object.entries(uiEnglishMessages)){
  assert.ok(value.trim(),key);assert.deepEqual(parameters(value),parameters(key),key);
  assert.equal(uiJapaneseMessages[key],key);
 }
 const english=resolveUiLocale({locale:'en-US',messages:uiEnglishMessages});
 const japanese=resolveUiLocale({locale:'ja-JP',messages:uiJapaneseMessages},english);
 assert.equal(uiMessage('閉じる',english.messages),'Close');
 assert.equal(uiMessage('閉じる',japanese.messages),'閉じる');
 assert.equal(uiMessage('{count}件を追加しました。',english.messages,{count:0}),'Items added: 0.');
 assert.equal(uiMessage('{count}件を追加しました。',japanese.messages,{count:0}),'0件を追加しました。');
 assert.equal(uiMessage('App-owned content',english.messages),'App-owned content');
});
test('English covers literal library text passed to the message helper and template pipe',async()=>{
 const missing=new Set<string>();let checked=0;
 for(const name of await readdir(new URL('../../templates/angular/',import.meta.url))){
  if(!name.endsWith('.ts')||/^locale-/.test(name))continue;
  const text=await readFile(new URL('../../templates/angular/'+name,import.meta.url),'utf8');
  const source=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);
  const check=(key:string)=>{if(!/[\u3040-\u30ff\u3400-\u9fff]/.test(key))return;checked++;if(!Object.hasOwn(uiEnglishMessages,key))missing.add(name+': '+key);};
  const visit=(node:ts.Node)=>{
   if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&/^(?:text|t|uiRuntimeText_|uiDiagnosticText_)/.test(node.expression.name.text)&&node.arguments[0]&&ts.isStringLiteralLike(node.arguments[0]))check(node.arguments[0].text);
   if(name.endsWith('-model.ts')&&ts.isStringLiteral(node))check(node.text);
   if(ts.isStringLiteralLike(node)&&node.text.includes('|'))for(const match of node.text.matchAll(/'([^'\n]*)'\s*\|\s*uiMessage\b/g))check(match[1]);
   ts.forEachChild(node,visit);
  };visit(source);
 }
 assert.ok(checked>500);assert.deepEqual([...missing].sort(),[]);
});

test('parameterized numeric/selection diagnostics and retained paste feedback follow the dictionary while app errors pass through',async()=>{
 const {numericValueError,numericRangeError}=await import('../../templates/angular/choice-model.ts');
 const {listSelectionProblem}=await import('../../templates/angular/collection-model.ts');
 const {prepareTablePaste,validateTableRowDraft,groupTable}=await import('../../templates/angular/table-advanced-model.ts');
 let dictionary=uiEnglishMessages;const text=(source:string,parameters?:Readonly<Record<string,string|number>>)=>uiMessage(source,dictionary,parameters);
 const domain={min:0,max:100,step:2};
 assert.equal(numericValueError(101,domain,text),'Enter a value from 0 to 100.');
 assert.equal(numericValueError(1,domain,text),'Enter a value in increments of 2.');
 assert.equal(numericRangeError({start:50,end:10},domain,text),'The start value must be less than or equal to the end value.');
 assert.equal(listSelectionProblem([{value:'a',label:'A'},{value:'b',label:'B'}],['a','b'],true,false,1,text),'Select up to 1 items.');
 const rows=[{id:1,quantity:1,enabled:true}],columns=[{id:'quantity',field:'quantity' as const,header:'App quantity',type:'number' as const,required:true}];
 const validation=validateTableRowDraft(rows[0],columns,{quantity:''},'id',text);
 assert.equal(validation.errors.quantity,'Enter a value.');
 let calls=0;
 const customColumns=[{...columns[0],validateValue:()=>{calls++;return '入力してください。';}}];
 const custom=prepareTablePaste(rows,customColumns,'id',{row:0,column:0},[['2']],text);
 assert.equal(custom.errors[0],'Row 1, App quantity: 入力してください。');
 const invalid=prepareTablePaste(rows,columns,'id',{row:0,column:0},[['oops']],text);
 assert.equal(invalid.errorText![0](),'Row 1, App quantity: Enter a finite number.');
 dictionary=uiJapaneseMessages;
 assert.equal(invalid.errorText![0](),'1行目・App quantity: 有限の数値を入力してください。');
 assert.equal(custom.errorText![0](),'1行目・App quantity: 入力してください。');assert.equal(calls,1,'dictionary switching must not rerun app validators');
 assert.equal(numericValueError(101,domain),'0 から 100 の範囲で指定してください。');
 const grouped=groupTable(rows,[{id:'enabled',field:'enabled',header:'Enabled',type:'boolean'}],['enabled'],[],'en-US','Missing',{},uiEnglishMessages);
 assert.equal(grouped[0].label,'Yes');
});
