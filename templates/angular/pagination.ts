import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessageText,UiStableMessagePipe} from './locale';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { ActionControl } from './action-control';

/**
 * Page state belongs to the application. Inputs must be safe integers:
 * totalPages >= 0, 1 <= page <= totalPages; with totalPages = 0 use page = 1.
 * Unknown or invalid totals are not an empty result and disable navigation.
 */
@Component({
  selector: 'ui-pagination',
  standalone: true,
  imports: [ActionControl,UiStableMessagePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav [attr.aria-label]="uiEffective_label()">
      @if (showFirstLast()) {
        <button uiAction [attr.aria-label]="'uiFoundation.pagination.firstPage' | uiStableMessage" [disabled]="blocked() || page() <= 1" (click)="goTo(1)">{{'uiFoundation.pagination.first' | uiStableMessage}}</button>
      }
      <button uiAction [attr.aria-label]="'uiFoundation.pagination.previousPage' | uiStableMessage"
        [disabled]="blocked() || page() <= 1"
        (click)="goTo(page() - 1)">{{'uiFoundation.pagination.previous' | uiStableMessage}}</button>
      <p aria-live="polite" aria-atomic="true">
        @if (!valid()) {  {{'uiFoundation.pagination.pageInformationIsUnavailable' | uiStableMessage}} }
        @else if (pages() === 0) {  {{'uiFoundation.pagination.noPages' | uiStableMessage}} }
        @else { {{ page() }} / {{ pages() }} {{'uiFoundation.pagination.page' | uiStableMessage}} }
        @if (valid() && totalItems() !== null) { · {{'uiFoundation.pagination.itemsCount' | uiStableMessage:{count:totalItems()!} }} }
      </p>
      <button uiAction [attr.aria-label]="'uiFoundation.pagination.nextPage' | uiStableMessage"
        [disabled]="blocked() || page() >= pages()!"
        (click)="goTo(page() + 1)">{{'uiFoundation.pagination.next' | uiStableMessage}}</button>
      @if (showFirstLast()) {
        <button uiAction [attr.aria-label]="'uiFoundation.pagination.lastPage' | uiStableMessage" [disabled]="blocked() || page() >= pages()!" (click)="goTo(pages()!)">{{'uiFoundation.pagination.last' | uiStableMessage}}</button>
      }
      @if (pageSizeOptions().length) {
        <div><span>{{'uiFoundation.pagination.itemsPerPage' | uiStableMessage}}</span>
          <div class="ui-select-control"><select [attr.aria-label]="'uiFoundation.pagination.itemsPerPage' | uiStableMessage" class="ui-field-control" [value]="pageSize()" [disabled]="disabled() || busy() || !valid()" (change)="changeSize($event)">
            @for (size of pageSizeOptions(); track size) { <option [value]="size" [selected]="size === pageSize()">{{'uiFoundation.pagination.itemsCount' | uiStableMessage:{count:size} }}</option> }
          </select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></div>
        </div>
      }
    </nav>
  `,
  styles: `
    :host { display: block; }
    :host([hidden]) { display: none; }
    nav {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: start;
      gap: var(--ui-space-field);
      color: var(--ui-color-text);
      font-family: var(--ui-font-body);
      font-size: var(--ui-text-body);
      font-weight: var(--ui-weight-body);
      line-height: var(--ui-leading-body);
    }
    p { margin: 0; }
  `,
})
export class Pagination {
 protected readonly uiText_Pagination=injectUiMessageText();
  readonly page = input.required<number>();
  readonly totalPages = input<number | null>(null);
  readonly totalItems = input<number | null>(null);
  readonly pageSize = input(10);
  readonly pageSizeOptions = input<readonly number[]>([]);
  readonly showFirstLast = input(true, { transform: booleanAttribute });
  readonly busy = input(false, { transform: booleanAttribute });
  readonly label = input<string>();
 protected readonly uiEffective_label=uiLocaleComputed(()=>this.label()??this.uiText_Pagination("uiFoundation.pagination.chooseAPage"));
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly pages = computed(() => this.totalPages() ?? (this.totalItems() === null ? null : Math.ceil(this.totalItems()! / this.pageSize())));

  protected readonly valid = computed(() => {
    const page = this.page();
    const total = this.pages();
    return total !== null && Number.isSafeInteger(total) && total >= 0 &&
      Number.isSafeInteger(this.pageSize()) && this.pageSize() > 0 &&
      this.pageSizeOptions().every(size => Number.isSafeInteger(size) && size > 0) &&
      new Set(this.pageSizeOptions()).size === this.pageSizeOptions().length &&
      (this.totalItems() === null || Number.isSafeInteger(this.totalItems()) && this.totalItems()! >= 0) &&
      (this.totalItems() === null || this.totalPages() === null || Math.ceil(this.totalItems()! / this.pageSize()) === total) &&
      Number.isSafeInteger(page) && page >= 1 &&
      (total === 0 ? page === 1 : page <= total);
  });
  protected readonly blocked = computed(() => this.disabled() || this.busy() || !this.valid() || this.pages() === 0);

  protected changeSize(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    if (!this.disabled() && !this.busy() && this.valid() && this.pageSizeOptions().includes(size) && size !== this.pageSize()) this.pageSizeChange.emit(size);
  }

  protected goTo(page: number): void {
    if (this.blocked() || !Number.isSafeInteger(page) ||
        page < 1 || page > this.pages()! || page === this.page()) {
      return;
    }
    this.pageChange.emit(page);
  }
}
