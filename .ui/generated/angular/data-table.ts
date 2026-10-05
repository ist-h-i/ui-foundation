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
      font-family: var(--ui-font-body);
      font-size: var(--ui-text-body);
      font-weight: var(--ui-weight-body);
      line-height: var(--ui-leading-body);
    }
    :host:focus-visible {
      outline: var(--ui-border-focus) solid var(--ui-color-focus);
      outline-offset: var(--ui-border-focus-offset);
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
      font-family: var(--ui-font-body);
      font-size: var(--ui-text-body);
      font-weight: var(--ui-weight-body);
      line-height: var(--ui-leading-body);
    }
    .ui-table > caption {
      padding: var(--ui-space-table-y) 0;
      text-align: start;
      font-weight: var(--ui-weight-control);
    }
    .ui-table > thead > tr > th,
    .ui-table > tbody > tr > th,
    .ui-table > tbody > tr > td,
    .ui-table > tfoot > tr > th,
    .ui-table > tfoot > tr > td {
      padding: var(--ui-space-table-y) var(--ui-space-table-x);
      border-block-end: var(--ui-border-control) solid var(--ui-color-border);
      text-align: start;
      vertical-align: top;
    }
    .ui-table > thead > tr > th {
      background: var(--ui-color-background);
      font-weight: var(--ui-weight-control);
    }
    .ui-table > tbody > tr > th { font-weight: var(--ui-weight-control); }
    .ui-table[hidden] { display: none; }
  `,
})
export class DataTable {
  readonly caption = input.required<string>();
}
