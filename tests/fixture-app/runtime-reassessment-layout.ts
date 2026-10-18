import {Component, input} from '@angular/core';
import {ActionControl, CollectionItem, Divider, Masonry} from '../../.ui/generated/angular';

interface ReassessmentCard {id: string; label: string; text: string;}
@Component({selector: 'runtime-reassessment-masonry', standalone: true, imports: [Masonry, CollectionItem, ActionControl],
  template: `<ui-masonry [items]="items()" keyField="id" labelField="label" label="高さが異なる申請" [columns]="columns()" [gap]="$any(gap())"><ng-template uiCollectionItem [uiCollectionItemOf]="items()" let-item><p>{{item.text}}</p><button uiAction type="button">{{item.label}}</button></ng-template></ui-masonry>`,
  styles: `:host{display:block;min-inline-size:0;}p{margin:0 0 var(--ui-space-control-gap);}`})
export class RuntimeReassessmentMasonry {
  readonly columns = input(2); readonly gap = input('normal');
  readonly items = input<readonly ReassessmentCard[]>([]);
}

@Component({selector: 'runtime-reassessment-divider', standalone: true, imports: [Divider, ActionControl],
  template: `<button uiAction type="button">境界の前の操作</button><ui-divider label="内容の境界" [orientation]="$any(orientation())" [lineStyle]="$any(lineStyle())" spacing="normal"/><button uiAction type="button">境界の後の操作</button>`,
  styles: `:host{display:flex;align-items:stretch;flex-wrap:wrap;gap:var(--ui-space-section);padding:var(--ui-space-control-gap);}ui-divider{flex:1;min-inline-size:var(--ui-size-control);min-block-size:var(--ui-size-control);}`})
export class RuntimeReassessmentDivider {
  readonly orientation = input('horizontal'); readonly lineStyle = input('solid');
}
