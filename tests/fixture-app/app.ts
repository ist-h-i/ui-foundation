import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { uiProfiles } from '../../.ui/generated/profiles';
import {
  ActionControl,
  ActionFeedback,
  ActionLink,
  AsyncRegion,
  FieldControl,
  FormField,
  PageFrame,
  type ActionFeedbackState,
  type AsyncRegionState,
} from '../../.ui/generated/angular/index';
import { BasicPartsFixture } from './basic-parts';
import { LayoutRegressionsFixture } from './layout-regressions';

type SaveOutcome = 'success' | 'error' | 'unknown';
type RegionKind = AsyncRegionState['kind'];
type Category = 'general' | 'equipment' | 'travel';
type DisplayProfile = typeof uiProfiles.profiles[number]['id'];
interface Application {
  id: number;
  name: string;
  category: Category;
  notes: string;
  verified: boolean;
  approved: boolean;
}

const INITIAL_APPLICATIONS: Application[] = [
  { id: 1, name: '会議室の備品購入', category: 'general', notes: '会議室のモニターを更新します。', verified: false, approved: false },
  { id: 2, name: '出張旅費の精算', category: 'travel', notes: '先月の出張にかかった交通費です。', verified: true, approved: false },
];

const REGION_MESSAGES: Record<Exclude<RegionKind, 'ready'>, string> = {
  loading: '一覧を取得しています。',
  empty: '表示できる申請はありません。',
  error: '一覧を取得できませんでした。編集内容は利用できます。',
  refreshing: '一覧を更新しています。前回の情報を表示しています。',
  partial: '確認者情報が取得できません。申請名の編集は続けられますが、承認はできません。',
  stale: '一覧の更新に失敗しました。表示中の情報は前回取得時点のものです。',
};

@Component({
  selector: 'fixture-app',
  imports: [PageFrame, ActionControl, ActionLink, FormField, FieldControl, AsyncRegion, ActionFeedback, BasicPartsFixture, LayoutRegressionsFixture],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main-content" class="fixture-main" [attr.data-ui-profile]="profile()">
      <ui-page-frame title="申請の編集">
        <p uiPageContext class="fixture-context">{{ selectedApplication()?.name || '削除済みの申請' }} · {{ selectedApplication()?.approved ? '承認済み' : '下書き' }}の内容を確認して保存します。</p>
        <div uiPageActions class="fixture-actions">
          <button uiAction variant="primary" type="submit" form="application-form"
            [busy]="saving()" [disabled]="saveDisabled()">変更を保存</button>
          <a uiAction href="#application-details" [disabled]="linksDisabled()" [busy]="linksBusy()"
            (click)="countLink()" (auxclick)="countLink()">申請の詳細</a>
        </div>

        <div class="fixture-display-settings">
          <div class="fixture-control-label">
            <div class="catalog-setting"><label for="display-profile">表示設定</label><span class="ui-select-control fixture-select"><select id="display-profile" class="ui-field-control" [value]="profile()" (change)="changeProfile($event)">
              @for (option of displayProfiles; track option.id) {
                <option [value]="option.id" [selected]="option.id === profile()">{{ option.label }}</option>
              }
            </select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></div>
          </div>
          <p data-testid="profile-utility" class="bg-color-action text-color-on-action px-control-x py-control-y font-family-body text-size-body rounded-control">選んだ設定で編集を続けられます。</p>
        </div>

        <div class="fixture-workspace">
          <section class="fixture-editor" aria-labelledby="editor-title">
            <h2 id="editor-title">編集内容</h2>
            <form id="application-form" novalidate (submit)="save($event)" (reset)="resetForm($event)">
              <ui-form-field controlId="application-name" label="申請名" [required]="true"
                hint="一覧で内容を識別できる名前にしてください。" [error]="nameError()" describedBy="name-policy">
                <input uiFieldControl name="applicationName" autocomplete="off" [value]="name()" (input)="name.set(value($event))">
              </ui-form-field>
              <p id="name-policy" class="fixture-secondary">保存すると、同じ申請の一覧表示も更新されます。</p>

              <ui-form-field controlId="application-category" label="申請区分">
                <span class="ui-select-control fixture-select"><select class="ui-field-control" uiFieldControl name="category" [value]="category()" (change)="changeCategory($event)">
                  <option value="general">一般</option><option value="equipment">備品</option><option value="travel">旅費</option>
                </select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span>
              </ui-form-field>

              <ui-form-field controlId="application-notes" label="補足" hint="判断に必要な情報があれば記入してください。">
                <textarea uiFieldControl name="notes" rows="3" [value]="notes()" (input)="notes.set(value($event))"></textarea>
              </ui-form-field>

              <ui-form-field controlId="application-verified" label="内容を確認しました">
                <input uiFieldControl type="checkbox" name="verified" [checked]="verified()" (change)="verified.set(checked($event))">
              </ui-form-field>

              <div class="fixture-actions">
                <div class="catalog-actions"><button uiAction type="reset" [disabled]="saving() || unresolved()">入力を戻す</button>
                <button uiAction variant="danger" [disabled]="saving() || unresolved() || !selectedApplication()" (click)="deleteApplication()">申請を削除</button></div>
              </div>
              <p class="fixture-secondary">削除は一覧に反映されます。「元に戻す」で同じデータを復元できます。</p>
            </form>

            <ui-action-feedback data-testid="save-feedback" [state]="saveFeedback()"
              [recoveryLabel]="unresolved() ? '保存先を確認' : ''" [recoveryBusy]="confirming()" (recover)="confirmSave()" />
            <ui-action-feedback data-testid="delete-feedback" [state]="deleteFeedback()"
              [recoveryLabel]="deleted() ? '元に戻す' : ''" (recover)="undoDelete()" />

            <section id="application-details" class="fixture-saved" aria-labelledby="saved-title">
              <h3 id="saved-title">現在の保存内容</h3>
              @if (selectedApplication(); as application) {
                <dl>
                  <div><dt>申請名</dt><dd data-testid="saved-name">{{ application.name }}</dd></div>
                  <div><dt>区分</dt><dd data-testid="saved-category">{{ categoryLabel(application.category) }}</dd></div>
                  <div><dt>確認</dt><dd data-testid="saved-verified">{{ application.verified ? '確認済み' : '未確認' }}</dd></div>
                  <div><dt>補足</dt><dd data-testid="saved-notes">{{ application.notes || 'なし' }}</dd></div>
                </dl>
              } @else {
                <p>この申請は一覧から削除されています。</p>
              }
            </section>
          </section>

          <section class="fixture-list" aria-labelledby="list-title">
            <h2 id="list-title">申請一覧</h2>
            <ui-async-region data-testid="list-region" [state]="listState()" [retryAvailable]="listState().kind !== 'ready' && listState().kind !== 'empty'"
              [retryBusy]="retrying()" retryLabel="一覧を再取得" (retry)="retryList()">
              <ui-form-field controlId="list-filter" label="一覧を絞り込む">
                <input uiFieldControl type="search" [value]="filter()" (input)="filter.set(value($event))">
              </ui-form-field>
              <ul class="fixture-application-list">
                @for (application of filteredApplications(); track application.id) {
                  <li data-testid="application-row">
                    <span>{{ application.name }}</span>
                    <small>{{ application.approved ? '承認済み' : '下書き' }}</small>
                  </li>
                } @empty {
                  <li>条件に一致する申請はありません。</li>
                }
              </ul>
              <button uiAction [disabled]="approvalDisabled()" (click)="approve()">承認へ進む</button>
              <p class="fixture-secondary">承認には最新の確認者情報が必要です。</p>
            </ui-async-region>
          </section>
        </div>

        <section class="fixture-purge" aria-labelledby="purge-title">
          <h2 id="purge-title">精算済み申請の整理</h2>
          <p>対象: 出張旅費の精算</p>
          <div class="fixture-actions">
            <div class="catalog-actions"><button uiAction [disabled]="!hasPurgeTarget()" (click)="reviewPurge()">完全削除の影響を確認</button>
            <button uiAction variant="danger" [disabled]="!purgeAcknowledged() || !hasPurgeTarget()" (click)="purgeApplication()">完全に削除</button></div>
          </div>
          <ui-action-feedback data-testid="purge-feedback" [state]="purgeFeedback()" />
        </section>

        <fixture-basic-parts />
        <fixture-layout-regressions />

        <section class="fixture-profile-examples" aria-labelledby="profile-examples-title">
          <h2 id="profile-examples-title">表示設定の比較</h2>
          <div class="fixture-profile-scope" data-ui-profile="dense" data-testid="nested-dense-outer">
            <button uiAction variant="primary" data-testid="nested-dense-action">密度重視の操作</button>
            <div class="fixture-profile-scope" data-ui-profile="guided" data-testid="nested-guided-inner">
              <button uiAction variant="primary" data-testid="nested-guided-action">案内重視の操作</button>
              <p data-testid="nested-guided-utility" class="bg-color-action text-color-on-action px-control-x py-control-y font-family-body text-size-body rounded-control">入力内容を順に確認します。</p>
            </div>
          </div>
          <div class="fixture-profile-scope" data-ui-profile="guided" data-testid="nested-guided-outer">
            <button uiAction variant="primary" data-testid="nested-guided-outer-action">案内重視の操作</button>
            <div class="fixture-profile-scope" data-ui-profile="dense" data-testid="nested-dense-inner">
              <button uiAction variant="primary" data-testid="nested-dense-inner-action">密度重視の操作</button>
              <p data-testid="nested-dense-utility" class="bg-color-action text-color-on-action px-control-x py-control-y font-family-body text-size-body rounded-control">一覧の内容を比較します。</p>
            </div>
          </div>
        </section>

        <section class="fixture-controls" aria-labelledby="controls-title">
          <h2 id="controls-title">検証用の状態操作</h2>
          <p>この画面のデータはメモリ内だけに保存され、再読み込みで初期状態に戻ります。保存先への反映と画面への応答を分け、応答が届かない状態を再現できます。</p>
          <div class="fixture-control-grid">
            <div class="fixture-control-label">
              <div class="catalog-setting"><label for="save-outcome">保存結果</label><span class="ui-select-control fixture-select"><select class="ui-field-control" id="save-outcome" [value]="saveOutcome()" (change)="changeOutcome($event)">
                <option value="success">成功</option><option value="error">失敗</option><option value="unknown">応答が届かない</option>
              </select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></div>
            </div>
            <div class="fixture-control-label">
              <div class="catalog-setting"><label for="list-state">一覧の状態</label><span class="ui-select-control fixture-select"><select class="ui-field-control" id="list-state" [value]="listState().kind" [disabled]="retrying()" (change)="changeRegion($event)">
                <option value="ready">正常</option><option value="loading">取得中</option><option value="empty">空</option>
                <option value="error">取得失敗</option><option value="refreshing">更新中</option><option value="partial">一部欠損</option><option value="stale">更新失敗</option>
              </select><svg class="ui-select-control__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></span></div>
            </div>
            <label class="fixture-checkbox-label" for="link-disabled">
              <input id="link-disabled" type="checkbox" [checked]="linksDisabled()" (change)="linksDisabled.set(checked($event))">詳細リンクを無効にする
            </label>
            <label class="fixture-checkbox-label" for="link-busy">
              <input id="link-busy" type="checkbox" [checked]="linksBusy()" (change)="linksBusy.set(checked($event))">詳細リンクを処理中にする
            </label>
          </div>
          <div class="fixture-counters" aria-label="実行した操作の回数">
            <p data-testid="save-count">保存要求: {{ saveCount() }}</p>
            <p data-testid="retry-count">一覧再取得: {{ retryCount() }}</p>
            <p data-testid="link-count">リンク操作: {{ linkCount() }}</p>
          </div>
        </section>
      </ui-page-frame>
    </main>
  `,
})
export class FixtureApp {
  readonly displayProfiles = uiProfiles.profiles;
  readonly profile = signal<DisplayProfile>(uiProfiles.defaultProfile);
  readonly applications = signal<Application[]>(structuredClone(INITIAL_APPLICATIONS));
  readonly name = signal(INITIAL_APPLICATIONS[0]!.name);
  readonly category = signal<Category>(INITIAL_APPLICATIONS[0]!.category);
  readonly notes = signal(INITIAL_APPLICATIONS[0]!.notes);
  readonly verified = signal(INITIAL_APPLICATIONS[0]!.verified);
  readonly filter = signal('');
  readonly saving = signal(false);
  readonly unresolved = signal(false);
  readonly confirming = signal(false);
  readonly saveCount = signal(0);
  readonly retryCount = signal(0);
  readonly linkCount = signal(0);
  readonly saveOutcome = signal<SaveOutcome>('success');
  readonly linksDisabled = signal(false);
  readonly linksBusy = signal(false);
  readonly listState = signal<AsyncRegionState>({ kind: 'ready' });
  readonly retrying = signal(false);
  readonly deleted = signal<{ application: Application; index: number } | null>(null);
  readonly purgeAcknowledged = signal(false);
  readonly saveFeedback = signal<ActionFeedbackState>({ kind: 'idle' });
  readonly deleteFeedback = signal<ActionFeedbackState>({ kind: 'idle' });
  readonly purgeFeedback = signal<ActionFeedbackState>({ kind: 'idle' });
  readonly selectedApplication = computed(() => this.applications().find((application) => application.id === 1));
  readonly nameError = computed(() => this.name().trim() ? null : '申請名を入力してください。');
  readonly saveDisabled = computed(() => !!this.nameError() || this.unresolved() || !this.selectedApplication());
  readonly approvalDisabled = computed(() => this.listState().kind !== 'ready' || !this.selectedApplication() || this.saving() || this.unresolved());
  readonly hasPurgeTarget = computed(() => this.applications().some((application) => application.id === 2));
  readonly filteredApplications = computed(() => this.applications().filter((application) => application.name.includes(this.filter())));

  // A separate store lets the fixture observe a committed update whose response was lost.
  private storedApplications = structuredClone(INITIAL_APPLICATIONS);

  value(event: Event): string { return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value; }
  checked(event: Event): boolean { return (event.target as HTMLInputElement).checked; }
  changeProfile(event: Event): void {
    const selected = this.value(event);
    const profile = this.displayProfiles.find((candidate) => candidate.id === selected);
    if (profile) this.profile.set(profile.id);
  }
  changeCategory(event: Event): void { this.category.set(this.value(event) as Category); }
  changeOutcome(event: Event): void { this.saveOutcome.set(this.value(event) as SaveOutcome); }
  changeRegion(event: Event): void {
    const kind = this.value(event) as RegionKind;
    this.listState.set(kind === 'ready' ? { kind } : { kind, message: REGION_MESSAGES[kind] });
  }
  categoryLabel(category: Category): string { return { general: '一般', equipment: '備品', travel: '旅費' }[category]; }
  countLink(): void { this.linkCount.update((count) => count + 1); }

  save(event: Event): void {
    event.preventDefault();
    if (this.saving() || this.saveDisabled()) return;
    const outcome = this.saveOutcome();
    const current = this.selectedApplication()!;
    const update: Application = { ...current, name: this.name().trim(), category: this.category(), notes: this.notes(), verified: this.verified() };
    this.saving.set(true);
    this.saveCount.update((count) => count + 1);
    this.saveFeedback.set({ kind: 'idle' });
    window.setTimeout(() => {
      if (outcome === 'error') {
        this.saveFeedback.set({ kind: 'error', message: '保存できませんでした。入力は保持されています。' });
      } else {
        this.storedApplications = this.storedApplications.map((application) => application.id === update.id ? update : application);
        if (outcome === 'unknown') {
          this.unresolved.set(true);
          this.saveFeedback.set({ kind: 'unknown', message: '保存の応答を確認できません。重複保存を避けるため、保存先の状態を確認してください。' });
        } else {
          this.applications.set(structuredClone(this.storedApplications));
          this.saveFeedback.set({ kind: 'success', message: `${update.name}を保存しました。` });
        }
      }
      this.saving.set(false);
    }, 550);
  }

  confirmSave(): void {
    if (!this.unresolved() || this.confirming()) return;
    this.confirming.set(true);
    window.setTimeout(() => {
      this.applications.set(structuredClone(this.storedApplications));
      const application = this.selectedApplication();
      this.saveFeedback.set(application
        ? { kind: 'success', message: `保存先で${application.name}の反映を確認しました。` }
        : { kind: 'error', message: '保存先に対象の申請がありません。' });
      this.unresolved.set(false);
      this.confirming.set(false);
    }, 350);
  }

  resetForm(event: Event): void {
    event.preventDefault();
    if (this.saving() || this.unresolved()) return;
    const application = this.selectedApplication();
    if (!application) return;
    this.name.set(application.name);
    this.category.set(application.category);
    this.notes.set(application.notes);
    this.verified.set(application.verified);
  }

  retryList(): void {
    if (this.retrying()) return;
    this.retrying.set(true);
    this.retryCount.update((count) => count + 1);
    this.listState.set({ kind: 'refreshing', message: REGION_MESSAGES.refreshing });
    window.setTimeout(() => {
      this.applications.set(structuredClone(this.storedApplications));
      this.listState.set({ kind: 'ready' });
      this.retrying.set(false);
    }, 450);
  }

  deleteApplication(): void {
    if (this.saving() || this.unresolved()) return;
    const index = this.storedApplications.findIndex((application) => application.id === 1);
    const application = this.storedApplications[index];
    if (!application) return;
    this.deleted.set({ application: structuredClone(application), index });
    this.storedApplications = this.storedApplications.filter((item) => item.id !== 1);
    this.applications.set(structuredClone(this.storedApplications));
    this.deleteFeedback.set({ kind: 'success', message: `${application.name}を一覧から削除しました。` });
  }

  undoDelete(): void {
    const deleted = this.deleted();
    if (!deleted) return;
    this.storedApplications.splice(deleted.index, 0, structuredClone(deleted.application));
    this.applications.set(structuredClone(this.storedApplications));
    this.deleted.set(null);
    this.deleteFeedback.set({ kind: 'success', message: `${deleted.application.name}を一覧へ戻しました。` });
  }

  approve(): void {
    if (this.approvalDisabled()) return;
    this.storedApplications = this.storedApplications.map((application) => application.id === 1 ? { ...application, approved: true } : application);
    this.applications.set(structuredClone(this.storedApplications));
  }

  reviewPurge(): void {
    if (!this.hasPurgeTarget()) return;
    this.purgeAcknowledged.set(true);
    this.purgeFeedback.set({ kind: 'warning', message: '出張旅費の精算を完全に削除します。この検証中は元に戻せません。' });
  }

  purgeApplication(): void {
    if (!this.purgeAcknowledged() || !this.hasPurgeTarget()) return;
    this.storedApplications = this.storedApplications.filter((application) => application.id !== 2);
    this.applications.set(structuredClone(this.storedApplications));
    this.purgeAcknowledged.set(false);
    this.purgeFeedback.set({ kind: 'success', message: '出張旅費の精算を完全に削除しました。' });
  }
}
