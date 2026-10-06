import {canFocus} from './focus';
export function isMediaVisible(element:HTMLElement):boolean {
 return element.ownerDocument.visibilityState!=='hidden'&&canFocus(element);
}
/** Observe only this media surface and its ancestors; do not poll the document. */
export function observeMediaVisibility(element:HTMLElement,onChange:(visible:boolean)=>void):()=>void {
 const document=element.ownerDocument,view=document.defaultView;let disposed=false;
 const update=()=>{if(!disposed)onChange(isMediaVisible(element));};
 const mutation=new MutationObserver(update);let parent:HTMLElement|null=element;
 while(parent){mutation.observe(parent,{attributes:true,attributeFilter:['hidden','inert','class','style','open','dir','data-ui-profile']});parent=parent.parentElement;}
 const resize=new ResizeObserver(update);resize.observe(element);document.addEventListener('visibilitychange',update);view?.addEventListener('resize',update);update();
 return ()=>{disposed=true;mutation.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',update);view?.removeEventListener('resize',update);};
}
export function mediaResourceUrl(value:string,document:Document):string {
 const url=new URL(value,document.baseURI);if(!['http:','https:','blob:'].includes(url.protocol))throw new Error('Media resources require HTTP(S), an application Blob URL, or a relative URL.');return url.href;
}
