import '@angular/compiler';
import {createEnvironmentInjector,runInInjectionContext,signal,type EnvironmentInjector} from '@angular/core';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {injectUiMessage,provideUiLocale,uiMessageState,type UiMessagePart} from '../../.ui/generated/angular/locale';
import type {UiLocaleOptions} from '../../.ui/generated/angular/locale-model';

test('held library messages follow the dictionary while captured values and operation count stay fixed',()=>{
 const options=signal<UiLocaleOptions>({locale:'en-US',translate:request=>request.id==='uiFoundation.listbox.selectedCount'?'Count: '+request.parameters.count:undefined});
 const injector=createEnvironmentInjector(provideUiLocale(options),null as unknown as EnvironmentInjector);
 try{
  const text=runInInjectionContext(injector,injectUiMessage);let count=3,operations=0;
  const request={id:'uiFoundation.listbox.selectedCount',parameters:{count}} as const;
  const message=uiMessageState<string|null>(null);const parts:UiMessagePart[]=[()=>text(request)];
  operations++;message.setMessage(parts);count=9;parts.push(' changed');
  assert.equal(message(),'Count: 3');options.set({locale:'de-DE',translate:request=>request.id==='uiFoundation.listbox.selectedCount'?'Anzahl: '+request.parameters.count:undefined});
  assert.equal(message(),'Anzahl: 3');assert.equal(operations,1);assert.equal(count,9);
  const readonly=message.asReadonly();assert.equal(readonly(),'Anzahl: 3');assert.equal('set' in readonly,false);assert.equal('setMessage' in readonly,false);
  message.set(null);assert.equal(message(),null);assert.equal(readonly(),null);
 }finally{injector.destroy();}
});

test('initial library text is live, while explicit application text stays raw even when it matches an ID',()=>{
 const request={id:'uiFoundation.dialog.closeAction'} as const;
 const options=signal<UiLocaleOptions>({translate:()=> 'Library close'});
 const injector=createEnvironmentInjector(provideUiLocale(options),null as unknown as EnvironmentInjector);
 try{
  const text=runInInjectionContext(injector,injectUiMessage);const message=uiMessageState('',[()=>text(request)]);
  assert.equal(message(),'Library close');options.set({translate:()=> 'Updated library close'});assert.equal(message(),'Updated library close');
  message.set(request.id);options.set({translate:()=> 'Another library close'});assert.equal(message(),request.id);
  message.update(value=>value+' / app detail');assert.equal(message(),request.id+' / app detail');
 }finally{injector.destroy();}
});
