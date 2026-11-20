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
