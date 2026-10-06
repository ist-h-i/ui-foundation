import {tableConfigurationError,fitTableColumns} from '../../templates/angular/table-model.ts';
import {tableDomIdPair,tableDomIdToken} from '../../templates/angular/table-advanced-model.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createTableState,queryTable,type TableColumn} from '../../templates/angular/table-model.ts';
import {aggregateTable,cloneTableState,flattenTableGroups,gridCellMove,gridRangeCells,gridRangeContains,groupTable,parseTableDraft,parseTableMatrix,prepareTablePaste,serializeTableMatrix,tableCellHeaders,tableDraft,tableEditStillCurrent,tableHeaderProblem,tableHeaderRows,tableOutputMatrix,tableOutputRows,validateTableRowDraft,type TableEditableColumn,type TableHeaderGroup} from '../../templates/angular/table-advanced-model.ts';

interface Row{id:number;name:string;amount:number|null;date:string|null;active:boolean|null;department:string}
const rows:readonly Row[]=[{id:1,name:'備品, "A"',amount:0,date:'2026-10-01',active:false,department:'総務'},{id:2,name:'交通費\n二行目',amount:2000,date:'2026-10-02',active:true,department:'総務'},{id:3,name:'未取得',amount:null,date:null,active:null,department:'経理'}];
const columns:readonly TableEditableColumn<Row>[]=[{id:'name',field:'name',header:'申請名',type:'text',required:true},{id:'amount',field:'amount',header:'金額',type:'number',minimum:0},{id:'date',field:'date',header:'申請日',type:'date'},{id:'active',field:'active',header:'承認',type:'boolean'},{id:'department',field:'department',header:'部署',options:[{value:'総務',label:'総務'},{value:'経理',label:'経理'}]}];
const groups:readonly TableHeaderGroup[]=[{id:'request',label:'申請',children:['name',{id:'detail',label:'詳細',children:['amount','date']}]},{id:'owner',label:'所属',children:['department']}];

test('drafts preserve zero/false/nullable and reject incomplete numeric and impossible civil dates',()=>{
 assert.equal(tableDraft(0),'0');assert.equal(tableDraft(false),'false');assert.equal(tableDraft(null),'');
 assert.deepEqual(parseTableDraft('0',columns[1],rows[0]),{valid:true,value:0});assert.deepEqual(parseTableDraft('false',columns[3],rows[0]),{valid:true,value:false});
 assert.deepEqual(parseTableDraft('',columns[1],rows[0]),{valid:true,value:null});
 for(const raw of ['1x','Infinity','-',' 2','1e999'])assert.equal(parseTableDraft(raw,columns[1],rows[0]).valid,false);
 for(const raw of ['2026-02-29','2026-13-01','2026-10-32'])assert.equal(parseTableDraft(raw,columns[2],rows[0]).valid,false);
 assert.equal(parseTableDraft('2024-02-29',columns[2],rows[0]).valid,true);assert.equal(parseTableDraft('0000-02-29',columns[2],rows[0]).valid,true);
});
test('required/options/ranges/parser failures never coerce an invalid draft into a value',()=>{
 assert.equal(parseTableDraft(' ',columns[0],rows[0]).valid,false);assert.equal(parseTableDraft('-1',columns[1],rows[0]).valid,false);assert.equal(parseTableDraft('未知',columns[4],rows[0]).valid,false);
 assert.equal(parseTableDraft('yes',columns[3],rows[0]).valid,false);assert.equal(parseTableDraft('x',{...columns[1],parseDraft:()=>{throw Error('parser');}},rows[0]).valid,false);
});
test('row validation sees the complete draft and immutable edits never change keys or source objects',()=>{
 const original={...rows[0]};const validators:readonly TableEditableColumn<Row>[]=[...columns.map(column=>column.id==='amount'?{...column,validateValue:(_value:unknown,draft:Row)=>draft.name==='不可'?'組合せを変更してください。':null}:column),{id:'id',field:'id',header:'ID',type:'number'}];
 const result=validateTableRowDraft(original,validators,{name:'不可',amount:'3',id:'999'},'id');assert.equal(result.value.id,1);assert.equal(result.value.amount,3);assert.equal(result.errors['amount'],'組合せを変更してください。');assert.deepEqual(original,rows[0]);assert.notEqual(result.value,original);
 assert.equal(validateTableRowDraft(original,[{...columns[0],validateValue:()=>{throw Error('check');}}],{name:'新規'},'id').errors['name'],'入力内容の検証を完了できませんでした。');
});
test('edit acknowledgements require current key and all previous edited values',()=>{
 const result=validateTableRowDraft(rows[0],columns,{name:'新規',amount:'3'},'id');const request={requestId:1,key:1,row:rows[0],...result};assert.equal(tableEditStillCurrent(request,rows[0],'id'),true);assert.equal(tableEditStillCurrent(request,{...rows[0],name:'外部変更'},'id'),false);assert.equal(tableEditStillCurrent(request,{...rows[0],id:2},'id'),false);
});
test('multi-level grouped headers correctly associate leaves, row spans and contiguous splits after reorder/hide',()=>{
 const headers=tableHeaderRows(columns,groups,columns,'requests');assert.equal(headers.length,3);assert.equal(headers[0].find(cell=>cell.columnId==='active')?.rowSpan,3);assert.equal(headers[0].find(cell=>cell.label==='申請')?.colSpan,3);assert.equal(headers[1].find(cell=>cell.columnId==='name')?.rowSpan,2);assert.equal(tableCellHeaders(headers,'amount').split(' ').length,3);
 const reordered=[columns[1],columns[4],columns[2]];const split=tableHeaderRows(reordered,groups,columns);assert.equal(split[0].filter(cell=>cell.label==='申請').length,2);assert.ok(split.flat().every(cell=>cell.columns.every(id=>reordered.some(column=>column.id===id))));assert.equal(new Set(split.flat().map(cell=>cell.id)).size,split.flat().length);
});
test('header graph rejects duplicate/unknown leaves and cycles instead of returning an empty successful header',()=>{
 assert.match(tableHeaderProblem(columns,[{id:'a',label:'A',children:['name','name']}])!,/重複/);assert.match(tableHeaderProblem(columns,[{id:'a',label:'A',children:['unknown']}])!,/不明/);
 const cycle={id:'a',label:'A',children:[] as (string|TableHeaderGroup)[]};cycle.children.push(cycle);assert.match(tableHeaderProblem(columns,[cycle])!,/階層/);
});
test('aggregate exposes known/missing counts and keeps all-missing sums unknown and zero sums known',()=>{
 const definitions=[{column:'amount',kind:'sum' as const},{column:'amount',kind:'average' as const},{column:'active',kind:'count' as const}];const result=aggregateTable(rows,columns,definitions);assert.deepEqual(result.map(value=>[value.value,value.known,value.missing]),[[2000,2,1],[1000,2,1],[2,2,1]]);
 assert.equal(aggregateTable([rows[0]],columns,[definitions[0]])[0].value,0);assert.equal(aggregateTable([rows[2]],columns,[definitions[0]])[0].value,null);assert.throws(()=>aggregateTable(rows,columns,[{column:'gone',kind:'sum'}]),/集計列/);
});
test('recursive row groups preserve source order and hidden rows remain available for draft retention',()=>{
 const grouped=groupTable(rows,columns,['department','active'],[{column:'amount',kind:'sum'}]);assert.equal(grouped.length,2);assert.deepEqual(grouped[0].rows,rows.slice(0,2));assert.equal(grouped[0].aggregates[0].value,2000);
 const flat=flattenTableGroups(grouped,[grouped[0].id]);assert.equal(flat.filter(item=>item.kind==='row').length,3);assert.equal(flat.filter(item=>item.kind==='row'&&item.hidden).length,2);assert.throws(()=>groupTable(rows,columns,['name','name']),/一意/);
});
test('client multi-filter AND/OR includes numeric zero and boolean false; filter OFF retains saved state',()=>{
 const state={...createTableState(),filters:[{column:'amount',match:'or' as const,constraints:[{operator:'eq' as const,value:0},{operator:'gte' as const,value:3000}]},{column:'active',match:'and' as const,constraints:[{operator:'eq' as const,value:false}]}]};
 assert.deepEqual(queryTable(rows,columns,state).map(row=>row.id),[1]);assert.deepEqual(queryTable(rows,columns,state,{filters:false}).map(row=>row.id),[1,2,3]);assert.equal(state.filters.length,2);
});
test('grid movement clamps boundaries, supports physical RTL arrows and Home/End/Page keys',()=>{
 assert.deepEqual(gridCellMove({row:0,column:0},'ArrowLeft',3,5),{row:0,column:0});assert.deepEqual(gridCellMove({row:0,column:0},'ArrowLeft',3,5,false,10,true),{row:0,column:1});assert.deepEqual(gridCellMove({row:1,column:1},'End',3,5,true),{row:2,column:4});assert.deepEqual(gridCellMove({row:0,column:2},'PageDown',30,5,false,8),{row:8,column:2});
});
test('range selection is a stable rectangle in every movement direction',()=>{
 const range={anchor:{row:2,column:3},focus:{row:1,column:1}};assert.equal(gridRangeCells(range).length,6);assert.equal(gridRangeContains(range,{row:2,column:2}),true);assert.equal(gridRangeContains(range,{row:0,column:1}),false);
});
test('quoted TSV and CSV retain tabs/newlines/quotes and reject ragged or malformed paste',()=>{
 const matrix=[['見出し','引用"'],['a\tb','改行\n次行']];for(const delimiter of ['\t',','] as const)assert.deepEqual(parseTableMatrix(serializeTableMatrix(matrix,delimiter,false),delimiter),matrix);
 for(const text of ['"unclosed','a\tb\nc','"a"tail\tb'])assert.throws(()=>parseTableMatrix(text));assert.deepEqual(parseTableMatrix('0\tfalse\r\n'),[['0','false']]);assert.match(serializeTableMatrix([['=HYPERLINK("x")','-2','+formula']],','),/"'=HYPERLINK/);
});
test('paste validates the complete rectangle atomically, forbids readonly/key cells and retains source rows',()=>{
 const result=prepareTablePaste(rows,columns,'id',{row:0,column:1},[['10','2026-10-03','false'],['20','2026-10-04','true']]);assert.equal(result.errors.length,0);assert.equal(result.requests.length,2);assert.equal(result.requests[0].value.amount,10);assert.equal(result.requests[0].value.active,false);assert.equal(rows[0].amount,0);
 assert.equal(prepareTablePaste(rows,columns,'id',{row:0,column:1},[['10','2026-10-03'],['bad','2026-10-04']]).requests.length,0);assert.equal(prepareTablePaste(rows,[{id:'id',field:'id',header:'ID',type:'number'}],'id',{row:0,column:0},[['99']]).requests.length,0);assert.match(prepareTablePaste(rows,columns,'id',{row:2,column:4},[['総務','extra']]).errors[0],/範囲外/);
});
test('output scope and visible columns preserve query order and do not fabricate unloaded server rows',()=>{
 const filtered=[rows[1],rows[0]],page=[rows[1]];assert.deepEqual(tableOutputRows('selected',rows,filtered,page,[1],row=>row.id),[rows[0]]);assert.deepEqual(tableOutputRows('page',rows,filtered,page,[],row=>row.id),page);assert.deepEqual(tableOutputRows('supplied',rows,filtered,page,[],row=>row.id),rows);
 assert.deepEqual(tableOutputMatrix([rows[0]],columns.slice(1,4),'ja-JP','未取得',false),[['0','2026-10-01','いいえ']]);assert.equal(tableOutputRows('filtered',[rows[0]],[rows[0]],[rows[0]],[2],row=>row.id).length,1);
});
test('saved TableState snapshots do not share mutable nested arrays or records',()=>{
 const source={...createTableState(),filters:[{column:'amount',match:'and' as const,constraints:[{operator:'eq' as const,value:0}]}],columnWidths:{amount:220}};const clone=cloneTableState(source);assert.deepEqual(clone,source);assert.notEqual(clone.filters,source.filters);assert.notEqual(clone.filters[0].constraints,source.filters[0].constraints);assert.notEqual(clone.columnWidths,source.columnWidths);
});

test('typed aggregate counts exclude invalid supplied types, and min/max handle large acquired sets',()=>{
 const supplied=[...rows,{...rows[0],id:4,amount:'3',active:'false',date:'not-date'}] as unknown as readonly Row[];
 const count=aggregateTable(supplied,columns,[{column:'amount',kind:'count'},{column:'active',kind:'count'},{column:'date',kind:'count'}]);assert.deepEqual(count.map(value=>[value.value,value.missing]),[[2,2],[2,2],[2,2]]);
 const many=Array.from({length:150000},(_,i)=>({...rows[0],id:i,amount:i}));assert.deepEqual(aggregateTable(many,columns,[{column:'amount',kind:'min'},{column:'amount',kind:'max'}]).map(value=>value.value),[0,149999]);
});

test('grouping invalid date values keeps them in the missing bucket and does not call invalid Date.toISOString',()=>{
 const invalid=[{...rows[0],id:4,date:new Date(NaN)},{...rows[0],id:5,date:'not-date'},rows[2]] as unknown as readonly Row[];const grouped=groupTable(invalid,columns,['date']);assert.equal(grouped.length,1);assert.equal(grouped[0].label,'未取得');assert.deepEqual(grouped[0].rows.map(row=>row.id),[4,5,3]);
});

test('selected output preserves acquired selections hidden by a current filter and never invents unknown selected keys',()=>{
 assert.deepEqual(tableOutputRows('selected',rows,[rows[0]],[rows[0]],[3,1,999],row=>row.id),[rows[0],rows[2]]);
});

test('an invalid Date is kept as an unknown draft instead of throwing during editing or raw clipboard extraction',()=>{
 assert.equal(tableDraft(new Date(NaN)),'');assert.equal(tableDraft(new Date('2026-10-01T00:00:00Z')),'2026-10-01');
});

test('DOM identities preserve existing URI tokens and distinguish accepted malformed UTF16 from literal percent namespaces',()=>{
 const valid=['name','日本語','😀','a b','quote\"','%ud800','literal-%u0061d800'];
 for(const id of valid)assert.equal(tableDomIdToken(id),encodeURIComponent(id));
 const ids=[...valid,'key-\ud800','key-\udc00','key-\ud800x','key-\ud800y','key-\ud800\ud800'];
 const tokens=ids.map(tableDomIdToken);assert.equal(new Set(tokens).size,ids.length);
 for(const token of tokens)assert.doesNotMatch(token,/[\s"'\ud800-\udfff]/u);
});

test('accepted string business keys and column/group identities keep raw selection/paste/state values while generating safe header associations',()=>{
 interface StringRow{id:string|number;name:string}
 const key='business-\ud800',id='column-\udc00',supplied:readonly StringRow[]=[{id:key,name:'受理済み行'},{id:1,name:'数値キー'}];
 const cols:readonly TableEditableColumn<StringRow>[]=[{id,field:'name',header:'申請名'}],groups:readonly TableHeaderGroup[]=[{id:'group-\ud800',label:'申請',children:[id]}];
 const state={...createTableState(),filters:[{column:id,match:'and' as const,constraints:[{operator:'eq' as const,value:'受理済み行'}]}]};
 assert.equal(tableConfigurationError(supplied,cols,'id',state),null);assert.equal(tableHeaderProblem(cols,groups),null);
 const headers=tableHeaderRows(cols,groups,cols,'string-test'),allIds=headers.flat().map(cell=>cell.id);
 assert.equal(new Set(allIds).size,allIds.length);assert.doesNotThrow(()=>tableCellHeaders(headers,id));
 for(const token of tableCellHeaders(headers,id).split(' '))assert.ok(allIds.includes(token));
 assert.equal(cloneTableState(state).filters[0].column,id);assert.deepEqual(tableOutputRows('selected',supplied,[],[],[key],row=>row.id),[supplied[0]]);
 const pasted=prepareTablePaste(supplied,cols,'id',{row:0,column:0},[['貼付け後']]);assert.deepEqual(pasted.errors,[]);assert.equal(pasted.requests[0].key,key);assert.equal(pasted.requests[0].value.id,key);assert.equal(supplied[0].name,'受理済み行');
 for(const columnId of ['constructor','__proto__']){
  const editing:readonly TableEditableColumn<StringRow>[]=[{id:columnId,field:'name',header:'予約列',required:true,type:'text'}];assert.equal(tableConfigurationError(supplied,editing,'id',createTableState()),null);
  const invalid=validateTableRowDraft(supplied[0],editing,Object.fromEntries([[columnId,'']]),'id');assert.equal(Object.getPrototypeOf(invalid.errors),null);assert.equal(Object.hasOwn(invalid.errors,columnId),true);assert.equal(typeof invalid.errors[columnId],'string');assert.equal(Object.keys(invalid.errors).length,1);assert.equal(invalid.changes.length,0);
  const valid=validateTableRowDraft(supplied[0],editing,Object.fromEntries([[columnId,'有効な予約列']]),'id');assert.deepEqual(Object.keys(valid.errors),[]);assert.equal(valid.errors[columnId],undefined);assert.equal(valid.value.id,key);assert.equal(valid.value.name,'有効な予約列');assert.equal(valid.changes[0].column,columnId);assert.equal(valid.changes[0].raw,'有効な予約列');assert.equal(supplied[0].name,'受理済み行');
  const natural=fitTableColumns(editing,600,128,{},Object.fromEntries([[columnId,240]]),'content',true);assert.equal(Object.hasOwn(natural,columnId),true);assert.equal(natural[columnId],240);
  const available=fitTableColumns(editing,600,128,{},{} ,'available',true);assert.equal(Object.hasOwn(available,columnId),true);assert.equal(available[columnId],600);
  const explicit=fitTableColumns(editing,600,128,Object.fromEntries([[columnId,320]]),{},'content',true);assert.equal(explicit[columnId],320);
  const pasted=prepareTablePaste(supplied,editing,'id',{row:0,column:0},[['予約列の貼付け']]);assert.deepEqual(pasted.errors,[]);assert.equal(pasted.requests.length,1);assert.equal(pasted.requests[0].value.name,'予約列の貼付け');assert.equal(pasted.requests[0].key,key);assert.equal(pasted.requests[0].changes[0].column,columnId);assert.equal(pasted.requests[0].changes[0].raw,'予約列の貼付け');
  const invalidPaste=prepareTablePaste(supplied,editing,'id',{row:0,column:0},[['']]);assert.equal(invalidPaste.requests.length,0);assert.equal(invalidPaste.errors.length,1);
 }
 interface OwnFieldRow{id:string;__proto__:string;constructor:string}
 const own:OwnFieldRow={id:'own-fields',['__proto__']:'元proto',['constructor']:'元constructor'};
 const ownColumns:readonly TableEditableColumn<OwnFieldRow>[]=[{id:'__proto__',field:'__proto__',header:'own proto',required:true},{id:'constructor',field:'constructor',header:'own constructor',required:true}];
 const ownResult=validateTableRowDraft(own,ownColumns,Object.fromEntries([['__proto__','編集proto'],['constructor','編集constructor']]),'id');assert.deepEqual(Object.keys(ownResult.errors),[]);assert.equal(Object.hasOwn(ownResult.value,'__proto__'),true);assert.equal(ownResult.value.__proto__,'編集proto');assert.equal(ownResult.value.constructor,'編集constructor');assert.equal(Object.getPrototypeOf(ownResult.value),Object.prototype);assert.equal(own.__proto__,'元proto');assert.equal(own.constructor,'元constructor');assert.equal(ownResult.value.id,'own-fields');
});

test('compound header and editor identities keep tuple boundaries for accepted hyphens and percent values',()=>{
 for(const pair of [['request','name'],['detail','amount']])assert.equal(tableDomIdPair(pair[0],pair[1]),encodeURIComponent(pair[0])+'-'+encodeURIComponent(pair[1]));
 assert.equal(tableDomIdPair('field','name'),'field-name');assert.notEqual(tableDomIdPair('field','c')+'-error',tableDomIdPair('field','c-error'));
 const pairs=[['a-b','c'],['a','b-c'],['a%2Db','c'],['a','b%2Dc'],['a-\ud800','c'],['a','\ud800-c']];assert.equal(new Set(pairs.map(([a,b])=>tableDomIdPair(a,b))).size,pairs.length);
 const cols:readonly TableColumn<Row>[]=[{id:'c',field:'name',header:'左'},{id:'b-c',field:'department',header:'右'}],groups:readonly TableHeaderGroup[]=[{id:'a-b',label:'第一',children:['c']},{id:'a',label:'第二',children:['b-c']}];
 assert.equal(tableHeaderProblem(cols,groups),null);const headers=tableHeaderRows(cols,groups,cols,'proof'),all=headers.flat();assert.equal(all.length,4);assert.equal(new Set(all.map(cell=>cell.id)).size,4);
 const labels=(column:string)=>tableCellHeaders(headers,column).split(' ').map(id=>all.find(cell=>cell.id===id)?.label);assert.deepEqual(labels('c'),['第一','左']);assert.deepEqual(labels('b-c'),['第二','右']);
 assert.deepEqual(groups.map(group=>group.id),['a-b','a']);assert.deepEqual(cols.map(column=>column.id),['c','b-c']);
});
