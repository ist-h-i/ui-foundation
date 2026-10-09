# UI 部品の変更を PR にまとめるための検証

対象は `feat/component-ui-ux-review` の作業中の変更。基点は `eeae8a9952489dc406fb70a478e25974ca695017`。生成テンプレート、生成 Skill、fixture、回帰試験、API 文書を対象にしている。旧候補の画像・比較一覧・診断記録は元のローカル保存先に保持し、この PR の最終候補の検証には代用しない。

## 変更内容

- セレクトの文字・矢印・端の余白、フォームと Card の空間、表の列条件と常設の編集操作を整理。
- Calendar、Kanban、Diagram、Gantt、Spreadsheet の狭幅・文字拡大・方向切替・移動先表示を改善。
- Dialog、ConfirmPopover、CommandPalette、条件保存、Chat、MediaPlayer の処理中・失敗・再試行の focus と入力保持を改善。
- 生成元と Skill を変更して canonical sync。生成先の直接編集はしていない。

## 独立コードレビューによる修正

[初期レビュー](independent-code-review-initial.md) は request changes。明るい主操作背景を使う正当な設定で、透明背景の編集文字と選択した接続線が白くなって消える P1 を2件検出した。

表の文字、並べ替え hover、接続線・矢印の foreground を `color.text` に変更した。文字色と背景色の役割を分け、選択した接続の太さも保持する。設定解析・解決・token 生成を使った実ブラウザーの回帰試験を追加した。

- 表の修正前: 両 profile で失敗。文字と背景は 1:1。[元結果](bright-actions-red.json)。
- 表の修正後／Diagram の修正前: 2合格／2失敗。[元結果](bright-actions-and-diagram-before-fix.json)。
- 両方の修正後: 4合格、skip・flaky・retry 0。[結果](bright-actions-green.json)。通常・hover・focus、native Enter による編集と取消、選択した接続線と矢印を確認。

## 現候補の検証状況

`npm run ui:sync` / `npm run ui:check` / `git diff --check` は成功。専用 lint script は package.json にないため、生成一致・空白検査・tools/Angular/media/UI runtime の型検査を区別して記録する。

修正前に開始した aggregate は、初期レビューの修正を適用するため途中で停止した。成功とも製品テスト失敗とも数えない。[中断理由](aggregate-interruption.json) と [実行記録](interrupted-execution.json) を保持する。

修正後の `npm test` と `npm run test:verification` を実行中。最終結果をこの記録へ追記する。独立 UI レビューは、[source / runtime manifest](ui-review-candidate.json) に固定した active source 480件・runtime309件と専用 localhost server を対象に実施中。完了後、正確な PR head の差分を別担当が再確認する。

## 範囲

自動テスト、axe、実操作、意味・視覚レビューを別の証拠として扱う。文字200%は root font の拡大であり、browser zoom ではない。Chromium と fixture が検証対象。Firefox/WebKit、実機・実スクリーンリーダー、実業務 backend の保存・送信・Undo は確認済みとしない。

GitHub の open PR は0件、main は上記の基点と一致、Actions workflow は0件だった。必要なチェックは最終 PR head で再確認する。空の combined pending は CI 待ちと扱わない。
