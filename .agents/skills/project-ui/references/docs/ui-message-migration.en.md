# Upgrade stable messages from beta.4

[Japanese](ui-message-migration.ja.md)

`0.1.0-beta.5` is a breaking prerelease. The previous release is `@hiroshi.inoue/ui-foundation@0.1.0-beta.4`. Keep that exact version and its lockfile, YAML, generated UI, and generated Skill if your app relies on Japanese source keys. The installed beta.4 package contains the matching usage guide.

## Choose the new version

1. Save an app checkpoint with its package manifest, lockfile, source code, YAML, generated UI, and `.agents/skills/project-ui/`. Keep a copy of any local edits in generator-owned files.
2. Install the candidate explicitly with `npm install --save-dev --save-exact /absolute/path/to/candidate.tgz`. Once it is on npm, the same command can use `@hiroshi.inoue/ui-foundation@0.1.0-beta.5`. Confirm the installed version and lockfile before running its bin.
3. Run `./node_modules/.bin/ui-foundation sync --dry-run` and inspect the planned removals. The old `angular/locale-en.ts`, `angular/locale-ja.ts`, `SKILL.en.md`, and `SKILL.ja.md` leave the generated directories. If sync reports an edited or unowned file, save the edits separately and resolve ownership before syncing. Use `.agents/skills/project-ui/SKILL.md` in prompts or automation that referenced an old Skill path.
4. Run `./node_modules/.bin/ui-foundation sync`, update app imports and translations, then run `./node_modules/.bin/ui-foundation check`, the app's strict AOT build, and focused browser tests. Verify settings and documented dependency compatibility before adopting the update.

## Convert your overrides

Remove `messages` in `provideUiLocale` or `[uiLocale]` and imports of `uiEnglishMessages` and `uiJapaneseMessages`. The runtime locale selects Japanese or English built-ins. For custom library text, move the desired translations to the app's dictionary and configure `translate`. Replace app-owned uses of `UiMessagePipe` or `uiMessage(source, ...)` with the app's own translation API. Use `UiStableMessagePipe` for library IDs in a template, or `injectUiMessage()` with `UiMessageRequest` from TypeScript. For parameterized IDs, pass the named arguments as an object.

Search your old keys in the [legacy key and ID map](ui-message-map.json), then match each usage by component and purpose. Test the visible text and the accessible name separately where both exist.

| Old dictionary key | New ID or migration |
| --- | --- |
| `閉じる` | Use `uiFoundation.dialog.closeAction` for the dialog action or `uiFoundation.popover.close` for the popover action. The map lists other controls that also used this key. |
| `ダイアログを閉じる` | Use `uiFoundation.dialog.closeLabel` for the dialog's accessible label. Check the map for other dialog-related controls. |
| `未選択` | Use `uiFoundation.select.noSelection` for Select and `uiFoundation.cascader.noSelection` for Cascader. Each component has its own ID. |
| `展開` (followed by the title on screen) | Use `uiFoundation.card.expand` with `{ title }`. Carry the title through as app data and translate the whole message. |
| `{limit}件まで選択してください。` | For the collection limit, use `uiFoundation.collection.selectionLimit` with `{ limit }`. Check 0, 1, and multiple items in the app's translator. |

For example, move a beta.4 override with key `閉じる` and value `Finish` to `uiFoundation.dialog.closeAction` if it only applied to the dialog. Add a separate override if the app also customized a popover. Keep named arguments in your templates and let each translation choose their order. If an old override customized pieces of a sentence, move to the ID for the complete sentence and supply its arguments together.

Use the [shared lazy dictionary example](../examples/locale-adapter.ts) with the [integration instructions](ui-library-consumer-guide.en.md#select-english-component-messages). Verify language and direction changes during editing and in-flight work. Confirm that app-owned labels, data, and API errors stay under the app's translation system, and that changing the language updates retained feedback without repeating the operation.

## Restore beta.4

Restore the saved app source, package manifest, lockfile, YAML, generated directory, and project Skill together from the checkpoint. Reinstall with the old lockfile and confirm the package is `0.1.0-beta.4`. Run its installed CLI's `check` and rerun the app build and representative workflows. If the owned directories were omitted from the backup, regenerate them with the exact old package and restored YAML in a clean checkout. Keep local edits in the saved copy until their ownership is resolved.

The packed consumer uses Angular/CDK 22.2.1 and TypeScript 6.0.3. Angular 21/TypeScript 5.9 is outside that matrix. The existing `Popover` template calls a native Popover API that was incompatible with the tested TypeScript 5.9 DOM declarations. Verify the target app/compiler before adopting the generated full entry point. [Beta verification scope](npm-beta-readiness.en.md)
