# ui-foundation

[English](README.md) · [日本語](README.ja.md)

Angular UI components and a configurable design foundation, generated from one YAML file. Build forms, tables, navigation, dialogs, schedules, media viewers and editors with working interactions, state and events.

Define colors, typography, spacing, dimensions and shapes once. Generate Angular source, two-layer design tokens, a Tailwind theme, AI development guidance and a source checker together.

## Get started

From the root of your Angular app, install `0.2.0`, initialize the configuration, and generate the files. [Installation guide](docs/ui-library-consumer-guide.en.md#install-and-generate)

```sh
npm install --save-dev --save-exact @hiroshi.inoue/ui-foundation@0.2.0
./node_modules/.bin/ui-foundation init
./node_modules/.bin/ui-foundation sync --dry-run
./node_modules/.bin/ui-foundation sync
```

`init` writes an English configuration with `default_language: en`, so generated built-in UI text and default formatting start in English without a locale provider. Use `init --language ja` to start with Japanese prose and `default_language: ja`. Edit the configuration and point `checks.source_roots` at your app's actual source before checking it. The CLI runs from the current app root and preserves existing configuration and manually edited generated files.

Follow the [English installation and integration guide](docs/ui-library-consumer-guide.en.md) for Angular dependencies, styles, workers, assets, updates and recovery. [日本語の導入ガイド](docs/ui-library-consumer-guide.ja.md)

The tested baseline for `0.2.0` is Node.js 24.19.0, Angular/CDK 22.3.0, and TypeScript 6.0.3 on macOS arm64. The package distributes a CLI and source templates. Your app compiles the generated Angular code and installs its dependencies.

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

Human-facing documentation is available in English and Japanese. After sync, read the English `.agents/skills/project-ui/SKILL.md` with its adjacent `project-context.md` and source YAML.

New English configurations start with English UI text. Existing configurations that omit `default_language` retain Japanese defaults. Pass the app's locale signal to `provideUiLocale` for live switches. UI Foundation selects its built-in text by locale and accepts app overrides through stable message IDs and named arguments. The app translates its labels, content and backend errors. [Language switching and external translations](docs/ui-library-consumer-guide.en.md#select-english-component-messages) · [Upgrade from beta.4](docs/ui-message-migration.en.md)

## Track generated files in Git

If generated files are committed, preserve their exact bytes across checkout. Before the first `git add` of the generated output and Skill, put these rules **after** broad text rules in the app's root `.gitattributes`:

```gitattributes
.ui/generated/** -text
.agents/skills/project-ui/** -text
```

Use the configured output directory in the first pattern and in the first path passed to `git check-attr`. The guide shows how to quote paths with spaces or brackets. Commit the rules and check the effective attributes with `git check-attr text -- .ui/generated/CHECKER-NOTICE.txt .agents/skills/project-ui/ownership.json`. Both must report `unset`. Keep other byte-changing filters and encodings off managed files. `CHECKER-NOTICE.txt` can contain original third-party text with mixed line endings, and the manifest hashes the exact bytes. [Git attributes for custom output](docs/ui-library-consumer-guide.en.md#preserve-managed-files-in-git)

If Git has already normalized managed files, first save a recovery point. Restore the exact original files from a verified pre-normalization copy or regenerate in a separate directory with the previously installed, locked package version and configuration. Before replacing any file, compare the recovered files' SHA-256 with the existing manifest and verify that the checkout differs only by line endings. Stop on non-line-ending edits or unverifiable bytes. Do not change manifest hashes to accept local edits. After adding the attributes, stage the restored files, review the diff, and verify `sync --dry-run` and `check` in a fresh checkout. If the ownership registry itself was converted, recover it using the same manifest-hash check. If the manifest was converted, restore a verified original; if no original is available, verify that the regenerated manifest matches the entire recorded manifest after line-ending normalization and that every recovered file matches its recorded hash. If the original bytes cannot be verified, stop and resolve the ownership conflict rather than discarding edits.

## Configure and verify

Primitives hold concrete values. Semantic tokens describe their uses. Named profiles assign values and design guidance for different contexts. The bundled `guided` and `dense` profiles are editable examples; they do not automatically restructure screens.

Edit YAML, preview `sync --dry-run`, run `sync`, then `check`. Keep generated files under generator ownership and place application code outside managed directories. Static checks detect generation mismatches and supported source deviations; verify interactions, accessibility, layout and recovery in the app as well.

- [English CLI reference](docs/commands.en.md) · [日本語CLI](docs/commands.ja.md)
- [English usage](docs/ui-library-consumer-guide.en.md) · [日本語usage](docs/ui-library-consumer-guide.ja.md)
- [Token and generation contracts](docs/design.en.md)
- [Detailed component contracts](docs/ui-components.en.md)
- [Static-check scope and limits](docs/static-checks.en.md)
- [Compatibility and recovery](docs/npm-beta-readiness.en.md)

## 日本語の概要

一つのYAMLから、AngularのUI部品、デザイントークン、Tailwindテーマ、AI向けの開発指針と検査器を生成します。標準の文書と新規アプリの部品文言は英語です。`ui-foundation init --language ja` で日本語の設定と部品の既定値を選べます。言語項目のない既存設定は、更新・再同期しても日本語を維持します。

npmから導入したパッケージには、全文の `README.ja.md` と日本語の導入ガイドを同梱しています。利用アプリで依存関係・CSS・workerや資産を組み込み、生成後に実際の操作を検証してください。詳細は[日本語README](README.ja.md)と[日本語の導入ガイド](docs/ui-library-consumer-guide.ja.md)を参照できます。

## License

The original CLI, templates, Skill and generated code use the [MIT License](LICENSE), Copyright © 2026 Hiroshi Inoue. Retain generated `UI-FOUNDATION-LICENSE.txt` files and include the license as `ui-foundation/LICENSE.txt` in distributed app assets. Preserve third-party notices and corresponding sources as described in the [asset guide](docs/ui-library-consumer-guide.en.md#css-and-distribution-assets). Application code and third-party assets retain their respective licenses.
