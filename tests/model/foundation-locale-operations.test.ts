import {test} from 'node:test';import assert from 'node:assert/strict';
import {treeFilter} from '../../.ui/generated/angular/tree-model';
import {searchCommands,commandShortcut,matchesCommandShortcut} from '../../.ui/generated/angular/navigation-model';
import {explorerRows} from '../../.ui/generated/angular/specialist-model';
import {jsonRows,visibleJsonRows} from '../../.ui/generated/angular/json-model';
import {tableText} from '../../.ui/generated/angular/table-model';
test('Turkish case folding applies to human queries while shortcut keys remain locale independent',()=>{
 const nodes=[{id:'a',label:'Isparta'},{id:'b',label:'İzmir'}];assert.deepEqual(treeFilter(nodes,'i','tr-TR').map(node=>node.id),['b']);assert.deepEqual(treeFilter(nodes,'ı','tr-TR').map(node=>node.id),['a']);assert.deepEqual(searchCommands(nodes,'i',[],'tr-TR').map(node=>node.id),['b']);assert.deepEqual(explorerRows(nodes.map(node=>({...node,kind:'file' as const})),[],'i',false,'tr-TR').map(row=>row.node.id),['b']);
 const shortcut=commandShortcut('Control+I');assert.ok(shortcut);assert.equal(matchesCommandShortcut({key:'i',ctrlKey:true,altKey:false,shiftKey:false,metaKey:false,isComposing:false,defaultPrevented:false,keyCode:73},shortcut),true);
 const json=jsonRows('{"Isparta":1,"İzmir":2}');assert.equal(visibleJsonRows(json,new Set(['0']),'i','tr-TR').filter(row=>row.label==='"Isparta"').length,0);assert.equal(visibleJsonRows(json,new Set(['0']),'i','tr-TR').filter(row=>row.label==='"İzmir"').length,1);
});
test('table numeric and boolean presentation uses common choices while explicit column format retains priority',()=>{
 const row={amount:1234.5,confirmed:true,name:'原文'};assert.equal(tableText(row,{id:'amount',field:'amount',header:'金額',type:'number'},'de-DE','未取得',{minimumFractionDigits:2}),'1.234,50');assert.equal(tableText(row,{id:'bool',field:'confirmed',header:'確認',type:'boolean'},'en-US','Missing',{}, {はい:'Yes'}),'Yes');assert.equal(tableText(row,{id:'amount',field:'amount',header:'金額',type:'number',format:()=> 'App exact'},'de-DE','未取得',{style:'currency',currency:'EUR'}),'App exact');assert.equal(row.amount,1234.5);assert.equal(row.confirmed,true);
});
