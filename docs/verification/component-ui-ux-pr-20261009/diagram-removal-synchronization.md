# Diagram の操作抑止解除と試験同期

候補 `08d524e13975ba279ca9db9c39330a371eae527c` の aggregate は設定70件・生成23件・モデル193件・型検査・生成一致を通過した。UI は1173件中366件合格、1件失敗の時点で長時間実行セッションが消失し、runner と test worker が停止していた。806件と後続の SVG は未実行であり、aggregate の exit code は得られていない。[保存ログ](diagram-sync-interrupted-aggregate.txt)、[入力 manifest](08d524e-source-manifest.json)、[中断記録](diagram-sync-interruption.json) を残す。

失敗は dense の `app-owned removal preserves external focus and blocked controls preserve the model`。最後の「操作抑止」checkbox を解除した直後、Angular の子部品が disabled を描画から除去する前に `press('Enter')` が送られた。locator 解決ログと action snapshot は追加ボタンの disabled 属性を記録し、約61ms後には有効へ戻っていた。`press()` は enabled を待たない。追加は成立せず、モデルは2ノードを保ち、focus は checkbox に残った。[独立レビュー](independent-diagram-sync-review.md) は raw trace・実装・インストール済み Playwright 実装を読んで同じ診断に達した。

修正は各状態の uncheck 後に追加ボタンの `toBeEnabled()` を確認する一行。固定 sleep や force activation を使わず、readonly / busy / disabled の各解除からの復帰も検査する。元のモデル保持、native Enter、外部 focus、破棄と再生成の assertion はすべて維持する。製品テンプレートと固定 runtime に変更はない。

先にコピーした14件を固定サーバーへ実行した試行は、そのサーバーのセッションも消失していたため全件 `ERR_CONNECTION_REFUSED` だった。[接続失敗の記録](diagram-synchronization-server-connection-failure-summary.json) を残し、製品試験の合格には数えない。同じ main.js SHA-256 の固定 runtime を再起動して対象14件を再実行し、その後に変更後の候補で完全な aggregate を実行する。実行ログ・終了状態は切り離した runner でファイルへ保存する。

再実行は [14件すべて合格](diagram-synchronization-green.json)、skip・flaky・retry 0、workers 2。[終了記録](diagram-synchronization-execution.json) は exit 0。コピーした試験と checkout の修正済み spec は byte 一致し、SHA-256 は `9acc28deab3ac9a65b01663d5da29b9d4d1ee5536782ad708ef6f0ae617e30d6`。後続の完全な aggregate が完了するまでは、全1173件合格とは記載しない。
