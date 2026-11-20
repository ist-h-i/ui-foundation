import assert from 'node:assert/strict';
import {test} from 'node:test';
import {defaultUiLocale,resolveUiLocale} from '../../.ui/generated/angular/locale-model.ts';
import {resolveUiMessage} from '../../.ui/generated/angular/stable-messages.ts';
test('Japanese/native defaults preserve unset timezone and inherited direction',()=>{assert.equal(defaultUiLocale.locale,'ja-JP');assert.equal(defaultUiLocale.dateInputFormat,'native');assert.equal(defaultUiLocale.timeZone,null);assert.equal(defaultUiLocale.direction,null);assert.deepEqual(resolveUiLocale({}),defaultUiLocale);});
test('explicit runtime choices are immutable and scoped overrides retain the parent',()=>{
 const parent=resolveUiLocale({locale:'de-DE',timeZone:'Europe/Berlin',direction:'rtl',dateInputFormat:'dd/MM/yyyy',translate:(_request,locale)=>'Erledigt '+locale});
 const child=resolveUiLocale({locale:'en-US'},parent);
 const close={id:'uiFoundation.dialog.closeAction'} as const;
 assert.equal(child.locale,'en-US');assert.equal(child.timeZone,'Europe/Berlin');assert.equal(child.direction,'rtl');assert.equal(child.dateInputFormat,'dd/MM/yyyy');
 assert.equal(parent.locale,'de-DE');assert.ok(Object.isFrozen(child));assert.equal(child.translate,parent.translate);
 assert.equal(resolveUiMessage(close,child.locale,child.translate),'Erledigt en-US');
 const reset=resolveUiLocale({locale:'ja-JP',translate:null},parent);
 assert.equal(resolveUiMessage(close,reset.locale,reset.translate),'閉じる');
});
test('invalid locale/date/timezone choices are rejected without browser or date guessing',()=>{for(const options of [{locale:''},{locale:null},{translate:{}},{dateInputFormat:null},{numberOptions:null},{locale:'bad_locale'},{timeZone:'not-a-zone'},{direction:'auto'},{dateInputFormat:'guess'},{civilDateOptions:{timeZone:'Asia/Tokyo'}},{dateTimeOptions:{timeZone:'UTC'}},{numberOptions:{maximumFractionDigits:-1}}])assert.throws(()=>resolveUiLocale(options as any));});
test('fallback keeps application-owned named arguments intact and skips empty or echoed translations',()=>{
 const title='<script>原値</script>';
 const request={id:'uiFoundation.card.expand',parameters:{title}} as const;
 for(const translate of [undefined,()=>undefined,()=>' ',()=>request.id]) {
  assert.equal(resolveUiMessage(request,'en-US',translate),'Expand: '+title);
 }
});
