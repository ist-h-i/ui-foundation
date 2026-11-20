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

test('a key-echoing adapter uses the standard dictionary while its resource is unavailable', () => {
  const request = { id: 'uiFoundation.dialog.closeLabel' } as const;
  assert.equal(resolveUiMessage(request, 'en-US', current => current.id), 'Close dialog');
  assert.equal(resolveUiMessage(request, 'ja-JP', current => current.id), 'ダイアログを閉じる');
});

test('a single required legend includes the app-owned label as an argument', () => {
  const request={id:'uiFoundation.segmentedControl.requiredLegend',parameters:{label:'App choices'}} as const;
  assert.equal(resolveUiMessage(request,'en-US'),'App choices (required)');
  assert.equal(resolveUiMessage(request,'ja-JP'),'App choices (必須)');
  assert.equal(resolveUiMessage(request,'en-US',current=>current.id===request.id
    ? `Required selection: ${current.parameters.label}` : undefined),'Required selection: App choices');
});

test('notification status and dismiss requests translate complete messages', () => {
  const status = { id: 'uiFoundation.notificationCenter.status', parameters: { visible: 1, unread: 0, loading: 'App loading message' } } as const;
  assert.equal(resolveUiMessage(status, 'en-US'), '1 notification shown. 0 unread. App loading message');
  assert.equal(resolveUiMessage({ ...status, parameters: { visible: 0, unread: 2, loading: null } }, 'ja-JP'), '0件表示、未読 2件');
  const dismiss = { id: 'uiFoundation.snackbar.dismissLabel', parameters: { message: 'App notification' } } as const;
  assert.equal(resolveUiMessage(dismiss, 'en-US', request => {
    assert.deepEqual(request, dismiss);
    return 'App notification, dismiss';
  }), 'App notification, dismiss');
});
