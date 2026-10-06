import '@angular/compiler';
import {createEnvironmentInjector,runInInjectionContext,signal,type EnvironmentInjector} from '@angular/core';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {injectUiText,provideUiLocale} from './repository/.ui/generated/angular/index';
import {uiMessageState} from './repository/.ui/generated/angular/locale';

test('a recorded branch, zero, and raw app detail stay captured while only the library key follows a live dictionary',()=>{
 const options=signal({locale:'en-US',messages:{'準備中':'Preparing','完了':'Complete'}});
 const injector=createEnvironmentInjector(provideUiLocale(options),null as unknown as EnvironmentInjector);
 try{
  const text=runInInjectionContext(injector,()=>injectUiText());
  let ready=false,total=0,calls=0,detail='App detail';
  const message=uiMessageState<string|null>(null);
  const capturedBranch=ready?'完了':'準備中';calls++;
  message.setMessage([()=>text(capturedBranch),' / ',String(total),' / ',String(detail)]);
  ready=true;total=17;detail='Changed app detail';
  const readonly=message.asReadonly();
  assert.equal(readonly(),'Preparing / 0 / App detail');
  options.set({locale:'de-DE',messages:{'準備中':'Vorbereitung','完了':'Fertig'}});
  assert.equal(readonly(),'Vorbereitung / 0 / App detail');
  assert.equal(calls,1);assert.equal(ready,true);assert.equal(total,17);
  assert.equal('set' in readonly,false);assert.equal('setMessage' in readonly,false);
  message.set('準備中');options.set({locale:'en-GB',messages:{'準備中':'Preparing again','完了':'Complete again'}});
  assert.equal(readonly(),'準備中');
  message.update(raw=>raw+'\nApplication recovery advice');assert.equal(readonly(),'準備中\nApplication recovery advice');
  message.set(null);assert.equal(readonly(),null);
 }finally{injector.destroy();}
});
