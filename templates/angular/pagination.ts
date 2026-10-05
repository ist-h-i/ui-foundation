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
  imports: [ActionControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav [attr.aria-label]="label()">
      @if (showFirstLast()) {
        <button uiAction aria-label="最初のページ" [disabled]="blocked() || page() <= 1" (click)="goTo(1)">最初</button>
      }
      <button uiAction aria-label="前のページ"
        [disabled]="blocked() || page() <= 1"
        (click)="goTo(page() - 1)">前へ</button>
      <p aria-live="polite" aria-atomic="true">
        @if (!valid()) { ページ情報を表示できません }
        @else if (pages() === 0) { ページはありません }
        @else { {{ page() }} / {{ pages() }} ページ }
        @if (valid() && totalItems() !== null) { · {{ totalItems() }} 件 }
      </p>
      <button uiAction aria-label="次のページ"
        [disabled]="blocked() || page() >= pages()!"
        (click)="goTo(page() + 1)">次へ</button>
      @if (showFirstLast()) {
        <button uiAction aria-label="最後のページ" [disabled]="blocked() || page() >= pages()!" (click)="goTo(pages()!)">最後</button>
      }
      @if (pageSizeOptions().length) {
        <div><span>表示件数</span>
          <select aria-label="表示件数" class="ui-field-control" [value]="pageSize()" [disabled]="disabled() || busy() || !valid()" (change)="changeSize($event)">
            @for (size of pageSizeOptions(); track size) { <option [value]="size" [selected]="size === pageSize()">{{ size }} 件</option> }
          </select>
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
  readonly page = input.required<number>();
  readonly totalPages = input<number | null>(null);
  readonly totalItems = input<number | null>(null);
  readonly pageSize = input(10);
  readonly pageSizeOptions = input<readonly number[]>([]);
  readonly showFirstLast = input(true, { transform: booleanAttribute });
  readonly busy = input(false, { transform: booleanAttribute });
  readonly label = input('ページ選択');
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
