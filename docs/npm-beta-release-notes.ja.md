# ベータの変更記録

[English](npm-beta-release-notes.en.md)

`@hiroshi.inoue/ui-foundation@0.1.0-beta.6` 候補版までの利用者向け変更記録です。自作CLI・テンプレート・Skill・生成コードはMIT License（2026 Hiroshi Inoue）で提供し、第三者の条件は保持します。

## beta.6 候補版

Angular・CDK 22.3.0に対応する。フォーム用の軽量な公開入口 `angular/forms` を追加した。PDFの読取と仮想行の更新をsignalsに接続し、文字変換中のフォーム通知とコピー対象を変更した後の結果表示を修正した。beta.5から更新するときはパッケージとアプリの依存を合わせ、再同期して型検査・主要操作を確認する。

## beta.5 の破壊的変更

ライブラリ文言を安定IDと型付きの名前付き引数で指定します。標準の日英訳は実行時のロケールで選ばれます。アプリは外部翻訳を接続してライブラリ文言を上書きでき、業務文言は引き続きアプリが翻訳します。旧日本語キーの辞書と旧パイプを廃止し、AI向けの入口は英語の `SKILL.md` に一本化します。

従来の辞書を使い続ける場合は `0.1.0-beta.4` と対応するアプリの状態を固定してください。独自辞書を移す準備ができたら、beta.5 を明示して導入・同期します。beta.5 は `next` タグで公開しました。[旧キーの対応表と移行・復旧手順](ui-message-migration.ja.md)

## beta.4: AI参照の英語化と人間向け文書の日英対応

標準AI Skill、runtime・token参照手順、生成contextの説明、配布外資料への案内を英語に揃えました。既存の日本語Skill入口は互換性のため残し、アプリが記述した文脈やラベルは原文を保ちます。人間向けの設計、詳細API、静的検査、ベータ更新・復旧、Tree・Scheduler・表・媒体・専門部品・共通runtime資料は日英で提供し、標準AI導線は同期後も英語版を選びます。部品runtime APIや言語選択の動作は変更しません。

パッケージ更新後にsync --dry-runで差分を確認し、再同期してコピー済み手順・資料を更新してください。手編集・未所有ファイルの保護は維持します。checkとアプリ検証を行い、復旧時は保存したpackage・lockfile・YAML・生成物・Skillを一組で戻します。第三者の法的原文と対応ソースアーカイブは保持し、PDF source案内には日本語版を追加しました。

## beta.3: English-first UI with Japanese support

English is the primary README, CLI/component guidance and project Skill language. Japanese documentation and the Japanese Skill remain bundled. New `init` configurations select English built-in text and `en-US` formatting without a locale provider; `init --language ja` selects Japanese. Existing YAML that omits `default_language` keeps Japanese defaults after sync.

Both dictionaries are available from the generated entry point. Language switches preserve inputs and retained feedback; app-owned labels, data and backend errors stay under the app's translation system. In English dictionaries, override dynamic messages by their parameterized key (such as `{limit}件まで選択してください。`), not just a completed instance. Detailed specialist references still include Japanese prose.

Upgrade the package and lockfile, review `sync --dry-run`, sync, check, then build and test the app. To opt an existing app into English defaults, explicitly set `default_language: en` and verify app-owned translations plus date/number presentation. Time zone, native input format and tokens are unchanged. Older CLIs reject the new field; rollback restores the matching saved package, YAML, generated files and Skill together.

The release lockfile uses Zod 4.6.7 within Angular Forms' supported range to address the known oversized-collection memory exhaustion advisory affecting versions before 4.6.6. Consuming apps manage their own dependency lockfiles and should select a patched transitive Zod version.

### 日本語の変更内容と更新手順

- README・CLIや部品の案内・標準Skillを英語中心にし、日本語版も同梱しました。
- 新規の `init` は `default_language: en`、`init --language ja` は `ja` を保存します。言語項目のない既存設定は、再同期後も日本語を維持します。
- 部品の文言・状態説明・エラー表示を英日辞書へ接続しました。アプリ所有のラベル・データ・backendエラー本文は翻訳しません。英語の動的文言を上書きする場合は、完成文ではなく差し込みキーを指定します。
- 更新前にパッケージ・lockfile・YAML・生成物・Skillを保存し、更新後にdry-run・sync・checkとアプリの検証を行います。既存アプリの英語化は `default_language: en` の明示的な追加で選びます。旧CLIへ戻す場合は新項目のない保存済みYAMLも一緒に復元します。
- Angular Formsの推移依存Zodを、既知のメモリー消費の脆弱性に対応した4.6.7へ更新しました。利用アプリ側のlockfileでも修正版を選んでください。
- 専門的な参照文書には日本語が残ります。未検証のOS・ブラウザー・業務フローを確認済みとは扱いません。

## beta.2の変更

- npmパッケージの`docs/`と、生成Skillの`references/docs/`を利用者文書に絞りました。導入、CLI、部品一覧、API、設定、静的検査、更新・復旧をパッケージだけで参照できます。
- 開発計画、ADR、要求マトリクス、監査・検証履歴は開発元リポジトリに残し、配布しません。利用側で必要な機能の制約とライセンス・通知・対応ソースの供給条件は利用者文書に保持します。
- READMEとusageの導入例、文書の配置・更新方法、AIへ生成Skillを読み込ませる手順を更新しました。YAMLのschema_version=1と部品APIは維持します。

## beta.1からの更新

更新前に旧CLI版・lockfile・YAML・生成物・Skillを一組で保存し、CLIをbeta.2へ更新してください。npmで更新しただけではコピー済みの生成物や文書は更新されません。

`sync --dry-run`で差分を確認し、`sync`で再同期すると、Skillの利用者文書が最新版になります。beta.1のmanifestが所有する開発文書・ADR・要求マトリクス等は削除対象になります。前回所有したファイルでも手編集を検出した場合は同期が停止し、編集内容を黙って削除しません。必要な追記は生成領域の外へ保存し、所有情報とファイルの対応を確認してから再同期してください。未所有ファイルの採用や強制上書きは行いません。

再同期後に`check`、アプリの型検査・build・主要操作を確認します。生成物だけを部分コピーせず、YAML・生成コード・Skill・アプリの変更を一緒に管理します。第三者通知、worker、PDF source kitの配信条件は[利用ガイド](ui-library-consumer-guide.ja.md#css-と配布資産)に従います。

## 旧版への復旧と制約

問題があれば、保存した旧CLI版だけでなく、対応するlockfile・YAML・生成物・Skillも同じ復旧点へ戻し、旧CLIの`check`とアプリ検証を行います。新旧manifestを混在させたり、未所有ファイルを採用・削除して復旧したことにしません。markerが残る場合は[中断からの復旧手順](npm-beta-readiness.ja.md#同時実行と中断)に従います。

専門部品を含む公開入口は一つであり、[依存関係](ui-library-consumer-guide.ja.md#依存関係)に記載したengine等の解決が必要です。複数旧版の長期保守、全OS・ブラウザー、実サービスの保存・Undoや利用者理解を保証するものではありません。
