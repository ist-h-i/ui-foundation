import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ActionControl, Breadcrumb, DataTable, Dialog, Disclosure, FieldControl, FormField,
  Navigation, NavigationItem, Pagination, RadioGroup, RadioOption, TableContainer, TabPanel, Tabs,
} from '../../.ui/generated/angular/index';

interface ReviewRow { name: string; confirmedAt: string | null; }
const REVIEW_ROWS: ReviewRow[] = [
  { name: '申請 A', confirmedAt: null },
  { name: '申請 B', confirmedAt: '2026-10-01' },
  { name: '申請 C', confirmedAt: '2026-10-02' },
  { name: '申請 D', confirmedAt: '2026-10-02' },
  { name: '申請 E', confirmedAt: '2026-10-03' },
  { name: '申請 F', confirmedAt: '2026-10-03' },
];

@Component({
  selector: 'fixture-basic-parts',
  imports: [ActionControl, Breadcrumb, DataTable, Dialog, Disclosure, FieldControl, FormField,
    Navigation, NavigationItem, Pagination, RadioGroup, RadioOption, TableContainer, TabPanel, Tabs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fixture-basic-parts" aria-labelledby="basic-title">
      <h2 id="basic-title">一覧と表示設定</h2>
      <nav uiNavigation label="申請のメニュー">
        <ul><li><a uiNavigationItem href="#basic-table" currentPage>申請一覧</a></li>
          <li><a uiNavigationItem href="#basic-settings">表示設定</a></li></ul>
      </nav>
      <nav uiBreadcrumb label="申請のパンくず">
        <ol><li><a uiNavigationItem href="#main-content">ホーム</a></li>
          <li><a uiNavigationItem href="#basic-table" currentPage>申請一覧</a></li></ol>
      </nav>

      <section id="basic-table" aria-labelledby="table-section-title">
        <h3 id="table-section-title">確認状況を比べる</h3>
        <ui-table-container label="申請の確認状況の表領域">
          <table uiTable caption="申請の確認状況">
            <thead><tr>
              <th scope="col" [attr.aria-sort]="sortDirection()"><button uiAction (click)="toggleSort()">申請名</button></th>
              <th scope="col">確認日時</th>
            </tr></thead>
            <tbody>
              @for (row of visibleRows(); track row.name) {
                <tr data-testid="basic-table-row"><th scope="row">{{ row.name }}</th><td>{{ row.confirmedAt || '未取得' }}</td></tr>
              } @empty {
                <tr><td colspan="2">{{ pageInformation() === 'empty' ? '表示できる申請はありません。' : 'ページ情報を確認してください。' }}</td></tr>
              }
            </tbody>
          </table>
        </ui-table-container>
        <p class="fixture-secondary">未取得は確認日時の欠損を意味します。</p>
        <ui-pagination label="申請表のページ" [page]="currentPage()" [totalPages]="totalPages()" (pageChange)="changePage($event)" />
        <div class="fixture-counters">
          <p data-testid="current-basic-page">表示中のページ: {{ currentPage() }}</p>
          <p data-testid="basic-page-count">ページ変更: {{ pageCount() }}</p>
        </div>
        <div class="fixture-control-label fixture-basic-control">
          <div class="catalog-setting"><label for="page-information">ページ情報の状態</label><span class="ui-select-control fixture-select"><select class="ui-field-control" id="page-information" [value]="pageInformation()" (change)="changePageInformation($event)">
            <option value="normal">正常な3ページ</option><option value="empty">対象なし（0ページ）</option>
            <option value="invalid">不正な総ページ数（1.5）</option>
          </select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></div>
        </div>
      </section>

      <section aria-labelledby="related-title">
        <h3 id="related-title">関連情報</h3>
        <label class="fixture-checkbox-label" for="related-information-hidden"><input id="related-information-hidden" type="checkbox"
          [checked]="relatedInformationHidden()" (change)="relatedInformationHidden.set(checked($event))">関連情報を非表示にする</label>
        <ui-tabs label="申請の関連情報" [hidden]="relatedInformationHidden()" [selected]="selectedTab()" (selectedChange)="selectedTab.set($event)">
          <ui-tab-panel panelId="review-notes" label="確認メモ">
            <ui-form-field controlId="review-memo" label="確認メモの入力">
              <input uiFieldControl [value]="reviewMemo()" (input)="reviewMemo.set(value($event))">
            </ui-form-field>
          </ui-tab-panel>
          <ui-tab-panel panelId="attachments" label="添付資料">
            <p>備品の見積書: 1件</p>
            <ui-form-field controlId="attachment-memo" label="資料の補足">
              <input uiFieldControl [value]="attachmentMemo()" (input)="attachmentMemo.set(value($event))">
            </ui-form-field>
            <ui-tabs label="添付資料の詳細" [selected]="innerSelectedTab()" (selectedChange)="innerSelectedTab.set($event)">
              <ui-tab-panel panelId="attachment-files" label="ファイル"><p>見積書.pdf</p></ui-tab-panel>
              <ui-tab-panel panelId="attachment-history" label="更新履歴"><p>2026-10-01 に見積書を追加しました。</p></ui-tab-panel>
            </ui-tabs>
          </ui-tab-panel>
        </ui-tabs>
        <ui-disclosure data-testid="optional-information" title="共有事項" [hidden]="relatedInformationHidden()" [open]="expanded()" (openChange)="expanded.set($event)">
          <ui-form-field controlId="shared-memo" label="共有メモ" hint="必要なときだけ開いて参照できます。">
            <input uiFieldControl [value]="sharedMemo()" (input)="sharedMemo.set(value($event))">
          </ui-form-field>
        </ui-disclosure>
      </section>

      <section id="basic-settings" aria-labelledby="settings-title">
        <h3 id="settings-title">通知の設定</h3>
        <form id="notification-form">
        <ui-radio-group name="notification-method" label="申請の通知方法" [value]="notification()" [required]="true"
          hint="申請の更新通知を受け取る方法です。" [error]="notificationError() ? '通知先の設定を確認してください。' : null"
          [disabled]="notificationDisabled()" (valueChange)="notification.set($event)">
          <label class="ui-radio-option"><input uiRadioOption value="email">メール</label>
          <label class="ui-radio-option"><input uiRadioOption value="in-app">アプリ内</label>
          <label class="ui-radio-option"><input uiRadioOption value="off">受け取らない</label>
        </ui-radio-group>
        </form>
        <p data-testid="current-notification">選択中の通知: {{ notificationLabel(notification()) }}</p>
        <div class="fixture-actions">
          <label class="fixture-checkbox-label" for="notification-error"><input id="notification-error" type="checkbox"
            [checked]="notificationError()" (change)="notificationError.set(checked($event))">通知設定のエラーを表示</label>
          <label class="fixture-checkbox-label" for="notification-disabled"><input id="notification-disabled" type="checkbox"
            [checked]="notificationDisabled()" (change)="notificationDisabled.set(checked($event))">通知設定を変更できなくする</label>
        </div>
        <button uiAction [disabled]="notificationError()" (click)="dialogOpen.set(true)">表示設定を確認</button>
        <p data-testid="applied-notification">適用済みの通知: {{ notificationLabel(appliedNotification()) }}</p>
        <p data-testid="dialog-cancel-count">Escapeで閉じた回数: {{ dialogCancelCount() }}</p>
      </section>

      <dialog uiDialog label="表示設定の確認" [open]="dialogOpen()" (openChange)="dialogOpen.set($event)"
        (cancelled)="countDialogCancel()">
        <h3>表示設定の確認</h3>
        <p>申請の通知方法を「{{ notificationLabel(notification()) }}」に変更します。</p>
        <div class="fixture-actions">
          <div class="catalog-actions"><button uiAction variant="primary" autofocus (click)="applySettings()">設定を適用</button>
          <button uiAction (click)="dialogOpen.set(false)">設定の確認を閉じる</button></div>
        </div>
      </dialog>
    </section>
  `,
})
export class BasicPartsFixture {
  readonly sortDirection = signal<'ascending' | 'descending'>('ascending');
  readonly currentPage = signal(1);
  readonly pageCount = signal(0);
  readonly pageInformation = signal<'normal' | 'empty' | 'invalid'>('normal');
  readonly totalPages = computed(() => this.pageInformation() === 'normal' ? 3 : this.pageInformation() === 'empty' ? 0 : 1.5);
  readonly visibleRows = computed(() => {
    if (this.pageInformation() !== 'normal') return [];
    const rows = this.sortDirection() === 'ascending' ? REVIEW_ROWS : [...REVIEW_ROWS].reverse();
    return rows.slice((this.currentPage() - 1) * 2, this.currentPage() * 2);
  });
  readonly selectedTab = signal('review-notes');
  readonly relatedInformationHidden = signal(false);
  readonly innerSelectedTab = signal('attachment-files');
  readonly reviewMemo = signal('');
  readonly attachmentMemo = signal('');
  readonly sharedMemo = signal('');
  readonly expanded = signal(false);
  readonly notification = signal('email');
  readonly notificationError = signal(false);
  readonly notificationDisabled = signal(false);
  readonly appliedNotification = signal('email');
  readonly dialogOpen = signal(false);
  readonly dialogCancelCount = signal(0);

  value(event: Event): string { return (event.target as HTMLInputElement | HTMLSelectElement).value; }
  checked(event: Event): boolean { return (event.target as HTMLInputElement).checked; }
  notificationLabel(value: string): string { return { email: 'メール', 'in-app': 'アプリ内', off: '受け取らない' }[value] ?? '未選択'; }
  toggleSort(): void {
    this.sortDirection.update((direction) => direction === 'ascending' ? 'descending' : 'ascending');
    this.currentPage.set(1);
  }
  changePage(page: number): void { this.currentPage.set(page); this.pageCount.update((count) => count + 1); }
  changePageInformation(event: Event): void {
    this.pageInformation.set(this.value(event) as 'normal' | 'empty' | 'invalid');
    this.currentPage.set(1);
  }
  countDialogCancel(): void { this.dialogCancelCount.update((count) => count + 1); }
  applySettings(): void { this.appliedNotification.set(this.notification()); this.dialogOpen.set(false); }
}
