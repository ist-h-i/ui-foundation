# Independent review: warning acceptance v1

Decision: **approve within the assigned warning-acceptance and fixture-migration scope at the fixed head**. 修正必須の指摘はありません。この判定は他担当の検査器・runtime修正、全体検証、公開操作の成立を承認するものではありません。

## 固定対象

- repository: /Users/inouehiroshi/Documents/GitHub/ui-foundation
- branch: feat/ui-static-warning-release
- base: b4aea63f67447dda1cabcf2da749617aa39c2d6f
- head: 1ff725d1436ad1154bc5ae09d658c44f3cbfa751
- spec: docs/verification/ui-static-warning-release-20261018/spec.md
- candidate-manifest.json SHA-256: 7d46a128fb16a1d642c4556d5092237f45b0ff3c6c0f8103c7acc059cc7b7b9b
- manifestの709 sourceは開始時のlive bytesと一致し、Gitの指定headの709 blobとも一致。baseの包含も確認しました。終了時のlive照合はreview-warning-v1/identity-end.jsonに記録します。

## 指摘

なし。主担当の実装会話・過去reviewの結論は判定根拠にしていません。ソース変更、生成、Git書込み、外部書込み、再委譲は行っていません。

## 確認内容

- src/warning-review.ts:41-108 のschema検証は必須項目、未知field、重複ID/診断、空の理由・scope・再確認条件、errorの分類、非Unknownへの変更、digest形式、相対pathと実行可能回帰sourceの存在要件を拒否します。111-132の対応付けは元SourceReportを変更せず、新規・消滅・重複を別issueにし、sourceのerror/失敗/未設定を分類で承認しません。135-165の読取りは中間directoryを含むsymlinkを拒否し、実ファイルのhashとanchorを再確認します。
- src/warning-review-cli.ts:20-35 は固定された本リポジトリのcheckProjectを実行し、project.validとreview.validを合わせて受入結果を返します。package.jsonの通常test先頭へ組み込まれています。src/cli.ts、src/check/entry.ts:46-49、src/sync.ts:301の通常終了条件へ分類gateを混入させておらず、利用アプリのwarning/exit0契約は分離されています。この境界は読解で確認し、同梱CLIの実行は本担当では再実施していません。
- docs/ui-warning-reviews.jsonの122 IDについて、consumer位置、producer、残す理由、有限回帰、未保証範囲、再確認条件を確認しました。公開CSS上書き、露出method交換、実測/仮想化/実行時入力、非同期media、外部engine、DOM復元、print、fixture入力を一律例外や静的成功へ変えていません。producer_static_status/universal_runtime_statusは全件Unknownです。
- JSONの906根拠参照は91実ファイル・372個のfile/anchor組で、すべて候補コミット内にあり、hash/anchorの照合に通ります。回帰sourceの125参照/44ファイルを構文で対応付け、直接titleとして拾えないparameterized test/helperや委譲されたassertionは該当sourceを読んで確認しました。これは有限の回帰ソースが存在する証拠であり、今回のbrowser実行や任意入力の合格ではありません。
- docs/ui-warning-reviews.ja.mdの122行・122 IDはJSONの位置・理由・再確認条件と一致しました。README、docs/static-checks.ja.md、docs/implementation-plan.md、release READMEはraw検査・分類gate・同梱版・有限runtime回帰・未保証範囲を区別しています。release READMEは全体検証・公開を準備中と記載し、未実施を完了とはしていません。
- tests/fixtures/static-checksの11資材を、移設元bytesと照合しました。raw report 2件を含む7ファイルは同一bytes、残る4 JSONはsource_report fieldの移設だけで他の値は同一です。3テストの5 path変更を逆変換すると開始時baseline-source-manifestのhashへ完全一致し、旧例外のID、範囲、理由、拒否assertionを弱めていません。現行45 producer/helperのhashと4つのsource_report参照digestがすべて一致しました。必要資材はHEAD内にあります。旧warning履歴への残存pathは、これら3テストが読み込まない来歴metadataです。
- .gitignoreは必要な2 raw reportだけを追跡対象へ戻し、.gitattributesはbundleのNOTICE原文bytesと末尾separatorに限定した設定です。今回の移設による過去記録の変更・削除はありません。

## 実行した検証

1. warning-review.test.tsのみを実行: 10 pass、0 fail、exit0、約3秒。TMPDIRを本review出力配下へ置き、tsx cacheを無効化しました。新規/消滅/重複/不正台帳/error/hash/anchor/path/symlink/CLI引数を含みます。logとreceiptはreview-warning-v1/warning-review-tests.*。
2. 保存済みbaseline-current.logのSourceReportを凍結し、現在のcheckWarningReviewsへ渡すprobe: 122/122 classified、0 error/unclassified/stale/issues、SourceReport変更なし。元logのSHAは保存receiptと一致。906根拠を現live bytesへ照合しました。詳細はreview-warning-v1/ledger-probe.json。
3. fixture移設・45 helper根拠・raw report digest・コミット内の包含、Markdown/JSON対応、実行可能回帰anchorのprobe。詳細はreview-warning-v1/fixture-probe.json、registry-index-probe.json、committed-snapshot-probe.json、evidence-test-body-*.json。

保存済みraw reportのreceiptにある690 sourceのうち、現在との相違はdocs/static-checks.ja.md、package.json、playwright.config.tsと移設した3テストです。ここでのprobeは分類機能の検証であり、現在HEADで通常CLIを新規実行したという主張ではありません。通常CLIの新scanと全体testは主担当の責任で別に確認する必要があります。

## 未実施と適用限界

- 指示に従い、全npm test、build/sync、重いstatic suite、実ブラウザー/cross-browser、clean checkoutの全test、push/mergeを本担当では実行していません。
- 検査器本体とruntime部品の網羅的正しさは別reviewerの担当であり、ここでは台帳の説明・根拠・受入境界との対応を確認しました。
- source/checker/configや根拠が追加修正された場合、このheadのhash照合・分類結果を新headへ流用できません。新scanにより台帳identity/根拠を再確認し、影響する検証をやり直す必要があります。
- 本担当の全実行は終了状態を回収済みで、継続中のtest/processはありません。
