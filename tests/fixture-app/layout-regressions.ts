import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ActionControl, ActionLink, FieldControl, FormField } from '../../.ui/generated/angular/index';

@Component({
  selector: 'fixture-layout-regressions',
  imports: [ActionControl, ActionLink, FieldControl, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; min-inline-size: 0; }
    .layout-action-examples { display: grid; gap: var(--ui-space-field); min-inline-size: 0; }
    .layout-action-examples > div { min-inline-size: 0; }
  `,
  template: `
    <section class="fixture-basic-parts" aria-labelledby="layout-regressions-title">
      <h2 id="layout-regressions-title">レイアウトの回帰検証</h2>

      <section aria-labelledby="hidden-checkbox-title">
        <h3 id="hidden-checkbox-title">確認欄の表示と入力保持</h3>
        <label class="fixture-checkbox-label" for="layout-confirmation-hidden">
          <input id="layout-confirmation-hidden" type="checkbox" [checked]="confirmationHidden()"
            (change)="confirmationHidden.set(checked($event))">追加の確認欄を非表示にする
        </label>
        <ui-form-field data-testid="layout-confirmation-field" controlId="layout-confirmation"
          label="追加書類を確認しました" [hidden]="confirmationHidden()">
          <input uiFieldControl type="checkbox" [checked]="confirmed()" (change)="confirmed.set(checked($event))">
        </ui-form-field>
        <button uiAction data-testid="layout-after-confirmation">確認後の操作</button>
      </section>

      <section aria-labelledby="long-action-title">
        <h3 id="long-action-title">長い操作ラベルと処理中表示</h3>
        <label class="fixture-checkbox-label" for="layout-actions-busy">
          <input id="layout-actions-busy" type="checkbox" [checked]="actionsBusy()"
            (change)="actionsBusy.set(checked($event))">長いラベルの操作を処理中にする
        </label>
        <div class="layout-action-examples" data-testid="layout-action-examples">
          <div><button uiAction data-testid="layout-japanese-button" [busy]="actionsBusy()"
            (click)="buttonCount.update(increment)">申請内容を確認して次の手続きに進む</button></div>
          <div><a uiAction data-testid="layout-japanese-link" href="#layout-action-destination" [busy]="actionsBusy()"
            (click)="linkCount.update(increment)" (auxclick)="linkCount.update(increment)">申請内容を確認して次の手続きに進む</a></div>
          <div><button uiAction data-testid="layout-ascii-button" [busy]="actionsBusy()"
            (click)="buttonCount.update(increment)">ReviewApplicationDetailsBeforeContinuingToTheNextStep</button></div>
          <div><a uiAction data-testid="layout-ascii-link" href="#layout-action-destination" [busy]="actionsBusy()"
            (click)="linkCount.update(increment)" (auxclick)="linkCount.update(increment)">ReviewApplicationDetailsBeforeContinuingToTheNextStep</a></div>
        </div>
        <div class="fixture-counters" aria-label="長いラベルの操作回数">
          <p data-testid="layout-button-count">ボタン操作: {{ buttonCount() }}</p>
          <p data-testid="layout-link-count">リンク操作: {{ linkCount() }}</p>
        </div>
        <p id="layout-action-destination">次の手続きの確認位置</p>
      </section>
    </section>
  `,
})
export class LayoutRegressionsFixture {
  readonly confirmationHidden = signal(false);
  readonly confirmed = signal(false);
  readonly actionsBusy = signal(false);
  readonly buttonCount = signal(0);
  readonly linkCount = signal(0);
  readonly increment = (count: number): number => count + 1;

  checked(event: Event): boolean { return (event.target as HTMLInputElement).checked; }
}
