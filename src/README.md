# 設定と生成

- config.ts / roles.ts：新しいスキーマ、型、参照、プロファイル、色ペアの検証と解決。
- tokens.ts：プリミティブとセマンティックのCSS、およびTailwindテーマの生成。
- sync.ts：部品とSkill、解決設定、検査設定、manifestの生成・所有範囲・一致検査。
- cli.ts：init / sync / check。

`check/`は指定したAngular/CSS/SCSSソースのトークンと部品を検査し、同梱Node検査器を生成します。動的な処理など、静的に確認できない箇所は未確認として残します。詳細は[静的検査](../docs/static-checks.ja.md)、[設計](../docs/design.md)、[検証計画](../docs/implementation-plan.md)を参照してください。
