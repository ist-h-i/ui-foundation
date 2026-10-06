# 最終統合ソースの独立レビュー

`a808a79dc5f17c1b87280c2881147c8ab5357a9f` のソースレビューを **APPROVE** と判定します。139製品ソースと固定274ファイルを Git の内容・共有作業コピー・自己所有の独立コピーで照合し、差はありません。固定manifestのSHAは `82388e8eea2aae64a422cf86a168c08d5a9b798bd290b8d70776309e80b49b9a`。未解決のソースP1/P2はありません。

これは全181要求の完了、全npm試験成功、最終マトリクスの証明、PRのマージを先取りする判定ではありません。親作業の同一候補の全npm実終了後、最終文書と証拠の照合を別に行います。旧raw Table12の承認も別の判定です。

## 要求と既存部品への影響

- 原文の172表行と共通基盤9項目、計181行は、部品名・制御項目・原文行が一致しました。重複・脱落は0。追加48行の207制御を原文順に公開props/methodsと実装・正式試験ソースへ対応付け、参照欠落は0でした。名称だけの部品、静的カタログだけの完成、汎用stubは観測していません。マッピングは実試験終了の代用品ではありません。
- Foundation前136ソースとの限定AST比較は、既存処理1,184件のうち1,015件が完全同一、34件が所有文言読み取りだけの差、135件が残差、削除0、追加28でした。残差には文言state、日時書式/方向、native入力・キーボード、表ID/own-recordと既知修正を含めて個別に読みました。自動比較を全ソースのポリシー逸脱検査や全挙動の保証とは扱っていません。
- 保持文言の24ソース・104 writerは、条件分岐・ライブラリkey・書込時に捕捉する値を独立IRで比較し、差0。最終a808でも104 writerの継続一致を確認しました。rawアプリ文言、業務キー、Validator/pureモデルの診断を勝手に翻訳せず、表示境界だけでライブラリ文言を更新する契約です。
- YAMLの二段階semantic/profile、設定正本、public CDK Directionality、nullable/CVA/reset、生成所有範囲、成熟engineの実利用・配布資産・原NOTICEを読みました。API inventoryの139ファイルSHAも現ソースと一致しています。

## 実操作と修正の再検証

正常CLI sync/check、公開barrelだけを入口にしたstrict/full AOTとfresh bundleはactual exit0。過去の方向型/Tree typed-context negativeは期待する型エラーでactual1でした。実Chrome154で両profileを検証し、以下のraw結果を保持しています。

| 範囲 | 独立の実結果 |
| --- | --- |
| Card/Menu/Dialog/Snackbarとnativeフォーム | 14操作＋実elapsed観測2、16/16。5秒通知は5224.4/5232.8ms。runtime/console0、axe0、AX、狭幅・200%・RTLを確認 |
| Cardの狭幅修正 | CSS一箇所だけ。公開5slotsとcaller max100を維持し9/9。guided track414→238/input left−111→65、dense356→270/−45→41。入力DOM・raw draft・caret・focusをprofile往復で保持。他138ソース不変 |
| mediaの文言/方向 | 30/30。現在辞書へ追随、raw label/alt保持。RTL親の画像比較は画像座標に沿う局所LTR rangeでHome/End/矢印と境界が一致 |
| 実PDF/音声/ファイル/CellEditorの寿命 | 18/18。実PDF worker1・loaded1・canvas保持。辞書変更でHTTP/worker追加0、File/raw ID/request・入力DOM/caret/focus保持。辞書keyと一致するapp失敗本文も原文 |
| Scheduler/Diff/Json | 36/36。3draft writerが旧説明を解除。構造errorの初期訳/保持中のlive訳、invalid raw ISOと既発要求を保持して実修復。辞書だけでI/O/request/認可評価0。raw failMove、Diff native選択/DOM、Json code/offset保持 |

ライブラリ保持文言、Schedulerのstale readerと構造診断、Cardの負方向はみ出しのP2は、修正前の実failureと修正後のsource SHA・native結果を対に残しました。Cardのbefore/after原写真は実際に読み、Document scrollWidthだけではRTL左側の欠落を検出できないことも記録しました。ツール/selector/import/MIME/描画待ち等のharness失敗は製品合格へ混ぜず保存しています。

生成は自己所有のdisposable consumerでdry-run、fresh sync、再sync、一致check、手編集拒否、unmanaged拒否と復旧を実施しました。8終了コードが期待一致、5つのbyte/所有範囲確認が合格、151管理ファイルのidempotencyを確認。最終候補でもgenerator本体は同SHA、正常sync/checkはactual0です。

## 文書・配布と残る条件

利用ガイド全文を読みました。SHAは `3f54fad40b11bcdb42b2bd412858c69efc5204afd2fb6facec9d68aecf2168be`。公開入口とtyped-template例、25 runtime engine、実worker/補助資産/原notice、nullable/CVA、未確定日付書式の保留、app-owned I/O/ACK/Undoと文言の責任が現実装と矛盾する箇所は観測していません。PDF font source kitは45のbyte/SHA対応を確認。FontForge再ビルド・PGP検証・法的完了は主張しません。

読取時のマトリクスは133 verified/37 pending/11 partialで、全体完了はfalseのままです。親作業が最終全npmの実終了と全457入力の不変性を確認し、各専門担当・consumerの最終版証拠を対応させて181行の文書を更新後、その証拠と最終文書commitをread-onlyで照合します。中断候補や未実行は全体PASSへ読み替えません。

全状態の全181部品、実支援技術、人の利用理解、OS IME/touch、Safari、完全SSR/hydration、業務backend、法的判断を網羅的に確認したとはしません。共有Git/生成物/他作者stageは読み取りのみ。各native scriptは自己所有のChrome objectとport0 serverだけを終了し、共有process/PIDへのkillやbrowser接続は使用していません。全own browser/serverは終了しています。

主要証拠は `VERDICT.json`、`evidence/independent-a808-source-exact.json`、`evidence/requirements-48-controls-a808.json`、`evidence/a808-evidence-source-association.json`、`evidence/a808-observed-exits.json`、`evidence/visual-read-ledger.json`。portable packはmanifestに含まれるファイルの実SHAで固定します。
