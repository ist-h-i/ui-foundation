import {Component,input} from '@angular/core';
import {ActionLink,PageFrame,Splitter,StickyRegion} from '../../.ui/generated/angular';
/** Finite consumer data for the priority-2 measured geometry tests. */
@Component({selector:'runtime-p2-measured',standalone:true,imports:[ActionLink,PageFrame,Splitter,StickyRegion],template:`
@if(mode()==='frame'){<div class="scroll-root" tabindex="0" aria-label="計測用スクロール" [style.block-size.px]="height()"><ui-page-frame title="計測する画面" [showSidebar]="true" [showHeader]="header()" [showFooter]="footer()" [fixedHeader]="true" [fixedFooter]="true" [fixedSidebar]="true"><p uiPageHeader>保持するヘッダー</p><nav uiPageSidebar><a uiAction href="#frame-editor">保持するサイドリンク</a></nav><div class="spacer"></div><input class="ui-field-control" id="frame-editor" aria-label="保持する本文" value="保持する入力"><p uiPageFooter>保持するフッター</p></ui-page-frame></div>}
@if(mode()==='split'){<ui-splitter splitterId="measured-split" primaryLabel="左の入力" secondaryLabel="右の入力" [ratio]="ratio()" [height]="height()" [orientation]="$any(orientation())" [minRatio]="minRatio()" [maxRatio]="maxRatio()"><div uiSplitPrimary><input class="ui-field-control" aria-label="左の入力" value="保持する左入力"></div><input class="ui-field-control" aria-label="右の入力" value="保持する右入力"></ui-splitter>}
@if(mode()==='sticky'){<div class="scroll-root" [style.block-size.px]="height()"><div class="spacer"></div><div class="sticky-scope"><ui-sticky-region [offset]="offset()" [edge]="$any(edge())"><button>保持する固定操作</button></ui-sticky-region><div class="spacer"></div></div><div class="spacer"></div></div>}
`,styles:`:host{display:block;min-inline-size:0;} .scroll-root{overflow:auto;border:var(--ui-border-control) solid var(--ui-color-border);}`})
export class RuntimeP2Measured {
 readonly mode=input('frame');readonly height=input(600);readonly header=input(true);readonly footer=input(true);readonly ratio=input(50);readonly orientation=input('horizontal');readonly minRatio=input(0);readonly maxRatio=input(100);readonly offset=input(12);readonly edge=input('top');
}
