# 共通UIカタログ最終拡張の検証

全181要求のうち、PR #10までの133行に続く残る48行を本差分で実装する。Tree4、Scheduler1、表16、media11、specialist13、フォーム・locale/RTL・profile基盤3の合計48行。[要求原文](../ui-library-request.ja.md)と[マトリクス](../ui-library-matrix.json)の制御項目は保持する。

## 本体全件の実終了

`8e8748afb5d3314c2860d0ae181c23c1a444c9d0` のplain `npm test`は2026-10-06 10:32:02–10:57:36 UTC、actual exit0。設定70・生成15・model183・UI980の計1,248ケースは全件成功、skip/cancel/retry0。457入力の前後SHAとHEADは同一で、sourceChanged=[]。製品139ソースは独立ソース承認済みa808から不変、後続は独立審査済みの正式試験4ファイルだけ。[実終了台帳](ui-library-final-catalog/final-full-npm-8e8748a/execution.json)、[元log](ui-library-final-catalog/final-full-npm-8e8748a/npm-test.log)、[87 artifactsのSHA採取](ui-library-final-catalog/final-full-npm-8e8748a/capture-manifest.json)を保存する。

[181対応表](../ui-library-matrix.json)をverified181 /partial0 /pending0へ更新した。原181のid・分類・部品名・制御項目・行番号・baselineは保持し、追加48行/207制御項目は[canonical対応](ui-library-final-catalog/canonical-prep-8e8748a/requirements-48-controls-8e8748a-canonical.json)の実装/正式試験SHAと照合した。[準備監査](ui-library-final-catalog/root-final-181-matrix-preparation.json)はactual full0を根拠に更新し、全体完了フラグと最終matrix/docs独立承認はまだfalse。表54ケースは共通helperから宣言されるため、4moduleには同一共有suiteへの参照を記録し、各moduleの別54成功として加算しない。

rootのMasonry2＋Lightbox1＋Tree2選択再測定も5/5 actual0（skip/retry/flaky0、sourceChanged=[]）。全件の成功と独立consumer/ソース承認、過去のactual1/130、axe incomplete、追加UI spec strict24診断、未実施の人によるレビューは別判定として保持する。次の完了条件は、この実終了を含む181matrix/docsの最終独立照合とPRの既存承認範囲内のmergeである。

## 過去の検証と判断の記録

以下は各候補の当時の状態・判断・残条件を記録する。途中のFAILや停止、未完了フラグを最新の成功へ書き換えない。最新の実終了は上記8e8748aの台帳を参照する。

直近の全件候補は `53a785824b86a34ada3ee8619f710fad57117634`。全139製品はソース承認済みのa808とbyte同一で、変更は独立審査済みの試験2箇所だけ。09:51 UTC開始の全件npm検証は10:18 UTCにactual exit1で終了し、設定70・生成15・model183はactual0、UIは980中977 PASS /3 FAIL。Masonry列数切替直後とLightboxリセット後のキー入力は描画待機の不足を独立確認した。Tree1件は画面goto開始前のブラウザー終了で、原因は未確定。元記録を保持して再測定する。全体完了と最終対応表の承認はまだfalse。以下の途中記録を最終成功として扱わない。

本体preflightの通常CLI同期・一致検査・strict Templates/AOT・build、model183件・config70件・generation15件は実際にexit 0。これは全181要求のブラウザー実証を181モデル試験へ読み替えるものではない。全体npm検査と最終独立レビューは進行中で、マトリクスの完了状態は前段階の133 verified /11 partial /37 pendingを保持する。全体完了判定はまだfalse。

[本体preflightの実行台帳](ui-library-final-catalog/root-final-preflight-execution.json)と各ログ/exit、[統合差分のSHA](ui-library-final-catalog/shared-adoption-actual.json)を保管する。日付書式の未確定入力保持とSpreadsheetのライブラリ診断翻訳は実際に指摘された不具合を修正し、正常生成のconsumerで独立再測定している。追加正式試験の初回にはSheetのlabel locator失敗2件があり、4件のPASSと併せて原ログ/画像を保持し、製品コードを変えずにrole/name指定へ直して再実行する。

## 既存判定保留と確認範囲

[collections contrast原24件と実表示36件](collections-contrast-audit/collections-contrast-audit-2026-10-06.md)を別に保存する。可視外bufferの元incompleteと、描画対象へ移動した実際の色比を混同しない。[依存closure・原notice・PDFフォント対応ソース](../dependency-license-audit.ja.md)も配布に含める。

axeのviolations、incomplete、実ブラウザー操作、AIによる意味/画像レビューを区別する。全ソースのAST逸脱検査、完全SSR/hydration、Safari・実支援技術、人による最終確認、FontForge再ビルド・PGP検証、法律上の完了を実施済みとはしない。通信・認可・保存結果・業務Undoは利用アプリの責任。


追加正式回帰は修正後6/6 actual PASS（DateRangeのnative badInputを含む4ケース＋実数式workerの2ケース）。元locator失敗は保持する。[修正後のログ](ui-library-final-catalog/root-final-new-native-corrected.log)と[JSON](ui-library-final-catalog/root-final-new-native-corrected-report.json)を対応付ける。保持文言の新独立指摘に対し31 string state /104 library writerを表示境界へ移し、branch/件数/app値を操作時snapshotとして保持した。[限定した変換台帳](ui-library-final-catalog/cached-message-state-manifest.json)は全ソースAST逸脱検査ではない。現在の製品入力は [SHA一覧](ui-library-final-catalog/root-message-final-source-freeze.json)に固定し、全体検証を続ける。

全npmの初回候補 `f792b158` は設定70・生成15・model183が実成功し、UI135成功・2中断・839未実行で実終了130。Media独立検証で狭幅RTLにおけるBarcodeのCSS縮小による実表示decode失敗を確認したため、ソース変更前に自分のPlaywrightへSIGINTを送って停止した。前後455入力のSHAは不変（sourceChanged=[]）。[元ログ・実終了](ui-library-final-catalog/first-full-npm-f792b158-interrupted/execution.json)を保持し、全体PASSへ読み替えない。Barcodeの実寸module幅保持・named部品内スクロール、Schedulerの純モデル構造診断の表示境界翻訳を最小修正し、正式回帰と新候補の全検査へ進む。

最小表示修正後、追加正式5回帰はactual exit0（両profile Barcode2、Scheduler3入力変更解除2、RTL Compare1）。[実行台帳](ui-library-final-catalog/last-display-execution.json)と[raw結果](ui-library-final-catalog/last-display-native-report.json)を保存した。同期・一致・139source strict AOTも同候補でactual0。新候補の全検査と最終独立採否を続ける。

当時の製品候補は `60cd513e86099dffc756c10402a5262f466a34d0`、source/test/Skill freeze273入力・139ソース。08:42 UTCに固定候補の全npm testを再開し、456 tracked inputs・port5187・2workers・retries0・前後SHA監視で実終了を記録した。以下にその実終了を保存する。

`60cd513e` の全npmは設定70・生成15・model183実成功、UI385 PASS /2 FAIL /2 INTERRUPTED /589未実行、実終了130、sourceChanged=[]。独立Cardの狭幅RTLでグリッドのauto min-contentが本文を左へはみ出させる実不具合が確認され、変更前に自分のPlaywrightを停止した。UI FAIL2は既存Date試験の末尾が「書式切替時にinvalid draftを消去する」旧挙動を期待しており、修正済み入力保持契約と矛盾するもの。元原文・ログ/trace/画像を保存し、その末尾だけraw・INVALID・同じモデル保持→明示resetでnative書式適用を検査する。DatePicker製品コードは変更しない。CardはCSS一箇所だけminmax(0,1fr)へ修正し、元の全slot/投影入力とDOMを保持して実geometryを検証する。

Card CSS-only修正後、両profileの新Card2＋旧Datesの契約更新2は正式4/4 actual0。[台帳](ui-library-final-catalog/card-date-final-execution.json)と[raw結果](ui-library-final-catalog/card-date-final-native-report.json)。独立consumerでも同一native callerでtrack414→238/356→270、入力left−111→65/−45→41となり到達性を実証し、DOM/selection/focus/draft保持・他138TS不変を確認。重点4部品の独立14＋実5秒elapsed2もactual0。残る条件は固定候補の全npm実終了と最終証拠照合。

製品ソースを `a808a79dc5f17c1b87280c2881147c8ab5357a9f` に固定した。[製品freeze](ui-library-final-catalog/root-message-final-source-freeze.json)は274入力・139TS、SHA256 `82388e8eea2aae64a422cf86a168c08d5a9b798bd290b8d70776309e80b49b9a`。2026-10-06 09:03:52 UTCからplain `npm test`をport5187・2workers・retries0で実行し、生成物を含む全457 tracked入力の前後SHAを監視した。途中でdense InlineEditの2ケースにブラウザー途中終了を伴うFAILがあり、元traceを保存した。この全件実終了と後続再検証は以下に区別して記録する。

## 最終候補の媒体独立レビュー

媒体11要求は [独立報告](ui-library-final-catalog/media-independent-review/media-independent-review.ja.md)でapprove。[行別control対応](ui-library-final-catalog/media-independent-review/media-control-coverage.json)、[個別source SHA](ui-library-final-catalog/media-independent-review/media-source-sha.json)、[採取manifest](ui-library-final-catalog/media-independent-review/evidence-manifest.json)、[本体へのbyte同一採用](ui-library-final-catalog/media-independent-review/root-adoption-manifest.json)を保存する。323 artifactsと元manifestの計324ファイルを同一SHAで採用した。担当はChart作者だが、本判定は媒体11行のみを対象とし、Chartを承認していない。

native媒体操作は60cd候補で実測した。[a808継承の根拠](ui-library-final-catalog/media-independent-review/media-a808-inheritance.json)は媒体13source・locale・config・lock・assetsの同一byteと、Cardだけの製品差分を記録する。a808の正常同期・check・strict・139source emitted AOTは各actual0。formal18/18、model5/5、追加native14条件、QR48ラスタと4画面、Barcode8形式×4条件32ラスタと2広幅画面の独立復号が実成功した。

MSI/pharmacodeの2形式は白黒ラスタ・入力・操作を検査したが独立復号は未実施。Barcodeの狭幅は局所スクロールで原寸を保持し、切り取られた単一viewportの全コード復号を保証しない。Galleryのpicker group、live scope、Barcode touch scopeの最終axeはviolations/incompleteとも0だが、他stateの元incompleteを削除していない。OS drag・他browser・hardware scanner・実upload service・人の支援技術確認は未実施。原失敗とこの限定範囲は独立報告に保持する。

## 最終候補の専門部品独立レビュー

[専門部品の最終報告](ui-library-final-catalog/specialist-independent-review/final-foundation-review/evidence/FINAL-REVIEW.ja.md)は既知指摘S01〜S11と最終依存差分を限定approve。専門13source/localeはfresh32実測時からbyte同一で、a808の274入力とimmutable Gitの一致、通常同期/check・139strict AOT・public barrelをactual0で確認した。[機械判定](ui-library-final-catalog/specialist-independent-review/final-foundation-review/evidence/final-independent-review.json)、[558 artifactsの元SHA](ui-library-final-catalog/specialist-independent-review/final-foundation-review/evidence/FINAL-DELIVERY-SHA256.json)、[559ファイルの本体採用](ui-library-final-catalog/specialist-independent-review/root-adoption-manifest.json)を保存する。

fresh native32/32、runtime error0。別台帳のmodel40、RichText native貼付け/drop/復旧8、保持中状態のlive辞書4も実成功。件数を合算して一つのsuiteへ読み替えない。Cartesian5種・Gaugeの全11目盛/原値/Intl表示、実針pointerとnative table keyboard、worker初期数式5と依存更新、入力・focus・raw app textを観測した。歴史native78を最終sourceで再実行したという主張はしない。

axeは16scopeでviolations0、12report・206nodeのcolor-contrast incompleteを保存する。SVG196nodeは自動背景判定不能のまま。CodeMirror10nodeには局所scroll後の30実glyphの別測定（14.645:1）があるが、自動incompleteをPASSへ書き換えない。元SVG fontBBox交差44組は実glyph inkと区別する。

追加strict paint対照はguided 71/8893・dense 55/6766 solid pixelにRGB差が残りactual1。全Arabic図の画像レビューでは名称・値・全目盛の可視消失を観測していないが、差分の原因/製品帰属は未判定。全pixel非被覆の保証には使わない。全raw・元失敗・reference変数参照ミスも保持する。Safari、実支援技術、人の画像レビュー、完全SSR/全アクセシビリティ適合はこの判定に含めない。

## 最終候補の生成consumer独立レビュー

[public consumerの報告](ui-library-final-catalog/generated-consumer-review/review-final.md)はa808に対して記載scopeをAPPROVE。[機械判定](ui-library-final-catalog/generated-consumer-review/evidence/final-review.json)と[実終了一覧](ui-library-final-catalog/generated-consumer-review/evidence/final-run-exits.json)、[元採取manifest](ui-library-final-catalog/generated-consumer-review/artifacts/final-consumer-evidence-a808a79d.manifest.json)を保存する。通常CLI4・strict AOT positive・数式worker/clean production bundle・139 compile union・Card2profile4状態・7route・231HTTP資産照合はactual0。negative8は各actual1で期待診断が一致し、コンパイル不能の一般失敗へ読み替えない。

raw入力/資産178とproduct freeze147をmain/private/ownのbyteで照合した。60cdのnative23・Media2×18・Scheduler2×9は、CardだけのCSS差分と他138source/全資産の同一性を[個別継承台帳](ui-library-final-catalog/generated-consumer-review/evidence/evidence-inheritance.json)で確認する。過去のcommit/input/実行日時を最新候補へ書き換えていない。UI_LOCALEのserver DI/global trapは限定adapter試験であり完全SSRではない。consumer作成者自身の利用ガイドは、このconsumer承認と別の全体レビューで確認する。

32.67MBの[元pack](ui-library-final-catalog/generated-consumer-review/artifacts/final-consumer-evidence-a808a79d.tar.gz)はSHA256 `33444eac7df45cd49044c25ba1a5f5dcc5ef14f4f7427b0085771d455fc9aba6`。1485全entryのbyte/個別SHAを検証し、本体へ239の読取用ファイルと元archive/manifestを採用した。[採用台帳](ui-library-final-catalog/generated-consumer-review/root-adoption-manifest.json)と[各fileの元SHA](ui-library-final-catalog/generated-consumer-review/evidence/pack-file-inventory.json)に対応する。配布bundle/生成物/source snapshotの重複は元archive内に保持する。

## 本体全検査と残る試験手順の確認

a808の全npmは2026-10-06 09:33:27 UTCにactual exit1で終了した。設定70・generation15・model183はactual0、UIは980登録中973 PASS /7 FAIL /0 skip /0 retry。457入力のsourceChanged=[]、HEAD不変。[実行台帳](ui-library-final-catalog/third-full-npm-a808a79d-failed/execution.json)、[原結果の全採取](ui-library-final-catalog/third-full-npm-a808a79d-failed/capture-manifest.json)には元log・7失敗のtrace/context/画像と実axe JSON/CSV/画像を保存する。

Scheduler4 FAILは合法なhyphen IDのDOM符号化後も旧ID `schedule-start-gap-cross` を取得していた2つの手順。実textboxはlabelで存在し、[独立した修正審査](ui-library-final-catalog/scheduler-two-selectors-independent-review.json)を経て、当該2selectorのみ `crossing.getByLabel('開始の現地日時',{exact:true})` に変更した。全入力保持/DST/失敗復旧/モデルのassertionを保持し、製品sourceは0変更。テストのみのcommitは `0190b2b445739ee24d0edd219ade4fc544ffa48c`。[root採用](ui-library-final-catalog/scheduler-selector-root-adoption.json)、[139製品の独立継承確認](ui-library-final-catalog/0190-source-inheritance-prep.json)と[207control対応のformalSHA更新](ui-library-final-catalog/requirements-48-controls-0190.json)を保存する。

0190の選択12回帰はactual exit1、10 PASS /2 FAIL /0 skip /0 retry。Scheduler4/4とInlineEdit6/6はactual成功。元InlineEdit2 FAILはブラウザー途中終了を伴い、その原因は未確定。fresh成功へ元失敗を書き換えない。FileExplorerの2 FAILは無効行を再有効化するAngular描画前に `focus()` を呼んだtraceを独立確認中。[元replay台帳/JSON](ui-library-final-catalog/failure-replay-0190b2b/capture-manifest.json)を保持し、有効/focus済みの実preconditionから同じ除去復帰・外側focus非奪取を検査する。全体PASSと181完了はまだ未判定。

[全体のソース独立レビュー](ui-library-final-catalog/integration-independent-review/REVIEW.ja.md)はa808の139製品・原文181一致・追加48/207control対応・限定nativeをapprove。利用ガイドの全文も作者と別のレビュアーが確認した。[固定pack](ui-library-final-catalog/integration-independent-review/PACK-MANIFEST.json)は114ファイル、[本体採用](ui-library-final-catalog/integration-independent-review/root-adoption-manifest.json)は元manifest込み115ファイル・SHA差0。全npm/更新後の最終matrix/docs採否は、このソース承認と区別する。

FileExplorerは[独立追検証](ui-library-final-catalog/file-focus-followup/FILE-FOCUS-FOLLOWUP.ja.md)で試験preconditionの競合と確定。元3traceでは `csv.focus()` がdisabled行に解決され、実focusは外部checkboxにあった。実change境界を観測したnative4/4では、無効中のfocus no-opと外部focus保持、有効/focus済みのCSV除去→host復帰を両profileで確認。元手順2/2成功も別に保存し、rootの失敗へ置換していない。guard付き周辺12/12 actual0。[元62 artifacts](ui-library-final-catalog/file-focus-followup/FOLLOWUP-DELIVERY-SHA256.json)と[63ファイルの本体採用](ui-library-final-catalog/file-focus-followup/root-adoption-manifest.json)を保存する。製品のfocus guardは変更しない。

このガードは別レビュアーによる[exact差分審査](ui-library-final-catalog/file-focus-guard-independent-review.json)を経て、specにnative enabled/focusedの2assertだけを追加し、全既存除去/復帰/root tabindex/外側focus/draft検査を保持した。製品0変更でcommit `53a785824b86a34ada3ee8619f710fad57117634`へ固定した。[root採用](ui-library-final-catalog/file-focus-guard-root-adoption.json)、[274入力freeze](ui-library-final-catalog/root-final-source-freeze-53a7858.json)（SHA256 `d67a76d3ab7746c1f09152576b110a92285b1a90d66bc86f584aefff59bddbd6`）を対応付ける。

53a7858の本体選択再検証はScheduler4＋Inline6＋FileExplorer2の12/12、actual exit0・skip0・retry0・sourceChanged=[]。[元JSONと台帳](ui-library-final-catalog/final-failure-replay-53a7858/capture-manifest.json)を保存する。起動時に一度expected SHA引数の誤記をガードが拒否した[preflight actual1](ui-library-final-catalog/final-replay-head-guard-rejection.json)も保存し、未実行0ケースを試験成功へ数えない。実HEADで再起動した12件だけが上記実証である。

2026-10-06 09:51:04–10:18:07 UTC、53a7858のplain `npm test`を全457入力固定・port5187・2workers・retries0で実行し、actual exit1、UI977 PASS /3 FAIL /0 skip、sourceChanged=[]、HEAD不変を記録した。[実終了台帳](ui-library-final-catalog/fourth-full-npm-53a7858-failed/execution.json)と[元94 artifactsのSHA](ui-library-final-catalog/fourth-full-npm-53a7858-failed/capture-manifest.json)を保存する。全体実終了と最終matrix/doc独立照合を待って全181の完了を判定する。

Masonryはnative handlerの要求2に対してdirect検査が旧3/4列を読み、10.3/11.4ms後に同じDOMが2列へ更新されることを、公開生成consumerのguided/dense8反復・16/16 actual0で確認した。[独立審査](ui-library-final-catalog/masonry-render-followup/REVIEW.ja.md)と[元34 artifacts](ui-library-final-catalog/masonry-render-followup/PACK-MANIFEST.json)、[正式への採用](ui-library-final-catalog/masonry-render-root-adoption.json)を保存する。列数2の期待値を保持して1箇所をexpect.pollへ変え、逆置換で全原bytes一致、不均等高さ・間隔・320px breakpoint・overflowの全assertionを保持。製品変更0で、root正式再測定は後続に記録する。

## 正式試験への参照訂正

207controlマップのfoundation-07/08に、独立fixtureの旧名 `tests/ui/date-format-draft.spec.ts` が正式参照として残るmetadata誤り2件を確認した。正本は `tests/ui/foundation-date-format-retention.spec.ts`、SHA256 `5af3c6c61f2b7ab8f6613a3758db96662130a6e974ed0c8bde9c1c6d61cd4aa3`。[訂正追記](ui-library-final-catalog/canonical-map-correction/CANONICAL-MAP-ADDENDUM.ja.md)と[新版マップ](ui-library-final-catalog/canonical-map-correction/evidence/requirements-48-controls-53a7858-canonical.json)、[全209参照・88ファイルのGit/live照合](ui-library-final-catalog/canonical-map-correction/evidence/53a7858-canonical-map-reference-audit.json)を保存する。旧114packと旧mapsはimmutable保持し、訂正8artifactsと元manifestの9ファイルを同一SHAで採用した。製品・正式試験の変更は0。対応表の正式参照と翻訳済み公開契約を訂正し、行別statusは全体実終了まで保持する。

## 描画前提とブラウザー終了の追加実証

Lightboxは原traceのキー入力時に400%・270度・scrollLeft348の旧DOMが残り、期待確認の開始後に100%・0度へ更新されていた。横overflow中はnative panへ返す製品契約に沿い、画像移動の前提が未成立だった。[追加媒体報告](ui-library-final-catalog/lightbox-render-followup/lightbox-followup-review.ja.md)と[別criticの独立復号/差分審査](ui-library-final-catalog/lightbox-second-review/REVIEW.ja.md)はreset後の実横overflow解除を待つ1行のみをapprove。全元geometry/axe/青い画像/Escape/外側focusのassertionを保持し、逆変換で全旧bytes一致。[正式への採用](ui-library-final-catalog/lightbox-render-root-adoption.json)を保存する。

独立媒体担当の正式spec反復4/4はown public consumer上の実行で、root fixture全体のbyteexact cloneとは主張しない。追加32samplesは元手順16＋guard16、元の競合は再現未達で、7.484msの原traceと分ける。全UI specの追加strict tscはbefore24/after24の既存generic型診断、actual exit2・正規化差分0。新guard単体strict/構文はactual0だがwhole-spec strict成功へ読み替えない。標準の製品strict Templates/AOTは別のactual0である。

[元93entry archive](ui-library-final-catalog/lightbox-render-followup/lightbox-followup-evidence.tar.gz)はSHA256 `7ebf3804841e9f906d3e1bf980cb41d7f1880650f75269ee407e758fb5cc9079`、29,098,433bytes。[元manifest](ui-library-final-catalog/lightbox-render-followup/evidence-manifest.json)の92artifacts＋自身の93全entryをSHA照合し、[本体採用](ui-library-final-catalog/lightbox-render-followup/root-adoption-manifest.json)で76の読取/元archiveファイルを保管。画像/trace ZIPの重複はこの検証済archive内に保持する。別criticの22 artifacts＋元manifestも同一SHAで保存した。

Treeの元最後のFAILはbeforeEach goto中の約1.54秒でbrowser/contextが終了し、試験本文0step。前4ケースは成功し、その後のcontext teardownもclosedとなった。開始点のbrowser traceがなく起点は未確定。[独立追試](ui-library-final-catalog/tree-narrow-followup/FOLLOWUP-REVIEW.ja.md)はcurrent139 sourceの通常生成/check/strict AOT/build後、同じ正式specを無変更でguided/dense2/2、actual0・worker1・retry0と確認した。元のFAILを置換しない。axe6 scansはviolations0、incomplete ARIA18/color-contrast24nodesをそのまま保存し、全アクセシビリティPASSとしない。[元46 outputsとmanifestの採用](ui-library-final-catalog/tree-narrow-followup/root-adoption-manifest.json)はSHA差0。

tests-only commit8e8748aをPR11へpushし、root選択5は10:30:20–10:31:12 UTC、actual5/5・exit0・skip/retry/flaky0・sourceChanged=[]。[正本replayのJSON/9 artifacts](ui-library-final-catalog/failure-replay-8e8748a/capture-manifest.json)を保存し、独立consumer4反復と区別する。[新274入力freeze](ui-library-final-catalog/root-final-source-freeze-8e8748a.json)はSHA256 `30717c847e505993c1ccb9fcaecddf65765b2fe856b9ca5a44b982f417753066`、139製品不変。10:32:02 UTCから457入力を前後監視し、port5187・2workers・retries0でplain npm testを実行し、10:57:36 UTCに全980実操作PASS・actual0を記録した。matrix/docs最終独立採否はこの実操作の成功とは別に記録する。

[8eの独立準備監査](ui-library-final-catalog/canonical-prep-8e8748a/ADDENDUM.ja.md)と[新版48/207controlマップ](ui-library-final-catalog/canonical-prep-8e8748a/requirements-48-controls-8e8748a-canonical.json)（SHA256 `661022561b31de5872710a7714b5930a7d2ec738f4ca41c05b1b15c380f35720`）を保存する。前版からmedia-04/06/07/10の正式4参照SHAだけを更新し、115実装＋94正式参照、unique88をGit/liveで一致確認した。原文181の保護フィールドと274freeze、元94失敗capture、root選択5の成功を別のscopeで照合してactual0。旧packを変更せず、[18 artifacts＋元manifestの採用](ui-library-final-catalog/canonical-prep-8e8748a/root-adoption-manifest.json)を記録した。fullと最終matrix/docsの承認はこの準備監査に含まれない。
