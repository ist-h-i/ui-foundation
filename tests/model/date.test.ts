import assert from 'node:assert/strict';
import {test} from 'node:test';
import {civilDate,civilISO,localCivilISO,addCivilDays,shiftCivilMonth,calendarDays,dateRangeError,timeSeconds,parseCivilInput,formatCivilInput,localDateTimeSeconds} from '../../templates/angular/date-model.ts';
test('local calendar defaults snapshot local fields and reject invalid or unsupported years',()=>{
 const local=new Date(0);local.setFullYear(99,1,28);local.setHours(23,30,0,0);
 assert.equal(localCivilISO(local),'0099-02-28');
 assert.throws(()=>localCivilISO(new Date(NaN)),RangeError);
 local.setFullYear(0);assert.throws(()=>localCivilISO(local),RangeError);
 local.setFullYear(10000);assert.throws(()=>localCivilISO(local),RangeError);
});
test('civil dates reject normalization and retain years/leap days across month/year shifts',()=>{
 assert.equal(civilDate('2025-02-29'),null);assert.equal(civilDate('2024-02-29')?.getUTCDate(),29);assert.equal(civilDate('0000-01-01'),null);
 assert.equal(civilISO(civilDate('0099-01-01')!),'0099-01-01');assert.equal(shiftCivilMonth('2024-01-31',1),'2024-02-29');assert.equal(shiftCivilMonth('2024-02-29',12),'2025-02-28');
 assert.equal(addCivilDays('2026-12-31',1),'2027-01-01');assert.equal(addCivilDays('9999-12-31',1),'9999-12-31');
});
test('calendar week starts and dates do not drift at daylight-saving boundaries',()=>{
 assert.equal(calendarDays('2026-03',0)[0]?.date,'2026-03-01');assert.equal(calendarDays('2026-03',1)[0]?.date,'2026-02-23');
 assert.equal(addCivilDays('2026-03-08',1),'2026-03-09');assert.equal(addCivilDays('2026-11-01',1),'2026-11-02');assert.equal(calendarDays('2026-10',1).length,42);
});
test('range validation checks order, inclusive limits and disabled interior dates',()=>{
 const range={start:'2026-10-01',end:'2026-10-05'};
 assert.equal(dateRangeError(range,null,null,5,()=>false),null);assert.match(dateRangeError(range,null,null,4,()=>false)!,/上限/);
 assert.match(dateRangeError(range,null,null,null,date=>date==='2026-10-03')!,/選択できない/);
 assert.match(dateRangeError({...range,end:'2026-09-01'},null,null,null,()=>false)!,/開始日以降/);
 assert.equal(timeSeconds('23:59:59'),86399);assert.equal(timeSeconds('24:00'),null);
});
test('explicit edit formats parse without ambiguous locale guessing',()=>{
 assert.equal(parseCivilInput('31/01/2026','dd/MM/yyyy'),'2026-01-31');assert.equal(parseCivilInput('01/31/2026','MM/dd/yyyy'),'2026-01-31');
 assert.equal(parseCivilInput('2026/02/31','yyyy/MM/dd'),null);assert.equal(formatCivilInput('2026-10-05','yyyy/MM/dd'),'2026/10/05');assert.equal(parseCivilInput('01/02/2026','dd/MM/yyyy'),'2026-02-01');
});
test('local datetime step arithmetic includes the civil date without timezone/DST conversion',()=>{
 assert.equal(localDateTimeSeconds('1970-01-01T00:00'),0);assert.equal(localDateTimeSeconds('2026-02-30T09:00'),null);
 assert.equal(localDateTimeSeconds('2026-03-09T09:00')!-localDateTimeSeconds('2026-03-08T09:00')!,86400);
 assert.equal(localDateTimeSeconds('2026-10-05T09:25')!-localDateTimeSeconds('2026-10-05T09:10')!,900);
 assert.equal(localDateTimeSeconds('2026-10-06T09:25')!-localDateTimeSeconds('2026-10-05T09:10')!,87300);
});
