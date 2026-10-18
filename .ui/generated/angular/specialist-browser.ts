export interface SpecialistTheme {text:string;muted:string;surface:string;background:string;border:string;action:string;onAction:string;success:string;danger:string;focus:string;font:string;codeFont:string;fontSize:number;controlSize:number;gap:number;radius:number;borderWidth:number;mapRegionOpacity:number;reducedMotion:boolean;}
export function readSpecialistTheme(host:HTMLElement):SpecialistTheme {
  const style=getComputedStyle(host),read=(key:string)=>style.getPropertyValue('--ui-'+key).trim();
  const length=(name:string):number=>{const probe=host.ownerDocument.createElement('span');probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none;';probe.style.inlineSize=`var(--ui-${name})`;host.append(probe);const value=probe.getBoundingClientRect().width;probe.remove();return value;};
  return {text:read('color-text'),muted:read('color-muted'),surface:read('color-surface'),background:read('color-background'),border:read('color-border'),action:read('color-action'),onAction:read('color-on-action'),success:read('color-success'),danger:read('color-danger'),focus:read('color-focus'),font:read('font-body'),codeFont:read('font-code'),fontSize:length('text-body'),controlSize:length('size-control'),gap:length('space-control-gap'),radius:length('radius-control'),borderWidth:length('border-control'),mapRegionOpacity:parseFloat(read('opacity-map-region')),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
}
/** Observe owner scope changes without observing renderer-owned SVG/DOM mutations. */
export function observeSpecialistScope(host:HTMLElement,changed:()=>void):()=>void {
  let frame=0,destroyed=false,last='';
  const refresh=()=>{frame=0;if(destroyed)return;const theme=readSpecialistTheme(host),rect=host.getBoundingClientRect(),signature=JSON.stringify([theme,rect.width,rect.height,host.closest('[hidden]')!==null,getComputedStyle(host).direction]);if(signature!==last){last=signature;changed();}};
  const schedule=()=>{if(!destroyed&&!frame)frame=requestAnimationFrame(refresh);};
  const resize=new ResizeObserver(schedule);resize.observe(host);const mutations=new MutationObserver(schedule);for(let owner:Element|null=host;owner;owner=owner.parentElement)mutations.observe(owner,{attributes:true,attributeFilter:['data-ui-profile','dir','style','class','hidden']});
  const motion=matchMedia('(prefers-reduced-motion: reduce)');motion.addEventListener('change',schedule);schedule();
  return ()=>{destroyed=true;resize.disconnect();mutations.disconnect();motion.removeEventListener('change',schedule);if(frame)cancelAnimationFrame(frame);};
}
export type SpecialistClipboardWriter=(text:string)=>Promise<void>;
/** Named browser I/O boundary; an app can provide a writer instead. */
export const writeSpecialistClipboard:SpecialistClipboardWriter=text=>navigator.clipboard.writeText(text);
