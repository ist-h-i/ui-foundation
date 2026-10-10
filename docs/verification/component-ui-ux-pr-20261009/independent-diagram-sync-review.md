# Diagram 解除後の同期不足に対する独立レビュー

対象: base `eeae8a9952489dc406fb70a478e25974ca695017`、実行中候補 `08d524e13975ba279ca9db9c39330a371eae527c`。本レビューはファイルと既存 raw trace の読取のみ。試験、編集、build、sync、Git mutation、外部送信は実施していない。

## 判定

今回の dense の失敗は、無効状態解除の DOM 反映を待たずに native Enter を送る試験準備不足である。製品側の追加処理・モデル保持・外部フォーカス復旧の不具合を示す失敗とは判定しない。提案された各 uncheck 直後の `toBeEnabled()` 一行追加は妥当で、承認する。製品 P0/P1/P2 の追加所見はない。

## P2: 試験が解除直後の disabled ボタンへ Enter を送る

- 場所: `tests/ui/diagram-connection-geometry.spec.ts:177` と `:179`。
- 条件: readonly/busy/disabled を順に解除し、最後の checkbox uncheck が戻った直後に追加ボタンへ `press('Enter')`。checkbox の native 状態更新と子部品の disabled binding の描画反映が異なる時点に完了する。
- 根拠: `/tmp/ui-foundation-pr-20261009/diagram-removal-failure/trace.zip` の `1-trace.trace`。SHA-256 `d12f48d47211a30240aaab7d8414a25d973da74facfe8e116f95decfe6f755cd`。
  - 最後の uncheck `call@11156` は 708934.279 ms に終了。708936.968 ms の after snapshot は操作抑止 checkbox `__playwright_checked_="false"`。
  - Enter `call@11158` は 708938.243 ms に開始。708944.574 ms の locator 解決ログは `<button disabled … data-diagram-add>ノードを追加</button>`。708948.035 ms の action snapshot も同じ disabled 属性を保持。
  - 709009.022 ms の press-after snapshot と 709016.085 ms の後続 expect-before snapshot では追加ボタンの disabled 属性が消えている。5秒の rows=3 検査は全14回 rows=2 を観測し、最終 error-context は操作抑止 checkbox が active、追加ボタンは enabled。
- 実装との整合: `templates/angular/diagram.ts:21` の追加ボタンは `[disabled]="blocked()"` と click handler のみ。`:48` の blocked は readonly/disabled/busy/problem、`:125` の add は blocked を検査してから changeRequested を emit。fixture は `tests/fixture-app/specialist-catalog.ts:5` で checkbox change から signal 更新、`:16` で子部品 input へ渡し、`:32` で changeDiagram の結果を親 model へ設定する。解除後にボタンが enabled に戻ることは raw snapshot で確認できる。
- 入力 API の確認: インストール済み `node_modules/playwright-core/lib/coreBundle.js:20565` の `_press` は `_focus` の後に keyboard.press を送信し、enabled 待機を行わない。埋込 InjectedScript の focusNode は native focus を呼んで done を返し、disabled の検査や focus 成功の保証をしない。今回の trace と最終 activeElement は、disabled の add へ focus が移らず、追加 activation が成立しなかった説明と一致する。キーボードイベント個々の実行時刻は trace から断定しない。
- 必要修正: 解除後の有効状態を web-first assertion で確認してから既存の native Enter を実行する。固定 sleep、force click、モデル件数 assertion の弱化は不要。

## 提案差分の確認

`/tmp/ui-foundation-pr-20261009/diagram-synchronization-check/tests/ui/diagram-connection-geometry.spec.ts` と現候補の spec を直接比較した。差分は loop 内の各 uncheck 直後に `await expect(flow.getByRole('button',{name:'ノードを追加',exact:true})).toBeEnabled();` を追加する一行だけ。

元の全行が同じ順序で保持されている。各モードでの削除ボタン disabled、強制的な DOM click 後の node/edge 件数保持、native Enter による追加、削除後の外部フォーカス保持、破棄/再生成後の model 維持の assertions は変更されていない。各モード解除後の復帰を三回独立に検査するため、単に失敗を隠す待機ではなく検査を強めている。

現 spec SHA-256 `068613739b77e3648030fb0bbd95043f67007e7de4f257a977fa2a409e263873`、提案 spec `9acc28deab3ac9a65b01663d5da29b9d4d1ee5536782ad708ef6f0ae617e30d6`。Diagram template/generated と specialist fixture は候補08d524eと byte 一致し、template/generated 相互も一致。

## 確認限界と merge 条件

本レビューは一件の失敗診断と提案差分に対する承認。提案版の実操作試験を自身では実行していない。1173件 aggregate は未完了なので総合合格とは記載しない。現在の aggregate の実際の失敗を残し、提案の実適用後に両 profile の対象試験結果、変更範囲、最終 SHA と検証入力の一致を確認する必要がある。既存 aggregate 全体を未実行の「最終 head 全件合格」に言い換えない。
