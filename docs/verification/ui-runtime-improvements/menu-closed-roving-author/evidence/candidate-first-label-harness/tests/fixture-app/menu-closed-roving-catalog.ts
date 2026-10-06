import {ChangeDetectionStrategy,Component,signal} from '@angular/core';
import {Menu,OverlayHost,type MenuItem} from '../../.ui/generated/angular/index';

@Component({selector:'fixture-app',standalone:true,imports:[Menu,OverlayHost],changeDetection:ChangeDetectionStrategy.OnPush,
template:`<main id="menu-closed-proof" dir="rtl" [attr.data-ui-profile]="profile()"><h1>Menu外部入力の終了検証</h1>
<label>Menu検証profile<select [value]="profile()" (change)="changeProfile($event)"><option value="guided">guided</option><option value="dense">dense</option></select></label>
<label><input data-testid="menu-external-open" type="checkbox" [checked]="opened()" (change)="changeOpen($event)">Menuを外部から開く</label>
<ui-overlay-host><ui-menu menuId="external-open-menu" label="外部openの階層Menu" [items]="items" [open]="opened()" (openChange)="opened.set($event)" [closeOnSelect]="false"/></ui-overlay-host>
<output data-testid="menu-external-state">{{opened()?'open':'closed'}}</output><button data-testid="menu-external-after">次の外部操作</button></main>`,
styles:`main{box-sizing:border-box;min-inline-size:0;max-inline-size:var(--ui-size-content);padding:var(--ui-space-page);font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);color:var(--ui-color-text);background:var(--ui-color-background);}label{display:block;margin-block:var(--ui-space-field);}select,button{font:inherit;max-inline-size:100%;}output{display:block;overflow-wrap:anywhere;}`})
export class MenuClosedRovingCatalog{
readonly profile=signal<'guided'|'dense'>('guided');readonly opened=signal(false);
readonly items:readonly MenuItem[]=[{id:'parent',label:'階層の親',children:[{id:'child',label:'外部入力の子'},{id:'nested',label:'次の階層',children:[{id:'leaf',label:'次の階層の操作'}]}]},{id:'other',label:'別の操作'}];
changeProfile(event:Event):void{this.profile.set((event.target as HTMLSelectElement).value==='dense'?'dense':'guided');}
changeOpen(event:Event):void{this.opened.set((event.target as HTMLInputElement).checked);}
}
