# 公開証拠レシピの独立レビュー v3

判定: **request changes**。Major 1件。publication-onlyの証拠検証処理を対象とした。製品コード、UI品質、稼働中の通常testは再レビューしていない。

## 固定対象

- repository: `/Users/inouehiroshi/Documents/GitHub/ui-foundation`
- branch: `feat/ui-static-warning-release`
- overall base: `b4aea63f67447dda1cabcf2da749617aa39c2d6f`
- HEAD: `88a72c2a94f6649a935d764166d83fe6d45b2758`
- snapshot: `review-evidence-recipe-v3-snapshot.json` — SHA256 `6de379694e037f06ccc242127ba9703546ada340d8704e700986f5ef9df5eeeb`
- immutable tar: `review-evidence-recipe-v3.tar` — SHA256 `5bdbbba82a09845bca1c685397ff505af850ef20919a3808079feed6a90381b4`
- v2-to-v3 patch: `review-evidence-recipe-v3.patch` — SHA256 `ecda7473c6514757a0d21179992a77d5a64183ab0fe36d4ea84e1ecfc4a75010`

開始時・終了時に上記3点とsnapshotの24入力のhashを照合し、すべて一致した。tar内24入力もsnapshotのhashと一致した。実装過程の会話と主担当の結論は継承していない。

## 指摘

F1 [Major] raw自身が指定する絶対rootを期待値に使うため、別checkoutの同名suiteをcaptureへ対応付けて成功proofにできる。

`browser_run_proof.py:34-40` は `configFile` のbasenameだけを固定し、その親を `execution_root` として期待する `rootDir` / `testDir` を組み立てる。`browser_run_proof.py:49,54` のCLI・project照合も同じraw由来のrootを使う。`verify_browser_run` はこのrootと、captureがソース・bundleを計測したrepositoryとの対応を検査しない。元captureにはcwdフィールドがなく、`run.py` が固定されたソース位置からROOTを決めているため、rawのrootを別の値へ変更しても、同名config・CLI・相対suiteの内部整合だけで受け入れる。

独立したI/O controlでは、temporary directoryへruntimeの6記録をコピーし、rawの `config` 内だけでcheckout prefixを `/Users/inouehiroshi/Documents/GitHub/ui-foundation` から `/unrelated/ui-foundation-copy` へ一括置換した。configFile、rootDir、CLIパス、全projectのtestDir、reporter/outputの絶対パスが別checkoutを指す一方、相対ファイル名、catalog、時刻、stats、attemptは元のままである。summaryは実bytesのraw digestだけを更新し、capture・内部receipt・log・harnessは変更していない。`verify_browser_run` はこの入力に対して `passed: 48`、`suite: runtime`、期待どおりの `test_scope` を持つ成功proofを返した。

別checkoutの同名suiteのrawを取り違えた場合や、実行が誤ったCWDへ移った場合、capture側のsource/bundle不変はそのrawが実際に使用したソースを保証しない。`finalize-release-results.py:29,135-136` はこのproofから成功bridgeを作り、`curate-release-proof.py:49-52` も同じproofとの一致を使うため、後段でもこの対応不足を検出できない。これはrawとsummaryの整合を保った限定的なrecord/config取り違えの確認であり、全記録の偽造に対する監査を求める指摘ではない。

修正条件: 今回の実行対象として信頼できるtask manifestまたは明示引数から期待する絶対repository rootを渡し、rawの完全なconfigFile・CLIパス・rootDir・project testDirをそのrootへ照合する。元receiptにcwdが記録済みだったとは扱わず、固定された実行contextとの対応をproofへ明示する。同じprefix置換とraw digest更新を行うI/O負例で、成功proofの生成前に拒否することを確認する。

再現の変更範囲・入力hash・返却proofは [review-evidence-recipe-v3-probes.json](review-evidence-recipe-v3-probes.json) に記録した。SHA256: `894c70be3682b55b9394b6e67895f471b239c27dc0557385553e523d95140f9a`。

**現行の実記録が別checkoutだった、または実行が失敗したという指摘ではない。** 実rawのconfigFile・rootDir・CLI・全project testDirは、両runとも依頼されたrepository rootを指していた。

## 確認した範囲と結果

- 適用される `AGENTS.md`、`code-review-quality`、日本語表現スキル、検証契約、4対象ファイル全行、v1/v2報告、固定patch、rawを作る `run.py` / `run-existing-bundle.mjs` / `scripts/run-cross-browser.mjs` / `playwright.cross-browser.config.ts`、通常receiptを作る `run-clean-checkout-v3.py` を読んだ。
- `python3 -B docs/verification/ui-static-warning-release-20261018/test-browser-run-proof.py` は34 tests、exit 0。既存の欠損・部分結果・重複・失敗・retry・engine差・error・total・skip/flaky・古い時刻・digest不一致・cleanup・source変更の負例に加え、raw config/argv/project scope/catalogの12 controlsが通った。
- v2と同じ別testDir・testMatch・suite/specファイルへの複合変更を、raw bytesとsummary digestを対応させて `verify_browser_run` へ渡すと、v3は `AssertionError` で拒否した。v2で再現された別ファイルscopeの取り違えは修正されている。
- 共通validatorを実記録へ直接実行し、runtime48は各engine16件、native180は各engine60件、全件単一attempt・retry 0・passed、unexpected/skipped/flaky 0、global errorsなしを確認した。raw/capture/logのdigest、内部receiptの時刻・native終了0・server cleanup・build実行有無も対応した。runtimeのbuild未実行は未実行のまま残る。
- 保存されたscope redはexit 1・11 failures、greenは34 tests・exit 0だった。両logのhash、captureのsource/bundle不変、source記録のvalidator/test hashを照合した。redを製品の失敗、greenを製品の再実行として扱っていない。
- candidate v7の718入力は現checkoutのbytes/hashと一致した。runtimeからの差分8ファイル、nativeからの差分3ファイルはfinalizerの明示リストと一致した。以前の実行を公開HEADで再実行したとは主張せず、実行HEAD・source差分・bundle比較をbridgeへ残す構造である。
- curatorは当該task内の列挙ファイル・指定subdirectoryと、このtaskのreceiptにあるprivate checkoutを読む。既存のUnknown、失敗・中断記録を成功へ書き換える処理は確認しなかった。

## 未確認・停止

通常gate、build、browser suite、生成、typecheck、finalizer、curator、Git変更、process操作は実行していない。作成したのは本報告と上記bounded probe記録のみで、unit/probe用temporary directoryは終了時に除去された。他者の変更と稼働processは保持した。

`normal-v3-summary.json` と `final-scope-bridge.json` はgate終了後の作成予定であり、レビュー時点の不存在を失敗として扱っていない。最終summaryの実生成、完成archiveの展開と全参照の完全性は未実行である。本レビューは通常gateの合格、製品全体の品質、merge・公開の認可を認定しない。固定v3のレビューをここで終了する。
