import {resolveUiMessage} from './stable-messages';
import type {SheetModel} from './specialist-model';
import type {SheetResult} from './sheet-formula';

/** Startup includes the module fetch/imports; calculation starts after the ready handshake. */
export interface SheetWorkerTimeouts {readonly startupMs:number;readonly calculationMs:number;}
export const defaultSheetWorkerTimeouts:Readonly<SheetWorkerTimeouts>=Object.freeze({startupMs:10_000,calculationMs:2_000});
const validDeadline=(value:unknown):value is number=>typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=60_000;
function validResults(value:unknown,sheet:SheetModel):value is readonly (readonly SheetResult[])[]{
 return Array.isArray(value)&&value.length===sheet.rows.length&&value.every((row,index)=>Array.isArray(row)&&row.length===sheet.rows[index].length&&row.every((cell:unknown)=>{
  if(!cell||typeof cell!=='object'||!('value' in cell)||!('error' in cell))return false;
  const result=cell as SheetResult;
  return (result.value===null||['string','number','boolean'].includes(typeof result.value))&&(typeof result.value!=='number'||Number.isFinite(result.value))&&(result.error===null||typeof result.error==='string');
 }));
}
type CalculationMessageId = 'uiFoundation.spreadsheet.invalidCalculationTimeout' | 'uiFoundation.spreadsheet.calculationUnconfirmed' | 'uiFoundation.spreadsheet.calculationTimedOut' | 'uiFoundation.spreadsheet.calculationStartFailed' | 'uiFoundation.spreadsheet.calculationPreparationTimedOut' | 'uiFoundation.spreadsheet.calculationFailed';
/** UI calculation adapter: bounded phases, stale discard, cancellation and teardown; no persisted I/O. */
export class SheetFormulaRunner {
 private worker:Worker|null=null;private timer:ReturnType<typeof setTimeout>|null=null;private requestId=0;private destroyed=false;
 calculate(sheet:SheetModel,url:URL|string,completed:(results:readonly (readonly SheetResult[])[]|null,error:string|null,id?:CalculationMessageId)=>void,timeouts:Readonly<SheetWorkerTimeouts>=defaultSheetWorkerTimeouts):void{
  this.cancel();if(this.destroyed)return;const requestId=++this.requestId;
  if(!timeouts||!validDeadline(timeouts.startupMs)||!validDeadline(timeouts.calculationMs)){completed(null,resolveUiMessage({id:'uiFoundation.spreadsheet.invalidCalculationTimeout'},'ja-JP'),'uiFoundation.spreadsheet.invalidCalculationTimeout');return;}
  const {startupMs,calculationMs}=timeouts;
  try{
   const worker=this.worker=new Worker(url,{type:'module'});let started=false;
   const finish=(results:readonly (readonly SheetResult[])[]|null,error:string|null,id?:CalculationMessageId)=>{if(this.destroyed||requestId!==this.requestId)return;this.cancel();completed(results,error,id);};
   worker.onmessage=(event:MessageEvent<unknown>)=>{
    if(this.destroyed||requestId!==this.requestId)return;
    const result=event.data as {type?:unknown;version?:unknown;requestId?:unknown;results?:unknown;error?:unknown;errorId?:unknown}|null;
    if(!result||typeof result!=='object')return;
    if(result.type==='sheet-ready'){
     if(result.version!==1)return finish(null,resolveUiMessage({id:'uiFoundation.spreadsheet.calculationUnconfirmed'},'ja-JP'),'uiFoundation.spreadsheet.calculationUnconfirmed');
     if(started)return;started=true;this.clearTimer();
     this.timer=setTimeout(()=>finish(null,resolveUiMessage({id:'uiFoundation.spreadsheet.calculationTimedOut'},'ja-JP'),'uiFoundation.spreadsheet.calculationTimedOut'),calculationMs);
     try{worker.postMessage({requestId,sheet});}catch{finish(null,resolveUiMessage({id:'uiFoundation.spreadsheet.calculationStartFailed'},'ja-JP'),'uiFoundation.spreadsheet.calculationStartFailed');}
     return;
    }
    if(!started||result.requestId!==requestId)return;
    if(result.results===null){if(typeof result.error!=='string'||!result.error)return finish(null,resolveUiMessage({id:'uiFoundation.spreadsheet.calculationUnconfirmed'},'ja-JP'),'uiFoundation.spreadsheet.calculationUnconfirmed');return finish(null,result.error,result.errorId==='uiFoundation.spreadsheet.calculationFailed'?result.errorId:undefined);}
    if(!validResults(result.results,sheet)||result.error!==null)return finish(null,resolveUiMessage({id:'uiFoundation.spreadsheet.calculationUnconfirmed'},'ja-JP'),'uiFoundation.spreadsheet.calculationUnconfirmed');
    finish(result.results,null);
   };
   worker.onerror=event=>{event.preventDefault();finish(null,resolveUiMessage({id:'uiFoundation.spreadsheet.calculationStartFailed'},'ja-JP'),'uiFoundation.spreadsheet.calculationStartFailed');};
   this.timer=setTimeout(()=>finish(null,resolveUiMessage({id:'uiFoundation.spreadsheet.calculationPreparationTimedOut'},'ja-JP'),'uiFoundation.spreadsheet.calculationPreparationTimedOut'),startupMs);
  }catch{if(!this.destroyed&&requestId===this.requestId){this.cancel();completed(null,resolveUiMessage({id:'uiFoundation.spreadsheet.calculationStartFailed'},'ja-JP'),'uiFoundation.spreadsheet.calculationStartFailed');}}
 }
 private clearTimer():void{if(this.timer!==null)clearTimeout(this.timer);this.timer=null;}
 private cancel():void{this.requestId++;this.clearTimer();this.worker?.terminate();this.worker=null;}
 invalidate():void{this.cancel();}
 destroy():void{this.destroyed=true;this.cancel();}
}
