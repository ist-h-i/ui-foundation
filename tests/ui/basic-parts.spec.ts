import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '一覧と表示設定', exact: true })).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('Disclosureはnative summaryで開閉し、閉じても入力を保持する', async ({ page }) => {
  const disclosure = page.getByTestId('optional-information');
  const toggle = disclosure.locator('summary');
  await expect(disclosure.locator('details')).not.toHaveAttribute('open', '');
  await toggle.focus();
  await page.keyboard.press('Space');
  const note = disclosure.getByLabel('共有メモ', { exact: false });
  await expect(note).toBeVisible();
  await note.fill('閉じても保持する共有メモ');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(note).toBeHidden();
  await toggle.click();
  await expect(note).toHaveValue('閉じても保持する共有メモ');
});

test('Dialogはmodalで開き、Escapeと明示的な閉じる操作で呼出元へfocusを戻す', async ({ page }) => {
  const opener = page.getByRole('button', { name: '表示設定を確認', exact: true });
  const dialog = page.getByRole('dialog', { name: '表示設定の確認', exact: true });
  await opener.click();
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(true);
  await expect(dialog.getByRole('button', { name: '設定を適用', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: '設定の確認を閉じる', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  const focus = await dialog.evaluate((element) => ({ inside: element.contains(document.activeElement), tag: document.activeElement?.tagName, documentHasFocus: document.hasFocus() }));
  // Native modal focus may move to the browser's chrome, while app controls stay inert.
  expect(focus.inside || (focus.tag === 'BODY' && !focus.documentHasFocus)).toBe(true);
  const backgroundInput = page.getByLabel('申請名', { exact: false });
  await backgroundInput.focus();
  await expect(backgroundInput).not.toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: '設定の確認を閉じる', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await expect(page.getByTestId('dialog-cancel-count')).toHaveText('Escapeで閉じた回数: 1');
  await opener.click();
  await dialog.getByRole('button', { name: '設定の確認を閉じる', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.getByRole('button', { name: '設定を適用', exact: true }).click();
  await expect(page.getByTestId('applied-notification')).toHaveText('適用済みの通知: メール');
  await expect(dialog).toBeHidden();
});

test('Tabsはmanual activationと左右/Home/Endを提供し、panelの入力を保持する', async ({ page }) => {
  const tabs = page.getByRole('tablist', { name: '申請の関連情報', exact: true });
  await expect(tabs.getByRole('tab')).toHaveCount(2);
  const first = tabs.getByRole('tab', { name: '確認メモ', exact: true });
  const second = tabs.getByRole('tab', { name: '添付資料', exact: true });
  const firstPanel = page.getByRole('tabpanel', { name: '確認メモ', exact: true });
  const memo = firstPanel.getByLabel('確認メモの入力', { exact: false });
  await memo.fill('タブを切り替えても残る入力');
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(second).toBeFocused();
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect(firstPanel).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(memo).toBeHidden();
  const secondPanel = page.getByRole('tabpanel', { name: '添付資料', exact: true });
  await expect(secondPanel).toBeVisible();
  const controlledId = await second.getAttribute('aria-controls');
  await expect(secondPanel).toHaveAttribute('id', controlledId!);
  await expect(secondPanel).toHaveAttribute('aria-labelledby', (await second.getAttribute('id'))!);
  const innerTabs = page.getByRole('tablist', { name: '添付資料の詳細', exact: true });
  await expect(innerTabs.getByRole('tab')).toHaveCount(2);
  await innerTabs.getByRole('tab', { name: '更新履歴', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: '更新履歴', exact: true })).toBeVisible();
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await second.focus();
  await page.keyboard.press('Home');
  await expect(first).toBeFocused();
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Space');
  await expect(firstPanel).toBeVisible();
  await expect(memo).toHaveValue('タブを切り替えても残る入力');
  await page.keyboard.press('End');
  await expect(second).toBeFocused();
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(first).toBeFocused();
});

test('NavigationとBreadcrumbはnative linkと現在地を持つ別々のnavになる', async ({ page }) => {
  const navigation = page.getByRole('navigation', { name: '申請のメニュー', exact: true });
  const active = navigation.getByRole('link', { name: '申請一覧', exact: true });
  await expect(active).toHaveAttribute('aria-current', 'page');
  await expect(active).toHaveAttribute('href', '#basic-table');
  await navigation.getByRole('link', { name: '表示設定', exact: true }).click();
  await expect(page).toHaveURL(/#basic-settings$/);
  const breadcrumb = page.getByRole('navigation', { name: '申請のパンくず', exact: true });
  await expect(breadcrumb.getByRole('link', { name: '申請一覧', exact: true })).toHaveAttribute('aria-current', 'page');
  await breadcrumb.getByRole('link', { name: 'ホーム', exact: true }).click();
  await expect(page).toHaveURL(/#main-content$/);
});

test('DataTableはcaptionと見出しを接続し、実際の行順・aria-sort・欠損を表示する', async ({ page }) => {
  const table = page.getByRole('table', { name: '申請の確認状況', exact: true });
  await expect(table.locator('caption')).toHaveText('申請の確認状況');
  const heading = table.getByRole('columnheader', { name: '申請名', exact: true });
  await expect(heading).toHaveAttribute('scope', 'col');
  await expect(heading).toHaveAttribute('aria-sort', 'ascending');
  await expect(table.getByRole('rowheader').first()).toHaveAttribute('scope', 'row');
  await expect(table.getByTestId('basic-table-row').first()).toContainText('申請 A');
  await expect(table.getByTestId('basic-table-row').first()).toContainText('未取得');
  await expect(page.getByText('未取得は確認日時の欠損を意味します。', { exact: true })).toBeVisible();
  await heading.getByRole('button', { name: '申請名', exact: true }).click();
  await expect(heading).toHaveAttribute('aria-sort', 'descending');
  await expect(table.getByTestId('basic-table-row').first()).toContainText('申請 F');
});

test('Paginationはcontrolled状態と表示データを更新し、先頭・末尾とtotal0を区別する', async ({ page }) => {
  const pagination = page.getByRole('navigation', { name: '申請表のページ', exact: true });
  const previous = pagination.getByRole('button', { name: '前のページ', exact: true });
  const next = pagination.getByRole('button', { name: '次のページ', exact: true });
  const table = page.getByRole('table', { name: '申請の確認状況', exact: true });
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(page.getByTestId('current-basic-page')).toHaveText('表示中のページ: 2');
  await expect(table.getByTestId('basic-table-row').first()).toContainText('申請 C');
  await next.click();
  await expect(next).toBeDisabled();
  await expect(table.getByTestId('basic-table-row').first()).toContainText('申請 E');
  await previous.click();
  await expect(page.getByTestId('current-basic-page')).toHaveText('表示中のページ: 2');
  await page.getByLabel('ページ情報の状態', { exact: true }).selectOption('empty');
  await expect(pagination).toContainText('ページはありません');
  await expect(previous).toBeDisabled();
  await expect(next).toBeDisabled();
  await expect(table.getByTestId('basic-table-row')).toHaveCount(0);
  await page.getByLabel('ページ情報の状態', { exact: true }).selectOption('invalid');
  await expect(pagination).toContainText('ページ情報を表示できません');
  await expect(pagination).not.toContainText('ページはありません');
  await expect(previous).toBeDisabled();
  await expect(next).toBeDisabled();
  await expect(page.getByTestId('basic-page-count')).toHaveText('ページ変更: 3');
});

test('RadioGroupはgroup label、native arrow選択、説明・エラーを接続する', async ({ page }) => {
  const group = page.getByRole('group', { name: '申請の通知方法', exact: false });
  const email = group.getByRole('radio', { name: 'メール', exact: true });
  const inApp = group.getByRole('radio', { name: 'アプリ内', exact: true });
  await expect(email).toHaveAttribute('name', 'notification-method');
  await expect(email).toBeChecked();
  await email.focus();
  await page.keyboard.press('ArrowRight');
  await expect(inApp).toBeFocused();
  await expect(inApp).toBeChecked();
  await expect(inApp).toHaveValue('in-app');
  expect(await page.locator('#notification-form').evaluate((form: HTMLFormElement) => new FormData(form).get('notification-method'))).toBe('in-app');
  await expect(email).not.toBeChecked();
  await expect(page.getByTestId('current-notification')).toHaveText('選択中の通知: アプリ内');
  await page.getByLabel('通知設定のエラーを表示', { exact: true }).check();
  await expect(inApp).toHaveAttribute('aria-invalid', 'true');
  const descriptions = await inApp.evaluate((element) => (element.getAttribute('aria-describedby') ?? '').split(/\s+/).map((id) => document.getElementById(id)?.textContent).join(' '));
  expect(descriptions).toContain('申請の更新通知を受け取る方法です。');
  expect(descriptions).toContain('通知先の設定を確認してください。');
  await page.getByLabel('通知設定のエラーを表示', { exact: true }).uncheck();
  await expect(inApp).not.toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('通知設定を変更できなくする', { exact: true }).check();
  await expect(email).toBeDisabled();
  await expect(inApp).toBeDisabled();
});

test('追加部品は狭い画面で収まり、初期表示・展開・dialogのaxe自動検査違反がない', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByTestId('optional-information').locator('summary').click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: '表示設定を確認', exact: true }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
