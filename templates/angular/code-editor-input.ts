import type {EditorState, Transaction, TransactionSpec} from '@codemirror/state';
import type {EditorView} from '@codemirror/view';

/** Preserve the beforeinput intent if a scroll flush reuses a stale DOM selection.
 * Only native plain-text input with an exact state/range/text match is eligible.
 * Composition, paste, unresolvable ranges and application transactions stay with CM.
 * Modules are injected at mount so editor loading remains asynchronous.
 */
export function codeInputSelectionGuard(state:typeof import('@codemirror/state')) {
 type Intent={state:EditorState;from:number;to:number;text:string};
 let pending:Intent|null=null,active:Intent|null=null;
 const clear=()=>{pending=null;};
 const beforeinput=(event:InputEvent,view:EditorView):void=>{
  pending=null;
  if(!event.isTrusted||!event.cancelable||event.inputType!=='insertText'||!event.data||event.isComposing||view.compositionStarted||view.state.readOnly||view.state.selection.ranges.length!==1)return;
  let from:number,to:number;const selection=view.state.selection.main;
  try{
   const ranges=typeof event.getTargetRanges==='function'?event.getTargetRanges():[];
   if(ranges.length>1)return;
   if(ranges.length===1){
    const range=ranges[0]!;
    if(!view.contentDOM.contains(range.startContainer)||!view.contentDOM.contains(range.endContainer))return;
    from=view.posAtDOM(range.startContainer,range.startOffset);to=view.posAtDOM(range.endContainer,range.endOffset);
   }else{
    // Some native insertText events expose no target ranges. Use only a single
    // live DOM selection whose orientation and positions exactly match CM.
    const native=view.contentDOM.ownerDocument.getSelection();
    if(!native||native.rangeCount!==1||!native.anchorNode||!native.focusNode||!view.contentDOM.contains(native.anchorNode)||!view.contentDOM.contains(native.focusNode))return;
    const anchor=view.posAtDOM(native.anchorNode,native.anchorOffset),head=view.posAtDOM(native.focusNode,native.focusOffset);
    if(anchor!==selection.anchor||head!==selection.head)return;
    from=Math.min(anchor,head);to=Math.max(anchor,head);
   }
  }catch{return;}
  if(from!==selection.from||to!==selection.to)return;
  pending={state:view.state,from,to,text:event.data};
 };
 const filter=(transaction:Transaction):TransactionSpec|readonly TransactionSpec[]=>{
  const intent=active;
  if(!intent||transaction.startState!==intent.state||transaction.annotation(state.Transaction.userEvent)!=='input.type'||transaction.newSelection.ranges.length!==1)return transaction;
  let count=0,match=false;
  transaction.changes.iterChanges((from,to,_fromB,_toB,text)=>{count++;match=from===intent.from&&to===intent.to&&text.toString()===intent.text;});
  if(count!==1||!match)return transaction;
  const end=intent.from+intent.text.length,selection=transaction.newSelection;
  if(selection.main.empty&&selection.main.head===end||!selection.eq(intent.state.selection.map(transaction.changes)))return transaction;
  return [transaction,{selection:state.EditorSelection.cursor(end),sequential:true}];
 };
 const input=(view:EditorView,from:number,to:number,text:string,insert:()=>Transaction):boolean=>{
  const intent=pending;pending=null;
  if(!intent||intent.state!==view.state||intent.from!==from||intent.to!==to||intent.text!==text||view.compositionStarted||view.state.readOnly)return false;
  // The filter is active only while CM builds its native DOM-input transaction.
  // Application writes with the same userEvent annotation cannot consume intent.
  active=intent;
  try{insert();}finally{active=null;}
  // CM caches this default transaction. Later language handlers still run and
  // can use it or supply their own input behavior before the default dispatch.
  return false;
 };
 return {beforeinput,clear,input,filter};
}
