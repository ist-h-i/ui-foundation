import assert from 'node:assert/strict';
import {test} from 'node:test';
import {changeDiagram,diagramProblem,type DiagramModel} from '../../.ui/generated/angular/specialist-model.ts';

const graph=():DiagramModel=>({nodes:[{id:'a',label:'提出',x:16,y:16},{id:'b',label:'承認',x:300,y:100}],edges:[{id:'ab',from:'a',to:'b',label:'確認'}]});

test('diagram rejects blank and whitespace-only labels at both model and change boundaries without mutating the graph',()=>{
 for(const label of ['', ' ', '\t\n', '\u3000']){
  const model=graph(),before=structuredClone(model);
  assert.match(diagramProblem({...model,nodes:model.nodes.map(node=>node.id==='a'?{...node,label}:node)})??'',/label/i);
  assert.throws(()=>changeDiagram(model,{type:'label',id:'a',label}),/label/i);
  assert.throws(()=>changeDiagram(model,{type:'add',node:{id:'new',label,x:0,y:0}}),/label/i);
  assert.deepEqual(model,before);
 }
});

test('diagram accepts nonblank label text verbatim rather than trimming application data',()=>{
 const model=graph(),label='  申請 α  ';
 const changed=changeDiagram(model,{type:'label',id:'a',label});
 assert.equal(changed.nodes[0]!.label,label);assert.equal(diagramProblem(changed),null);assert.equal(model.nodes[0]!.label,'提出');
});

test('diagram rejects negative coordinates on each axis at model, move and add boundaries and preserves the complete input',()=>{
 for(const axis of ['x','y'] as const)for(const value of [-1,-.01,-1e6]){
  const model=graph(),before=structuredClone(model),node={...model.nodes[0]!,[axis]:value};
  assert.match(diagramProblem({...model,nodes:[node,model.nodes[1]!]})??'',/coordinate/i);
  assert.throws(()=>changeDiagram(model,{type:'move',id:'a',x:node.x,y:node.y}),/coordinate/i);
  assert.throws(()=>changeDiagram(model,{type:'add',node:{...node,id:'new'}}),/coordinate/i);
  assert.deepEqual(model,before);
 }
});

test('diagram accepts zero, fractional and inclusive upper-bound coordinates without normalizing the values',()=>{
 for(const [x,y] of [[0,0],[.125,3.5],[1e6,1e6]] as const){
  const model=graph(),changed=changeDiagram(model,{type:'move',id:'a',x,y});
  assert.equal(diagramProblem(changed),null);assert.equal(changed.nodes[0]!.x,x);assert.equal(changed.nodes[0]!.y,y);assert.equal(model.nodes[0]!.x,16);
 }
});

test('diagram keeps rejecting nonfinite and excessive coordinates',()=>{
 for(const value of [NaN,Infinity,-Infinity,1e6+.01]){
  const model=graph();assert.throws(()=>changeDiagram(model,{type:'move',id:'a',x:value,y:16}),/coordinate/i);
  assert.throws(()=>changeDiagram(model,{type:'move',id:'a',x:16,y:value}),/coordinate/i);
 }
});

test('diagram detects invalid existing application data before applying any edit',()=>{
 const model=graph(),bad={...model,nodes:model.nodes.map(node=>node.id==='a'?{...node,x:-1}:node)};
 assert.throws(()=>changeDiagram(bad,{type:'label',id:'a',label:'更新'}),/coordinate/i);
 assert.equal(bad.nodes[0]!.x,-1);assert.equal(bad.nodes[0]!.label,'提出');
});
