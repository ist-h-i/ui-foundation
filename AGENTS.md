# 開発の入口

- 要件は `docs/project-brief.ja.md`、設計は `docs/design.md`、次の作業と検証は `docs/implementation-plan.md` を読む。
- 変更の範囲と実際に確認した結果を示す。UI部品は `templates/angular/`、操作検証は `tests/fixture-app/` と `tests/ui/`。CLI・設定解析・逸脱の静的検査は未実装なので、成功するダミーや未実行の合格報告を作らない。
- UIの生成・実装時は、実装後の `skills/ui-development/` のSkillと必要な文脈を読む。現在このディレクトリは未実装である。
- 静的検査、実操作、AI・人の意味／視覚レビューを区別する。利用者の目的・状態の意味・欠損の影響・復旧経路を確認する。
- 詳細な方針は `docs/development.md` に置く。無関係の個人ファイル、認証情報、他プロジェクトの実測証拠を取り込まない。
