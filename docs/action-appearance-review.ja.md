# 操作の強調度と危険性の適用範囲

関連Issueは [#70](https://github.com/ist-h-i/ui-foundation/issues/70) と [#65](https://github.com/ist-h-i/ui-foundation/issues/65) です。参照したDADSの規範は [ボタンの使い方](https://design.digital.go.jp/dads/components/button/usage/) と [ボタンのアクセシビリティ](https://design.digital.go.jp/dads/components/button/accessibility/) です。

強調度には塗り、枠、水平に並べた操作の中でも識別できる下線付きのラベルを使います。危険性は操作名と影響の説明で判断できるようにし、用途に合う色を補助として使います。文字色には検査済みの前景・背景の組み合わせを適用し、文字と背景、境界線と周辺の実際の対比を画面でも確認します。明示したターシャリー操作にもネイティブなフォーカスとクリック領域があります。標準プロファイルの両方で44 CSS px以上になることを確認する試験を含めました。強制配色ではシステム色を適用し、明示した選択状態を二重線でも示します。

画面内の操作の優先度と同時に、操作が属する項目、戻る手段、画面幅・言語による折り返しを考慮します。操作数や左右の順序は画面の利用文脈で決めます。既存の配置とフォーカス順を変えず、独立した操作グループに単一のルールを強制しません。

| 対象 | 採用する契約と適用条件 |
| --- | --- |
| ActionControl、ActionLink | 任意の `emphasis`、`tone` を追加します。旧 `ActionVariant` の3値、既定値、`data-variant`、描画・操作は互換契約です。片軸のみ指定した場合、他方を旧指定から解決します。旧 `danger` と新 `normal` の競合は要素に記録し、危険表示を保持します。 |
| IconButton、ToggleButton、ButtonGroup、SegmentedControl | 前二者はActionControlの指定を継承し、選択を `aria-pressed` と独立した表示で示します。ButtonGroupは子の操作が決めた両軸をそのまま使い、SegmentedControlはネイティブな選択UIの契約を使います。 |
| SplitButton、FloatingActionButton | 利用側で決める主操作に両軸を適用します。メニュートリガーの外観と意味は独立させます。 |
| Toolbar、TableToolbar、Menu、Menubar | Toolbarの見える操作と計測用の操作は同じ両軸を使います。TableToolbarの選択対象への操作は両軸を指定できます。MenuおよびMenubarで実際に操作を実行する項目は危険性を引き継ぎます。サブメニューを開く項目は開閉用の表示に統一し、無効項目には無効時の表示を優先します。 |
| ConfirmDialog、ConfirmPopover | 最終確定する操作に `confirmTone` を選べます。取消に安全な導線を保ち、確定要求を受けたアプリが認可・対象・永続化の成否を判断します。 |
| FormDialog、AlertDialog、Dialog、Drawer、Popover | FormDialogの明示的な破棄だけに危険性を付け、従来の `data-variant="danger"` も保持します。情報を了承するAlertDialog、汎用オーバーレイの閉鎖・最大化等は部品が決める固定操作です。投影した業務操作はアプリが指定します。 |
| FormActions、Wizard、CopyButton | 送信・戻る・コピーなど、部品の目的に付随する定型操作を維持します。新しい独立軸が必要な業務操作は、アプリがActionControlを組み合わせて実装します。 |

そのほかActionControlを内部で使う標準部品を調べました。ページの移動や開閉（`tabs.ts`、`pagination.ts`、`panels.ts`、`splitter.ts`、`navigation-tree.ts`、`mega-menu.ts`）、フォームの入力補助・選択（`text-input.ts`、`text-controls.ts`、`selection-input.ts`、`choice-controls.ts`、`structured-input.ts`、`inline-edit.ts`、`listbox.ts`、`filter-builder.ts`、`calendar.ts`、`date-input.ts`、`date-range-picker.ts`）、一覧・表・選択範囲の補助（`collection-views.ts`、`grid-list.ts`、`sortable-list.ts`、`transfer-list.ts`、`infinite-scroll.ts`、`virtual-data-table.ts`、`data-table-view.ts`、`data-grid.ts`、`tree-grid.ts`、`table-editors.ts`）、フィードバックや定型アクション（`card.ts`、`action-feedback.ts`、`async-region.ts`、`feedback.ts`、`notifications.ts`、`notification-center.ts`、`tour.ts`、`command-palette.ts`）、ファイル・メディアの限定操作（`file-upload.ts`、`image-cropper.ts`、`image-media.ts`、`media-player.ts`、`pdf-viewer.ts`）では、部品内の局所的な編集や移動・操作を実行します。現行のラベル、アクセシブルな対象、操作状態の契約を適用します。永続データを変更する判断や業務上の危険性はアプリの操作として表現します。

`data-variant` を直接参照する標準CSSは `styles.css` の通常時・hover・無効時のルールです。新しい両軸を使う場合だけ追加のルールを適用します。危険性と無効・処理中のスタイルは別の規則で扱います。色は検査済みの既存役割を使い、新規の必須色は増やしません。旧アプリのYAML、ラッパー、操作コードは自動編集しません。直接参照する利用側のCSSも更新時の確認対象です。
