import {uiMessageState} from './locale';
import {injectUiText as injectUiDiagnosticText} from './locale';
import {injectUiText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiText,UiMessagePipe} from './locale';
import { NgTemplateOutlet } from '@angular/common';
import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, DestroyRef, Directive, ElementRef, forwardRef, inject, signal, untracked } from '@angular/core';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR, type AbstractControl, type ValidationErrors, type Validator } from '@angular/forms';
import { input, output } from '@angular/core';
import { ActionControl } from './action-control';
import { ValueControl } from './value-control';
import { canFocus } from './focus';
import { cloneFilter, editFilter, emptyFilter, filterOperators, filterProblems, filterStructureError, removeFilter, type FilterField, type FilterGroup, type FilterNode, type FilterOperator, type FilterRule } from './filter-model';
export interface FilterTemplateContext { node: FilterGroup; depth: number; }
@Directive({ selector: 'ng-template[uiFilterGroupContext]', standalone: true })
export class FilterGroupContext { static ngTemplateContextGuard(_directive: FilterGroupContext, _context: unknown): _context is FilterTemplateContext { return true; } }
export interface FilterSaveRequest { requestId: number; value: FilterGroup; }
const operatorLabels: Readonly<Record<FilterOperator, string>> = { contains: 'を含む', startsWith: 'で始まる', eq: 'と等しい', neq: 'と等しくない', gt: 'より大きい', gte: '以上', lt: 'より小さい', lte: '以下', before: 'より前', after: 'より後', missing: '未取得', present: '取得済み' };
@Component({ selector: 'ui-filter-builder,ui-query-builder', standalone: true, imports: [ActionControl, NgTemplateOutlet, FilterGroupContext,UiMessagePipe], changeDetection: ChangeDetectionStrategy.OnPush,
 providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FilterBuilder), multi: true }, { provide: NG_VALIDATORS, useExisting: forwardRef(() => FilterBuilder), multi: true }],
 template: `<section [attr.aria-label]="label()" [attr.aria-busy]="busy()||!!pending()">@if(hint()){<p class="ui-filter-hint" [id]="controlId()+'-hint'">{{hint()}}</p>}<ng-container [ngTemplateOutlet]="group" [ngTemplateOutletContext]="{node:root(),depth:0}" /><div class="ui-filter-actions"><button uiAction type="button" [disabled]="unavailable()||problems().length>0||!unsaved()" (click)="save()">{{uiEffective_saveLabel()}}</button><button uiAction type="button" [disabled]="unavailable()" (click)="clear()">{{uiEffective_clearLabel()}}</button>@if(savedSnapshot()){<button uiAction type="button" [disabled]="unavailable()" (click)="restoreSaved()">{{uiEffective_restoreLabel()}}</button><button uiAction type="button" [disabled]="unavailable()" (click)="clearSaved()">{{uiEffective_clearSavedLabel()}}</button>}</div>@if(error()||rootProblem()){<p class="ui-filter-error" role="alert">{{error()||rootProblem()}}</p>}@if(resultMessage()){<p role="status">{{resultMessage()}}</p>}@if(pending()){<p role="status">{{uiEffective_pendingLabel()}}</p>}</section>
 <ng-template #group uiFilterGroupContext let-node="node" let-depth="depth"><fieldset class="ui-filter-group"><legend>{{depth===0?label():uiEffective_groupLabel()+' ('+depth+')'}}</legend><label [for]="domId(node.id)+'-match'">{{uiEffective_matchLabel()}}</label><select class="ui-field-control" [id]="domId(node.id)+'-match'" [value]="node.match" [disabled]="unavailable()" (change)="changeMatch(node.id,$event)" (blur)="touch()"><option value="and">{{'すべてに一致 (AND)' | uiMessage}}</option><option value="or">{{'いずれかに一致 (OR)' | uiMessage}}</option></select><ol>@for(child of node.children;track child.id){<li>@if(child.type==='group'){<ng-container [ngTemplateOutlet]="group" [ngTemplateOutletContext]="{node:child,depth:depth+1}" /> }@else{<div class="ui-filter-rule"><label [for]="domId(child.id)+'-field'">{{uiEffective_fieldLabel()}}</label><select class="ui-field-control" [id]="domId(child.id)+'-field'" [attr.aria-invalid]="problemFor(child.id)?'true':null" [attr.aria-describedby]="describedBy(child.id)"  [disabled]="unavailable()" (change)="changeField(child.id,$event)" (blur)="touch()"><option value="none" [selected]="!field(child)" disabled>{{'項目を選択' | uiMessage}}</option>@for(field of definitions();track field.id){<option [value]="'field:'+field.id" [selected]="field.id===child.field">{{field.label}}</option>}</select><label [for]="domId(child.id)+'-operator'">{{uiEffective_operatorLabel()}}</label><select class="ui-field-control" [id]="domId(child.id)+'-operator'" [attr.aria-invalid]="problemFor(child.id)?'true':null" [attr.aria-describedby]="describedBy(child.id)"  [disabled]="unavailable()" (change)="changeOperator(child.id,$event)" (blur)="touch()"><option value="none" [selected]="!operators(child).includes(child.operator)" disabled>{{'演算子を選択' | uiMessage}}</option>@for(operator of operators(child);track operator){<option [value]="operator" [selected]="operator===child.operator">{{operatorText(operator)}}</option>}</select>@if(child.operator!=='missing'&&child.operator!=='present'){<label [for]="domId(child.id)+'-value'">{{uiEffective_valueLabel()}}</label>@if(field(child)?.type==='boolean'){<select class="ui-field-control" [id]="domId(child.id)+'-value'"  [disabled]="unavailable()" [attr.aria-invalid]="problemFor(child.id)?'true':null" [attr.aria-describedby]="describedBy(child.id)" (change)="changeBoolean(child.id,$event)" (blur)="touch()"><option value="none" [selected]="valueText(child.value)!=='true'&&valueText(child.value)!=='false'" disabled>{{'値を選択' | uiMessage}}</option><option value="true" [selected]="valueText(child.value)==='true'">{{'はい' | uiMessage}}</option><option value="false" [selected]="valueText(child.value)==='false'">{{'いいえ' | uiMessage}}</option></select>}@else if(field(child)?.type==='choice'){<select class="ui-field-control" [id]="domId(child.id)+'-value'"  [disabled]="unavailable()" [attr.aria-invalid]="problemFor(child.id)?'true':null" [attr.aria-describedby]="describedBy(child.id)" (change)="changeChoice(child.id,$event)" (blur)="touch()"><option value="none" [selected]="!knownChoice(child)" disabled>{{'値を選択' | uiMessage}}</option>@for(option of field(child)?.options??[];track option.value){<option [value]="'choice:'+option.value" [selected]="option.value===child.value">{{option.label}}</option>}</select>}@else{<input class="ui-field-control" type="text" [id]="domId(child.id)+'-value'" [value]="valueText(child.value)" [attr.inputmode]="field(child)?.type==='number'?'decimal':null" [placeholder]="field(child)?.type==='date'?'YYYY-MM-DD':''" [disabled]="unavailable()" [attr.aria-invalid]="problemFor(child.id)?'true':null" [attr.aria-describedby]="describedBy(child.id)" (input)="changeValue(child.id,$event)" (blur)="touch()">}}@if(problemFor(child.id)){<p class="ui-filter-error" [id]="domId(child.id)+'-error'">{{problemFor(child.id)}}</p>}</div>}<button uiAction type="button" [attr.aria-label]="uiEffective_removeLabel()+' '+(child.type==='group'?uiEffective_groupLabel():field(child)?.label??uiEffective_fieldLabel())" [disabled]="unavailable()" (click)="remove(child.id,node.id)">{{uiEffective_removeLabel()}}</button></li>}</ol>@if(!node.children.length){<p class="ui-filter-hint">{{uiEffective_emptyGroupLabel()}}</p>}<div class="ui-filter-actions"><button uiAction type="button" [id]="domId(node.id)+'-add'" [disabled]="unavailable()||!definitions().length" (click)="addRule(node.id)">{{uiEffective_addRuleLabel()}}</button><button uiAction type="button" [disabled]="unavailable()" (click)="addGroup(node.id)">{{uiEffective_addGroupLabel()}}</button></div></fieldset></ng-template>`,
 styles: `:host{display:block;min-inline-size:0;max-inline-size:100%;}:host([hidden]){display:none;}section,.ui-filter-group,.ui-filter-rule{min-inline-size:0;overflow-wrap:anywhere;}.ui-filter-group{box-sizing:border-box;margin-block:var(--ui-space-field);padding:var(--ui-space-control-x);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);}.ui-filter-group .ui-filter-group{padding-inline:0;border-inline:0;}legend{max-inline-size:100%;font-weight:var(--ui-weight-control);}ol{padding-inline-start:0;list-style:none;margin:0;}li{min-inline-size:0;border-block-start:var(--ui-border-control) solid var(--ui-color-border);padding-block:var(--ui-space-control-gap);}.ui-filter-rule{display:grid;gap:var(--ui-space-control-gap);}.ui-filter-rule input,.ui-filter-rule select,.ui-filter-group>select{box-sizing:border-box;inline-size:100%;max-inline-size:100%;min-inline-size:0;}.ui-filter-actions{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);margin-block-start:var(--ui-space-control-gap);}.ui-filter-error{color:var(--ui-color-danger);}.ui-filter-hint{font-size:var(--ui-text-small);color:var(--ui-color-muted);}` })
export class FilterBuilder extends ValueControl<FilterGroup> implements Validator {
 private readonly uiDiagnostic_FilterBuilder=(()=>{const text=injectUiDiagnosticText();return (value:string|null):string|null=>value===null?null:text(value);})();

 private readonly uiRuntimeText_FilterBuilder=injectUiRuntimeText();

 protected readonly uiText_FilterBuilder=injectUiText();
 protected readonly emptyValue = emptyFilter();
 readonly fields = input<readonly FilterField[]>([]);
 protected readonly definitions = computed(() => filterProblems(emptyFilter(), this.fields()).length ? [] : this.fields());
 private readonly fieldsKey = computed(() => JSON.stringify(this.definitions().map(field => ({ id: field.id, label: field.label, type: field.type, ...(field.type === 'choice' ? { options: (field.options ?? []).map(option => ({ value: option.value, label: option.label })) } : {}) }))));
 readonly groupLabel = input<string>();
 protected readonly uiEffective_groupLabel=uiLocaleComputed(()=>this.groupLabel()??this.uiText_FilterBuilder('入れ子の条件'));
 readonly matchLabel = input<string>();
 protected readonly uiEffective_matchLabel=uiLocaleComputed(()=>this.matchLabel()??this.uiText_FilterBuilder('条件の結合'));
 readonly fieldLabel = input<string>();
 protected readonly uiEffective_fieldLabel=uiLocaleComputed(()=>this.fieldLabel()??this.uiText_FilterBuilder('項目'));
 readonly operatorLabel = input<string>();
 protected readonly uiEffective_operatorLabel=uiLocaleComputed(()=>this.operatorLabel()??this.uiText_FilterBuilder('演算子'));
 readonly valueLabel = input<string>();
 protected readonly uiEffective_valueLabel=uiLocaleComputed(()=>this.valueLabel()??this.uiText_FilterBuilder('値'));
 readonly addRuleLabel = input<string>();
 protected readonly uiEffective_addRuleLabel=uiLocaleComputed(()=>this.addRuleLabel()??this.uiText_FilterBuilder('条件を追加'));
 readonly addGroupLabel = input<string>();
 protected readonly uiEffective_addGroupLabel=uiLocaleComputed(()=>this.addGroupLabel()??this.uiText_FilterBuilder('条件グループを追加'));
 readonly removeLabel = input<string>();
 protected readonly uiEffective_removeLabel=uiLocaleComputed(()=>this.removeLabel()??this.uiText_FilterBuilder('除去'));
 readonly saveLabel = input<string>();
 protected readonly uiEffective_saveLabel=uiLocaleComputed(()=>this.saveLabel()??this.uiText_FilterBuilder('条件を保存'));
 readonly clearLabel = input<string>();
 protected readonly uiEffective_clearLabel=uiLocaleComputed(()=>this.clearLabel()??this.uiText_FilterBuilder('条件を解除'));
 readonly restoreLabel = input<string>();
 protected readonly uiEffective_restoreLabel=uiLocaleComputed(()=>this.restoreLabel()??this.uiText_FilterBuilder('保存した条件へ戻す'));
 readonly clearSavedLabel = input<string>();
 protected readonly uiEffective_clearSavedLabel=uiLocaleComputed(()=>this.clearSavedLabel()??this.uiText_FilterBuilder('保存済み条件を除去'));
 readonly pendingLabel = input<string>();
 protected readonly uiEffective_pendingLabel=uiLocaleComputed(()=>this.pendingLabel()??this.uiText_FilterBuilder('保存結果を確認しています。'));
 readonly emptyGroupLabel = input<string>();
 protected readonly uiEffective_emptyGroupLabel=uiLocaleComputed(()=>this.emptyGroupLabel()??this.uiText_FilterBuilder('未設定のグループは絞り込み条件に使いません。'));
 readonly saveRequested = output<FilterSaveRequest>();
 readonly savedCleared = output<void>();
 protected readonly root = computed(() => this.uiDiagnostic_FilterBuilder(filterStructureError(this.current())) ? this.emptyValue : this.current());
 protected readonly problems = computed(() => this.issues(this.current()));
 protected readonly problemMap = computed(() => new Map(this.problems().map(problem => [problem.nodeId, problem.message])));
 private readonly saveError = signal('');
 protected readonly rootProblem = computed(() => this.saveError() || this.problemMap().get(this.root().id) || this.problemMap().get('root') || '');
 protected readonly pending = signal<FilterSaveRequest | null>(null);
 protected readonly resultMessage = uiMessageState('');
 protected readonly savedSnapshot = signal<FilterGroup | null>(null);
 protected readonly unsaved = computed(() => !this.savedSnapshot() || this.key()!==JSON.stringify(cloneFilter(this.savedSnapshot()!)));
 protected readonly unavailable = computed(() => this.blocked() || this.readonly() || !!this.pending());
 private readonly destroy = inject(DestroyRef);
 private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
 private sequence = 0;
 private requestSequence = 0;
 private pendingFocus: string | null = null;
 private pendingKey = '';
 private pendingFieldsKey = '';
 private validatorChanged: () => void = () => {};
 constructor() {
  super(); afterRenderEffect(() => {
   this.current(); this.fields(); this.required();
   if (!this.controlId().trim() || /\s/.test(this.controlId()) || ![this.label(), this.uiEffective_groupLabel(), this.uiEffective_matchLabel(), this.uiEffective_fieldLabel(), this.uiEffective_operatorLabel(), this.uiEffective_valueLabel(), this.uiEffective_addRuleLabel(), this.uiEffective_addGroupLabel(), this.uiEffective_removeLabel(), this.uiEffective_saveLabel(), this.uiEffective_clearLabel(), this.uiEffective_restoreLabel(), this.uiEffective_clearSavedLabel(), this.uiEffective_pendingLabel(), this.uiEffective_emptyGroupLabel()].every(value=>value.trim())) throw new Error('FilterBuilder requires nonempty labels and a controlId without whitespace.');
   const request = this.pending();
   untracked(() => {
    this.validatorChanged();
    if (request) this.invalidateChangedRequest();
    if (this.pendingFocus && (this.element.ownerDocument.activeElement === this.element.ownerDocument.body || this.element.contains(this.element.ownerDocument.activeElement))) {
     const target = this.element.querySelector<HTMLElement>('#'+CSS.escape(this.pendingFocus)); if (canFocus(target)) target.focus();
    }
    this.pendingFocus = null;
   });
  });
 }
 override writeValue(value:unknown):void { super.writeValue(value);this.pending.set(null);this.saveError.set('');this.resultMessage.set(''); }
 /** Invalidate UI acknowledgement before an unapplied parent change. The app owns any I/O cancellation. */
 invalidatePending():void {if(this.destroy.destroyed)return;this.pending.set(null);this.saveError.set('');this.resultMessage.set('');}
 private invalidateChangedRequest():boolean {if(this.problems().length||this.fieldsKey()!==this.pendingFieldsKey||this.key()!==this.pendingKey){this.pending.set(null);this.saveError.set('');this.resultMessage.setMessage([() => this.uiRuntimeText_FilterBuilder('条件が変更されたため、前の保存結果は現在の編集へ適用しません。')]);return true;}return false;}
 private issues(value:unknown) {const errors=filterProblems(value,this.fields());if(errors.length||!this.required())return errors;const count=(node:FilterNode):number=>node.type==='rule'?1:node.children.reduce((sum,child)=>sum+count(child),0);return count(value as FilterGroup)?[]:[{nodeId:(value as FilterGroup).id,message:this.uiRuntimeText_FilterBuilder('条件を追加してください。')}];}
 protected coerce(value: unknown): FilterGroup { return value === null || value === undefined ? emptyFilter() : value as FilterGroup; }
 protected domId(id: string): string { return this.controlId()+'-'+encodeURIComponent(id); }
 protected field(node: FilterNode): FilterField | undefined { return node.type==='rule'?this.definitions().find(field=>field.id===node.field):undefined; }
 protected knownChoice(node: FilterRule): boolean { return !!this.field(node)?.options?.some(option=>option.value===node.value); }
 protected operators(node: FilterRule): readonly FilterOperator[] { return filterOperators(this.field(node)?.type??'text'); }
 protected operatorText(operator: FilterOperator): string { return operatorLabels[operator]; }
 protected valueText(value: unknown): string { return value===undefined||value===null?'':String(value); }
 protected describedBy(id: string): string | null { return [this.hint() ? this.controlId()+'-hint' : '', this.problemFor(id) ? this.domId(id)+'-error' : ''].filter(Boolean).join(' ') || null; }
 protected problemFor(id: string): string { return this.problemMap().get(id)??''; }
 private key(): string { return this.uiDiagnostic_FilterBuilder(filterStructureError(this.current())) ? 'invalid' : JSON.stringify(cloneFilter(this.current())); }
 private mutate(id: string, update: (node: FilterNode)=>FilterNode): void { if (this.unavailable()) return; this.resultMessage.set('');this.saveError.set(''); this.commit(editFilter(this.root(),id,update)); }
 protected changeMatch(id:string,event:Event):void {const match=this.text(event);if(match==='and'||match==='or')this.mutate(id,node=>node.type==='group'?{...node,match}:node);}
 protected changeField(id:string,event:Event):void {const field=this.text(event).slice(6),definition=this.definitions().find(candidate=>candidate.id===field);if(definition)this.mutate(id,node=>node.type==='rule'?{...node,field,operator:filterOperators(definition.type)[0]}:node);}
 protected changeOperator(id:string,event:Event):void {const operator=this.text(event) as FilterOperator;this.mutate(id,node=>node.type==='rule'&&this.operators(node).includes(operator)?{...node,operator}:node);}
 protected changeValue(id:string,event:Event):void {const value=this.text(event);this.mutate(id,node=>node.type==='rule'?{...node,value}:node);}
 protected changeBoolean(id:string,event:Event):void {const value=this.text(event);if(value==='true'||value==='false')this.mutate(id,node=>node.type==='rule'?{...node,value:value==='true'}:node);}
 protected changeChoice(id:string,event:Event):void {const value=this.text(event).slice(7);this.mutate(id,node=>node.type==='rule'&&this.field(node)?.options?.some(option=>option.value===value)?{...node,value}:node);}
 private nextId(kind:string):string {const ids=new Set<string>(),walk=(node:FilterNode)=>{ids.add(node.id);if(node.type==='group')node.children.forEach(walk);};walk(this.root());let id:string;do{id=this.controlId()+'-'+kind+'-'+(++this.sequence);}while(ids.has(id));return id;}
 protected addRule(parent:string):void {const field=this.definitions()[0];if(!field||this.unavailable())return;const rule:FilterRule={type:'rule',id:this.nextId('rule'),field:field.id,operator:filterOperators(field.type)[0],value:field.type==='text'?'':undefined};this.pendingFocus=this.domId(rule.id)+'-field';this.mutate(parent,node=>node.type==='group'?{...node,children:[...node.children,rule]}:node);}
 protected addGroup(parent:string):void {if(this.unavailable())return;const group=emptyFilter(this.nextId('group'));this.pendingFocus=this.domId(group.id)+'-match';this.mutate(parent,node=>node.type==='group'?{...node,children:[...node.children,group]}:node);}
 protected remove(id:string,parent:string):void {if(this.unavailable())return;this.pendingFocus=this.domId(parent)+'-add';this.commit(removeFilter(this.root(),id));}
 protected clear():void {if(this.unavailable())return;this.resultMessage.set('');this.saveError.set('');this.commit(emptyFilter(this.root().id));}
 protected restoreSaved():void {if(this.unavailable()||!this.savedSnapshot())return;this.resultMessage.set('');this.saveError.set('');this.commit(cloneFilter(this.savedSnapshot()!));}
 protected clearSaved():void {if(this.unavailable())return;this.savedSnapshot.set(null);this.resultMessage.set('');this.saveError.set('');this.savedCleared.emit();}
 protected save():void {if(this.unavailable()||this.problems().length||!this.unsaved())return;this.touch();const request={requestId:++this.requestSequence,value:cloneFilter(this.current())};this.pendingKey=this.key();this.pendingFieldsKey=this.fieldsKey();this.pending.set(request);this.resultMessage.set('');this.saveError.set('');this.saveRequested.emit(request);}
 completeSave(requestId:number,message=this.uiRuntimeText_FilterBuilder('条件を保存しました。')):boolean {const request=this.pending();if(this.destroy.destroyed||!request||request.requestId!==requestId||!message.trim()||this.invalidateChangedRequest())return false;this.savedSnapshot.set(cloneFilter(request.value));this.pending.set(null);this.saveError.set('');this.resultMessage.set(message);return true;}
 failSave(requestId:number,message:string):boolean {if(this.destroy.destroyed||this.pending()?.requestId!==requestId||!message.trim()||this.invalidateChangedRequest())return false;this.pending.set(null);this.resultMessage.set('');this.saveError.set(message);return true;}
 registerOnValidatorChange(callback:()=>void):void {this.validatorChanged=callback;}
 validate(control:AbstractControl):ValidationErrors|null {const errors=this.issues(this.coerce(control.value));return errors.length?{filterBuilder:errors}:null;}
}
