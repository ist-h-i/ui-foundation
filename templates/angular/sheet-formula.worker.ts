import {resolveUiMessage} from './stable-messages';
import {evaluateSheet} from './sheet-formula';
import {sheetProblem,type SheetModel} from './specialist-model';
import type {SheetResult} from './sheet-formula';
interface Request {requestId:number;sheet:SheetModel;}
interface Response {requestId:number;results:readonly (readonly SheetResult[])[]|null;error:string|null;errorId?:'uiFoundation.spreadsheet.calculationFailed';}
addEventListener('message',(event:MessageEvent<unknown>)=>{
 const request=event.data as Partial<Request>|null;if(!request||!Number.isInteger(request.requestId)||!request.sheet)return;
 const response:Response={requestId:request.requestId!,results:null,error:null};
 try{const problem=sheetProblem(request.sheet);if(problem)throw new Error(problem);response.results=evaluateSheet(request.sheet);}catch{response.errorId='uiFoundation.spreadsheet.calculationFailed';response.error=resolveUiMessage({id:response.errorId},'ja-JP');}
 (globalThis as unknown as {postMessage:(message:Response)=>void}).postMessage(response);
});

// Static imports have completed and the listener is installed before any calculation request.
(globalThis as unknown as {postMessage:(message:unknown)=>void}).postMessage({type:'sheet-ready',version:1});
