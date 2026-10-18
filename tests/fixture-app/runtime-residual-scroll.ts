import {Component,computed,ElementRef,input,viewChild} from '@angular/core';
import {ActionControl,ConfirmPopover,HoverCard,Popover,PopupTemplate,Tooltip} from '../../.ui/generated/angular';
/** Finite consumer content: long text and retained native editors use real popup slots. */
@Component({selector:'runtime-residual-scroll',standalone:true,imports:[ActionControl,ConfirmPopover,HoverCard,Popover,PopupTemplate,Tooltip],template:`
<button uiAction #anchor type="button" class="anchor">長文を確認する</button>
@if(kind()==='Popover'){<ui-popover controlId="residual-popover" label="長文の補足" [anchor]="nativeAnchor()" trigger="manual" [open]="open()"><ng-template uiPopupTemplate="body"><p class="first">先頭の情報を保持</p>@for(row of rows;track $index){<p class="long">{{row}}</p>}<p class="last">末尾の情報を保持</p><input class="ui-field-control" aria-label="保持するpopup入力" value="保持する下書き"><button uiAction class="last-action">全文確認後の操作</button></ng-template></ui-popover>}
@if(kind()==='HoverCard'){<ui-hover-card controlId="residual-hover" label="長文の補足" [anchor]="nativeAnchor()" trigger="manual" [open]="open()"><ng-template uiPopupTemplate="body"><p class="first">先頭の情報を保持</p>@for(row of rows;track $index){<p class="long">{{row}}</p>}<p class="last">末尾の情報を保持</p><input class="ui-field-control" aria-label="保持するpopup入力" value="保持する下書き"><button uiAction class="last-action">全文確認後の操作</button></ng-template></ui-hover-card>}
@if(kind()==='ConfirmPopover'){<ui-confirm-popover controlId="residual-confirm" label="長文の補足" [anchor]="nativeAnchor()" trigger="manual" [open]="open()" [message]="longMessage"><p class="first">先頭の情報を保持</p>@for(row of rows;track $index){<p class="long">{{row}}</p>}<p class="last">末尾の情報を保持</p><input class="ui-field-control" aria-label="保持するpopup入力" value="保持する下書き"></ui-confirm-popover>}
@if(kind()==='Tooltip'){<ui-tooltip controlId="residual-tooltip" [anchor]="nativeAnchor()" trigger="manual" [open]="open()" [message]="longMessage" />}
`,styles:`:host{display:block;min-inline-size:0;}:host([hidden]){display:none;}.anchor{max-inline-size:100%;}.ui-field-control{box-sizing:border-box;max-inline-size:100%;inline-size:100%;}p{margin-block:var(--ui-space-control-gap);}`})
export class RuntimeResidualScroll{
 private readonly anchor=viewChild<unknown,ElementRef<HTMLButtonElement>>('anchor',{read:ElementRef});
 readonly nativeAnchor=computed(()=>this.anchor()?.nativeElement??null);
 readonly kind=input('Popover');readonly open=input(true);
 readonly rows=Array.from({length:24},(_,i)=>`段落 ${i}：幅が狭くても全文を失わず確認する ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 `.repeat(3));
 readonly longMessage='先頭の説明を保持 '+Array.from({length:32},(_,i)=>`説明 ${i} ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 日本語の長文を最後まで確認する。`).join(' ')+' 末尾の説明を保持';
}
