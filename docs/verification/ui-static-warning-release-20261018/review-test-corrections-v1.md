# 独立レビュー: test corrections v1

## 判定

**insufficient evidence（訂正版のブラウザー受入・merge判断）**。固定差分のソースレビューでは、修正を要求する指摘はありません。訂正版のブラウザー試験は本reviewerでは **NOT_RUN** です。過去の10失敗を合格へ変更する判定ではありません。

fresh contextで`code-review-quality`を適用し、実装担当の結論を前提にせず、実diff、production/fixtureの契約、保存済み失敗traceを確認しました。再委譲、source/Git変更、build、sync、ブラウザー起動、重い試験は行っていません。本ファイルだけを作成しました。

## 対象の固定

- Repository: `/Users/inouehiroshi/Documents/GitHub/ui-foundation`
- Branch: `feat/ui-static-warning-release`
- Base SHA = head SHA: `20761f986c6480546ddf405235b1ddf4faa8b405`
- Dirty snapshot: `review-test-corrections-v1-snapshot.json`
- Manifest SHA-256: `41dab6194486363412c318b28ffd3e93575c334dafe128b859fe4bc9e8c3e80f`
- Archive: `review-test-corrections-v1.tar`
- Archive SHA-256: `1378ab4388d02eddfcdac02c1e0601eeb6c7662a6a83eb92cfb488e15fb4d283`
- Exact patch SHA-256: `b49c27ed97a336f9585d79298bdbd36fcf50bc5f14f6a85244acb182c7c5dd89`

開始時・終了時とも、manifestに列挙された17ファイルの作業ツリー内容とtar内の内容が、全17件でmanifestのhashへ一致しました。現行の3対象ファイルの`git diff`も上記patch hashに一致し、HEADは不変でした。残り14ファイルは文脈・証拠であり、追加実装のレビュー対象へ広げていません。

| 実diffの対象 | SHA-256 |
| --- | --- |
| `tests/ui/static-runtime-p2-tables.spec.ts` | `89a0640355ea824ccc9f5e16b5cf6c7e3c17cad0366031e0c5ad02858f4ecb69` |
| `tests/ui/static-runtime-reassessment-navigation.spec.ts` | `3a8a298257b28878eaacd69b0d0a68397987bf433068edba0ca2e5ea88b5e436` |
| `docs/ui-warning-reviews.json` | `fbab2b042cb1aa97ea0190064ac4acff7f306c49400615f70cf204f5fe36da47` |

## 指摘

F1等として報告するBlocker/Major/Minorの指摘はありません。以下は確認範囲と証拠の説明であり、ブラウザー動作の合格認定ではありません。

## 確認した内容

### 仮想一覧の実配置oracle

`tests/ui/static-runtime-p2-tables.spec.ts:30-40`の変更を、`templates/angular/virtual-scroll.ts:8,151-172`、`virtual-list.ts:15-16,25-38`、`virtual-rows.ts:24-31`、`tests/fixture-app/runtime-priority2-tables.ts:4-8`と照合しました。

- ProductionはCDK wrapperのoffsetをzeroとするapplication-owned windowです。先頭余白と、保持された行がある場合のslot gapを組み合わせて配置します。旧テストはwrapper transformだけを期待値と比べ、実際の合成配置を観測していませんでした。
- 新oracleは`rowRect.top - (viewportRect.top + clientTop) + scrollTop`で、viewport内のscroll-content座標を測ります。`clientTop`はviewport上端borderを除きます。windowの垂直scrollは両rectで相殺されます。leading paddingやwrapper transformの格納方法を読み取って期待値へ足していません。
- 行の公開`aria-posinset - 1`と実測された均一な行高から期待座標を作り、先頭だけでなく全描画行を比較します。幅・均一行高・1000行分のspacer・live行数上限・1px許容差は維持されています。End後の1000番目の可視性も残っています。
- Home、アプリ所有draftの値、明示height/itemHeight/overscan、profile・文字サイズ・host幅変更、入力の内包、hide/reveal、無効値、破棄後のエラー・event不変性はそのままです。これら後続処理が今回の訂正版で実際に通るかは未確認です。
- これは描画された行と公開ordinalの有限検査です。1000件すべてのitem identityや任意のconsumer transform/CSSを網羅する検査ではありません。その範囲を拡大した主張はしていません。

保存traceの4失敗は旧テストhash `675413dbd1bd1dd8e2d97760e99c0b3609b80a0dc427c413f5ad00217f8dbdcd`を内包しています。A/B/C/Dの旧assertion残差は79360 / 126976 / 158720 / 63488でした。これだけでは現在のrow geometryの不良・合格のいずれも確定しません。

### 列幅のcaptionと操作契約

`tests/ui/static-runtime-p2-tables.spec.ts:77-82`を、`tests/fixture-app/table-catalog.ts:24,30,37`と`templates/angular/table-column-resize.ts:2-3,22-43,59-95`に照合しました。

- 幅signalのsinkは`.resize-demo`のwidthとseparator値です。表示captionは兄弟の`p#resize-caption`にあります。列要素自身にはhandleしかなく、旧テストの`textContent`期待はこのDOM契約に合っていませんでした。
- 新テストはcaptionを正しい要素から読み、`可変幅 (Npx)`の完全一致を確認します。境界box実幅、inline width、ARIA値、80..300の幅範囲は残っています。各sampleを数値・caption assertionより先にattachする変更は失敗診断の保存を改善します。
- 150→Home 80→End 300→方向付きarrow 290→pointer 270、pointer capture取得・解放、busy時のHome抑止、drag中のbusyによるcapture解放、復旧後Home 80の操作列は不変です。代替の人工closeや値設定へ置換していません。

4件の旧失敗は最初の`150px`文字列assertionで空文字を受け取ったもので、全4件の保存page snapshotに兄弟caption `可変幅 (150px)`が存在しました。初期幅のassertionより後のpointer/busy部分は旧失敗では到達していないため、訂正版での実行証拠を別に必要とします。

### Paletteの失敗応答とEscapeの順序

`tests/ui/static-runtime-reassessment-navigation.spec.ts:48-51`を、`tests/fixture-app/navigation-catalog.ts:14,49-50`、`templates/angular/command-palette.ts:12-18,195-213`、`dialog.ts:208-242`、`overlay.ts:56-64`と照合しました。

- アプリのfailure responseはbusy=falseとerrorをsignalへ書き、その値がPaletteからDialogへbindされます。Dialogはbusy中のUI closeを同期的にvetoします。Escapeはoverlayから同じfinish経路へ届きます。
- 保存traceを直接読んだ結果、Aは`call@9009` action snapshot 2260611.059、Cは`call@12870` action snapshot 2282275.038で、Escape対象のmodalはまだ`aria-busy=true`でした。queryは`保存`、active descendantは`catalog-palette-command-save`です。Aの2260621.267、Cの2282283.61で後からbusy=falseが現れます。
- 新しいsuffixは2回目のfailure click後に、Dialogのbusy=false、戻ったerror末尾、保持query、保持active descendantを確認し、それから従来どおり`search.press('Escape')`→hidden assertion→trusted native-event検査を実行します。意図されたbusy guardを外していません。
- error全文のRange行到達、trusted wheel、環境変更後の同一search elementとfocus、query/active、error/retryのnative Tabとfocus ring、retry label、実行数2の確認は差分前と同じです。sleep、retry、skip、expected failureは追加されていません。

旧A/C traceは旧navigationテストhash `e6c42faf2487bce5b07530b8118628714559a01404cd5a932e2b69726c9f1478`を内包しています。保存traceはbusy中にEscapeを送ったことを裏付けますが、settled failure後に必ず閉じるという訂正版の成功までは証明しません。

### 警告台帳の変更範囲

baseのJSONとsnapshot JSONを再帰比較した結果、変更scalarは**正確に37件**で、すべてevidenceの`sha256`でした。

- P2 tablesのhash更新: 30件。
- Reassessment navigationのhash更新: 7件。
- 各新hashは参照先の実ファイルhashと一致し、各anchorは参照先ソースに存在しました。
- それ以外のscalar、object key、array長・順序、承認・status・reason・anchor・scopeは不変です。Unknownを含む既存の分類・境界記述も変更していません。
- scopeは実行可能な回帰ソースの参照を明示したままで、実行結果の証拠へ昇格させていません。

## 確認コマンドと終了状態

すべてrepository rootで実行しました。read-only probeはメモリーへ大量のtraceを展開せず、zipfile/JSON/sourceの必要部分だけを読みました。

| コマンド・probe | Exit | 結果 |
| --- | --- | --- |
| `git rev-parse HEAD`、対象3ファイルの`git diff`、`shasum -a 256` | 0 | 指定HEAD・patch・manifest・archiveと一致。 |
| Python `tarfile` + `hashlib`（開始・終了） | 0 | 17/17ファイルがarchive/manifest/作業ツリーで一致。終了時も同一。 |
| `git diff --check -- tests/ui/static-runtime-p2-tables.spec.ts tests/ui/static-runtime-reassessment-navigation.spec.ts docs/ui-warning-reviews.json` | 0 | whitespace errorなし。 |
| Python再帰JSON比較 + evidence hash/anchor検査 | 0 | 37件のみ、内訳30+7、すべてsha256、参照先hash/anchor一致。 |
| Python `zipfile` + JSON（10件のtrace/error context） | 0 | 旧source identity、失敗箇所、caption、Paletteの実busy/query/activeとaction順序を確認。 |
| Python archive/live比較とgenerated/template比較 | 0 | 関連production/fixture 10ファイルは旧checkoutと同内容。7個のgenerated counterpartはtemplateと同内容。 |
| Node `typescript.createSourceFile` + assertion probe | 0 | 変更テスト2ファイルのparse diagnosticsは0。独立した実配置の読取と、2回目failure→idle/error/query/active→Escape→hidden→native検査の順序を確認。実行・型検査ではない。 |
| `rg`、`nl`、`sed`、`cat`による契約の読取 | 0 | 実diff、production、fixture、支援helper、Playwright config、project文書を確認。初回の広いrgだけは存在しない`runtime-components.ts`/`column-resize.ts`参照を含みexit 2。実在する`runtime-priority2-tables.ts`/`table-column-resize.ts`へ絞って解決。 |
| Build/sync/typecheck/通常test/browser suite | NOT_RUN | 主担当の通常suiteと重ならないよう依頼どおり実行しなかった。 |

旧checkout/evidence root: `/var/folders/57/t9r9mr850f74d7hd68f9zcm80000gn/T/ui-foundation-release-v2-72k3he8j`。raw failuresはこのrootの`test-results/static-runtime-p2-tables-*/`（8件）と`static-runtime-reassessmen-*/`（2件）です。調査メモ2件は根拠の入口として読んだものの、上記判断に必要なsource・trace・hashは直接照合しました。

## 未確認と次の受入

訂正版のA/B/C/D実行結果、後続assertionの到達、actual browser geometry、close成功は未確認です。AST/source/hash検査や旧traceの説明を代用していません。任意のconsumer CSS、実screen reader、全item identity、実利用者の理解も今回の有限差分レビュー外です。

主担当の次の責任は、通常のsupported UI pipelineで訂正版を実行し、その時点のsource/candidate hashと実結果を対応させることです。再失敗時は、このレビューの指摘なしを合格やmerge認可として使わず、実際の失敗証拠に基づいて再判断してください。
