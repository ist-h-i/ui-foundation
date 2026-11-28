import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessageText,UiStableMessagePipe} from './locale';
import {afterRenderEffect,booleanAttribute,ChangeDetectionStrategy,Component,computed,DestroyRef,effect,forwardRef,inject,input,output,signal,untracked} from '@angular/core';
import {NG_VALIDATORS,NG_VALUE_ACCESSOR,type AbstractControl,type ValidationErrors,type Validator} from '@angular/forms';
import {FormField,FieldControl} from './form-field';
import {canFocus} from './focus';
import type {OverlayCloseReason} from './overlay';
import {TreePopupControl,treePopupStyles} from './tree-popup-control';
import {nextTreeRequestId} from './tree-load-sequence';
import {cascaderPathProblem,treeBeginLoad,treeBranch,treeCancelLoads,treeEntries,treeEntry,treeFailLoad,treeNodes,treePath,treeResolveLoad,treeUnloaded,treeWithLoads,type TreeLoadCancellation,type TreeLoadRequest,type TreeLoads,type TreeNode} from './tree-model';

@Component({selector:'ui-cascader',standalone:true,imports:[FormField,FieldControl,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>Cascader),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>Cascader),multi:true}],
 template:`<div (focusout)="leftPopupControl($event)"><ui-form-field [controlId]="controlId()" [label]="label()" [labelPosition]="labelPosition()" [hintPosition]="hintPosition()" [controlCharacters]="controlCharacters()" [required]="required()" [hint]="hint()" [error]="error()||problem()" [describedBy]="controlId()+'-state'">
 <input #editor uiFieldControl [uiFieldRequired]="false" class="ui-tree-popup-editor" type="text" role="combobox" aria-haspopup="dialog" aria-autocomplete="none" autocomplete="off" [value]="selectionText()" [placeholder]="uiEffective_placeholder()" [readOnly]="true" [disabled]="blocked()" [attr.aria-required]="required()?'true':null" [attr.aria-readonly]="readonly()?'true':null" [attr.aria-expanded]="popupOpen()" [attr.aria-controls]="controlId()+'-popup'" (click)="togglePopup()" (keydown)="editorKey($event)">
 @for(id of current();track $index){<input type="hidden" [attr.name]="name()||null" [value]="id" [disabled]="disabledState()">}
 <div class="ui-tree-popup-actions"><button type="button" [disabled]="blocked()||readonly()" (click)="showPopup()">{{'uiFoundation.cascader.chooseForLabel' | uiStableMessage:{label:label()} }}</button><button type="button" [disabled]="blocked()||readonly()||!current().length" (click)="clear()">{{'uiFoundation.cascader.clearForLabel' | uiStableMessage:{label:label()} }}</button></div>
 <p #state class="ui-tree-popup-state" tabindex="-1" [id]="controlId()+'-state'" role="status">{{busy()?('uiFoundation.cascader.working' | uiStableMessage):disabledState()?('uiFoundation.cascader.selectionIsDisabled' | uiStableMessage):readonly()?('uiFoundation.cascader.selectionIsReadOnly' | uiStableMessage):allowIntermediate()?('uiFoundation.cascader.youCanAlsoSelectIntermediateItems' | uiStableMessage):('uiFoundation.cascader.selectALeafItem' | uiStableMessage)}}</p>
 <div #popup class="ui-tree-popup" popover="manual" role="dialog" aria-modal="false" [hidden]="!popupOpen()" [id]="controlId()+'-popup'" [attr.aria-label]="('uiFoundation.cascader.selectALevelForLabel' | uiStableMessage:{label:label()})">
  <p>{{ 'uiFoundation.cascader.optionPathLabel' | uiStableMessage:{path:draftText()||('uiFoundation.cascader.noSelection' | uiStableMessage)} }}</p><p class="ui-tree-popup-state">{{'uiFoundation.cascader.useUpAndDownToMoveWithinALevelUseRightToMoveToAChildLevelOrLeftToReturnToTheParen' | uiStableMessage}}</p>
  <div class="ui-cascader-columns">@for(column of columns();track column.level){<fieldset class="ui-cascader-column" [attr.data-cascader-level]="column.level"><legend>{{column.level===0?('uiFoundation.cascader.topLevel' | uiStableMessage):('uiFoundation.cascader.childItemsForLabel' | uiStableMessage:{label:column.parentLabel})}}</legend><ul>@for(node of column.nodes;track node.id){<li><button type="button" [attr.data-cascader-id]="node.id" [attr.aria-label]="node.label" [disabled]="blocked()||disabledNode(node.id)" [attr.aria-pressed]="draft()[column.level]===node.id" [attr.aria-expanded]="branch(node)?draft()[column.level]===node.id:null" (click)="choose(node,column.level)" (keydown)="columnKey($event,node,column.level)">{{node.label}}@if(branch(node)){<span class="ui-cascader-marker" aria-hidden="true"> ›</span>}</button></li>}</ul></fieldset>}</div>
  @if(pending();as load){@if(load.status==='loading'){<p role="status">{{'uiFoundation.cascader.loadingChildItemsForLabel' | uiStableMessage:{label:draftText()} }}</p>}@if(load.status==='error'){<p class="ui-tree-popup-error" role="status">{{load.message}}</p><button type="button" [disabled]="blocked()" (click)="requestLoad(load.nodeId)">{{'uiFoundation.cascader.retryForLabel' | uiStableMessage:{label:nodeLabel(load.nodeId)} }}</button>}}
  <div class="ui-tree-popup-actions"><button type="button" [disabled]="blocked()||readonly()||!canConfirm()" (click)="confirm()">{{'uiFoundation.cascader.confirmThisPath' | uiStableMessage}}</button><button type="button" data-cascader-close (click)="cancel()">{{'uiFoundation.cascader.close' | uiStableMessage}}</button></div>
 </div></ui-form-field></div>`,styles:treePopupStyles})
export class Cascader<T = unknown> extends TreePopupControl implements Validator {
 private readonly uiRuntimeText_Cascader=injectUiRuntimeText();

 protected readonly uiText_Cascader=injectUiMessageText();
 readonly nodes=input<readonly TreeNode<T>[]>([]);readonly allowIntermediate=input(false,{transform:booleanAttribute});readonly placeholder=input<string>();
 protected readonly uiEffective_placeholder=uiLocaleComputed(()=>this.placeholder()??this.uiText_Cascader("uiFoundation.cascader.selectALevelForCascader"));readonly loadRequested=output<TreeLoadRequest>();readonly loadCancelled=output<TreeLoadCancellation>();
 protected readonly branch=treeBranch;protected readonly draft=signal<readonly string[]>([]);private readonly loads=signal<TreeLoads<T>>({});private previousSource:readonly TreeNode<T>[]|null=null;private validatorChanged:()=>void=()=>{};private readonly pendingFocus=signal<string|null>(null);private destroyed=false;private popupFocusOwned=false;
 readonly resolvedNodes=computed(()=>treeWithLoads(treeNodes(this.nodes()),this.loads()));
 protected readonly selectionText=computed(()=>this.current().map(id=>this.nodeLabel(id)).join(' / '));protected readonly draftText=computed(()=>this.draft().map(id=>this.nodeLabel(id)).join(' / '));protected readonly pending=computed(()=>this.loads()[this.draft().at(-1)??'']??null);
 protected readonly problem=computed(()=>{const problem=cascaderPathProblem(this.resolvedNodes(),this.current(),this.allowIntermediate());return problem==='path'?this.uiRuntimeText_Cascader("uiFoundation.cascader.somePathsAreUnavailableOrHaveBeenDeletedReviewYourSelection"):problem==='disabled'?this.uiRuntimeText_Cascader("uiFoundation.cascader.thePathContainsADisabledItem"):problem==='unselectable'?this.uiRuntimeText_Cascader("uiFoundation.cascader.thisItemCannotBeSelected"):problem==='intermediate'?this.uiRuntimeText_Cascader("uiFoundation.cascader.onlyLeafItemsCanBeSelectedSelectAnItemAtTheEndOfThePath"):'';});
 protected readonly canConfirm=computed(()=>this.draft().length>0&&cascaderPathProblem(this.resolvedNodes(),this.draft(),this.allowIntermediate())===null);
 protected readonly columns=computed(()=>{const columns:{level:number;parentLabel:string;nodes:readonly TreeNode<T>[]}[]=[];let children=this.resolvedNodes(),label='';for(let level=0;;level++){columns.push({level,parentLabel:label,nodes:children});const chosen=children.find(node=>node.id===this.draft()[level]);if(!chosen?.children?.length)break;children=chosen.children;label=chosen.label;}return columns;});
 constructor(){super();
  const focused=(event:FocusEvent)=>{this.popupFocusOwned=this.popup()?.nativeElement.contains(event.target as Node)??false;};const exited=(event:FocusEvent)=>{if(event.relatedTarget&&!this.popupHost.contains(event.relatedTarget as Node))this.popupFocusOwned=false;};this.popupHost.addEventListener('focusin',focused);this.popupHost.addEventListener('focusout',exited);
  effect(()=>{const source=this.nodes();untracked(()=>{if(this.previousSource&&this.previousSource!==source){this.invalidateLoads('source-change');this.loads.set({});}this.previousSource=source;});});effect(()=>{this.resolvedNodes();this.allowIntermediate();this.required();this.validatorChanged();});
  afterRenderEffect(()=>{const id=this.pendingFocus();this.columns();this.canConfirm();if(!this.popupOpen())return;const popup=this.popup()?.nativeElement;if(!popup)return;if(id&&this.popupFocusOwned){const target=this.candidate(id);if(canFocus(target)){target.focus();this.pendingFocus.set(null);}}
   const active=this.popupHost.ownerDocument.activeElement;if(this.popupFocusOwned&&(!active||active===this.popupHost.ownerDocument.body||this.popupHost.contains(active)&&!canFocus(active as HTMLElement))){let target:HTMLButtonElement|null=null;for(const key of [...this.draft()].reverse()){const candidate=this.candidate(key);if(canFocus(candidate)){target=candidate;break;}}const fallback=target??popup.querySelector<HTMLButtonElement>('[data-cascader-id]:not(:disabled)')??popup.querySelector<HTMLButtonElement>('[data-cascader-close]');if(canFocus(fallback)){fallback.focus({preventScroll:true});this.pendingFocus.set(null);}}
  });
  inject(DestroyRef).onDestroy(()=>{this.destroyed=true;this.invalidateLoads('destroy');this.popupHost.removeEventListener('focusin',focused);this.popupHost.removeEventListener('focusout',exited);});
 }
 protected nodeLabel(id:string):string{return treeEntry(this.resolvedNodes(),id)?.node.label??this.uiRuntimeText_Cascader("uiFoundation.cascader.unavailableItemLabel",{value:id});}
 protected disabledNode(id:string):boolean{return treeEntry(this.resolvedNodes(),id)?.disabled===true;}
 private candidate(id:string):HTMLButtonElement|null{return [...(this.popup()?.nativeElement.querySelectorAll<HTMLButtonElement>('[data-cascader-id]')??[])].find(element=>element.getAttribute('data-cascader-id')===id)??null;}
 protected focusPopup():void{this.draft.set(this.current());const popup=this.popup()?.nativeElement,target=popup?.querySelector<HTMLButtonElement>('[data-cascader-id]:not(:disabled)')??popup?.querySelector<HTMLButtonElement>('[data-cascader-close]')??null;if(canFocus(target))target.focus();}
 protected popupClosed(_reason:OverlayCloseReason):void{this.pendingFocus.set(null);this.invalidateLoads('close');}
 protected choose(node:TreeNode<T>,level:number):void{if(this.blocked()||this.readonly()||this.disabledNode(node.id))return;this.draft.set([...this.draft().slice(0,level),node.id]);if(treeUnloaded(node))this.requestLoad(node.id);}
 protected requestLoad(id:string):void{if(this.blocked()||this.readonly())return;const next=treeBeginLoad(this.nodes(),this.loads(),id,nextTreeRequestId());if(next.request){this.candidate(id)?.focus({preventScroll:true});this.loads.set(next.loads);this.loadRequested.emit(next.request);}}
 protected confirm():void{if(!this.canConfirm()||this.blocked()||this.readonly())return;this.commit(this.draft());this.closePopup();this.touch();}
 protected cancel():void{this.closePopup();}
 protected clear():void{if(this.blocked()||this.readonly())return;this.commit([]);this.draft.set([]);this.invalidateLoads('reset');this.closePopup();this.editor()?.nativeElement.focus();this.touch();}
 override writeValue(value:unknown):void{this.invalidateLoads('reset');super.writeValue(value);this.draft.set(this.current());}
 resolveLoad(requestId:number,children:readonly TreeNode<T>[]):boolean{const next=treeResolveLoad(this.nodes(),this.loads(),requestId,children);if(!next)return false;this.loads.set(next);return true;}
 failLoad(requestId:number,message:string):boolean{const next=treeFailLoad(this.loads(),requestId,message);if(!next)return false;this.loads.set(next);return true;}
 invalidateLoads(reason:TreeLoadCancellation['reason']='invalidate'):void{const next=treeCancelLoads(this.loads(),null,reason);this.loads.set(next.loads);if(!this.destroyed)for(const cancellation of next.cancelled)this.loadCancelled.emit(cancellation);}
 protected columnKey(event:KeyboardEvent,node:TreeNode<T>,level:number):void{
  if(event.defaultPrevented||event.isComposing||event.keyCode===229)return;const rtl=this.popupHost.ownerDocument.defaultView?.getComputedStyle(this.popupHost).direction==='rtl',openKey=rtl?'ArrowLeft':'ArrowRight',closeKey=rtl?'ArrowRight':'ArrowLeft';
  const siblings=this.columns()[level]?.nodes.filter(item=>!this.disabledNode(item.id))??[],index=siblings.findIndex(item=>item.id===node.id);
  const focus=(id:string)=>this.candidate(id)?.focus();
  if(['ArrowUp','ArrowDown','Home','End',openKey,closeKey].includes(event.key))event.preventDefault();
  if(event.key==='ArrowUp')focus(siblings[Math.max(0,index-1)]!.id);else if(event.key==='ArrowDown')focus(siblings[Math.min(siblings.length-1,index+1)]!.id);else if(event.key==='Home')focus(siblings[0]!.id);else if(event.key==='End')focus(siblings.at(-1)!.id);
  else if(event.key===openKey){this.choose(node,level);const child=treeEntry(this.resolvedNodes(),node.id)?.node.children?.find(item=>!this.disabledNode(item.id));if(child)this.pendingFocus.set(child.id);}
  else if(event.key===closeKey&&level>0){const parent=this.draft()[level-1];this.draft.set(this.draft().slice(0,level));if(parent)focus(parent);}
 }
 registerOnValidatorChange(callback:()=>void):void{this.validatorChanged=callback;}
 validate(control:AbstractControl):ValidationErrors|null{const path=this.coerce(control.value);if(this.required()&&!path.length)return {required:true};const problem=cascaderPathProblem(this.resolvedNodes(),path,this.allowIntermediate());return problem?{cascader:problem}:null;}
}
