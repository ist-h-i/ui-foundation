# ベータの変更記録

`@hiroshi.inoue/ui-foundation@0.1.0-beta.3`までの利用者向け変更記録です。自作CLI・テンプレート・Skill・生成コードはMIT License（2026 Hiroshi Inoue）。第三者の条件は保持します。

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
