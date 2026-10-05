import assert from 'node:assert/strict';
import {test} from 'node:test';
import {formatColor,numberDomain,numericRangeError,numericValueError,parseColor,snapNumber} from '../../templates/angular/choice-model.ts';
test('numeric snapping is anchored to min, respects bounds and keeps decimal endpoints',()=>{
 const domain={min:-.3,max:.3,step:.1};assert.equal(snapNumber(9,domain),.3);assert.equal(snapNumber(-9,domain),-.3);assert.equal(snapNumber(.16,domain),.2);assert.equal(numericValueError(.3,domain),null);assert.equal(numericValueError(.15,domain),'0.1 刻みで指定してください。');assert.equal(snapNumber(10,{min:0,max:10,step:3}),9);
});
test('unrepresentable, degenerate and nonfinite domains fail before a control is rendered',()=>{
 for(const domain of [{min:0,max:0,step:1},{min:1,max:0,step:1},{min:0,max:1,step:0},{min:0,max:Infinity,step:1},{min:1e20,max:1e21,step:1},{min:-1e308,max:1e308,step:1}])assert.throws(()=>numberDomain(domain));assert.throws(()=>snapNumber(NaN,{min:0,max:100,step:1}));
});
test('ranges preserve invalid app data for validation and reject reversed or off-step endpoints',()=>{
 const domain={min:0,max:10,step:.5};assert.equal(numericRangeError({start:1.5,end:10},domain),null);assert.match(numericRangeError({start:5,end:2},domain)!,/開始値/);assert.match(numericRangeError({start:.2,end:2},domain)!,/刻み/);assert.match(numericRangeError(null,domain)!,/開始値/);assert.match(numericRangeError({start:NaN,end:2},domain)!,/数値/);
});
test('hex shorthand and full alpha parse into exact byte data',()=>{
 assert.deepEqual(parseColor('#abc'),{red:170,green:187,blue:204,alpha:1});assert.deepEqual(parseColor('#1234'),{red:17,green:34,blue:51,alpha:68/255});assert.deepEqual(parseColor('#ABCDEF80'),{red:171,green:205,blue:239,alpha:128/255});assert.equal(formatColor({red:255,green:0,blue:0,alpha:.5},'hex'),'#ff000080');
});
test('RGB accepts byte/percentage channels and explicit alpha in comma or space syntax',()=>{
 assert.deepEqual(parseColor('rgb(255, 128, 0)'),{red:255,green:128,blue:0,alpha:1});assert.deepEqual(parseColor('rgb(100% 50% 0% / 25%)'),{red:255,green:128,blue:0,alpha:.25});assert.deepEqual(parseColor('rgba(10, 20, 30, .5)'),{red:10,green:20,blue:30,alpha:.5});
});
test('HSL supports hue units, wraps angles and preserves alpha',()=>{
 for(const source of ['hsl(120, 100%, 50%)','hsl(-240deg 100% 50%)','hsl(.333333333turn 100% 50%)'])assert.deepEqual(parseColor(source),{red:0,green:255,blue:0,alpha:1});assert.deepEqual(parseColor('hsla(240,100%,50%,.25)'),{red:0,green:0,blue:255,alpha:.25});assert.deepEqual(parseColor('hsl(0 0% 50%)'),{red:128,green:128,blue:128,alpha:1});
});
test('invalid CSS colour tokens, bounds and malformed separators are rejected',()=>{
 for(const source of ['','red','var(--secret)','#ab','#abcde','#123456789','rgb(256,0,0)','rgb(-1,0,0)','rgb(1,,2,3)','rgb(1,2 3)','rgba(1,2,3,2)','rgb(1,2,3 / .5)','hsl(1, 120%, 50%)','hsl(1 50 50)','rgb(NaN 1 2)'])assert.equal(parseColor(source),null,source);
});
test('all colour formats round-trip byte channels and bounded alpha',()=>{
 for(const color of [{red:0,green:0,blue:0,alpha:1},{red:255,green:255,blue:255,alpha:1},{red:123,green:45,blue:210,alpha:.37},{red:255,green:0,blue:128,alpha:0}])for(const format of ['hex','rgb','hsl'] as const){const result=parseColor(formatColor(color,format))!;assert.ok(result);assert.deepEqual([result.red,result.green,result.blue],[color.red,color.green,color.blue]);assert.ok(Math.abs(result.alpha-color.alpha)<=1/255);}
 assert.throws(()=>formatColor({red:256,green:0,blue:0,alpha:1},'hex'));assert.throws(()=>formatColor({red:255,green:0,blue:0,alpha:2},'hsl'));
});

test('snapping never exceeds exact fractional bounds and unsafe step counts fail explicitly',()=>{
 const domain={min:0,max:.29999999999,step:.1},value=snapNumber(10,domain);assert.ok(value<=domain.max);assert.equal(numericValueError(value,domain),null);assert.throws(()=>numberDomain({min:0,max:1e20,step:1}));assert.throws(()=>formatColor({red:0,green:0,blue:0,alpha:1},'unsupported' as any));
});
