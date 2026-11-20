import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveUiMessage, type UiMessageRequest } from '../../templates/angular/stable-messages';

test('the provider receives the stable ID and named arguments and can fall back while loading', () => {
  const request: UiMessageRequest = { id: 'uiFoundation.collection.selectionLimit', parameters: { limit: 1 } };
  assert.equal(resolveUiMessage(request, 'en-US', (observed, locale) => {
    assert.deepEqual(observed, request);
    assert.equal(locale, 'en-US');
    return undefined;
  }), 'Select up to 1 item.');
  assert.equal(resolveUiMessage(request, 'ja-JP'), '1件まで選択してください。');
  assert.equal(resolveUiMessage(request, 'ja-JP', () => 'アプリの文言'), 'アプリの文言');
});

test('English defaults use complete messages for zero and plural limits', () => {
  const id = 'uiFoundation.collection.selectionLimit';
  assert.equal(resolveUiMessage({ id, parameters: { limit: 0 } }, 'en-US'), 'Selection is unavailable.');
  assert.equal(resolveUiMessage({ id, parameters: { limit: 1200 } }, 'en-US'), 'Select up to 1,200 items.');
});

test('app-owned titles are passed unchanged to whole-message formatters', () => {
  const request = { id: 'uiFoundation.card.collapse', parameters: { title: '変更前の下書き' } } as const;
  assert.equal(resolveUiMessage(request, 'ja-JP'), '折り畳む: 変更前の下書き');
  assert.equal(resolveUiMessage(request, 'en-US'), 'Collapse: 変更前の下書き');
  assert.equal(resolveUiMessage(request, 'ja-JP', observed => {
    assert.equal(observed.id, 'uiFoundation.card.collapse');
    return observed.id === 'uiFoundation.card.collapse' ? `${observed.parameters.title} を閉じる` : undefined;
  }), '変更前の下書き を閉じる');
});

function verifyRequestTypesOnly() {
  // @ts-expect-error Named arguments are required.
  resolveUiMessage({ id: 'uiFoundation.collection.selectionLimit' }, 'en-US');
  // @ts-expect-error The limit must be numeric.
  resolveUiMessage({ id: 'uiFoundation.collection.selectionLimit', parameters: { limit: '1' } }, 'en-US');
  // @ts-expect-error Japanese labels are not IDs.
  resolveUiMessage({ id: 'サイドバー' }, 'en-US');
}
void verifyRequestTypesOnly;

test('the retained listbox rejection is a complete, locale-formatted announcement', () => {
  const request = { id: 'uiFoundation.listbox.selectedCountWithInvalidSelection', parameters: { count: 1200 } } as const;
  assert.equal(resolveUiMessage(request, 'ja-JP'), '1,200件選択 · 選択上限または現在の値を確認してください。');
  assert.equal(resolveUiMessage(request, 'en-US'), '1,200 selected · Check the selection limit or the current value.');
  assert.equal(resolveUiMessage(request, 'de-DE'), '1.200 selected · Check the selection limit or the current value.');
});
