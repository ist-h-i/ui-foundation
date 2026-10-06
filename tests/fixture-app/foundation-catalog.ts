import {ChangeDetectionStrategy,Component,computed,signal,viewChild,viewChildren} from '@angular/core';
import {FormControl,ReactiveFormsModule} from '@angular/forms';
import {toSignal} from '@angular/core/rxjs-interop';
import {provideUiLocale,UiLocaleScope,UiMessagePipe} from '../../.ui/generated/angular/locale';
import type {UiLocaleOptions} from '../../.ui/generated/angular/locale-model';
import {DateRangePicker,type DateRange} from '../../.ui/generated/angular/date-range-picker';
import {NumberInput,TextInput} from '../../.ui/generated/angular/text-input';
import {ProfileSpecimens} from './foundation-profile-specimens';
import {CvaSpecimens} from './foundation-cva-specimens';
import {RawForms} from './foundation-raw-forms';
import {NewForms} from './foundation-new-forms';
import {Dir} from '@angular/cdk/bidi';
import {BidiProbe} from './foundation-bidi-probe';

export const locale=signal<UiLocaleOptions>({locale:'ja-JP',dateInputFormat:'dd/MM/yyyy',timeZone:'Asia/Tokyo'});
@Component({selector:'fixture-app',standalone:true,providers:[provideUiLocale(locale)],imports:[RawForms,BidiProbe,Dir,ReactiveFormsModule,UiLocaleScope,UiMessagePipe,DateRangePicker,NumberInput,TextInput,NewForms,CvaSpecimens,ProfileSpecimens],changeDetection:ChangeDetectionStrategy.OnPush,
template:`<main [uiLocale]="{}" [attr.data-ui-profile]="profile()"><h1>共通基盤の実操作検証</h1><span id="bidi-root" bidiProbe></span><label>外部<input id="outside"></label><button id="reset-range" (click)="range.reset(initialRange)">期間をreset</button>
<section id="range-case"><ui-date-range-picker controlId="dates" label="期間" [formControl]="range" [months]="1" [readonly]="readonly()"/><output id="range-value">{{json(rangeValue())}}</output><output id="range-status">{{rangeStatus()}}</output></section>
<section id="root-locale"><ui-number-input controlId="number-root" label="金額" [formControl]="number" step="any" [fractionDigits]="overrideDigits()" [grouping]="overrideGrouping()"/></section>
@if(showScope()){<section id="scope" [uiLocale]="scope()"><span id="scope-message" bidiProbe>{{'検索'|uiMessage}}</span><ui-number-input controlId="number-scope" label="App label" [formControl]="scopeNumber" step="any"/><ui-number-input controlId="number-explicit" label="Explicit" [formControl]="explicitNumber" step="any" locale="en-US"/></section>
}<section id="external-scope" dir="ltr" lang="fr" [uiLocale]="scope()"><span id="bidi-external" bidiProbe>{{'検索'|uiMessage}}</span></section>
<section [attr.data-ui-profile]="profile()==='guided'?'dense':'guided'"><ui-text-input controlId="nested-input" label="Nested" [formControl]="text"/></section>
<section id="bidi-native-parent" [attr.dir]="nativeDirection()">@if(showBidiScope()){<section id="bidi-dynamic-scope" [uiLocale]="{direction:'rtl'}"><span id="bidi-native" bidiProbe></span></section>}</section><section id="bidi-parent-dir" [dir]="parentDirection()"><section [uiLocale]="{direction:'rtl'}"><span id="bidi-parent" bidiProbe></span></section></section><span id="bidi-sibling" bidiProbe></span><new-forms/><cva-specimens/><profile-specimens/><raw-forms/></main>`,styles:`main{max-inline-size:var(--ui-size-content);margin-inline:auto;padding:var(--ui-space-page);min-inline-size:0;font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);background:var(--ui-color-background);color:var(--ui-color-text);}section{padding-block:var(--ui-space-section);min-inline-size:0;}output{display:block;overflow-wrap:anywhere;}input,button{font:inherit;max-inline-size:100%;box-sizing:border-box;}`})
export class FoundationCatalog{
readonly nativeDirection=signal<'ltr'|'rtl'|undefined>(undefined);readonly parentDirection=signal<'ltr'|'rtl'>('ltr');readonly showBidiScope=signal(true);readonly bidiProbes=viewChildren(BidiProbe);
readonly profile=signal<'guided'|'dense'>('guided');readonly showScope=signal(true);readonly overrideDigits=signal<number|undefined>(undefined);readonly overrideGrouping=signal<boolean|undefined>(undefined);readonly readonly=signal(false);readonly scope=signal<UiLocaleOptions>({locale:'de-DE',direction:'rtl',messages:{'検索':'Find scoped'}});
readonly initialRange:DateRange={start:'2026-02-01',end:'2026-02-07'};readonly range=new FormControl<DateRange|null>(this.initialRange);readonly number=new FormControl<number|null>(1234.5);readonly scopeNumber=new FormControl<number|null>(1234.5);readonly explicitNumber=new FormControl<number|null>(1234.5);readonly text=new FormControl('draft');
readonly rangeValue=toSignal(this.range.valueChanges,{initialValue:this.range.value});readonly rangeStatus=toSignal(this.range.statusChanges,{initialValue:this.range.status});
readonly profileSpecimens=viewChild.required(ProfileSpecimens);readonly rawForms=viewChild.required(RawForms);readonly specimens=viewChild.required(CvaSpecimens);readonly newForms=viewChild.required(NewForms);readonly dateRange=viewChild(DateRangePicker);readonly rootLocale=locale;json(value:unknown):string{return JSON.stringify(value);}
}
