import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-page-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-page-frame' },
  template: `
    <header class="ui-page-frame__header">
      <div class="ui-page-frame__heading">
        @if (headingLevel() === 1) { <h1>{{ title() }}</h1> }
        @else { <h2>{{ title() }}</h2> }
        <ng-content select="[uiPageContext]" />
      </div>
      <div class="ui-page-frame__actions"><ng-content select="[uiPageActions]" /></div>
    </header>
    <div class="ui-page-frame__body"><ng-content /></div>
  `,
})
export class PageFrame {
  readonly title = input.required<string>();
  readonly headingLevel = input<1 | 2>(1);
}
