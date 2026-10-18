# 公開証拠レシピの独立レビュー v2

判定: **request changes**。Major 1件。publication-onlyの証拠検証処理を対象とし、製品コード・UI品質・稼働中の通常testは再レビューしていない。

## 固定対象

- repository: `/Users/inouehiroshi/Documents/GitHub/ui-foundation`
- branch: `feat/ui-static-warning-release`
- overall base: `b4aea63f67447dda1cabcf2da749617aa39c2d6f`
- HEAD: `88a72c2a94f6649a935d764166d83fe6d45b2758`
- snapshot: `review-evidence-recipe-v2-snapshot.json` — SHA256 `8ccd0f39235ebe84e37fc30611f2b51fff6098279c3a2a99abf7765f35fd5df3`
- immutable tar: `review-evidence-recipe-v2.tar` — SHA256 `28f8f9b8ed01f8faabc789cbb8d7a242bcabea4ff5237f110ab1fa7c069f3947`
- patch: `review-evidence-recipe-v2.patch` — SHA256 `30d025de89f7c322966a44669120e6caaac57e337f761402e375c728b896f5f5`

開始時と終了時に上記3 hash、HEAD、snapshot内18ファイルのhashを直接照合し、すべて一致した。tar内20ファイルのbytesも現対象と一致した。v1保存版と現4ファイルから再構成したpatchは固定patchと完全一致した。実装過程の会話・主担当の承認結論は継承していない。

## 指摘

F1 [Major] raw結果の実scopeをrun receiptの宣言scopeへ照合せず、別scopeの結果をruntime 48件成功として確定できる。

`browser_run_proof.py:23-24` は内部run receiptの `suite` / `testScope` / engine / filter宣言を確認するが、raw configは `browser_run_proof.py:32-33` でproject名とretryだけを確認する。raw側の `configFile` / `rootDir` / `argv` / `shard`、projectの `testDir` / `testMatch` / `testIgnore` / `repeatEach` は宣言scopeへ対応付かない。`browser_run_proof.py:57-64` では `spec.file` をengine間catalogの同一性に使うだけで、期待する対象ファイルかを検査しない。

このため、件数・engine別件数・pass状態・時間範囲が同じ別scopeのraw結果と、そのraw digestに一致したsummaryを取り違えて入力すると、正しいscopeを宣言したrun receiptのまま成功proofが返る。`finalize-release-results.py:29,135-136` はそのproofから公開bridgeの成功記述を作り、`curate-release-proof.py:49-52` も同じproofとbridgeの一致を確認するため、後段でもscopeの取り違えを拒否できない。hash一致はrawファイルの同一性を示すが、その内容と宣言scopeの意味的一致を補わない。

独立controlでは元ファイルを変更せず、temporary directoryへruntimeのcapture・内部receipt・log・harnessをそのままコピーした。rawの `rootDir` と全projectの `testDir` / `testMatch`、suite/specのfileを `tests/unrelated` / `unrelated.spec.ts` に変え、実bytesからsummaryのraw digestを更新した。実際のファイル読込み経路 `verify_browser_run` が、`passed: 48`、`suite: runtime`、`test_scope: tests/cross-browser / runtime-cross-browser.spec.ts` のproofを返した。結果と全変更条件は [review-evidence-recipe-v2-probes.json](review-evidence-recipe-v2-probes.json) に記録した（SHA256 `9b719e16f3440ee4d64728a023fbe5e0a746f604291bc61d7bde748c0f8d3821`）。

修正条件: raw configの実対象・実引数・filter/shard/repeat条件と各specの対象ファイルを期待scope・内部receiptへ照合し、不一致を成功proofの生成前に拒否する。新たな負例はraw bytesとsummary digestを対応させ、`verify_browser_run` 経由でraw scope・引数・catalogの取り違えを拒否することを確認する。現在の `test_wrong_scope_rejected`（`test-browser-run-proof.py:53-54`）は内部receiptだけを変更し、この境界を通らない。

**現行の実記録が別scopeだった、または実行が失敗したという指摘ではない。** 現rawではruntimeの対象は `tests/cross-browser/runtime-cross-browser.spec.ts`、nativeの対象は指定3ファイルであり、raw argvにfilterはなく、shardなし、repeatEach 1、testIgnoreなしだった。

## 確認した範囲と結果

- 適用される `AGENTS.md`、`code-review-quality`、検証契約、4対象ファイル全行、v1指摘、固定patch、rawを作る `run.py` / `run-existing-bundle.mjs` / `scripts/run-cross-browser.mjs` / `playwright.cross-browser.config.ts`、通常receiptを作る `run-clean-checkout-v3.py` を読み取った。
- `python3 -B test-browser-run-proof.py` を実行し、22 tests、exit 0。実runtime48/native180の正例と、欠損・部分件数・重複・失敗・expected failure・retry・engine差・global/attempt error・不正total・skip/flaky/unexpected・古い集計時刻・hash不一致・server未終了・終了失敗・source変更・NOT RUN build昇格の負例が通った。製品testやbrowserは起動していない。
- 現raw/capture/summary/logを共通validatorで直接照合し、runtime48は各engine16件、native180は各engine60件、全件単一attempt・retry 0・passed、集計unexpected/skipped/flaky 0、global errorsなしを確認した。raw/capture/logのdigest、実行時刻の包含、native終了0、server cleanup、build実行有無は対応した。
- candidate v7の718入力は現checkoutのbytesおよびHEADのGit blobと全件一致した。runtimeからの差分8ファイル、nativeからの差分3ファイルはfinalizerが列挙する差分と一致した。公開headで再実行したという主張へ変換せず、source差分とbundle対応をbridgeへ残す構造だった。
- curationは当該task配下の列挙ファイルと、そのtaskのreceiptが指定するprivate checkout内の結果を読む。既存のUnknown、失敗・中断記録を成功へ書き換える処理はなく、元の失敗記録とv1レビューを別名で残す。未所有の他projectを探索する処理は確認しなかった。

## 未確認・停止

稼働中のnormal gate、build、browser suite、生成、typecheck、finalizer、curator、Git変更、process操作は実行していない。`normal-v3-summary.json` と `final-scope-bridge.json` の不存在を指摘として扱っていない。通常gate完了後の最終summary生成、archiveの展開・全参照の完全性は未実行であり、本レビューから正常gateの合格や公開認可を認定しない。

作成したのは本報告と上記のbounded probe証跡だけ。元の18固定入力の不変を再確認して、このsnapshotのレビューを終了した。
