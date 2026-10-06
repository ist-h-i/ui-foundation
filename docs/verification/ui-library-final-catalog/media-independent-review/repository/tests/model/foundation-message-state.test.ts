import '@angular/compiler';
import {createEnvironmentInjector,runInInjectionContext,signal,type EnvironmentInjector} from '@angular/core';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {injectUiText,provideUiLocale,uiMessageState,type UiMessagePart} from '../../.ui/generated/angular/locale';
import type {UiLocaleOptions} from '../../.ui/generated/angular/locale-model';

test('held library messages follow the dictionary while captured values and operation count stay fixed',()=>{
 const options=signal<UiLocaleOptions>({messages:{'件数':'Count'}});
 const injector=createEnvironmentInjector(provideUiLocale(options),null as unknown as EnvironmentInjector);
 try{
  const text=runInInjectionContext(injector,()=>injectUiText());let count=3,operations=0;
  const message=uiMessageState<string|null>(null);const parts:UiMessagePart[]=[()=>text('件数'),': ',String(count)];
  operations++;message.setMessage(parts);count=9;parts.push(' changed');
  assert.equal(message(),'Count: 3');options.set({locale:'de-DE',messages:{'件数':'Anzahl'}});
  assert.equal(message(),'Anzahl: 3');assert.equal(operations,1);assert.equal(count,9);
  const readonly=message.asReadonly();assert.equal(readonly(),'Anzahl: 3');assert.equal('set' in readonly,false);assert.equal('setMessage' in readonly,false);
  message.set(null);assert.equal(message(),null);assert.equal(readonly(),null);
 }finally{injector.destroy();}
});

test('initial library text is live, while explicit application text stays raw even when it matches a dictionary key',()=>{
 const options=signal<UiLocaleOptions>({messages:{'保存に失敗':'Library failure'}});
 const injector=createEnvironmentInjector(provideUiLocale(options),null as unknown as EnvironmentInjector);
 try{
  const text=runInInjectionContext(injector,()=>injectUiText());const message=uiMessageState('',[()=>text('保存に失敗')]);
  assert.equal(message(),'Library failure');options.set({messages:{'保存に失敗':'Updated library failure'}});assert.equal(message(),'Updated library failure');
  message.set('保存に失敗');options.set({messages:{'保存に失敗':'Another library failure'}});assert.equal(message(),'保存に失敗');
  message.update(value=>value+' / app detail');assert.equal(message(),'保存に失敗 / app detail');
 }finally{injector.destroy();}
});
