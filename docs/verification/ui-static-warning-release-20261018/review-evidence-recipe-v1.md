# 公開証拠レシピの独立レビュー v1

判定: **request changes**。Major 1件。実装・試験本体の再レビューは行っていない。

## 固定対象

- repository: `/Users/inouehiroshi/Documents/GitHub/ui-foundation`
- branch: `feat/ui-static-warning-release`
- base: `b4aea63f67447dda1cabcf2da749617aa39c2d6f`
- HEAD: `88a72c2a94f6649a935d764166d83fe6d45b2758`
- `finalize-release-results.py` SHA256: `62c697ef24eff55adf2a0779bbe50c58d45e1618430c97dc464830cc4222fb02`
- `curate-release-proof.py` SHA256: `064a5cddf97c53dd65abc713f9f0aaadd6305e38896e4e07e1046cc8c26280d8`

上記2ファイルは未コミットの固定内容を読んだ。読了時にも同じhashであることを確認した。主担当の結論や実装過程の会話は継承していない。

## 指摘

F1 [Major] runtime 48件のraw結果を検証せず、固定の成功記述を確定できる。

`finalize-release-results.py:80-90` はruntime v9の外側captureについて終了0、source/bundle不変、bundle一致だけを検査し、`finalize-release-results.py:134` で `48/48 PASSED` を出力する。`cross-browser-runtime-v9/results.json` と同ディレクトリの `run-receipt.json` は読まない。`curate-release-proof.py:45-59` のraw検査は引数のnative runだけであり、runtime v9の2ファイルは `curate-release-proof.py:116-118` で内容を追加するだけである。既存 `cross-browser-runtime-summary.json` のraw/capture digestも照合しない。

このため、外側captureが成功したまま、runtimeのraw結果が欠落・別scope・部分結果・古い結果になっていても、finalizerは48件成功を出力できる。curatorはrawファイルの不存在なら停止するが、存在する別scope・部分結果・失敗結果の内容は拒否しない。現行2レシピを順に使っても、runtimeの実件数、engine別件数、skip/retry/flaky、終了・server cleanupと公開記述との対応が受入条件になっていない。archiveの各ファイルをhash化するだけでは、相互の取り違えを検出できない。

修正条件: 出力前にruntimeのrun receiptとraw結果を読み、runtime scope、3 engine、filterなし、native終了0・server終了、48件かつ各engine16件、全件の単一attempt・retry 0・passed、全体のunexpected/skipped/flakyとglobal errorsが0であることを検査する。raw結果・log・captureと既存summaryのhash対応も確認する。成功記述を実際に検査した値から作り、curation時にもその対応を保持する。native180側の記述も同じ共通検査に寄せれば、finalizer単独での固定成功記述を防げる。

**現行runtimeが失敗したという指摘ではない。** 読み取り確認では、runtime rawは48件、Chromium/Firefox/WebKit各16件、unexpected/skipped/flaky 0、全件1 attempt・retry 0・passedだった。logはcaptureのdigestと一致し、既存summaryのraw/capture digestも一致した。現行記録の直接確認で補えている条件を、レシピが必須検査として実装していないことが問題である。

## 確認した範囲と証拠

- 親・repositoryの `AGENTS.md`、`code-review-quality`、関連する検証契約を確認した。
- 2レシピ全行、capture schemaを作る `run.py`、clean receiptを作る `run-clean-checkout-v3.py`、candidate v6/v7、`review-summary.ja.md`、native v12/runtime v9のcapture・run receipt・raw結果・summary、verification-tools final receipt/log、既存normal v2 logを確認した。
- candidate v7の718入力は現checkoutのbytes/hashと一致した。native v12からの差分はレシピ指定の3ファイル、runtime v9からの差分は指定の8ファイルだった。native/runtimeのcaptureにある309 bundle入力は全件一致した。最終normalのbundleとの比較はまだ実行していない。
- native v12 rawは180件、各engine60件、unexpected/skipped/flaky 0、全件1 attempt・retry 0・passed。log/captureおよびsummary/raw/captureのhash対応も一致した。
- normalのNode summaryとPlaywright成功行の既存log表現は、レシピの正規表現と整合している。現行normal v3全体とSVG最終出力は実行中のため、レシピを通した確定検証は行っていない。
- curationは列挙された当該タスク内のファイルと、そのreceiptが指定する当該タスクのprivate checkoutを読む。生成物・Unknown・過去の失敗記録を書き換える処理はなかった。最終archiveの内容、展開後の完全性、参照先全件の存在は未実行。

参照hash:

| 記録 | SHA256 |
| --- | --- |
| candidate-manifest-v7.json | `cae32ad5a8e26e07f19d55f4967b742efde571d3f071f9129ba92b449d7dbbb7` |
| review-summary.ja.md | `8778341ecb3d1eacb65350f4715e698a87fc5f62e8f3317cb55924c7e97ba2af` |
| cross-browser-runtime-v9-receipt.json | `a6d6c9947d47dbf13e973a0907334d99e4f7311d24b9665e87c235b53cd17862` |
| cross-browser-runtime-v9/results.json | `88ef75f1f0cdaf905056f912c1740da89ce97a24e48c6ca44453fbc1ffbf3351` |
| cross-browser-runtime-v9/run-receipt.json | `6d039b379a2a7a5c10c812ffa58a3f494ceba503cf06b722bff3eebbcd2a08a5` |

## 未実行・停止条件

テスト・build・browser・公開レシピは実行せず、稼働processとGitは変更していない。読み取り用Pythonで既存JSONの件数・結果・hash・source差分を照合した。本報告ファイルだけを作成した。

`normal-v3-summary.json` と `final-scope-bridge.json` は現行gate完了後に作られる予定で、レビュー時点の不存在を失敗として扱っていない。現在のnormal gate合格や最終公開の許可を本レビューから認定しない。上記固定内容へのレビューをここで終了する。
