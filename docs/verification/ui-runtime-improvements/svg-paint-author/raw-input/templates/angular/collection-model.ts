/** Collection presentation data only. I/O, persistence and undo belong to the app. */
export type CollectionKey = string | number;
export interface CollectionViewState { query: string; sort: 'none' | 'asc' | 'desc'; page: number; pageSize: number; layout: 'list' | 'grid'; }
export interface CollectionMove<T> { item: T; fromIndex: number; toIndex: number; items: readonly T[]; reason: 'button' | 'pointer' | 'keyboard'; }
export function createCollectionView(overrides: Partial<CollectionViewState> = {}): CollectionViewState { return { query: '', sort: 'none', page: 1, pageSize: 10, layout: 'list', ...overrides }; }
export function collectionProblem<T>(items: readonly T[], key: (item: T) => CollectionKey, label: (item: T) => string): string | null {
 const seen=new Set<CollectionKey>();
 try { for(const item of items){const id=key(item),name=label(item);if(typeof id!=='string'&&typeof id!=='number'||typeof id==='number'&&!Number.isFinite(id)||typeof id==='string'&&!id.trim()||seen.has(id)||typeof name!=='string'||!name.trim())return '一覧のキーと説明には重複しない有効な値を指定してください。';seen.add(id);} }
 catch{return '一覧のキーと説明を読み取れません。';}return null;
}
export function collectionPage<T>(items: readonly T[], label: (item: T) => string, state: CollectionViewState, locale='ja-JP'):{items:readonly T[];total:number;pages:number;page:number}{
 if(typeof state.query!=='string'||!['none','asc','desc'].includes(state.sort)||!['list','grid'].includes(state.layout)||!Number.isSafeInteger(state.page)||state.page<1||!Number.isSafeInteger(state.pageSize)||state.pageSize<1)throw new Error('一覧の検索、表示、ページ条件を確認してください。');
 const query=state.query.toLocaleLowerCase(locale),collator=new Intl.Collator(locale,{numeric:true,sensitivity:'base'});
 const filtered=items.map((item,index)=>({item,index,label:label(item)})).filter(row=>row.label.toLocaleLowerCase(locale).includes(query));
 if(state.sort!=='none')filtered.sort((a,b)=>(state.sort==='asc'?1:-1)*collator.compare(a.label,b.label)||a.index-b.index);
 const pages=Math.ceil(filtered.length/state.pageSize),page=Math.min(state.page,Math.max(1,pages)),start=(page-1)*state.pageSize;
 return {items:filtered.slice(start,start+state.pageSize).map(row=>row.item),total:filtered.length,pages,page};
}
export function moveCollection<T>(items:readonly T[],fromIndex:number,toIndex:number,canMove:((move:Omit<CollectionMove<T>,'reason'>)=>boolean)|null=null):readonly T[]{
 if(!Number.isSafeInteger(fromIndex)||!Number.isSafeInteger(toIndex)||fromIndex<0||toIndex<0||fromIndex>=items.length||toIndex>=items.length||fromIndex===toIndex)return items;
 const item=items[fromIndex];try{if(canMove&&canMove({item,fromIndex,toIndex,items})!==true)return items;}catch{return items;}
 const next=[...items];next.splice(fromIndex,1);next.splice(toIndex,0,item);return next;
}
export interface ListChoice {value:string;label:string;disabled?:boolean;group?:string}
export type ListboxValue=string|readonly string[]|null;
export function selectedListValues(value:unknown):readonly string[]{return typeof value==='string'?[value]:Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[];}
export function listSelectionProblem(options:readonly ListChoice[],value:unknown,multiple:boolean,required:boolean,maxSelected:number|null):string|null{
 const known=new Set<string>();for(const option of options){if(!option||typeof option.value!=='string'||!option.value.trim()||typeof option.label!=='string'||!option.label.trim()||known.has(option.value)||option.group!==undefined&&(typeof option.group!=='string'||!option.group.trim()))return '選択肢の値と説明・グループを確認してください。';known.add(option.value);}
 if(maxSelected!==null&&(!Number.isSafeInteger(maxSelected)||maxSelected<1))return '選択上限には正の整数を指定してください。';
 if(value!==null&&(multiple?!Array.isArray(value):typeof value!=='string'))return multiple?'複数選択には値の配列を指定してください。':'単一選択には一つの値を指定してください。';
 const values=selectedListValues(value);if(Array.isArray(value)&&values.length!==value.length||new Set(values).size!==values.length||values.some(item=>!known.has(item)))return '現在の選択と選択肢を確認してください。';
 if(required&&!values.length)return '選択してください。';if(maxSelected!==null&&values.length>maxSelected)return `${maxSelected}件まで選択してください。`;return null;
}
export function changeListSelection(options:readonly ListChoice[],value:ListboxValue,key:string,multiple:boolean,maxSelected:number|null,clearable=true):ListboxValue{
 if(value!==null&&(multiple?!Array.isArray(value):typeof value!=='string')||Array.isArray(value)&&value.some(item=>typeof item!=='string'))return value;
 const option=options.find(item=>item.value===key);if(!option||option.disabled)return value;
 const selected=selectedListValues(value);if(!multiple)return clearable&&selected.includes(key)?null:key;
 if(selected.includes(key))return selected.filter(item=>item!==key);if(maxSelected!==null&&selected.length>=maxSelected)return value;return [...selected,key];
}
export function selectListScope(options:readonly ListChoice[],value:ListboxValue,selected:boolean,maxSelected:number|null):ListboxValue{
 if(value!==null&&!Array.isArray(value)||Array.isArray(value)&&value.some(item=>typeof item!=='string'))return value;
 const existing=selectedListValues(value),scope=options.filter(option=>!option.disabled).map(option=>option.value),next=selected?[...existing,...scope.filter(key=>!existing.includes(key))]:existing.filter(item=>!scope.includes(item));
 return selected&&maxSelected!==null&&next.length>maxSelected?value:next;
}

/** Keep the last scroll position measured with stable row/viewport geometry.
 * Native resizing can clamp scrollTop against the previous CDK content size.
 * Such a transient clamp must not replace the logical position to restore. */
export class CollectionScrollPosition {
 private rowSize=0;private viewportSize=0;private frontIndex=0;
 remember(offset:number,rowSize:number,viewportSize:number):void {
  if(rowSize===this.rowSize&&viewportSize===this.viewportSize&&rowSize>0&&Number.isFinite(offset)&&offset>=0)this.frontIndex=offset/rowSize;
 }
 rebase(rowSize:number,viewportSize:number,offset:number,replaceViewport=false):number|null {
  if(!Number.isFinite(rowSize)||rowSize<=0||!Number.isFinite(viewportSize)||viewportSize<=0)return null;
  const initialized=this.rowSize>0,changed=replaceViewport||rowSize!==this.rowSize||viewportSize!==this.viewportSize;
  if(!initialized)this.frontIndex=Math.max(0,offset)/rowSize;
  this.rowSize=rowSize;this.viewportSize=viewportSize;
  return initialized&&changed?this.frontIndex*rowSize:null;
 }
}
