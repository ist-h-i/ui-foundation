import { NgTemplateOutlet } from '@angular/common';
import { afterRenderEffect, booleanAttribute, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, linkedSignal, output, untracked } from '@angular/core';
import { ActionControl } from './action-control';
import { Dialog, DIALOG_STYLES, DIALOG_TEMPLATE } from './dialog';
import { MoveHandle, ResizeHandle } from './panel-handle';
import { panelSize, sheetStages } from './floating-model';
import { restoreFocus } from './focus';

const edgeStyles = `
 :host { position:fixed;min-inline-size:min(var(--ui-size-dialog-min),100vw);max-inline-size:100vw;max-block-size:100dvh;border-radius:var(--ui-radius-surface);margin:0; }
 :host([data-edge="left"]),:host([data-edge="right"]) { top:0;bottom:0;width:min(var(--ui-panel-width,var(--ui-size-drawer-inline)),100vw);height:min(var(--ui-panel-height,100dvh),100dvh); }
 :host([data-edge="left"]) { left:0;right:auto; }
 :host([data-edge="right"]) { right:0;left:auto; }
 :host([data-edge="top"]),:host([data-edge="bottom"]) { left:0;right:0;width:min(var(--ui-panel-width,100vw),100vw);height:min(var(--ui-panel-height,var(--ui-size-drawer-block)),100dvh);margin-inline:auto; }
 :host([data-edge="top"]) { top:0;bottom:auto; }
 :host([data-edge="bottom"]) { bottom:0;top:auto; }
 :host([data-maximized="true"]) { top:0;bottom:0;left:0;right:0;width:100vw;height:100dvh; }
 .ui-dialog__title { flex-basis:calc(var(--ui-text-heading) * 4); }
`;
@Component({standalone:true,imports:[NgTemplateOutlet,ActionControl,MoveHandle,ResizeHandle],changeDetection:ChangeDetectionStrategy.OnPush,template:DIALOG_TEMPLATE,styles:DIALOG_STYLES})
abstract class EdgePanel extends Dialog {
    readonly width = input<number | null>(null);
    readonly height = input<number | null>(null);
    override readonly showHeader = input(true,{transform:booleanAttribute});
    constructor() {
        super();
        let settings: string | null = null;
        let held: HTMLElement | null = null;
        effect(()=>{
            const busy=this.busy();untracked(()=>{
                const active=this.element.ownerDocument.activeElement as HTMLElement|null;
                if(busy&&active&&this.element.contains(active)&&(active.closest('.ui-dialog__handles')||active.closest('.ui-sheet-stages'))){held=active;this.element.focus({preventScroll:true});}
            });
        });
        afterRenderEffect(()=>{const busy=this.busy();untracked(()=>{if(!busy&&held){if(this.element.ownerDocument.activeElement===this.element)restoreFocus(held,this.element);held=null;}});});
        const ensureAvailable=()=>{
            if(this.element.open&&(!this.element.isConnected||this.element.closest('[hidden],[inert]')||!this.element.getClientRects().length||this.element.ownerDocument.defaultView?.getComputedStyle(this.element).visibility!=='visible'))this.element.close();
        };
        const observer=new MutationObserver(ensureAvailable);
        observer.observe(this.element.ownerDocument.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','inert','open','class','style']});
        afterRenderEffect(ensureAvailable);
        inject(DestroyRef).onDestroy(()=>observer.disconnect());
        afterRenderEffect(() => {
            const width = panelSize(this.width()), height = panelSize(this.height()), next = width + ':' + height;
            untracked(() => {
                if (settings !== null && settings !== next) this.resetGeometry();
                settings = next;
                if (width === null) this.element.style.removeProperty('--ui-panel-width');
                else this.element.style.setProperty('--ui-panel-width', width + 'px');
                if (height === null) this.element.style.removeProperty('--ui-panel-height');
                else this.element.style.setProperty('--ui-panel-height', height + 'px');
            });
        });
    }
}
/** Native Dialog slots, veto, results and modal behavior, with physical edge geometry. */
@Component({selector:'dialog[uiDrawer]',standalone:true,imports:[NgTemplateOutlet,ActionControl,MoveHandle,ResizeHandle],changeDetection:ChangeDetectionStrategy.OnPush,
    template:DIALOG_TEMPLATE,styles:DIALOG_STYLES+edgeStyles,host:{'[attr.data-edge]':'edge()'}})
export class Drawer extends EdgePanel {
    readonly edge = input<'left'|'right'|'top'|'bottom'>('right');
    constructor() {
        super();let previous:string|null=null;
        afterRenderEffect(()=>{const edge=this.edge();untracked(()=>{if(previous!==null&&previous!==edge)this.resetGeometry();previous=edge;});});
    }
}
const sheetControls = `<fieldset class="ui-sheet-stages"><legend>{{stageLabel()}}</legend><div class="ui-sheet-controls"><button uiAction data-sheet-reduce [disabled]="busy()||currentStage()===0" (click)="setStage(currentStage()-1)">{{reduceLabel()}}</button><label><span>{{stageLabel()}}</span><input type="range" min="0" [max]="stages().length-1" step="1" [value]="currentStage()" [disabled]="busy()" [attr.aria-valuetext]="stageText()" (input)="stageInput($event)"></label><button uiAction data-sheet-expand [disabled]="busy()||currentStage()===stages().length-1" (click)="setStage(currentStage()+1)">{{expandLabel()}}</button></div><p role="status" aria-atomic="true">{{stageText()}}</p></fieldset>`;
@Component({selector:'dialog[uiBottomSheet]',standalone:true,imports:[NgTemplateOutlet,ActionControl,MoveHandle,ResizeHandle],changeDetection:ChangeDetectionStrategy.OnPush,
    template:sheetControls+DIALOG_TEMPLATE,styles:DIALOG_STYLES+edgeStyles+`
    :host([data-edge="bottom"]) { height:min(var(--ui-sheet-height),100dvh); }
    :host([data-maximized="true"]) { height:100dvh; }
    .ui-sheet-stages { min-inline-size:0;margin:0 0 var(--ui-space-field);padding:var(--ui-space-control-y);border:var(--ui-border-control) solid var(--ui-color-border); }
    .ui-sheet-controls { display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);align-items:center; }
    .ui-sheet-controls label { display:grid;gap:var(--ui-space-control-gap);min-inline-size:0;flex:1 1 calc(var(--ui-text-body) * 6); }
    .ui-sheet-controls input { inline-size:100%;min-inline-size:var(--ui-size-control);block-size:var(--ui-size-control);accent-color:var(--ui-color-action); }
    .ui-sheet-stages p { margin:var(--ui-space-control-gap) 0 0;color:var(--ui-color-muted); }
    `,host:{'data-edge':'bottom'}})
export class BottomSheet extends EdgePanel {
    readonly stages = input<readonly number[]>([.4,.7,1]);
    readonly stage = input(1);
    readonly stageChange = output<number>();
    readonly stageLabel = input('表示領域の高さ');
    readonly reduceLabel = input('低くする');
    readonly expandLabel = input('高くする');
    protected readonly currentStage = linkedSignal(()=>this.stage());
    private readonly ratio = computed(()=>sheetStages(this.stages(),this.currentStage()));
    protected readonly stageText = computed(()=>`${this.currentStage()+1} / ${this.stages().length} (${Math.round(this.ratio()*100)}%)`);
    constructor() {
        super();let previous:string|null=null;
        effect(()=>{const index=this.currentStage(),length=this.stages().length,busy=this.busy();untracked(()=>{
            if(busy)return;const active=this.element.ownerDocument.activeElement as HTMLElement|null;
            if(active?.matches('[data-sheet-reduce]')&&index===0||active?.matches('[data-sheet-expand]')&&index===length-1)this.element.querySelector<HTMLInputElement>('.ui-sheet-controls input')?.focus({preventScroll:true});
        });});
        afterRenderEffect(()=>{
            const ratio=this.ratio(),height=panelSize(this.height()),next=ratio+':'+height;
            untracked(()=>{if(previous!==null&&previous!==next)this.resetGeometry();previous=next;this.element.style.setProperty('--ui-sheet-height',height===null?ratio*100+'dvh':height*ratio+'px');});
        });
    }
    setStage(index:number):void { if(this.busy())return;sheetStages(this.stages(),index);this.currentStage.set(index);this.stageChange.emit(index); }
    protected stageInput(event:Event):void { this.setStage(Number((event.target as HTMLInputElement).value)); }
}
