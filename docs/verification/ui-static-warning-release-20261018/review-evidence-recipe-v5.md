判定: approve（新しい証拠集計・配布レシピの固定snapshotに限る）。

Findings: なし。Blocker / Major / Minor に相当する、実害と到達条件を確認できた問題は見つからなかった。この判定は normal-v4 の受入合格、sealed summary / bridge の正当性、archive の完成、merge を認定するものではない。

対象と固定

- Repository: /Users/inouehiroshi/Documents/GitHub/ui-foundation
- Branch: feat/ui-static-warning-release
- Base: b4aea63f67447dda1cabcf2da749617aa39c2d6f
- HEAD: a96f3ec0fae4908cf47be83246b1043f7dc8af26
- 対象: finalize-release-results-v2.py、curate-release-proof-v2.py、finalization-mapping-preparation-v2.json と、v5 snapshot の固定29入力。ソース修正とR161の設計自体は別レビューの対象。
- Snapshot SHA256: 5e5ff7e70e472c23dad586b569a2306e01ff59cc6628b7b61ad1c5dd070e60e7
- Patch SHA256: e7112def1cbf34f0b30e87ea31e1fbc1eb3951fb29f2f782f55fd6f0a82dfc37
- Tar SHA256: f89c175bcbfd756f715c8a150eaa617fc6317783750d21eaced99cefbf875931
- 開始時と終了前の29入力hash、snapshot / patch / tar hash は指定値と一致。tar の29 file memberもsnapshotと一致した。
- 固定patchを旧2ソースにメモリ内で適用し、新2ソースのbytesを再現した。初回の独自parserはdiff間の空行で停止したが、空行を扱うparserで照合を完了した。ファイルへのpatch適用は行っていない。
- browser_run_proof.py と test-browser-run-proof.py はreview-v4 snapshotのhashと一致し、不変だった。主担当や過去reviewの「指摘なし」を前提にせず、コード、raw、receipt、logを照合した。

確認結果

| 主張 | 根拠と確認した範囲 | 判定 |
|---|---|---|
| Candidate-v8は718 committed inputsを示す | 新helperを実際に呼び、a96f3ec0の全718 Git blobと各SHA256を照合。現在のroot bytesも718件一致 | Verified |
| 新helperは欠落や誤った入力を拒否する | wrong digest、directory/tree、missing path、parent path、invalid headの5局所negative controlをすべて拒否 | Verified |
| normal-v4を完了前や失敗から合格へ変換しない | finalizer L45-84でclean PASSED / exit0 / source・bundle drift空 / candidate一致 / log hash / warning gateを要求。各unit sectionに72 / 23 / 518 / 247のtests=passとfail/cancelled/skipped/todo=0を要求 | Supported: コード読解。validate_releaseは未実行 |
| 通常UI1903件を一部・失敗・skip・flakyから合格へ変換しない | finalizer L86-92で1903件、番号1..1903の重複なし成功行、1903 passed、失敗等なしを要求。package.jsonのnpm testは&&でwarning/typecheck/unit/UI/SVGを連結 | Supported: コード読解。normal-v4実結果は対象外 |
| SVG34 scenario / 6 steps / 229 source files / 50 dependencies / server閉鎖を照合する | finalizer L94-113でsuccess/sourceUnchanged/ownServerClosed、6 step exit0、34件の成功・errors空・scenario identity一意、229/50、source file hash、通常UI port閉鎖を要求 | Supported: コード読解。normal-v4 SVG未確認 |
| verification-tools-final-v2は候補と対応する65件成功の既存記録 | raw log末尾はtests65/pass65/fail0/cancelled0/skipped0/todo0。receipt exit0、718前後source=candidate、drift空、log hash一致。finalizer L129-137もこれらを要求 | Verified: 保存済み実行の有限範囲 |
| runtime48 / native180はrawと対応する完了記録 | 共有validatorの実呼出しと既存35pure unitが成功。raw config/argv/filter/root/project/test scope/catalog/attempt/status/retry/time/hashを検査。48は16×3engine、180は60×3engine、errors/unexpected/skipped/flaky/retryは0、serverClosed=true | Verified: 保存済み実行の有限範囲 |
| 過去executionのsource同一性と候補との差分を区別する | native180の717入力は469e1427のGit blobs、runtime48の716入力は20761f98のGit blobsと全件一致。候補への実差分は指定5件 / 9件で新定数と一致。application/CSS/fixture/runtime driverの保護493入力は両実行と候補で一致 | Verified |
| 過去browser実行を最終headで再実行したと主張しない | finalizer L160-182で差分を固定し、bridge scopeに再実行ではない旨を明示。runtimeのbuildはNOT_RUNを維持。過去2runの全309assetは前後と相互で一致。最終normal309assetとの比較はL115-123で必須 | Verified: 過去2run間。最終normalとの比較はUnknown |
| curatorはsealed結果と現在のgateを対応させる | curator L55-62で新finalizerをimportし、既存summaryのstampで再検査したexpected summary/bridgeとの完全一致を要求。L23、finalizer L189、両scriptのexclusive createで既存sealed出力の置換を拒否 | Supported: コード読解。mainとvalidate_releaseは未実行 |
| curatorは関連記録を明示選択してhash付きで保存する | 明示157件はすべて一意。旧選択から除いたのはnonexistent normal-v3-summary.jsonと旧bridgeだけ。Json診断3trace、targeted raw4件、別source review一式を追加。既存の限定directory選択を保持。addはfile/symlink/重複/path/checkpointを検査し、hash/bytesをindexとCONTENTSに記録 | Verified: 現在の選択・コード。archive生成結果はUnknown |
| normal-v3失敗を保存し、v3成功summaryを要求しない | curator L185-202。既存failure/capture/clean/logを直接照合し、FAILED / exit1 / UI1902 pass+1 fail / SVG NOT_RUNを確認。inventory83成果物のhash/bytesも全件一致。v3成功summaryは選択外 | Verified |
| Json targetedをfull normalの証拠と混同しない | 既存targeted rawはA/B/C/Dのchromium4件、各1 attempt passed/retry0/errors空でsummary/capture/log hashと一致。executionはexplicit grep、scopeはtargetedと明記。normal-v4合格要件を代替していない | Verified: targeted4件のみ |
| private checkpointと無関係な履歴を混入させない | 明示選択、限定directory、historical v2/v3の指定checkoutだけを列挙。現在の選択にduplicate / symlink / checkpointなし。収録予定v4/json source-review tarのmemberにもcheckpoint/unsafe path/linkなし。v5 reviewは選択外で別Git保存の方針と一致 | Verified: 現在の対象 |

主要な参照箇所

- finalize-release-results-v2.py:25-42（Git blob）、45-137（受入gate）、139-183（summary/bridge）、187-201（実行・exclusive create）。
- curate-release-proof-v2.py:23-62（候補・gate・再集計一致）、64-72（選択境界）、74-169（選択）、171-211（SVGと旧失敗）、213-237（hash indexと一度のarchive作成）。
- browser_run_proof.py:15-101（raw整合性）、103-137（実ファイルhash・固定scope/root）。
- test-browser-run-proof.py:13-191（35件の既存positive/negative controls）。
- run.py:16-27,29-50（source/bundleの前後capture）、run-clean-checkout-v4.py（committed archive / private dependency copy / 通常npm testの収録）。
- candidate-manifest-v8.json、verification-tools-final-v2.log/receipt、native-v12/runtime-v9のraw/receipt/summary/log、normal-v3-failure-summaryと83-entry artifact inventory、targeted-v1 raw/receipt/summary。

実施コマンド・結果

- git rev-parse HEAD / git branch --show-current: 指定HEAD / branch一致、exit0。
- SHA256の開始・終了照合、tar member読取、ASTによるcurator selection読取、固定patchのメモリ内適用: 一致、exit0。
- python3 -Bによる新2module importとverify_committed_inputs呼出し: 718件一致、5negative拒否。過去2headの717/716入力も一致、exit0。
- python3 -B docs/verification/ui-static-warning-release-20261018/test-browser-run-proof.py: 35 tests / OK、exit0。新しいブラウザー実行は起動していない。
- 共有verify_release_browsersのread-only呼出し: runtime48/native180証拠の検査成功、exit0。
- Pythonによる既存log/receipt/raw/artifact、選択fileとnested tarの読取: 上表の結果、exit0。
- 差分読取のgit diff --no-index -wはexit1（差分ありの通常終了）。初回patch parserのexit1は前述の空行処理に限定され、レシピの実行・判定失敗ではない。
- 詳細なprobe結果: review-evidence-recipe-v5-readonly-probes.json。

未確認・残余範囲

normal-v4のmutable log/receipt/private checkout、未来のsummary/bridge/archiveは固定29入力の対象外。normal-v4の完了、正常UI1903件、SVG実結果、最終309asset同一、最終port閉鎖、finalizer/curatorの実行成功は、このレビューでは確認していない。終了前の観測では4 sealed出力は存在しなかった。

finalize-release-results-v2.py::main、validate_release、curate-release-proof-v2.py::main、build、browser、full npm test、archive生成、commit、pushは実行していない。作成したのはこのreportとread-only probes JSONだけで、実装、既存証拠、registry、scriptの変更は行っていない。

この内部release集計は、固定したrepository/rootと、収録済みreceipt/log/rawを前提とする。任意攻撃者が全rawとreceiptを一緒に偽造する場合の新しい耐性設計はレビュー範囲外。有限なheadless操作から、実利用者・支援技術・physical Safari・視覚品質全体への一般化もしていない。

主担当の次の確認は、実際のnormal-v4完了と全gateの成立を確認し、認可済みの一度のfinalizer/curator実行後にsealed結果とarchive/indexを照合すること。このレシピレビューのapproveはその確認を代替しない。
