import { uiMessageText, type UiMessageText } from './stable-messages';

const japaneseText = uiMessageText(() => 'ja-JP');
import {addCivilDays,calendarDays,civilDate,civilLabel,localDateTimeSeconds,shiftCivilMonth,timeSeconds} from './date-model';
import {timelineDateTime} from './timeline-model';
import {Temporal} from 'temporal-polyfill';

export type SchedulerView='day'|'week'|'month'|'list';
export interface SchedulerResource {readonly id:string;readonly label:string;readonly disabled?:boolean;}
/** Timed events use offset timestamps; end is exclusive. Civil all-day intervals are separate. */
export interface SchedulerEvent<T=unknown> {readonly id:string;readonly title:string;readonly start:string;readonly end:string;readonly resourceIds?:readonly string[];readonly disabled?:boolean;readonly data?:T;}
export type SchedulerDisambiguation='reject'|'earlier'|'later';
export interface SchedulerMoveDraft {readonly localStart:string;readonly localEnd:string;readonly timeZone:string;readonly startDisambiguation:SchedulerDisambiguation;readonly endDisambiguation:SchedulerDisambiguation;readonly resourceIds:readonly string[];}
export interface SchedulerMoveRequest<T=unknown> {readonly requestId:number;readonly event:SchedulerEvent<T>;readonly previous:{readonly start:string;readonly end:string;readonly resourceIds:readonly string[]};readonly target:SchedulerMoveDraft;}
export interface SchedulerMoveCancellation {readonly requestId:number;readonly eventId:string;readonly reason:'source-change'|'configuration-change'|'reset'|'invalidate'|'destroy';}
export interface SchedulerLocal {readonly date:string;readonly time:string;readonly dateTime:string;readonly offsetSeconds:number;}
export interface SchedulerEntry<T=unknown> {readonly event:SchedulerEvent<T>;readonly visible:boolean;readonly column:number;readonly row:number;readonly startLocal:SchedulerLocal|null;readonly endLocal:SchedulerLocal|null;readonly startText:string;readonly endText:string;readonly resourceText:string;readonly problem:string|null;readonly offsetChange:boolean;readonly days:readonly string[];}
export interface SchedulerDay {readonly date:string;readonly label:string;readonly column:number;readonly row:number;readonly inMonth:boolean;readonly count:number;readonly continuing:readonly string[];}
export interface SchedulerConfiguration {readonly date:string;readonly view:SchedulerView;readonly weekStartsOn:number;readonly listDays:number;readonly locale:string;readonly timeZone:string;readonly dayStart:string;readonly dayEnd:string;readonly resourceFilter:readonly string[]|null;readonly showUnassigned:boolean;readonly civilDateOptions?:Intl.DateTimeFormatOptions;readonly dateTimeOptions?:Intl.DateTimeFormatOptions;}
export function schedulerIdentity<T>(events:readonly SchedulerEvent<T>[],resources:readonly SchedulerResource[]):void {
 const seen=new Set<string>();for(const event of events){if(typeof event.id!=='string'||!event.id.trim()||/\s/.test(event.id)||seen.has(event.id)||typeof event.title!=='string'||!event.title.trim())throw new Error('Scheduler requires unique stable event IDs and descriptive titles.');seen.add(event.id);}
 seen.clear();for(const resource of resources){if(typeof resource.id!=='string'||!resource.id.trim()||/\s/.test(resource.id)||seen.has(resource.id)||!resource.label.trim())throw new Error('Scheduler requires unique resource IDs and labels.');seen.add(resource.id);}
}
export function schedulerInstant(value:string):number|null {if(typeof value!=='string'||!civilDate(value.slice(0,10)))return null;const result=timelineDateTime(value,'en','UTC');return result.iso?Date.parse(result.iso):null;}
export function schedulerLocal(timestamp:number,timeZone:string):SchedulerLocal|null {
 try{const parts=new Intl.DateTimeFormat('en-GB-u-ca-iso8601-nu-latn',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(timestamp);const take=(type:string)=>parts.find(part=>part.type===type)?.value??'';const date=take('year').padStart(4,'0')+'-'+take('month')+'-'+take('day'),time=take('hour')+':'+take('minute')+':'+take('second'),dateTime=date+'T'+time;const local=localDateTimeSeconds(dateTime);return local===null?null:{date,time,dateTime,offsetSeconds:local-Math.floor(timestamp/1000)};}catch{return null;}
}
export function schedulerConfigurationProblem(configuration:SchedulerConfiguration,text:UiMessageText=japaneseText):string|null {
 const {date,view,weekStartsOn,listDays,locale,timeZone,dayStart,dayEnd}=configuration;
 if(!civilDate(date)||!['day','week','month','list'].includes(view)||!Number.isInteger(weekStartsOn)||weekStartsOn<0||weekStartsOn>6||!Number.isInteger(listDays)||listDays<1||listDays>366)return text('uiFoundation.scheduler.invalidViewSettings');
 try{if(!timeZone.trim()||!locale.trim())return text('uiFoundation.scheduler.localeAndZoneRequired');new Intl.DateTimeFormat(locale,{timeZone}).format(0);Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(timeZone);}catch{return text('uiFoundation.scheduler.invalidLocaleOrZone');}
 const start=timeSeconds(dayStart),end=dayEnd==='24:00'?86400:timeSeconds(dayEnd);if(start===null||end===null||start>=end)return text('uiFoundation.scheduler.invalidTimeBand');
 return null;
}
export function schedulerDays(configuration:SchedulerConfiguration):readonly string[] {
 if(schedulerConfigurationProblem(configuration))return [];
 const {date,view,weekStartsOn,listDays}=configuration;if(view==='month')return calendarDays(date.slice(0,7),weekStartsOn).map(item=>item.date).filter(Boolean);
 const start=view==='week'?addCivilDays(date,-((civilDate(date)!.getUTCDay()-weekStartsOn+7)%7)):date,count=view==='day'?1:view==='week'?7:listDays;
 return [...new Set(Array.from({length:count},(_,index)=>addCivilDays(start,index)))];
}
export function schedulerNavigate(date:string,view:SchedulerView,direction:-1|1,listDays:number):string {return view==='month'?shiftCivilMonth(date,direction):addCivilDays(date,direction*(view==='week'?7:view==='list'?listDays:1));}
export function schedulerEventProblem<T>(event:SchedulerEvent<T>,resources:readonly SchedulerResource[],text:UiMessageText=japaneseText):string|null {
 const start=schedulerInstant(event.start),end=schedulerInstant(event.end);if(start===null||end===null)return text('uiFoundation.scheduler.invalidEventTimestamp');
 if(end<=start)return text('uiFoundation.scheduler.invalidEventOrder');
 const ids=event.resourceIds??[];if(new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!resources.some(resource=>resource.id===id)))return text('uiFoundation.scheduler.invalidEventResources');return null;
}
export function schedulerMoveProblem<T>(event:SchedulerEvent<T>,draft:SchedulerMoveDraft,resources:readonly SchedulerResource[],text:UiMessageText=japaneseText):string|null {
 if(event.disabled)return text('uiFoundation.scheduler.eventLocked');const start=localDateTimeSeconds(draft.localStart),end=localDateTimeSeconds(draft.localEnd);if(start===null||end===null)return text('uiFoundation.scheduler.invalidMoveTimestamps');
 try{if(!draft.timeZone.trim())return text('uiFoundation.scheduler.moveZoneRequired');new Intl.DateTimeFormat('en',{timeZone:draft.timeZone}).format(0);}catch{return text('uiFoundation.scheduler.invalidMoveZone');}
 if(!['reject','earlier','later'].includes(draft.startDisambiguation)||!['reject','earlier','later'].includes(draft.endDisambiguation))return text('uiFoundation.scheduler.invalidMoveDisambiguation');
 if(new Set(draft.resourceIds).size!==draft.resourceIds.length||draft.resourceIds.some(id=>!resources.some(resource=>resource.id===id&&!resource.disabled)))return text('uiFoundation.scheduler.invalidMoveResources');
 return null;
}
export function schedulerSnapshot<T>(event:SchedulerEvent<T>):string {return JSON.stringify([event.id,event.title,event.start,event.end,event.resourceIds??[],event.disabled??false]);}
/** All real instant intervals belonging to one civil day's half-open time band. */
function schedulerTimeBand(date:string,timeZone:string,startSeconds:number,endSeconds:number):readonly (readonly [number,number])[] {
 const dayMilliseconds=86400000,midnight=civilDate(date)!.getTime();
 const wallStart=midnight+startSeconds*1000,wallEnd=midnight+endSeconds*1000;
 // Temporal offsets are strictly within +/-24 hours. This bound includes every
 // possible occurrence, even when midnight folds back into the previous day.
 // A pair of resolved midnights would incorrectly truncate that previous day.
 const earliest=wallStart-dayMilliseconds,latest=wallEnd+dayMilliseconds;
 const intervals:(readonly [number,number])[]=[];
 let segment=Temporal.Instant.fromEpochMilliseconds(earliest).toZonedDateTimeISO(timeZone);
 while(segment.epochMilliseconds<latest){
  const transition=segment.getTimeZoneTransition('next');
  const segmentEnd=Math.min(latest,transition?.epochMilliseconds??latest);
  const offset=segment.offsetNanoseconds/1000000;
  const start=Math.max(segment.epochMilliseconds,wallStart-offset),end=Math.min(segmentEnd,wallEnd-offset);
  if(start<end)intervals.push([start,end]);
  if(segmentEnd===latest)break;
  segment=transition!;
 }
 return intervals;
}
/** Date/time formatting is for known instants only; no conversion of local move proposals. */
export function schedulerLayout<T>(events:readonly SchedulerEvent<T>[],resources:readonly SchedulerResource[],configuration:SchedulerConfiguration,translate:UiMessageText=uiMessageText(()=>configuration.locale)):{days:readonly SchedulerDay[];entries:readonly SchedulerEntry<T>[];columns:number;problem:string|null} {
 schedulerIdentity(events,resources);const problem=schedulerConfigurationProblem(configuration,translate),dates=schedulerDays(configuration),columns=configuration.view==='day'||configuration.view==='list'?1:7;
 const startSeconds=timeSeconds(configuration.dayStart)??0,endSeconds=configuration.dayEnd==='24:00'?86400:timeSeconds(configuration.dayEnd)??86400;
 const bands=dates.map(date=>({date,intervals:schedulerTimeBand(date,configuration.timeZone,startSeconds,endSeconds)}));
 const sorted=[...events].sort((a,b)=>(schedulerInstant(a.start)??Infinity)-(schedulerInstant(b.start)??Infinity));
 const entries:SchedulerEntry<T>[]=sorted.map(event=>{const issue=schedulerEventProblem(event,resources,translate),start=schedulerInstant(event.start),end=schedulerInstant(event.end),startLocal=!problem&&start!==null?schedulerLocal(start,configuration.timeZone):null,endLocal=!problem&&end!==null?schedulerLocal(end,configuration.timeZone):null,lastLocal=!problem&&end!==null?schedulerLocal(end-1,configuration.timeZone):null;
  const offsetChange=!!(startLocal&&lastLocal&&startLocal.offsetSeconds!==lastLocal.offsetSeconds),ids=event.resourceIds??[],resourceText=ids.length?new Intl.ListFormat(problem ? 'ja-JP' : configuration.locale).format(ids.map(id=>resources.find(resource=>resource.id===id)?.label??translate('uiFoundation.scheduler.unknownResource',{id}))):translate('uiFoundation.scheduler.unassigned');
  const filtered=configuration.resourceFilter===null||ids.length===0?ids.length!==0||configuration.showUnassigned:ids.some(id=>configuration.resourceFilter!.includes(id));
  const days=start!==null&&end!==null?bands.filter(band=>band.intervals.some(([from,to])=>Math.max(start,from)<Math.min(end,to))).map(band=>band.date):[];
  const visible=!problem&&(!!issue||filtered&&days.length>0),text=(instant:number|null,raw:string)=>!problem&&instant!==null?new Intl.DateTimeFormat(configuration.locale,{...(configuration.dateTimeOptions??{dateStyle:'medium',timeStyle:'long'}),timeZone:configuration.timeZone}).format(instant):raw;
  return {event,visible,column:1,row:1,startLocal,endLocal,startText:text(start,event.start),endText:text(end,event.end),resourceText,problem:issue,offsetChange,days};
 });
 const placed:SchedulerEntry<T>[]=[],days:SchedulerDay[]=[];let groupRow=1;
 for(let group=0;group<dates.length;group+=columns){const block=dates.slice(group,group+columns);let max=0;
  block.forEach((date,index)=>{const primary=entries.filter(entry=>entry.visible&&!entry.problem&&entry.days[0]===date);max=Math.max(max,primary.length);days.push({date,label:civilLabel(date,configuration.locale,configuration.civilDateOptions),column:index+1,row:groupRow,inMonth:date.startsWith(configuration.date.slice(0,7)),count:entries.filter(entry=>entry.visible&&entry.days.includes(date)).length,continuing:entries.filter(entry=>entry.visible&&entry.days.includes(date)&&entry.days[0]!==date).map(entry=>entry.event.title)});primary.forEach((entry,eventIndex)=>placed.push({...entry,column:index+1,row:groupRow+eventIndex+1}));});
  groupRow+=Math.max(1,max)+2;
 }
 let invalidRow=groupRow;for(const entry of entries)if(entry.problem&&entry.visible)placed.push({...entry,column:1,row:invalidRow++});
 const lookup=new Map(placed.map(entry=>[entry.event.id,entry]));return {days,entries:entries.map(entry=>lookup.get(entry.event.id)??entry),columns,problem};
}
