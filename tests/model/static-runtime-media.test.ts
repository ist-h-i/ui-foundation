import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cropBoundsError,type CropBounds} from '../../templates/angular/media-model.ts';
test('crop coordinates reject missing fields and nonfinite/string values before crop drawing',()=>{
 for(const value of [{x1:0,y1:0,x2:50},null,{},[],{x1:0,y1:0,x2:'50',y2:50},{x1:0,y1:0,x2:NaN,y2:50},{x1:0,y1:0,x2:Infinity,y2:50}])assert.notEqual(cropBoundsError(value as CropBounds,100,100),null);
});
test('valid crop geometry accepts harmless extra business metadata without validating it as a coordinate',()=>{
 assert.equal(cropBoundsError({x1:0,y1:0,x2:50,y2:50,note:'not a style',extra:NaN} as CropBounds,100,100),null);
 assert.notEqual(cropBoundsError({x1:0,y1:0,x2:0,y2:50},100,100),null);
 assert.notEqual(cropBoundsError({x1:-1,y1:0,x2:50,y2:50},100,100),null);
});
