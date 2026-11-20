import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessageText,UiStableMessagePipe} from './locale';
import {afterRenderEffect,booleanAttribute, ChangeDetectionStrategy, Component, computed,DestroyRef, effect, forwardRef,inject, input, output, signal, viewChild, ElementRef} from '@angular/core';
import {NG_VALIDATORS, NG_VALUE_ACCESSOR, type AbstractControl, type ValidationErrors, type Validator} from '@angular/forms';
import {FormField,FieldControl} from './form-field';
import type {OverlayCloseReason} from './overlay';
import {Tree} from './tree';
import {TreePopupControl,treePopupStyles} from './tree-popup-control';
import {treeComplete,treeEntries,treeEntry,treeSelectionProblem,treeToggleCheck, type TreeLoadCancellation, type TreeLoadRequest, type TreeNode} from './tree-model';

@Component({selector:'ui-tree-select',standalone:true,imports:[FormField,FieldControl,Tree,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>TreeSelect),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>TreeSelect),multi:true}],
 template:`<div (focusout)="leftPopupControl($event)"><ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [required]="required()" [hint]="hint()" [error]="error()||problem()" [describedBy]="controlId()+'-state'">
 <input #editor uiFieldControl [uiFieldRequired]="false" class="ui-tree-popup-editor" type="text" role="combobox" aria-haspopup="dialog" aria-autocomplete="none" autocomplete="off" [value]="selectionText()" [placeholder]="uiEffective_placeholder()" [readOnly]="true" [disabled]="blocked()" [attr.aria-required]="required()?'true':null" [attr.aria-readonly]="readonly()?'true':null" [attr.aria-expanded]="popupOpen()" [attr.aria-controls]="controlId()+'-popup'" (click)="togglePopup()" (keydown)="editorKey($event)">
 @for(id of current();track $index){<input type="hidden" [attr.name]="name()||null" [value]="id" [disabled]="disabledState()">}
 <div class="ui-tree-popup-actions"><button type="button" [disabled]="blocked()||readonly()" (click)="showPopup()">{{'uiFoundation.treeSelect.chooseForLabel' | uiStableMessage:{label:label()} }}</button><button type="button" [disabled]="blocked()||readonly()||!current().length" (click)="clear()">{{'uiFoundation.treeSelect.clearForLabel' | uiStableMessage:{label:label()} }}</button></div>
 <ul class="ui-tree-popup-values" [attr.aria-label]="('uiFoundation.treeSelect.selectedItemsForLabel' | uiStableMessage:{label:label()})">@for(id of current();track $index){<li><span>{{nodeLabel(id)}}</span>@if(multiple()){<button type="button" [disabled]="blocked()||readonly()" [attr.aria-label]="('uiFoundation.treeSelect.deselectForLabel' | uiStableMessage:{label:nodeLabel(id)})" (click)="remove(id)">{{'uiFoundation.treeSelect.clearForTreeSelect' | uiStableMessage}}</button>}</li>}</ul>
 <p #state class="ui-tree-popup-state" tabindex="-1" [id]="controlId()+'-state'" role="status">{{busy()?('uiFoundation.treeSelect.working' | uiStableMessage):disabledState()?('uiFoundation.treeSelect.selectionIsDisabled' | uiStableMessage):readonly()?('uiFoundation.treeSelect.selectionIsReadOnly' | uiStableMessage):('uiFoundation.treeSelect.selectedCount' | uiStableMessage:{count:current().length})}}</p>
 <div #popup class="ui-tree-popup" popover="manual" role="dialog" aria-modal="false" [hidden]="!popupOpen()" [id]="controlId()+'-popup'" [attr.aria-label]="('uiFoundation.treeSelect.selectForLabel' | uiStableMessage:{label:label()})">
  @if(searchable()){<label [for]="controlId()+'-search'">{{'uiFoundation.treeSelect.searchTheTreeForLabel' | uiStableMessage:{label:label()} }}</label><input #search class="ui-field-control" [id]="controlId()+'-search'" type="search" autocomplete="off" [value]="query()" (input)="query.set(text($event))" (keydown)="searchKey($event)">}
  <ui-tree [locale]="effectiveLocale()" #tree [treeId]="controlId()+'-tree'" [label]="('uiFoundation.treeSelect.suggestionsForLabel' | uiStableMessage:{label:label()})" [nodes]="nodes()" [query]="query()" [expandedIds]="expanded()" (expandedIdsChange)="expanded.set($event)" [selectionMode]="multiple()?'none':'single'" [selectedIds]="multiple()?emptyValue:current()" (selectedIdsChange)="selected($event)" [checkable]="multiple()" [checkedIds]="multiple()?current():emptyValue" [linkChecks]="linkSelection()" (checkedIdsChange)="selected($event)" [disabled]="disabledState()" [busy]="busy()" [readonly]="readonly()" [checkLabel]="'uiFoundation.treeSelect.selectedItem' | uiStableMessage" (loadRequested)="loadRequested.emit($event)" (loadCancelled)="loadCancelled.emit($event)"><ng-content /></ui-tree>
  <div class="ui-tree-popup-actions"><button type="button" (click)="done()">{{'uiFoundation.treeSelect.doneSelecting' | uiStableMessage}}</button></div>
 </div>
 </ui-form-field></div>`,styles:treePopupStyles})
export class TreeSelect<T = unknown> extends TreePopupControl implements Validator {
 private readonly uiRuntimeText_TreeSelect=injectUiRuntimeText();

 protected readonly uiText_TreeSelect=injectUiMessageText();
 readonly nodes=input<readonly TreeNode<T>[]>([]);readonly multiple=input(false,{transform:booleanAttribute});readonly linkSelection=input(true,{transform:booleanAttribute});readonly searchable=input(true,{transform:booleanAttribute});readonly placeholder=input<string>();
 protected readonly uiEffective_placeholder=uiLocaleComputed(()=>this.placeholder()??this.uiText_TreeSelect("uiFoundation.treeSelect.selectAnOption"));
 readonly loadRequested=output<TreeLoadRequest>();readonly loadCancelled=output<TreeLoadCancellation>();protected readonly query=signal('');protected readonly expanded=signal<readonly string[]>([]);
 private readonly tree=viewChild<Tree<T>>('tree');private readonly search=viewChild<unknown,ElementRef<HTMLInputElement>>('search',{read:ElementRef});private validatorChanged:()=>void=()=>{};private searchFocusOwned=false;
 readonly resolvedNodes=computed(()=>this.tree()?.resolvedNodes()??this.nodes());
 protected readonly problem=computed(()=>{const problem=treeSelectionProblem(this.resolvedNodes(),this.current(),this.multiple()?'multiple':'single',this.multiple()&&this.linkSelection());return problem==='cardinality'?this.uiRuntimeText_TreeSelect("uiFoundation.treeSelect.selectOnlyOneItemInSingleSelectMode"):problem==='unknown'?this.uiRuntimeText_TreeSelect("uiFoundation.treeSelect.someSelectedItemsAreUnavailableOrHaveBeenDeletedReviewYourSelection"):problem==='disabled'?this.uiRuntimeText_TreeSelect("uiFoundation.treeSelect.aDisabledItemIsSelected"):problem==='unselectable'?this.uiRuntimeText_TreeSelect("uiFoundation.treeSelect.theSelectionContainsUnavailableItems"):problem==='incomplete'?this.uiRuntimeText_TreeSelect("uiFoundation.treeSelect.someChildrenOfTheSelectedNodesHaveYetToLoad"):problem==='duplicate'?this.uiRuntimeText_TreeSelect("uiFoundation.treeSelect.someSelectedItemsAreDuplicated"):'';});
 protected readonly selectionText=computed(()=>this.current().map(id=>this.nodeLabel(id)).join('、'));
 constructor(){super();effect(()=>{this.nodes();this.resolvedNodes();this.required();this.multiple();this.linkSelection();this.validatorChanged();});const focused=(event:FocusEvent)=>{this.searchFocusOwned=(event.target as HTMLElement).id===this.controlId()+'-search';};const exited=(event:FocusEvent)=>{if(event.relatedTarget&&!this.popupHost.contains(event.relatedTarget as Node))this.searchFocusOwned=false;};this.popupHost.addEventListener('focusin',focused);this.popupHost.addEventListener('focusout',exited);inject(DestroyRef).onDestroy(()=>{this.popupHost.removeEventListener('focusin',focused);this.popupHost.removeEventListener('focusout',exited);});afterRenderEffect(()=>{if(!this.searchable()&&this.popupOpen()&&this.searchFocusOwned){this.searchFocusOwned=false;this.tree()?.focusFirst();}});}
 protected nodeLabel(id:string):string{return treeEntries(this.resolvedNodes()).find(entry=>entry.node.id===id)?.node.label??this.uiRuntimeText_TreeSelect("uiFoundation.treeSelect.unavailableItemLabel",{value:id});}
 protected focusPopup():void{if(this.searchable())this.search()?.nativeElement.focus();else this.tree()?.focusFirst();}
 protected popupClosed(_reason:OverlayCloseReason):void{this.tree()?.invalidateLoads('close');}
 protected searchKey(event:KeyboardEvent):void{if(event.defaultPrevented||event.isComposing||event.keyCode===229)return;if(event.key==='ArrowDown'){event.preventDefault();this.tree()?.focusFirst();}}
 protected selected(ids:readonly string[]):void{if(this.blocked()||this.readonly())return;this.commit(ids);this.validatorChanged();if(!this.multiple()){this.closePopup();this.touch();}}
 protected done():void{this.closePopup();this.touch();}
 protected clear():void{if(this.blocked()||this.readonly())return;this.commit([]);this.query.set('');this.tree()?.invalidateLoads('reset');this.closePopup();this.editor()?.nativeElement.focus();this.touch();}
 protected remove(id:string):void{if(this.blocked()||this.readonly())return;const entry=treeEntry(this.resolvedNodes(),id);const ids=this.multiple()&&this.linkSelection()&&entry&&!entry.disabled&&entry.node.checkable!==false&&treeComplete(entry.node)?treeToggleCheck(this.resolvedNodes(),this.current(),id,false,true):this.current().filter(value=>value!==id);this.commit(ids);this.editor()?.nativeElement.focus();this.touch();}
 override writeValue(value:unknown):void{this.tree()?.invalidateLoads('reset');this.query.set('');super.writeValue(value);}
 resolveLoad(requestId:number,children:readonly TreeNode<T>[]):boolean{return this.tree()?.resolveLoad(requestId,children)??false;}
 failLoad(requestId:number,message:string):boolean{return this.tree()?.failLoad(requestId,message)??false;}
 invalidateLoads():void{this.tree()?.invalidateLoads();}
 registerOnValidatorChange(callback:()=>void):void{this.validatorChanged=callback;}
 validate(control:AbstractControl):ValidationErrors|null{const values=this.coerce(control.value);if(this.required()&&!values.length)return {required:true};const problem=treeSelectionProblem(this.resolvedNodes(),values,this.multiple()?'multiple':'single',this.multiple()&&this.linkSelection());return problem?{treeSelection:problem}:null;}
}
