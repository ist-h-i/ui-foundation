import {safeEditorUrl} from './specialist-model';
export type CodeLanguage='javascript'|'typescript'|'json'|'markdown'|'text';
export interface CodeCompletion {label:string;type?:string;detail?:string;info?:string;}
export type RichToolbarAction='bold'|'italic'|'code'|'paragraph'|'heading'|'link'|'image'|'undo'|'redo';
export const defaultRichDocument=JSON.stringify({type:'doc',content:[{type:'paragraph'}]});
/** Validated document JSON crosses the DOM adapter boundary. No raw HTML is accepted. */
export function checkedRichDocument(source:string):Record<string,unknown> {
  if(source.length>1_000_000)throw new Error('Document exceeds the editor limit');
  const document:unknown=JSON.parse(source||defaultRichDocument);let count=0;
  const visit=(node:unknown,depth:number):void=>{
    if(!node||typeof node!=='object'||Array.isArray(node)||depth>64||++count>10000)throw new Error('Invalid or oversized document');
    const item=node as Record<string,unknown>;if(typeof item['type']!=='string')throw new Error('Node type is required');
    if(item['type']==='image'){const attrs=item['attrs'] as Record<string,unknown>|undefined;if(!attrs||typeof attrs['src']!=='string'||!safeEditorUrl(attrs['src'],true)||typeof attrs['alt']!=='string')throw new Error('Images require a safe URL and alternative text');}
    if(item['marks']!==undefined){if(!Array.isArray(item['marks']))throw new Error('Invalid marks');for(const mark of item['marks']){if(!mark||typeof mark!=='object')throw new Error('Invalid mark');if(mark.type==='link'&&(!mark.attrs||typeof mark.attrs.href!=='string'||!safeEditorUrl(mark.attrs.href)))throw new Error('Links require a safe URL');}}
    if(item['content']!==undefined){if(!Array.isArray(item['content']))throw new Error('Invalid node content');for(const child of item['content'])visit(child,depth+1);}
  };visit(document,0);return document as Record<string,unknown>;
}
