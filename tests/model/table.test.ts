import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTableState, fitTableColumns, nextTableSort, queryTable, tableConfigurationError, tableText, type TableColumn } from '../../templates/angular/table-model.ts';
type Item = { id: number; name: string; amount: number | null; date: string; approved: boolean };
const rows: Item[] = [
 { id: 1, name: '備品2', amount: 30, date: '2026-02-01', approved: false },
 { id: 2, name: '備品10', amount: null, date: '2026-01-01', approved: true },
 { id: 3, name: '旅費', amount: 10, date: '2026-01-03', approved: false },
 { id: 4, name: '備品1', amount: 30, date: '2026-01-02', approved: true },
];
const columns: TableColumn<Item>[] = [{id:'name',field:'name',header:'名称'}, {id:'amount',field:'amount',header:'金額',type:'number'}, {id:'date',field:'date',header:'日付',type:'date'}, {id:'approved',field:'approved',header:'承認',type:'boolean'}];
test('typed stable multi-sort keeps missing values last without changing input order', () => {
 const state={...createTableState(),sort:[{column:'amount',direction:'desc' as const},{column:'date',direction:'asc' as const}]};
 assert.deepEqual(queryTable(rows,columns,state).map(r=>r.id),[4,1,3,2]);
 assert.deepEqual(rows.map(r=>r.id),[1,2,3,4]);
 assert.deepEqual(queryTable(rows,columns,{...state,sort:[{column:'amount',direction:'asc'}]}).map(r=>r.id),[3,1,4,2]);
});
test('numeric text collation and asc/desc/removal work independently for multiple columns', () => {
 assert.deepEqual(queryTable(rows,columns,{...createTableState(),sort:[{column:'name',direction:'asc'}]}).map(r=>r.id),[4,1,2,3]);
 let sort=nextTableSort([], 'name', true); sort=nextTableSort(sort,'amount',true); sort=nextTableSort(sort,'name',true);
 assert.deepEqual(sort,[{column:'amount',direction:'asc'},{column:'name',direction:'desc'}]);
 assert.deepEqual(nextTableSort(sort,'name',true),[{column:'amount',direction:'asc'}]);
 assert.deepEqual(nextTableSort(sort,'date',false),[{column:'date',direction:'asc'}]);
});
test('AND/OR numeric and date filters compose with global search restricted to named columns', () => {
 const state={...createTableState(),search:'備品',filters:[{column:'amount',match:'and' as const,constraints:[{operator:'gte' as const,value:20},{operator:'lte' as const,value:40}]},{column:'date',match:'or' as const,constraints:[{operator:'before' as const,value:'2026-01-03'},{operator:'eq' as const,value:'2025-01-01'}]}]};
 assert.deepEqual(queryTable(rows,columns,state,{searchColumns:['name']}).map(r=>r.id),[4]);
 assert.deepEqual(queryTable(rows,columns,state,{searchColumns:['date']}),[]);
 assert.deepEqual(queryTable(rows,columns,{...createTableState(),filters:[{column:'amount',match:'and',constraints:[{operator:'missing'}]}]}).map(r=>r.id),[2]);
});
test('zero, false and missing are distinct; disabled operations leave rows unchanged', () => {
 const values=[{...rows[0],amount:0}];
 assert.equal(tableText(values[0],columns[1]),'0'); assert.equal(tableText(values[0],columns[3]),'いいえ'); assert.equal(tableText(rows[1],columns[1]),'未取得');
 assert.deepEqual(queryTable(rows,columns,{...createTableState(),search:'nothing',sort:[{column:'amount',direction:'asc'}],filters:[{column:'approved',match:'and',constraints:[{operator:'eq',value:true}]}]},{sort:false,filters:false,search:false}),rows);
});
test('duplicate/missing keys, invalid page sizes and invalid width ranges are refused', () => {
 assert.equal(tableConfigurationError(rows,columns,'id',createTableState()),null);
 assert.match(tableConfigurationError([...rows,rows[0]],columns,'id',createTableState())!,/行キー/);
 assert.match(tableConfigurationError(rows,columns,'id',createTableState(0))!,/ページ/);
 assert.match(tableConfigurationError(rows,[{...columns[0],minWidth:200,maxWidth:100}],'id',createTableState())!,/列幅/);
 assert.match(tableConfigurationError(rows,columns,'id',{...createTableState(),columnWidths:{name:NaN}})!,/列幅/);
});
test('a chosen empty comparison is inactive and nonfinite numbers agree with missing display/filter', () => {
 const state={...createTableState(),filters:[{column:'amount',match:'and' as const,constraints:[{operator:'gte' as const}]}]};
 assert.deepEqual(queryTable(rows,columns,state),rows);
 const values=[{...rows[0],amount:NaN},rows[1],{...rows[2],amount:0}];
 assert.equal(tableText(values[0],columns[1]),'未取得');
 assert.deepEqual(queryTable(values,columns,{...state,filters:[{column:'amount',match:'and',constraints:[{operator:'missing'}]}]}).map(r=>r.id),[1,2]);
});
test('empty comparisons are ignored in OR groups without weakening active constraints', () => {
 const state={...createTableState(),filters:[{column:'amount',match:'or' as const,constraints:[{operator:'gte' as const,value:20},{operator:'lte' as const}]}]};
 assert.deepEqual(queryTable(rows,columns,state).map(row=>row.id),[1,4]);
 assert.deepEqual(queryTable(rows,columns,{...state,filters:[{column:'amount',match:'or',constraints:[{operator:'lte'}]}]}),rows);
 const missing={...rows[0],amount:NaN};
 for (const type of [undefined,'text','number'] as const) {
  const column={...columns[1],type};
  assert.equal(tableText(missing,column),'未取得');
  assert.deepEqual(queryTable([missing], [column], {...state,filters:[{column:'amount',match:'and',constraints:[{operator:'missing'}]}]}),[missing]);
 }
});
test('width fitting honors min/max in content and available modes, including impossible fits', () => {
 const wide=columns.map(c=>({...c,minWidth:400,maxWidth:450}));
 assert.deepEqual(Object.values(fitTableColumns(wide,1280,128,{}, {},'available',true)),[400,400,400,400]);
 const narrow=[{...columns[0],minWidth:80,maxWidth:100}];
 assert.equal(fitTableColumns(narrow,1000,128,{}, {},'available',true).name,100);
 assert.equal(fitTableColumns(narrow,1000,128,{}, {name:500},'content',true).name,100);
 assert.equal(fitTableColumns(narrow,1000,128,{name:10}, {},'available',true).name,80);
});
