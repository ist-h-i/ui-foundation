import {computed as localeComputed} from '@angular/core';
import {injectUiLocale} from './locale';
import {afterRenderEffect, DestroyRef, Directive, ElementRef, inject, input, signal, viewChild} from '@angular/core';
import {FieldValueControl} from './value-control';
import {availableOverlayAnchor, observeOverlay, OverlayRegistry, positionOverlay, type OverlayCloseReason, type OverlayPlacement} from './overlay';
import {restoreFocus} from './focus';

/** Shared native popover/CVA lifecycle. Components own their distinct hierarchy interaction. */
@Directive({standalone:true})
export abstract class TreePopupControl extends FieldValueControl<readonly string[]> {
 protected readonly uiLocaleDefaults=injectUiLocale();readonly locale=input<string>();protected readonly effectiveLocale=localeComputed(()=>this.locale()??this.uiLocaleDefaults().locale);

 protected readonly emptyValue:readonly string[]=[];
 readonly placement=input<OverlayPlacement>('bottom-start');
 protected readonly popupOpen=signal(false);
 protected readonly editor=viewChild<unknown,ElementRef<HTMLInputElement>>('editor',{read:ElementRef});
 protected readonly popup=viewChild<unknown,ElementRef<HTMLElement>>('popup',{read:ElementRef});
 protected readonly state=viewChild<unknown,ElementRef<HTMLElement>>('state',{read:ElementRef});
 protected readonly popupHost=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
 private readonly registry=inject(OverlayRegistry);private releasePopup:(()=>void)|null=null;private focusRequested=false;
 protected coerce(value:unknown):readonly string[]{return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[];}
 constructor(){super();
  afterRenderEffect(onCleanup=>{const opened=this.popupOpen(),blocked=this.blocked()||this.readonly(),popup=this.popup()?.nativeElement,editor=this.editor()?.nativeElement,placement=this.placement();
   if(!popup||!editor)return;
   if(!opened||blocked){if(popup.matches(':popover-open'))popup.hidePopover();if(opened&&blocked)this.closePopup('scope-exit');if(this.blocked()&&this.popupHost.contains(editor.ownerDocument.activeElement)&&editor.ownerDocument.activeElement?.matches(':disabled'))this.state()?.nativeElement.focus({preventScroll:true});return;}
   if(!availableOverlayAnchor(editor)){this.closePopup('scope-exit');return;}
   popup.showPopover();const unregister=this.registry.register({element:popup,anchor:editor,kind:'popup',outside:true,dismiss:reason=>this.closePopup(reason)});
   const update=()=>{const width=editor.getBoundingClientRect().width;popup.style.minInlineSize=Math.min(width,editor.ownerDocument.defaultView?.innerWidth??width)+'px';positionOverlay(popup,editor,placement);};
   const resize=observeOverlay(popup,editor,update);
   const scopeObserver=typeof MutationObserver==='undefined'?null:new MutationObserver(()=>{if(availableOverlayAnchor(editor))update();else this.closePopup('scope-exit');});
   for(let ancestor:HTMLElement|null=editor;ancestor;ancestor=ancestor.parentElement)scopeObserver?.observe(ancestor,{attributes:true,attributeFilter:['dir','data-ui-profile','style','class','hidden','inert']});
   const release=()=>{unregister();resize();scopeObserver?.disconnect();if(popup.matches(':popover-open'))popup.hidePopover();if(this.releasePopup===release)this.releasePopup=null;};
   this.releasePopup=release;onCleanup(release);
   if(this.focusRequested){this.focusRequested=false;this.focusPopup();}
  });
  inject(DestroyRef).onDestroy(()=>this.releasePopup?.());
 }
 protected abstract focusPopup():void;
 protected abstract popupClosed(reason:OverlayCloseReason):void;
 protected showPopup():void{if(this.blocked()||this.readonly())return;this.focusRequested=true;this.popupOpen.set(true);if(this.popup()?.nativeElement.matches(':popover-open')){this.focusRequested=false;this.focusPopup();}}
 protected togglePopup():void{if(this.popupOpen())this.closePopup('escape');else this.showPopup();}
 protected closePopup(reason:OverlayCloseReason='escape'):void{const owned=this.popupHost.contains(this.popupHost.ownerDocument.activeElement);this.releasePopup?.();this.popupOpen.set(false);this.focusRequested=false;this.popupClosed(reason);if(owned&&reason!=='outside')restoreFocus(this.editor()?.nativeElement??null,this.state()?.nativeElement??null);}
 protected leftPopupControl(event:FocusEvent):void{if(!event.relatedTarget||event.relatedTarget instanceof Node&&this.popupHost.contains(event.relatedTarget))return;this.closePopup('outside');this.touch();}
 protected editorKey(event:KeyboardEvent):void{if(event.defaultPrevented||event.isComposing||event.keyCode===229)return;if(['ArrowDown','ArrowUp','Enter',' '].includes(event.key)&&!this.blocked()&&!this.readonly()){event.preventDefault();this.showPopup();}else if(event.key==='Escape'&&this.popupOpen()){event.preventDefault();event.stopPropagation();this.closePopup('escape');}}
 override writeValue(value:unknown):void{super.writeValue(value);this.closePopup('scope-exit');}
}

export const treePopupStyles=`
 :host{display:block;min-inline-size:0;max-inline-size:100%;font:inherit;color:var(--ui-color-text);}
 :host([hidden]),[hidden]{display:none!important;}
 .ui-tree-popup{position:fixed;inset:auto;margin:0;padding:var(--ui-space-control-gap);box-sizing:border-box;inline-size:min(var(--ui-size-dialog),calc(100vw - 2 * var(--ui-space-control-gap)));max-inline-size:calc(100vw - 2 * var(--ui-space-control-gap));max-block-size:calc(100dvh - 2 * var(--ui-space-control-gap));overflow:auto;background:var(--ui-color-surface);color:var(--ui-color-text);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);}
 .ui-tree-popup-actions{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);margin-block:var(--ui-space-control-gap);}
 button{font:inherit;background:var(--ui-color-surface);color:var(--ui-color-text);border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);padding:var(--ui-space-control-y) var(--ui-space-control-x);min-block-size:var(--ui-size-control);max-inline-size:100%;overflow-wrap:anywhere;cursor:pointer;}
 button:disabled{cursor:default;background:var(--ui-color-disabled-surface);color:var(--ui-color-muted);}
 button:focus-visible,input:focus-visible,[tabindex='-1']:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}
 .ui-tree-popup-values{list-style:none;padding:0;margin:var(--ui-space-control-gap) 0;display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);overflow-wrap:anywhere;}
 .ui-tree-popup-values li{min-inline-size:0;}
 .ui-tree-popup-error{color:var(--ui-color-danger);overflow-wrap:anywhere;}
 .ui-tree-popup-state{font-size:var(--ui-text-small);color:var(--ui-color-muted);overflow-wrap:anywhere;}
 .ui-tree-popup-editor{cursor:pointer;}
 .ui-cascader-columns{display:flex;flex-wrap:wrap;align-items:flex-start;gap:var(--ui-space-control-gap);}
 .ui-cascader-column{flex:1 1 var(--ui-size-overlay-min);min-inline-size:0;max-inline-size:100%;border:0;padding:0;margin:0;}
 .ui-cascader-column legend{font-weight:var(--ui-weight-control);overflow-wrap:anywhere;}
 .ui-cascader-column ul{list-style:none;padding:0;margin:0;}
 .ui-cascader-column button{inline-size:100%;text-align:start;}
 .ui-cascader-column button[aria-pressed='true']{background:var(--ui-color-background);border-color:var(--ui-color-tab-selected);}
 .ui-cascader-marker{display:inline-block;}
 :host-context([dir='rtl']) .ui-cascader-marker{transform:scaleX(-1);}
 @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;}}
`;
