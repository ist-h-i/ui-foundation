# 共通UIカタログ最終拡張の検証

全181要求のうち、PR #10までの133行に続く残る48行を本差分で実装する。Tree4、Scheduler1、表16、media11、specialist13、フォーム・locale/RTL・profile基盤3の合計48行。[要求原文](../ui-library-request.ja.md)と[マトリクス](../ui-library-matrix.json)の制御項目は保持する。

## 検証中の記録

本体の通常CLI同期・一致検査・strict Templates/AOT・build、model181件・config70件・generation15件は実際にexit 0。これは全181要求のブラウザー実証を181モデル試験へ読み替えるものではない。全体npm検査と最終独立レビューは進行中で、マトリクスの完了状態は前段階の133 verified /11 partial /37 pendingを保持する。全体完了判定はまだfalse。

[本体preflightの実行台帳](ui-library-final-catalog/root-final-preflight-execution.json)と各ログ/exit、[統合差分のSHA](ui-library-final-catalog/shared-adoption-actual.json)を保管する。日付書式の未確定入力保持とSpreadsheetのライブラリ診断翻訳は実際に指摘された不具合を修正し、正常生成のconsumerで独立再測定している。追加正式試験の初回にはSheetのlabel locator失敗2件があり、4件のPASSと併せて原ログ/画像を保持し、製品コードを変えずにrole/name指定へ直して再実行する。

## 既存判定保留と確認範囲

[collections contrast原24件と実表示36件](collections-contrast-audit/collections-contrast-audit-2026-10-06.md)を別に保存する。可視外bufferの元incompleteと、描画対象へ移動した実際の色比を混同しない。[依存closure・原notice・PDFフォント対応ソース](../dependency-license-audit.ja.md)も配布に含める。

axeのviolations、incomplete、実ブラウザー操作、AIによる意味/画像レビューを区別する。全ソースのAST逸脱検査、完全SSR/hydration、Safari・実支援技術、人による最終確認、FontForge再ビルド・PGP検証、法律上の完了を実施済みとはしない。通信・認可・保存結果・業務Undoは利用アプリの責任。


追加正式回帰は修正後6/6 actual PASS（DateRangeのnative badInputを含む4ケース＋実数式workerの2ケース）。元locator失敗は保持する。[修正後のログ](ui-library-final-catalog/root-final-new-native-corrected.log)と[JSON](ui-library-final-catalog/root-final-new-native-corrected-report.json)を対応付ける。保持文言の新独立指摘に対し31 string state /104 library writerを表示境界へ移し、branch/件数/app値を操作時snapshotとして保持した。[限定した変換台帳](ui-library-final-catalog/cached-message-state-manifest.json)は全ソースAST逸脱検査ではない。現在の製品入力は [SHA一覧](ui-library-final-catalog/root-message-final-source-freeze.json)に固定し、全体検証を続ける。

全npmの初回候補 `f792b158` は設定70・生成15・model183が実成功し、UI135成功・2中断・839未実行で実終了130。Media独立検証で狭幅RTLにおけるBarcodeのCSS縮小による実表示decode失敗を確認したため、ソース変更前に自分のPlaywrightへSIGINTを送って停止した。前後455入力のSHAは不変（sourceChanged=[]）。[元ログ・実終了](ui-library-final-catalog/first-full-npm-f792b158-interrupted/execution.json)を保持し、全体PASSへ読み替えない。Barcodeの実寸module幅保持・named部品内スクロール、Schedulerの純モデル構造診断の表示境界翻訳を最小修正し、正式回帰と新候補の全検査へ進む。

最小表示修正後、追加正式5回帰はactual exit0（両profile Barcode2、Scheduler3入力変更解除2、RTL Compare1）。[実行台帳](ui-library-final-catalog/last-display-execution.json)と[raw結果](ui-library-final-catalog/last-display-native-report.json)を保存した。同期・一致・139source strict AOTも同候補でactual0。新候補の全検査と最終独立採否を続ける。
