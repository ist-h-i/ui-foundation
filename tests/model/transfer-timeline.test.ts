import assert from 'node:assert/strict';
import {test} from 'node:test';
import {transferBatch,transferSelectionProblem,reorderTransfer,transferStructureProblem,type TransferOptions} from '../../templates/angular/transfer-model.ts';
import {timelineDateTime,timelineConfigurationProblem,timelineType} from '../../templates/angular/timeline-model.ts';

const rows=[{id:1,label:'一'},{id:2,label:'二'},{id:3,label:'非表示',hidden:true},{id:4,label:'無効',disabled:true},{id:5,label:'五'}];
const options:TransferOptions<typeof rows[number]>={items:rows,key:row=>row.id,label:row=>row.label,disabled:row=>!!row.disabled,hidden:row=>!!row.hidden};
test('restored values are not sanitized; malformed, duplicate and unknown keys are explicit',()=>{
 for(const value of [['1'],[1,1],[1,99],[1,NaN],[1,{}],42]){
  assert.ok(transferStructureProblem(options,value));
  assert.equal(transferBatch(options,value as any,[5],'target').value,value);
 }
 assert.equal(transferSelectionProblem(options,[3,4],false,null),null);
 assert.equal(transferSelectionProblem(options,null,false,null),null);
 assert.ok(transferSelectionProblem(options,null,true,null));
});
test('batch additions are atomic; hidden and disabled values and input order remain',()=>{
 const original=[3,4];
 assert.equal(transferBatch(options,original,[1,2],'target',3).value,original);
 assert.deepEqual(transferBatch(options,original,[2,1],'target',4).value,[3,4,2,1]);
 assert.equal(transferBatch(options,original,[5,1,1],'target').value,original);
 assert.equal(transferBatch(options,original,[3],'source').value,original);
 assert.equal(transferBatch(options,original,[4],'source').value,original);
 assert.equal(transferBatch(options,original,[1,4],'target').value,original);
 assert.deepEqual(original,[3,4]);
});
test('removal can repair over-limit selections; required validation does not freeze edits',()=>{
 assert.ok(transferSelectionProblem(options,[1,2,3,4,5],false,1));
 assert.deepEqual(transferBatch(options,[1,2,3,4,5],[1,2],'source',1).value,[3,4,5]);
 assert.deepEqual(transferBatch(options,[1],[1],'source',1).value,[]);
});
test('application policies see batch snapshots and fail closed on exceptions or non-true answers',()=>{
 let calls=0;
 const old=[3,4];
 const result=transferBatch(options,old,[2,1],'target',null,change=>{calls++;assert.deepEqual(change.previousValue,old);assert.deepEqual(change.keys,[2,1]);assert.equal(change.reason,'keyboard');return false;},'keyboard');
 assert.equal(result.value,old);assert.equal(calls,1);
 assert.equal(transferBatch(options,old,[1],'target',null,()=>{throw new Error('private domain detail');}).value,old);
 assert.equal(transferBatch(options,old,[1],'target',null,()=>undefined as any).value,old);
 assert.ok(transferBatch(options,old,[1],'target',null,()=>{throw new Error('private domain detail');}).problem);
});
test('filtered reorder resolves keys to canonical positions and preserves invisible values',()=>{
 const old=[1,3,2,4,5];
 assert.deepEqual(reorderTransfer(options,old,1,2).value,[3,2,1,4,5]);
 assert.equal(reorderTransfer(options,old,4,1).value,old);
 assert.equal(reorderTransfer(options,old,1,99).value,old);
 assert.equal(reorderTransfer(options,old,1,2,()=>{throw new Error();}).value,old);
 const reordered=reorderTransfer(options,old,5,1,move=>move.fromIndex===4&&move.toIndex===0);
 assert.deepEqual(reordered.value,[5,1,3,2,4]);
 assert.deepEqual(old,[1,3,2,4,5]);
});
test('keyed insertion uses canonical anchors rather than filtered indexes',()=>{
 assert.deepEqual(transferBatch(options,[3,4,5],[1],'target',null,null,'pointer',5).value,[3,4,1,5]);
 assert.equal(transferBatch(options,[3,4,5],[1],'target',null,null,'pointer',99).problem!==null,true);
});
test('datetime semantics require explicit offsets, retain missing values and Intl timezone',()=>{
 const tokyo=timelineDateTime('2026-10-06T01:00:00Z','ja-JP','Asia/Tokyo');
 assert.equal(tokyo.iso,'2026-10-06T01:00:00.000Z');assert.match(tokyo.text,/10:00/);assert.equal(tokyo.problem,null);
 assert.match(timelineDateTime('2026-10-06T01:00:00Z','en-US','America/New_York').text,/9:00/);
 assert.equal(timelineDateTime(null,'ja-JP','UTC').missing,true);
 for(const value of ['2026-10-06','2026-10-06T01:00:00','2026-02-31T01:00:00Z','garbage',NaN,Infinity])assert.ok(timelineDateTime(value,'ja-JP','UTC').problem);
 assert.equal(timelineDateTime(0,'ja-JP','UTC').iso,'1970-01-01T00:00:00.000Z');
 assert.ok(timelineConfigurationProblem('bad_locale','UTC'));
 assert.ok(timelineConfigurationProblem('ja-JP','not-a-timezone'));
 assert.equal(timelineConfigurationProblem('ja-JP','UTC'),null);
});
test('timeline kind preserves original values and distinguishes malformed from missing',()=>{
 for(const value of [null,undefined]){const result=timelineType(value);assert.equal(result.rawValue,value);assert.equal(result.missing,true);assert.equal(result.problem,null);}
 const valid='申請受付';assert.deepEqual(timelineType(valid),{rawValue:valid,text:valid,missing:false,problem:null});
 for(const value of ['', ' ',0,42,false,{},[]]){const result=timelineType(value);assert.equal(result.rawValue,value);assert.equal(result.missing,false);assert.ok(result.problem);assert.doesNotMatch(result.text,/未取得/);}
});
