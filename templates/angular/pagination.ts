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
      <button uiAction aria-label="前のページ"
        [disabled]="!valid() || disabled() || totalPages() === 0 || page() <= 1"
        (click)="goTo(page() - 1)">前へ</button>
      <p aria-live="polite" aria-atomic="true">
        @if (!valid()) { ページ情報を表示できません }
        @else if (totalPages() === 0) { ページはありません }
        @else { {{ page() }} / {{ totalPages() }} ページ }
      </p>
      <button uiAction aria-label="次のページ"
        [disabled]="!valid() || disabled() || totalPages() === 0 || page() >= totalPages()"
        (click)="goTo(page() + 1)">次へ</button>
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
      gap: var(--ui-space-3);
      color: var(--ui-color-text);
      font-family: var(--ui-font-family);
      font-size: var(--ui-font-body);
      line-height: var(--ui-line-height);
    }
    p { margin: 0; }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly label = input('ページ選択');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly pageChange = output<number>();

  protected readonly valid = computed(() => {
    const page = this.page();
    const total = this.totalPages();
    return Number.isSafeInteger(total) && total >= 0 &&
      Number.isSafeInteger(page) && page >= 1 &&
      (total === 0 ? page === 1 : page <= total);
  });

  protected goTo(page: number): void {
    if (this.disabled() || !this.valid() || !Number.isSafeInteger(page) ||
        page < 1 || page > this.totalPages() || page === this.page()) {
      return;
    }
    this.pageChange.emit(page);
  }
}
