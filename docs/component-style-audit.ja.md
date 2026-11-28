# 標準部品と共通 CSS の照合

[#39](https://github.com/ist-h-i/ui-foundation/issues/39) で、生成元の Angular 宣言 218 件と共通 CSS のルール 84 件を照合した。対象を `templates/angular/` の `@Component` と `@Directive` から抽出し、`index.ts`、`core.ts`、日英の部品一覧と照合した。スタイルはメタデータ、テンプレート、ホスト、実行時の指定、参照する共有定義をたどった。通常 CSS と専門部品 CSS はセレクターを逆引きし、公開マークアップ、投影先、第三者エンジンが描画する要素も確認した。

公開範囲の「全」は `index.ts`、「コア」は `core.ts` からも公開する宣言。「内部」には内部描画用ディレクティブとセレクターを持たない基底も含む。行リンクは各宣言またはルールの開始位置を指す。

## 部品とディレクティブ

| 宣言 | 公開範囲 | 生成元と配置の判断 |
| --- | --- | --- |
| `ActionControl` | 全・コア | [`action-control.ts:44`](../templates/angular/action-control.ts#L44)。テンプレートのスタイル指定。共通を維持。操作面とアイコン・ラベル・処理中表示は `styles.css`、アイコンの順序はテンプレート指定。 |
| `ActionLink` | 全・コア | [`action-control.ts:84`](../templates/angular/action-control.ts#L84)。`styles`、テンプレートのスタイル指定。移設。外部リンク表示をローカル化。操作面は `styles.css` の共有規則。 |
| `ActionFeedback` | 全 | [`action-feedback.ts:12`](../templates/angular/action-feedback.ts#L12)。`styles`。移設済み (#47)。成功と領域の固有規則。通知面・色と非表示は `styles.css`。 |
| `IconButton` | 全 | [`actions.ts:15`](../templates/angular/actions.ts#L15)。`styles`。移設。アイコン単体の余白・丸型をローカル化。操作面と押下は `styles.css`。 |
| `ButtonGroup` | 全 | [`actions.ts:35`](../templates/angular/actions.ts#L35)。`styles`、ホストまたは要素への動的指定。移設済み (#49)。ホストの配置・非表示。投影された操作要素は `styles.css`。 |
| `ToggleButton` | 全 | [`actions.ts:52`](../templates/angular/actions.ts#L52)。テンプレートのスタイル指定。共通を維持。操作面と押下を `styles.css` で共有し、ラベルの順序はテンプレート指定。 |
| `SegmentedControl` | 全 | [`actions.ts:80`](../templates/angular/actions.ts#L80)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `SplitButton` | 全 | [`actions.ts:145`](../templates/angular/actions.ts#L145)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `FloatingActionButton` | 全 | [`actions.ts:171`](../templates/angular/actions.ts#L171)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `CopyButton` | 全 | [`actions.ts:207`](../templates/angular/actions.ts#L207)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `Agenda` | 全 | [`agenda.ts:8`](../templates/angular/agenda.ts#L8)。`scheduler-view.ts#schedulerStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `AnchorNavigation` | 全 | [anchor-navigation.ts](../templates/angular/anchor-navigation.ts)の`styles`と対象要素への動的指定。目次の階層は論理方向の余白・境界線を使用する。 |
| `StepNavigation` | 全、単独 | [step-navigation.ts](../templates/angular/step-navigation.ts)の`styles`。段階と状態をセマンティックトークンで表示し、追加のCSS読み込みを必要としない。 |
| `AsyncRegion` | 全 | [`async-region.ts:12`](../templates/angular/async-region.ts#L12)。`styles`。移設済み (#47)。領域の固有余白。通知面・色と非表示は `styles.css`。 |
| `QRCode` | 全 | [`barcode.ts:8`](../templates/angular/barcode.ts#L8)。`media-style.ts#mediaStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Barcode` | 全 | [`barcode.ts:17`](../templates/angular/barcode.ts#L17)。`media-style.ts#mediaStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `CalendarDay` | 全 | [`calendar.ts:9`](../templates/angular/calendar.ts#L9)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `Calendar` | 全 | [`calendar.ts:11`](../templates/angular/calendar.ts#L11)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `CardTemplate` | 全・コア | [`card.ts:13`](../templates/angular/card.ts#L13)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `CardRegion` | 内部 | [`card.ts:24`](../templates/angular/card.ts#L24)。固有CSSなし。カード各スロットのホスト属性と入力を共有する基底。 |
| `CardHeader` | 全・コア | [`card.ts:29`](../templates/angular/card.ts#L29)。`card.ts#regionStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `CardBody` | 全・コア | [`card.ts:32`](../templates/angular/card.ts#L32)。`card.ts#regionStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `CardFooter` | 全・コア | [`card.ts:35`](../templates/angular/card.ts#L35)。`card.ts#regionStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `CardMedia` | 全・コア | [`card.ts:38`](../templates/angular/card.ts#L38)。`card.ts#regionStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `CardActions` | 全・コア | [`card.ts:41`](../templates/angular/card.ts#L41)。`card.ts#regionStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Card` | 全・コア | [`card.ts:44`](../templates/angular/card.ts#L44)。`styles`。現配置を維持。カード内の配置はローカル、投影された本文・フッターの先頭末尾余白は `styles.css`。 |
| `Cascader` | 全 | [`cascader.ts:13`](../templates/angular/cascader.ts#L13)。`tree-popup-control.ts#treePopupStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Chart` | 全 | [`chart.ts:14`](../templates/angular/chart.ts#L14)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由、ホストまたは要素への動的指定、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `Sparkline` | 全 | [`chart.ts:39`](../templates/angular/chart.ts#L39)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由。移設。凡例とサンプル線の規則を部品自身に置く。専門部品の基礎は共有する。 |
| `MessageList` | 全 | [`chat.ts:11`](../templates/angular/chat.ts#L11)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由、テンプレートのスタイル指定。移設。送信者・時刻の表示を部品自身に置く。専門部品の基礎は共有する。 |
| `MessageComposer` | 全 | [`chat.ts:30`](../templates/angular/chat.ts#L30)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由。移設。送信ボタンの外観を部品自身に置く。専門部品の基礎は共有する。 |
| `Chat` | 全 | [`chat.ts:72`](../templates/angular/chat.ts#L72)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `NumericFieldControl` | 内部 | [`choice-controls.ts:15`](../templates/angular/choice-controls.ts#L15)。固有CSSなし。数値入力の状態を共有する基底。 |
| `Slider` | 全 | [`choice-controls.ts:61`](../templates/angular/choice-controls.ts#L61)。`choice-controls.ts#styles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `RangeSlider` | 全 | [`choice-controls.ts:72`](../templates/angular/choice-controls.ts#L72)。`choice-controls.ts#styles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Knob` | 全 | [`choice-controls.ts:96`](../templates/angular/choice-controls.ts#L96)。`choice-controls.ts#styles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Rating` | 全 | [`choice-controls.ts:130`](../templates/angular/choice-controls.ts#L130)。`choice-controls.ts#styles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `ColorPicker` | 全 | [`choice-controls.ts:161`](../templates/angular/choice-controls.ts#L161)。`choice-controls.ts#styles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `CodeEditor` | 全 | [`code-editor.ts:14`](../templates/angular/code-editor.ts#L14)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由。現配置を維持。部品内の枠とコードエディター側のテーマ。動きの軽減は `specialist.css`。 |
| `CollectionItem` | 全 | [`collection-views.ts:13`](../templates/angular/collection-views.ts#L13)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `CollectionPresentation` | 内部 | [`collection-views.ts:20`](../templates/angular/collection-views.ts#L20)。固有CSSなし。一覧のテンプレート・項目モデルを共有する基底。 |
| `List` | 全 | [`collection-views.ts:38`](../templates/angular/collection-views.ts#L38)。`collection-views.ts#styles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Masonry` | 全 | [`collection-views.ts:44`](../templates/angular/collection-views.ts#L44)。`collection-views.ts#styles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `DataView` | 全 | [`collection-views.ts:57`](../templates/angular/collection-views.ts#L57)。`collection-views.ts#styles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `CommandPalette` | 全 | [`command-palette.ts:11`](../templates/angular/command-palette.ts#L11)。`styles`、ホストまたは要素への動的指定。現配置を維持。部品自身の表示を定義する。 |
| `DataGrid` | 全 | [`data-grid.ts:34`](../templates/angular/data-grid.ts#L34)。`styles`、テンプレートのスタイル指定。現配置を維持。部品自身の表示を定義する。 |
| `TableTemplate` | 全 | [`data-table-view.ts:34`](../templates/angular/data-table-view.ts#L34)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `DataTableView` | 全 | [`data-table-view.ts:43`](../templates/angular/data-table-view.ts#L43)。`styles`、ホストまたは要素への動的指定、テンプレートのスタイル指定。現配置を維持。部品自身の表示を定義する。 |
| `TableContainer` | 全 | [`data-table.ts:3`](../templates/angular/data-table.ts#L3)。`styles`、ホストまたは要素への動的指定。現配置を維持。部品自身の表示を定義する。 |
| `DataTable` | 全 | [`data-table.ts:80`](../templates/angular/data-table.ts#L80)。`styles`。現配置を維持。利用側が投影するネイティブ表の行・セルへ届く `ViewEncapsulation.None`。 |
| `TemporalControl` | 内部 | [`date-input.ts:12`](../templates/angular/date-input.ts#L12)。固有CSSなし。日付・時刻入力の基底で、描画には各部品が `temporalStyles` を適用する。 |
| `DatePicker` | 全 | [`date-input.ts:39`](../templates/angular/date-input.ts#L39)。`date-input.ts#temporalStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `TimePicker` | 全 | [`date-input.ts:66`](../templates/angular/date-input.ts#L66)。`date-input.ts#temporalStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `DateTimePicker` | 全 | [`date-input.ts:75`](../templates/angular/date-input.ts#L75)。`date-input.ts#temporalStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `MonthPicker` | 全 | [`date-input.ts:86`](../templates/angular/date-input.ts#L86)。`date-input.ts#temporalStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `YearPicker` | 全 | [`date-input.ts:89`](../templates/angular/date-input.ts#L89)。`date-input.ts#temporalStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `DateRangePicker` | 全 | [`date-range-picker.ts:12`](../templates/angular/date-range-picker.ts#L12)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `FlowEditor` | 全 | [`diagram.ts:17`](../templates/angular/diagram.ts#L17)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `ConfirmDialog` | 全 | [`dialog-variants.ts:8`](../templates/angular/dialog-variants.ts#L8)。固有CSSなし。Dialog とその操作部品を組み合わせる。 |
| `AlertDialog` | 全 | [`dialog-variants.ts:26`](../templates/angular/dialog-variants.ts#L26)。固有CSSなし。Dialog とその操作部品を組み合わせる。 |
| `FormDialog` | 全 | [`dialog-variants.ts:39`](../templates/angular/dialog-variants.ts#L39)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `DynamicDialogHost` | 全 | [`dialog-variants.ts:177`](../templates/angular/dialog-variants.ts#L177)。固有CSSなし。Dialog と動的テンプレートを組み合わせる。 |
| `DialogTemplate` | 全 | [`dialog.ts:27`](../templates/angular/dialog.ts#L27)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `Dialog` | 全 | [`dialog.ts:93`](../templates/angular/dialog.ts#L93)。`dialog.ts#DIALOG_STYLES`、部品の `styles` 経由、ホストまたは要素への動的指定。現配置を維持。部品群で共有する定義を参照する。 |
| `DiffViewer` | 全 | [`diff-json.ts:11`](../templates/angular/diff-json.ts#L11)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由。現配置を維持。枠は部品側、CodeMirror の分割ビューと動きの軽減は `specialist.css`。 |
| `JsonViewer` | 全 | [`diff-json.ts:27`](../templates/angular/diff-json.ts#L27)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `Disclosure` | 全 | [`disclosure.ts:10`](../templates/angular/disclosure.ts#L10)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `ReadMore` | 全 | [`display-content.ts:10`](../templates/angular/display-content.ts#L10)。`display-style.ts#displayStyles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `CodeBlock` | 全 | [`display-content.ts:30`](../templates/angular/display-content.ts#L30)。`display-style.ts#displayStyles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `InlineCode` | 全 | [`display-content.ts:42`](../templates/angular/display-content.ts#L42)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `Watermark` | 全 | [`display-content.ts:49`](../templates/angular/display-content.ts#L49)。`display-style.ts#displayStyles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `Typography` | 全 | [`display.ts:13`](../templates/angular/display.ts#L13)。ホストまたは要素への動的指定。現配置を維持。書体の意味トークンをホストに設定し、フォーカスは `styles.css` で共有する。 |
| `Badge` | 全 | [`display.ts:39`](../templates/angular/display.ts#L39)。`display-style.ts#displayStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Tag` | 全 | [`display.ts:56`](../templates/angular/display.ts#L56)。`display-style.ts#displayStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Avatar` | 全 | [`display.ts:75`](../templates/angular/display.ts#L75)。`display-style.ts#displayStyles`、部品の `styles` 経由、ホストまたは要素への動的指定。現配置を維持。部品群で共有する定義を参照する。 |
| `AvatarGroup` | 全 | [`display.ts:85`](../templates/angular/display.ts#L85)。`display-style.ts#displayStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `DescriptionTemplate` | 全 | [`display.ts:98`](../templates/angular/display.ts#L98)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `Descriptions` | 全 | [`display.ts:100`](../templates/angular/display.ts#L100)。`display-style.ts#displayStyles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `Statistic` | 全 | [`display.ts:112`](../templates/angular/display.ts#L112)。`display-style.ts#displayStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Meter` | 全 | [`display.ts:125`](../templates/angular/display.ts#L125)。`display-style.ts#displayStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `MeterGroup` | 全 | [`display.ts:135`](../templates/angular/display.ts#L135)。`display-style.ts#displayStyles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `HelpText` | 全 | [`display.ts:144`](../templates/angular/display.ts#L144)。`display-style.ts#displayStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `ShortcutHint` | 全 | [`display.ts:148`](../templates/angular/display.ts#L148)。`display-style.ts#displayStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `EdgePanel` | 内部 | [`drawer.ts:22`](../templates/angular/drawer.ts#L22)。`dialog.ts#DIALOG_STYLES`、部品の `styles` 経由、ホストまたは要素への動的指定。現配置を維持。部品群で共有する定義を参照する。 |
| `Drawer` | 全 | [`drawer.ts:59`](../templates/angular/drawer.ts#L59)。`dialog.ts#DIALOG_STYLES`・`drawer.ts#edgeStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `BottomSheet` | 全 | [`drawer.ts:69`](../templates/angular/drawer.ts#L69)。`dialog.ts#DIALOG_STYLES`・`drawer.ts#edgeStyles`、部品の `styles` 経由、ホストまたは要素への動的指定。現配置を維持。部品群で共有する定義を参照する。 |
| `SpecialistEditorControl` | 内部 | [`editor-control.ts:6`](../templates/angular/editor-control.ts#L6)。固有CSSなし。専門エディターのフォーム・ホストの意味属性を担う基底。 |
| `Alert` | 全 | [`feedback.ts:16`](../templates/angular/feedback.ts#L16)。`feedback.ts#common`・`feedback.ts#severity`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `EmptyState` | 全 | [`feedback.ts:61`](../templates/angular/feedback.ts#L61)。`feedback.ts#common`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `ResultState` | 全 | [`feedback.ts:81`](../templates/angular/feedback.ts#L81)。`feedback.ts#common`・`feedback.ts#severity`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `ProgressBar` | 全 | [`feedback.ts:106`](../templates/angular/feedback.ts#L106)。`feedback.ts#common`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Spinner` | 全 | [`feedback.ts:130`](../templates/angular/feedback.ts#L130)。`feedback.ts#common`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `Skeleton` | 全 | [`feedback.ts:163`](../templates/angular/feedback.ts#L163)。`feedback.ts#common`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `LoadingOverlay` | 全 | [`feedback.ts:188`](../templates/angular/feedback.ts#L188)。`feedback.ts#common`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `FileExplorer` | 全 | [`file-explorer.ts:9`](../templates/angular/file-explorer.ts#L9)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `UploadList` | 全 | [`file-upload.ts:14`](../templates/angular/file-upload.ts#L14)。`media-style.ts#mediaStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `FileUpload` | 全 | [`file-upload.ts:30`](../templates/angular/file-upload.ts#L30)。`media-style.ts#mediaStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `FilterGroupContext` | 全 | [`filter-builder.ts:15`](../templates/angular/filter-builder.ts#L15)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `FilterBuilder` | 全 | [`filter-builder.ts:19`](../templates/angular/filter-builder.ts#L19)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `PopupTemplate` | 全 | [`floating-panel.ts:21`](../templates/angular/floating-panel.ts#L21)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `AnchoredPopup` | 内部 | [`floating-panel.ts:45`](../templates/angular/floating-panel.ts#L45)。固有CSSなし。ポップアップ状態を共有する基底。描画には各部品が `popupStyles` を適用する。 |
| `Popover` | 全 | [`floating-panel.ts:234`](../templates/angular/floating-panel.ts#L234)。`floating-panel.ts#popupStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `HoverCard` | 全 | [`floating-panel.ts:263`](../templates/angular/floating-panel.ts#L263)。`floating-panel.ts#popupStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Tooltip` | 全 | [`floating-panel.ts:269`](../templates/angular/floating-panel.ts#L269)。`floating-panel.ts#popupStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `ConfirmPopover` | 全 | [`floating-panel.ts:293`](../templates/angular/floating-panel.ts#L293)。`floating-panel.ts#popupStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `FieldControl` | 全・コア | [`form-field.ts:16`](../templates/angular/form-field.ts#L16)。共通を維持。ネイティブ入力のホストに公開クラスを付け、`styles.css` が装飾する。 |
| `FormField` | 全・コア | [`form-field.ts:33`](../templates/angular/form-field.ts#L33)。`styles`、ホストまたは要素への動的指定。移設。単体の外側余白とラベルの基本形を追加集約。投影される入力との配置は `styles.css`。 |
| `FormLayout` | 全 | [`form-layout.ts:6`](../templates/angular/form-layout.ts#L6)。ホストまたは要素への動的指定。共通を維持。ホストで横配置を伝える。投影されたフィールドとの間隔・並びは `styles.css`。 |
| `FormGroup` | 全 | [`form-layout.ts:14`](../templates/angular/form-layout.ts#L14)。`styles`。現配置を維持。グループの枠は部品側、ヒントとエラーは `styles.css`。 |
| `FormActions` | 全 | [`form-layout.ts:22`](../templates/angular/form-layout.ts#L22)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `InputGroup` | 全 | [`form-layout.ts:43`](../templates/angular/form-layout.ts#L43)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `FormErrorSummary` | 全 | [`form-layout.ts:49`](../templates/angular/form-layout.ts#L49)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `Gantt` | 全 | [`gantt.ts:15`](../templates/angular/gantt.ts#L15)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由、ホストまたは要素への動的指定。現配置を維持。部品群で共有する定義を参照する。 |
| `GridItem` | 全 | [`grid-list.ts:10`](../templates/angular/grid-list.ts#L10)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `GridList` | 全 | [`grid-list.ts:12`](../templates/angular/grid-list.ts#L12)。`styles`、テンプレートのスタイル指定。現配置を維持。部品自身の表示を定義する。 |
| `Icon` | 全・コア | [`icon.ts:5`](../templates/angular/icon.ts#L5)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `ImageCropper` | 全 | [`image-cropper.ts:9`](../templates/angular/image-cropper.ts#L9)。`media-style.ts#mediaStyles`、部品の `styles` 経由、テンプレートのスタイル指定。移設。座標と比率の入力グリッドを部品自身に置く。メディア部品の基礎は共有する。 |
| `Image` | 全 | [`image-media.ts:5`](../templates/angular/image-media.ts#L5)。`media-style.ts#mediaStyles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `ImageViewer` | 全 | [`image-media.ts:12`](../templates/angular/image-media.ts#L12)。`media-style.ts#mediaStyles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `Gallery` | 全 | [`image-media.ts:31`](../templates/angular/image-media.ts#L31)。`media-style.ts#mediaStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `ImageCompare` | 全 | [`image-media.ts:45`](../templates/angular/image-media.ts#L45)。`media-style.ts#mediaStyles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `InfiniteScroll` | 全 | [`infinite-scroll.ts:11`](../templates/angular/infinite-scroll.ts#L11)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `InlineEdit` | 全 | [`inline-edit.ts:11`](../templates/angular/inline-edit.ts#L11)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `Kanban` | 全 | [`kanban.ts:10`](../templates/angular/kanban.ts#L10)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Container` | 全 | [`layout.ts:14`](../templates/angular/layout.ts#L14)。`layout.ts#common`、部品の `styles` 経由、ホストまたは要素への動的指定。現配置を維持。部品群で共有する定義を参照する。 |
| `Stack` | 全 | [`layout.ts:22`](../templates/angular/layout.ts#L22)。`layout.ts#common`、部品の `styles` 経由、ホストまたは要素への動的指定。現配置を維持。部品群で共有する定義を参照する。 |
| `Grid` | 全 | [`layout.ts:26`](../templates/angular/layout.ts#L26)。`layout.ts#common`、部品の `styles` 経由、ホストまたは要素への動的指定。現配置を維持。部品群で共有する定義を参照する。 |
| `GridCell` | 全 | [`layout.ts:33`](../templates/angular/layout.ts#L33)。ホストまたは要素への動的指定。現配置を維持。列・行の位置は入力に応じたホスト指定。固定CSSなし。 |
| `Divider` | 全 | [`layout.ts:41`](../templates/angular/layout.ts#L41)。`layout.ts#common`、部品の `styles` 経由、ホストまたは要素への動的指定。現配置を維持。部品群で共有する定義を参照する。 |
| `Spacer` | 全 | [`layout.ts:46`](../templates/angular/layout.ts#L46)。`layout.ts#common`、部品の `styles` 経由、ホストまたは要素への動的指定。現配置を維持。部品群で共有する定義を参照する。 |
| `ScrollArea` | 全 | [`layout.ts:49`](../templates/angular/layout.ts#L49)。`layout.ts#common`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `StickyRegion` | 全 | [`layout.ts:51`](../templates/angular/layout.ts#L51)。`layout.ts#common`、部品の `styles` 経由、ホストまたは要素への動的指定。現配置を維持。部品群で共有する定義を参照する。 |
| `AspectRatio` | 全 | [`layout.ts:53`](../templates/angular/layout.ts#L53)。`layout.ts#common`、部品の `styles` 経由、ホストまたは要素への動的指定。現配置を維持。自身の比率は部品側、投影されたメディアの寸法は `styles.css`。 |
| `ResponsiveVisibility` | 全 | [`layout.ts:55`](../templates/angular/layout.ts#L55)。`layout.ts#common`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `ListChoiceTemplate` | 全 | [`listbox.ts:17`](../templates/angular/listbox.ts#L17)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `Listbox` | 全 | [`listbox.ts:22`](../templates/angular/listbox.ts#L22)。`styles`、テンプレートのスタイル指定。現配置を維持。部品自身の表示を定義する。 |
| `UiLocaleScope` | 全・コア | [`locale.ts:58`](../templates/angular/locale.ts#L58)。固有CSSなし。ロケールのスコープを定義する。 |
| `MapView` | 全 | [`map.ts:12`](../templates/angular/map.ts#L12)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由、ホストまたは要素への動的指定。現配置を維持。地図枠は部品側、MapLibre の描画先と動きの軽減は `specialist.css`。 |
| `MarkdownPreview` | 全 | [`markdown-editor.ts:12`](../templates/angular/markdown-editor.ts#L12)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由。現配置を維持。プレビュー枠は部品側、レンダリングされたマークアップは `specialist.css`。 |
| `MarkdownEditor` | 全 | [`markdown-editor.ts:16`](../templates/angular/markdown-editor.ts#L16)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `MediaPlayer` | 全 | [`media-player.ts:9`](../templates/angular/media-player.ts#L9)。`media-style.ts#mediaStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `MegaMenu` | 全 | [`mega-menu.ts:12`](../templates/angular/mega-menu.ts#L12)。`styles`、テンプレートのスタイル指定。現配置を維持。部品自身の表示を定義する。 |
| `Menu` | 全 | [`menu.ts:12`](../templates/angular/menu.ts#L12)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `Menubar` | 全 | [`menubar.ts:10`](../templates/angular/menubar.ts#L10)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `SideNav` | 全 | [`navigation-tree.ts:9`](../templates/angular/navigation-tree.ts#L9)。`styles`、テンプレートのスタイル指定。現配置を維持。部品自身の表示を定義する。 |
| `BottomNavigation` | 全 | [`navigation-tree.ts:82`](../templates/angular/navigation-tree.ts#L82)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `NavigationItem` | 全 | [`navigation.ts:88`](../templates/angular/navigation.ts#L88)。共通を維持。投影先にかかわらず `navigation.ts#navigationStyles` がリンクのクラスに適用される。 |
| `Navigation` | 全 | [`navigation.ts:99`](../templates/angular/navigation.ts#L99)。`navigation.ts#navigationStyles`、部品の `styles` 経由。現配置を維持。投影されたリストとリンクに届く `ViewEncapsulation.None`。 |
| `Breadcrumb` | 全 | [`navigation.ts:113`](../templates/angular/navigation.ts#L113)。`navigation.ts#navigationStyles`、部品の `styles` 経由。現配置を維持。投影・内部描画の双方を扱う `ViewEncapsulation.None`。 |
| `NotificationCenter` | 全 | [`notification-center.ts:20`](../templates/angular/notification-center.ts#L20)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `Snackbar` | 全 | [`notifications.ts:16`](../templates/angular/notifications.ts#L16)。`notifications.ts#positionStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `NotificationHost` | 全 | [`notifications.ts:114`](../templates/angular/notifications.ts#L114)。`notifications.ts#positionStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `NotificationScope` | 全 | [`notifications.ts:137`](../templates/angular/notifications.ts#L137)。固有CSSなし。通知サービスのスコープを定義する。 |
| `OrganizationChart` | 全 | [`organization-chart.ts:10`](../templates/angular/organization-chart.ts#L10)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `OverlayHost` | 全 | [`overlay.ts:75`](../templates/angular/overlay.ts#L75)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `PageFrame` | 全 | [`page-frame.ts:5`](../templates/angular/page-frame.ts#L5)。`./page-frame.css`、ホストまたは要素への動的指定。移設済み (#41)。フレームの内部配置と計測。ホスト既定・非表示は `styles.css` で共有。 |
| `Pagination` | 全 | [`pagination.ts:18`](../templates/angular/pagination.ts#L18)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `PanelHandle` | 内部 | [`panel-handle.ts:8`](../templates/angular/panel-handle.ts#L8)。固有CSSなし。ポインター・キー操作と対象の位置・寸法の計算を共有する基底。 |
| `MoveHandle` | 全 | [`panel-handle.ts:55`](../templates/angular/panel-handle.ts#L55)。現配置を維持。ホストの touch-action と移動イベントを指定し、Dialog 内では ActionControl の外観を使う。 |
| `ResizeHandle` | 全 | [`panel-handle.ts:59`](../templates/angular/panel-handle.ts#L59)。現配置を維持。ホストの touch-action と寸法変更イベントを指定し、Dialog 内では ActionControl の外観を使う。 |
| `Panel` | 全 | [`panels.ts:8`](../templates/angular/panels.ts#L8)。`panels.ts#panelStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `AccordionItem` | 全 | [`panels.ts:22`](../templates/angular/panels.ts#L22)。`panels.ts#panelStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Accordion` | 全 | [`panels.ts:32`](../templates/angular/panels.ts#L32)。`panels.ts#panelStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `PDFViewer` | 全 | [`pdf-viewer.ts:6`](../templates/angular/pdf-viewer.ts#L6)。`media-style.ts#mediaStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `RadioOption` | 全 | [`radio-group.ts:5`](../templates/angular/radio-group.ts#L5)。共通を維持。 `styles.css` の入力クラスと、アプリが付ける投影ラベルの外観を組み合わせる。 |
| `RadioGroup` | 全 | [`radio-group.ts:30`](../templates/angular/radio-group.ts#L30)。`styles`。現配置を維持。グループの枠は部品側、投影選択肢とヒント・エラーは `styles.css`。 |
| `RichTextEditor` | 全 | [`rich-text-editor.ts:14`](../templates/angular/rich-text-editor.ts#L14)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由。統合。ツールバーは部品の `styles`、ProseMirror の描画先は `specialist.css` に集約。 |
| `SchedulerController` | 内部 | [`scheduler-controller.ts:17`](../templates/angular/scheduler-controller.ts#L17)。固有CSSなし。予定・操作を管理する基底で、Scheduler がビューを描画する。 |
| `SchedulerEventTemplate` | 全 | [`scheduler-template.ts:4`](../templates/angular/scheduler-template.ts#L4)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `Scheduler` | 全 | [`scheduler.ts:7`](../templates/angular/scheduler.ts#L7)。`scheduler-view.ts#schedulerStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `ComboboxOption` | 全 | [`selection-input.ts:13`](../templates/angular/selection-input.ts#L13)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `Checkbox` | 全 | [`selection-input.ts:54`](../templates/angular/selection-input.ts#L54)。`selection-input.ts#selectionStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Switch` | 全 | [`selection-input.ts:58`](../templates/angular/selection-input.ts#L58)。`selection-input.ts#selectionStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Select` | 全 | [`selection-input.ts:62`](../templates/angular/selection-input.ts#L62)。`selection-input.ts#selectionStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `MultiSelect` | 全 | [`selection-input.ts:78`](../templates/angular/selection-input.ts#L78)。`selection-input.ts#selectionStyles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `Combobox` | 全 | [`selection-input.ts:107`](../templates/angular/selection-input.ts#L107)。`selection-input.ts#selectionStyles`、部品の `styles` 経由、ホストまたは要素への動的指定。現配置を維持。部品群で共有する定義を参照する。 |
| `SortableList` | 全 | [`sortable-list.ts:18`](../templates/angular/sortable-list.ts#L18)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `Splitter` | 全 | [`splitter.ts:6`](../templates/angular/splitter.ts#L6)。`styles`、テンプレートのスタイル指定。現配置を維持。部品自身の表示を定義する。 |
| `Spreadsheet` | 全 | [`spreadsheet.ts:15`](../templates/angular/spreadsheet.ts#L15)。`specialist-style.ts#specialistStyles`、部品の `styles` 経由、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `MaskedInput` | 全 | [`structured-input.ts:11`](../templates/angular/structured-input.ts#L11)。`structured-input.ts#styles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `OTPInput` | 全 | [`structured-input.ts:48`](../templates/angular/structured-input.ts#L48)。`structured-input.ts#styles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `TagInput` | 全 | [`structured-input.ts:66`](../templates/angular/structured-input.ts#L66)。`structured-input.ts#styles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `TableColumnResize` | 全 | [`table-column-resize.ts:3`](../templates/angular/table-column-resize.ts#L3)。固有CSSなし。列幅操作の属性・イベントを付ける。DataTableView のリサイズボタンにはその部品のCSSが適用される。 |
| `ColumnFilter` | 全 | [`table-controls.ts:14`](../templates/angular/table-controls.ts#L14)。`table-controls.ts#controlsStyle`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `ColumnChooser` | 全 | [`table-controls.ts:158`](../templates/angular/table-controls.ts#L158)。`table-controls.ts#controlsStyle`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `FilterChips` | 全 | [`table-controls.ts:231`](../templates/angular/table-controls.ts#L231)。`table-controls.ts#controlsStyle`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `SearchPanel` | 全 | [`table-controls.ts:270`](../templates/angular/table-controls.ts#L270)。`table-controls.ts#controlsStyle`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `TableToolbar` | 全 | [`table-controls.ts:316`](../templates/angular/table-controls.ts#L316)。`table-controls.ts#controlsStyle`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `TableEditorSession` | 内部 | [`table-editors.ts:15`](../templates/angular/table-editors.ts#L15)。固有CSSなし。CellEditor / RowEditor の編集状態を共有する基底。 |
| `CellEditor` | 全 | [`table-editors.ts:180`](../templates/angular/table-editors.ts#L180)。`table-editors.ts#editorStyle`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `RowEditor` | 全 | [`table-editors.ts:186`](../templates/angular/table-editors.ts#L186)。`table-editors.ts#editorStyle`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `TabPanel` | 全 | [`tabs.ts:5`](../templates/angular/tabs.ts#L5)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `Tabs` | 全 | [`tabs.ts:19`](../templates/angular/tabs.ts#L19)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `TextInput` | 全 | [`text-input.ts:19`](../templates/angular/text-input.ts#L19)。`text-input.ts#controlStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Textarea` | 全 | [`text-input.ts:41`](../templates/angular/text-input.ts#L41)。`text-input.ts#controlStyles`、部品の `styles` 経由、ホストまたは要素への動的指定、テンプレートのスタイル指定。現配置を維持。部品群で共有する定義を参照する。 |
| `PasswordInput` | 全 | [`text-input.ts:67`](../templates/angular/text-input.ts#L67)。`text-input.ts#controlStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `SearchInput` | 全 | [`text-input.ts:85`](../templates/angular/text-input.ts#L85)。`text-input.ts#controlStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `NumberInput` | 全 | [`text-input.ts:112`](../templates/angular/text-input.ts#L112)。`text-input.ts#controlStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `TimelineItem` | 全 | [`timeline.ts:16`](../templates/angular/timeline.ts#L16)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `Timeline` | 全 | [`timeline.ts:26`](../templates/angular/timeline.ts#L26)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `Toolbar` | 全 | [`toolbar.ts:15`](../templates/angular/toolbar.ts#L15)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `Tour` | 全 | [`tour.ts:15`](../templates/angular/tour.ts#L15)。`styles`、テンプレートのスタイル指定。現配置を維持。部品自身の表示を定義する。 |
| `TransferItem` | 全 | [`transfer-list.ts:19`](../templates/angular/transfer-list.ts#L19)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `TransferList` | 全 | [`transfer-list.ts:32`](../templates/angular/transfer-list.ts#L32)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `TreeGrid` | 全 | [`tree-grid.ts:13`](../templates/angular/tree-grid.ts#L13)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `TreeItem` | 全 | [`tree-item.ts:5`](../templates/angular/tree-item.ts#L5)。固有CSSなし。Tree のリスト項目にツリーの意味属性とキーボード操作の対象を指定する。行の外観は Tree が描画する。 |
| `TreeNodeTemplate` | 全 | [`tree-node-template.ts:15`](../templates/angular/tree-node-template.ts#L15)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `TreePopupControl` | 内部 | [`tree-popup-control.ts:9`](../templates/angular/tree-popup-control.ts#L9)。ホストまたは要素への動的指定。現配置を維持。ツリーポップアップの位置指定と Cascader / TreeSelect 共通の `treePopupStyles` を所有する基底。 |
| `TreeSelect` | 全 | [`tree-select.ts:12`](../templates/angular/tree-select.ts#L12)。`tree-popup-control.ts#treePopupStyles`、部品の `styles` 経由。現配置を維持。部品群で共有する定義を参照する。 |
| `Tree` | 全 | [`tree.ts:40`](../templates/angular/tree.ts#L40)。`tree.ts#treeStyles`、部品の `styles` 経由。現配置を維持。Tree 専用の定義を同じファイルに置く。 |
| `ValueControl` | 内部 | [`value-control.ts:5`](../templates/angular/value-control.ts#L5)。固有CSSなし。フォームの値とイベントを共有する基底。 |
| `FieldValueControl` | 内部 | [`value-control.ts:46`](../templates/angular/value-control.ts#L46)。固有CSSなし。フォームの値とフィールド属性を共有する基底。 |
| `VirtualDataTable` | 全 | [`virtual-data-table.ts:14`](../templates/angular/virtual-data-table.ts#L14)。`styles`、テンプレートのスタイル指定。現配置を維持。部品自身の表示を定義する。 |
| `VirtualItem` | 全 | [`virtual-list.ts:12`](../templates/angular/virtual-list.ts#L12)。固有CSSなし。投影用のテンプレートと描画コンテキストを受け渡す。 |
| `VirtualList` | 全 | [`virtual-list.ts:14`](../templates/angular/virtual-list.ts#L14)。`styles`、テンプレートのスタイル指定。現配置を維持。部品自身の表示を定義する。 |
| `VirtualRows` | 内部 | [`virtual-rows.ts:9`](../templates/angular/virtual-rows.ts#L9)。固有CSSなし。仮想化の行とテンプレートの関係を管理し、行の外観は利用側が定義する。 |
| `VirtualScroll` | 内部 | [`virtual-scroll.ts:9`](../templates/angular/virtual-scroll.ts#L9)。固有CSSなし。CDK ビューポートの仮想化・スクロールを管理し、ビューポートの外観は利用側が定義する。 |
| `WizardStep` | 全 | [`wizard.ts:9`](../templates/angular/wizard.ts#L9)。`styles`。現配置を維持。部品自身の表示を定義する。 |
| `Wizard` | 全 | [`wizard.ts:31`](../templates/angular/wizard.ts#L31)。`styles`。現配置を維持。部品自身の表示を定義する。 |

## 共有の TypeScript 内スタイル

表内の `ファイル名#定義名` は、部品ファミリーで共通に使う `styles` 定義を指す。同じソースファイル内の定義は、部品・基底・派生の間で書体、状態、構造を揃える。別ファイルから参照する表示・メディア・専門部品のスタイル、日程ビュー、ツリーポップアップ、Dialog のベースもそれぞれ複数の宣言が利用する。

選択欄のラッパーとシェブロンは `styles.css` に統合した。専門部品には `.ui-field-control` を持たない選択欄もあり、共通 CSS の `select.ui-field-control` は適用されない。専門部品の入力用ルールに勝つよう、選択欄の余白と強制色でのネイティブ表示には `specialistStyles` の scoped 規則を維持する。

## 共通 CSS の逆引き

`styles.css` 72 件、`specialist.css` 12 件。メディア条件がある規則は、条件とセレクターを併記した。所有者または公開用途の未判定は 0 件。

| 適用先 | 利用者と共通に置く理由 |
| --- | --- |
| フォーム間隔 | FormLayout のホスト、横並びで投影される子、狭幅での折り返し。FormField の単体余白をグループ内で解除する。 |
| 共有ホスト | PageFrame / FormField / AsyncRegion / ActionFeedback / RadioGroup のフォントと表示。ホストと投影された通知・操作の非表示にも適用する。 |
| 読み上げ本文 | AsyncRegion / ActionFeedback / DataTableView の状態通知と IconButton の補足に使う `.ui-sr-only`。読み上げ用テキストを画面で隠す。 |
| 操作の共通形 | ActionControl / ActionLink / IconButton / ToggleButton が同じホスト、状態、子要素のクラスを使う。関連部品内のアイコンボタンもこの API を使う。 |
| 共有フォーカス | 操作系、FieldControl の入力と Typography のホストに共通。強制色の対象は操作系と入力。 |
| 操作の押下 | IconButton / ToggleButton の押下状態が同じ色を使う。 |
| 操作グループ | ButtonGroup に投影されるアクションのサイズを継承し、連結時に方向と位置に応じて伸縮・境界線・角丸を調整する。 |
| フィールドの投影 | FormField が投影された入力の種類を見て、ラベル・入力・補足の位置を決める。入力とラベルをまたぐ。 |
| 入力の共通形 | FieldControl のネイティブ入力、ほかの標準部品のネイティブ入力、利用側マークアップの `.ui-field-control` に適用する。 |
| 選択欄 | Select / Pagination / DataTableView 等とアプリの選択欄が同じラッパー・選択欄・シェブロンを共有する。強制色ではネイティブ表示。 |
| フォーム補足 | FormField / FormGroup / RadioGroup がヒントとエラーに同じクラスを使う。 |
| 状態通知 | AsyncRegion と ActionFeedback が通知面・本文・注意・エラーの表現を共有する。 |
| ラジオの投影 | RadioGroup の中で、利用側が描くラベル `.ui-radio-option` と RadioOption のネイティブ入力へ適用する。 |
| メディアの投影 | AspectRatio に投影される img、video、iframe の寸法を揃える。 |
| カードの投影 | Card の本文とフッターに入る最初・最後の投影要素の余白を揃える。 |
| ProseMirror | RichTextEditor のエディター本体とフォーカス。ProseMirror が要素を生成する。 |
| リッチ文書 | ProseMirror と MarkdownPreview のレンダラーが生成する文書の画像とリンク。 |
| Markdown | MarkdownPreview のレンダラーが生成する表、セル、コード。 |
| CodeMirror | DiffViewer の CodeMirror が生成する分割ビューとエディター。 |
| MapLibre | MapView の MapLibre が生成するキャンバス・帰属表示と、動的に追加するマーカーのフォーカス。 |
| 動きの軽減 | MapView / RichTextEditor / CodeEditor / DiffViewer の第三者エンジンによる DOM も含めて動きを軽減する。 |

| 生成元 | セレクターと条件 | 適用先 |
| --- | --- | --- |
| [`styles.css:2`](../templates/angular/styles.css#L2) | `.ui-form-layout` | フォーム間隔 |
| [`styles.css:3`](../templates/angular/styles.css#L3) | `.ui-form-layout[data-direction="horizontal"]` | フォーム間隔 |
| [`styles.css:4`](../templates/angular/styles.css#L4) | `.ui-form-layout[data-direction="horizontal"] > *` | フォーム間隔 |
| [`styles.css:5`](../templates/angular/styles.css#L5) | `.ui-form-layout[hidden]` | フォーム間隔 |
| [`styles.css:6`](../templates/angular/styles.css#L6) | `@media (max-width: 40rem)` 内の `.ui-form-layout` | フォーム間隔 |
| [`styles.css:7`](../templates/angular/styles.css#L7) | `.ui-page-frame, .ui-form-field, .ui-async-region, .ui-action-feedback, .ui-radio-group` | 共有ホスト |
| [`styles.css:19`](../templates/angular/styles.css#L19) | `.ui-action-feedback [hidden], .ui-async-region [hidden], .ui-page-frame[hidden], .ui-form-field[hidden], .ui-async-region[hidden], .ui-action-feedback[hidden], .ui-radio-group[hidden], .ui-action[hidden]` | 共有ホスト |
| [`styles.css:22`](../templates/angular/styles.css#L22) | `.ui-sr-only` | 読み上げ本文 |
| [`styles.css:34`](../templates/angular/styles.css#L34) | `.ui-action` | 操作の共通形 |
| [`styles.css:60`](../templates/angular/styles.css#L60) | `.ui-action[data-variant="primary"]` | 操作の共通形 |
| [`styles.css:65`](../templates/angular/styles.css#L65) | `.ui-action[data-variant="danger"]` | 操作の共通形 |
| [`styles.css:70`](../templates/angular/styles.css#L70) | `.ui-action:hover` | 操作の共通形 |
| [`styles.css:71`](../templates/angular/styles.css#L71) | `.ui-action[data-variant="primary"]:hover` | 操作の共通形 |
| [`styles.css:72`](../templates/angular/styles.css#L72) | `.ui-action[data-variant="danger"]:hover` | 操作の共通形 |
| [`styles.css:73`](../templates/angular/styles.css#L73) | `.ui-action:active:not(:disabled):not(.ui-action--disabled):not(.ui-action--busy)` | 操作の共通形 |
| [`styles.css:76`](../templates/angular/styles.css#L76) | `.ui-action:focus-visible, .ui-field-control:focus-visible, .ui-typography:focus-visible` | 共有フォーカス |
| [`styles.css:80`](../templates/angular/styles.css#L80) | `.ui-action:disabled, .ui-action--disabled, .ui-action--busy, .ui-action[data-variant]:disabled, .ui-action[data-variant].ui-action--disabled, .ui-action[data-variant].ui-action--busy` | 操作の共通形 |
| [`styles.css:88`](../templates/angular/styles.css#L88) | `.ui-action-label` | 操作の共通形 |
| [`styles.css:89`](../templates/angular/styles.css#L89) | `.ui-action-busy` | 操作の共通形 |
| [`styles.css:92`](../templates/angular/styles.css#L92) | `.ui-form-layout .ui-form-field` | フォーム間隔 |
| [`styles.css:93`](../templates/angular/styles.css#L93) | `.ui-form-field-hint, .ui-form-field-error` | フォーム補足 |
| [`styles.css:97`](../templates/angular/styles.css#L97) | `.ui-form-field-hint` | フォーム補足 |
| [`styles.css:98`](../templates/angular/styles.css#L98) | `.ui-form-field-error` | フォーム補足 |
| [`styles.css:99`](../templates/angular/styles.css#L99) | `.ui-form-field:not(:has(input[type="checkbox"]))` | フィールドの投影 |
| [`styles.css:100`](../templates/angular/styles.css#L100) | `.ui-form-field:not(:has(input[type="checkbox"])) > .ui-form-field-label` | フィールドの投影 |
| [`styles.css:101`](../templates/angular/styles.css#L101) | `.ui-form-field:not(:has(input[type="checkbox"])) > :not(.ui-form-field-label)` | フィールドの投影 |
| [`styles.css:102`](../templates/angular/styles.css#L102) | `@media (max-width:40rem)` 内の `.ui-form-field:not(:has(input[type="checkbox"]))` | フィールドの投影 |
| [`styles.css:103`](../templates/angular/styles.css#L103) | `.ui-field-control` | 入力の共通形 |
| [`styles.css:118`](../templates/angular/styles.css#L118) | `input.ui-field-control:not([type="checkbox"]):not([type="radio"]), textarea.ui-field-control, select.ui-field-control` | 入力の共通形 |
| [`styles.css:119`](../templates/angular/styles.css#L119) | `.ui-select-control` | 選択欄 |
| [`styles.css:120`](../templates/angular/styles.css#L120) | `.ui-select-control > select.ui-field-control` | 選択欄 |
| [`styles.css:121`](../templates/angular/styles.css#L121) | `.ui-select-control__chevron` | 選択欄 |
| [`styles.css:123`](../templates/angular/styles.css#L123) | `@media (forced-colors: active)` 内の `.ui-select-control > select.ui-field-control` | 選択欄 |
| [`styles.css:123`](../templates/angular/styles.css#L123) | `@media (forced-colors: active)` 内の `.ui-select-control__chevron` | 選択欄 |
| [`styles.css:124`](../templates/angular/styles.css#L124) | `input.ui-field-control[type="checkbox"], input.ui-field-control[type="radio"]` | 入力の共通形 |
| [`styles.css:132`](../templates/angular/styles.css#L132) | `.ui-form-field:not([hidden]):has(input.ui-field-control[type="checkbox"])` | フィールドの投影 |
| [`styles.css:137`](../templates/angular/styles.css#L137) | `.ui-form-field:has(input.ui-field-control[type="checkbox"]) .ui-form-field-label` | フィールドの投影 |
| [`styles.css:146`](../templates/angular/styles.css#L146) | `.ui-form-field:has(input.ui-field-control[type="checkbox"]) input` | フィールドの投影 |
| [`styles.css:147`](../templates/angular/styles.css#L147) | `.ui-form-field:has(input.ui-field-control[type="checkbox"]) .ui-form-field-hint, .ui-form-field:has(input.ui-field-control[type="checkbox"]) .ui-form-field-error` | フィールドの投影 |
| [`styles.css:149`](../templates/angular/styles.css#L149) | `.ui-form-field[data-label-position="above"]:has(input.ui-field-control[type="checkbox"])` | フィールドの投影 |
| [`styles.css:150`](../templates/angular/styles.css#L150) | `.ui-form-field[data-label-position="above"]:has(input.ui-field-control[type="checkbox"]) .ui-form-field-label` | フィールドの投影 |
| [`styles.css:151`](../templates/angular/styles.css#L151) | `.ui-form-field[data-label-position="above"]:has(input.ui-field-control[type="checkbox"]) input` | フィールドの投影 |
| [`styles.css:152`](../templates/angular/styles.css#L152) | `.ui-form-field[data-label-position="inline"]:has(input.ui-field-control[type="checkbox"])` | フィールドの投影 |
| [`styles.css:153`](../templates/angular/styles.css#L153) | `.ui-form-field[data-label-position="inline"]:has(input.ui-field-control[type="checkbox"]) .ui-form-field-label` | フィールドの投影 |
| [`styles.css:154`](../templates/angular/styles.css#L154) | `.ui-form-field[data-label-position="inline"]:has(input.ui-field-control[type="checkbox"]) input` | フィールドの投影 |
| [`styles.css:155`](../templates/angular/styles.css#L155) | `.ui-field-control[aria-invalid="true"]` | 入力の共通形 |
| [`styles.css:156`](../templates/angular/styles.css#L156) | `.ui-field-control:disabled` | 入力の共通形 |
| [`styles.css:158`](../templates/angular/styles.css#L158) | `.ui-async-region__notice, .ui-action-feedback__panel` | 状態通知 |
| [`styles.css:163`](../templates/angular/styles.css#L163) | `.ui-async-region__message, .ui-action-feedback__message` | 状態通知 |
| [`styles.css:164`](../templates/angular/styles.css#L164) | `.ui-async-region[data-state="partial"] .ui-async-region__notice, .ui-async-region[data-state="stale"] .ui-async-region__notice, .ui-action-feedback[data-state="unknown"] .ui-action-feedback__panel, .ui-action-feedback[data-state="warning"] .ui-action-feedback__panel` | 状態通知 |
| [`styles.css:171`](../templates/angular/styles.css#L171) | `.ui-async-region[data-state="error"] .ui-async-region__notice, .ui-action-feedback[data-state="error"] .ui-action-feedback__panel` | 状態通知 |
| [`styles.css:177`](../templates/angular/styles.css#L177) | `.ui-radio-option` | ラジオの投影 |
| [`styles.css:184`](../templates/angular/styles.css#L184) | `.ui-radio-option__input` | ラジオの投影 |
| [`styles.css:185`](../templates/angular/styles.css#L185) | `.ui-radio-option__input:focus-visible` | ラジオの投影 |
| [`styles.css:188`](../templates/angular/styles.css#L188) | `@media (prefers-reduced-motion: reduce)` 内の `.ui-action` | 操作の共通形 |
| [`styles.css:192`](../templates/angular/styles.css#L192) | `@media (forced-colors: active)` 内の `.ui-action:focus-visible, .ui-field-control:focus-visible` | 共有フォーカス |
| [`styles.css:193`](../templates/angular/styles.css#L193) | `@media (forced-colors: active)` 内の `.ui-action:disabled, .ui-action--disabled, .ui-action--busy` | 操作の共通形 |
| [`styles.css:197`](../templates/angular/styles.css#L197) | `ui-aspect-ratio > img, ui-aspect-ratio > video, ui-aspect-ratio > iframe` | メディアの投影 |
| [`styles.css:199`](../templates/angular/styles.css#L199) | `.ui-action[data-size="small"],.ui-button-group[data-size="small"]>.ui-action:not([data-size])` | 操作グループ |
| [`styles.css:200`](../templates/angular/styles.css#L200) | `.ui-action[data-size="medium"],.ui-button-group[data-size="medium"]>.ui-action:not([data-size])` | 操作グループ |
| [`styles.css:201`](../templates/angular/styles.css#L201) | `.ui-action[data-size="large"],.ui-button-group[data-size="large"]>.ui-action:not([data-size])` | 操作グループ |
| [`styles.css:202`](../templates/angular/styles.css#L202) | `.ui-action[data-width="full"]` | 操作の共通形 |
| [`styles.css:203`](../templates/angular/styles.css#L203) | `.ui-action-icon` | 操作の共通形 |
| [`styles.css:204`](../templates/angular/styles.css#L204) | `.ui-action-icon:empty` | 操作の共通形 |
| [`styles.css:205`](../templates/angular/styles.css#L205) | `.ui-icon-button[aria-pressed="true"],.ui-toggle-button[aria-pressed="true"]` | 操作の押下 |
| [`styles.css:206`](../templates/angular/styles.css#L206) | `.ui-button-group[data-connected="true"]>.ui-action` | 操作グループ |
| [`styles.css:207`](../templates/angular/styles.css#L207) | `.ui-button-group[data-connected="true"][data-direction="horizontal"]>.ui-action:not(:first-child)` | 操作グループ |
| [`styles.css:208`](../templates/angular/styles.css#L208) | `.ui-button-group[data-connected="true"][data-direction="horizontal"]>.ui-action:not(:last-child)` | 操作グループ |
| [`styles.css:209`](../templates/angular/styles.css#L209) | `.ui-button-group[data-connected="true"][data-direction="vertical"]>.ui-action:not(:first-child)` | 操作グループ |
| [`styles.css:210`](../templates/angular/styles.css#L210) | `.ui-button-group[data-connected="true"][data-direction="vertical"]>.ui-action:not(:last-child)` | 操作グループ |
| [`styles.css:213`](../templates/angular/styles.css#L213) | `ui-card .ui-card__body > :first-child` | カードの投影 |
| [`styles.css:214`](../templates/angular/styles.css#L214) | `ui-card .ui-card__body > :last-child, ui-card footer > :last-child` | カードの投影 |
| [`specialist.css:2`](../templates/angular/specialist.css#L2) | `ui-rich-text-editor .ui-rich-editor` | ProseMirror |
| [`specialist.css:3`](../templates/angular/specialist.css#L3) | `ui-rich-text-editor .ui-rich-editor:focus-visible` | ProseMirror |
| [`specialist.css:4`](../templates/angular/specialist.css#L4) | `ui-rich-text-editor .ui-rich-editor img,ui-markdown-preview .ui-markdown-content img` | リッチ文書 |
| [`specialist.css:5`](../templates/angular/specialist.css#L5) | `ui-rich-text-editor .ui-rich-editor a,ui-markdown-preview .ui-markdown-content a` | リッチ文書 |
| [`specialist.css:6`](../templates/angular/specialist.css#L6) | `ui-markdown-preview .ui-markdown-content table` | Markdown |
| [`specialist.css:7`](../templates/angular/specialist.css#L7) | `ui-markdown-preview .ui-markdown-content th,ui-markdown-preview .ui-markdown-content td` | Markdown |
| [`specialist.css:8`](../templates/angular/specialist.css#L8) | `ui-markdown-preview .ui-markdown-content pre` | Markdown |
| [`specialist.css:9`](../templates/angular/specialist.css#L9) | `ui-diff-viewer .cm-mergeView` | CodeMirror |
| [`specialist.css:10`](../templates/angular/specialist.css#L10) | `ui-diff-viewer .cm-mergeView .cm-editor` | CodeMirror |
| [`specialist.css:11`](../templates/angular/specialist.css#L11) | `ui-map .maplibregl-canvas:focus-visible,ui-map .ui-map-marker:focus-visible` | MapLibre |
| [`specialist.css:12`](../templates/angular/specialist.css#L12) | `ui-map .maplibregl-attrib-button` | MapLibre |
| [`specialist.css:13`](../templates/angular/specialist.css#L13) | `@media (prefers-reduced-motion:reduce)` 内の `ui-map *,ui-rich-text-editor *,ui-code-editor *,ui-diff-viewer *` | 動きの軽減 |
