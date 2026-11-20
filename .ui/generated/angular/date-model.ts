import { uiMessageText, type UiMessageText } from './stable-messages';

const japaneseText = uiMessageText(() => 'ja-JP');

/** Calendar dates use ISO civil strings, never UTC-to-local conversions. */
export function civilDate(value:string|null|undefined):Date|null{
 if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const [year,month,day]=value.split('-').map(Number);if(!year||year>9999)return null;
 const date=new Date(0);date.setUTCHours(0,0,0,0);date.setUTCFullYear(year!,month!-1,day!);
 return date.getUTCFullYear()===year&&date.getUTCMonth()===month!-1&&date.getUTCDate()===day?date:null;
}
export function civilISO(date:Date):string{return String(date.getUTCFullYear()).padStart(4,'0')+'-'+String(date.getUTCMonth()+1).padStart(2,'0')+'-'+String(date.getUTCDate()).padStart(2,'0');}
/** Snapshot the device's local day for defaults; civil arithmetic stays in UTC. */
export function localCivilISO(date:Date):string{
 const year=date.getFullYear();if(!Number.isInteger(year)||year<1||year>9999)throw new RangeError('Local calendar date must have a year between 1 and 9999.');
 return String(year).padStart(4,'0')+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
}
export function addCivilDays(value:string,amount:number):string{const date=civilDate(value);if(!date||!Number.isInteger(amount))return value;date.setUTCDate(date.getUTCDate()+amount);return date.getUTCFullYear()<1||date.getUTCFullYear()>9999?value:civilISO(date);}
export function shiftCivilMonth(value:string,months:number):string{
 const date=civilDate(value);if(!date||!Number.isInteger(months))return value;const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+months);
 if(date.getUTCFullYear()<1||date.getUTCFullYear()>9999)return value;
 const last=new Date(date);last.setUTCMonth(last.getUTCMonth()+1,0);date.setUTCDate(Math.min(day,last.getUTCDate()));return civilISO(date);
}
export function civilLabel(value:string,locale='ja-JP',options:Intl.DateTimeFormatOptions={dateStyle:'full'}):string{const date=civilDate(value);return date?new Intl.DateTimeFormat(locale,{...options,timeZone:'UTC'}).format(date):value;}
export type DateInputFormat='native'|'yyyy-MM-dd'|'yyyy/MM/dd'|'dd/MM/yyyy'|'MM/dd/yyyy';
export function formatCivilInput(value:string|null,format:DateInputFormat):string{if(!value||!civilDate(value))return '';const [year,month,day]=value.split('-');return format==='yyyy/MM/dd'?year+'/'+month+'/'+day:format==='dd/MM/yyyy'?day+'/'+month+'/'+year:format==='MM/dd/yyyy'?month+'/'+day+'/'+year:value;}
export function parseCivilInput(value:string,format:DateInputFormat):string|null{
 if(format==='native'||format==='yyyy-MM-dd')return civilDate(value)?value:null;
 const match=/^(\d{2}|\d{4})\/(\d{2})\/(\d{2}|\d{4})$/.exec(value);if(!match)return null;
 const year=format==='yyyy/MM/dd'?match[1]:match[3],month=format==='MM/dd/yyyy'?match[1]:match[2],day=format==='yyyy/MM/dd'?match[3]:format==='dd/MM/yyyy'?match[1]:match[2];
 const iso=year+'-'+month+'-'+day;return civilDate(iso)?iso:null;
}
export function calendarDays(month:string,weekStartsOn:number):{date:string;day:number;inMonth:boolean}[]{
 const first=civilDate(month+'-01');if(!first)return [];
 const offset=(first.getUTCDay()-weekStartsOn+7)%7;
 return Array.from({length:42},(_,index)=>{const date=new Date(first);date.setUTCDate(1-offset+index);if(date.getUTCFullYear()<1||date.getUTCFullYear()>9999)return {date:'',day:0,inMonth:false};const iso=civilISO(date);return {date:iso,day:date.getUTCDate(),inMonth:iso.startsWith(month+'-')};});
}
export function dateRangeError(range:{start:string|null;end:string|null},min:string|null,max:string|null,maxDays:number|null,disabled:((date:string)=>boolean)|null,text:UiMessageText=japaneseText):string|null{
 if(!range.start||!range.end)return text('uiFoundation.dateRangePicker.endpointsRequired');
 if(!civilDate(range.start)||!civilDate(range.end))return text('uiFoundation.dateRangePicker.invalidEndpoint');
 if(range.start>range.end)return text('uiFoundation.dateRangePicker.invalidOrder');
 if(min&&range.start<min||max&&range.end>max)return text('uiFoundation.dateRangePicker.outOfBounds');
 const length=Math.round((civilDate(range.end)!.getTime()-civilDate(range.start)!.getTime())/86400000)+1;
 if(maxDays!==null&&(!Number.isSafeInteger(maxDays)||maxDays<=0||length>maxDays))return text('uiFoundation.dateRangePicker.overDayLimit');
 // Iterate actual civil days; disabled dates within the range cannot be silently included.
 if(disabled)for(let date=range.start;date<=range.end;){if(disabled(date))return text('uiFoundation.dateRangePicker.unavailableDay');const next=addCivilDays(date,1);if(next===date)break;date=next;}
 return null;
}
export function timeSeconds(value:string):number|null{const match=/^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);if(!match)return null;const h=Number(match[1]),m=Number(match[2]),s=Number(match[3]??0);return h<24&&m<60&&s<60?h*3600+m*60+s:null;}
/** A civil local timeline for native datetime-local step arithmetic, not an Instant. */
export function localDateTimeSeconds(value:string):number|null{const [day,time,...extra]=value.split('T');const date=civilDate(day),seconds=time?timeSeconds(time):null;return extra.length||!date||seconds===null?null:date.getTime()/1000+seconds;}
