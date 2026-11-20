import {uiMessageText as createUiMessageText, type UiMessageText} from './stable-messages';
const japaneseText = createUiMessageText(() => 'ja-JP');
import {collectionProblem,type CollectionKey} from './collection-model';

/** Ordered chosen keys. The app owns catalog items, policy, persistence and undo. */
export type TransferValue=readonly CollectionKey[]|null;
export type TransferSide='source'|'target';
export type TransferReason='button'|'pointer'|'keyboard';
export interface TransferOptions<T>{items:readonly T[];key:(item:T)=>CollectionKey;label:(item:T)=>string;disabled?:(item:T)=>boolean;hidden?:(item:T)=>boolean;}
export interface TransferChange<T>{items:readonly T[];keys:readonly CollectionKey[];from:TransferSide;to:TransferSide;previousValue:TransferValue;value:readonly CollectionKey[];reason:TransferReason;}
export interface TransferReorder<T>{items:readonly T[];item:T;key:CollectionKey;fromIndex:number;toIndex:number;previousValue:readonly CollectionKey[];value:readonly CollectionKey[];reason:TransferReason;}
export interface TransferResult{value:TransferValue;problem:string|null;}
export function transferConfigurationProblem<T>(options:TransferOptions<T>,maxSelected:number|null=null, text: UiMessageText = japaneseText):string|null{
 const problem=collectionProblem(options.items,options.key,options.label, text);if(problem)return problem;
 if(maxSelected!==null&&(!Number.isSafeInteger(maxSelected)||maxSelected<1))return text("uiFoundation.transferList.useAPositiveIntegerForTheSelectionLimit");
 try{for(const item of options.items){if(options.disabled&&typeof options.disabled(item)!=='boolean'||options.hidden&&typeof options.hidden(item)!=='boolean')return text("uiFoundation.transferList.useBooleanValuesForDisabledAndHiddenOptions");}}
 catch{return text("uiFoundation.transferList.couldNotReadTheStateOfTheAvailable");}return null;
}
export function transferStructureProblem<T>(options:TransferOptions<T>,value:unknown, text: UiMessageText = japaneseText):string|null{
 if(value===null)return null;
 if(!Array.isArray(value))return text("uiFoundation.transferList.useAnArrayOfKeysOrNullFor");
 let known:Set<CollectionKey>;try{known=new Set(options.items.map(options.key));}catch{return text("uiFoundation.transferList.couldNotReadTheOptionKeysTheValue");}
 if(value.some(key=>typeof key!=='string'&&typeof key!=='number'||typeof key==='string'&&!key.trim()||typeof key==='number'&&!Number.isFinite(key))||new Set(value).size!==value.length||value.some(key=>!known.has(key)))return text("uiFoundation.transferList.theCurrentSelectionContainsInvalidDuplicateOrUnavailable");
 return null;
}
export function transferSelectionProblem<T>(options:TransferOptions<T>,value:unknown,required:boolean,maxSelected:number|null, text: UiMessageText = japaneseText):string|null{
 const problem=transferConfigurationProblem(options,maxSelected, text);if(problem)return problem;
 const structure=transferStructureProblem(options,value, text);if(structure)return structure;
 const selected=(value??[]) as readonly CollectionKey[];
 if(required&&!selected.length)return text("uiFoundation.transferList.selectAnItem");
 return maxSelected!==null&&selected.length>maxSelected?text('uiFoundation.transferList.currentSelectionLimit',{limit:maxSelected}):null;
}
/** Add/remove the exact requested visible scope, all-or-nothing. No sanitization. */
export function transferBatch<T>(options:TransferOptions<T>,value:TransferValue,keys:readonly CollectionKey[],to:TransferSide,maxSelected:number|null=null,canTransfer:((change:TransferChange<T>)=>boolean)|null=null,reason:TransferReason='button',beforeKey:CollectionKey|null=null, text: UiMessageText = japaneseText):TransferResult{
 const problem=transferConfigurationProblem(options,maxSelected, text)??transferStructureProblem(options,value, text);if(problem)return {value,problem};
 if(!keys.length)return {value,problem:null};
 const selected=value??[],map=new Map(options.items.map(item=>[options.key(item),item]));
 if(new Set(keys).size!==keys.length||keys.some(key=>!map.has(key)||options.disabled?.(map.get(key)!)||options.hidden?.(map.get(key)!)||(to==='target')===selected.includes(key)))return {value,problem:text("uiFoundation.transferList.checkTheItemsToMoveAndTheState")};
 let next:CollectionKey[];
 if(to==='source')next=selected.filter(key=>!keys.includes(key));
 else{const insertion=beforeKey===null?selected.length:selected.indexOf(beforeKey);if(insertion<0)return {value,problem:text("uiFoundation.transferList.theDestinationChangedChooseAPositionAgain")};next=[...selected];next.splice(insertion,0,...keys);}
 if(to==='target'&&maxSelected!==null&&next.length>maxSelected)return {value,problem:text('uiFoundation.transferList.additionLimit',{limit:maxSelected})};
 const change:TransferChange<T>={items:options.items,keys:[...keys],from:to==='target'?'source':'target',to,previousValue:value,value:next,reason};
 try{if(canTransfer&&canTransfer(change)!==true)return {value,problem:text("uiFoundation.transferList.thisMoveIsNotAllowed")};}catch{return {value,problem:text("uiFoundation.transferList.couldNotVerifyWhetherTheMoveIsAllowed")};}
 return {value:next,problem:null};
}
/** Both keys are from the canonical selected order, never a filtered row index. */
export function reorderTransfer<T>(options:TransferOptions<T>,value:TransferValue,key:CollectionKey,targetKey:CollectionKey,canReorder:((move:TransferReorder<T>)=>boolean)|null=null,reason:TransferReason='button', text: UiMessageText = japaneseText):TransferResult{
 const problem=transferConfigurationProblem(options, null, text)??transferStructureProblem(options,value, text);if(problem)return {value,problem};
 const selected=value??[],fromIndex=selected.indexOf(key),toIndex=selected.indexOf(targetKey),item=options.items.find(item=>options.key(item)===key);
 if(fromIndex<0||toIndex<0||!item||options.disabled?.(item)||options.hidden?.(item))return {value,problem:text("uiFoundation.transferList.checkTheItemsToMoveAndTheirDestination")};
 if(fromIndex===toIndex)return {value,problem:null};
 const next=[...selected];next.splice(fromIndex,1);next.splice(toIndex,0,key);
 const move:TransferReorder<T>={items:options.items,item,key,fromIndex,toIndex,previousValue:selected,value:next,reason};
 try{if(canReorder&&canReorder(move)!==true)return {value,problem:text("uiFoundation.transferList.thisReorderIsNotAllowed")};}catch{return {value,problem:text("uiFoundation.transferList.couldNotVerifyWhetherReorderingIsAllowedThe")};}
 return {value:next,problem:null};
}
