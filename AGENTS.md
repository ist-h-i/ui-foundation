# 開発の入口

- 要件は`docs/project-brief.ja.md`、トークンと生成契約は`docs/design.md`、検証は`docs/implementation-plan.md`を読む。
- UIの生成・実装では`skills/ui-development/SKILL.md`と、生成済み`.agents/skills/project-ui/project-context.md`を読む。設定の正本は`examples/ui.config.repository.yaml`。contextの文章から機械設定を勝手に確定しない。
- 二段階トークンとプロファイルが初版の構造。旧preset/density/APIとの互換層を追加しない。部品と画面は用途別のセマンティックを使い、プリミティブ値を直接参照しない。
- 設定解析は`src/config.ts`、CSS生成は`src/tokens.ts`、生成の所有範囲とCLIは`src/sync.ts`と`src/cli.ts`。部品の生成元は`templates/angular/`、操作検証は`tests/fixture-app/`と`tests/ui/`。
- 生成物は直接手編集しない。設定・テンプレート・Skillを直し、`npm run ui:sync`、`npm run ui:check`、対象試験を実行する。ビルドは未同期を拒否する。
- 静的な設定/一致検査、実操作、自動アクセシビリティ、AI・人の意味/視覚レビューを区別する。指定ソースの静的逸脱検査の対象と未確認箇所は`docs/static-checks.ja.md`に従って報告する。成功するダミーや未実行の合格報告を作らない。
- 利用者の目的、状態の意味、欠損の影響、復旧経路を確認する。詳細は`docs/development.md`。無関係の個人ファイル、認証情報、他プロジェクトの実測証拠を取り込まない。
