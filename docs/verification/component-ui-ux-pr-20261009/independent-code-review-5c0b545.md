# Diagram 同期修正適用後の独立レビュー

対象: `08d524e13975ba279ca9db9c39330a371eae527c` → PR #18 候補 `5c0b545d68cf2b3fdad06aa35b7298e49e9e9221`。ファイル・Git object・保存結果の読取のみ実施。試験、build、sync、Git mutation、製品ファイルの編集、外部送信は実施していない。

## 判定

追加変更と対象試験の証拠を承認する。未解決 P0/P1/P2 はない。前回特定した P2 の試験同期不足は修正され、対象 Diagram の両 profile の検査は保存 raw JSON 上で成功している。総合 merge 判定は、新候補の aggregate 完了と最終 docs commit 後の正確な head・入力・証拠の監査待ち。

## 追加差分と assertion

- 追加差分は11ファイル。10ファイルは今回の記録、実行結果、入力 manifest、既存独立レビューの保存。active source の変更は `tests/ui/diagram-connection-geometry.spec.ts:178` の一行追加だけ。
- 各 readonly/busy/disabled の uncheck 直後に追加ボタンの `toBeEnabled()` を web-first で確認する。元の全行が同じ順序で保持され、既存の disabled、モデル件数保持、native Enter、外部 focus、破棄/再生成の assertion は弱められていない。
- 候補の Git object、checkout、実行したコピー spec は byte 一致。SHA-256 は `9acc28deab3ac9a65b01663d5da29b9d4d1ee5536782ad708ef6f0ae617e30d6`。コピーした catalog-test と specialist-test-helpers も checkout と一致。追加差分の `git diff --check` は exit 0。

## 実行結果

- `docs/verification/component-ui-ux-pr-20261009/diagram-synchronization-green.json` は `/tmp/ui-foundation-pr-20261009/diagram-synchronization-green.json` と byte 一致。全14個の tests/results を読み、guided 7・dense 7、expectedStatus passed、結果 passed、各一試行・retry 0、errors 0 を確認。集計は14合格・skip 0・unexpected 0・flaky 0、グローバル errors 0。
- `diagram-synchronization-execution.json` も raw と byte 一致。2026-10-10T00:12:14.219148+00:00 → 00:12:51.855861+00:00、exit 0。実行は全 Diagram geometry spec、Chromium、workers 2、retries 0、固定 localhost 4229。
- 先行した接続失敗の raw JSON は14試験すべて failed / retry 0、各 navigation error は ERR_CONNECTION_REFUSED。保存した summary の stats と raw が一致する。製品操作を実行して合格したものとして扱っていない。
- 中断 aggregate の727行ログは保存 txt と raw が byte 一致。実際のケース行を集計して366合格・1失敗、1173から差し引き806未実行。設定70・生成23・モデル193の通過はログに存在する。aggregate exit code は記録上 null、SVG と残り UI は成功扱いにしていない。セッション消失の具体的原因は本レビューで再現していない。

## 入力・製品コード・runtime

旧候補08d524eの source manifest 480件を同候補の Git objects と直接 SHA-256 比較し、不一致・欠落0。5c0b545との相違は Diagram spec 一件だけ。現 checkout の480件も5c0b545の Git objects とすべて一致。製品 source/template/fixture、生成元と生成先、設定、型設定の追加変更はない。

UI レビューに固定した source manifest 480件との現候補の違いは、既に承認済みの `tsconfig.ui-runtime.json`、条件保存試験の同期修正、今回の Diagram 試験の同期修正の三件だけ。固定レビュー runtime 309件と現 `dist/fixture-app` を比較して欠落・不一致0。さらに `/tmp/ui-foundation-pr-20261009/review-build/dist/fixture-app` の309件も同 manifest と欠落・不一致0。main.js は両方 `06dc140f93f029b7a14347975ded98720f4b4ba3f61aab2f7649ed00d6b7f447`。

今回の14件は最終候補と一致する対象 spec と、製品変更がない固定 runtime に対する実行結果として利用できる。新候補全1173件の完了結果や最終 head 全体の合格を代用する証拠とは扱わない。
