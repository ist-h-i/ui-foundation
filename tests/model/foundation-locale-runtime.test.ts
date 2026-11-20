import '@angular/compiler';
import {createEnvironmentInjector,runInInjectionContext,signal,type EnvironmentInjector} from '@angular/core';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {injectUiLocale,injectUiMessage,injectUiText,provideUiLocale,UI_LOCALE} from '../../.ui/generated/angular/locale';
import type {UiLocaleOptions} from '../../.ui/generated/angular/locale-model';
import {uiEnglishMessages} from '../../.ui/generated/angular/locale-en';
import {listSelectionProblem} from '../../.ui/generated/angular/collection-model';
import {injectTableColumnMoveText} from '../../.ui/generated/angular/table-controls';
test('provider and message service run in a server DI context without reading browser globals',()=>{
 const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 for(const key of ['document','window'])Object.defineProperty(globalThis,key,{configurable:true,get(){throw new Error('unexpected browser global access: '+key);}});
 let injector:EnvironmentInjector|undefined;
 try{
  const options=signal<UiLocaleOptions>({locale:'ja-JP',messages:{検索:'Find'}});injector=createEnvironmentInjector(provideUiLocale(options),null as unknown as EnvironmentInjector);
  const [context,text]=runInInjectionContext(injector,()=>[injectUiLocale(),injectUiText()] as const);assert.equal(context().locale,'ja-JP');assert.equal(context().timeZone,null);assert.equal(text('検索'),'Find');
  options.set({locale:'tr-TR',timeZone:'Europe/Istanbul',messages:{検索:'Search'}});assert.equal(context().locale,'tr-TR');assert.equal(context().timeZone,'Europe/Istanbul');assert.equal(text('検索'),'Search');
  options.set({locale:'en-US',messages:{...uiEnglishMessages,検索:'Find'}});
  assert.equal(text('検索'),'Find');
  assert.equal(text('閉じる'),'Close');
  assert.equal(text('{count}件を追加しました。',{count:2}),'Items added: 2.');
  const columnMoveText=runInInjectionContext(injector,injectTableColumnMoveText);
  assert.equal(columnMoveText(-1),'Move earlier');
  assert.equal(columnMoveText(-1,'Status'),'Move earlier: Status');
  assert.equal(columnMoveText(1,'Status'),'Move later: Status');
  options.set({locale:'en-US',messages:{'1件まで選択してください。':'Choose just one.'}});
  assert.equal(listSelectionProblem([{value:'a',label:'A'},{value:'b',label:'B'}],['a','b'],true,false,1,text),'Choose just one.');
  assert.equal(text('{limit}件まで選択してください。',{limit:1},()=> 'fragment fallback'),'Choose just one.');
  options.set({locale:'en-US',messages:{'1件まで選択してください。':'Legacy','{limit}件まで選択してください。':'At most {limit}.'}});
  assert.equal(text('{limit}件まで選択してください。',{limit:1}),'At most 1.');
  options.set({locale:'en-US'});
  assert.equal(text('{limit}件まで選択してください。',{limit:1},()=> 'fragment fallback'),'fragment fallback');

  assert.equal(text('閉じる'),'閉じる');
  assert.equal(columnMoveText(-1),'前へ');
  assert.equal(columnMoveText(-1,'Status'),'Status列を前へ');
  assert.ok(Object.isFrozen(uiEnglishMessages));
  injector.destroy();assert.throws(()=>injector!.get(UI_LOCALE));injector=undefined;
 }finally{injector?.destroy();for(const [key,descriptor] of [['document',oldDocument],['window',oldWindow]] as const){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});

test('the stable-message provider reads the current locale and asynchronously loaded translation', () => {
 const options = signal<UiLocaleOptions>({locale:'en-US'});
 const ready = signal(false);
 const injector=createEnvironmentInjector(provideUiLocale(options),null as unknown as EnvironmentInjector);
 try {
  const text = runInInjectionContext(injector,injectUiMessage);
  const request={id:'uiFoundation.dialog.closeLabel'} as const;
  assert.equal(text(request),'Close dialog');
  options.set({locale:'ja-JP',translate:(message,locale)=>
    ready()&&locale==='ja-JP'&&message.id===request.id?'閉じて戻る':undefined});
  assert.equal(text(request),'ダイアログを閉じる');
  ready.set(true);
  assert.equal(text(request),'閉じて戻る');
  options.update(value=>({...value,locale:'en-US'}));
  assert.equal(text(request),'Close dialog');
 } finally { injector.destroy(); }
});
