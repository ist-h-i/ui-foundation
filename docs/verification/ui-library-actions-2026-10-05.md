# 操作部品の段階検証

2026-10-05、branch `feat/ui-library-expansion`、基点は配置段階のd489add。この段階では操作の10要求行を追加し、全181行は66行verified、16行partial、99行pendingとなる。全体の残件は[要求マトリクス](../ui-library-matrix.json)に保持する。

## 実装と実証

ActionControl/ActionLinkのサイズ・幅・icon位置・native submit/reset、IconButtonの説明/形状/選択、連結ButtonGroup、ON/OFF ToggleButton、CVA対応の単一/複数SegmentedControl、主操作と再帰補助Menuを持つSplitButton、固定位置と展開方向を持つFloatingActionButton/SpeedDial、実幅の測定で退避するToolbar、実Clipboard APIを使うCopyButtonを実装した。元のIconは第1段階の証拠を維持する。

`npm test`はui:check、TypeScript/Angular strictTemplates、設定60・生成15・モデル22・ブラウザー252の全349件が合格した。生成後consumerを別出力先からproduction modeで起動し、両profile・320px・文字200%で選択、補助操作、狭幅Toolbar、既定DI writerの実Clipboard書込みと自身が書いた値の読取り、固定操作を確認した。同期のdry-runは変更なし、checkは一致。

- 操作画面の32件は両profileでnativeキー、busy/disabledの手動dispatch抑止、外部Linkのrel、共通サイズと連結border、CVAのrequired/touched/disable、縦/横/RTL、Menu選択、narrow/200%/axeを確認する。
- CopyButtonはpromiseの成功だけを成功表示にし、拒否は下書きを保持して再試行できる。保留中の連打、破棄後の結果/通知抑止、正の表示秒数、2秒期限を観測した。fixtureの拒否/保留adapterは失敗経路の試験用であり、実コピー成功の証拠はnative経路と既定consumerの書込みで得た。
- コピー期限は完了時刻を基準に確認する。ブラウザーclockを止めた試験ではAngularの描画用frameも止まるため、期限前後のDOM更新に20msの描画frameを進める。timer境界とDOM反映を区別する。
- Toolbarは主領域と計測領域を分け、収まる操作とMoreを算出する。狭幅化、Moreから通常表示への復帰、別Toolbarをfocusしたままの幅/profile/項目更新、全ID差替え、選択肢削除を確認した。旧フォーム値を削除せず、選択肢に存在しなければinvalidにする。
- 全体検査で既存Menuの起動直後ArrowDown→RTLの開く矢印が描画待ち中に失われる問題を再現した。rootを同期focusし、未描画の子へは論理階層を保持する。即Arrowを2階層続けたEnterと連続Escapeを両profileへ追加した。

## 独立レビューと描画

fresh-context reviewerはapprove、未解決の必須指摘はない。Toolbarの外部focus奪取と全項目差替え時のfocus喪失を再現した後、実2 Toolbarと通常Angular描画で修正を独立再確認した。SegmentedControlの動的focus、guided/dense×LTR/RTLの待機を挟まない3階層Menu選択とtrigger復帰も確認した。

独立ブラウザーはnative Clipboard書込みに成功し、その同じnative経路のwriteTextをNotAllowedErrorで拒否させて失敗表示/再試行を確認した。320px・文字200%・RTL・reduced motion・SpeedDial展開状態の横overflowなし、axe違反なし、runtime error/warningなし。レビュアーは全体試験/AOTを再実行せず、最終結果は主担当の全349件で確認した。

描画は[Toolbar guided](images/actions-toolbar-guided-1280.png)／[dense](images/actions-toolbar-dense-1280.png)、[縦連結 guided](images/actions-group-guided-320-200.png)／[dense](images/actions-group-dense-320-200.png)、[狭幅の退避 guided](images/actions-overflow-guided-320-200.png)／[dense](images/actions-overflow-dense-320-200.png)、[コピー拒否 guided](images/actions-copy-error-guided-320-200.png)／[dense](images/actions-copy-error-dense-320-200.png)。popupは横と縦の画面内を確認してから撮影し、長い本文は折返しと内部scrollを使う。描画時のerror/warningは0、ページ全体の横overflowはない。

参考: [APG Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/)、[APG Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)、[APG Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)、[Clipboard API writeText](https://w3c.github.io/clipboard-apis/#dom-clipboard-writetext)。コピーはsecure contextと利用環境の許可に従い、外部の既存Clipboard内容を取得しない。

再開時の環境はNode24.19.0/npm11.17.0/Angular22.2.1/Playwright1.63.0、macOS26.6.2 arm64。接続復帰後にrepo/branch/状態を確認し、このrepoの検査を新たに実行した。ASKの実測証拠や権限状態は使用していない。

実screen reader、Safari/Firefox、OS touch、SSR/hydration、人の業務レビュー、bundleサイズ/性能は未評価。状態/表示、フォームの残機能、ナビ/ツリー/一覧、表の残機能、メディア、専門部品、drag/drop/virtualization/localeを継続する。PRはDraft、Issueはopen。
