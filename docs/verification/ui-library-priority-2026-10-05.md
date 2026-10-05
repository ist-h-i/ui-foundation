# 共通UIライブラリ・優先カテゴリの検証

基準mainは618ce052006ee64d3cdba59c667430a78a8a2f9c、branchはfeat/ui-library-expansion。依頼181行を[要求マトリクス](../ui-library-matrix.json)で保持する。この記録はDataTable/Pagination、基本入力/選択、Calendar/日付、GridList、Iconの段階検証であり、全カテゴリの完了ではない。

## 実行結果

2026-10-05、MacのChromium、Node24.19、Angular22.2.1で実行した。

- `npm test`: ui:check、TypeScript/Angular strictTemplates、設定60、生成15、純粋モデル13、ブラウザ140の全228件が合格。ブラウザ試験はguided/denseの両方。`build`はAOT→Angular linker→bundle→Tailwindを実行する。
- 最後のDateRange内部FormControlの無効化方法とDatePicker書式切替の描画時期の修正後、`ui:sync`/`ui:check`、生成15件、日付16件を再実行して合格。後者はブラウザのerror/warningも失敗として検出する。
- 生成15件のうち新規consumer試験は、別の一時ディレクトリ・異なるoutputへ生成し、Reactive Formsと型付きTable/Grid/dayテンプレートをAOT/strictTemplatesでコンパイル。存在しない行プロパティを使ったテンプレートは実際にコンパイルが失敗することも確認。consumerのブラウザ操作はまだ独立した利用アプリでは行っていない。
- 表の幅は実測、min/max、内容/表示領域、自動OFF、single/multi sort、型別filter、対象列検索、ページ、非表示/順序/左右固定/幅/初期化、選択可能範囲、保持と復元、詳細の入力保持、server処理の非再加工を観測した。
- フォームはCVAのwriteValue/onChange/touched、disabled/enable/reset、離脱時更新、未確定Comboboxのinvalid、削除/disabledになった選択値の修復、query/requestIdによる古い候補の排除を観測した。IMEは合成composition/keydownによるガード試験であり、OSの日本語IMEで実測したとは扱わない。
- 検索timerはPlaywright clockで待ち時間前後、IME中/確定後、即時Enter、連打・重複抑止を観測した。通知timerの検証ではない。
- civil日付はDSTのあるAmerica/Los_Angelesのブラウザでも日付を保持。日付書式、disabled日、rangeの順序/長さ/内部disabled日、nativeの部分入力、preset/clear/reset、日時min起点step、月/年の境界、modal focus/閉じ戻るを観測した。Instant変換とDSTの曖昧さの解決はアプリの責任。
- 狭幅320px、文字200%、RTL、keyboard/focus、axeを各profileで検証。カレンダーはページの横はみ出し検査だけでは数字の折返しを見逃したため、実テキストrectと日付一覧内のscroll/focusを追加した。

## 独立レビュー

実装担当とは別のfresh-context reviewerがソースと実ブラウザを確認した。

- 表: 最小/最大幅、空のOR比較、非有限数の欠損扱い、ページ補正を修正後にapprove。8つの幅条件を実測して確認した。
- 入力: 候補編集時の古い確定値、同値reset、削除/disabled値の修復、updateOn blur、IME Enterを修正後にapprove with comments。追加の候補requestIdと親form validityも操作試験へ加えた。
- 日付/Grid/Icon: native stepとAngular validatorの不一致、期間draftの親への伝播漏れ、200%時の数字の分割を再現して修正。両profileで修復を再確認。書式切替時の残留エラーと内部Forms/型変更前のDOM書込み警告も修正し、最後の16件でerror/warningなしを確認。

描画は両profileの狭幅/200%を画像で確認した。[guided](images/calendar-guided-320-200.png)／[dense](images/calendar-dense-320-200.png)は修正後のRTLカレンダー。人による利用者理解の検証、OSの実IME、Safari/Firefox、SSR/hydration、独立consumerのブラウザ、全181行の検証は未実施。カタログ数・axe・コンパイル成功を全UI品質の保証としない。

## 依存と残件

@angular/forms22.2.1と@lucide/angular1.52.0をexact版/lockfileへ追加。LucideはISC、Angular>=17のpeerを持つ。新しい有償サービスやアカウントは使用しない。12の標準アイコンと必要な追加を単一provideUiIconsで登録する。

Card/Menu/Dialog拡張/Snackbar・通知host、Overlay/drag/resize/virtualization、未実装の入力/ナビゲーション/一覧/メディア/専門部品は残っている。表の複数条件編集、多段header、固定行/集計、行編集/グループ、追加取得/仮想化、CSV等もマトリクスで継続する。既存のoutput移動時Skill所有権の問題は今回の同期を妨げず、この段階で修正していない。Issueはopen、PRはDraftのまま維持する。
