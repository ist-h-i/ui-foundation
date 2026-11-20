import {uiMessageState} from './locale';
import {injectUiMessageText as injectUiRuntimeText} from './locale';
import {computed as uiLocaleComputed} from '@angular/core';
import {computed as localeComputed} from '@angular/core';
import {injectUiLocale,injectUiMessageText,UiStableMessagePipe} from './locale';
import {NgTemplateOutlet} from '@angular/common';
import {afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChild, DestroyRef, effect, ElementRef, inject, input, linkedSignal, output, signal, untracked} from '@angular/core';
import {canFocus} from './focus';
import {TreeItem} from './tree-item';
import {TreeNodeTemplate, type TreeNodeContext} from './tree-node-template';
import {nextTreeRequestId} from './tree-load-sequence';
import {treeBeginLoad, treeBranch, treeCancelLoads, treeCheckState, treeComplete, treeDomIdToken, treeEntries, treeEntry, treeFailLoad, treeFilter, treeNodes, treePath, treeResolveLoad, treeToggleCheck, treeUnloaded, treeVisible, treeWithLoads, type TreeCheckState, type TreeEntry, type TreeLoadCancellation, type TreeLoadRequest, type TreeLoads, type TreeNode} from './tree-model';

export type TreeSelectionMode = 'none' | 'single' | 'multiple';

export const treeStyles = `
 :host{display:block;min-inline-size:0;max-inline-size:100%;font:inherit;color:var(--ui-color-text);}
 :host([hidden]),[hidden]{display:none!important;}
 ul{list-style:none;padding:0;margin:0;min-inline-size:0;}
 ul[role='tree']{box-sizing:border-box;background:var(--ui-color-surface);font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);}
 ul[role='group']{padding-inline-start:var(--ui-space-control-x);}
 li[role='treeitem']{outline:none;min-inline-size:0;}
 .ui-tree-row{display:flex;align-items:flex-start;gap:var(--ui-space-control-gap);min-block-size:var(--ui-size-control);padding:var(--ui-space-control-y) var(--ui-space-control-gap);box-sizing:border-box;border-radius:var(--ui-radius-control);overflow-wrap:anywhere;cursor:pointer;}
 li[role='treeitem']:focus-visible>.ui-tree-row{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:calc(-1 * var(--ui-border-focus));}
 li[aria-selected='true']>.ui-tree-row{background:var(--ui-color-background);box-shadow:inset var(--ui-border-focus) 0 var(--ui-color-tab-selected);}
 .ui-tree-row[data-disabled='true']{color:var(--ui-color-muted);cursor:default;}
 .ui-tree-label{min-inline-size:0;flex:1;}
 .ui-tree-label small{display:block;font-size:var(--ui-text-small);color:var(--ui-color-muted);}
 button{font:inherit;color:inherit;background:var(--ui-color-surface);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);min-block-size:var(--ui-size-control);min-inline-size:var(--ui-size-control);cursor:pointer;overflow-wrap:anywhere;}
 button:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}
 button:disabled{cursor:default;color:var(--ui-color-muted);background:var(--ui-color-disabled-surface);}
 .ui-tree-check,.ui-tree-marker{flex:0 0 var(--ui-size-icon);inline-size:var(--ui-size-icon);text-align:center;}
 .ui-tree-check{cursor:pointer;}
 .ui-tree-status{margin:var(--ui-space-control-gap) 0;font-size:var(--ui-text-small);overflow-wrap:anywhere;}
 .ui-tree-error{color:var(--ui-color-danger);}
 .ui-tree-help{font-size:var(--ui-text-small);color:var(--ui-color-muted);margin-block:var(--ui-space-control-gap);}
 @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;}}
`;

@Component({selector:'ui-tree',standalone:true,imports:[NgTemplateOutlet,TreeItem,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 template:`<p class="ui-tree-help" [id]="treeId()+'-help'">{{'uiFoundation.tree.useUpAndDownToMoveUseRightToExpandOrLeftToReturnToTheParent' | uiStableMessage}}{{checkable()?('uiFoundation.tree.toggleKeyboardHint' | uiStableMessage:{label:uiEffective_checkLabel()}):''}}{{selectionMode()!=='none'?('uiFoundation.tree.selectKeyboardHint' | uiStableMessage:{label:uiEffective_selectionLabel()}):''}}</p>
 @if(query().trim() && incomplete()){<p class="ui-tree-help">{{'uiFoundation.tree.childrenThatHaveYetToLoadAreExcludedFromSearch' | uiStableMessage}}</p>}
 <ul role="tree" [attr.data-link-checks]="linkChecks()" [id]="treeId()" [attr.aria-label]="label()" [attr.aria-describedby]="treeId()+'-help'" [attr.aria-multiselectable]="selectionMode()==='multiple'||checkable()?'true':null" [attr.aria-busy]="busy()?'true':null" [attr.aria-disabled]="disabled()?'true':null" [attr.tabindex]="rows().length?null:0" (focusout)="left($event)">
  <ng-container [ngTemplateOutlet]="entries" [ngTemplateOutletContext]="{nodes:filtered()}" />
 </ul>
 @if(!rows().length){<p class="ui-tree-status">{{query().trim()?('uiFoundation.tree.noMatchingItems' | uiStableMessage):('uiFoundation.tree.noItems' | uiStableMessage)}}</p>}
 @if(problem()){<p class="ui-tree-status ui-tree-error" role="status">{{problem()}}</p>}
 <ng-template #entries let-nodes="nodes">@for(node of nodes;track node.id){@let row = rowFor(node.id);
  <li [uiTreeItem]="row" [id]="itemId(node.id)" [itemExpanded]="branch(node)?expanded(node.id):null" [itemDisabled]="disabled()||row.disabled" [itemSelected]="selectionMode()==='none'||node.selectable===false?null:selected().includes(node.id)" [itemChecked]="checkable()&&node.checkable!==false?checkState(node.id):null" [itemBusy]="loads()[node.id]?.status==='loading'" [itemTabIndex]="activeId()===node.id?0:-1" (focus)="focused(node.id)" (keydown)="key($event,node)" (click)="clicked($event,node)">
   <div class="ui-tree-row" [attr.data-disabled]="disabled()||row.disabled">
    @if(branch(node)){<button type="button" tabindex="-1" [disabled]="disabled()||busy()||row.disabled" [attr.aria-label]="expanded(node.id)?('uiFoundation.tree.collapseLabel' | uiStableMessage:{label:node.label}):('uiFoundation.tree.expandLabel' | uiStableMessage:{label:node.label})" (click)="toggleFromPointer($event,node)">{{expanded(node.id)?'−':'＋'}}</button>}@else{<span class="ui-tree-marker" aria-hidden="true">・</span>}
    @if(checkable()&&node.checkable!==false){<span class="ui-tree-check" aria-hidden="true" (click)="checkFromPointer($event,node)">{{checkState(node.id)==='true'?'☑':checkState(node.id)==='mixed'?'▣':'☐'}}</span>}
    <span class="ui-tree-label">@if(nodeTemplate();as custom){<ng-container [ngTemplateOutlet]="custom.template" [ngTemplateOutletContext]="context(node.id)" />}@else{ {{node.label}} @if(node.description){<small>{{node.description}}</small>} }
    @if(checkable()&&selectionMode()!=='none'&&selected().includes(node.id)){<small>{{uiEffective_selectionLabel()}}</small>}
    </span>
   </div>
   @if(expanded(node.id)){
    @if(loads()[node.id]?.status==='loading'){<p class="ui-tree-status" role="status">{{'uiFoundation.tree.loadingChildItemsForLabel' | uiStableMessage:{label:node.label} }}</p>}
    @if(loads()[node.id]?.status==='error'){<div class="ui-tree-status ui-tree-error"><span role="status">{{loads()[node.id]?.message}}</span><button type="button" [disabled]="disabled()||busy()||row.disabled" (click)="retry($event,node.id)">{{'uiFoundation.tree.retryForLabel' | uiStableMessage:{label:node.label} }}</button></div>}
    @if(branch(node)){<ul role="group" [attr.aria-busy]="loads()[node.id]?.status==='loading'?'true':null"><ng-container [ngTemplateOutlet]="entries" [ngTemplateOutletContext]="{nodes:node.children??[]}" /></ul>}
   }
  </li>
 }</ng-template>`,styles:treeStyles})
export class Tree<T = unknown> {
 private readonly uiRuntimeText_Tree=injectUiRuntimeText();

 protected readonly uiText_Tree=injectUiMessageText();
 protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=localeComputed(()=>this.locale()??this.uiLocaleDefaults().locale);

 readonly treeId=input.required<string>();readonly label=input.required<string>();readonly nodes=input<readonly TreeNode<T>[]>([]);
 readonly expandedIds=input<readonly string[]>([]);readonly expandedIdsChange=output<readonly string[]>();
 readonly selectedIds=input<readonly string[]>([]);readonly selectedIdsChange=output<readonly string[]>();
 readonly checkedIds=input<readonly string[]>([]);readonly checkedIdsChange=output<readonly string[]>();
 readonly selectionMode=input<TreeSelectionMode>('single');readonly checkable=input(false,{transform:booleanAttribute});readonly linkChecks=input(true,{transform:booleanAttribute});
 readonly selectionLabel=input<string>();
 protected readonly uiEffective_selectionLabel=uiLocaleComputed(()=>this.selectionLabel()??this.uiText_Tree("uiFoundation.tree.itemsToSelect"));readonly checkLabel=input<string>();
 protected readonly uiEffective_checkLabel=uiLocaleComputed(()=>this.checkLabel()??this.uiText_Tree("uiFoundation.tree.itemsToCheck"));readonly disabled=input(false,{transform:booleanAttribute});readonly busy=input(false,{transform:booleanAttribute});readonly readonly=input(false,{transform:booleanAttribute});readonly query=input('');
 readonly activated=output<TreeNode<T>>();readonly loadRequested=output<TreeLoadRequest>();readonly loadCancelled=output<TreeLoadCancellation>();readonly focusLeft=output<void>();
 protected readonly branch=treeBranch;protected readonly open=linkedSignal(()=>this.expandedIds());protected readonly selected=linkedSignal(()=>this.selectedIds());protected readonly checked=linkedSignal(()=>this.checkedIds());
 protected readonly loads=signal<TreeLoads<T>>({});readonly resolvedNodes=computed(()=>treeWithLoads(treeNodes(this.nodes()),this.loads()));
 protected readonly filtered=computed(()=>treeFilter(this.resolvedNodes(),this.query(),this.effectiveLocale()));protected readonly rows=computed(()=>treeVisible(this.resolvedNodes(),this.open(),this.query(),this.effectiveLocale()));protected readonly incomplete=computed(()=>this.resolvedNodes().some(node=>!treeComplete(node)));
 protected readonly nodeTemplate=contentChild<TreeNodeTemplate<T>>(TreeNodeTemplate);
 private readonly host=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;private readonly active=signal<string|null>(null);private previous:readonly TreeNode<T>[]=[];private focusOwned=false;private previousSource:readonly TreeNode<T>[]|null=null;private typeahead='';private typeaheadAt=0;private readonly pendingFocus=signal<string|null>(null);private destroyed=false;
 protected readonly problem=uiMessageState('');protected readonly activeId=computed(()=>{const rows=this.rows(),active=this.active();return rows.some(row=>row.node.id===active)?active:rows.find(row=>this.selected().includes(row.node.id))?.node.id??rows[0]?.node.id??null;});
 constructor(){
  effect(()=>{const source=this.nodes();untracked(()=>{if(this.previousSource&&this.previousSource!==source){this.invalidateLoads('source-change');this.loads.set({});}this.previousSource=source;});});
  effect(()=>{this.open();this.query();this.loads();untracked(()=>{const hidden=Object.values(this.loads()).filter(record=>record.status==='loading'&&record.path.some(id=>!this.expanded(id))).map(record=>record.nodeId);if(hidden.length)this.invalidateIds(hidden,'collapse');});});
  const focusIn=(event:FocusEvent)=>{this.focusOwned=true;const id=(event.target as Element)?.closest('[data-tree-id]')?.getAttribute('data-tree-id');if(id)this.active.set(id);};
  const focusOut=(event:FocusEvent)=>{if(event.relatedTarget&&event.relatedTarget!==this.host.ownerDocument.body&&!this.host.contains(event.relatedTarget as Node))this.focusOwned=false;};
  this.host.addEventListener('focusin',focusIn);this.host.addEventListener('focusout',focusOut);
  inject(DestroyRef).onDestroy(()=>{this.destroyed=true;this.invalidateLoads('destroy');this.host.removeEventListener('focusin',focusIn);this.host.removeEventListener('focusout',focusOut);});
  afterRenderEffect(()=>{const nodes=this.resolvedNodes(),rows=this.rows();this.disabled();this.busy();this.activeId();
   if(!this.treeId().trim()||/\s/.test(this.treeId())||!this.label().trim())throw new Error('Tree requires a nonempty ID and label.');
   const requested=this.pendingFocus();untracked(()=>{if(requested&&this.focusOwned){this.pendingFocus.set(null);this.focusItem(requested);}const focused=this.host.ownerDocument.activeElement;if(this.focusOwned&&(!focused||focused===this.host.ownerDocument.body||this.host.contains(focused)&&!canFocus(focused as HTMLElement))){const path=this.active()?treePath(this.previous,this.active()!):null;const ancestor=[...(path??[])].reverse().find(node=>rows.some(row=>row.node.id===node.id));this.focusItem(ancestor?.id??rows[0]?.node.id??null);}this.previous=nodes;});
  });
 }
 protected rowFor(id:string):TreeEntry<T>{return treeEntry(this.filtered(),id)!;}
 protected itemId(id:string):string{return this.treeId()+'-item-'+treeDomIdToken(id);}
 protected expanded(id:string):boolean{return !!this.query().trim()&&!!treeEntry(this.filtered(),id)?.node.children?.length||this.open().includes(id);}
 protected checkState(id:string):TreeCheckState{return treeCheckState(this.resolvedNodes(),this.checked(),id,this.linkChecks());}
 protected context(id:string):TreeNodeContext<T>{const entry=treeEntry(this.resolvedNodes(),id)!;return {$implicit:entry.node,node:entry.node,path:entry.path,level:entry.level,expanded:this.expanded(id),selected:this.selected().includes(id),checkState:this.checkState(id)};}
 protected focused(id:string):void{this.active.set(id);}
 focusFirst():void{this.focusItem(this.activeId());}
 private focusItem(id:string|null):void{if(!id){this.host.querySelector<HTMLElement>('[role="tree"]')?.focus();return;}this.active.set(id);const item=this.host.ownerDocument.getElementById(this.itemId(id));if(item&&this.host.contains(item)&&canFocus(item)){item.focus({preventScroll:true});item.scrollIntoView({block:'nearest',inline:'nearest'});}else this.pendingFocus.set(id);}
 private blocked(node:TreeNode<T>,edit=false):boolean{return this.disabled()||this.busy()||treeEntry(this.resolvedNodes(),node.id)?.disabled===true||edit&&this.readonly();}
 protected toggleFromPointer(event:Event,node:TreeNode<T>):void{event.stopPropagation();this.focusItem(node.id);this.toggle(node);}
 protected checkFromPointer(event:Event,node:TreeNode<T>):void{event.stopPropagation();this.focusItem(node.id);this.changeCheck(node);}
 protected clicked(event:Event,node:TreeNode<T>):void{event.stopPropagation();if((event.target as Element).closest('button,input,select,textarea,a,[contenteditable]'))return;this.focusItem(node.id);if(this.checkable()&&this.selectionMode()==='none')this.changeCheck(node);else this.select(node);}
 private setExpanded(ids:readonly string[]):void{this.open.set(ids);this.expandedIdsChange.emit(ids);}
 private toggle(node:TreeNode<T>,force?:boolean):void{if(this.blocked(node)||!treeBranch(node))return;const next=force??!this.expanded(node.id);if(next){this.setExpanded([...new Set([...this.open(),node.id])]);if(treeUnloaded(node))this.requestLoad(node.id);}else{if(this.host.contains(this.host.ownerDocument.activeElement))this.focusItem(node.id);this.setExpanded(this.open().filter(id=>id!==node.id));const path=treeEntry(this.resolvedNodes(),node.id)!.path;const pending=Object.values(this.loads()).filter(record=>record.path.slice(0,path.length).every((id,index)=>id===path[index])).map(record=>record.nodeId);this.invalidateIds(pending,'collapse');}}
 private select(node:TreeNode<T>):void{if(this.blocked(node,true)||node.selectable===false||this.selectionMode()==='none')return;const next=this.selectionMode()==='single'?[node.id]:this.selected().includes(node.id)?this.selected().filter(id=>id!==node.id):[...this.selected(),node.id];this.selected.set(next);this.selectedIdsChange.emit(next);this.activated.emit(node);}
 private changeCheck(node:TreeNode<T>):void{if(!this.checkable()||this.blocked(node,true)||node.checkable===false)return;if(this.linkChecks()&&!treeComplete(node)){this.problem.setMessage([() => this.uiRuntimeText_Tree("uiFoundation.tree.someChildrenHaveYetToLoadSoTheirSharedCheckboxStateCannotBeConfirmedExpandTheItemToCh")]);if(treeUnloaded(node))this.toggle(node,true);return;}this.problem.set('');const next=treeToggleCheck(this.resolvedNodes(),this.checked(),node.id,this.checkState(node.id)!=='true',this.linkChecks());this.checked.set(next);this.checkedIdsChange.emit(next);}
 protected retry(event:Event,id:string):void{event.stopPropagation();this.requestLoad(id);}
 private requestLoad(id:string):void{if(this.disabled()||this.busy())return;const next=treeBeginLoad(this.nodes(),this.loads(),id,nextTreeRequestId());if(next.request){this.loads.set(next.loads);this.loadRequested.emit(next.request);}}
 resolveLoad(requestId:number,children:readonly TreeNode<T>[]):boolean{const next=treeResolveLoad(this.nodes(),this.loads(),requestId,children);if(!next)return false;this.loads.set(next);return true;}
 failLoad(requestId:number,message:string):boolean{const next=treeFailLoad(this.loads(),requestId,message);if(!next)return false;this.loads.set(next);return true;}
 invalidateLoads(reason:TreeLoadCancellation['reason']='invalidate'):void{this.invalidateIds(null,reason);}
 private invalidateIds(ids:readonly string[]|null,reason:TreeLoadCancellation['reason']):void{const next=treeCancelLoads(this.loads(),ids,reason);this.loads.set(next.loads);if(!this.destroyed)for(const cancelled of next.cancelled)this.loadCancelled.emit(cancelled);}
 protected left(event:FocusEvent):void{if(event.relatedTarget instanceof Node&&(event.currentTarget as HTMLElement).contains(event.relatedTarget))return;this.focusLeft.emit();}
 protected key(event:KeyboardEvent,passedNode:TreeNode<T>):void{
  if(event.defaultPrevented||event.isComposing||event.keyCode===229||event.target!==event.currentTarget)return;
  const node=treeEntry(this.resolvedNodes(),this.active()??passedNode.id)?.node??passedNode,rows=this.rows(),index=rows.findIndex(row=>row.node.id===node.id),rtl=this.host.ownerDocument.defaultView?.getComputedStyle(this.host).direction==='rtl',openKey=rtl?'ArrowLeft':'ArrowRight',closeKey=rtl?'ArrowRight':'ArrowLeft';
  if(['ArrowDown','ArrowUp','Home','End',openKey,closeKey,'Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();}
  if(event.key==='ArrowDown')this.focusItem(rows[Math.min(rows.length-1,index+1)]?.node.id??null);
  else if(event.key==='ArrowUp')this.focusItem(rows[Math.max(0,index-1)]?.node.id??null);
  else if(event.key==='Home')this.focusItem(rows[0]?.node.id??null);
  else if(event.key==='End')this.focusItem(rows.at(-1)?.node.id??null);
  else if(event.key===openKey){if(!this.expanded(node.id))this.toggle(node,true);else this.focusItem(node.children?.[0]?.id??node.id);}
  else if(event.key===closeKey){if(treeBranch(node)&&this.expanded(node.id)&&!this.query().trim())this.toggle(node,false);else this.focusItem(treeEntry(this.resolvedNodes(),node.id)?.parentId??node.id);}
  else if(event.key==='Enter')this.select(node);
  else if(event.key===' '){if(this.checkable())this.changeCheck(node);else this.select(node);}
  else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){const now=event.timeStamp;this.typeahead=now-this.typeaheadAt<700?this.typeahead+event.key:event.key;this.typeaheadAt=now;const prefix=this.typeahead.normalize('NFKC').toLocaleLowerCase(this.effectiveLocale());const candidates=[...rows.slice(index+1),...rows.slice(0,index+1)];const match=candidates.find(row=>row.node.label.normalize('NFKC').toLocaleLowerCase(this.effectiveLocale()).startsWith(prefix));if(match){event.preventDefault();event.stopPropagation();this.focusItem(match.node.id);}}
 }
}
