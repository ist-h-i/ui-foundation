import assert from 'node:assert/strict';
import {test} from 'node:test';
import {progressValue} from '../../templates/angular/feedback-model.ts';
test('progress keeps finite bounded values and preserves an explicit unknown amount',()=>{
 for(const total of [0.1,1,3,200,1e12])for(const value of [-100,0,0.25,1,120,1e13]){const result=progressValue(value,total);assert.ok(result.value!>=0&&result.value!<=total);assert.ok(result.percent!>=0&&result.percent!<=100);assert.equal(result.total,total);}
 assert.deepEqual(progressValue(null,200),{value:null,total:200,percent:null});assert.deepEqual(progressValue(40,200),{value:40,total:200,percent:20});
});
test('progress refuses malformed total/value rather than displaying NaN or a false completed state',()=>{
 for(const total of [0,-1,NaN,Infinity,-Infinity])assert.throws(()=>progressValue(1,total),/positive finite/);
 for(const value of [NaN,Infinity,-Infinity])assert.throws(()=>progressValue(value,100),/finite value/);
});
