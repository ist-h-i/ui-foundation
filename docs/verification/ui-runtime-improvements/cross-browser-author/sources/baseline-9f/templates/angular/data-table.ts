import {injectUiText as injectUiRuntimeText} from './locale';
import { afterRenderEffect, booleanAttribute, computed, ElementRef, inject, output, ChangeDetectionStrategy, Component, input, ViewEncapsulation, } from '@angular/core';
@Component({
    selector: 'ui-table-container',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'ui-table-container',
        role: 'region',
        tabindex: '0',
        '[attr.aria-label]': 'label()',
        '[style.overflow-x]': 'scrollDirection() === "inline" || scrollDirection() === "both" ? "auto" : "hidden"',
        '[style.overflow-y]': 'scrollDirection() === "block" || scrollDirection() === "both" ? "auto" : "hidden"',
        '[style.block-size.px]': 'height()',
        '[style.max-block-size]': 'maxHeight() !== null ? maxHeight() + "px" : displaySize() === "viewport" ? "var(--ui-size-table-viewport)" : null',
        '(scroll)': 'scrolled()',
    },
    template: `@if(caption()){<p class="ui-table-container__caption">{{caption()}}</p>}@if(problem()){<p role="alert">{{problem()}}</p>}<ng-content />`,
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
    .ui-table-container__caption { margin: 0; padding-block: var(--ui-space-table-y); font-weight: var(--ui-weight-control); }
    :host([hidden]) { display: none; }
    @media (forced-colors: active) {
      :host:focus-visible { outline-color: Highlight; }
    }
  `,
})
export class TableContainer {
 private readonly uiRuntimeText_TableContainer=injectUiRuntimeText();

    readonly label = input.required<string>();
    readonly caption = input('');
    readonly scrollDirection = input<'inline' | 'block' | 'both' | 'none'>('inline');
    readonly displaySize = input<'content' | 'viewport'>('content');
    readonly height = input<number | null>(null);
    readonly maxHeight = input<number | null>(null);
    readonly scrollTop = input<number | null>(null);
    readonly scrollLeft = input<number | null>(null);
    readonly scrollChange = output<{
        top: number;
        left: number;
    }>();
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    protected readonly problem = computed(() => !this.label().trim() || [this.height(), this.maxHeight()].some(value => value !== null && (!Number.isFinite(value) || value <= 0)) || [this.scrollTop(), this.scrollLeft()].some(value => value !== null && !Number.isFinite(value)) ? this.uiRuntimeText_TableContainer('表領域の説明、表示サイズ、スクロール位置を確認してください。') : null);
    protected scrolled(): void { this.scrollChange.emit({ top: this.element.scrollTop, left: this.element.scrollLeft }); }
    constructor() {
        let previousTop: number | null = null, previousLeft: number | null = null;
        afterRenderEffect(() => {
            const top = this.scrollTop(), left = this.scrollLeft();
            if (this.problem())
                return;
            if (top !== null && top !== previousTop)
                this.element.scrollTop = top;
            if (left !== null && left !== previousLeft)
                this.element.scrollLeft = left;
            previousTop = top;
            previousLeft = left;
        });
    }
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
