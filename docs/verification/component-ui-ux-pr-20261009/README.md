# UI 部品の変更と最終検証

作業中だった `feat/component-ui-ux-review` の変更を PR #18 にまとめた。基点は `eeae8a9952489dc406fb70a478e25974ca695017`。生成テンプレート、生成 Skill、fixture、回帰試験、API 文書が対象。旧候補の画像・比較・診断記録は元のローカル保存先に保持し、今回の最終検証には代用していない。

## 変更内容

- セレクトの文字・矢印・端の余白、フォームと Card の空間、表の列条件と常設の編集操作を整理。
- Calendar、Kanban、Diagram、Gantt、Spreadsheet の狭幅・文字拡大・方向切替・移動先表示を改善。
- Dialog、ConfirmPopover、CommandPalette、条件保存、Chat、MediaPlayer の処理中・失敗・再試行の focus と入力保持を改善。
- 生成元と Skill を変更して canonical sync。生成先を直接編集していない。設定・token core・依存関係に変更はない。

## 最終検証

実行した候補は `5c0b545d68cf2b3fdad06aa35b7298e49e9e9221`。`npm test` は 2026-10-10 00:13:44〜01:04:14 UTC、`npm run test:verification` は01:04:15〜01:05:03 UTCに完了し、両方 exit 0。各コマンドで active input 480件、head、追跡差分が実行前後で一致した。

| 検証 | 結果 |
| --- | --- |
| canonical `ui:sync` / `ui:check` | 成功、生成一致・冪等・dry-runもconsumer検証で確認 |
| tools / Angular / media / UI runtime 型検査 | 成功 |
| 設定 | 70 / 70合格 |
| 生成・独立consumer | 23 / 23合格 |
| モデル | 193 / 193合格 |
| UI実操作・axeを含む試験 | 1173 / 1173合格、43.2分、workers 2、skip・flaky・retry 0 |
| SVG実描画 | 永続契約の34 / 34条件合格、生成・production buildを含む6 stepすべてexit 0 |
| 検証・証拠ツール | 58 / 58合格 |

[集計と検査範囲](final-test-summary.json)、[終了値・時刻・log digest](final-execution.json)、[全aggregateログ](final-aggregate.txt)、[検証ツールログ](final-verification-tools.txt)、[active入力manifest](final-source-manifest.json)、[SVG native結果](svg-paint/candidate-paint-native.json)、[SVG終了記録](svg-paint/execution.json) を保持する。`.txt` の2ログは元の `aggregate.log` / `verification-tools.log` とbyte一致し、`final-execution.json` のSHA-256で照合できる。[記録スクリプト](recording-tools/run-verification.py)と[集計の完全性チェック](recording-tools/collect-final-results.py)も保存する。

専用 lint script は package.json にない。生成一致・差分の空白検査・strict型検査は静的な証拠であり、ブラウザー、axe、意味・視覚レビューとは区別する。全ソースのAST逸脱検査を実装したとは主張しない。SVGのaxe incompleteはnative結果に残し、描画検証の合格を完全なアクセシビリティ保証とはしない。

## 独立レビューと修正

[初期コードレビュー](independent-code-review-initial.md) は request changes。明るい主操作背景を使う正当な設定で、透明背景の表編集文字と選択したDiagram接続線が白く消えるP1を2件検出した。表の文字・並べ替えhover・接続線と矢印のforegroundを `color.text` へ変更し、選択の線幅を保持した。

設定解析・解決・token生成を使ったブラウザー回帰で、[表の修正前は2失敗](bright-actions-red.json)、[表修正後／Diagram修正前は2合格・2失敗](bright-actions-and-diagram-before-fix.json)、[両方修正後は4合格](bright-actions-green.json)。通常・hover・focus、native Enter編集と取消、選択線と矢印を確認した。[候補5c0b545の独立コードレビュー](independent-code-review-5c0b545.md) は承認、未解決P0/P1/P2なし。

[独立AI UIレビュー](independent-ui-review.md) は指定範囲で verified。実装担当と別のagentが先に実画面を観察し、独自の測定とnative操作を行った。重要14条件pass、重大指摘0件、範囲外4条件unverifiedを分離した。[機械可読判定](ui-review/review-report.json)、[採取元とハッシュの対応](ui-review-evidence-index.json) を保存する。

- セレクト16条件・224観測で矢印のinline-end余白と文字領域の分離を確認。
- DataGrid16条件とnative DataTable cell/row32条件でidle/hover/focusの列幅変化0px、leaf header/cellの幅差0px。キーボード編集・取消も確認。
- 代表的な処理中・失敗・再試行・取消で入力保持、要求の重複抑止、存続する外部操作のfocus保持を確認。
- 長いnative select文言の閉じた表示でのclipはinformationalな制限。狭幅・文字200%の表は仕様で許すlocal横scrollを実操作で確認した。

代表画像: [guided狭幅・200%・RTL select](ui-review/select-profile-guided-320-200-rtl.png)、[dense select](ui-review/select-profile-dense-320-200-ltr.png)、[表のidle編集](ui-review/native-table-cell-idle-desktop-actual.png)、[表のkeyboard focus](ui-review/native-table-cell-focus-desktop.png)、[編集失敗とdraft](ui-review/table-edit-failure-desktop.png)、[実workerの復旧と外部focus](ui-review/spreadsheet-worker-recovery-desktop.png)。実測の正本は [ui-review](ui-review/) 内のraw JSON17件。

固定実画面レビューは[入力・runtime manifest](ui-review-candidate.json)を使用。[最終コードとの対応](final-artifact-equivalence.json)ではruntime309件の不一致0。固定snapshotとのsource差分はnoEmit import設定と2件の試験同期のみで、製品runtimeはbyte一致する。最終の証拠追加commitは文書のみとし、exact headの独立監査とmerge結果は [PR #18](https://github.com/ist-h-i/ui-foundation/pull/18) の説明へ記録する。

## 途中の失敗・中断を成功扱いしない

- P1を直すため旧aggregateを停止した。[中断理由](aggregate-interruption.json)と[実行記録](interrupted-execution.json)。
- 新しいsource importがnoEmit型検査でTS5097になった。[失敗記録](import-type-failure-execution.json)と[ログ](import-type-failure.txt)。`allowImportingTsExtensions` をnoEmit検査へ追加し、[型検査成功](typecheck-after-import-fix.txt)と[独立承認](independent-code-review-fixed.md)を得た。
- 条件復元の描画前に旧modelをbaselineとして読んだ。[traceと24回の実操作による診断](condition-save-synchronization.md)、[独立レビュー](independent-condition-sync-review.md)、[修正後24件合格](condition-sync-green.json)。固定sleep・既存assertionの弱化は行わない。
- 次のaggregateはUI366合格・1失敗の時点で実行セッションが消失し、806件とSVGは未実行。[中断](diagram-sync-interruption.json)と[保存ログ](diagram-sync-interrupted-aggregate.txt)。Diagramで解除描画前にEnterを送る同期不足を[raw traceと独立レビュー](diagram-removal-synchronization.md)で確認した。各解除後の `toBeEnabled()` 一行を追加し、[対象14件は合格](diagram-synchronization-green.json)。先行試行のサーバー接続失敗14件も記録し、製品試験の合格には数えていない。
- 遅延・停止についての質問には[既存プロセス・ログ・電源イベントだけで診断](execution-status-diagnostic.json)した。稼働中2 worker、継続するログ更新、観測時間帯のSleep/Wake記録0を確認。重複実行・試験基準変更は行わず、その実行が最終aggregateのexit 0まで完了した。

## 確認範囲と制限

自動テスト、axe、native実操作、独立AIの意味・視覚レビューを別の証拠として扱う。人による最終視覚レビューを実施済みとはしない。文字200%はroot fontの拡大でありbrowser全体zoomではない。Chromium系とfixtureが対象。Firefox/WebKit、実機・実スクリーンリーダー、forced-colors、全181部品×全状態、実業務backendの保存・送信・Undoは保証しない。

UI独立レビューでChat/Paletteの応答button自体が無効化されBODYへfocusが移った経路は、存続する外部操作のfocus保持の合格に含めない。valid動画・全画面の成功復旧、native select popup全文可読性も未確認として残す。

GitHub Actions workflowは0件だった。最終PR headのcheck/statusを改めて確認し、空のcombined pendingをCI待ちとして扱わない。既存の未追跡ローカル記録6フォルダーはファイル数・サイズが保存前と一致し、PRには今回のactive sourceと新しい証拠だけを含める。
