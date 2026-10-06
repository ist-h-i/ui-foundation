import {parseTree,printParseErrorCode,type Node,type ParseError} from 'jsonc-parser';
export interface JsonRow {id:string;label:string;source:string;type:string;depth:number;parentId:string|null;container:boolean;offset:number;length:number;}
export interface JsonModel {rows:readonly JsonRow[];error:string|null;}
/** Offset-based nodes preserve duplicate properties and exact numeric/string source tokens. */
export function jsonRows(source:string):JsonModel {
 if(source.length>1_000_000)return {rows:[],error:'JSON exceeds the viewer limit'};const errors:ParseError[]=[];const root=parseTree(source,errors,{allowTrailingComma:false,disallowComments:true});if(!root||errors.length)return {rows:[],error:errors.length?`${printParseErrorCode(errors[0].error)} at ${errors[0].offset}`:'JSON is empty'};
 const rows:JsonRow[]=[];const visit=(node:Node,label:string,depth:number,parentId:string|null):void=>{if(depth>64||rows.length>=10000)throw new Error('JSON hierarchy exceeds the viewer limit');const id=String(node.offset),container=node.type==='array'||node.type==='object';rows.push({id,label,source:source.slice(node.offset,node.offset+node.length),type:node.type,depth,parentId,container,offset:node.offset,length:node.length});if(node.type==='object'){for(const property of node.children??[]){const key=property.children?.[0],value=property.children?.[1];if(key&&value)visit(value,source.slice(key.offset,key.offset+key.length),depth+1,id);}}else if(node.type==='array'){for(const [index,child] of (node.children??[]).entries())visit(child,String(index),depth+1,id);}};
 try{visit(root,'root',0,null);return {rows,error:null};}catch(error){return {rows:[],error:error instanceof Error?error.message:'Invalid JSON'};}
}
export function visibleJsonRows(model:JsonModel,expanded:ReadonlySet<string>,query:string,locale='ja-JP'):readonly JsonRow[] {
 const normalized=query.trim().toLocaleLowerCase(locale);if(normalized)return model.rows.filter(row=>(row.label+' '+row.source).toLocaleLowerCase(locale).includes(normalized));const byId=new Map(model.rows.map(row=>[row.id,row]));return model.rows.filter(row=>{let parent=row.parentId;while(parent!==null){if(!expanded.has(parent))return false;parent=byId.get(parent)?.parentId??null;}return true;});
}
