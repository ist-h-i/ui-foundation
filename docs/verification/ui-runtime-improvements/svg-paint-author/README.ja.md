# Portable SVG candidate / evidence

採用候補は CANDIDATE-MANIFEST.json と proposals/v2（replace 2）/proposals/permanent（new 7）。候補作者の自己独立承認はしない。SVG-PAINT-REVIEW.ja.md と evidence/final-summary.json が実測 scope の入口。過去の実1、元196/新212 axe incomplete は保存済み。DELIVERY-MANIFEST.json は全 artifact の SHA/bytes を検査する。

永久回帰をコピーした後、repository で node scripts/test-svg-paint.mjs を実行する。package は test:svg-paint を追加し、既存 test の末尾へ追加する hunk のみ。依存変更はない。

この pack だけで再現する場合は raw-input の exact package-lock に従う依存を用意し、node proposals/permanent/scripts/test-svg-paint.mjs raw-input を実行する。現在の検証は raw-input を手編集せず canonical generation を使う。node_modules、compiled JS bundle、外部サービス、認証情報は pack に含めない。raw-input/ に 139 TS 製品と canonical CLI/config/Skill、モデル 2 spec、strict config を保存した。root 全 npm の代理結果ではない。

負対照 harness/verify-audit-controls.mjs は採取済み native SVG の診断コピーを使う証拠用 driver。製品を変更しない。全34の actual generated consumer と負対照5は別の実行。共有 host の起動/停止をせず、それぞれ自分の browser/server の finally のみ管理する。
