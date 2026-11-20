# Check translated UI text

Read `checks.source_roots` and `checks.i18n` in the app YAML. Find the app's registered translation functions, pipes, and dictionaries before adding display or accessible text. Use the library's stable IDs for its own messages and the app's IDs for app-owned messages.

- A button with `aria-label="Save order"` and text `保存` has two translation sites.
- Use a configured function for `[attr.aria-label]="t('order.save')"` and a configured pipe for `{{ 'order.save' | translate }}`. Angular `i18n` markers are another supported path.
- Keep `data-testid="save-order"`, route targets, and `{{ order.reference }}` under app ownership. Translate any fixed message the app chooses to display for a server error code.
- Pass a named object, for example `t('order.count', {count: 3})`. Put the whole sentence in one message so each language controls word order.

Run the installed CLI's `check`. Fix unresolved literal IDs in the dictionary or at the call site. Verify the actual dictionary, key, and arguments for dynamic or lazy-loaded messages. Review each warning and record a narrow exception only for deliberately retained copy with a reason and review trigger.

[Configuration, diagnostics, and before-and-after examples](../../../docs/static-checks.en.md#translation-checks)
