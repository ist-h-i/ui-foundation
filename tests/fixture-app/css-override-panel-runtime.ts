import {Component,input} from '@angular/core';
import {ActionLink,BottomSheet,DialogTemplate,Drawer} from '../../.ui/generated/angular';

/** Angular projects native editors into the body slot of each real panel. */
@Component({selector:'css-panel-runtime',standalone:true,imports:[Drawer,BottomSheet,DialogTemplate,ActionLink],template:`
@if(kind()==='Drawer'){
 <dialog uiDrawer [label]="label()" [open]="open()" [modal]="modal()" [closable]="closable()" [showHeader]="showHeader()" [showFooter]="showFooter()" [width]="width()" [height]="height()" [edge]="$any(edge())">
  <ng-template uiDialogTemplate="body"><div class="css-panel-content"><input class="ui-field-control" aria-label="保持するパネル入力" value="保持する入力"><a uiAction href="#runtime-anchor">保持する移動先</a></div></ng-template>
 </dialog>
} @else {
 <dialog uiBottomSheet [label]="label()" [open]="open()" [modal]="modal()" [closable]="closable()" [showHeader]="showHeader()" [showFooter]="showFooter()" [width]="width()" [height]="height()" [stages]="stages()" [stage]="stage()">
  <ng-template uiDialogTemplate="body"><div class="css-panel-content"><input class="ui-field-control" aria-label="保持するパネル入力" value="保持する入力"><a uiAction href="#runtime-anchor">保持する移動先</a></div></ng-template>
 </dialog>
}`,styles:`:host{display:block;min-inline-size:0;}:host([hidden]){display:none;}.css-panel-content{padding:var(--ui-space-field);}`})
export class CSSPanelRuntime {
 readonly kind=input('Drawer');readonly label=input('保持するパネル');readonly open=input(true);readonly modal=input(false);readonly closable=input(false);readonly showHeader=input(false);readonly showFooter=input(false);
 readonly width=input<number|null>(null);readonly height=input<number|null>(null);readonly edge=input('right');readonly stages=input<readonly number[]>([.4,1]);readonly stage=input(1);
}
