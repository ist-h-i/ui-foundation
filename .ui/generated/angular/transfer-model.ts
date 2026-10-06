import {collectionProblem,type CollectionKey} from './collection-model';

/** Ordered chosen keys. The app owns catalog items, policy, persistence and undo. */
export type TransferValue=readonly CollectionKey[]|null;
export type TransferSide='source'|'target';
export type TransferReason='button'|'pointer'|'keyboard';
export interface TransferOptions<T>{items:readonly T[];key:(item:T)=>CollectionKey;label:(item:T)=>string;disabled?:(item:T)=>boolean;hidden?:(item:T)=>boolean;}
export interface TransferChange<T>{items:readonly T[];keys:readonly CollectionKey[];from:TransferSide;to:TransferSide;previousValue:TransferValue;value:readonly CollectionKey[];reason:TransferReason;}
export interface TransferReorder<T>{items:readonly T[];item:T;key:CollectionKey;fromIndex:number;toIndex:number;previousValue:readonly CollectionKey[];value:readonly CollectionKey[];reason:TransferReason;}
export interface TransferResult{value:TransferValue;problem:string|null;}

export function transferConfigurationProblem<T>(options:TransferOptions<T>,maxSelected:number|null=null):string|null{
 const problem=collectionProblem(options.items,options.key,options.label);if(problem)return problem;
 if(maxSelected!==null&&(!Number.isSafeInteger(maxSelected)||maxSelected<1))return '選択上限には正の整数を指定してください。';
 try{for(const item of options.items){if(options.disabled&&typeof options.disabled(item)!=='boolean'||options.hidden&&typeof options.hidden(item)!=='boolean')return '候補の無効・非表示には真偽値を指定してください。';}}
 catch{return '候補の状態を読み取れません。';}return null;
}
export function transferStructureProblem<T>(options:TransferOptions<T>,value:unknown):string|null{
 if(value===null)return null;
 if(!Array.isArray(value))return '現在の選択にはキーの配列またはnullを指定してください。フォームをresetして修復できます。';
 let known:Set<CollectionKey>;try{known=new Set(options.items.map(options.key));}catch{return '候補のキーを読み取れません。値は保持しています。';}
 if(value.some(key=>typeof key!=='string'&&typeof key!=='number'||typeof key==='string'&&!key.trim()||typeof key==='number'&&!Number.isFinite(key))||new Set(value).size!==value.length||value.some(key=>!known.has(key)))return '現在の選択に不正・重複・候補にないキーがあります。値は保持しています。フォームをresetして修復できます。';
 return null;
}
export function transferSelectionProblem<T>(options:TransferOptions<T>,value:unknown,required:boolean,maxSelected:number|null):string|null{
 const problem=transferConfigurationProblem(options,maxSelected);if(problem)return problem;
 const structure=transferStructureProblem(options,value);if(structure)return structure;
 const selected=(value??[]) as readonly CollectionKey[];
 if(required&&!selected.length)return '項目を選択してください。';
 return maxSelected!==null&&selected.length>maxSelected?`${maxSelected}件まで選択してください。現在の選択は保持しています。削除して修復できます。`:null;
}
/** Add/remove the exact requested visible scope, all-or-nothing. No sanitization. */
export function transferBatch<T>(options:TransferOptions<T>,value:TransferValue,keys:readonly CollectionKey[],to:TransferSide,maxSelected:number|null=null,canTransfer:((change:TransferChange<T>)=>boolean)|null=null,reason:TransferReason='button',beforeKey:CollectionKey|null=null):TransferResult{
 const problem=transferConfigurationProblem(options,maxSelected)??transferStructureProblem(options,value);if(problem)return {value,problem};
 if(!keys.length)return {value,problem:null};
 const selected=value??[],map=new Map(options.items.map(item=>[options.key(item),item]));
 if(new Set(keys).size!==keys.length||keys.some(key=>!map.has(key)||options.disabled?.(map.get(key)!)||options.hidden?.(map.get(key)!)||(to==='target')===selected.includes(key)))return {value,problem:'移動する項目と候補の状態を確認してください。'};
 let next:CollectionKey[];
 if(to==='source')next=selected.filter(key=>!keys.includes(key));
 else{const insertion=beforeKey===null?selected.length:selected.indexOf(beforeKey);if(insertion<0)return {value,problem:'移動先が更新されています。もう一度位置を選んでください。'};next=[...selected];next.splice(insertion,0,...keys);}
 if(to==='target'&&maxSelected!==null&&next.length>maxSelected)return {value,problem:`${maxSelected}件まで選択できます。今回の追加は行っていません。`};
 const change:TransferChange<T>={items:options.items,keys:[...keys],from:to==='target'?'source':'target',to,previousValue:value,value:next,reason};
 try{if(canTransfer&&canTransfer(change)!==true)return {value,problem:'この移動は許可されていません。'};}catch{return {value,problem:'移動可否を確認できないため、移動していません。'};}
 return {value:next,problem:null};
}
/** Both keys are from the canonical selected order, never a filtered row index. */
export function reorderTransfer<T>(options:TransferOptions<T>,value:TransferValue,key:CollectionKey,targetKey:CollectionKey,canReorder:((move:TransferReorder<T>)=>boolean)|null=null,reason:TransferReason='button'):TransferResult{
 const problem=transferConfigurationProblem(options)??transferStructureProblem(options,value);if(problem)return {value,problem};
 const selected=value??[],fromIndex=selected.indexOf(key),toIndex=selected.indexOf(targetKey),item=options.items.find(item=>options.key(item)===key);
 if(fromIndex<0||toIndex<0||!item||options.disabled?.(item)||options.hidden?.(item))return {value,problem:'移動する項目と移動先を確認してください。'};
 if(fromIndex===toIndex)return {value,problem:null};
 const next=[...selected];next.splice(fromIndex,1);next.splice(toIndex,0,key);
 const move:TransferReorder<T>={items:options.items,item,key,fromIndex,toIndex,previousValue:selected,value:next,reason};
 try{if(canReorder&&canReorder(move)!==true)return {value,problem:'この順序変更は許可されていません。'};}catch{return {value,problem:'順序変更の可否を確認できないため、変更していません。'};}
 return {value:next,problem:null};
}
