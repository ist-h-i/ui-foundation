import {injectUiLocale,UiMessagePipe} from './locale';
import {NgTemplateOutlet} from '@angular/common';
import {afterRenderEffect,booleanAttribute,ChangeDetectionStrategy,Component,computed,contentChild,DestroyRef,Directive,ElementRef,forwardRef,inject,input,linkedSignal,output,signal,TemplateRef,viewChildren} from '@angular/core';
import {NG_VALUE_ACCESSOR} from '@angular/forms';
import {ActionControl} from './action-control';
import {ValueControl} from './value-control';
import {addCivilDays,calendarDays,civilDate,localCivilISO,civilLabel,shiftCivilMonth} from './date-model';
export interface CalendarDayContext{$implicit:string;day:number;inMonth:boolean;selected:boolean;disabled:boolean}
@Directive({selector:'ng-template[uiCalendarDay]',standalone:true})
export class CalendarDay{readonly template=inject<TemplateRef<CalendarDayContext>>(TemplateRef);static ngTemplateContextGuard(_directive:CalendarDay,_context:unknown):_context is CalendarDayContext{return true;}}
@Component({selector:'ui-calendar',standalone:true,imports:[ActionControl,NgTemplateOutlet,UiMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>Calendar),multi:true}],
 template:`<section class="ui-calendar" [attr.aria-label]="label()" [attr.aria-describedby]="descriptionIds()">
  <div class="ui-calendar__heading"><button uiAction [disabled]="blocked() || previousMonth()===month()" [attr.aria-label]="label()+('の前の月' | uiMessage)" (click)="navigate(-1)">{{'前月' | uiMessage}}</button>
   <h3 [id]="controlId()+'-heading'" aria-live="polite" aria-atomic="true">{{heading()}}</h3>
   <button uiAction [disabled]="blocked() || nextMonth()===month()" [attr.aria-label]="label()+('の次の月' | uiMessage)" (click)="navigate(1)">{{'次月' | uiMessage}}</button></div>
  @if(view()==='year'){
   <div class="ui-calendar__months" [attr.aria-label]="label()+('の月を選択' | uiMessage)">@for(item of months;track item){<button uiAction [disabled]="blocked()" [attr.aria-pressed]="month().endsWith('-'+item)" (click)="setMonth(month().slice(0,4)+'-'+item)">{{Number(item)}}{{'月' | uiMessage}}</button>}</div>
  }
  <div class="ui-calendar__days" role="region" [attr.aria-label]="label()+('の日付一覧' | uiMessage)" tabindex="0"><table role="grid" [attr.aria-labelledby]="controlId()+'-heading'" [attr.aria-readonly]="readonly()">
   <thead><tr>@for(day of weekdays();track day.long){<th scope="col" [abbr]="day.long">{{day.short}}</th>}</tr></thead>
   <tbody>@for(week of weeks();track $index){<tr>@for(day of week;track $index){<td [attr.aria-selected]="day.date && (current()===day.date || selectedDates().includes(day.date)) ? 'true' : null" [class.ui-calendar__outside]="!day.inMonth">
    @if(day.date){<button #dayButton type="button" [attr.data-date]="day.date" [attr.aria-label]="dayLabel(day.date)" [attr.aria-current]="day.date===today()?'date':null"
     [attr.aria-disabled]="unavailable(day.date)||readonly()?'true':null" [disabled]="blocked()" [tabIndex]="focused()===day.date?0:-1"
     (focus)="focused.set(day.date)" (keydown)="key($event,day.date)" (click)="choose(day.date)">
     @if(dayTemplate()){<ng-container [ngTemplateOutlet]="dayTemplate()!.template" [ngTemplateOutletContext]="{$implicit:day.date,day:day.day,inMonth:day.inMonth,selected:current()===day.date,disabled:unavailable(day.date)}" />}
     @else{{{day.day}}}
    </button>}
   </td>}</tr>}</tbody>
  </table></div>
  @if(hint()){<p [id]="controlId()+'-hint'">{{hint()}}</p>}@if(error()){<p class="ui-calendar__error" [id]="controlId()+'-error'" role="alert">{{error()}}</p>}
  <p class="ui-calendar__help">{{'矢印キーで日、Home/Endで週、PageUp/PageDownで月を移動します。Shiftを押すと年を移動します。' | uiMessage}}</p>
 </section>`,
 styles:`:host{display:block;min-inline-size:0;max-inline-size:100%;color:var(--ui-color-text);}:host([hidden]){display:none;}.ui-calendar{border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);padding:var(--ui-space-control-y);}.ui-calendar__heading{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:var(--ui-space-control-gap);}h3{font-size:var(--ui-text-body);margin:0;}.ui-calendar__days{overflow-x:auto;max-inline-size:100%;overscroll-behavior-inline:contain;}table{inline-size:100%;min-inline-size:calc(7 * max(var(--ui-size-control), 2em + var(--ui-space-control-gap)));table-layout:fixed;border-collapse:collapse;}th,td{text-align:center;padding:0;}th{font-size:var(--ui-text-small);}td button{white-space:nowrap;inline-size:100%;min-block-size:var(--ui-size-control);padding:var(--ui-space-control-y) 0;border:var(--ui-border-control) solid transparent;background:var(--ui-color-surface);color:var(--ui-color-text);font:inherit;border-radius:var(--ui-radius-control);}td[aria-selected="true"] button{background:var(--ui-color-action);color:var(--ui-color-on-action);}td button[aria-disabled="true"],.ui-calendar__outside button{color:var(--ui-color-muted);}td[aria-selected="true"] button[aria-disabled="true"]{color:var(--ui-color-on-action);}button:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:calc(-1 * var(--ui-border-focus));}button[aria-current="date"]{border-color:var(--ui-color-border);}.ui-calendar__months{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--ui-space-control-gap);margin-block:var(--ui-space-field);}.ui-calendar__help{color:var(--ui-color-muted);font-size:var(--ui-text-small);overflow-wrap:anywhere;}.ui-calendar__error{color:var(--ui-color-danger);}`,
})
export class Calendar extends ValueControl<string|null>{
 protected readonly emptyValue=null;readonly min=input<string|null>(null);readonly max=input<string|null>(null);readonly disabledDates=input<readonly string[]>([]);readonly dateDisabled=input<((date:string)=>boolean)|null>(null);
 readonly weekStartsOn=input(0);protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=computed(()=>this.locale()??this.uiLocaleDefaults().locale);readonly today=input(localCivilISO(new Date()));readonly initialMonth=input<string|null>(null);readonly displayMonth=input<string|null>(null);readonly selectedDates=input<readonly string[]>([]);readonly view=input<'month'|'year'>('month');readonly monthChange=output<string>();
 protected readonly Number=Number;protected readonly months=Array.from({length:12},(_,index)=>String(index+1).padStart(2,'0'));
 protected readonly dayTemplate=contentChild(CalendarDay);private readonly dayButtons=viewChildren<ElementRef<HTMLButtonElement>>('dayButton');
 protected readonly month=linkedSignal(()=>this.displayMonth()??this.current()?.slice(0,7)??(civilDate(this.initialMonth()+'-01')?this.initialMonth()!:this.today().slice(0,7)));
 protected readonly focused=linkedSignal(()=>{const preferred=this.current()??this.today();return preferred.startsWith(this.month()+'-')?preferred:this.month()+'-01';});
 private readonly pendingFocus=signal<string|null>(null);private readonly pendingReveal=signal<string|null>(null);private readonly element=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
 protected readonly heading=computed(()=>civilLabel(this.month()+'-01',this.effectiveLocale(),{year:'numeric',month:'long'}));
 protected readonly previousMonth=computed(()=>shiftCivilMonth(this.month()+'-01',-1).slice(0,7));protected readonly nextMonth=computed(()=>shiftCivilMonth(this.month()+'-01',1).slice(0,7));
 protected readonly weeks=computed(()=>{const days=calendarDays(this.month(),this.weekStartsOn());return Array.from({length:6},(_,index)=>days.slice(index*7,index*7+7));});
 protected readonly weekdays=computed(()=>Array.from({length:7},(_,index)=>{const date=addCivilDays('2026-10-04',(this.weekStartsOn()+index)%7);return {short:civilLabel(date,this.effectiveLocale(),{weekday:'short'}),long:civilLabel(date,this.effectiveLocale(),{weekday:'long'})};}));
 protected coerce(value:unknown):string|null{return typeof value==='string'&&civilDate(value)?value:null;}
 readonly dayDescription=input<((date:string)=>string)|null>(null);
 protected dayLabel(date:string):string{const description=this.dayDescription()?.(date);return civilLabel(date,this.effectiveLocale())+(description?'、'+description:'');}
 protected unavailable(date:string):boolean{return !!(this.min()&&date<this.min()!||this.max()&&date>this.max()!||this.disabledDates().includes(date)||this.dateDisabled()?.(date));}
 constructor(){super();const render=afterRenderEffect(()=>{const focus=this.pendingFocus(),date=focus??this.pendingReveal();if(date){const button=this.dayButtons().find(button=>button.nativeElement.dataset['date']===date)?.nativeElement;if(button){if(focus)this.revealDate(button);else button.scrollIntoView({block:'nearest',inline:'nearest'});this.pendingFocus.set(null);this.pendingReveal.set(null);}}});inject(DestroyRef).onDestroy(()=>render.destroy());}
 private revealDate(button:HTMLButtonElement):void{button.focus({preventScroll:true});button.scrollIntoView({block:'nearest',inline:'nearest'});}
 protected setMonth(month:string):void{if(this.blocked()||!civilDate(month+'-01'))return;this.month.set(month);this.focused.set(month+'-01');this.pendingFocus.set(null);this.pendingReveal.set(month+'-01');this.monthChange.emit(month);}
 protected navigate(offset:number):void{this.setMonth(shiftCivilMonth(this.month()+'-01',offset).slice(0,7));}
 protected choose(date:string):void{if(this.blocked()||this.readonly()||this.unavailable(date))return;this.commit(date);this.touch();}
 focusDate(date:string=this.current()??this.focused()):void{if(!civilDate(date)||this.blocked())return;this.month.set(date.slice(0,7));this.focused.set(date);this.pendingReveal.set(null);this.pendingFocus.set(date);}
 protected key(event:KeyboardEvent,date:string):void{
  if(this.blocked()||event.isComposing||event.keyCode===229)return;
  // A second key may arrive before Angular renders a changed month. Continue
  // from the logical destination and prevent native activation of the old day.
  const pending=this.pendingFocus();date=pending??date;
  if(pending&&(event.key==='Enter'||event.key===' ')){event.preventDefault();this.choose(date);return;}
  const weekday=(civilDate(date)!.getUTCDay()-this.weekStartsOn()+7)%7;const rtl=this.element.ownerDocument.defaultView?.getComputedStyle(this.element).direction==='rtl';
  const offset=event.key==='ArrowDown'?7:event.key==='ArrowUp'?-7:event.key==='ArrowRight'?(rtl?-1:1):event.key==='ArrowLeft'?(rtl?1:-1):event.key==='Home'?-weekday:event.key==='End'?6-weekday:null;
  let next:string|null=offset!==null?addCivilDays(date,offset):event.key==='PageUp'?shiftCivilMonth(date,event.shiftKey?-12:-1):event.key==='PageDown'?shiftCivilMonth(date,event.shiftKey?12:1):null;
  if(next){event.preventDefault();this.month.set(next.slice(0,7));this.focused.set(next);this.pendingReveal.set(null);this.pendingFocus.set(next);const button=this.dayButtons().find(button=>button.nativeElement.dataset['date']===next)?.nativeElement;if(button)this.revealDate(button);this.monthChange.emit(next.slice(0,7));}
 }
}
