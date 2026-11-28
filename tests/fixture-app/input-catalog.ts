import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
 ActionControl, TextInput, Textarea, PasswordInput, NumberInput, SearchInput, Checkbox, Switch,
 Select, MultiSelect, Combobox, FormLayout, FormGroup as UiFormGroup, FormActions, FormErrorSummary, type SelectOption, type SearchRequest, type FormError,
} from '../../.ui/generated/angular/index';
@Component({selector:'input-catalog',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,
 imports:[ReactiveFormsModule,ActionControl,TextInput,Textarea,PasswordInput,NumberInput,SearchInput,Checkbox,Switch,Select,MultiSelect,Combobox,FormLayout,UiFormGroup,FormActions,FormErrorSummary],
 template:`<section aria-label="入力部品の検証"><h2>申請内容を入力する</h2>
  <div class="catalog-settings">
  <button uiAction (click)="toggleDisabled()">{{form.disabled?'入力を有効にする':'入力を無効にする'}}</button>
  <button uiAction (click)="reset()">フォームを初期化</button>
  <label><input type="checkbox" [checked]="compactEditors()" (change)="compactEditors.set(checked($event))">入力条件を先に表示して幅を指定</label>
  <label><input type="checkbox" [checked]="asyncCandidates()" (change)="asyncCandidates.set(checked($event))">非同期候補</label>
  <label><input type="checkbox" [checked]="freeInput()" (change)="freeInput.set(checked($event))">自由入力を許可</label>
  <label><input type="checkbox" [checked]="readOnly()" (change)="readOnly.set(checked($event))">読取り専用</label>
  <button uiAction (click)="maxAmount.set(maxAmount()===10000?1000:10000)">金額の上限を変更</button>
  </div>
  <ui-form-error-summary [errors]="errors()" [visible]="submitted()" />
  <form [formGroup]="form" class="request-form" uiFormLayout [columns]="2" (ngSubmit)="submit()" novalidate>
   <div class="request-form-column" uiFormLayout>
   <ui-text-input controlId="request-title" label="件名" [hintPosition]="compactEditors()?'before':'after'" [controlCharacters]="compactEditors()?8:null" formControlName="title" [required]="true" [maxLength]="30" inputMode="text" [clearable]="true" [showCount]="true" [readonly]="readOnly()" hint="30文字以内で入力してください。" [error]="error('title')" />
   <ui-number-input controlId="request-amount" label="申請金額" formControlName="amount" [required]="true" [min]="0" [max]="maxAmount()" [step]="0.5" [fractionDigits]="2" unit="円" [readonly]="readOnly()" [error]="error('amount')" />
   <ui-select controlId="request-department" label="申請先" [controlCharacters]="compactEditors()?8:null" formControlName="department" [options]="departments" [required]="true" [clearable]="true" [readonly]="readOnly()" [error]="error('department')" />
   <ui-combobox controlId="request-owner" label="担当部署" [controlCharacters]="compactEditors()?8:null" formControlName="owner" [options]="candidates()" [optionsQuery]="asyncCandidates()?candidateQuery():null" [optionsRequestId]="asyncCandidates()?candidateId():null" [freeInput]="freeInput()" [loading]="candidateLoading()" [readonly]="readOnly()" (queryChange)="query.set($event.query); queryId.set($event.requestId); candidateLoading.set(asyncCandidates())" />
   <ui-checkbox controlId="request-consent" label="入力内容を確認した" [hintPosition]="compactEditors()?'before':'after'" [hint]="compactEditors()?'内容を確認してから選択してください。':null" [controlCharacters]="compactEditors()?8:null" formControlName="consent" [indeterminate]="mixed()" [readonly]="readOnly()" />
   </div>
   <ui-form-group groupId="request-support" label="補足情報" hint="必要に応じて経緯と確認担当者を追加してください。">
   <ui-textarea controlId="request-note" label="申請の説明" autocomplete="off" inputMode="text" formControlName="note" [autoResize]="true" [rows]="2" [maxHeight]="180" [showCount]="true" [maxLength]="200" [readonly]="readOnly()" />
   <ui-password-input controlId="request-password" label="確認用パスワード" formControlName="password" [readonly]="readOnly()"  strength="medium" />
   <ui-multi-select controlId="request-reviewers" label="確認担当者" formControlName="reviewers" [options]="reviewerOptions" [maxSelected]="2" [readonly]="readOnly()"  />
   <ui-search-input controlId="request-search" label="関連申請を検索" formControlName="search" [debounceMs]="300" [suggestions]="['備品購入','出張旅費']" [suggestionsQuery]="'備品'" [readonly]="readOnly()" (searchRequest)="searched($event)" />
   <ui-switch controlId="request-notifications" label="更新を通知する" formControlName="notifications" [busy]="switchBusy()" [readonly]="readOnly()" />
   </ui-form-group>
   <ui-form-actions class="request-form-actions" submitLabel="申請内容を確認" cancelLabel="確認を取り消す" [showReset]="false" [disabled]="form.disabled" (cancelled)="submitted.set(false)" />
  </form>
  <button uiAction (click)="mixed.set(!mixed())">中間状態を切替</button><button uiAction (click)="switchBusy.set(!switchBusy())">通知設定の処理中を切替</button>
  <button uiAction (click)="candidateQuery.set('古い条件'); candidateLoading.set(false)">古い候補応答を適用</button>
  <button uiAction (click)="candidateQuery.set(query()); candidateId.set(queryId()); candidateLoading.set(false)">現在の候補応答を適用</button>
  <button uiAction (click)="candidateQuery.set(query()); candidateId.set(queryId()-1); candidateLoading.set(false)">同じ条件の古い応答を適用</button>
  <button uiAction (click)="form.controls.reviewers.setValue(['b','d','removed'])">利用不可の担当者を復元</button>
  <ui-multi-select controlId="blur-reviewers" label="離脱時に確定する担当者" [formControl]="blurReviewers" [options]="reviewerOptions" />
  <p data-testid="blur-values">離脱時: {{blurSnapshot()}}</p>
  <pre data-testid="form-values">{{snapshot().value}}</pre>
  <p data-testid="form-status">フォーム: {{snapshot().valid?'有効':'要確認'}} / {{snapshot().touched?'操作済み':'未操作'}} / {{submitted()?'確認済み':'未確認'}}</p>
  <p data-testid="search-requests">検索: {{searches().map(searchText).join(' | ')}}</p>
 </section>`,
 styles:`:host{display:block;min-inline-size:0;max-inline-size:100%;}h2{font-size:var(--ui-text-heading);margin-block-start:var(--ui-space-section);}pre{white-space:pre-wrap;overflow-wrap:anywhere;color:var(--ui-color-muted);}.catalog-settings{display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap);margin-block:var(--ui-space-field);}.catalog-settings label{display:inline-flex;align-items:center;gap:var(--ui-space-control-gap);min-block-size:var(--ui-size-control);}.catalog-settings input[type="checkbox"]{inline-size:var(--ui-size-icon);block-size:var(--ui-size-icon);accent-color:var(--ui-color-action);}form{margin-block:var(--ui-space-section);}.request-form-column{align-content:start;}.request-form-actions{grid-column:1 / -1;}section>label{display:inline-flex;gap:var(--ui-space-control-gap);align-items:center;min-block-size:var(--ui-size-control);}`,
})
export class InputCatalog {
 readonly form=new FormGroup({title:new FormControl('',{nonNullable:true,validators:Validators.required}),note:new FormControl('',{nonNullable:true}),amount:new FormControl<number|null>(null),password:new FormControl('',{nonNullable:true}),department:new FormControl<string|null>(null,Validators.required),reviewers:new FormControl<string[]>([],{nonNullable:true}),consent:new FormControl(false,{nonNullable:true}),notifications:new FormControl(true,{nonNullable:true}),owner:new FormControl<string|null>(null),search:new FormControl('',{nonNullable:true})});
 readonly blurReviewers=new FormControl<string[]>(['a','b'],{nonNullable:true,updateOn:'blur'});readonly blurSnapshot=toSignal(this.blurReviewers.events.pipe(map(()=>JSON.stringify(this.blurReviewers.value)+' / '+this.blurReviewers.touched)),{initialValue:JSON.stringify(this.blurReviewers.value)+' / false'});
 readonly snapshot=toSignal(this.form.events.pipe(map(()=>this.formSnapshot())),{initialValue:this.formSnapshot()});
 readonly compactEditors=signal(false);
 readonly submitted=signal(false);readonly readOnly=signal(false);readonly mixed=signal(false);readonly switchBusy=signal(false);readonly maxAmount=signal(10000);
 readonly asyncCandidates=signal(false);readonly freeInput=signal(false);readonly query=signal('');readonly candidateQuery=signal<string|null>(null);readonly candidateLoading=signal(false);
 readonly queryId=signal(0);readonly candidateId=signal<number|null>(null);
 readonly searches=signal<readonly SearchRequest[]>([]);readonly searchText=(request:SearchRequest)=>request.requestId+':'+request.query;
 readonly departments:SelectOption[]=[{value:'sales',label:'営業部',group:'社内'},{value:'general',label:'総務部',group:'社内'},{value:'closed',label:'受付停止中',disabled:true,group:'社内'}];
 readonly reviewerOptions:SelectOption[]=[{value:'a',label:'山田',group:'東京'},{value:'b',label:'佐藤',group:'東京'},{value:'c',label:'田中',group:'大阪'},{value:'d',label:'確認不可',disabled:true,group:'大阪'}];
 readonly candidates=signal<SelectOption[]>([{value:'sales',label:'営業部',group:'社内'},{value:'blocked',label:'営業部（受付停止）',disabled:true,group:'社内'},{value:'general',label:'総務部',group:'社内'},{value:'dev',label:'開発部',group:'社内'}]);
 readonly errors=computed<readonly FormError[]>(()=>{this.snapshot();return (['title','amount','department'] as const).flatMap(name=>{const message=this.error(name);return message?[{controlId:'request-'+name,label:{title:'件名',amount:'申請金額',department:'申請先'}[name],message}]:[];});});
 private formSnapshot(){return {value:JSON.stringify(this.form.getRawValue()),valid:this.form.valid,touched:this.form.touched};}
 error(name:'title'|'amount'|'department'):string|null{this.snapshot();const control=this.form.controls[name];if(!this.submitted()&&!control.touched)return null;return control.invalid?(name==='amount'?'0円から'+this.maxAmount()+'円まで、0.5円刻みで入力してください。':name==='title'?'件名を入力してください。':'申請先を選択してください。'):null;}
 submit():void{this.submitted.set(true);this.form.markAllAsTouched();}
 reset():void{this.form.reset({title:'',note:'',amount:null,password:'',department:null,reviewers:[],consent:false,notifications:true,owner:null,search:''});this.submitted.set(false);this.searches.set([]);}
 toggleDisabled():void{if(this.form.disabled)this.form.enable();else this.form.disable();}
 checked(event:Event):boolean{return (event.target as HTMLInputElement).checked;}
 searched(request:SearchRequest):void{this.searches.update(requests=>[...requests,request]);}
}
