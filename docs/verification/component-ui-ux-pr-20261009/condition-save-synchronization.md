# 条件保存試験の復元同期

`a6bd7b5` の aggregate で guided の条件保存試験が1件失敗した。復元ボタンの click 直後に取得した DOM baseline は `children: []` で、保存待ちでは正常に復元済みの nested 条件が表示された。失敗は `async-retry-focus.spec.ts:208` の baseline 比較。[trace 抜粋](condition-sync-trace-selection.json) は click → textContent → editor 待機 → 比較の順を保存する。raw trace と画像は専用 `/tmp` に保持した。

固定した実ビルドに対して両 profile で各12回、同じ native 操作を実行した。[24回の観測](condition-restore-observations.json) のうち19回は click 直後の DOM が旧値。復元した nested model と「申請」input の描画を確認してから Enter で保存すると24回すべて表示済みモデルを保持した。これは後続の全 recovery assertion を代用する検査ではなく、失敗箇所の原因を区別する追加観測である。

試験の baseline 取得前に nested model の id と input の値を web-first assertion で確認する。固定時間の待機は追加せず、保存・失敗・再試行・入力 DOM identity・外部 focus・外部 reset・旧応答の assertion は維持した。製品のテンプレートや生成物は変更していない。

旧候補の実際の1失敗は合格に置き換えない。原因の確定後、全再検証へ進むため残る aggregate を停止した。[停止理由](condition-sync-interruption.json)、[実行記録](condition-sync-execution.json)、[ログ](condition-sync-aggregate.txt) を保持し、未実行の試験は合格に数えない。同期修正後の同じ試験を両 profile で各12回実行し、結果を別ファイルに記録する。その後、新規の `npm test` で全 aggregate を実行する。

同期修正後の [繰り返し結果](condition-sync-green.json) は guided/dense 各12回、合計24合格、skip・flaky・unexpected 0、retry 0。試験の実行は `CI=1 UI_FIXTURE_PORT=4227 npx playwright test tests/ui/async-retry-focus.spec.ts --grep "native condition save" --repeat-each=12 --output=/tmp/ui-foundation-pr-20261009/condition-sync-green-artifacts --reporter=json`。exit code は0。
