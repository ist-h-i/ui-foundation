# ui-foundation

[English](README.md) · [日本語](README.ja.md)

Angular UI components and a configurable design foundation, generated from one YAML file. Build forms, tables, navigation, dialogs, schedules, media viewers and editors with working interactions, state and events.

Define colors, typography, spacing, dimensions and shapes once. Generate Angular source, two-layer design tokens, a Tailwind theme, AI development guidance and a source checker together.

## Get started

Install the published package in an existing Angular app:

```sh
npm install --save-dev --save-exact @hiroshi.inoue/ui-foundation@0.1.0-beta.4
./node_modules/.bin/ui-foundation init
./node_modules/.bin/ui-foundation sync --dry-run
./node_modules/.bin/ui-foundation sync
```

`init` writes an English configuration with `default_language: en`, so generated built-in UI text and default formatting start in English without a locale provider. Use `init --language ja` to start with Japanese prose and `default_language: ja`. Edit the configuration and point `checks.source_roots` at your app's actual source before checking it. The CLI runs from the current app root and preserves existing configuration and manually edited generated files.

Follow the [English installation and integration guide](docs/ui-library-consumer-guide.en.md) for Angular dependencies, styles, workers, assets, updates and recovery. [日本語の導入ガイド](docs/ui-library-consumer-guide.ja.md)

The beta verification environment is Node.js 24.19.0, Angular/CDK 22.2.1 and TypeScript 6.0.3 on macOS arm64. The package distributes a CLI and source templates. Your app compiles the generated Angular code and installs its dependencies.

## Build with components

| Area | Examples |
| --- | --- |
| Forms | Text, number and date inputs, selections, structured input, wizard, filter builder |
| Lists and tables | Data tables, editable tables, virtual lists, trees, transfer lists |
| Navigation | Menus, side navigation, tabs, breadcrumbs, command palette |
| Actions and feedback | Buttons, dialogs, popovers, notifications, progress |
| Layout and display | Page shell, cards, grids, drawers, avatars, statistics |
| Scheduling | Calendar, scheduler, agenda, Gantt, Kanban |
| Files and media | Upload, image/audio/video/PDF viewers, QR and barcode |
| Visualization and editing | Charts, maps, spreadsheets, code and rich-text editors, flow editor |

See the [English component overview](docs/components.en.md), [日本語の部品一覧](docs/components.ja.md) and [public API catalog](docs/ui-library-api.json). The app owns screen composition, business logic, routing, HTTP requests, persistence and undo.

## English and Japanese

Human-facing documentation is English-primary with Japanese editions. Standard AI instructions and references use English; the legacy Japanese Skill remains for compatibility. After sync, read `.agents/skills/project-ui/SKILL.md` with adjacent `project-context.md` and the source YAML.

New English configurations select English built-in text automatically. Use the existing runtime locale provider to override generated defaults or implement a live language switch:

```ts
import { provideUiLocale, uiEnglishMessages } from './.ui/generated/angular/index';

// Add these providers to the app's bootstrap configuration.
const providers = provideUiLocale({ locale: 'en-US', messages: uiEnglishMessages });
```

For Japanese, use `locale: 'ja-JP', messages: uiJapaneseMessages` from the same public entry point. Pass an app-owned signal to switch languages while retaining input and component state. Keep the app's own labels, content and backend errors in its translation system. [Language switching and scopes](docs/ui-library-consumer-guide.en.md#select-english-component-messages)

Existing configurations that omit `default_language` retain Japanese runtime defaults after sync. To migrate one deliberately, add `default_language: en`, review the sync diff, regenerate and verify the app's labels, date/number presentation and workflows. The setting does not translate app-owned text or choose a time zone. It is independent of token profiles. `locale` selects formatting; `messages` selects built-in text. A locale change alone does not translate messages. Date-time components still need an explicit business time zone. Detailed design, API, runtime, specialist and recovery contracts are available in English and Japanese; the standard AI workflow selects the English references.

## Configure and verify

Primitives hold concrete values. Semantic tokens describe their uses. Named profiles assign values and design guidance for different contexts. The bundled `guided` and `dense` profiles are editable examples; they do not automatically restructure screens.

Edit YAML, preview `sync --dry-run`, run `sync`, then `check`. Keep generated files under generator ownership and place application code outside managed directories. Static checks detect generation mismatches and supported source deviations; verify interactions, accessibility, layout and recovery in the app as well.

- [English CLI reference](docs/commands.en.md) · [日本語CLI](docs/commands.ja.md)
- [English usage](docs/ui-library-consumer-guide.en.md) · [日本語usage](docs/ui-library-consumer-guide.ja.md)
- [Token and generation contracts](docs/design.en.md)
- [Detailed component contracts](docs/ui-components.en.md)
- [Static-check scope and limits](docs/static-checks.en.md)
- [Beta compatibility and recovery](docs/npm-beta-readiness.en.md)

## 日本語の概要

一つのYAMLから、AngularのUI部品、デザイントークン、Tailwindテーマ、AI向けの開発指針と検査器を生成します。標準の文書と新規アプリの部品文言は英語です。`ui-foundation init --language ja` で日本語の設定と部品の既定値を選べます。言語項目のない既存設定は、更新・再同期しても日本語を維持します。

npmから導入したパッケージには、全文の `README.ja.md` と日本語の導入ガイドを同梱しています。利用アプリで依存関係・CSS・workerや資産を組み込み、生成後に実際の操作を検証してください。詳細は[日本語README](README.ja.md)と[日本語の導入ガイド](docs/ui-library-consumer-guide.ja.md)を参照できます。

## License

The original CLI, templates, Skill and generated code use the [MIT License](LICENSE), Copyright © 2026 Hiroshi Inoue. Retain generated `UI-FOUNDATION-LICENSE.txt` files and include the license as `ui-foundation/LICENSE.txt` in distributed app assets. Preserve third-party notices and corresponding sources as described in the [asset guide](docs/ui-library-consumer-guide.en.md#css-and-distribution-assets). Application code and third-party assets retain their respective licenses.
