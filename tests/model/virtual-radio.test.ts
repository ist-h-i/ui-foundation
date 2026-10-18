import assert from 'node:assert/strict';
import {test} from 'node:test';
import {nativeRadioTabProfile,virtualRadioProblem,type VirtualRadioGroup} from '../../templates/angular/virtual-radio.ts';
const group:VirtualRadioGroup={name:'decision',value:'yes',members:[{key:0,value:'yes'},{key:499,value:'no'}]};
test('virtual radio accepts a canonical selection including hidden or disabled members without clearing it',()=>{
 for(const value of ['yes','no',null])assert.equal(virtualRadioProblem([{...group,value,members:group.members.map(member=>({...member,disabled:true,hidden:true}))}],[0,499]),null);
});
test('virtual radio rejects stale members and selected values instead of inventing a replacement',()=>{
 assert.ok(virtualRadioProblem([group],[499]));assert.ok(virtualRadioProblem([{...group,value:'gone'}],[0,499]));assert.equal(group.value,'yes');
});
test('virtual radio distinguishes form owners and rejects two descriptions of the same inherited native group',()=>{
 assert.equal(virtualRadioProblem([{...group,form:'a'},{...group,form:'b'}],[0,499]),null);
 assert.ok(virtualRadioProblem([group,{...group,form:'a'}],[0,499],'a'));assert.ok(virtualRadioProblem([group,group],[0,499]));
});
test('virtual radio rejects duplicate native values while allowing multiple options within one row',()=>{
 assert.ok(virtualRadioProblem([{...group,members:[group.members[0]!,group.members[0]!]}],[0,499]));
 assert.equal(virtualRadioProblem([{...group,members:[{key:0,value:'yes'},{key:0,value:'no'}]}],[0]),null);
});
test('virtual radio validates runtime configuration and accepts an empty native value',()=>{
 assert.equal(virtualRadioProblem([],[]),null);assert.ok(virtualRadioProblem(null as unknown as VirtualRadioGroup[],[]));
 assert.ok(virtualRadioProblem([{...group,name:''}],[0,499]));assert.ok(virtualRadioProblem([{...group,form:''}],[0,499]));
 assert.equal(virtualRadioProblem([{name:'g',value:'',members:[{key:0,value:''}]}],[0]),null);
});


test('native Tab profiles distinguish Firefox and WebKit from Chromium WebKit tokens',()=>{
 assert.equal(nativeRadioTabProfile('Mozilla/5.0 AppleWebKit/537.36 Chrome/153.0.0.0 Safari/537.36'),'chromium');
 assert.equal(nativeRadioTabProfile('Mozilla/5.0 Gecko/20100101 Firefox/155.0'),'firefox');
 assert.equal(nativeRadioTabProfile('Mozilla/5.0 AppleWebKit/605.1.15 Version/26.6 Safari/605.1.15'),'webkit');
 assert.equal(nativeRadioTabProfile('unknown engine'),'chromium');
});
