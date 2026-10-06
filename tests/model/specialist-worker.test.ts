/// <reference path="../../templates/angular/formula-parser.d.ts" />
/// <reference lib="dom" />
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SheetFormulaRunner,defaultSheetWorkerTimeouts} from '../../templates/angular/sheet-runner.ts';
import {evaluateSheet} from '../../templates/angular/sheet-formula.ts';
/** Controlled boundary tests prove orchestration; real native worker cases are a separate suite. */
class ControlledWorker {
 static instances:ControlledWorker[]=[];static throwPost=false;static throwConstructor=false;
 onmessage:((event:{data:unknown})=>void)|null=null;onerror:((event:{preventDefault:()=>void})=>void)|null=null;terminated=false;request:any;posts=0;
 constructor(){if(ControlledWorker.throwConstructor)throw new Error('worker construction failure');ControlledWorker.instances.push(this);}
 postMessage(request:unknown):void{this.posts++;this.request=request;if(ControlledWorker.throwPost)throw new Error('clone failure');}
 terminate():void{this.terminated=true;}
 ready(version=1):void{this.onmessage!({data:{type:'sheet-ready',version}});}
 result(sheet:Parameters<typeof evaluateSheet>[0]):void{this.onmessage!({data:{requestId:this.request.requestId,results:evaluateSheet(sheet),error:null}});}
}
const originalWorker=globalThis.Worker;
function install():void{ControlledWorker.instances=[];ControlledWorker.throwPost=false;ControlledWorker.throwConstructor=false;(globalThis as any).Worker=ControlledWorker;}
function restore():void{(globalThis as any).Worker=originalWorker;}
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

test('ready gates computation; cancellation discards old ready/results and accepts actual current parser output',()=>{
 install();const runner=new SheetFormulaRunner(),observed:any[]=[],first={rows:[[1,2,'=SUM(A1:B1)']]},next={rows:[[4,2,'=SUM(A1:B1)']]};
 try{
  runner.calculate(first,'/worker.js',(results,error)=>observed.push({results,error}));const stale=ControlledWorker.instances[0];assert.equal(stale.request,undefined);stale.ready();assert.equal(stale.posts,1);
  runner.calculate(next,'/worker.js',(results,error)=>observed.push({results,error}));const fresh=ControlledWorker.instances[1];assert.equal(stale.terminated,true);stale.ready();stale.result(first);assert.equal(observed.length,0);assert.equal(fresh.request,undefined);
  fresh.ready();fresh.ready();assert.equal(fresh.posts,1);fresh.result(next);assert.equal(observed.length,1);assert.equal(observed[0].results[0][2].value,6);assert.equal(observed[0].error,null);assert.equal(fresh.terminated,true);fresh.result(next);assert.equal(observed.length,1);
  runner.destroy();runner.calculate(next,'/worker.js',()=>assert.fail('destroyed runner must not publish'));assert.equal(ControlledWorker.instances.length,2);
 }finally{runner.destroy();restore();}
});
test('startup can exceed the computation budget before readiness without timing out the actual calculation',async()=>{
 install();const runner=new SheetFormulaRunner(),observed:any[]=[],sheet={rows:[[2,3,'=SUM(A1:B1)']]};
 try{runner.calculate(sheet,'/worker.js',(results,error)=>observed.push({results,error}),{startupMs:80,calculationMs:5});const worker=ControlledWorker.instances[0];await wait(15);assert.equal(observed.length,0);assert.equal(worker.request,undefined);worker.ready();worker.result(sheet);assert.equal(observed.length,1);assert.equal(observed[0].results[0][2].value,5);assert.equal(worker.terminated,true);}finally{runner.destroy();restore();}
});
test('calculation deadline begins after ready; duplicate ready cannot extend it; late results are discarded',async()=>{
 install();const runner=new SheetFormulaRunner(),observed:any[]=[],sheet={rows:[[2,3,'=SUM(A1:B1)']]};
 try{runner.calculate(sheet,'/worker.js',(results,error)=>observed.push({results,error}),{startupMs:80,calculationMs:10});const worker=ControlledWorker.instances[0];worker.ready();await wait(7);worker.ready();await wait(15);assert.equal(worker.posts,1);assert.equal(observed.length,1);assert.equal(observed[0].results,null);assert.match(observed[0].error,/^計算が時間内/);assert.equal(worker.terminated,true);worker.result(sheet);assert.equal(observed.length,1);assert.equal(sheet.rows[0][2],'=SUM(A1:B1)');}finally{runner.destroy();restore();}
});
test('startup deadline is bounded without readiness and retains source; late ready cannot post work',async()=>{
 install();const runner=new SheetFormulaRunner(),observed:any[]=[],sheet={rows:[['=SUM(A1:A1)']]};
 try{runner.calculate(sheet,'/worker.js',(results,error)=>observed.push({results,error}),{startupMs:5,calculationMs:80});const worker=ControlledWorker.instances[0];await wait(15);assert.equal(observed.length,1);assert.equal(observed[0].results,null);assert.match(observed[0].error,/^計算の準備が時間内/);assert.equal(worker.terminated,true);assert.equal(worker.request,undefined);worker.ready();assert.equal(worker.posts,0);assert.equal(observed.length,1);assert.equal(sheet.rows[0][0],'=SUM(A1:A1)');}finally{runner.destroy();restore();}
});
test('invalid protocol/result, cloning, runtime and construction failures publish once and terminate',async()=>{
 install();const runner=new SheetFormulaRunner(),observed:any[]=[],sheet={rows:[[1]]};
 const calculate=()=>{runner.calculate(sheet,'/worker.js',(results,error)=>observed.push({results,error}),{startupMs:20,calculationMs:10});return ControlledWorker.instances.at(-1)!;};
 try{
  let worker=calculate();worker.ready(2);assert.equal(worker.terminated,true);
  worker=calculate();worker.ready();worker.onmessage!({data:{requestId:worker.request.requestId,results:[[{value:Infinity,error:null}]],error:null}});assert.equal(worker.terminated,true);
  worker=calculate();worker.ready();worker.onmessage!({data:{requestId:worker.request.requestId,results:null,error:null}});assert.equal(worker.terminated,true);
  ControlledWorker.throwPost=true;worker=calculate();worker.ready();assert.equal(worker.terminated,true);ControlledWorker.throwPost=false;
  worker=calculate();let prevented=false;worker.onerror!({preventDefault:()=>{prevented=true;}});assert.equal(prevented,true);assert.equal(worker.terminated,true);
  ControlledWorker.throwConstructor=true;calculate();await wait(25);assert.equal(observed.length,6);assert.ok(observed.every(item=>item.results===null&&typeof item.error==='string'&&item.error.length>0));
 }finally{runner.destroy();restore();}
});
test('deadline options are finite bounded positive integers and invalid options allocate no worker',()=>{
 install();const runner=new SheetFormulaRunner(),observed:any[]=[],sheet={rows:[['001','=A1']]};
 try{
  assert.deepEqual(defaultSheetWorkerTimeouts,{startupMs:10_000,calculationMs:2_000});assert.equal(Object.isFrozen(defaultSheetWorkerTimeouts),true);
  const invalid:unknown[]=[null,{}, {startupMs:0,calculationMs:2},{startupMs:-1,calculationMs:2},{startupMs:1.1,calculationMs:2},{startupMs:NaN,calculationMs:2},{startupMs:Infinity,calculationMs:2},{startupMs:60_001,calculationMs:2},{startupMs:10,calculationMs:0},{startupMs:10,calculationMs:Infinity},{startupMs:10,calculationMs:60_001}];
  for(const options of invalid)runner.calculate(sheet,'/worker.js',(results,error)=>observed.push({results,error}),options as never);
  assert.equal(ControlledWorker.instances.length,0);assert.equal(observed.length,invalid.length);assert.ok(observed.every(item=>item.results===null&&item.error.includes('期限設定')));assert.deepEqual(sheet.rows,[['001','=A1']]);
 }finally{runner.destroy();restore();}
});
test('invalidate permits fresh retry; destruction during either phase cancels timers and all late publication',async()=>{
 install();const runner=new SheetFormulaRunner(),observed:any[]=[],sheet={rows:[[2,3,'=SUM(A1:B1)']]};
 try{
  runner.calculate(sheet,'/worker.js',(results,error)=>observed.push({results,error}),{startupMs:10,calculationMs:10});const first=ControlledWorker.instances[0];runner.invalidate();assert.equal(first.terminated,true);first.ready();assert.equal(first.posts,0);
  runner.calculate(sheet,'/worker.js',(results,error)=>observed.push({results,error}),{startupMs:10,calculationMs:10});const second=ControlledWorker.instances[1];second.ready();runner.destroy();assert.equal(second.terminated,true);second.result(sheet);second.ready();await wait(20);assert.equal(observed.length,0);runner.calculate(sheet,'/worker.js',()=>assert.fail('destroyed retry'));assert.equal(ControlledWorker.instances.length,2);
 }finally{runner.destroy();restore();}
});
