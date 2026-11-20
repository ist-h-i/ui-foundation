import {UiStableMessagePipe} from './locale';
import {NgTemplateOutlet} from '@angular/common';
import {afterRenderEffect,booleanAttribute,ChangeDetectionStrategy,Component,computed,contentChild,DestroyRef,ElementRef,inject,input,linkedSignal,output,signal,untracked} from '@angular/core';
import {canFocus} from './focus';
import {TreeNodeTemplate,type TreeNodeContext} from './tree-node-template';
import {treeBranch,treeDomIdToken,treeEntries,treeEntry,treeNodes,treePath,type TreeNode} from './tree-model';

export type OrganizationDirection='top-down'|'bottom-up'|'left-right'|'right-left';

@Component({selector:'ui-organization-chart',standalone:true,imports:[NgTemplateOutlet,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,
 template:`<div class="ui-org-viewport" dir="ltr" role="region" tabindex="0" [attr.aria-label]="label()" [attr.aria-busy]="busy()?'true':null" [attr.data-direction]="direction()">
 <ul class="ui-org-roots" dir="ltr"><ng-container [ngTemplateOutlet]="entries" [ngTemplateOutletContext]="{nodes:checkedNodes()}" /></ul>
 @if(!checkedNodes().length){<p [attr.dir]="textDirection()">{{'uiFoundation.organizationChart.thereAreNoOrganizationItems' | uiStableMessage}}</p>}
 </div>
 <ng-template #entries let-nodes="nodes">@for(node of nodes;track node.id){<li class="ui-org-item" [attr.data-org-id]="node.id">
  <div class="ui-org-node" [attr.dir]="textDirection()" [attr.data-disabled]="disabledNode(node.id)">
   @if(nodeTemplate();as custom){<ng-container [ngTemplateOutlet]="custom.template" [ngTemplateOutletContext]="context(node.id)" />}@else{<strong>{{node.label}}</strong>@if(node.description){<p>{{node.description}}</p>}}
   @if(branch(node)){<button type="button" [disabled]="disabled()||busy()||disabledNode(node.id)" [attr.data-org-toggle]="node.id" [attr.aria-label]="node.label+(expanded().includes(node.id)?('uiFoundation.organizationChart.collapseSuborganizations' | uiStableMessage):('uiFoundation.organizationChart.expandSuborganizations' | uiStableMessage))" [attr.aria-expanded]="expanded().includes(node.id)" [attr.aria-controls]="chartId()+'-children-'+encode(node.id)" (click)="toggle(node)">{{expanded().includes(node.id)?('uiFoundation.organizationChart.collapseChildOrganizations' | uiStableMessage):('uiFoundation.organizationChart.expandChildOrganizations' | uiStableMessage)}}</button>}
  </div>
  @if(branch(node)){<ul class="ui-org-children" [id]="chartId()+'-children-'+encode(node.id)" [hidden]="!expanded().includes(node.id)" [attr.aria-label]="('uiFoundation.organizationChart.suborganizationsForLabel' | uiStableMessage:{label:node.label})">@if(node.children===undefined){<li class="ui-org-missing"><p role="status" [attr.dir]="textDirection()">{{'uiFoundation.organizationChart.childOrganizationsHaveNotBeenLoadedPassTheLoadedHierarchyFromTheApp' | uiStableMessage}}</p></li>}@else{<ng-container [ngTemplateOutlet]="entries" [ngTemplateOutletContext]="{nodes:node.children}" />}</ul>}
 </li>}</ng-template>`,styles:`
 :host{display:block;min-inline-size:0;max-inline-size:100%;color:var(--ui-color-text);font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);}
 :host([hidden]),[hidden]{display:none!important;}
 .ui-org-viewport{box-sizing:border-box;max-inline-size:100%;max-block-size:var(--ui-size-table-viewport);overflow:auto;overscroll-behavior:contain;padding:var(--ui-space-control-gap);background:var(--ui-color-surface);}
 ul{list-style:none;padding:0;margin:0;}
 .ui-org-roots,.ui-org-children{display:flex;align-items:flex-start;gap:var(--ui-space-field);}
 .ui-org-item{display:flex;flex-direction:column;align-items:center;flex:0 0 auto;gap:var(--ui-space-field);position:relative;}
 .ui-org-node{box-sizing:border-box;inline-size:var(--ui-size-grid-item);max-inline-size:var(--ui-size-dialog);padding:var(--ui-space-control-y) var(--ui-space-control-x);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);background:var(--ui-color-background);overflow-wrap:anywhere;position:relative;}
 .ui-org-node[data-disabled='true']{color:var(--ui-color-muted);}
 .ui-org-node p{font-size:var(--ui-text-small);color:var(--ui-color-muted);margin-block:var(--ui-space-control-gap);}
 .ui-org-children{position:relative;}
 .ui-org-missing{box-sizing:border-box;inline-size:var(--ui-size-grid-item);padding:var(--ui-space-control-y) var(--ui-space-control-x);font-size:var(--ui-text-small);color:var(--ui-color-muted);overflow-wrap:anywhere;}
 .ui-org-children::before{content:'';position:absolute;inset-block-start:calc(-1 * var(--ui-space-field));inset-inline-start:50%;block-size:calc(var(--ui-space-field) / 2);border-inline-start:var(--ui-border-control) solid var(--ui-color-border);pointer-events:none;}
 .ui-org-children>.ui-org-item::before{content:'';position:absolute;inset-block-start:calc(-1 * var(--ui-space-field) / 2);inset-inline-start:50%;block-size:calc(var(--ui-space-field) / 2);border-inline-start:var(--ui-border-control) solid var(--ui-color-border);pointer-events:none;}
 .ui-org-children>.ui-org-item::after{content:'';position:absolute;inset-block-start:calc(-1 * var(--ui-space-field) / 2);inset-inline-start:calc(-1 * var(--ui-space-field) / 2);inline-size:calc(100% + var(--ui-space-field));border-block-start:var(--ui-border-control) solid var(--ui-color-border);pointer-events:none;}
 .ui-org-children>.ui-org-item:first-child::after{inset-inline-start:50%;inline-size:calc(50% + var(--ui-space-field) / 2);}
 .ui-org-children>.ui-org-item:last-child::after{inline-size:calc(50% + var(--ui-space-field) / 2);}
 .ui-org-children>.ui-org-item:only-child::after{display:none;}
 [data-direction='bottom-up'] .ui-org-item{flex-direction:column-reverse;}
 [data-direction='bottom-up'] .ui-org-children::before{inset-block-start:auto;inset-block-end:calc(-1 * var(--ui-space-field));}
 [data-direction='bottom-up'] .ui-org-children>.ui-org-item::before,[data-direction='bottom-up'] .ui-org-children>.ui-org-item::after{inset-block-start:auto;inset-block-end:calc(-1 * var(--ui-space-field) / 2);}
 [data-direction='left-right'] .ui-org-roots,[data-direction='right-left'] .ui-org-roots,[data-direction='left-right'] .ui-org-children,[data-direction='right-left'] .ui-org-children{flex-direction:column;}
 [data-direction='left-right'] .ui-org-item{flex-direction:row;}
 [data-direction='right-left'] .ui-org-item{flex-direction:row-reverse;}
 [data-direction='left-right'] .ui-org-children::before{inset-block-start:50%;inset-inline-start:calc(-1 * var(--ui-space-field));inline-size:calc(var(--ui-space-field) / 2);block-size:0;border-inline-start:0;border-block-start:var(--ui-border-control) solid var(--ui-color-border);}
 [data-direction='right-left'] .ui-org-children::before{inset-block-start:50%;inset-inline-start:auto;inset-inline-end:calc(-1 * var(--ui-space-field));inline-size:calc(var(--ui-space-field) / 2);block-size:0;border-inline-start:0;border-block-start:var(--ui-border-control) solid var(--ui-color-border);}
 [data-direction='left-right'] .ui-org-children>.ui-org-item::before,[data-direction='right-left'] .ui-org-children>.ui-org-item::before{inset-block-start:50%;inset-inline-start:calc(-1 * var(--ui-space-field) / 2);inline-size:calc(var(--ui-space-field) / 2);block-size:0;border-inline-start:0;border-block-start:var(--ui-border-control) solid var(--ui-color-border);}
 [data-direction='right-left'] .ui-org-children>.ui-org-item::before{inset-inline-start:auto;inset-inline-end:calc(-1 * var(--ui-space-field) / 2);}
 [data-direction='left-right'] .ui-org-children>.ui-org-item::after,[data-direction='right-left'] .ui-org-children>.ui-org-item::after{inset-block-start:calc(-1 * var(--ui-space-field) / 2);inset-inline-start:calc(-1 * var(--ui-space-field) / 2);inline-size:0;block-size:calc(100% + var(--ui-space-field));border-block-start:0;border-inline-start:var(--ui-border-control) solid var(--ui-color-border);}
 [data-direction='right-left'] .ui-org-children>.ui-org-item::after{inset-inline-start:auto;inset-inline-end:calc(-1 * var(--ui-space-field) / 2);}
 [data-direction='left-right'] .ui-org-children>.ui-org-item:first-child::after,[data-direction='right-left'] .ui-org-children>.ui-org-item:first-child::after{inset-block-start:50%;block-size:calc(50% + var(--ui-space-field) / 2);}
 [data-direction='left-right'] .ui-org-children>.ui-org-item:last-child::after,[data-direction='right-left'] .ui-org-children>.ui-org-item:last-child::after{block-size:calc(50% + var(--ui-space-field) / 2);}
 button{display:block;box-sizing:border-box;font:inherit;max-inline-size:100%;min-block-size:var(--ui-size-control);margin-block-start:var(--ui-space-control-gap);padding:var(--ui-space-control-y) var(--ui-space-control-gap);background:var(--ui-color-surface);color:var(--ui-color-text);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);cursor:pointer;overflow-wrap:anywhere;}
 button:disabled{color:var(--ui-color-muted);background:var(--ui-color-disabled-surface);cursor:default;}
 button:focus-visible,.ui-org-viewport:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}
 @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;}}
`})
export class OrganizationChart<T = unknown> {
 readonly chartId=input.required<string>();readonly label=input.required<string>();readonly nodes=input<readonly TreeNode<T>[]>([]);readonly direction=input<OrganizationDirection>('top-down');readonly expandedIds=input<readonly string[]>([]);readonly expandedIdsChange=output<readonly string[]>();readonly disabled=input(false,{transform:booleanAttribute});readonly busy=input(false,{transform:booleanAttribute});
 protected readonly branch=treeBranch;protected readonly encode=treeDomIdToken;protected readonly checkedNodes=computed(()=>treeNodes(this.nodes()));protected readonly expanded=linkedSignal(()=>this.expandedIds());protected readonly nodeTemplate=contentChild<TreeNodeTemplate<T>>(TreeNodeTemplate);protected readonly textDirection=signal<'ltr'|'rtl'>('ltr');
 private readonly host=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;private previous:readonly TreeNode<T>[]=[];private ownedId:string|null=null;private owned=false;
 constructor(){
  const focused=(event:FocusEvent)=>{this.owned=true;this.ownedId=(event.target as Element).closest('[data-org-id]')?.getAttribute('data-org-id')??null;};const exited=(event:FocusEvent)=>{if(event.relatedTarget&&event.relatedTarget!==this.host.ownerDocument.body&&!this.host.contains(event.relatedTarget as Node))this.owned=false;};
  this.host.addEventListener('focusin',focused);this.host.addEventListener('focusout',exited);inject(DestroyRef).onDestroy(()=>{this.host.removeEventListener('focusin',focused);this.host.removeEventListener('focusout',exited);});
  afterRenderEffect(onCleanup=>{const update=()=>this.textDirection.set(this.host.ownerDocument.defaultView?.getComputedStyle(this.host).direction==='rtl'?'rtl':'ltr');update();const observer=typeof MutationObserver==='undefined'?null:new MutationObserver(update);for(let scope:HTMLElement|null=this.host;scope;scope=scope.parentElement)observer?.observe(scope,{attributes:true,attributeFilter:['dir','class','style']});onCleanup(()=>observer?.disconnect());});
  afterRenderEffect(()=>{const nodes=this.checkedNodes();this.expanded();this.direction();this.disabled();this.busy();if(!this.chartId().trim()||/\s/.test(this.chartId())||!this.label().trim())throw new Error('OrganizationChart requires a nonempty ID and label.');
   untracked(()=>{const active=this.host.ownerDocument.activeElement;if(this.owned&&(!active||active===this.host.ownerDocument.body||this.host.contains(active)&&!canFocus(active as HTMLElement))){const path=this.ownedId?treePath(this.previous,this.ownedId):null;let target:HTMLElement|null=null;for(const node of [...(path??[])].reverse()){const button=this.element('data-org-toggle',node.id);if(canFocus(button)){target=button;break;}}(target??this.host.querySelector<HTMLElement>('.ui-org-viewport'))?.focus({preventScroll:true});}this.previous=nodes;});
  });
 }
 protected disabledNode(id:string):boolean{return treeEntry(this.checkedNodes(),id)?.disabled===true;}
 private element(attribute:'data-org-id'|'data-org-toggle',id:string):HTMLElement|null{return [...this.host.querySelectorAll<HTMLElement>('['+attribute+']')].find(element=>element.getAttribute(attribute)===id)??null;}
 protected context(id:string):TreeNodeContext<T>{const entry=treeEntry(this.checkedNodes(),id)!;return {$implicit:entry.node,node:entry.node,path:entry.path,level:entry.level,expanded:this.expanded().includes(id),selected:false,checkState:'false'};}
 protected toggle(node:TreeNode<T>):void{if(this.disabled()||this.busy()||this.disabledNode(node.id))return;const closing=this.expanded().includes(node.id);const nodeElement=this.element('data-org-id',node.id);if(closing&&nodeElement?.contains(this.host.ownerDocument.activeElement))nodeElement.querySelector<HTMLElement>('[data-org-toggle]')?.focus({preventScroll:true});const next=closing?this.expanded().filter(id=>id!==node.id):[...new Set([...this.expanded(),node.id])];this.expanded.set(next);this.expandedIdsChange.emit(next);}
}
