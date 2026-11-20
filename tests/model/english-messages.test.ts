import assert from 'node:assert/strict';
import {test} from 'node:test';
import {resolveUiMessage,uiMessageText} from '../../templates/angular/stable-messages.ts';
test('parameterized numeric/selection diagnostics and retained paste feedback follow the dictionary while app errors pass through',async()=>{
 const {numericValueError,numericRangeError}=await import('../../templates/angular/choice-model.ts');
 const {listSelectionProblem}=await import('../../templates/angular/collection-model.ts');
 const {prepareTablePaste,validateTableRowDraft,groupTable}=await import('../../templates/angular/table-advanced-model.ts');
 let locale='en-US';const text=uiMessageText(()=>locale);
 const domain={min:0,max:100,step:2};
 assert.equal(numericValueError(101,domain,text),'Enter a value from 0 to 100.');
 assert.equal(numericValueError(1,domain,text),'Enter a value in increments of 2.');
 assert.equal(numericRangeError({start:50,end:10},domain,text),'The start value must be less than or equal to the end value.');
 assert.equal(listSelectionProblem([{value:'a',label:'A'},{value:'b',label:'B'}],['a','b'],true,false,1,message=>resolveUiMessage(message,'en-US')),'Select up to 1 item.');
 const rows=[{id:1,quantity:1,enabled:true}],columns=[{id:'quantity',field:'quantity' as const,header:'App quantity',type:'number' as const,required:true}];
 const validation=validateTableRowDraft(rows[0],columns,{quantity:''},'id',text);
 assert.equal(validation.errors.quantity,'Enter a value.');
 let calls=0;
 const customColumns=[{...columns[0],validateValue:()=>{calls++;return '入力してください。';}}];
 const custom=prepareTablePaste(rows,customColumns,'id',{row:0,column:0},[['2']],text);
 assert.equal(custom.errors[0],'Row 1, App quantity: 入力してください。');
 const invalid=prepareTablePaste(rows,columns,'id',{row:0,column:0},[['oops']],text);
 assert.equal(invalid.errorText![0](),'Row 1, App quantity: Enter a finite number.');
 locale='ja-JP';
 assert.equal(invalid.errorText![0](),'1行目・App quantity: 有限の数値を入力してください。');
 assert.equal(custom.errorText![0](),'1行目・App quantity: 入力してください。');assert.equal(calls,1,'dictionary switching must not rerun app validators');
 assert.equal(numericValueError(101,domain),'0 から 100 の範囲で指定してください。');
 const grouped=groupTable(rows,[{id:'enabled',field:'enabled',header:'Enabled',type:'boolean'}],['enabled'],[],'en-US','Missing');
 assert.equal(grouped[0].label,'Yes');
});

test('whole message requests and specialist diagnostics retain typed, reorderable parameters', async () => {
 const {diagramProblem,importSheetCsv}=await import('../../templates/angular/specialist-model.ts');
 const {captureUiMessage}=await import('../../templates/angular/stable-messages.ts');
 const keys: string[] = [];
 let locale = 'ja-JP';
 const text = uiMessageText(() => locale, () => (request) => {
  keys.push(request.id);
  if (request.id === 'uiFoundation.tree.expandLabel') return `Expand now: ${request.parameters.label}`;
 });
 assert.equal(text('uiFoundation.tree.expandLabel', {label: 'App label'}), 'Expand now: App label');
 assert.equal(diagramProblem({nodes:[{id:'a',label:' ',x:0,y:0}],edges:[]},text),'ノードのラベルを指定してください。');
 assert.ok(keys.includes('uiFoundation.flowEditor.emptyNodeLabel'));
 const diagnostic = captureUiMessage(text);
 assert.throws(() => importSheetCsv('"abc', diagnostic.capture), /引用符/);
 assert.equal(diagnostic.render()!(), 'CSVの引用符が閉じていません。');
 locale = 'en-US';
 assert.equal(diagnostic.render()!(), 'Unclosed CSV quote');
 assert.equal(text('uiFoundation.avatarGroup.showMoreCount', {count:1}),'Show 1 more person');
 assert.equal(text('uiFoundation.avatarGroup.showMoreCount', {count:2}),'Show 2 more people');
});

function messageTypeChecks(
  text: ReturnType<typeof uiMessageText>,
  id: 'uiFoundation.collection.selectionLimit' | 'uiFoundation.card.expand',
): void {
  // @ts-expect-error A limit alone cannot satisfy the possible card request.
  text(id, {limit: 2});
  if (id === 'uiFoundation.collection.selectionLimit') text(id, {limit: 2});
}
void messageTypeChecks;
