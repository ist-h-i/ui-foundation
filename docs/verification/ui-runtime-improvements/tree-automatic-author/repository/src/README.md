# 設定と生成

- config.ts / roles.ts：新スキーマ、型、参照、プロファイル、色ペアの検証と解決。
- tokens.ts：プリミティブ/セマンティックCSSとTailwindテーマの生成。
- sync.ts：部品とSkill、解決設定、検査設定、manifestの生成・所有範囲・一致検査。
- cli.ts：init / sync / check。

機能ソースの全AST逸脱検査は含めません。[設計](../docs/design.md)と[検証計画](../docs/implementation-plan.md)を参照してください。
