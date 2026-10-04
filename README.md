# ui-foundation

プロジェクトのUI方針から、共通部品・AI向けSkill・検査設定を同じ設定で生成する小さな開発ツールです。人が方針を決め、AIが設計を支援し、承認した設定を通常のコードと検査に固定します。

## 現在の状態

プロジェクトの初期化段階です。要件、設計、実装計画とフォルダ構成を保存しています。CLI、UI部品、Skill生成、静的検査、検証アプリはまだ実装していません。依存パッケージも導入していません。

初版は単一リポジトリ・単一npmパッケージで、Angular／TypeScriptを対象にします。ASKとは独立したプロジェクトです。実行時のLLM API、サーバー、データベースは使いません。

## 文書

- [ユーザーの要件原文](docs/project-brief.ja.md)：今回の設計の出発点。設定例やパッケージ名は原文でも提案・仮称です。
- [初期設計](docs/design.md)：設定、生成物の所有範囲、アプリとの責任境界、機械検査の範囲。
- [実装・検証計画](docs/implementation-plan.md)：小さな段階と観測可能な完了条件。
- [開発方針](docs/development.md)：変更、検証、依存、ライセンスの扱い。
- [設定例](examples/ui.config.example.yaml)：未実装のスキーマ案。現在はCLIへ入力できません。

## 予定する使い方

利用アプリが持つ `ui.config.yaml` を唯一の設定の正本とし、解決した同じ設定から、UI部品とスタイル・プロジェクト用Skill・静的検査設定を生成します。

| 予定するコマンド | 役割 |
| --- | --- |
| `ui-foundation init` | 設定雛形、Skillへの導線、開発コマンドの追加。既存設定を保全する。 |
| `ui-foundation sync --dry-run` | 変更対象と差分の確認。 |
| `ui-foundation sync` | 決定的な生成・同期。手編集を黙って上書きしない。 |
| `ui-foundation check` | 設定と生成物の整合性、解析可能な逸脱、例外・判定不能箇所の報告。 |

これらのコマンドは未実装です。`postinstall` で利用者のソースを変更する仕組みは設けません。利用アプリでは将来 `ui:sync`・`ui:check` と、実ブラウザー操作用の `ui:test` を分けて使います。このリポジトリに成功するだけの代用コマンドは置きません。

## 最小構成

```text
ui-foundation/
├── AGENTS.md
├── package.json
├── docs/
├── examples/ui.config.example.yaml
├── src/
│   └── checks/
├── presets/task-oriented/
├── templates/angular/
├── skills/ui-development/
└── tests/
    ├── config/
    ├── generation/
    ├── checks/
    └── fixture-app/
```

`src/` 以下とテンプレート・Skill・試験のディレクトリは、これから実装するための置き場です。最初の部品群は PageFrame、ActionControl、FormField、AsyncRegion、ActionFeedback に限定します。全画面を同じ見た目にすることや、画面仕様をYAMLへ集約することは目的にしません。

静的検査の成功を、実操作やUX全体の合格と扱いません。実データのUndo、業務上の正しさ、安全に継続できる範囲は利用アプリが保証します。

## 公開とライセンス

パッケージは `private: true` とし、npmへの公開や名前の予約は行いません。ライセンスは未決定です。現時点では第三者への権利許諾を指定していません。
