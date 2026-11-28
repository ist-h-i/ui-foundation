import {Component, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';
import {ActionControl, FormField, FieldControl, FormLayout, InputGroup, FormGroup as UiFormGroup, FormActions, Textarea, SearchInput, MaskedInput, OTPInput, TagInput, MultiSelect, RadioGroup, RadioOption, Combobox, ComboboxOption, Dialog, OverlayHost, type SearchRequest, type SelectOption} from '../../.ui/generated/angular';
@Component({selector:'fixture-app',standalone:true,
 imports:[ReactiveFormsModule,ActionControl,FormField,FieldControl,FormLayout,InputGroup,UiFormGroup,FormActions,Textarea,SearchInput,MaskedInput,OTPInput,TagInput,MultiSelect,RadioGroup,RadioOption,Combobox,ComboboxOption,Dialog,OverlayHost],
 template:`
 <main [attr.data-ui-profile]="profile()" [attr.dir]="rtl()?'rtl':'ltr'">
  <h1>フォームと構造化入力</h1><p>書式に合わない場合や処理中でも入力内容を保持し、修正して再操作できることを検証します。</p>
  <div class="settings catalog-settings">
   <div class="catalog-setting"><label for="structured-profile">表示設定</label><span class="ui-select-control fixture-select"><select id="structured-profile" class="ui-field-control" [value]="profile()" (change)="profile.set(text($event))"><option value="guided">guided</option><option value="dense">dense</option></select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></div>
   <label><input type="checkbox" [checked]="rtl()" (change)="rtl.set(checked($event))">RTL</label>
   <label><input type="checkbox" [checked]="inline()" (change)="inline.set(checked($event))">横並びのラベル</label>
   <label><input type="checkbox" [checked]="readOnly()" (change)="readOnly.set(checked($event))">読取り専用</label>
   <label><input type="checkbox" [checked]="groupDisabled()" (change)="groupDisabled.set(checked($event))">グループを無効にする</label>
   <label><input type="checkbox" [checked]="clearIncomplete()" (change)="clearIncomplete.set(checked($event))">途中の書式入力を離脱時にクリア</label>
   <label><input type="checkbox" [checked]="freeTags()" (change)="freeTags.set(checked($event))">タグを自由入力</label>
   <label><input type="checkbox" [checked]="duplicates()" (change)="duplicates.set(checked($event))">タグの重複を許可</label>
   <label><input type="checkbox" [checked]="horizontal()" (change)="horizontal.set(checked($event))">選択肢と操作を横並びにする</label>
   <div class="catalog-actions"><button uiAction (click)="toggleDisabled()">フォームの無効状態を切替</button><button uiAction (click)="busy.set(!busy())">操作の処理中を切替</button><button uiAction (click)="reset()">フォームを初期化</button></div>
  </div>
  <form id="structured-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
   <ui-form-group groupId="structured-fields" label="提出する内容" [hint]="clearIncomplete()?'整理番号の途中入力は離脱時にクリアします。':'未完成の入力は保持します。'" [disabled]="groupDisabled()" [labelPosition]="inline()?'inline':'above'">
    <ui-masked-input controlId="structured-mask" label="整理番号" mask="999-99" formControlName="mask" [clearIncompleteOnBlur]="clearIncomplete()" [readonly]="readOnly()" hintPosition="before" [controlCharacters]="8" hint="数字3桁と2桁。例: 001-23" />
    <ui-otp-input controlId="structured-otp" label="確認コード" formControlName="otp" [digits]="6" [required]="true" [stripPasteSeparators]="stripSeparators()" [readonly]="readOnly()" />
    <ui-tag-input controlId="structured-tags" label="対象のタグ" [controlCharacters]="10" formControlName="tags" [options]="['申請','承認','確認']" [freeInput]="freeTags()" [allowDuplicates]="duplicates()" [caseSensitive]="false" [maxTokens]="3" [readonly]="readOnly()" [required]="true" />
    <div data-testid="textarea-width" [style.inline-size]="narrowNote()?'50%':'100%'" [hidden]="hideNote()"><ui-textarea controlId="structured-note" label="補足" formControlName="note" [autoResize]="true" [maxHeight]="500" [rows]="2" [showCount]="true" [readonly]="readOnly()" /></div>
    <ui-checkbox-group controlId="structured-checks" label="確認担当者" formControlName="checks" [options]="choices" [direction]="horizontal()?'horizontal':'vertical'" [columns]="2" [searchable]="false" [showSelectAll]="false" [maxSelected]="2" [readonly]="readOnly()" />
    <ui-radio-group name="structured-radio" label="提出方法" formControlName="radio" [direction]="horizontal()?'horizontal':'vertical'">
     <label class="ui-radio-option"><input uiRadioOption value="online">オンライン</label><label class="ui-radio-option"><input uiRadioOption value="closed" [disabled]="true">受付終了</label><label class="ui-radio-option"><input uiRadioOption value="office">窓口</label>
    </ui-radio-group>
   </ui-form-group>
   <ui-form-actions [busy]="busy()" [direction]="horizontal()?'horizontal':'vertical'" [disabled]="form.disabled" (cancelled)="cancelled.update(increment)" />
   <div class="catalog-actions"><button uiAction (click)="narrowNote.set(!narrowNote())">補足の幅を切替</button><button uiAction (click)="hideNote.set(!hideNote())">補足の表示を切替</button></div>
  </form>
  <p data-testid="structured-status">{{snapshot().valid?'有効':'要確認'}} / {{snapshot().touched?'操作済み':'未操作'}} / 送信 {{submitted()}} / 取消 {{cancelled()}}</p><pre data-testid="structured-values">{{snapshot().values}}</pre>
  <section aria-label="検索応答の検証"><h2>同じ検索語へ戻った場合</h2>
   <ui-search-input controlId="structured-search" label="申請を検索" [formControl]="search" [debounceMs]="50" [suggestions]="suggestions()" [suggestionsQuery]="response()?.query??null" [suggestionsRequestId]="response()?.requestId??null" (searchRequest)="requests.update(append($event))" />
   <div class="catalog-actions"><button uiAction (click)="applySearch(false)">現在の検索応答</button><button uiAction (click)="applySearch(true)">古い検索応答</button><button uiAction (click)="search.reset(search.value)">同じ検索値をreset</button></div><p data-testid="structured-requests">{{serialize(requests())}}</p>
  </section>
  <section aria-label="候補テンプレートとOverlayの検証"><h2>候補の補助情報</h2><ui-overlay-host>
   <ui-combobox controlId="structured-combo" label="担当部署" [options]="departments" [formControl]="owner" placement="bottom-end"><ng-template uiComboboxOption let-option let-active="active" let-selected="selected"><strong>{{option.label}}</strong><span class="option-detail">コード {{option.value}} {{active?'選択候補':''}} {{selected?'選択済み':''}}</span></ng-template></ui-combobox>
   <button uiAction (click)="dialogOpen.set(true)">候補入りDialogを開く</button>
   <dialog uiDialog label="部署を選択" [open]="dialogOpen()" (openChange)="dialogOpen.set($event)"><ui-combobox controlId="dialog-combo" label="Dialogの担当部署" [options]="departments" [formControl]="dialogOwner"><ng-template uiComboboxOption let-option><strong>{{option.label}}</strong><span> {{option.value}}</span></ng-template></ui-combobox><button uiAction (click)="dialogOpen.set(false)">選択を閉じる</button></dialog>
  </ui-overlay-host><p data-testid="structured-owner">{{owner.value}} / {{dialogOwner.value}}</p><button uiAction data-testid="outside">別の操作</button></section>
  <section aria-label="書式の設定と値復元"><h2>入力条件の変更</h2>
   <label><input type="checkbox" [checked]="stripSeparators()" (change)="stripSeparators.set(checked($event))">貼付けの空白とハイフンを除く</label>
   <ui-masked-input controlId="letter-mask" label="文字と数字" mask="AA-99" [formControl]="letterMask" /><ui-otp-input controlId="letter-otp" label="英数字コード" kind="alphanumeric" [digits]="4" [formControl]="letterOTP" />
   <button uiAction (click)="form.controls.tags.setValue(['申請','申請','承認','確認'])">上限超過と重複を復元</button>
   <div uiFormLayout [columns]="2" labelPosition="inline" [labelWidth]="128" gap="compact"><ui-form-field controlId="native-field" label="直接接続した入力" hint="補助説明" hintPosition="before" [controlCharacters]="12" error="確認メッセージ"><ui-input-group [connected]="false"><input uiFieldControl [value]="nativeValue" (input)="nativeValue=text($event)"><span uiInputAfter>内部コード</span></ui-input-group></ui-form-field><ui-form-field controlId="native-check" label="配置を明示したチェック" hint="確認してから選択してください。" hintPosition="before" [labelPosition]="inline()?'above':'inline'"><input uiFieldControl type="checkbox"></ui-form-field></div>
   <ui-form-field controlId="native-wrapped-check" label="確認のチェック" hint="確認後に選択できます。" [hintPosition]="inline()?'before':'after'"><span><input uiFieldControl type="checkbox"></span></ui-form-field>
  </section>
 </main>`,
 styles:`:host{display:block;min-inline-size:0;}main{padding:var(--ui-space-page);max-inline-size:var(--ui-size-content);margin-inline:auto;color:var(--ui-color-text);font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);}h1,h2{font-weight:var(--ui-weight-heading);}h1{font-size:var(--ui-text-heading);}h2{font-size:var(--ui-text-body);}section{margin-block:var(--ui-space-section);}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-family:var(--ui-font-code);}select{inline-size:auto;}.settings{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);margin-block:var(--ui-space-field);align-items:center;}.settings label{display:flex;gap:var(--ui-space-control-gap);align-items:center;min-block-size:var(--ui-size-control);}.option-detail{display:block;font-size:var(--ui-text-small);color:var(--ui-color-muted);}`})
export class StructuredFormCatalog {
 readonly profile=signal('guided');readonly rtl=signal(false);readonly inline=signal(false);readonly horizontal=signal(false);readonly readOnly=signal(false);readonly groupDisabled=signal(false);readonly busy=signal(false);readonly clearIncomplete=signal(false);readonly freeTags=signal(true);readonly duplicates=signal(false);readonly stripSeparators=signal(false);readonly narrowNote=signal(false);readonly hideNote=signal(false);readonly submitted=signal(0);readonly cancelled=signal(0);readonly increment=(value:number)=>value+1;
 readonly form=new FormGroup({mask:new FormControl('',{nonNullable:true}),otp:new FormControl('',{nonNullable:true}),tags:new FormControl<readonly string[]>([],{nonNullable:true}),note:new FormControl('',{nonNullable:true}),checks:new FormControl<readonly string[]>([],{nonNullable:true}),radio:new FormControl('online',{nonNullable:true})});
 readonly snapshot=toSignal(this.form.events.pipe(map(()=>this.read())),{initialValue:this.read()});readonly search=new FormControl('',{nonNullable:true});readonly requests=signal<readonly SearchRequest[]>([]);readonly response=signal<SearchRequest|null>(null);readonly suggestions=signal<readonly string[]>([]);readonly owner=new FormControl<string|null>(null);readonly dialogOwner=new FormControl<string|null>(null);readonly dialogOpen=signal(false);readonly letterMask=new FormControl('',{nonNullable:true});readonly letterOTP=new FormControl('',{nonNullable:true});nativeValue='';
 readonly choices:readonly SelectOption[]=[{value:'a',label:'山田'},{value:'b',label:'佐藤'},{value:'c',label:'田中'},{value:'closed',label:'確認不可',disabled:true}];readonly departments:readonly SelectOption[]=[{value:'general',label:'総務部',group:'社内'},{value:'closed',label:'営業受付終了',disabled:true,group:'社内'},{value:'sales',label:'営業部',group:'社内'}];
 text(event:Event):string{return (event.target as HTMLInputElement).value;}checked(event:Event):boolean{return (event.target as HTMLInputElement).checked;}serialize(value:unknown):string{return JSON.stringify(value);}append(request:SearchRequest){return (values:readonly SearchRequest[])=>[...values,request];}
 private read(){return {values:JSON.stringify(this.form.getRawValue()),valid:this.form.valid,touched:this.form.touched};}
 submit():void{this.form.markAllAsTouched();if(!this.busy()&&this.form.valid)this.submitted.update(this.increment);}
 reset():void{this.form.reset({mask:'',otp:'',tags:[],note:'',checks:[],radio:'online'});this.submitted.set(0);}
 toggleDisabled():void{if(this.form.disabled)this.form.enable();else this.form.disable();}
 applySearch(old:boolean):void{const request=old?this.requests()[0]:this.requests().at(-1);if(request){this.response.set(request);this.suggestions.set([request.query+'候補']);}}
}
