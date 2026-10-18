import type {CollectionKey} from './collection-model';
import {canFocus} from './focus';

/** The consumer owns the complete group and canonical selection. Members use
 * stable row keys and native input values; disabled/hidden describe effective
 * eligibility even offscreen. Several options may share one row in any order. */
export interface VirtualRadioMember {key:CollectionKey;value:string;disabled?:boolean;hidden?:boolean;}
/** One native group within this viewport. form is a form id; omission inherits
 * the viewport form owner. value=null is unselected. Native change updates the
 * consumer value, including application-owned form reset and rejected changes. */
export interface VirtualRadioGroup {name:string;form?:string;value:string|null;members:readonly VirtualRadioMember[];}
const encoded=(key:CollectionKey)=>typeof key+':'+String(key);
export function virtualRadioProblem(groups:readonly VirtualRadioGroup[],keys:readonly CollectionKey[],inheritedForm:string|null=null):string|null{
 if(!Array.isArray(groups))return '仮想radio groupのメンバーを確認してください。';
 const rows=new Set(keys),names=new Set<string>();
 for(const group of groups){
  if(!group||typeof group.name!=='string'||!group.name.trim()||group.form!==undefined&&(typeof group.form!=='string'||!group.form.trim())||!Array.isArray(group.members))return '仮想radio groupの名前、form、メンバーを確認してください。';
  const name=JSON.stringify([group.form??inheritedForm,group.name]);if(names.has(name))return '仮想radio groupには重複しないformと名前を指定してください。';names.add(name);
  const values=new Set<string>();
  for(const member of group.members){if(!member||!rows.has(member.key)||typeof member.value!=='string'||values.has(member.value)||member.disabled!==undefined&&typeof member.disabled!=='boolean'||member.hidden!==undefined&&typeof member.hidden!=='boolean')return '仮想radio groupのメンバーと行キーを確認してください。';values.add(member.value);}
  if(group.value!==null&&!values.has(group.value))return '仮想radio groupの選択値を確認してください。';
 }
 return null;
}
/** Finite native Tab differences, measured with full keyboard navigation.
 * Arrows and focus operations remain native. Unknown engines retain the prior
 * Chromium fallback and are not certified by these profiles. */
export type NativeRadioTabProfile='chromium'|'firefox'|'webkit';
export function nativeRadioTabProfile(userAgent:string):NativeRadioTabProfile{
 if(/Firefox\//.test(userAgent))return 'firefox';
 if(/AppleWebKit\//.test(userAgent)&&!/(?:Chrome|Chromium|Edg|OPR)\//.test(userAgent))return 'webkit';
 return 'chromium';
}
/** Candidate filtering for a native group outside this controlled viewport.
 * The focused anchor remains in the sequence even at negative tabindex. */
export function nativeRadioTabCandidate(control:HTMLInputElement,candidates:readonly HTMLElement[],active:HTMLElement,backwards:boolean,profile:NativeRadioTabProfile):boolean{
 if(!control.name||control===active)return true;
 const root=control.getRootNode() as Document|ShadowRoot;
 const peers=[...root.querySelectorAll<HTMLInputElement>('input[type="radio"]')].filter(peer=>peer.name===control.name&&peer.form===control.form);
 const eligible=candidates.filter((peer):peer is HTMLInputElement=>peer instanceof HTMLInputElement&&peers.includes(peer)&&peer.tabIndex>=0);
 const checked=peers.find(peer=>peer.checked),activePeer=peers.includes(active as HTMLInputElement);
 if(activePeer&&profile!=='firefox')return false;
 if(checked&&!eligible.includes(checked)&&(profile==='webkit'||profile==='firefox'&&canFocus(checked)&&checked.tabIndex<0))return false;
 const entry=checked&&eligible.includes(checked)?checked:backwards&&profile!=='firefox'?eligible.at(-1):eligible[0];
 return control===entry;
}
interface Attribute {original:string|null;written:string|null;}
/** Render adapter only: no remembered checked value and no synthetic change. */
export class VirtualRadios {
 constructor(readonly profile:NativeRadioTabProfile=nativeRadioTabProfile(typeof navigator==='undefined'?'':navigator.userAgent)){}
 private element:HTMLElement|null=null;
 private readonly attributes=new Map<HTMLInputElement,Attribute>();
 private readonly focused=new Map<string,string>();
 private groups:readonly VirtualRadioGroup[]=[];
 private keys:readonly CollectionKey[]=[];
 setGroups(groups:readonly VirtualRadioGroup[]):void{this.groups=groups;const names=new Set(groups.map(group=>this.groupKey(group)));for(const key of this.focused.keys())if(!names.has(key))this.focused.delete(key);}
 private groupKey(group:VirtualRadioGroup):string{return JSON.stringify([group.form??null,group.name]);}
 setKeys(keys:readonly CollectionKey[]):void{this.keys=keys;}
 private match(radio:HTMLInputElement):{group:VirtualRadioGroup;member:VirtualRadioMember}|null{
  if(radio.closest('cdk-virtual-scroll-viewport')!==this.element)return null;
  const row=radio.closest<HTMLElement>('[data-ui-virtual-index]'),index=Number(row?.dataset['uiVirtualIndex']);
  if(!row||!Number.isSafeInteger(index))return null;
  const group=this.groups.find(group=>group.name===radio.name&&(group.form===undefined?radio.form===radio.closest('cdk-virtual-scroll-viewport')?.closest('form'):radio.form?.id===group.form));
  const member=group?.members.find(member=>encoded(member.key)===encoded(this.keys[index]!)&&member.value===radio.value);
  return group&&member?{group,member}:null;
 }
 private ordered(group:VirtualRadioGroup):VirtualRadioMember[]{
  const order=new Map(this.keys.map((key,index)=>[key,index]));
  return group.members.filter(member=>!member.disabled&&!member.hidden&&order.has(member.key)).slice().sort((a,b)=>order.get(a.key)!-order.get(b.key)!);
 }
 private entry(group:VirtualRadioGroup,backwards:boolean):{member:VirtualRadioMember;row:boolean}|undefined{
  const eligible=this.ordered(group),checked=eligible.find(member=>member.value===group.value);
  if(checked)return {member:checked,row:false};
  if(group.value!==null&&this.profile==='webkit')return undefined;
  const remembered=this.profile==='chromium'?eligible.find(member=>member.value===this.focused.get(this.groupKey(group))):undefined;
  if(remembered)return {member:remembered,row:false};
  const member=backwards&&this.profile!=='firefox'?eligible.at(-1):eligible[0];return member?{member,row:true}:undefined;
 }
 sync(element:HTMLElement,backwards=false,arrows=false):void{
  this.element=element;const managed=new Set<HTMLInputElement>(),radios=[...element.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  for(const radio of radios){
   if(radio.closest('cdk-virtual-scroll-viewport')!==element)continue;
   const match=this.match(radio);if(!match)continue;managed.add(radio);
   let attribute=this.attributes.get(radio);const current=radio.getAttribute('tabindex');
   if(!attribute){attribute={original:current,written:current};this.attributes.set(radio,attribute);}
   else if(current!==attribute.written)attribute.original=current;
   const {group,member}=match,eligible=this.ordered(group),checked=eligible.find(option=>option.value===group.value);
   const active=element.ownerDocument.activeElement,activeMember=active instanceof HTMLInputElement?this.match(active):null;
   if(activeMember?.group===group)this.focused.set(this.groupKey(group),activeMember.member.value);
   const entry=this.entry(group,backwards),checkedPresent=checked&&radios.some(peer=>{const match=this.match(peer);return match?.group===group&&match.member===checked;});
   const originalNegative=attribute.original!==null&&Number(attribute.original)<0;
   // Native engines must see the original peers while navigating inside a
   // group. In particular, demoting an unchecked peer changes Firefox reentry
   // and WebKit arrow eligibility even when the checked member is visible.
   const nativePeers=arrows||!!checkedPresent||activeMember?.group===group;
   const allowed=!originalNegative&&!member.disabled&&!member.hidden&&(nativePeers?true:entry?.row?entry.member.key===member.key:entry?.member===member);
   // A checked member outside the DOM must not turn visible unchecked peers
   // into native Tab entry points. The application value remains authoritative.
   radio.checked=group.value===member.value;
   const next=allowed?attribute.original:'-1';
   if(next===null)radio.removeAttribute('tabindex');else radio.setAttribute('tabindex',next);attribute.written=next;
  }
  for(const [radio,attribute] of this.attributes){if(!managed.has(radio)){this.restore(radio,attribute);this.attributes.delete(radio);}}
 }
 private restore(radio:HTMLInputElement,attribute:Attribute):void{if(radio.getAttribute('tabindex')!==attribute.written)return;if(attribute.original===null)radio.removeAttribute('tabindex');else radio.setAttribute('tabindex',attribute.original);}
 /** Returns both neighbours; native radio navigation chooses direction and wrap. */
 neighbours(radio:HTMLInputElement):readonly number[]|null{
  const match=this.match(radio);if(!match)return null;
  const rows=[...new Set(this.ordered(match.group).map(member=>member.key))],at=rows.indexOf(match.member.key);if(at<0||!rows.length)return [];
  return [rows[(at+rows.length-1)%rows.length]!,rows[(at+1)%rows.length]!].map(key=>this.keys.indexOf(key));
 }
 isManaged(radio:HTMLInputElement):boolean{return this.match(radio)!==null;}
 isTabStop(radio:HTMLInputElement,backwards:boolean):boolean{
  const match=this.match(radio);if(!match)return false;
  const active=this.element?.ownerDocument.activeElement,activeMatch=active instanceof HTMLInputElement?this.match(active):null;
  if(activeMatch?.group===match.group&&this.profile!=='firefox')return false;
  const entry=this.entry(match.group,backwards);return !!entry&&(entry.row?entry.member.key===match.member.key:entry.member===match.member);
 }
 destroy():void{for(const [radio,attribute] of this.attributes)this.restore(radio,attribute);this.attributes.clear();this.focused.clear();}
}
