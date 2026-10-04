import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';

@Component({
  selector: 'ui-table-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-table-container',
    role: 'region',
    tabindex: '0',
    '[attr.aria-label]': 'label()',
  },
  template: '<ng-content />',
  styles: `
    :host {
      display: block;
      min-inline-size: 0;
      max-inline-size: 100%;
      overflow-x: auto;
      overscroll-behavior-inline: contain;
      color: var(--ui-color-text);
      font-family: var(--ui-font-family);
      font-size: var(--ui-font-body);
      line-height: var(--ui-line-height);
    }
    :host:focus-visible {
      outline: 3px solid var(--ui-color-focus);
      outline-offset: 3px;
    }
    :host([hidden]) { display: none; }
    @media (forced-colors: active) {
      :host:focus-visible { outline-color: Highlight; }
    }
  `,
})
export class TableContainer {
  readonly label = input.required<string>();
}

/**
 * The application projects native thead/tbody/tr/th/td and assigns th scope,
 * aria-sort and native selection controls. This is a table, not an ARIA grid.
 */
@Component({
  selector: 'table[uiTable]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ui-table' },
  template: `
    <caption>{{ caption() }}</caption>
    <ng-content />
  `,
  styles: `
    .ui-table {
      inline-size: 100%;
      border-collapse: collapse;
      color: var(--ui-color-text);
      font-family: var(--ui-font-family);
      font-size: var(--ui-font-body);
      line-height: var(--ui-line-height);
    }
    .ui-table > caption {
      padding: var(--ui-space-3) 0;
      text-align: start;
      font-weight: 600;
    }
    .ui-table > thead > tr > th,
    .ui-table > tbody > tr > th,
    .ui-table > tbody > tr > td,
    .ui-table > tfoot > tr > th,
    .ui-table > tfoot > tr > td {
      padding: var(--ui-space-3) var(--ui-space-4);
      border-block-end: 1px solid var(--ui-color-border);
      text-align: start;
      vertical-align: top;
    }
    .ui-table > thead > tr > th {
      background: var(--ui-color-background);
      font-weight: 600;
    }
    .ui-table > tbody > tr > th { font-weight: 600; }
    .ui-table[hidden] { display: none; }
  `,
})
export class DataTable {
  readonly caption = input.required<string>();
}
