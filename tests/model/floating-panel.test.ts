import assert from 'node:assert/strict';
import test from 'node:test';
import { sheetStages, popupDelay, panelSize } from '../../templates/angular/floating-model.ts';

test('sheet stages retain exact positive ascending ratios and validate index',()=>{
 const stages=[.25,.6,1] as const;
 assert.equal(sheetStages(stages,1),.6);
 for(const values of [[],[0],[1.01],[.6,.4],[.5,.5],[NaN],[Infinity]]) assert.throws(()=>sheetStages(values,0));
 for(const index of [-1,.5,3,NaN]) assert.throws(()=>sheetStages(stages,index));
 assert.deepEqual(stages,[.25,.6,1]);
});
test('popup delays are finite nonnegative milliseconds within the native timer range',()=>{
 assert.equal(popupDelay(0),0);assert.equal(popupDelay(250.5),250.5);
 for(const value of [-1,NaN,Infinity,2**31]) assert.throws(()=>popupDelay(value));
});
test('panel explicit pixel sizes reject zero, nonfinite and negative dimensions',()=>{
 assert.equal(panelSize(null),null);assert.equal(panelSize(120.5),120.5);
 for(const value of [0,-1,NaN,Infinity]) assert.throws(()=>panelSize(value));
});
