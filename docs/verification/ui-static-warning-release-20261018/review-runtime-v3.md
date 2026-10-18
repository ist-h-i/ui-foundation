# Runtime v3 独立レビュー（型推論修正版、確定）

**判定: approve（このruntime snapshotに対するレビュー推奨）。未解決のBlocker/Major/Minor指摘なし。新規9件と既存sparse21件の実browser証拠を直接確認した。最終品質・merge認可は主エージェントが判断する。**

## 固定対象

- repo: `/Users/inouehiroshi/Documents/GitHub/ui-foundation`
- branch: `feat/ui-static-warning-release`。Git base/head: `1ff725d1436ad1154bc5ae09d658c44f3cbfa751`（指定manifestの識別情報。Git操作は行っていない）。
- 初回v3: `review-runtime-v3-snapshot.json` SHA256 `571a53aa7a6abd9b5f3f11d6e77fb48285895f5a01ef08a9f0dd01acda9f3028`。
- 最終レビュー対象: `review-runtime-v3-typed-snapshot.json` SHA256 `222bb847753a6979cf99a6dcac90ccf09dd6a940ee27ad94449214381dd2c2c6`。
- template/generated `virtual-scroll.ts`: `826eaf798b70dad85a8221d1105a0ce8ef040be52ef803ba93d8d7fca4332c08`。
- v2→v3はtemplate/generated scrollとsparse specの3ファイルだけ。固定tar同士から再計算した実diffは`review-runtime-v3.patch`と一致。v3→typedはtemplate/generated scrollの2ファイルだけ。開始時はどちらの13ファイルもlive/manifest/tarが全一致。typedの終了時も13/13一致し、typed開始時から変更なし。型修正の実diffも固定tarから再計算して提示patchとの一致を確認した（`review-runtime-v3/hash-start.json`, `hash-typed-start.json`, `hash-end.json`, `archive-delta-check.json`, `type-correction-delta-check.json`）。

## 指摘

最終typed snapshotへの未解決指摘なし。レビュー対象・条件を超えた成功やmerge認可は主張しない。

旧v3には、`canFocus(control)`のfalse branchで`control`が`never`になる型不備があった（template/generated `virtual-scroll.ts:118`、`checked-build-v3.log:2-13`、TS2358×2/TS2339、exit 1）。typedではdisabled候補の事前計算へ限定修正され、`ngc-type-fix-v4`と`checked-build-v4`がともにexit 0。`canFocus`自身は`:disabled`を除外するため、事前計算で`isImplicitScrollStop`を呼ぶdisabled候補は元からfalse branchに入る対象。資格条件と戻り値を変える差分はない。旧build失敗は`review-runtime-v3/v3-build-summary.json`に残した。

## 確認した内容

1. **nativeのTab順とbounded探索** — `templates/angular/virtual-scroll.ts:65-97,105-155`。存在確認のために同期renderを行い、focus行を保持したまま有限batchで前後へ進む。見つからなければbase windowを復元する。各rangeは`ceil(viewport/itemSize)+2*(overscan+1)`以下、通常のTab探索では保持行が最大1つ。`virtual-rows.ts:24-31`は不要viewを先に除去してから必要viewを作る。focusの決定と移動はnativeのTabに委ねる。Tab経路に`preventDefault`、`.focus()`、RAF待機を追加していない。consumerの取消、composition、修飾キーのguardはlist/table側に残る。
2. **Firefox disabled scroll資格** — `virtual-scroll.ts:115-149`。例外はFirefoxのdisabled button/fieldsetに限定し、explicit tabindex、disconnect、hidden/inert、layoutなし、visibility、closed details、overflowと実scroll寸法を確認する。textarea等のdisabled editorは例外に含めない。Chromiumのfocusable descendant条件とWebKitのimplicit除外を維持する。
3. **共有focusとradio** — `focus.ts:2-12`と`virtual-radio.ts:29-45,79-118`、list/tableのTab委譲経路を確認。v2→typedでこれらのbytesは変わらない。private disabled例外は共有`canFocus`を緩和せず、radioは対象classに含まれない。checked group、方向別entry、group内移動の既存処理を変更していない。
4. **期待値の独立性** — `tests/ui/virtual-sparse-tab.spec.ts:79-157`。listenerのないcloneによる完全collectionをnative oracleとし、trusted/uncancelledな実Tab/Shift+Tabを記録してvirtual期待列に使う。runtime classifierをoracleに呼ばない。disabled候補の許容stateを固定成功にせずengineの実観測に委ねる。孤立disabled row499の1000行fixtureは隣の有効scrollerが停止条件の誤りを隠すことを防ぐ。
5. **速いTabとDOMの証拠** — `virtual-sparse-tab.spec.ts:10-37`。virtualのburstではキー間にlayout読み取りや2RAF待機を入れない。keyupでnative active/orderとcancelledを記録し、MutationObserverのmutation順に一時的row個数も計測する。`css-override-test.ts:12-24`の2RAFはsetup/update/destroyの境界にあり、burst内にはない。`runtime-lifecycle.ts:69-115,121-145`は診断・cleanupの記録に限定され、primary errorをcleanup errorで上書きしない。

## 証拠と実行結果

- **保存済みnative qualification**: 33+36+3=72条件。`scroll-stop-fix/native-qualification{,-disabled,-disabled-zero}.mjs/.json/.log`を直接確認し、receipt内9file hashとlog/JSONの全sequenceが一致。全イベントtrusted/uncancelled、全browser閉鎖を記録。engineはChromium 153.0.8010.12、Firefox 155.0、WebKit 26.6。native-onlyプローブでありvirtual修正後の成功証拠とは分ける（`review-runtime-v3/native-evidence-integrity.json`）。
- **red**: `scroll-stop-fix/red-isolated-disabled-firefox/results.json`のraw attachments。nativeは前後ともrow499のdisabled scrollerを通るが、修正前v2 source `ac389821...`のvirtualはrow0からrow999へ飛ぶ。exit 1、unexpected 1。spec/fixtureのhashは現snapshotと同じ（`review-runtime-v3/red-isolated-disabled-summary.json`）。
- **自分が実行したpure検証**: 実ソースの`isTabStop`/`isImplicitScrollStop`/`canFocus`をASTで取り出すmodelprobeをv3とtypedの双方で実行。各72/72一致、各exit 0、約0.23秒。保存native geometryと小さなselector fakeを使うため、新規native run、型検査、virtual end-to-endの代用にはしない（`review-runtime-v3/native-classifier{,-typed}-modelprobe.mjs/.json`）。
- **修正後型検査/build**: `ngc-type-fix-v4-receipt.json`、`checked-build-v4.py/.json/.log/-receipt.json`を確認。`ngc -p tsconfig.json --noEmit`とcheckProject JSON capture→ngc→build.mjs→Tailwindが各exit 0。全13file hashがtyped manifestと一致、実行中source変更0、log hash一致。sourcecheckは0errors/122warningsで、warningの意味審査は本reviewの範囲外。bundle実物SHA256は`b279534c146d2108610929109328b017cbe4477633fb9a20b70c66dc0abd901d`（`review-runtime-v3/typed-build-summary.json`）。
- **修正後native新規9件**: `scroll-stop-fix/green-implicit-v3-all-engines/results.json`、同名`.log`、`run-receipt.json`と添付を直接確認。9/9 expected、skip/unexpected/flaky各0、全case 1 attempt/retry0、exit 0。全native/virtualのactive+方向列が一致し、trusted/uncancelled、live/range/DOM bound、lifecycle error 0を確認。Firefox孤立caseは前後ともrow499のdisabled scrollerを通り、maxLive 5/limit 6。13sourceがtyped pinと一致、dist294が前後一致かつ現物hashも全一致、bundle `b279...`、serverClosed true（`review-runtime-v3/native-new9-summary.json`）。
- **修正後native既存sparse21件**: `scroll-stop-fix/green-existing-sparse-v3-all-engines/results.json`、同名`.log`、`run-receipt.json`と添付を直接確認。21/21 expected、skip/unexpected/flaky各0、各1 attempt/retry0、100.1秒、exit 0。2730件のkey sampleでtrustedとlive/range/DOM boundを確認。cancelledは各engineでconsumerが意図的に取消した1件だけで、row0のfocusを保持した。composing/修飾キーguardも同active/同rangeを保持。63地点のintersection/paint/offset検査は全成立したが、人手の視覚受入とは分ける。checked-radioのforward skipとreverse cross-rowを含む7ケース×3engineが通過した。lifecycleは全case open/記録error 0。13sourceのpin一致、dist294の前後/現物一致、bundle `b279...`、serverClosed true（`review-runtime-v3/native-existing21-summary.json`）。
- **本reviewで実行した補助コマンド**: manifest/tar/live照合とdiff再計算のPython、native JSON/log/receipt/添付のPython集計は各exit 0。`node .../review-runtime-v3/native-classifier-modelprobe.mjs`と`node .../review-runtime-v3/native-classifier-typed-modelprobe.mjs`は各exit 0。build/browser自体は主担当・workerが実行したrawを独立に読み、source/bundleに結び付けた。

## 範囲と未確認

読み取り専用、再委譲なし。ソース編集、同期、Git操作、重いbuild/browser/fullscanは行っていない。レビュー報告と`review-runtime-v3/`内の小さなprobe成果物のみ作成した。code-review-qualityとAngular architectureのtouched-surface scanを適用した。provider寿命、公開API、状態所有者やasync処理を変更する差分はない。

本reviewはruntime13ファイルとv2→typedの限定差分・関連native oracleを対象とする。静的checker全体、通常`npm test`全件、全virtual-radio suite、screen reader、人手の視覚受入、未観測engine/OS設定のnative資格は未確認。最終品質・merge認可は主エージェントが判断する。
