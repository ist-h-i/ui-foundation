import assert from 'node:assert/strict';
import {test} from 'node:test';
import {avatarInitials,codePresentation,comparisonDelta,displayInteger,finiteDisplayValue,formatJSONCode,meterGroupValues,meterValues,numberDisplay} from '../../templates/angular/display-model.ts';

test('display values distinguish missing from zero and reject nonfinite numbers',()=>{
 assert.equal(numberDisplay(null,'ja-JP'),null);assert.equal(numberDisplay(0,'ja-JP'),'0');assert.equal(numberDisplay(1250.5,'de-DE'),'1.250,5');
 for(const value of [NaN,Infinity,-Infinity])assert.throws(()=>finiteDisplayValue(value),RangeError);
 assert.equal(displayInteger(Number.MAX_SAFE_INTEGER,'count',0,Number.MAX_SAFE_INTEGER),Number.MAX_SAFE_INTEGER);
 for(const value of [-1,1.5,NaN,Infinity])assert.throws(()=>displayInteger(value,'count'),RangeError);
});
test('comparison preserves direction and leaves missing or zero-baseline percentage undefined',()=>{
 assert.equal(comparisonDelta(1250,1000,'absolute'),250);assert.equal(comparisonDelta(1250,1000,'percent'),.25);
 assert.equal(comparisonDelta(-50,-100,'percent'),.5);assert.equal(comparisonDelta(0,100,'percent'),-1);
 assert.equal(comparisonDelta(0,0,'percent'),null);assert.equal(comparisonDelta(null,0,'absolute'),null);
 assert.equal(comparisonDelta(1,null,'absolute'),null);assert.equal(comparisonDelta(Number.MAX_VALUE,-Number.MAX_VALUE,'absolute'),null);
 assert.throws(()=>comparisonDelta(Infinity,0,'absolute'),RangeError);
});
test('avatar initials retain whole graphemes and first/last names',()=>{
 assert.equal(avatarInitials(' 山田 太郎 '),'山太');assert.equal(avatarInitials('Ada Middle Lovelace','en-US'),'AL');
 assert.equal(avatarInitials('👩🏽‍💻💼担当'),'👩🏽‍💻💼');assert.equal(avatarInitials('e\u0301ric','en-US'),'E\u0301R');assert.equal(avatarInitials('   '),'?');
});
test('meter validates the known scalar range and threshold order without claiming progress',()=>{
 assert.deepEqual(meterValues(null,-100,100,-20,80,50),{value:null,min:-100,max:100,low:-20,high:80,optimum:50});
 assert.equal(meterValues(0,0,100).value,0);
 for(const values of [[0,0,0],[1,2,1],[-1,0,100],[101,0,100],[NaN,0,100]] as const)assert.throws(()=>meterValues(values[0],values[1],values[2]),RangeError);
 assert.throws(()=>meterValues(50,0,100,80,20),RangeError);assert.throws(()=>meterValues(50,0,100,0,100,101),RangeError);
});
test('meter groups keep unknown segments separate and reject overflow and duplicate IDs',()=>{
 const items=[{id:'a',label:'使用',value:30},{id:'b',label:'未取得',value:null},{id:'c',label:'予約',value:20}];
 assert.deepEqual(meterGroupValues(items,100),{sum:50,unknown:1});assert.deepEqual(meterGroupValues([],100),{sum:0,unknown:0});
 assert.throws(()=>meterGroupValues([...items,{id:'d',label:'超過',value:60}],100),RangeError);
 assert.throws(()=>meterGroupValues([...items,items[0]!],100),/unique/);assert.throws(()=>meterGroupValues(items,0),RangeError);
});
test('JSON formatting preserves duplicate keys, raw number tokens, escapes and safe string content',()=>{
 const source=' {"value":-0,"value":1e999,"small":1.20e-5,"text":"<script>unsafe</script>\\n\\u3042\\\"","empty":[],"object":{},"literal":null} ';
 const formatted=formatJSONCode(source);assert.ok(formatted.includes('"value": -0,\n  "value": 1e999'));assert.ok(formatted.includes('1.20e-5'));
 assert.ok(formatted.includes('<script>unsafe</script>\\n\\u3042\\\"'));assert.ok(formatted.includes('"empty": []'));assert.deepEqual(JSON.parse(formatted),JSON.parse(source));
 assert.equal(formatJSONCode('false'),'false');assert.equal(formatJSONCode('0'),'0');assert.equal(formatJSONCode('"a:b,{[]}"'),'"a:b,{[]}"');
 assert.throws(()=>formatJSONCode('{bad}'),SyntaxError);assert.throws(()=>formatJSONCode('{}',9),RangeError);
});
test('decimal meter sums tolerate final rounding and still reject a meaningful overflow',()=>{
 const items=[{id:'a',label:'A',value:.1},{id:'b',label:'B',value:.2}];assert.deepEqual(meterGroupValues(items,.3),{sum:.3,unknown:0});
 assert.throws(()=>meterGroupValues([items[0],{...items[1],value:.200000000001}],.3),RangeError);
 const many=Array.from({length:10000},(_,index)=>({id:String(index),label:'区分 '+index,value:.0001}));assert.equal(meterGroupValues(many,1).sum,1);
 assert.throws(()=>meterGroupValues([{id:'a',label:'A',value:Number.MIN_VALUE},{id:'b',label:'B',value:Number.MIN_VALUE}],Number.MIN_VALUE),RangeError);
});
test('format errors retain the original and custom formatters return actual text',()=>{
 assert.deepEqual(codePresentation('{bad}','json','json'),{text:'{bad}',error:'整形できませんでした。原文を表示しています。'});
 assert.deepEqual(codePresentation('<b>x</b>','html','preserve'),{text:'<b>x</b>',error:null});
 assert.deepEqual(codePresentation(' x ','text','preserve',2,(source,language)=>language+':'+source.trim()),{text:'text:x',error:null});
 assert.deepEqual(codePresentation('draft','text','preserve',2,()=>{throw new Error('external formatter');}),{text:'draft',error:'整形できませんでした。原文を表示しています。'});
});
