import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessageText} from './locale';
import { NgTemplateOutlet } from '@angular/common';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, contentChildren, DestroyRef, Directive, effect, ElementRef, inject, input, linkedSignal, output, signal, TemplateRef, untracked } from '@angular/core';
import { ActionControl, type ActionTone } from './action-control';
import { restoreFocus, tabbableElements } from './focus';
import { availableOverlayAnchor, observeOverlay, OverlayRegistry, positionOverlay, type OverlayPlacement } from './overlay';
import { popupDelay } from './floating-model';

export type PopupTrigger = 'click' | 'hover' | 'focus' | 'manual';
export type PopupCloseReason = 'escape' | 'outside' | 'scope-exit' | 'target-unavailable' | 'close-button' | 'cancel' | 'confirm' | 'programmatic' | 'leave';
export interface PopupResult { reason: PopupCloseReason; value: unknown; }
export class PopupCloseRequest {
    private prevented = false;
    constructor(readonly reason: PopupCloseReason, readonly value: unknown) {}
    get defaultPrevented():boolean { return this.prevented; }
    preventDefault():void { this.prevented = true; }
}
export interface PopupContext { busy:boolean; close:(reason?:PopupCloseReason)=>boolean; }
export type PopupArea = 'header' | 'body' | 'actions';
@Directive({selector:'ng-template[uiPopupTemplate]',standalone:true})
export class PopupTemplate {
    readonly uiPopupTemplate = input.required<PopupArea>();
    readonly template = inject<TemplateRef<{$implicit:PopupContext}>>(TemplateRef);
    static ngTemplateContextGuard(_directive:PopupTemplate,_context:unknown):_context is {$implicit:PopupContext} { return true; }
}
const popupStyles = `
 :host { box-sizing:border-box;position:fixed;inset:auto;margin:0;padding:var(--ui-space-field);inline-size:var(--ui-size-dialog-min);max-inline-size:calc(100vw - 2 * var(--ui-space-control-gap));max-block-size:calc(100dvh - 2 * var(--ui-space-control-gap));overflow:auto;overscroll-behavior:contain;border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-surface);background:var(--ui-color-surface);color:var(--ui-color-text);font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);overflow-wrap:anywhere;box-shadow:0 0 var(--ui-size-elevation-blur) var(--ui-color-shadow); }
 :host([hidden]) { display:none!important; }
 :host:focus-visible { outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:calc(-1 * var(--ui-border-focus)); }
 [hidden] { display:none!important; }
 .ui-popup-header,.ui-popup-actions { display:flex;flex-wrap:wrap;align-items:center;gap:var(--ui-space-control-gap); }
 .ui-popup-heading { flex:1 1 calc(var(--ui-text-heading) * 4);min-inline-size:0; }
 .ui-popup-header { margin-block-end:var(--ui-space-control-gap); }
 .ui-popup-actions:not(:empty) { margin-block-start:var(--ui-space-control-gap); }
 h2 { margin:0;font-size:var(--ui-text-heading);line-height:var(--ui-leading-heading);text-wrap:balance; }
 p { margin-block:var(--ui-space-control-gap);text-wrap:pretty; }
 .ui-popup-status { margin:0;color:var(--ui-color-muted); }
 .ui-popup-error { color:var(--ui-color-danger); }
`;
const popupHost = {'[id]':'controlId()','popover':'manual','[attr.aria-busy]':'busy()'};
const interactiveHost = {...popupHost,'role':'dialog','aria-modal':'false','tabindex':'-1','[attr.aria-label]':'label()'};

/** Native top-layer rendering stays in the app DOM, including modal and profile ancestry. */
@Directive({standalone:true})
export abstract class AnchoredPopup {
    readonly controlId = input.required<string>();
    readonly anchor = input.required<HTMLElement | null>();
    readonly placement = input<OverlayPlacement>('bottom-start');
    readonly trigger = input<PopupTrigger>('click');
    readonly open = input(false,{transform:booleanAttribute});
    readonly openChange = output<boolean>();
    readonly disabled = input(false,{transform:booleanAttribute});
    readonly busy = input(false,{transform:booleanAttribute});
    readonly closeOnEscape = input(true,{transform:booleanAttribute});
    readonly closeOnOutsideClick = input(true,{transform:booleanAttribute});
    readonly showDelayMs = input(0);
    readonly hideDelayMs = input(0);
    readonly focusFallback = input<HTMLElement | null>(null);
    readonly closeRequested = output<PopupCloseRequest>();
    readonly closed = output<PopupResult>();
    protected readonly opened = linkedSignal(()=>this.open());
    protected readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly registry = inject(OverlayRegistry);
    private boundAnchor:HTMLElement|null=null;
    private listening:(()=>void)|null=null;
    private cleanup:(()=>void)|null=null;
    private positionedAnchor:HTMLElement|null=null;
    private timer:ReturnType<typeof setTimeout>|null=null;
    private pointerAnchor=false;
    private pointerPanel=false;
    private focusAnchor=false;
    private focusPanel=false;
    private focusWasInPanel=false;
    private dismissedUntilLeave=false;
    private closing=false;
    private destroyed=false;
    private source:'click'|'automatic'|'programmatic'='programmatic';
    private readonly leases=new Map<string,{before:string|null;last:string}>();
    constructor() {
        effect(()=>{
            if(!this.controlId().trim()||/\s/.test(this.controlId()))throw new Error('Popup controlId must be a nonempty ID without whitespace.');
            popupDelay(this.showDelayMs());popupDelay(this.hideDelayMs());
            const anchor=this.anchor(),trigger=this.trigger(),disabled=this.disabled();
            untracked(()=>{
                this.listening?.();this.listening=null;this.clearTimer();this.releaseAnchorAttributes();this.boundAnchor=anchor;
                const active=this.element.ownerDocument.activeElement;
                this.pointerAnchor=!!anchor?.matches(':hover');this.pointerPanel=this.visible()&&this.element.matches(':hover');
                this.focusAnchor=!!anchor?.contains(active);this.focusPanel=this.element.contains(active);
                if(this.focusPanel)this.focusWasInPanel=true;
                this.dismissedUntilLeave=false;
                if(anchor && !disabled) {
                    if(anchor.ownerDocument!==this.element.ownerDocument)throw new Error('Popup anchor must belong to the same document.');
                    this.listening=this.listen(anchor,trigger);
                    this.focusAnchor=anchor.contains(anchor.ownerDocument.activeElement);
                    if(this.focusAnchor&&(trigger==='hover'||trigger==='focus'))this.schedule(true);
                }
                if(disabled)this.close('programmatic',undefined,true);
            });
        });
        afterRenderEffect(()=>{
            const wanted=this.opened(),anchor=this.anchor(),placement=this.placement();
            this.controlId();this.disabled();this.closeOnOutsideClick();
            untracked(()=>{
                this.updateAnchorAttributes(anchor,wanted&&!this.disabled());
                if(!wanted) { if(this.visible())this.close('programmatic',undefined,true);return; }
                if(!anchor||!this.eligible(anchor)) { this.close('target-unavailable',undefined,true);return; }
                if(!this.visible()) {
                    this.element.showPopover({source:anchor});
                    this.positionedAnchor=null;
                    const preferred=this.initialFocus(this.source);
                    if(preferred)restoreFocus(preferred,this.element);
                }
                if(this.positionedAnchor!==anchor) {
                    this.cleanup?.();this.positionedAnchor=anchor;
                    const unregister=this.registry.register({element:this.element,anchor,kind:'popup',outside:true,dismiss:reason=>{
                        if(reason==='scope-exit')this.close(reason,undefined,true);
                        else if(reason==='escape'?this.closeOnEscape():this.closeOnOutsideClick())this.close(reason);
                    }});
                    const stop=observeOverlay(this.element,anchor,()=>this.position());
                    const observer=new MutationObserver(records=>{
                        // Positioning writes the host's own left/top; do not observe those as new layout input.
                        if(records.some(record=>record.target!==this.element||record.attributeName!=='style'))this.position();
                        else if(!this.eligible(anchor))this.close('scope-exit',undefined,true);
                    });
                    observer.observe(this.element.ownerDocument.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','inert','open','class','style','dir','data-ui-profile']});
                    this.cleanup=()=>{unregister();stop();observer.disconnect();};
                }
                positionOverlay(this.element,anchor,placement);
            });
        });
        const focusIn=()=>{this.focusPanel=this.focusWasInPanel=true;this.clearTimer();};
        const focusOut=(event:FocusEvent)=>{this.focusPanel=this.element.contains(event.relatedTarget as Node|null);if(event.relatedTarget!==null)this.focusWasInPanel=this.focusPanel;this.leave();};
        const enter=()=>{this.pointerPanel=true;this.clearTimer();};
        const leave=()=>{this.pointerPanel=false;this.leave();};
        this.element.addEventListener('focusin',focusIn);this.element.addEventListener('focusout',focusOut);
        this.element.addEventListener('pointerenter',enter);this.element.addEventListener('pointerleave',leave);
        inject(DestroyRef).onDestroy(()=>{
            this.destroyed=true;this.clearTimer();this.listening?.();this.cleanup?.();this.releaseAnchorAttributes();
            const active=this.element.ownerDocument.activeElement;
            const owned=this.element.contains(active)||this.focusWasInPanel&&active===this.element.ownerDocument.body;
            if(this.visible())this.element.hidePopover();
            if(owned)this.restoreAnchor();
            this.element.removeEventListener('focusin',focusIn);this.element.removeEventListener('focusout',focusOut);
            this.element.removeEventListener('pointerenter',enter);this.element.removeEventListener('pointerleave',leave);
        });
    }
    protected initialFocus(_source:'click'|'automatic'|'programmatic'):HTMLElement|null { return null; }
    protected updateAnchorAttributes(anchor:HTMLElement|null,open:boolean):void {
        if(anchor!==this.boundAnchor||!anchor||this.disabled())return;
        this.attribute('aria-controls',this.controlId());this.attribute('aria-haspopup','dialog');this.attribute('aria-expanded',String(open));
    }
    protected releaseAnchorAttributes():void {
        const anchor=this.boundAnchor;
        if(anchor)for(const [name,lease] of this.leases)if(anchor.getAttribute(name)===lease.last) { if(lease.before===null)anchor.removeAttribute(name);else anchor.setAttribute(name,lease.before); }
        this.leases.clear();
    }
    private attribute(name:string,value:string):void {
        const anchor=this.boundAnchor;if(!anchor)return;
        const current=anchor.getAttribute(name),lease=this.leases.get(name);
        if(lease) { if(current!==lease.last)lease.before=current;lease.last=value; }
        else this.leases.set(name,{before:current,last:value});
        if(current!==value)anchor.setAttribute(name,value);
    }
    private eligible(anchor:HTMLElement):boolean {
        if(this.disabled()||!availableOverlayAnchor(anchor)||!this.element.isConnected||this.element.closest('[hidden],[inert]'))return false;
        if(this.element.ownerDocument.defaultView?.getComputedStyle(this.element).visibility!=='visible')return false;
        const modal=anchor.closest('dialog:modal');return !modal||modal.contains(this.element);
    }
    private position():void {
        if(!this.visible())return;const anchor=this.anchor();
        if(!anchor||!this.eligible(anchor)) { this.close('scope-exit',undefined,true);return; }
        positionOverlay(this.element,anchor,this.placement());
    }
    private visible():boolean { return this.element.matches(':popover-open'); }
    private clearTimer():void { if(this.timer!==null)clearTimeout(this.timer);this.timer=null; }
    private listen(anchor:HTMLElement,trigger:PopupTrigger):()=>void {
        const handlers:Array<[string,EventListener]>=[];
        const on=(name:string,handler:EventListener)=>{anchor.addEventListener(name,handler);handlers.push([name,handler]);};
        if(trigger!=='manual')on('click',()=>{
            if(anchor.matches(':disabled'))return;this.dismissedUntilLeave=false;
            if(this.opened()&&this.source==='automatic') {this.source='click';const preferred=this.initialFocus('click');if(preferred)restoreFocus(preferred,this.element);}
            else if(this.opened())this.close('close-button');else this.show('click');
        });
        if(trigger==='hover') {
            on('pointerenter',()=>{this.pointerAnchor=true;this.schedule(true);});
            on('pointerleave',()=>{this.pointerAnchor=false;this.leave();});
        }
        if(trigger==='hover'||trigger==='focus') {
            on('focusin',()=>{this.focusAnchor=true;this.schedule(true);});
            on('focusout',event=>{this.focusAnchor=anchor.contains((event as FocusEvent).relatedTarget as Node|null);this.leave();});
            on('keydown',event=>{const key=event as KeyboardEvent;if(key.key==='Escape'&&!key.defaultPrevented&&!key.isComposing&&key.keyCode!==229&&!this.opened()){this.clearTimer();this.dismissedUntilLeave=true;}});
        }
        return ()=>{for(const [name,handler] of handlers)anchor.removeEventListener(name,handler);};
    }
    private leave():void {
        if(!this.pointerAnchor&&!this.pointerPanel&&!this.focusAnchor&&!this.focusPanel) {
            this.dismissedUntilLeave=false;if(this.trigger()==='hover'||this.trigger()==='focus')this.schedule(false);
        }
    }
    private schedule(open:boolean):void {
        this.clearTimer();if(this.closing||this.destroyed||this.disabled()||open&&this.dismissedUntilLeave)return;
        const delay=popupDelay(open?this.showDelayMs():this.hideDelayMs());
        this.timer=setTimeout(()=>{this.timer=null;if(open)this.show('automatic');else this.close('leave');},delay);
    }
    /** An explicit action is also the touch/keyboard alternative to hover. */
    show(source:'click'|'automatic'|'programmatic'='programmatic'):boolean {
        const anchor=this.anchor();if(this.destroyed||!anchor||!this.eligible(anchor)||source==='automatic'&&this.dismissedUntilLeave)return false;
        this.clearTimer();if(this.opened())return true;this.source=source;this.opened.set(true);this.openChange.emit(true);return true;
    }
    /** UI endings may be held; explicit app open=false and unavailable scope force cleanup. */
    protected closeBlocked():boolean { return this.busy(); }
    close(reason:PopupCloseReason='programmatic',value:unknown=undefined,force=false):boolean {
        if(this.closing||this.destroyed||!this.opened()&&!this.visible())return false;
        const request=new PopupCloseRequest(reason,value);
        if(this.closeBlocked()&&!force)request.preventDefault();
        this.closeRequested.emit(request);if(request.defaultPrevented&&!force)return false;
        this.closing=true;this.clearTimer();if(reason==='escape')this.dismissedUntilLeave=true;
        const active=this.element.ownerDocument.activeElement;
        const owned=this.element.contains(active)||this.focusWasInPanel&&active===this.element.ownerDocument.body;
        this.opened.set(false);this.cleanup?.();this.cleanup=null;this.positionedAnchor=null;
        if(this.visible())this.element.hidePopover();
        this.updateAnchorAttributes(this.anchor(),false);
        if(owned&&reason!=='outside')this.restoreAnchor();
        this.focusWasInPanel=false;this.openChange.emit(false);this.closed.emit({reason,value});this.source='programmatic';this.closing=false;return true;
    }
    complete(value:unknown=undefined):boolean { return this.close('confirm',value,true); }
    private restoreAnchor():void {
        const anchor=this.anchor(),fallback=this.focusFallback();
        restoreFocus(anchor&&availableOverlayAnchor(anchor)?anchor:null,fallback&&availableOverlayAnchor(fallback)?fallback:null);
    }
}
const popupTemplate = `<header [hidden]="!showHeader()" class="ui-popup-header"><div class="ui-popup-heading">@if(template('header');as area){<ng-container [ngTemplateOutlet]="area.template" [ngTemplateOutletContext]="{$implicit:context()}" />}@else{<ng-content select="[uiPopupHeader]" /><h2>{{label()}}</h2>}</div>@if(showCloseButton()){<button uiAction data-popup-action [disabled]="busy()" (click)="close('close-button')">{{uiEffective_closeLabel()}}</button>}</header><div class="ui-popup-body">@if(template('body');as area){<ng-container [ngTemplateOutlet]="area.template" [ngTemplateOutletContext]="{$implicit:context()}" />}@else{<ng-content />}</div><div class="ui-popup-actions">@if(template('actions');as area){<ng-container [ngTemplateOutlet]="area.template" [ngTemplateOutletContext]="{$implicit:context()}" />}@else{<ng-content select="[uiPopupActions]" />}</div>@if(!showHeader()&&showCloseButton()){<button uiAction data-popup-action [disabled]="busy()" (click)="close('close-button')">{{uiEffective_closeLabel()}}</button>}<p role="status" aria-atomic="true" class="ui-popup-status">{{busy()?uiEffective_busyLabel():''}}</p>`;
@Component({selector:'ui-popover',standalone:true,imports:[NgTemplateOutlet,ActionControl],changeDetection:ChangeDetectionStrategy.OnPush,template:popupTemplate,styles:popupStyles,host:interactiveHost})
export class Popover extends AnchoredPopup {
 protected readonly uiText_Popover=injectUiMessageText();
    readonly label=input.required<string>();
    readonly showHeader=input(true,{transform:booleanAttribute});
    readonly showCloseButton=input(true,{transform:booleanAttribute});
    readonly closeLabel=input<string>();
 protected readonly uiEffective_closeLabel=uiLocaleComputed(()=>this.closeLabel()??this.uiText_Popover("uiFoundation.popover.close"));
    readonly busyLabel=input<string>();
 protected readonly uiEffective_busyLabel=uiLocaleComputed(()=>this.busyLabel()??this.uiText_Popover("uiFoundation.popover.working"));
    readonly focusOnOpen=input(true,{transform:booleanAttribute});
    private readonly templates=contentChildren(PopupTemplate);
    constructor() {
        super();let held:HTMLElement|null=null;
        effect(()=>{
            if(!this.label().trim())throw new Error('Popover label must be nonempty.');
            const areas=this.templates().map(t=>t.uiPopupTemplate());if(new Set(areas).size!==areas.length)throw new Error('Popover allows at most one template per area.');
            const busy=this.busy(),header=this.showHeader(),close=this.showCloseButton();
            untracked(()=>{
                const active=this.element.ownerDocument.activeElement as HTMLElement|null;
                if(active&&this.element.contains(active)&&active.matches('[data-popup-action]')&&(busy||!close||!header&&!!active.closest('header'))) { held=busy?active:null;this.element.focus({preventScroll:true}); }
            });
        });
        afterRenderEffect(()=>{const busy=this.busy();untracked(()=>{if(!busy&&held){if(this.element.ownerDocument.activeElement===this.element)restoreFocus(held,this.element);held=null;}});});
    }
    protected template(area:PopupArea):PopupTemplate|undefined { return this.templates().find(t=>t.uiPopupTemplate()===area); }
    protected context():PopupContext { return {busy:this.busy(),close:reason=>this.close(reason)}; }
    protected override initialFocus(source:'click'|'automatic'|'programmatic'):HTMLElement|null { return this.focusOnOpen()&&source!=='automatic'?(tabbableElements(this.element)[0]??this.element):null; }
}
@Component({selector:'ui-hover-card',standalone:true,imports:[NgTemplateOutlet,ActionControl],changeDetection:ChangeDetectionStrategy.OnPush,template:popupTemplate,styles:popupStyles,host:interactiveHost})
export class HoverCard extends Popover {
    override readonly trigger=input<PopupTrigger>('hover');
    override readonly showDelayMs=input(300);
    override readonly hideDelayMs=input(150);
}
@Component({selector:'ui-tooltip',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,template:'{{message()}}',styles:popupStyles+':host{font-size:var(--ui-text-small);padding:var(--ui-space-control-y) var(--ui-space-control-x);text-wrap:pretty;}',host:{...popupHost,role:'tooltip'}})
export class Tooltip extends AnchoredPopup {
    readonly message=input.required<string>();
    override readonly trigger=input<PopupTrigger>('hover');
    override readonly showDelayMs=input(500);
    override readonly hideDelayMs=input(100);
    private describedAnchor:HTMLElement|null=null;
    private descriptionId:string|null=null;
    private addedDescription=false;
    constructor() { super();effect(()=>{if(!this.message().trim())throw new Error('Tooltip message must be nonempty.');}); }
    protected override updateAnchorAttributes(anchor:HTMLElement|null,_open:boolean):void {
        const id=this.controlId();if(this.describedAnchor!==anchor||this.descriptionId!==id)this.removeDescription();
        if(!anchor||this.disabled()) {this.removeDescription();return;}
        this.describedAnchor=anchor;this.descriptionId=id;
        const ids=(anchor.getAttribute('aria-describedby')??'').split(/\s+/).filter(Boolean);
        if(!ids.includes(id)){anchor.setAttribute('aria-describedby',[...ids,id].join(' '));this.addedDescription=true;}
    }
    protected override releaseAnchorAttributes():void { this.removeDescription();super.releaseAnchorAttributes(); }
    private removeDescription():void {
        const anchor=this.describedAnchor,id=this.descriptionId;
        if(anchor&&id&&this.addedDescription){const ids=(anchor.getAttribute('aria-describedby')??'').split(/\s+/).filter(value=>value&&value!==id);if(ids.length)anchor.setAttribute('aria-describedby',ids.join(' '));else anchor.removeAttribute('aria-describedby');}
        this.describedAnchor=null;this.descriptionId=null;this.addedDescription=false;
    }
}
@Component({selector:'ui-confirm-popover',standalone:true,imports:[ActionControl],changeDetection:ChangeDetectionStrategy.OnPush,
    template:`<h2>{{label()}}</h2><p>{{message()}}</p><ng-content /><p class="ui-popup-error" role="status" aria-atomic="true">{{error()}}</p><div class="ui-popup-actions"><button uiAction variant="primary" [tone]="confirmTone()" data-popup-action [disabled]="busy()||pending()" (click)="confirm()">{{uiEffective_confirmLabel()}}</button><button uiAction data-popup-action data-popup-cancel [disabled]="busy()||pending()" (click)="close('cancel',false)">{{uiEffective_cancelLabel()}}</button></div><p class="ui-popup-status" role="status" aria-atomic="true">{{busy()?uiEffective_busyLabel():''}}</p>`,styles:popupStyles,host:interactiveHost})
export class ConfirmPopover extends AnchoredPopup {
 protected readonly uiText_ConfirmPopover=injectUiMessageText();
    readonly label=input.required<string>();
    readonly message=input.required<string>();
    readonly confirmLabel=input<string>();
    readonly confirmTone = input<ActionTone | null>(null);
 protected readonly uiEffective_confirmLabel=uiLocaleComputed(()=>this.confirmLabel()??this.uiText_ConfirmPopover("uiFoundation.confirmPopover.confirm"));
    readonly cancelLabel=input<string>();
 protected readonly uiEffective_cancelLabel=uiLocaleComputed(()=>this.cancelLabel()??this.uiText_ConfirmPopover("uiFoundation.confirmPopover.cancel"));
    readonly busyLabel=input<string>();
 protected readonly uiEffective_busyLabel=uiLocaleComputed(()=>this.busyLabel()??this.uiText_ConfirmPopover("uiFoundation.confirmPopover.working"));
    readonly error=input('');
    readonly confirmRequested=output<void>();
    // Only bridge the emit-to-render interval. The app owns processing and results.
    protected readonly pending=signal(false);
    constructor() {
        super();let held:HTMLElement|null=null;
        effect(()=>{if(!this.label().trim()||!this.message().trim())throw new Error('ConfirmPopover requires a label and message.');const blocked=this.busy()||this.pending();untracked(()=>{const active=this.element.ownerDocument.activeElement as HTMLElement|null;if(blocked&&active&&this.element.contains(active)&&active.matches('[data-popup-action]')){held=active;this.element.focus({preventScroll:true});}});});
        afterRenderEffect(()=>{const busy=this.busy(),pending=this.pending();untracked(()=>{if(pending)this.pending.set(false);else if(!busy&&held){if(this.element.ownerDocument.activeElement===this.element)restoreFocus(held,this.element);held=null;}});});
        inject(DestroyRef).onDestroy(()=>{this.pending.set(false);held=null;});
    }
    protected override closeBlocked():boolean { return this.busy()||this.pending(); }
    override close(reason:PopupCloseReason='programmatic',value:unknown=undefined,force=false):boolean { const closed=super.close(reason,value,force);if(closed)this.pending.set(false);return closed; }
    protected override initialFocus(source:'click'|'automatic'|'programmatic'):HTMLElement|null { return source==='automatic'?null:this.element.querySelector<HTMLElement>('[data-popup-cancel]')??this.element; }
    protected confirm():void { if(this.busy()||this.pending())return;this.pending.set(true);this.confirmRequested.emit(); }
}
