# 配置・コンテナの段階検証

2026-10-05、branch `feat/ui-library-expansion`。この段階は44e0876からの配置差分。全181要求行は56行verified、16行partial、109行pendingとなる。全依頼の残件は[要求マトリクス](../ui-library-matrix.json)に保持する。

## 実装と検証

PageFrame/AppShellの各領域と固定、Container、Stack、幅別Gridとセル結合、Panel/Fieldset、単一・複数Accordion、比率Splitter、Divider/Spacer、実ScrollArea、native StickyRegion、AspectRatio、ResponsiveVisibilityを追加した。投影した入力は開閉・無効・幅変更で保持し、非表示になる領域のfocusを可視の操作へ移す。設定の正本に`size.sidebar`を追加し、生成物・必要role一覧・Skillへ同期した。

`npm test`はui:check、TypeScript/Angular strictTemplates、設定60・生成15・モデル22・ブラウザー218の全315件が合格した。同期後のdry-runは変更なし、checkは一致を確認した。Mac/Node24.19/Angular22.2.1/Chromium、2 workerで実行した。

- モデルは列/行/幅別配置と分割比率の不正値を検査する。操作34件は両profileのslots、fixed、Grid、Panel、nested Accordion、keyboard/pointer/touchのSplitter、Scroll/Sticky、実media寸法、幅変更のfocusを確認した。
- Separate consumerは異なる出力先へ生成し、idempotency/check、strictTemplates/AOT、間違ったtyped rowの失敗を検査する。生成物だけからproduction modeで起動し、両profile・320px・200%でPanel/Accordion/Splitterの入力保持、Grid、実Scroll、iframeの寸法とoverflowを観測した。fixtureのTailwind preflightに依存しないiframe境界も確認した。
- 全体試験で既存CalendarのArrowRight直後のEnterが古い日を確定する問題を再現した。描画待ちの論理移動先を次のキーの基点にし、移動先が描画済みなら同期focusする。月をまたぐ連続キーの回帰ケースを両profileへ追加した。
- 自動axeは両profileの配置画面で実行する。320px、文字200%、RTL、reduced motionでページ全体の横scrollなし。画面描画時のbrowser error/warningは0件。

## 独立レビューと描画

fresh-context reviewerの配置判定はapprove、未解決P0/P1/P2はない。Calendarの追加差分も別のfresh-context reviewerが両profileの即Enter/Space、連打、無効日/上限越え、月境界、pending中のcloseと再openを独立確認しapprove。browser error/warningは0件。固定headerがsidebarを覆う、AspectRatioのcontainで画像が切れる、外部collapseが古い比率へ戻る、Panelの無効化でfocusがBODYへ落ちる、drag中の方向変更が旧軸を使う、0/100比率のゼロ領域へfocusが入る問題を再現して修正した。

固定領域はheader/footerと最寄りのnative scroll領域を測り、80pxの短いscroll領域では通常配置に戻す。独立したhit testは両profile・100/200%でsidebar操作が覆われないことを確認した。画像は標準/縦長/横長×contain/cover/fill×両profileの18条件でhost/media256×128、overflow0。ドラッグは両profile×方向/RTL/resizableの変更6条件でcaptureを解除し、その後の移動で比率が変わらないことを確認した。

描画は[固定領域 guided](images/layout-shell-guided-1280-200.png)／[dense](images/layout-shell-dense-1280-200.png)、[分割領域 guided](images/layout-splitter-guided-320-200.png)／[dense](images/layout-splitter-dense-320-200.png)、[画像の収め方 guided](images/layout-aspect-guided-320-200.png)／[dense](images/layout-aspect-dense-320-200.png)。狭い分割領域は内側のscrollと折畳み操作を使う。

参照: [APG Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/)、[APG Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)、[CSS positionのsticky](https://drafts.csswg.org/css-position-3/#sticky-pos)。APG Splitterの例/task force検討が未完了である点と、今回のseparator contract・実操作の確認を区別する。

実OSのtouch、実screen reader、Firefox/Safari、SSR/hydration、人の意味レビューは未評価。Playwrightのtouchはブラウザーでのtap経路の検証である。専門部品の候補調査を実装済みに数えない。操作/状態/表示、フォームの残機能、ナビ、一覧/ツリー、表の残機能、ファイル/メディア、専門部品、drag/drop/virtualization/localeを継続する。PRはDraft、Issueはopen。
