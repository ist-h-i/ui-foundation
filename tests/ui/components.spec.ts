import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const pageErrors = new WeakMap<Page, string[]>();

for (const profile of ['guided', 'dense'] as const) {
  test.describe(profile, () => {
    test.beforeEach(async ({ page }) => {
      const errors: string[] = [];
      pageErrors.set(page, errors);
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/');
      await expect(page.getByRole('heading', { name: '申請の編集', exact: true })).toBeVisible();
      await page.getByLabel('表示設定', { exact: true }).selectOption(profile);
      await expect(page.locator('#main-content')).toHaveAttribute('data-ui-profile', profile);
      for (const testId of ['list-region', 'save-feedback']) {
        const status = page.getByTestId(testId).getByRole('status');
        await expect(status).toHaveCount(1);
        await expect(status).toHaveText('');
        await status.evaluate((element) => element.setAttribute('data-status-marker', 'constant-status'));
      }
    });

    test.afterEach(async ({ page }) => {
      expect(pageErrors.get(page)).toEqual([]);
    });

    test('保存処理中は再操作を抑止し、操作のラベルと結果を残す', async ({ page }) => {
      const save = page.getByRole('button', { name: '変更を保存', exact: false });
      await page.getByLabel('申請名', { exact: false }).fill('更新した申請');
      await save.click();
      await expect(save).toBeDisabled();
      await expect(save).toHaveAttribute('aria-busy', 'true');
      await expect(save).toContainText('変更を保存');
      await expect(save).toContainText('処理中');
      await save.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
      await expect(page.getByTestId('save-count')).toHaveText('保存要求: 1');
      await expect(page.getByTestId('save-feedback')).toContainText('更新した申請を保存しました。');
      await expect(save).toBeEnabled();
      await expect(page.getByTestId('saved-name')).toHaveText('更新した申請');
    });

    test('buttonの既定typeと明示したsubmit/resetを保持する', async ({ page }) => {
      await expect(page.getByRole('button', { name: '申請を削除', exact: true })).toHaveAttribute('type', 'button');
      await expect(page.getByRole('button', { name: '変更を保存', exact: false })).toHaveAttribute('type', 'submit');
      await expect(page.getByRole('button', { name: '入力を戻す', exact: true })).toHaveAttribute('type', 'reset');
      await page.getByLabel('申請名', { exact: false }).fill('変更された入力');
      await page.getByRole('button', { name: '入力を戻す', exact: true }).click();
      await expect(page.getByLabel('申請名', { exact: false })).toHaveValue('会議室の備品購入');
      await expect(page.getByTestId('save-count')).toHaveText('保存要求: 0');
    });

    test('無効または処理中のリンクはclick、auxclick、キーボードで遷移や利用者処理を起こさない', async ({ page }) => {
      const link = page.getByRole('link', { name: '申請の詳細', exact: false });
      await expect(link).toHaveAttribute('href', '#application-details');
      await page.getByLabel('詳細リンクを無効にする', { exact: true }).check();
      await expect(link).toHaveAttribute('aria-disabled', 'true');
      await link.click({ force: true });
      await link.click({ button: 'middle', force: true });
      await link.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('link-count')).toHaveText('リンク操作: 0');
      await expect(page).not.toHaveURL(/#application-details$/);
      const cancelled = await link.evaluate((element) => !element.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 })));
      expect(cancelled).toBe(true);
      await expect(page.getByTestId('link-count')).toHaveText('リンク操作: 0');

      await page.getByLabel('詳細リンクを無効にする', { exact: true }).uncheck();
      await page.getByLabel('詳細リンクを処理中にする', { exact: true }).check();
      await expect(link).toHaveAttribute('aria-busy', 'true');
      await link.click({ force: true });
      await link.click({ button: 'middle', force: true });
      await expect(page.getByTestId('link-count')).toHaveText('リンク操作: 0');
      await expect(page).not.toHaveURL(/#application-details$/);
      await page.getByLabel('詳細リンクを処理中にする', { exact: true }).uncheck();
      await link.click();
      await expect(page).toHaveURL(/#application-details$/);
      await expect(page.getByTestId('link-count')).toHaveText('リンク操作: 1');
    });

    test('ラベル、必須、補助説明、追加の説明、入力エラーを同じ入力に接続する', async ({ page }) => {
      const name = page.getByLabel('申請名', { exact: false });
      await expect(name).toHaveAttribute('id', 'application-name');
      await expect(name).toHaveAttribute('required', '');
      const initialDescription = (await name.getAttribute('aria-describedby'))?.split(/\s+/) ?? [];
      expect(initialDescription).toContain('name-policy');
      expect(initialDescription.length).toBe(2);
      for (const id of initialDescription) await expect(page.locator(`[id="${id}"]`)).toBeVisible();
      await name.fill('');
      await expect(name).toHaveAttribute('aria-invalid', 'true');
      const descriptions = (await name.getAttribute('aria-describedby'))?.split(/\s+/) ?? [];
      expect(descriptions.length).toBe(3);
      const associatedText = await name.evaluate((element) => (element.getAttribute('aria-describedby') ?? '').split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' '));
      expect(associatedText).toContain('申請名を入力してください。');
      await expect(page.getByRole('button', { name: '変更を保存', exact: false })).toBeDisabled();
      await name.fill('復旧した申請');
      await expect(name).not.toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByText('申請名を入力してください。', { exact: true })).toHaveCount(0);
    });

    test('標準のselectとcheckboxをキーボードで選択し、保存データへ反映する', async ({ page }) => {
      const category = page.getByLabel('申請区分', { exact: false });
      await category.selectOption('equipment');
      await expect(category).toHaveValue('equipment');
      const verified = page.getByLabel('内容を確認しました', { exact: false });
      await verified.focus();
      await page.keyboard.press('Space');
      await expect(verified).toBeChecked();
      await page.locator('#application-form').getByLabel('補足', { exact: false }).fill('標準textareaで入力した判断材料');
      await page.getByRole('button', { name: '変更を保存', exact: false }).click();
      await expect(page.getByTestId('saved-category')).toHaveText('備品');
      await expect(page.getByTestId('saved-verified')).toHaveText('確認済み');
      await expect(page.getByTestId('saved-notes')).toHaveText('標準textareaで入力した判断材料');
    });

    test('保存失敗でも入力を保持し、障害を残し、別領域は使える', async ({ page }) => {
      expect(await page.locator('#save-outcome').evaluate((select: HTMLSelectElement) => [...select.labels!].map((label) => label.textContent?.trim()))).toEqual(['保存結果']);
      await page.getByLabel('保存結果', { exact: true }).selectOption('error');
      await page.getByLabel('申請名', { exact: false }).fill('失敗時も残る入力');
      await page.getByRole('button', { name: '変更を保存', exact: false }).click();
      await expect(page.getByTestId('save-feedback')).toContainText('保存できませんでした。入力は保持されています。');
      const status = page.getByTestId('save-feedback').getByRole('status');
      await expect(status).toHaveText('保存できませんでした。入力は保持されています。');
      await expect(status).toHaveAttribute('data-status-marker', 'constant-status');
      await expect(page.getByLabel('申請名', { exact: false })).toHaveValue('失敗時も残る入力');
      await expect(page.getByTestId('saved-name')).toHaveText('会議室の備品購入');
      await page.getByLabel('一覧を絞り込む', { exact: false }).fill('備品');
      await expect(page.getByTestId('application-row')).toHaveCount(1);
      await expect(page.getByTestId('save-feedback')).toContainText('保存できませんでした。');
    });

    test('部分欠損と更新失敗の影響を示し、正常領域を維持し、局所再試行だけを行う', async ({ page }) => {
      const list = page.getByTestId('list-region');
      await page.getByLabel('一覧の状態', { exact: true }).selectOption('partial');
      await expect(list).toContainText('確認者情報が取得できません。申請名の編集は続けられますが、承認はできません。');
      await expect(page.getByTestId('application-row')).toHaveCount(2);
      await expect(page.getByRole('button', { name: '承認へ進む', exact: true })).toBeDisabled();
      await page.getByLabel('申請名', { exact: false }).fill('独立した編集は続けられる');
      await expect(page.getByRole('button', { name: '変更を保存', exact: false })).toBeEnabled();
      const retry = list.getByRole('button', { name: '一覧を再取得', exact: false });
      await retry.click();
      await expect(retry).toBeDisabled();
      await expect(page.getByTestId('retry-count')).toHaveText('一覧再取得: 1');
      await expect(list.getByText('確認者情報が取得できません。', { exact: false })).toHaveCount(0);
      await expect(page.getByLabel('申請名', { exact: false })).toHaveValue('独立した編集は続けられる');
      await expect(page.getByTestId('save-count')).toHaveText('保存要求: 0');

      await page.getByLabel('一覧の状態', { exact: true }).selectOption('stale');
      await expect(list).toContainText('一覧の更新に失敗しました。表示中の情報は前回取得時点のものです。');
      await expect(page.getByTestId('application-row')).toHaveCount(2);
      await expect(list.getByRole('button', { name: '一覧を再取得', exact: false })).toBeVisible();
    });

    test('loading、empty、errorで本文を隠し、同じ入力を復帰後まで保つ', async ({ page }) => {
      const filter = page.getByLabel('一覧を絞り込む', { exact: false });
      await filter.fill('備品');
      const marker = await filter.evaluate((element) => {
        element.setAttribute('data-instance-marker', 'retained');
        return element.getAttribute('data-instance-marker');
      });
      for (const [kind, message] of [['loading', '一覧を取得しています。'], ['empty', '表示できる申請はありません。'], ['error', '一覧を取得できませんでした。編集内容は利用できます。']] as const) {
        await page.getByLabel('一覧の状態', { exact: true }).selectOption(kind);
        await expect(filter).toBeHidden();
        await expect(page.getByTestId('list-region')).toContainText(message);
        const status = page.getByTestId('list-region').getByRole('status');
        await expect(status).toHaveText(message);
        await expect(status).toHaveAttribute('data-status-marker', 'constant-status');
        await expect(page.getByLabel('申請名', { exact: false })).toBeVisible();
      }
      await page.getByLabel('一覧の状態', { exact: true }).selectOption('ready');
      await expect(filter).toBeVisible();
      await expect(filter).toHaveValue('備品');
      await expect(filter).toHaveAttribute('data-instance-marker', marker!);
      await page.getByLabel('一覧の状態', { exact: true }).selectOption('refreshing');
      await expect(filter).toBeVisible();
      await expect(page.getByTestId('list-region')).toContainText('一覧を更新しています。前回の情報を表示しています。');
    });

    test('削除とUndoは実際のローカル一覧データを更新し復元する', async ({ page }) => {
      await expect(page.getByTestId('application-row')).toHaveCount(2);
      await page.getByRole('button', { name: '申請を削除', exact: true }).click();
      await expect(page.getByTestId('application-row')).toHaveCount(1);
      await expect(page.getByTestId('delete-feedback')).toContainText('会議室の備品購入を一覧から削除しました。');
      await page.getByTestId('delete-feedback').getByRole('button', { name: '元に戻す', exact: false }).click();
      await expect(page.getByTestId('application-row')).toHaveCount(2);
      await expect(page.getByTestId('application-row').first()).toContainText('会議室の備品購入');
      await expect(page.getByTestId('delete-feedback')).toContainText('会議室の備品購入を一覧へ戻しました。');
      await expect(page.getByRole('button', { name: '元に戻す', exact: false })).toHaveCount(0);
    });

    test('不可逆操作は対象と影響を伝えてから実データを確定削除する', async ({ page }) => {
      const purge = page.getByRole('button', { name: '完全に削除', exact: true });
      await expect(purge).toBeDisabled();
      await page.getByRole('button', { name: '完全削除の影響を確認', exact: true }).click();
      await expect(page.getByTestId('purge-feedback')).toContainText('出張旅費の精算を完全に削除します。この検証中は元に戻せません。');
      await expect(purge).toBeEnabled();
      await purge.click();
      await expect(page.getByTestId('application-row')).toHaveCount(1);
      await expect(page.getByTestId('application-row')).not.toContainText('出張旅費の精算');
      await expect(page.getByTestId('purge-feedback')).toContainText('出張旅費の精算を完全に削除しました。');
      await expect(page.getByTestId('purge-feedback').getByRole('button')).toHaveCount(0);
    });

    test('応答が不明な保存は再実行を止め、保存先の確認で実際の結果を取得する', async ({ page }) => {
      await page.getByLabel('保存結果', { exact: true }).selectOption('unknown');
      await page.getByLabel('申請名', { exact: false }).fill('保存先では反映された申請');
      await page.getByRole('button', { name: '変更を保存', exact: false }).click();
      await expect(page.getByTestId('save-feedback')).toContainText('保存の応答を確認できません。重複保存を避けるため、保存先の状態を確認してください。');
      await expect(page.getByTestId('save-feedback').getByRole('status')).toHaveAttribute('data-status-marker', 'constant-status');
      await expect(page.getByTestId('save-feedback').getByRole('status')).toHaveText('保存の応答を確認できません。重複保存を避けるため、保存先の状態を確認してください。');
      await expect(page.getByRole('button', { name: '変更を保存', exact: false })).toBeDisabled();
      await expect(page.getByTestId('save-feedback')).not.toContainText('保存しました');
      const check = page.getByTestId('save-feedback').getByRole('button', { name: '保存先を確認', exact: false });
      await check.click();
      await expect(check).toBeDisabled();
      await expect(page.getByTestId('save-feedback')).toContainText('保存先で保存先では反映された申請の反映を確認しました。');
      await expect(page.getByTestId('save-count')).toHaveText('保存要求: 1');
      await expect(page.getByRole('button', { name: '変更を保存', exact: false })).toBeEnabled();
      await expect(page.getByTestId('saved-name')).toHaveText('保存先では反映された申請');
    });

    test('キーボードでフォームを進めて保存でき、focusが見える', async ({ page }) => {
      const name = page.getByLabel('申請名', { exact: false });
      await name.focus();
      await page.keyboard.type('キーボード');
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('申請区分', { exact: false })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#application-form').getByLabel('補足', { exact: false })).toBeFocused();
      const outline = await page.locator('#application-form').getByLabel('補足', { exact: false }).evaluate((element) => {
        const style = getComputedStyle(element);
        return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
      });
      expect(outline.width).toBeGreaterThanOrEqual(2);
      expect(outline.style).not.toBe('none');
      await page.getByRole('button', { name: '変更を保存', exact: false }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('save-count')).toHaveText('保存要求: 1');
      await expect(page.getByTestId('save-feedback')).toContainText('保存しました。');
    });

    test('320pxの画面幅で横にはみ出さず、主要操作を44px以上で表示する', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
      expect(overflow.scroll).toBeLessThanOrEqual(overflow.viewport);
      for (const name of ['変更を保存', '申請を削除', '入力を戻す']) {
        const box = await page.getByRole('button', { name, exact: false }).boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
      await page.getByLabel('申請名', { exact: false }).fill('狭い画面から編集');
      await page.getByRole('button', { name: '変更を保存', exact: false }).click();
      await expect(page.getByTestId('saved-name')).toHaveText('狭い画面から編集');
    });

    test('動きを減らす設定で状態の意味を保ち、長いanimationやtransitionを動かさない', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.getByLabel('一覧の状態', { exact: true }).selectOption('refreshing');
      await expect(page.getByTestId('list-region')).toContainText('一覧を更新しています。');
      await expect(page.getByLabel('一覧を絞り込む', { exact: false })).toBeVisible();
      const motion = await page.locator('body').evaluate((body) => [...body.querySelectorAll('*')].some((element) => {
        const style = getComputedStyle(element);
        return [...style.animationDuration.split(','), ...style.transitionDuration.split(',')].some((duration) => parseFloat(duration) > 0.01);
      }));
      expect(motion).toBe(false);
    });

    test('touch画面でcheckboxと保存を操作でき、無効リンクのtapを抑止する', async ({ browser, page }) => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      try {
        const touchPage = await context.newPage();
        const errors: string[] = [];
        touchPage.on('pageerror', (error) => errors.push(error.message));
        await touchPage.goto(page.url());
        await touchPage.getByLabel('表示設定', { exact: true }).selectOption(profile);
        const checkbox = touchPage.getByLabel('内容を確認しました', { exact: false });
        await checkbox.tap();
        await expect(checkbox).toBeChecked();
        const save = touchPage.getByRole('button', { name: '変更を保存', exact: false });
        await save.tap();
        await expect(save).toBeDisabled();
        await expect(touchPage.getByTestId('saved-verified')).toHaveText('確認済み');
        await touchPage.getByLabel('詳細リンクを無効にする', { exact: true }).tap();
        await touchPage.getByRole('link', { name: '申請の詳細', exact: false }).tap({ force: true });
        await expect(touchPage.getByTestId('link-count')).toHaveText('リンク操作: 0');
        await expect(touchPage).not.toHaveURL(/#application-details$/);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
      }
    });

    test('初期表示とエラー・部分欠損・結果不明の状態にaxeの自動検査違反がない', async ({ page }) => {
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByLabel('申請名', { exact: false }).fill('');
      await page.getByLabel('一覧の状態', { exact: true }).selectOption('partial');
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByLabel('申請名', { exact: false }).fill('確認が必要な申請');
      await page.getByLabel('保存結果', { exact: true }).selectOption('unknown');
      await page.getByRole('button', { name: '変更を保存', exact: false }).click();
      await expect(page.getByTestId('save-feedback')).toContainText('保存の応答を確認できません。');
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  });
}
