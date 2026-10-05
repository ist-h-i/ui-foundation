/** Framework-independent display contracts. Missing values are never converted to zero. */
export type DisplayTone='neutral'|'muted'|'info'|'success'|'warning'|'error';
export function displayInteger(value:number,name:string,minimum=0,maximum=10000):number{
 if(!Number.isSafeInteger(value)||value<minimum||value>maximum)throw new RangeError(name+' must be an integer between '+minimum+' and '+maximum+'.');
 return value;
}
export function finiteDisplayValue(value:number|null,name='value'):number|null{
 if(value!==null&&!Number.isFinite(value))throw new RangeError(name+' must be finite or null.');return value;
}
export function numberDisplay(value:number|null,locale:string,options:Intl.NumberFormatOptions={}):string|null{
 finiteDisplayValue(value);return value===null?null:new Intl.NumberFormat(locale,options).format(value);
}
export function comparisonDelta(value:number|null,comparison:number|null,mode:'absolute'|'percent'):number|null{
 finiteDisplayValue(value);finiteDisplayValue(comparison,'comparison');
 if(value===null||comparison===null||mode==='percent'&&comparison===0)return null;
 const delta=mode==='percent'?(value-comparison)/Math.abs(comparison):(value-comparison);
 return Number.isFinite(delta)?delta:null;
}
export function avatarInitials(name:string,locale='ja-JP'):string{
 const words=name.trim().split(/\s+/u).filter(Boolean),segmenter=new Intl.Segmenter(locale,{granularity:'grapheme'});
 const letters=(value:string)=>Array.from(segmenter.segment(value),part=>part.segment);
 if(words.length>1)return (letters(words[0]!)[0]!+letters(words.at(-1)!)[0]!).toLocaleUpperCase(locale);
 return letters(words[0]??'').slice(0,2).join('').toLocaleUpperCase(locale)||'?';
}
export interface MeterValues{value:number|null;min:number;max:number;low:number|null;high:number|null;optimum:number|null}
export function meterValues(value:number|null,min:number,max:number,low:number|null=null,high:number|null=null,optimum:number|null=null):MeterValues{
 for(const [name,amount] of Object.entries({value,min,max,low,high,optimum}))finiteDisplayValue(amount,name);
 if(min>=max)throw new RangeError('Meter min must be less than max.');
 for(const [name,amount] of Object.entries({value,low,high,optimum}))if(amount!==null&&(amount<min||amount>max))throw new RangeError('Meter '+name+' must be within its range.');
 if(low!==null&&high!==null&&low>high)throw new RangeError('Meter low must not exceed high.');
 return {value,min,max,low,high,optimum};
}
export interface MeterSegment { id:string;label:string;value:number|null;tone?:DisplayTone }
export function meterGroupValues(items:readonly MeterSegment[],maximum:number):{sum:number;unknown:number}{
 finiteDisplayValue(maximum,'maximum');if(maximum<=0)throw new RangeError('MeterGroup maximum must be positive.');
 const ids=new Set<string>();let sum=0,unknown=0;
 for(const item of items){if(!item.id.trim()||!item.label.trim()||ids.has(item.id))throw new Error('MeterGroup items need unique IDs and nonempty labels.');ids.add(item.id);meterValues(item.value,0,maximum);if(item.value===null)unknown++;else sum+=item.value;}
 if(!Number.isFinite(sum)||sum>maximum)throw new RangeError('MeterGroup sum must not exceed its maximum.');
 return {sum,unknown};
}
/** Preserve raw keys, strings and number tokens while changing JSON whitespace. */
export function formatJSONCode(source:string,indent=2):string{
 displayInteger(indent,'JSON indent',0,8);JSON.parse(source);
 const tokens=source.match(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\],:]|[^\s{}\[\],:]+/gu)??[];
 let depth=0,result='';const newline=()=>{result+='\n'+' '.repeat(depth*indent);};
 for(let index=0;index<tokens.length;index++){
  const token=tokens[index]!,previous=tokens[index-1],next=tokens[index+1];
  if(token==='{'||token==='['){result+=token;if(next!==(token==='{'?'}':']')){depth++;newline();}}
  else if(token==='}'||token===']'){if(previous!==(token==='}'?'{':'[')){depth--;newline();}result+=token;}
  else if(token===','){result+=',';newline();}
  else if(token===':')result+=': ';
  else result+=token;
 }
 return result;
}
export interface CodePresentation{text:string;error:string|null}
export function codePresentation(source:string,language:string,format:'preserve'|'json',indent=2,formatter:((source:string,language:string)=>string)|null=null):CodePresentation{
 try{
  const text=formatter?formatter(source,language):format==='json'?formatJSONCode(source,indent):source;
  if(typeof text!=='string')throw new TypeError('Formatter must return text.');
  return {text,error:null};
 }catch{return {text:source,error:'整形できませんでした。原文を表示しています。'};}
}
