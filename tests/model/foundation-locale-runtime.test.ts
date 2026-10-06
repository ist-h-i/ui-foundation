import '@angular/compiler';
import {createEnvironmentInjector,runInInjectionContext,signal,type EnvironmentInjector} from '@angular/core';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {injectUiLocale,injectUiText,provideUiLocale,UI_LOCALE} from '../../.ui/generated/angular/locale';
import type {UiLocaleOptions} from '../../.ui/generated/angular/locale-model';
test('provider and message service run in a server DI context without reading browser globals',()=>{
 const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 for(const key of ['document','window'])Object.defineProperty(globalThis,key,{configurable:true,get(){throw new Error('unexpected browser global access: '+key);}});
 let injector:EnvironmentInjector|undefined;
 try{
  const options=signal<UiLocaleOptions>({locale:'ja-JP',messages:{検索:'Find'}});injector=createEnvironmentInjector(provideUiLocale(options),null as unknown as EnvironmentInjector);
  const [context,text]=runInInjectionContext(injector,()=>[injectUiLocale(),injectUiText()] as const);assert.equal(context().locale,'ja-JP');assert.equal(context().timeZone,null);assert.equal(text('検索'),'Find');
  options.set({locale:'tr-TR',timeZone:'Europe/Istanbul',messages:{検索:'Search'}});assert.equal(context().locale,'tr-TR');assert.equal(context().timeZone,'Europe/Istanbul');assert.equal(text('検索'),'Search');
  injector.destroy();assert.throws(()=>injector!.get(UI_LOCALE));injector=undefined;
 }finally{injector?.destroy();for(const [key,descriptor] of [['document',oldDocument],['window',oldWindow]] as const){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});
