import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enableProdMode, Injector, runInInjectionContext } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { LUCIDE_ICONS, provideLucideConfig, provideLucideIcons } from '@lucide/angular';
import { selected, UI_ICON_LUCIDE } from '../../templates/angular/icons/registry';
import { provideUiIcons, provideUiLucideInterop } from '../../templates/angular/icons/lucide';
import { shape as search } from '../../templates/angular/icons/search';

function resolved(injector: Injector) {
  return runInInjectionContext(injector, () => injector.get(UI_ICON_LUCIDE).readIcons());
}

test('root paint configuration preserves an explicit lightweight selection', async () => {
  enableProdMode();
  const app = await createApplication({ providers: [
    selected(search), provideLucideConfig({ color: 'red' }), provideUiLucideInterop(),
  ] });
  try {
    assert.equal(resolved(app.injector)['search'], search);
    const child = Injector.create({ parent: app.injector, providers: [selected(search), provideLucideIcons()] });
    try {
      assert.equal(resolved(child), child.get(LUCIDE_ICONS));
    } finally {
      child.destroy();
    }
  } finally {
    app.destroy();
  }
});

test('a shared registry follows native provider order, including an explicit empty registration', () => {
  for (const nativeLast of [true, false]) {
    const shared = provideUiIcons();
    const native = provideLucideIcons();
    const scope = Injector.create({ providers: nativeLast ? [shared, native] : [native, shared] });
    try {
      assert.equal(resolved(scope), scope.get(LUCIDE_ICONS));
      assert.equal(Object.hasOwn(resolved(scope), 'search'), !nativeLast);
    } finally {
      scope.destroy();
    }
  }
});
