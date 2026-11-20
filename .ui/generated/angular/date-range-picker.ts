import type { UiMessageText } from './stable-messages';
import {injectUiLocale,injectUiMessageText,UiStableMessagePipe} from './locale';
import {booleanAttribute,ChangeDetectionStrategy,Component,computed,effect,forwardRef,input,linkedSignal,signal} from '@angular/core';
import {FormControl,ReactiveFormsModule,NG_VALIDATORS,NG_VALUE_ACCESSOR,type AbstractControl,type ValidationErrors,type Validator} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ValueControl} from './value-control';
import {ActionControl} from './action-control';
import {DatePicker} from './date-input';
import {Calendar,CalendarDay} from './calendar';
import {civilDate,localCivilISO,dateRangeError,shiftCivilMonth,type DateInputFormat} from './date-model';
export interface DateRange{start:string|null;end:string|null}
export interface DatePreset{label:string;range:DateRange}
@Component({selector:'ui-date-range-picker',standalone:true,imports:[ReactiveFormsModule,ActionControl,DatePicker,Calendar,CalendarDay,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>DateRangePicker),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>DateRangePicker),multi:true}],
 template:`<fieldset [id]="controlId()" tabindex="-1" [disabled]="blocked()" (focusout)="leftGroup($event)" [attr.aria-describedby]="descriptionIds()" [attr.aria-invalid]="error()?'true':null"><legend>{{required() ? messageText('uiFoundation.dateRangePicker.requiredLabel', {label: label()}) : label()}}</legend>
  <div class="ui-range-inputs"><ui-date-picker [controlId]="controlId()+'-start'" [label]="messageText('uiFoundation.dateRangePicker.startDateLabel', {label: label()})" [formControl]="start" [inputFormat]="effectiveInputFormat()" [min]="min()" [max]="max()" [disabledDates]="disabledDates()" [dateDisabled]="dateDisabled()" [readonly]="readonly()" [locale]="effectiveLocale()" />
   <ui-date-picker [controlId]="controlId()+'-end'" [label]="messageText('uiFoundation.dateRangePicker.endDateLabel', {label: label()})" [formControl]="end" [inputFormat]="effectiveInputFormat()" [min]="min()" [max]="max()" [disabledDates]="disabledDates()" [dateDisabled]="dateDisabled()" [readonly]="readonly()" [locale]="effectiveLocale()" /></div>
  <div class="ui-range-presets">@for(preset of presets();track preset.label){<button uiAction [disabled]="blocked()||readonly()||presetError(preset)!==null" (click)="replaceRange(preset.range);touch()">{{preset.label}}</button>}
   @if(clearable()){<button uiAction [disabled]="blocked()||readonly()" (click)="replaceRange(emptyValue);touch()">{{'uiFoundation.dateRangePicker.clearDateRange' | uiStableMessage}}</button>}</div>
  @if(months()>1){<div class="ui-range-choice"><button uiAction [attr.aria-pressed]="selecting()==='start'" [disabled]="blocked()||readonly()" (click)="selecting.set('start')">{{'uiFoundation.dateRangePicker.chooseAStartDate' | uiStableMessage}}</button><button uiAction [attr.aria-pressed]="selecting()==='end'" [disabled]="blocked()||readonly()" (click)="selecting.set('end')">{{'uiFoundation.dateRangePicker.chooseAnEndDate' | uiStableMessage}}</button></div>
   <div class="ui-range-calendars">@for(month of calendarMonths();track $index){<ui-calendar [controlId]="controlId()+'-month-'+$index" [label]="messageText('uiFoundation.dateRangePicker.calendarMonthLabel', {label: label(), month: $index + 1})" [displayMonth]="month" (monthChange)="moveMonth($event,$index)" [value]="selecting()==='start'?current().start:current().end" [selectedDates]="ends()" (valueChange)="chooseDate(selecting(),$event);selecting.set('end')" [min]="min()" [max]="max()" [disabledDates]="disabledDates()" [dateDisabled]="dateDisabled()" [disabled]="blocked()" [readonly]="readonly()" [weekStartsOn]="weekStartsOn()" [locale]="effectiveLocale()">
    <ng-template uiCalendarDay let-date let-day="day"><span [class.ui-range-day]="inRange(date)">{{day}}</span></ng-template>
   </ui-calendar>}</div>}
  @if(hint()){<p [id]="controlId()+'-hint'">{{hint()}}</p>}@if(error()){<p class="ui-range-error" [id]="controlId()+'-error'" role="alert">{{error()}}</p>}
 </fieldset>`,
 styles:`:host{display:block;min-inline-size:0;max-inline-size:100%;}:host([hidden]){display:none;}fieldset{min-inline-size:0;max-inline-size:100%;border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);padding:var(--ui-space-control-y);margin:0;}legend{font-weight:var(--ui-weight-control);}.ui-range-inputs,.ui-range-calendars{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,var(--ui-size-dialog)),1fr));gap:var(--ui-space-field);}.ui-range-presets,.ui-range-choice{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);margin-block:var(--ui-space-control-y);}.ui-range-day{font-weight:var(--ui-weight-control);text-decoration:underline;}.ui-range-error{color:var(--ui-color-danger);}`,
})
export class DateRangePicker extends ValueControl<DateRange> implements Validator{
 protected readonly messageText = injectUiMessageText();
 protected readonly emptyValue:DateRange={start:null,end:null};readonly min=input<string|null>(null);readonly max=input<string|null>(null);readonly maxDays=input<number|null>(null);readonly disabledDates=input<readonly string[]>([]);readonly dateDisabled=input<((date:string)=>boolean)|null>(null);
 readonly months=input(2);readonly weekStartsOn=input(0);protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=computed(()=>this.locale()??this.uiLocaleDefaults().locale);readonly inputFormat=input<DateInputFormat>();protected readonly effectiveInputFormat=computed(()=>this.inputFormat()??this.uiLocaleDefaults().dateInputFormat);readonly initialMonth=input(localCivilISO(new Date()).slice(0,7));readonly presets=input<readonly DatePreset[]>([]);readonly clearable=input(true,{transform:booleanAttribute});
 protected readonly start=new FormControl<string|null>(null);protected readonly end=new FormControl<string|null>(null);
 protected readonly selecting=signal<'start'|'end'>('start');private readonly baseMonth=linkedSignal(()=>this.current().start?.slice(0,7)??this.initialMonth());
 protected readonly calendarMonths=computed(()=>Array.from({length:Number.isSafeInteger(this.months())?Math.max(1,Math.min(12,this.months())):1},(_,index)=>shiftCivilMonth(this.baseMonth()+'-01',index).slice(0,7)));
 protected readonly ends=computed(()=>[this.current().start,this.current().end].filter((date):date is string=>!!date));private validatorChanged:()=>void=()=>{};
 constructor(){super();effect(()=>{this.min();this.max();this.maxDays();this.disabledDates();this.dateDisabled();this.required();this.validatorChanged();});effect(()=>{const range=this.current();if(this.start.value!==range.start)this.start.setValue(range.start,{emitEvent:false});if(this.end.value!==range.end)this.end.setValue(range.end,{emitEvent:false});});
  effect(()=>{const disabled=this.blocked();let changed=false;for(const control of [this.start,this.end])if(control.disabled!==disabled){disabled?control.disable({emitEvent:false}):control.enable({emitEvent:false});changed=true;}if(changed)this.validatorChanged();});
  for(const [part,control] of [['start',this.start],['end',this.end]] as const){control.valueChanges.pipe(takeUntilDestroyed()).subscribe(value=>this.part(part,value));control.statusChanges.pipe(takeUntilDestroyed()).subscribe(()=>this.validatorChanged());}
 }
 protected coerce(value:unknown):DateRange{if(!value||typeof value!=='object')return this.emptyValue;const range=value as Partial<DateRange>;return {start:typeof range.start==='string'&&civilDate(range.start)?range.start:null,end:typeof range.end==='string'&&civilDate(range.end)?range.end:null};}
 registerOnValidatorChange(callback:()=>void):void{this.validatorChanged=callback;}
 override writeValue(value:unknown):void{super.writeValue(value);const range=this.coerce(value);this.start.setValue(range.start,{emitEvent:false});this.end.setValue(range.end,{emitEvent:false});}
 protected part(_part:'start'|'end',_date:string|null):void{if(this.start.invalid||this.end.invalid)return;this.commit({start:this.start.value,end:this.end.value});}
 protected chooseDate(part:'start'|'end',date:string|null):void{if(this.blocked()||this.readonly())return;this[part].setValue(date);}
 protected replaceRange(range:DateRange):void{if(this.blocked()||this.readonly())return;this.start.setValue(range.start,{emitEvent:false});this.end.setValue(range.end,{emitEvent:false});this.commit(range);this.validatorChanged();}
 protected leftGroup(event:FocusEvent):void{if(!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node|null))this.touch();}
 protected moveMonth(month:string,index:number):void{this.baseMonth.set(shiftCivilMonth(month+'-01',-index).slice(0,7));}
 protected inRange(date:string):boolean{return !!(this.current().start&&this.current().end&&date>=this.current().start!&&date<=this.current().end!);}
 private rangeError(range:DateRange,text?:UiMessageText):string|null{return dateRangeError(range,this.min(),this.max(),this.maxDays(),this.disabledDates().length||this.dateDisabled()?date=>this.disabledDates().includes(date)||!!this.dateDisabled()?.(date):null,text);}
 protected presetError(preset:DatePreset):string|null{return this.rangeError(preset.range,this.messageText);}
 validate(control:AbstractControl):ValidationErrors|null{if(this.start.invalid||this.end.invalid)return {dateRangeDraft:true};const range=control.value as DateRange|null;if(!range||!range.start&&!range.end)return this.required()?{required:true}:null;const error=this.rangeError(range);return error?{dateRange:error}:null;}
}
