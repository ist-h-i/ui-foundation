/// <reference path="../../.ui/generated/angular/formula-parser.d.ts" />
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chartKinds,chartProblem,chartPointRows,chartAxisProblem,sparklineSummary,mapProblem,ganttProblem,moveBoardCard,importSheetCsv,exportSheetCsv,editSheet,explorerRows,changeDiagram,chatCanSend,safeEditorUrl} from '../../.ui/generated/angular/specialist-model.ts';
import {evaluateSheet} from '../../.ui/generated/angular/sheet-formula.ts';
import {checkedRichDocument} from '../../.ui/generated/angular/editor-model.ts';
import {jsonRows,visibleJsonRows} from '../../.ui/generated/angular/json-model.ts';
import {layoutDiagram,placeDiagramLabels} from '../../.ui/generated/angular/diagram-layout.ts';
import {diagramConnection} from '../../templates/angular/diagram-layout.ts';
test('all requested chart kinds validate real values and explicit missing points',()=>{
 for(const kind of chartKinds)assert.equal(chartProblem(kind,[{id:'first',label:'系列',points:[{id:'one',label:'観測',value:12,x:0,y:0},{id:'missing',label:'未取得',value:null,x:1,y:0}]}]),null);
 assert.match(chartProblem('scatter',[{id:'a',label:'a',points:[{id:'a',label:'a',value:1}]}])! ,/Coordinates/);
 assert.deepEqual(sparklineSummary([{id:'a',label:'a',value:2},{id:'b',label:'b',value:null}]),{first:2,last:null,delta:null,missing:1});
});
test('map validates camera, markers and closed polygon regions',()=>{
 const camera={center:[139,35] as const,zoom:4};
 assert.equal(mapProblem([{id:'one',label:'東京',coordinate:[139,35]}],[{id:'polygon',label:'範囲',rings:[[[139,35],[140,35],[140,36],[139,35]]]}],camera),null);
 assert.ok(mapProblem([],[{id:'open',label:'範囲',rings:[[[0,0],[1,1],[2,2],[3,3]]]}],camera));
});
test('Gantt keeps civil dates, dependency cycles and missing progress distinct',()=>{
 const a={id:'a',label:'a',start:'2026-10-06',end:'2026-10-08',progress:null,dependencies:[]};const b={...a,id:'b',dependencies:['a']};
 assert.equal(ganttProblem([a,b]),null);assert.match(ganttProblem([{...a,start:'2026-02-30'}])!,/exist/);assert.match(ganttProblem([{...a,dependencies:['b']},b])!,/cycle/);
});
test('board move reorders within a full column, rejects ingress above its limit, and keeps input immutable',()=>{
 const columns=[{id:'todo',label:'未着手'},{id:'done',label:'完了',limit:1}],cards=[{id:'a',label:'a',columnId:'todo'},{id:'b',label:'b',columnId:'todo'},{id:'c',label:'c',columnId:'done'}];
 assert.deepEqual(moveBoardCard(columns,cards,{cardId:'b',fromColumn:'todo',toColumn:'todo',index:0}).map(c=>c.id),['b','a','c']);
 assert.throws(()=>moveBoardCard(columns,cards,{cardId:'a',fromColumn:'todo',toColumn:'done',index:1}),/limit/);assert.equal(cards[0].columnId,'todo');
});
test('CSV roundtrips formulas, leading zeroes, multiline quotations and empty cells',()=>{
 const sheet=importSheetCsv('001,"=SUM(B2:C2)","two, lines\nnext"\r\n2,3,4');assert.equal(sheet.rows[0][0],'001');assert.deepEqual(importSheetCsv(exportSheetCsv(sheet)),sheet);assert.throws(()=>importSheetCsv('"bad'),/Unclosed/);
});
test('spreadsheet evaluates references and real formulas, recalculates edited input, reports cycles and failures',()=>{
 const sheet={rows:[[2,3,'=SUM(A1:B1)'],['=C1*2','=IF(C1>4,"yes","no")','=1/0']]};
 const values=evaluateSheet(sheet);assert.equal(values[0][2].value,5);assert.equal(values[1][0].value,10);assert.equal(values[1][1].value,'yes');assert.equal(values[1][2].error,'#DIV/0!');
 const edited=editSheet(sheet,{address:{row:0,column:0},previous:2,value:4});assert.equal(evaluateSheet(edited)[0][2].value,7);assert.equal(sheet.rows[0][0],2);
 assert.equal(evaluateSheet({rows:[['=B1','=A1']]} )[0][0].error,'#CYCLE!');assert.ok(evaluateSheet({rows:[['=javascript("evil")']]} )[0][0].error);
});
test('explorer search traverses closed folders while normal expansion honors ancestry and rejects repeated IDs',()=>{
 const nodes=[{id:'root',label:'申請',kind:'folder' as const,children:[{id:'file',label:'証憑.csv',kind:'file' as const}]}];
 assert.equal(explorerRows(nodes,[]).length,1);assert.equal(explorerRows(nodes,['root']).length,2);assert.equal(explorerRows(nodes,[],'証憑')[0].node.id,'file');assert.throws(()=>explorerRows([...nodes,...nodes],[]),/IDs/);
});
test('diagram editing moves/adds/connects and removes associated edges without mutating input',()=>{
 const model={nodes:[{id:'a',label:'a',x:0,y:0},{id:'b',label:'b',x:50,y:50}],edges:[{id:'edge',from:'a',to:'b'}]};
 assert.equal(changeDiagram(model,{type:'move',id:'a',x:100,y:200}).nodes[0].x,100);assert.deepEqual(changeDiagram(model,{type:'remove-node',id:'a'}).edges,[]);assert.equal(model.nodes[0].x,0);assert.throws(()=>changeDiagram(model,{type:'connect',edge:{id:'bad',from:'a',to:'unknown'}}),/unknown/);
});
test('chat accepts attachment-only draft and URL boundary rejects executable or authenticated resource URLs',()=>{
 assert.equal(chatCanSend({text:'',attachments:[]}),false);assert.equal(chatCanSend({text:'',attachments:[{id:'one',label:'証憑',size:null}]}),true);
 assert.equal(safeEditorUrl('javascript:alert(1)'),null);assert.equal(safeEditorUrl('https://user:pass@example.test'),null);assert.equal(safeEditorUrl('data:image/svg+xml,test',true),null);assert.equal(safeEditorUrl('https://example.test/image.png',true),'https://example.test/image.png');
});
test('rich document trust boundary rejects executable image/link URLs and requires image alternatives',()=>{
 assert.throws(()=>checkedRichDocument(JSON.stringify({type:'doc',content:[{type:'image',attrs:{src:'javascript:alert(1)',alt:'危険'}}]})),/safe URL/);
 assert.throws(()=>checkedRichDocument(JSON.stringify({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'x',marks:[{type:'link',attrs:{href:'javascript:alert(1)'}}]}]}]})),/safe URL/);
 assert.equal(checkedRichDocument(JSON.stringify({type:'doc',content:[{type:'image',attrs:{src:'https://example.test/a.png',alt:'説明'}}]}))['type'],'doc');
});
test('JSON viewer preserves duplicate property rows and original large numeric tokens',()=>{
 const source='{"n":9007199254740993123,"same":1,"same":2,"nested":{"x":false}}',model=jsonRows(source);assert.equal(model.error,null);assert.equal(model.rows.filter(row=>row.label==='"same"').length,2);assert.equal(model.rows.find(row=>row.label==='"n"')?.source,'9007199254740993123');assert.equal(visibleJsonRows(model,new Set(['0']),'false').at(-1)?.source,'false');assert.ok(jsonRows('{bad}').error);
});
test('Dagre produces actual node placement for typed graph edges without mutating the controlled graph',()=>{
 const model={nodes:[{id:'a',label:'a',x:0,y:0},{id:'b',label:'b',x:0,y:0}],edges:[{id:'e',from:'a',to:'b'}]};const arranged=layoutDiagram(model,100,44,12,'LR');assert.ok(arranged.nodes[1].x>arranged.nodes[0].x);assert.equal(model.nodes[1].x,0);assert.deepEqual(arranged.edges,model.edges);
});

test('chart preserves tree descendants in the keyboard read model and rejects ambiguous IDs and axis ranges',()=>{
 const series=[{id:'tree',label:'区分',points:[{id:'parent',label:'大分類',value:10,children:[{id:'child',label:'小分類',value:4}]}]}];assert.deepEqual(chartPointRows(series).map(row=>[row.point.id,row.depth]),[['parent',0],['child',1]]);assert.equal(chartProblem('treemap',series),null);assert.match(chartProblem('treemap',[{...series[0],points:[...series[0].points,{id:'child',label:'duplicate',value:1}]}])!,/unique/);assert.ok(chartAxisProblem({label:'x',type:'value',min:5,max:4},{label:'y',type:'value'}));
});


test('Diagram auto layout reserves measured caption space along each rank direction and preserves the controlled graph',()=>{
 const model={nodes:[{id:'a',label:'提出',x:16,y:16},{id:'b',label:'承認'.repeat(100),x:300,y:100}],edges:[{id:'e',from:'a',to:'b',label:'確認'.repeat(20)}]},original=structuredClone(model);
 for(const direction of ['LR','TB'] as const){
  const width=200,height=1600,gap=12,captionSpace=direction==='LR'?640:80;
  const arranged=layoutDiagram(model,width,height,gap,direction,captionSpace+gap*2),from=arranged.nodes[0]!,to=arranged.nodes[1]!;
  assert.ok(direction==='LR'?to.x-(from.x+width)>=captionSpace+gap*2:to.y-(from.y+height)>=captionSpace+gap*2);
  assert.deepEqual(model,original);assert.deepEqual(arranged.edges,original.edges);assert.notEqual(arranged.nodes[0],model.nodes[0]);assert.notEqual(arranged.edges[0],model.edges[0]);
 }
 assert.throws(()=>layoutDiagram(model,200,44,12,'LR',0),/positive/);
});
test('Diagram captions stay clear of manual tall nodes, other captions and the canvas origin without changing node coordinates',()=>{
 const nodes=[{x:16,y:16,width:200,height:80},{x:300,y:100,width:200,height:1600}],original=structuredClone(nodes),labels=[{id:'short',x:218,y:490,width:80,height:38},{id:'long',x:-220,y:890,width:960,height:38},{id:'other',x:220,y:490,width:80,height:38}],gap=12;
 const placed=placeDiagramLabels(nodes,labels,gap),all=[...nodes];
 for(const label of labels){
  const box=placed.get(label.id)!;assert.ok(box.x>=gap&&box.y>=gap);assert.equal(box.width,label.width);assert.equal(box.height,label.height);
  for(const occupied of all)assert.ok(box.x+box.width<=occupied.x-gap||box.x>=occupied.x+occupied.width+gap||box.y+box.height<=occupied.y-gap||box.y>=occupied.y+occupied.height+gap);
  all.push(box);
 }
 assert.deepEqual(nodes,original);assert.ok(placed.get('short')!.y!==labels[0]!.y);
});

test('Diagram connection direction reaches measured boundaries for forward, reverse, vertical and self edges',()=>{
 const from={x:12,y:12,width:200,height:160},right={x:320,y:96,width:200,height:440},below={x:48,y:400,width:200,height:100},original=structuredClone({from,right,below});
 const cases=[
  {from,to:right,direction:'LR' as const,end:{x:320,y:316}},
  {from:right,to:from,direction:'LR' as const,end:{x:212,y:92}},
  {from,to:below,direction:'TB' as const,end:{x:148,y:400}},
  {from:below,to:from,direction:'TB' as const,end:{x:112,y:172}},
  {from,to:from,direction:'LR' as const,self:true,end:{x:112,y:172}},
  {from,to:from,direction:'TB' as const,self:true,end:{x:212,y:92}},
 ];
 for(const example of cases){
  const geometry=diagramConnection(example.from,example.to,12,example.direction,example.self);
  assert.deepEqual(geometry.points.at(-1),example.end);
  const triangle=geometry.arrow.split(' ').map(point=>point.split(',').map(Number)),tip=triangle[0]!,base={x:(triangle[1]![0]!+triangle[2]![0]!)/2,y:(triangle[1]![1]!+triangle[2]![1]!)/2},last=geometry.points.at(-2)!;
  assert.deepEqual(tip,[example.end.x,example.end.y]);
  const dx=tip[0]!-last.x,dy=tip[1]!-last.y,ax=tip[0]!-base.x,ay=tip[1]!-base.y;
  assert.ok(dx*ax+dy*ay>0,'arrow points toward the connection target');assert.ok(Math.abs(dx*ay-dy*ax)<.0001);
  assert.ok(geometry.path.startsWith('M'));assert.ok(Number.isFinite(geometry.middle.x)&&Number.isFinite(geometry.middle.y));
  for(const point of geometry.points){assert.ok(point.x>=geometry.bounds.x&&point.x<=geometry.bounds.x+geometry.bounds.width);assert.ok(point.y>=geometry.bounds.y&&point.y<=geometry.bounds.y+geometry.bounds.height);}
 }
 assert.deepEqual({from,right,below},original);
 const touching=diagramConnection(from,{...right,x:212,y:12,height:160},12);
 assert.ok(touching.arrow);assert.ok(touching.points.some(point=>point.y>from.y+from.height),'touching nodes retain a visible route outside their surfaces');assert.deepEqual(touching.points.at(-1),{x:312,y:172});
});
