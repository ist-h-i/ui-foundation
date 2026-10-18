# 公開証拠レシピの独立レビュー v4

判定: **approve（固定v4の公開証拠レシピの範囲）**。指摘なし。製品コード、UI品質、通常gate、merge・公開可否の総合判定は対象外である。

## 固定対象

- repository: `/Users/inouehiroshi/Documents/GitHub/ui-foundation`
- branch: `feat/ui-static-warning-release`
- overall base: `b4aea63f67447dda1cabcf2da749617aa39c2d6f`
- HEAD: `88a72c2a94f6649a935d764166d83fe6d45b2758`
- snapshot: `review-evidence-recipe-v4-snapshot.json` — SHA256 `a74356e71e696e36aac576c24dd92292c881ab522857d1bef5006968498f0e76`
- immutable tar: `review-evidence-recipe-v4.tar` — SHA256 `6b4afdb1f6acb091065171cf91afe2d3b20e777b6771293cfb600e81ca4d202d`
- v3-to-v4 patch: `review-evidence-recipe-v4.patch` — SHA256 `a1fb4549b40f0fa7f7b67dc139513b748320de2dcd61ae3655149fa3c01edcac`

開始時と終了時にHEAD・branch・上記3点・snapshot内32入力のhashを照合し、すべて一致した。tar内の32入力とsnapshot・patchの計34ファイルも、現対象のbytes/hashに一致した。固定v3 tarから4対象ファイルの差分を再構成し、指定patchと完全一致することを確認した。実装過程の会話と主担当の承認結論は継承していない。

## 指摘の修正確認

v3 F1のroot対応不足は修正されている。`browser_run_proof.py:13` の明示的なtask repository rootはrawから導出されず、`browser_run_proof.py:38-57` がそのrootからconfigFile・CLIパス・rootDir・各project testDirと期待scopeを照合する。共通の`verify_release_browsers`からfinalizer・curatorの両方へ適用される。

原captureにcwdが記録されていたという主張は加わっていない。`browser_run_proof.py:10-12,97-98` は明示した信頼済みtask contextとの対応であること、元captureにcwdがないことを示す。実capture2件にはcwdフィールドがなく、両方の`verification_sha256`にある`run.py`は固定入力のhashと一致した。確認した`run.py:10-11,41`は自分の位置からROOTを定め、同じROOTをcommandのcwdに使っている。

独立した実I/O controlでは、runtime・nativeそれぞれの実記録をtemporary directoryへコピーし、raw configのrepository prefixだけを`/unrelated/ui-foundation-copy`へ一括置換した。capture・内部receipt・log・harnessを保ち、実raw bytesに合わせてsummaryのraw digestだけを更新したところ、両方とも`verify_browser_run`が`browser_run_proof.py:40`で拒否した。v3で受け入れていた同名suiteの別checkout取り違えを、成功proofの生成前に止めている。

v1/v2の対象も現在の経路で確認した。raw・内部receipt・外側capture・summary・logを実ファイルから読み、件数・scope・engine・単一attempt・retry・error・時刻の包含・終了・cleanup・hashを検査してからproofを返す。`finalize-release-results.py:29`はsummary/bridgeの書込みより先に検査を呼び、`:135-136`の成功件数を返却proofから作る。`curate-release-proof.py:49-52`も同じ検査とbridge内proofの一致をarchive書込み前に要求する。

## 実行した検証と確認範囲

- 適用される`AGENTS.md`、`code-review-quality`、日本語表現スキル、現行検証契約、4対象ファイル全行、v1/v2/v3報告、固定patch、`run.py`、`run-existing-bundle.mjs`、`scripts/run-cross-browser.mjs`、`playwright.cross-browser.config.ts`を確認した。
- `python3 -B docs/verification/ui-static-warning-release-20261018/test-browser-run-proof.py`は35 tests、exit 0、OK。今回追加のraw全checkout prefix取り違えを含む。製品のtest・browserを起動するコマンドではない。
- 共通validatorを実記録へ直接実行した。runtime48はChromium/Firefox/WebKit各16件、native180は各60件。全件passed・単一attempt・retry 0、unexpected/skipped/flaky 0、global/attempt errorsなし、重複なし。同一engine catalog、対象ファイル、raw config/argv/project scope、raw/capture/log/summaryのdigestと内部receipt、実行時刻の包含、native終了0・server cleanupが対応した。runtimeのbuild未実行は未実行のまま保持された。
- 独立した実I/O負例を両runに8種類ずつ、計16件実行した。別checkout prefix、別testDir/testMatch/catalog、部分catalog、失敗attempt、古いraw時刻、失敗capture、失敗内部native終了、raw欠落を、すべてproof生成前に拒否した。raw/capture bytesを変えるcontrolでは対応するsummary digestを更新した。時刻controlではsummary statsも対応させた。元の実記録は変更していない。
- 保存済みroot redは35 tests・exit 1・1 failure、root greenは35 tests・exit 0。scope redは34 tests・exit 1・11 failures、scope greenは34 tests・exit 0だった。log digest、source/bundle不変、各source記録を照合した。これらを製品の再実行や製品の失敗へ読み替えていない。
- candidate v7の718入力は現checkoutのbytes/hashと一致した。runtimeからのsource差分8ファイル、nativeからの差分3ファイルはfinalizerの明示リストと一致した。両captureの309 bundle入力は相互に一致し、現checkoutの同309ファイルとも一致した。最終normalのprivate checkoutとの比較はgate完了後のfinalizerに残る。
- finalizerは実行HEADと公開HEAD、source差分、bundle比較、過去の有限実行を再利用する範囲をbridgeへ残し、公開HEADで再実行したとは主張しない。Unknown・物理browser・実IME/AT・視覚全体への限界を成功へ変換する処理は確認しなかった。
- curatorは当該task内の列挙ファイル・指定subdirectoryと、同taskのclean receiptが明示するprivate checkoutから証拠を選ぶ。成功・失敗・中断の原記録と過去reviewを別の記録のまま保持し、他projectや一般的な一時directoryを探索する処理はない。実際の最終archiveは未作成である。

実I/O controlの変更対象hash、拒否箇所、返却した実proof、source/bundle比較は`review-evidence-recipe-v4-probes.json`に保存した。SHA256: `dde12a0c9fc71a5d2f3509bc684563cd8d7789b695de9f91deba38c0a9067380`。

## 未確認・停止

`normal-v3-summary.json`と`final-scope-bridge.json`は別担当の完全な通常gate終了後に作成される予定で、レビュー時点の不存在を指摘にしていない。gateを介入・停止せず、browser、build、typecheck、生成、finalizer、curator、Git変更、外部反映は実行していない。通常gateの最終成否、完成summary、最終archiveの展開・全参照の完全性は未確認である。

元captureにcwdフィールドがないという歴史上の限界は残る。今回確認したのは、依頼された固定repository contextに実rawを対応付ける補正と、その文脈を公開proofに明示する処理である。全記録の偽造に対する新たな監査、製品全体の品質判定、merge・公開の認可には範囲を広げていない。

作成したのは本報告と上記bounded probe記録のみ。probe用temporary directoryは終了時に除去され、既存入力・他者の変更・稼働processは保持した。32固定入力の不変を再確認し、固定v4のレビューをここで終了する。
