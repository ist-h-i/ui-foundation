import {uiMessageText as createUiMessageText, type UiMessageText} from './stable-messages';
const japaneseText = createUiMessageText(() => 'ja-JP');
export interface TimelineDateTime{iso:string|null;text:string;missing:boolean;problem:string|null;}
export interface TimelineType{rawValue:unknown;text:string;missing:boolean;problem:string|null;}
/** A malformed kind is not missing. Keep the application-supplied value intact. */
export function timelineType(value:unknown, text: UiMessageText = japaneseText):TimelineType{
 if(value===null||value===undefined)return {rawValue:value,text:text("uiFoundation.timeline.theTypeHasNotBeenLoaded"),missing:true,problem:null};
 if(typeof value==='string'&&value.trim())return {rawValue:value,text:value,missing:false,problem:null};
 return {rawValue:value,text:text("uiFoundation.timeline.checkTheTypeValue"),missing:false,problem:text("uiFoundation.timeline.provideADescriptiveStringForTheTypeThe")};
}
export const timelineDefaultDateOptions:Intl.DateTimeFormatOptions={dateStyle:'medium',timeStyle:'short'};
export function timelineConfigurationProblem(locale:string,timeZone:string,options:Intl.DateTimeFormatOptions=timelineDefaultDateOptions, text: UiMessageText = japaneseText):string|null{
 if(!locale.trim()||!timeZone.trim())return text("uiFoundation.timeline.specifyTheDateAndTimeLocaleAndTime");
 try{new Intl.DateTimeFormat(locale,{...options,timeZone}).format(0);}catch{return text("uiFoundation.timeline.checkTheDateAndTimeLocaleTimeZone");}return null;
}
/** ISO offset timestamps, finite epoch milliseconds or valid Date; no local-time guessing. */
export function timelineDateTime(value:unknown,locale:string,timeZone:string,options:Intl.DateTimeFormatOptions=timelineDefaultDateOptions, text: UiMessageText = japaneseText):TimelineDateTime{
 const configuration=timelineConfigurationProblem(locale,timeZone,options, text);if(configuration)return {iso:null,text:text("uiFoundation.timeline.couldNotDisplayTheDateAndTime"),missing:false,problem:configuration};
 if(value===null||value===undefined)return {iso:null,text:text("uiFoundation.timeline.theDateAndTimeHaveNotBeenLoaded"),missing:true,problem:null};
 let timestamp:number;
 if(typeof value==='number')timestamp=value;
 else if(value instanceof Date)timestamp=value.getTime();
 else if(typeof value==='string'){
  const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if(!match)return {iso:null,text:text("uiFoundation.timeline.checkTheDateAndTimeValue"),missing:false,problem:text("uiFoundation.timeline.useAnIsoDateTimeStringWithA")};
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]),hour=Number(match[4]),minute=Number(match[5]),second=Number(match[6]??0),offset=match[7];
  const leap=year%4===0&&(year%100!==0||year%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  if(month<1||month>12||day<1||day>days[month-1]||hour>23||minute>59||second>59||offset!=='Z'&&(Number(offset.slice(1,3))>23||Number(offset.slice(4))>59))return {iso:null,text:text("uiFoundation.timeline.checkTheDateAndTimeValue"),missing:false,problem:text("uiFoundation.timeline.checkTheCalendarDateTimeAndOffset")};
  timestamp=Date.parse(value);
 }else timestamp=NaN;
 const date=new Date(timestamp);
 if(!Number.isFinite(timestamp)||!Number.isFinite(date.getTime()))return {iso:null,text:text("uiFoundation.timeline.checkTheDateAndTimeValue"),missing:false,problem:text("uiFoundation.timeline.provideAValidDateAndTimeTheOriginal")};
 return {iso:date.toISOString(),text:new Intl.DateTimeFormat(locale,{...options,timeZone}).format(date),missing:false,problem:null};
}
