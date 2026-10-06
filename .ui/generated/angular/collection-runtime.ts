import {DestroyRef, ElementRef, inject} from '@angular/core';
import {canFocus} from './focus';
import {availableOverlayAnchor} from './overlay';

/** Own controls may disappear or become natively disabled after an app update.
 * Preserve only their focus, and leave projected controls and external focus alone.
 * The caller supplies a focusable, labelled host as the local fallback.
 */
export function installCollectionFocus(): void {
 const root=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,document=root.ownerDocument;
 root.setAttribute('data-ui-collection-scope','');
 let owned:HTMLElement|null=null;
 const focused=(event:FocusEvent)=>{const target=event.target;if(target instanceof HTMLElement&&target.closest('[data-ui-collection-scope]')===root&&target.matches('[data-collection-control]'))owned=target;else owned=null;};
 const left=(event:FocusEvent)=>{if(event.target!==owned)return;const next=event.relatedTarget;if(next instanceof Node&&next!==document.body)owned=null;else {const target=owned;queueMicrotask(()=>{if(owned===target&&canFocus(target)&&document.activeElement!==target)owned=null;});}};
 const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.contains(event.target))owned=null;};
 const observer=new MutationObserver(()=>{const target=owned,active=document.activeElement;if(!target||canFocus(target)||!availableOverlayAnchor(root)||active!==document.body&&active!==target)return;owned=null;root.focus({preventScroll:true});});
 observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','hidden','inert']});
 document.addEventListener('focusin',focused,true);root.addEventListener('focusout',left,true);document.addEventListener('pointerdown',outside,true);
 inject(DestroyRef).onDestroy(()=>{observer.disconnect();owned=null;document.removeEventListener('focusin',focused,true);root.removeEventListener('focusout',left,true);document.removeEventListener('pointerdown',outside,true);});
}
