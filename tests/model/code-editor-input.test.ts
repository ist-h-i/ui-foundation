import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as cm from '@codemirror/state';
import {history,undo,redo} from '@codemirror/commands';
import {EditorView} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {codeInputSelectionGuard} from '../../templates/angular/code-editor-input';

const tag=cm.Annotation.define<string>(),effect=cm.StateEffect.define<string>();
function fixture(selection=cm.EditorSelection.cursor(3)){
 const guard=codeInputSelectionGuard(cm),node={} as Node;
 let state=cm.EditorState.create({doc:'abc',selection:cm.EditorSelection.create([selection]),extensions:[cm.EditorState.allowMultipleSelections.of(true),cm.EditorState.transactionFilter.of(guard.filter),history()]}),last:cm.Transaction|undefined;
 const document={getSelection:():Selection|null=>null};
 const model={compositionStarted:false,contentDOM:{contains:(target:Node)=>target===node,ownerDocument:document},get state(){return state;},posAtDOM:(_node:Node,offset:number)=>offset,dispatch(transaction:cm.Transaction){last=transaction;state=transaction.state;}};
 const view=model as unknown as EditorView;
 const event=(changes:Record<string,unknown>={})=>({isTrusted:true,cancelable:true,inputType:'insertText',data:'X',isComposing:false,getTargetRanges:()=>[{startContainer:node,startOffset:state.selection.main.from,endContainer:node,endOffset:state.selection.main.to}],...changes} as unknown as InputEvent);
 const record=(changes:Record<string,unknown>={})=>guard.beforeinput(event(changes),view);
 const insert=(selection?:cm.EditorSelection)=>{
  const range=state.selection.main,changes=state.changes({from:range.from,to:range.to,insert:'X'});
  return state.update({changes,selection:selection??state.selection.map(changes),userEvent:'input.type',annotations:tag.of('keep'),effects:effect.of('keep'),scrollIntoView:true});
 };
 const observe=(build=()=>insert())=>guard.input(view,state.selection.main.from,state.selection.main.to,'X',build);
 const apply=(build=()=>insert())=>{let transaction:cm.Transaction|undefined;const defaultInsert=()=>transaction??=(build());const handled=observe(defaultInsert);if(!handled)model.dispatch(defaultInsert());return handled;};
 return {guard,node,view,model,document,event,record,insert,apply,observe,get state(){return state;},get last(){return last;},setState(next:cm.EditorState){state=next;}};
}
for(const [name,selection] of [['caret',cm.EditorSelection.cursor(3)],['selection',cm.EditorSelection.range(0,3)],['reverse selection',cm.EditorSelection.range(3,0)]] as const){
 test(`native input repairs mapped stale ${name} and preserves transaction metadata`,()=>{
  const f=fixture(selection);f.record();assert.equal(f.apply(),false);
  assert.equal(f.state.doc.toString(),selection.empty?'abcX':'X');
  assert.equal(f.state.selection.main.head,selection.from+1);assert.equal(f.state.selection.main.empty,true);
  assert.equal(f.last?.annotation(tag),'keep');assert.equal(f.last?.annotation(cm.Transaction.userEvent),'input.type');assert.equal(f.last?.effects[0]?.value,'keep');assert.equal(f.last?.scrollIntoView,true);
  assert.equal(undo({get state(){return f.state;},dispatch:tr=>f.model.dispatch(tr)}),true);
  assert.equal(f.state.doc.toString(),'abc');assert.deepEqual(f.state.selection.main.toJSON(),selection.toJSON());
  assert.equal(redo({get state(){return f.state;},dispatch:tr=>f.model.dispatch(tr)}),true);
  assert.equal(f.state.doc.toString(),selection.empty?'abcX':'X');
  // CM history maps a reversed replacement selection on redo even without a guard.
  // Preserve its history contract while repairing the original input transaction.
  let baseline=cm.EditorState.create({doc:'abc',selection:cm.EditorSelection.create([selection]),extensions:[history()]});
  baseline=baseline.update({...baseline.replaceSelection('X'),userEvent:'input.type'}).state;
  const target={get state(){return baseline;},dispatch:(tr:cm.Transaction)=>{baseline=tr.state;}};
  assert.equal(undo(target),true);assert.equal(redo(target),true);
  assert.deepEqual(f.state.selection.toJSON(),baseline.selection.toJSON());
 });
}
test('a correct native transaction is passed through as the same transaction',()=>{
 const f=fixture();f.record();let original:cm.Transaction|undefined;
 assert.equal(f.apply(()=>original=f.insert(cm.EditorSelection.single(4))),false);assert.equal(f.last,original);
});
test('application transactions cannot consume a captured native intent',()=>{
 const f=fixture();f.record();const transaction=f.insert();assert.equal(transaction.newSelection.main.head,3);
 f.model.dispatch(transaction);assert.equal(f.state.selection.main.head,3);
});
for(const [name,changes] of [
 ['untrusted',{isTrusted:false}],['not cancelable',{cancelable:false}],['composition',{isComposing:true}],['paste',{inputType:'insertFromPaste'}],['replacement',{inputType:'insertReplacementText'}],['deletion',{inputType:'deleteContentBackward'}],['empty text',{data:''}],['unknown ranges',{getTargetRanges:undefined}],['missing range',{getTargetRanges:()=>[]}],['several ranges',{getTargetRanges:()=>[{},{}]}],
] as const)test(`${name} stays with the engine`,()=>{
 const f=fixture();f.record({...changes});let called=false;assert.equal(f.observe(()=>{called=true;return f.insert();}),false);assert.equal(called,false);
});
test('ranges outside this editor or differing from the current selection stay with the engine',()=>{
 for(const mismatch of ['outside','position']){
  const f=fixture();f.record({getTargetRanges:()=>[{startContainer:mismatch==='outside'?{}:f.node,startOffset:2,endContainer:f.node,endOffset:3}]});let called=false;f.observe(()=>{called=true;return f.insert();});assert.equal(called,false);
 }
});
test('composition that starts after beforeinput invalidates the intent',()=>{
 const f=fixture();f.record();f.model.compositionStarted=true;let called=false;f.observe(()=>{called=true;return f.insert();});assert.equal(called,false);
});
test('a DOM position the engine cannot map stays with the engine',()=>{
 const f=fixture();f.model.posAtDOM=()=>{throw Error('unknown DOM node');};f.record();let called=false;f.observe(()=>{called=true;return f.insert();});assert.equal(called,false);
});
test('readonly, multiple cursors, and an intervening state update invalidate the intent',()=>{
 for(const mode of ['readonly','multiple','update']){
  const f=fixture();
  if(mode==='readonly')f.setState(f.state.update({effects:cm.StateEffect.appendConfig.of(cm.EditorState.readOnly.of(true))}).state);
  if(mode==='multiple')f.setState(f.state.update({selection:cm.EditorSelection.create([cm.EditorSelection.cursor(0),cm.EditorSelection.cursor(3)])}).state);
  f.record();if(mode==='update')f.setState(f.state.update({userEvent:'select'}).state);
  let called=false;f.observe(()=>{called=true;return f.insert();});assert.equal(called,false);
 }
});
test('a captured native intent is consumed once or cleared on interaction boundaries',()=>{
 const f=fixture();let called=false;const insert=()=>{called=true;return f.insert();};f.record();f.guard.clear();f.observe(insert);assert.equal(called,false);
 f.record();assert.equal(f.guard.input(f.view,3,3,'Y',insert),false);f.observe(insert);assert.equal(called,false);
});
test('a native change with another range or text cannot activate the filter',()=>{
 for(const mode of ['range','text']){
  const f=fixture();f.record();let called=false;assert.equal(f.guard.input(f.view,mode==='range'?2:3,3,mode==='text'?'Y':'X',()=>{called=true;return f.insert();}),false);assert.equal(called,false);
 }
});
for(const selection of [cm.EditorSelection.cursor(3),cm.EditorSelection.range(0,3),cm.EditorSelection.range(3,0)]){
 for(const missing of [false,true])test(`live DOM selection resolves ${JSON.stringify(selection.toJSON())}, ranges API ${missing?'missing':'empty'}`,()=>{
  const f=fixture(selection);f.document.getSelection=()=>({rangeCount:1,anchorNode:f.node,focusNode:f.node,anchorOffset:selection.anchor,focusOffset:selection.head} as Selection);
  f.record({getTargetRanges:missing?undefined:()=>[]});f.apply();assert.equal(f.state.selection.main.head,selection.from+1);assert.equal(f.state.selection.main.empty,true);
 });
}
for(const [name,overrides] of [['several DOM ranges',{rangeCount:2}],['outside DOM selection',{anchorNode:{}}],['different DOM offset',{focusOffset:2}],['different DOM orientation',{anchorOffset:3,focusOffset:0}]] as const){
 test(`empty target ranges with ${name} do not infer input intent`,()=>{
  const f=fixture(cm.EditorSelection.range(0,3));f.document.getSelection=()=>({rangeCount:1,anchorNode:f.node,focusNode:f.node,anchorOffset:0,focusOffset:3,...overrides} as Selection);
  f.record({getTargetRanges:()=>[]});let called=false;f.observe(()=>{called=true;return f.insert();});assert.equal(called,false);
 });
}
test('conflicting nonempty target ranges cannot fall back to a matching DOM selection',()=>{
 const f=fixture();f.document.getSelection=()=>({rangeCount:1,anchorNode:f.node,focusNode:f.node,anchorOffset:3,focusOffset:3} as Selection);
 f.record({getTargetRanges:()=>[{startContainer:f.node,endContainer:f.node,startOffset:2,endOffset:3}]});let called=false;f.observe(()=>{called=true;return f.insert();});assert.equal(called,false);
});
test('native multi-code-unit text keeps its full content and intended cursor',()=>{
 const f=fixture();f.record({data:'🧩'});let transaction:cm.Transaction|undefined;
 const insert=()=>transaction??=f.state.update({changes:{from:3,insert:'🧩'},selection:cm.EditorSelection.single(3),userEvent:'input.type'});
 assert.equal(f.guard.input(f.view,3,3,'🧩',insert),false);f.model.dispatch(insert());assert.equal(f.state.doc.toString(),'abc🧩');assert.equal(f.state.selection.main.head,5);
});
for(const stale of [false,true])test(`Markdown HTML closing handlers still run with a ${stale?'stale':'correct'} default input selection`,()=>{
 const guard=codeInputSelectionGuard(cm),node={} as Node;
 let state=cm.EditorState.create({doc:'<div',selection:{anchor:4},extensions:[EditorView.inputHandler.of(guard.input),cm.EditorState.transactionFilter.of(guard.filter),markdown()]});
 const events:string[]=[];
 const model={compositionStarted:false,composing:false,contentDOM:{contains:(target:Node)=>target===node},get state(){return state;},posAtDOM:(_node:Node,offset:number)=>offset,dispatch(transaction:cm.Transaction|readonly cm.Transaction[]){for(const tr of Array.isArray(transaction)?transaction:[transaction]){events.push(tr.annotation(cm.Transaction.userEvent));state=tr.state;}}};
 const view=model as unknown as EditorView;
 guard.beforeinput({isTrusted:true,cancelable:true,inputType:'insertText',data:'>',isComposing:false,getTargetRanges:()=>[{startContainer:node,startOffset:4,endContainer:node,endOffset:4}]} as unknown as InputEvent,view);
 let defaultTransaction:cm.Transaction|undefined;
 const insert=()=>defaultTransaction??=state.update({changes:{from:4,insert:'>'},selection:{anchor:stale?4:5},userEvent:'input.type',scrollIntoView:true});
 const handled=state.facet(EditorView.inputHandler).some(handler=>handler(view,4,4,'>',insert));
 if(!handled)model.dispatch(insert());
 assert.equal(state.doc.toString(),'<div></div>');assert.equal(state.selection.main.head,5);assert.deepEqual(events,['input.type','input.complete']);
});
test('an intentional different selection, composition annotation, or compound edit is preserved',()=>{
 for(const mode of ['selection','composition','compound']){
  const f=fixture();f.record();
  assert.equal(f.apply(()=>f.state.update({changes:mode==='compound'?[{from:0,insert:'Z'},{from:3,insert:'X'}]:{from:3,insert:'X'},selection:cm.EditorSelection.single(mode==='selection'?0:3),userEvent:mode==='composition'?'input.type.compose':'input.type'})),false);
  assert.equal(f.state.selection.main.head,mode==='selection'?0:3);
 }
});
