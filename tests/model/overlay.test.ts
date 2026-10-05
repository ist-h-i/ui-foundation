import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PausableDeadline,validateNotification,notificationKey} from '../../templates/angular/notification-model.js';
import {menuCommands,menuPath,selectMenuCheck,validateMenu,type MenuItem} from '../../templates/angular/menu-model.js';

class Clock {
 nowValue=0;next=0;events=new Map<number,{at:number;callback:()=>void}>();
 now=()=>this.nowValue;
 set=(callback:()=>void,ms:number)=>{const id=++this.next;this.events.set(id,{at:this.nowValue+ms,callback});return id;};
 clear=(handle:unknown)=>{this.events.delete(handle as number);};
 advance(ms:number):void{const end=this.nowValue+ms;while(true){const event=[...this.events].sort((a,b)=>a[1].at-b[1].at)[0];if(!event||event[1].at>end)break;this.nowValue=event[1].at;this.events.delete(event[0]);event[1].callback();}this.nowValue=end;}
}
test('five seconds expire exactly; overlapping pauses preserve remaining time',()=>{
 const clock=new Clock();let elapsed=0;const timer=new PausableDeadline(5000,()=>elapsed++,clock);
 clock.advance(2000);timer.pause('hover');timer.pause('focus');clock.advance(10000);timer.resume('hover');clock.advance(10000);assert.equal(elapsed,0);
 timer.resume('focus');clock.advance(2999);assert.equal(elapsed,0);clock.advance(1);assert.equal(elapsed,1);clock.advance(10000);assert.equal(elapsed,1);
});
test('cancel and duplicate pause/resume do not restart, expire or leak timers',()=>{
 const clock=new Clock();let elapsed=0;const timer=new PausableDeadline(5000,()=>elapsed++,clock);
 clock.advance(2000);timer.pause('same');timer.pause('same');timer.resume('same');timer.resume('same');clock.advance(2999);assert.equal(elapsed,0);timer.cancel();clock.advance(10000);assert.equal(elapsed,0);assert.equal(clock.events.size,0);
});
test('durations exceeding browser timeout limit use chunks',()=>{
 const clock=new Clock();let elapsed=0;new PausableDeadline(2147483648,()=>elapsed++,clock);clock.advance(2147483647);assert.equal(elapsed,0);clock.advance(1);assert.equal(elapsed,1);
});
test('ON requires positive seconds; OFF ignores seconds, including NaN',()=>{
 for(const durationSeconds of [0,-1,NaN,Infinity])assert.throws(()=>validateNotification({message:'記録しました',durationSeconds}));
 for(const durationSeconds of [0,-1,NaN,Infinity])validateNotification({message:'保持します',autoDismiss:false,durationSeconds});
 validateNotification({message:'既定の5秒'});assert.throws(()=>validateNotification({message:' '}));
 assert.equal(notificationKey({message:'同じ',severity:'info'}),notificationKey({message:'同じ'}));assert.notEqual(notificationKey({message:'同じ',position:'top-end'}),notificationKey({message:'同じ'}));
});
test('menus retain hidden data while navigation omits hidden groups and separators',()=>{
 const items:MenuItem[]=[{id:'group',type:'group',label:'表示',children:[{id:'one',label:'一'},{id:'hidden',label:'非表示',visible:false}]},{id:'separator',type:'separator'},{id:'disabled',label:'無効',disabled:true}];
 assert.equal(validateMenu(items),items);assert.deepEqual(menuCommands(items).map(item=>item.id),['one','disabled']);assert.deepEqual(menuPath(items,'one'),['group','one']);
 assert.throws(()=>validateMenu([{id:'dup',label:'一'},{id:'dup',label:'二'}]));const cyclic:MenuItem={id:'cycle',label:'循環'};cyclic.children=[cyclic];assert.throws(()=>validateMenu([cyclic]),/cycles/);
});
test('checkbox and radio update immutable data and isolate scopes',()=>{
 const items:MenuItem[]=[{id:'check',label:'チェック',type:'checkbox'},{id:'a',label:'A',type:'radio',checked:true},{id:'b',label:'B',type:'radio'},{id:'branch',label:'階層',children:[{id:'c',label:'C',type:'radio',checked:true}]}];
 const checked=selectMenuCheck(items,items[0]!);assert.equal(checked[0]?.checked,true);assert.equal(items[0]?.checked,undefined);
 const radios=selectMenuCheck(checked,items[2]!);assert.equal(radios[1]?.checked,false);assert.equal(radios[2]?.checked,true);assert.equal(radios[3]?.children?.[0]?.checked,true);
});
