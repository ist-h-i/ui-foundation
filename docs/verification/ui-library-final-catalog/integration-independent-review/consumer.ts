import {ChangeDetectionStrategy,Component,signal,viewChild} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {FormControl,ReactiveFormsModule} from '@angular/forms';
import {
 Card,CardTemplate,Menu,Dialog,DialogTemplate,Snackbar,OverlayHost,
 NumberInput,TextInput,DateRangePicker,InlineEdit,
 UiLocaleScope,provideUiLocale,
 type UiLocaleOptions,type MenuItem,type MenuSelection,type DialogCloseRequest,
 type DialogResult,type InlineEditRequest,type DateRange,
} from './repository/.ui/generated/angular/index';

const messages={
 '折り畳む':'Fold','展開':'Expand','閉じる':'Close','親メニューに戻る':'Back',
 'ダイアログを閉じる':'Close dialog','通知を閉じる: ':'Dismiss: ',
 '編集':'Edit','保存':'Save','取消':'Cancel',
 '入力してください。':'Required','処理しています。':'Working',
 '内容を読み込んでいます。':'Loading',
};
const initialLocale:UiLocaleOptions={locale:'ja-JP',direction:'ltr',timeZone:'UTC',dateInputFormat:'dd/MM/yyyy'};
export const locale=signal<UiLocaleOptions>(initialLocale);
@Component({selector:'independent-review',standalone:true,
 imports:[ReactiveFormsModule,Card,CardTemplate,Menu,Dialog,DialogTemplate,Snackbar,OverlayHost,NumberInput,TextInput,DateRangePicker,InlineEdit,UiLocaleScope],
 providers:[provideUiLocale(locale)],changeDetection:ChangeDetectionStrategy.OnPush,
 styles:`:host{display:block;}main{padding:var(--ui-space-page);font:var(--ui-text-body)/var(--ui-leading-body) var(--ui-font-body);background:var(--ui-color-background);color:var(--ui-color-text);min-inline-size:0;max-inline-size:var(--ui-size-content);margin-inline:auto;overflow-wrap:anywhere;}section{margin-block:var(--ui-space-section);}button,input{font:inherit;max-inline-size:100%;box-sizing:border-box;min-block-size:var(--ui-size-control);}button{white-space:nowrap;}svg{max-inline-size:100%;}output{display:block;overflow-wrap:anywhere;}`,
 template:`<main [uiLocale]="{}" [attr.data-ui-profile]="profile()"><h1>統合前の重点部品を保持するconsumer</h1>
 <ui-overlay-host/>
 <button id="settings" (click)="changeSettings()">言語・表示を切替</button><button id="initial-settings" (click)="resetSettings()">初期設定</button>
 <label>外部の入力<input id="outside"></label>
 <section><ui-card cardId="review-card" title="保存" [collapsible]="true" [collapsed]="collapsed()" (collapsedChange)="collapsed.set($event)" [loading]="loading()" appearance="raised" orientation="horizontal">
  <ng-template uiCardTemplate="header"><h2 id="app-card-title">保存</h2></ng-template>
  <ng-template uiCardTemplate="body"><label>本文<input id="card-editor"></label></ng-template>
  <ng-template uiCardTemplate="footer"><span id="card-footer">アプリのfooter</span></ng-template>
  <ng-template uiCardTemplate="media"><svg id="card-media" role="img" aria-label="アプリの媒体" viewBox="0 0 80 20"><text x="0" y="15">Media</text></svg></ng-template>
  <ng-template uiCardTemplate="actions"><button id="card-action">アプリの操作</button></ng-template>
 </ui-card></section>
 <section><ui-menu menuId="review-menu" label="アプリのメニュー" [items]="menuItems" (selected)="choose($event)"/><output id="menu-selection">{{menuSelection()}}</output></section>
 <section><button id="open-dialog" (click)="dialogOpen.set(true)">ダイアログを開く</button>
 <dialog uiDialog label="保存" [open]="dialogOpen()" (openChange)="dialogOpen.set($event)" [showHeader]="true" [showFooter]="true" [draggable]="true" [resizable]="true" [maximizable]="true" (closeRequested)="closeDialog($event)" (completed)="completed.set($event)">
 <ng-template uiDialogTemplate="header"><h2 id="app-dialog-title">保存</h2></ng-template>
 <ng-template uiDialogTemplate="body"><label>ダイアログの入力<input id="dialog-editor"></label><button id="dialog-settings" (click)="changeSettings()">表示を切替</button><button id="allow-close" (click)="dirty.set(false)">保留を解除</button></ng-template>
 <ng-template uiDialogTemplate="footer"><span id="dialog-footer">アプリのfooter</span></ng-template>
 </dialog><output id="dialog-reasons">{{reasons().join(',')}}</output><output id="dialog-completed">{{completed()?.reason}}</output></section>
 <section><button id="notify" (click)="snackOpen.set(true)">通知を開始</button><ui-snackbar id="notification" [open]="snackOpen()" (openChange)="snackOpen.set($event)" message="保存" [autoDismiss]="autoDismiss()" [durationSeconds]="duration()" position="inline" (dismissed)="dismissal.set($event)"/><output id="dismissal">{{dismissal()}}</output></section>
 <section><ui-number-input controlId="native-number" label="保存" [formControl]="number" step="any"/><ui-text-input controlId="native-text" label="保存" [formControl]="text"/><output id="number-value">{{number.value}}</output></section>
 <section><ui-date-range-picker controlId="raw-range" label="期間" [formControl]="range" [months]="1"/><output id="range-value">{{rangeJson()}}</output><output id="range-status">{{range.status}}</output><button id="reset-range" (click)="range.reset(initialRange)">期間をreset</button></section>
 <section><ui-inline-edit controlId="inline" label="保存" [formControl]="inline" [required]="true" (saveRequested)="saveInline($event)"/><output id="inline-requests">{{inlineRequests()}}</output><button id="reset-inline" (click)="inline.reset('保存')">編集をreset</button></section>
 </main>`})
export class IndependentReview{
 readonly profile=signal<'guided'|'dense'>('guided');readonly collapsed=signal(false);readonly loading=signal(false);
 readonly menuItems:readonly MenuItem[]=[{id:'parent',label:'親',children:[{id:'child',label:'子',children:[{id:'leaf',label:'保存'},{id:'disabled',label:'無効',disabled:true},{id:'hidden',label:'非表示',visible:false}]}]}];
 readonly menuSelection=signal('');choose(value:MenuSelection):void{this.menuSelection.set(value.path.join('/'));}
 readonly dialogOpen=signal(false);readonly dirty=signal(true);readonly reasons=signal<readonly string[]>([]);readonly completed=signal<DialogResult|null>(null);
 closeDialog(request:DialogCloseRequest):void{this.reasons.update(value=>[...value,request.reason]);if(this.dirty())request.preventDefault();}
 readonly snackOpen=signal(false);readonly autoDismiss=signal(true);readonly duration=signal(0.8);readonly dismissal=signal('');
 readonly number=new FormControl<number|null>(1234.5);readonly text=new FormControl<string|null>('保存');
 readonly initialRange:DateRange={start:'2026-02-01',end:'2026-02-07'};readonly range=new FormControl<DateRange|null>(this.initialRange);
 rangeJson():string{return JSON.stringify(this.range.value);}
 readonly inline=new FormControl<string|null>('保存');readonly inlineRequests=signal(0);readonly inlineEditor=viewChild(InlineEdit);readonly inlinePending=signal<InlineEditRequest|null>(null);
 saveInline(request:InlineEditRequest):void{this.inlineRequests.update(value=>value+1);this.inlinePending.set(request);}
 changeSettings():void{this.profile.set('dense');locale.set({...initialLocale,locale:'de-DE',direction:'rtl',messages,numberOptions:{minimumFractionDigits:2}});}
 resetSettings():void{this.profile.set('guided');locale.set(initialLocale);}
}
bootstrapApplication(IndependentReview).then(ref=>{Object.defineProperty(globalThis,'__independentReview',{value:ref.components[0].instance,configurable:true});});
