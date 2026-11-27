# プロジェクト用UI開発Skill

[English](README.md)

`sync`は`SKILL.md`と`references/`を利用アプリの`.agents/skills/project-ui/`へコピーし、正本YAMLから`project-context.md`を生成します。利用者文書は`references/docs/`に収録されます。

UI変更前にSkillと必要な文脈・APIを読みます。配置だけでAIツールの自動選択や読み込みが成立したとは扱いません。設定やパッケージ版を更新したら、dry-runで差分を確認して再同期します。

画面構成や部品選定を行う場合は、Skillから必要時に英語の画面設計ガイドを参照します。局所的な実装修正では該当する既存の実装契約と検証規範を使います。
