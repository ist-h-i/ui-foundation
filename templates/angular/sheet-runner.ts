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
/** UI calculation adapter: bounded phases, stale discard, cancellation and teardown; no persisted I/O. */
export class SheetFormulaRunner {
 private worker:Worker|null=null;private timer:ReturnType<typeof setTimeout>|null=null;private requestId=0;private destroyed=false;
 calculate(sheet:SheetModel,url:URL|string,completed:(results:readonly (readonly SheetResult[])[]|null,error:string|null)=>void,timeouts:Readonly<SheetWorkerTimeouts>=defaultSheetWorkerTimeouts):void{
  this.cancel();if(this.destroyed)return;const requestId=++this.requestId;
  if(!timeouts||!validDeadline(timeouts.startupMs)||!validDeadline(timeouts.calculationMs)){completed(null,'計算の期限設定を確認してください。セルの原文は保持されています。');return;}
  const {startupMs,calculationMs}=timeouts;
  try{
   const worker=this.worker=new Worker(url,{type:'module'});let started=false;
   const finish=(results:readonly (readonly SheetResult[])[]|null,error:string|null)=>{if(this.destroyed||requestId!==this.requestId)return;this.cancel();completed(results,error);};
   worker.onmessage=(event:MessageEvent<unknown>)=>{
    if(this.destroyed||requestId!==this.requestId)return;
    const result=event.data as {type?:unknown;version?:unknown;requestId?:unknown;results?:unknown;error?:unknown}|null;
    if(!result||typeof result!=='object')return;
    if(result.type==='sheet-ready'){
     if(result.version!==1)return finish(null,'計算結果を確認できませんでした。セルの原文は保持されています。再計算してください。');
     if(started)return;started=true;this.clearTimer();
     this.timer=setTimeout(()=>finish(null,'計算が時間内に終わりませんでした。セルの原文は保持されています。再計算してください。'),calculationMs);
     try{worker.postMessage({requestId,sheet});}catch{finish(null,'数式の計算を開始できませんでした。セルの原文は保持されています。再計算してください。');}
     return;
    }
    if(!started||result.requestId!==requestId)return;
    if(result.results===null){if(typeof result.error!=='string'||!result.error)return finish(null,'計算結果を確認できませんでした。セルの原文は保持されています。再計算してください。');return finish(null,result.error);}
    if(!validResults(result.results,sheet)||result.error!==null)return finish(null,'計算結果を確認できませんでした。セルの原文は保持されています。再計算してください。');
    finish(result.results,null);
   };
   worker.onerror=event=>{event.preventDefault();finish(null,'数式の計算を開始できませんでした。セルの原文は保持されています。再計算してください。');};
   this.timer=setTimeout(()=>finish(null,'計算の準備が時間内に終わりませんでした。セルの原文は保持されています。再計算してください。'),startupMs);
  }catch{if(!this.destroyed&&requestId===this.requestId){this.cancel();completed(null,'数式の計算を開始できませんでした。セルの原文は保持されています。再計算してください。');}}
 }
 private clearTimer():void{if(this.timer!==null)clearTimeout(this.timer);this.timer=null;}
 private cancel():void{this.requestId++;this.clearTimer();this.worker?.terminate();this.worker=null;}
 invalidate():void{this.cancel();}
 destroy():void{this.destroyed=true;this.cancel();}
}
