import {test} from 'node:test';
import assert from 'node:assert/strict';
import {schedulerConfigurationProblem,schedulerDays,schedulerEventProblem,schedulerIdentity,schedulerInstant,schedulerLayout,schedulerLocal,schedulerMoveProblem,schedulerNavigate,type SchedulerConfiguration,type SchedulerEvent,type SchedulerMoveDraft} from '../../.ui/generated/angular/scheduler-model';
const resources=[{id:'east',label:'東会議室'},{id:'west',label:'西会議室'},{id:'locked',label:'閉鎖中',disabled:true}];
const base:SchedulerConfiguration={date:'2026-11-01',view:'day',weekStartsOn:1,listDays:31,locale:'ja-JP',timeZone:'America/New_York',dayStart:'00:00',dayEnd:'24:00',resourceFilter:null,showUnassigned:true};
const event:SchedulerEvent={id:'event',title:'会議',start:'2026-11-01T01:30:00-04:00',end:'2026-11-01T01:15:00-05:00',resourceIds:['east']};
const draft:SchedulerMoveDraft={localStart:'2026-03-08T02:30:00',localEnd:'2026-03-08T03:30:00',timeZone:'America/New_York',startDisambiguation:'reject',endDisambiguation:'reject',resourceIds:['east']};
test('offset timestamps distinguish repeated wall times and reject local/invalid input',()=>{const earlier=schedulerInstant('2026-11-01T01:30:00-04:00'),later=schedulerInstant('2026-11-01T01:30:00-05:00');assert.equal(later!-earlier!,3600000);assert.equal(schedulerInstant('2026-11-01T01:30:00'),null);assert.equal(schedulerInstant('2026-02-30T01:30:00Z'),null);assert.equal(schedulerEventProblem(event,resources),null);});
test('named timezone changes civil date and displays actual DST offset',()=>{assert.equal(schedulerLocal(schedulerInstant('2026-11-01T00:30:00+09:00')!,'UTC')?.date,'2026-10-31');const before=schedulerLocal(schedulerInstant(event.start)!,base.timeZone)!,after=schedulerLocal(schedulerInstant(event.end)!,base.timeZone)!;assert.equal(before.time,'01:30:00');assert.equal(after.time,'01:15:00');assert.equal(before.offsetSeconds,-14400);assert.equal(after.offsetSeconds,-18000);});
test('civil view windows, week start and navigation do not inherit browser timezone',()=>{assert.deepEqual(schedulerDays({...base,view:'week'}),['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);assert.equal(schedulerDays({...base,view:'month'}).length,42);assert.equal(schedulerDays({...base,view:'list',listDays:3}).at(-1),'2026-11-03');assert.equal(schedulerNavigate('2026-01-31','month',1,31),'2026-02-28');});
test('exclusive midnight end avoids a phantom next-day appointment',()=>{const span={...event,start:'2026-10-31T23:00:00-04:00',end:'2026-11-01T00:00:00-04:00'};const layout=schedulerLayout([span],resources,{...base,date:'2026-10-31',view:'list',listDays:2});assert.deepEqual(layout.entries[0]?.days,['2026-10-31']);assert.equal(layout.days[1]?.count,0);});
test('calendar placement and continuations represent a multi-day event',()=>{const span={...event,start:'2026-11-01T12:00:00-05:00',end:'2026-11-03T12:00:00-05:00'};const layout=schedulerLayout([span],resources,{...base,view:'month'});assert.deepEqual(layout.entries[0]?.days,['2026-11-01','2026-11-02','2026-11-03']);assert.deepEqual(layout.days.find(day=>day.date==='2026-11-02')?.continuing,['会議']);assert.equal(layout.entries[0]?.column,7);});
test('time band/resource filters do not remove raw or invalid events',()=>{const unknown={...event,id:'unknown',resourceIds:['missing']};const layout=schedulerLayout([event,unknown],resources,{...base,resourceFilter:['west'],dayStart:'09:00',dayEnd:'17:00'});assert.equal(layout.entries.length,2);assert.equal(layout.entries.find(entry=>entry.event.id==='event')?.visible,false);assert.equal(layout.entries.find(entry=>entry.event.id==='unknown')?.visible,true);assert.match(layout.entries.find(entry=>entry.event.id==='unknown')?.problem??'',/未取得/);});
test('DST crossing outside the band is excluded while the raw event is retained',()=>{const layout=schedulerLayout([event],resources,{...base,dayStart:'09:00',dayEnd:'17:00'});assert.equal(layout.entries[0]?.offsetChange,true);assert.equal(layout.entries[0]?.visible,false);assert.deepEqual(layout.entries[0]?.days,[]);assert.equal(layout.entries[0]?.event,event);});
test('fold bands contain both occurrences but do not fill the instant gap between them',()=>{
 const make=(id:string,start:string,end:string):SchedulerEvent=>({...event,id,start,end});
 const events=[make('earlier','2026-11-01T01:25:00-04:00','2026-11-01T01:35:00-04:00'),make('later','2026-11-01T01:25:00-05:00','2026-11-01T01:35:00-05:00'),make('between','2026-11-01T01:45:00-04:00','2026-11-01T01:15:00-05:00'),make('across','2026-11-01T00:50:00-04:00','2026-11-01T02:15:00-05:00'),make('ends-at-start','2026-11-01T01:10:00-05:00','2026-11-01T01:20:00-05:00'),make('starts-at-end','2026-11-01T01:40:00-05:00','2026-11-01T01:50:00-05:00')];
 const layout=schedulerLayout(events,resources,{...base,dayStart:'01:20',dayEnd:'01:40'});
 assert.deepEqual(layout.entries.filter(entry=>entry.visible).map(entry=>entry.event.id).sort(),['across','earlier','later']);
 assert.equal(layout.days[0]?.count,3);
 // This crossing event touches the end of the first occurrence and ends
 // before the start of the second occurrence: neither interval overlaps.
 assert.equal(schedulerLayout([event],resources,{...base,dayStart:'01:20',dayEnd:'01:30'}).entries[0]?.visible,false);
 assert.equal(schedulerLayout([event],resources,{...base,dayStart:'01:10',dayEnd:'01:20'}).entries[0]?.visible,true);
});
test('spring gap has no instants and a band spanning the gap uses only its real edges',()=>{
 const crossing={...event,start:'2026-03-08T01:30:00-05:00',end:'2026-03-08T03:30:00-04:00'};
 const config={...base,date:'2026-03-08'};
 for(const [from,to,visible] of [['02:15','02:45',false],['02:15','03:00',false],['01:45','03:15',true],['02:15','03:15',true],['03:30','03:45',false]] as const){const layout=schedulerLayout([crossing],resources,{...config,dayStart:from,dayEnd:to});assert.equal(layout.entries[0]?.visible,visible,from+'–'+to);assert.deepEqual(layout.entries[0]?.days,visible?['2026-03-08']:[]);}
});
test('non-hour transitions use the named zone rather than an assumed one-hour DST shift',()=>{
 const gap={...event,start:'2026-10-04T01:50:00+10:30',end:'2026-10-04T02:40:00+11:00'};
 const config={...base,date:'2026-10-04',timeZone:'Australia/Lord_Howe'};
 assert.equal(schedulerLayout([gap],resources,{...config,dayStart:'02:05',dayEnd:'02:25'}).entries[0]?.visible,false);
 assert.equal(schedulerLayout([gap],resources,{...config,dayStart:'02:25',dayEnd:'02:35'}).entries[0]?.visible,true);
 const fold={...event,start:'2026-04-05T01:50:00+11:00',end:'2026-04-05T01:40:00+10:30'};
 assert.equal(schedulerLayout([fold],resources,{...config,date:'2026-04-05',dayStart:'01:40',dayEnd:'01:50'}).entries[0]?.visible,false);
 assert.equal(schedulerLayout([fold],resources,{...config,date:'2026-04-05',dayStart:'01:35',dayEnd:'01:45'}).entries[0]?.visible,true);
});
test('a wholly skipped civil day remains an empty day and is not assigned a neighbouring instant',()=>{
 const span={...event,start:'2011-12-29T12:00:00-10:00',end:'2011-12-31T12:00:00+14:00'};
 const config={...base,date:'2011-12-29',view:'list' as const,listDays:3,timeZone:'Pacific/Apia',dayStart:'09:00',dayEnd:'17:00'};
 const layout=schedulerLayout([span],resources,config);
 assert.deepEqual(layout.days.map(day=>day.date),['2011-12-29','2011-12-30','2011-12-31']);
 assert.deepEqual(layout.entries[0]?.days,['2011-12-29','2011-12-31']);
 assert.equal(layout.days[1]?.count,0);
 assert.equal(schedulerLayout([span],resources,{...config,date:'2011-12-30',view:'day'}).entries[0]?.visible,false);
 const january=schedulerLayout([span],resources,{...config,date:'2012-01-31',view:'month'});
 assert.equal(january.entries[0]?.visible,true);assert.deepEqual(january.entries[0]?.days,['2011-12-29','2011-12-31']);
 assert.equal(january.days.find(day=>day.date==='2011-12-30')?.count,0);
 assert.equal(schedulerNavigate('2011-12-30','day',1,3),'2011-12-31');
 assert.equal(schedulerNavigate('2011-12-30','week',1,3),'2012-01-06');
 assert.equal(schedulerNavigate('2011-12-30','month',1,3),'2012-01-30');
});
test('a midnight fold that re-enters the previous civil date is not truncated at first next-day midnight',()=>{
 const crossing={...event,start:'2010-11-07T00:00:30-02:30',end:'2010-11-06T23:01:30-03:30'};
 const config={...base,date:'2010-11-06',view:'list' as const,listDays:2,timeZone:'America/St_Johns'};
 assert.equal(schedulerLocal(schedulerInstant(crossing.start)!,config.timeZone)?.date,'2010-11-07');
 assert.equal(schedulerLocal(schedulerInstant(crossing.end)!,config.timeZone)?.date,'2010-11-06');
 assert.deepEqual(schedulerLayout([crossing],resources,config).entries[0]?.days,['2010-11-06','2010-11-07']);
 assert.deepEqual(schedulerLayout([crossing],resources,{...config,dayStart:'23:00',dayEnd:'24:00'}).entries[0]?.days,['2010-11-06']);
});
test('time bands and event ends have strict millisecond half-open boundaries',()=>{
 const config={...base,timeZone:'UTC',dayStart:'09:00:00',dayEnd:'10:00:00'};
 for(const [start,end,visible] of [['08:59:59.999','09:00:00.000',false],['08:59:59.999','09:00:00.001',true],['09:59:59.999','10:00:00.000',true],['10:00:00.000','10:00:00.001',false]] as const){const appointment={...event,start:base.date+'T'+start+'Z',end:base.date+'T'+end+'Z'};assert.equal(schedulerLayout([appointment],resources,config).entries[0]?.visible,visible,start+'–'+end);}
});
test('display zone controls the band and equal endpoint offsets do not hide internal transitions',()=>{
 assert.equal(schedulerLayout([event],resources,{...base,dayStart:'01:20',dayEnd:'01:40'}).entries[0]?.visible,true);
 assert.equal(schedulerLayout([event],resources,{...base,timeZone:'Asia/Tokyo',dayStart:'01:20',dayEnd:'01:40'}).entries[0]?.visible,false);
 assert.equal(schedulerLayout([event],resources,{...base,timeZone:'Asia/Tokyo',dayStart:'14:20',dayEnd:'14:40'}).entries[0]?.visible,true);
 const span={...event,start:'2026-01-01T00:00:00-05:00',end:'2027-01-01T00:00:00-05:00'};
 const entry=schedulerLayout([span],resources,{...base,dayStart:'01:20',dayEnd:'01:40'}).entries[0]!;
 assert.equal(entry.offsetChange,false);assert.equal(entry.visible,true);assert.deepEqual(entry.days,['2026-11-01']);
});
test('supported civil-year boundaries do not clamp the time band into the wrong day',()=>{
 for(const date of ['0001-01-01','9999-12-31']){const appointment={...event,start:date+'T09:00:00Z',end:date+'T10:00:00Z'};const layout=schedulerLayout([appointment],resources,{...base,date,timeZone:'UTC',dayStart:'09:00',dayEnd:'10:00'});assert.equal(layout.problem,null);assert.deepEqual(layout.entries[0]?.days,[date]);assert.equal(layout.entries[0]?.visible,true);}
});
test('move proposals keep spring gap and backwards fold times for app interpretation',()=>{assert.equal(schedulerMoveProblem(event,draft,resources),null);const fold={...draft,localStart:'2026-11-01T01:30:00',localEnd:'2026-11-01T01:15:00',startDisambiguation:'earlier' as const,endDisambiguation:'later' as const};assert.equal(schedulerMoveProblem(event,fold,resources),null);assert.equal(fold.localEnd,'2026-11-01T01:15:00');assert.match(schedulerMoveProblem(event,{...draft,timeZone:'Missing/Zone'},resources)??'',/タイムゾーン/);assert.match(schedulerMoveProblem(event,{...draft,resourceIds:['locked']},resources)??'',/リソース/);});
test('malformed configuration and identities are explicit failures',()=>{assert.match(schedulerConfigurationProblem({...base,dayStart:'17:00',dayEnd:'09:00'})??'',/時間帯/);assert.deepEqual(schedulerDays({...base,timeZone:'Missing/Zone'}),[]);assert.throws(()=>schedulerIdentity([event,event],resources),/unique stable/);assert.throws(()=>schedulerIdentity([event],[resources[0]!,resources[0]!]),/unique resource/);});
