# 通知一覧・状態表示・案内の段階検証

2026-10-05、branch `feat/ui-library-expansion`。コードHEADは`ab2eaca5cd12dc5bb9cd819ae6c177215b7d5094`、第4段階の基点は`3d01916`。この段階で11行を追加して全181要求は77行verified、16行partial、88行pendingとなる。全依頼の完了ではない。

## 実装と実証

通知一覧の未読/既読/分類/削除/追加取得、Alert/Banner/InlineMessage、ActionFeedback/AsyncRegionの復旧と取得状態、Empty/Result、native ProgressBar、遅延Spinner、Skeleton、領域だけのLoadingOverlay、実HTMLElementを対象にした非modal Tour/Coachmarkを追加した。設定・意味トークン・テンプレート・生成Skill・別生成consumerへ接続する。HTTP、既読/削除の永続化、実処理の取消、案内の業務完了は利用アプリが所有し、UIの要求を成功へ先取りしない。

状態表示の38操作ケースは両profileで取得済み。値/説明/入力保持、処理中のnative disabledと手動dispatch抑止、表示の切替とfocus、通知のfilter/追加取得失敗/再試行、案内の次/戻る/再開/表示済み/対象喪失/外部終了を確認する。Spinnerはブラウザーclockで表示遅延前の取消・後の表示を観測し、Progressはvalueを外した不定とtotal境界、Skeletonは円の72px/狭い親40pxで縦横比を観測する。

LoadingOverlayは対象DOMだけをinertにし、別領域の操作を保つ。対象内focusからの抑止と外部ボタンからの抑止、解除後の入力または指定起点への復帰を実操作する。320px/200%の小さい96px領域でも説明の先頭からscrollでき、取消へkeyboardで到達する。

通知一覧は行が消えたときに可視操作へfocusを移し、追加取得中は説明へfocusを残す。選択中の分類が0件になってもoptionを保持し、nativeの選択表示と内部条件を一致させる。Tourは外部open=falseでもowned focusを起点へ戻し、対象側へ移ったfocusは奪わない。CSS不可視とnative modal移行を共通Overlayで検出し、背景の案内を終了する。

最終全体検査: `npm test`は設定60・生成15・モデル24・ブラウザー292の全391件が合格した。ui:check、TypeScript/strictTemplates、AOT build、別出力`foundation`のconsumerをproduction modeで起動した実操作と誤row propertyのcompile拒否を含む。途中にsource/testを変更しない固定HEADで終了結果を確認した。

過去の全体runは291 UI合格/1失敗だった。検査中の試験手順変更でguided workerに旧手順が残っており、traceには再開時のvisible/初期focus確認がなかった。失敗は外部終了前の対象focus確認である。固定HEADで対象のguided/dense 2件を再実行し、両方合格した。失敗runを一括合格の証拠として扱わない。

## 独立レビューと描画

fresh-contextの状態表示レビューとPR全体レビューを実施した。Tourの外部終了、対象不可視/native modal scope、通知分類の消失を修正後に両profileで独立再確認。PR全体で見つかったIcon/Toggle/Segmentedの未定義選択背景は検査済みcolor.surfaceへ接続し、実computed背景で非透過と一致を確認した。

独立操作ではnative modal内LoadingOverlay、既存3階層Menu/親focus/trigger、modal内Menuからの終了、Snackbar action理由、partialの入力/profile切替を確認した。320px/200%/RTL/reduced motionでOverlay/Tourのaxe違反0、ページ横overflow0、ページ例外0。TourのRTL段階数はbdiで視覚上も1/2順に保つ。

描画は[不定進捗 guided](images/feedback-progress-guided-1280.png)／[dense](images/feedback-progress-dense-1280.png)、[通知取得失敗と再試行 guided](images/feedback-center-error-guided-320-200.png)／[dense](images/feedback-center-error-dense-320-200.png)、[領域抑止 guided](images/feedback-loading-guided-320-200.png)／[dense](images/feedback-loading-dense-320-200.png)、[案内 guided](images/feedback-tour-guided-320-200.png)／[dense](images/feedback-tour-dense-320-200.png)。長い通知一覧は実viewportをscrollして失敗説明と復旧操作の部分を撮影した。全一覧が1画面に収まる証拠ではない。画像を実読し、両profileのruntime error/warningは0、ページ横overflowなしを取得した。

未解消のP2は次PRで先頭に修正する。Alertのfocused自前操作をclosable=false/actionLabel=''で除去するとbodyへfocusが落ちるケース（両profile独立再現）、Calendarのtoday/DateRange初期月のUTC既定境界（ソースレビュー）である。PR全体と状態表示の評価はapprove with comments。最終証拠コミットも読み取り照合する。既知のoutput移動時Skill所有情報も継続残件であり、今回の同じ出力先での同期を妨げていない。

GitHub Actionsの設定と当該commitのworkflow/status結果はない。CI合格とは報告しない。ローカル検査と独立レビューをマージ判断の証拠とする。実screen reader、Safari/Firefox、SSR/hydration、OS touch、人の業務レビュー、bundleサイズ/性能は未評価。

参考: [APG Alert](https://www.w3.org/WAI/ARIA/apg/patterns/alert/)、[HTML progress](https://html.spec.whatwg.org/multipage/form-elements.html#the-progress-element)、[native modalと背景のinert](https://html.spec.whatwg.org/multipage/interaction.html#modal-dialogs-and-inert-subtrees)。
