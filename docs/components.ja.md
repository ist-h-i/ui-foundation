# 部品一覧

[English component overview](components.en.md)

画面で実現したい操作から、生成される Angular 部品を探すための一覧です。導入と生成は [CLI コマンド](commands.ja.md)、アプリへの組込み・依存関係・CSS・worker の配置は [生成 UI の利用ガイド](ui-library-consumer-guide.ja.md)を参照してください。

下表は Angular の公開名です。利用する部品に合わせて生成先の公開入口を選びます。 [公開入口と Angular のビルド](ui-library-consumer-guide.ja.md#公開入口と-angular-のビルド)npm パッケージ本体から Angular 部品を直接 import する使い方ではありません。生成先の既定値は `.ui/generated/` です。必要な standalone 部品と、使う投影用 directive を利用画面の `imports` に追加します。

一覧では用途の近い部品を同じ行にまとめています。型・純関数・サービスを含む公開 API 全体は [API 目録](ui-library-api.json)、入力・イベント・復旧の詳細は各行のリンクを参照してください。

## 配置・コンテナ

| 公開名 | 主な用途・機能 | 詳細 API |
| --- | --- | --- |
| `PageFrame` | ページ見出し、判断材料、操作、本文の枠組み。アプリ側で `main` を配置する。 | [PageFrame](ui-components.md#pageframe) |
| `Container` / `Stack` | 最大幅・背景・見出しを持つ領域、縦横の整列・間隔・折返し。 | [配置とコンテナ](ui-components.md#配置とコンテナ) |
| `Grid` / `GridCell` | 列・行・結合と、コンテナ幅に応じた配置変更。 | [配置とコンテナ](ui-components.md#配置とコンテナ) |
| `Panel` / `Accordion` / `AccordionItem` | 見出し付き領域と単一・複数の開閉。折畳み中も入力を保持。 | [配置とコンテナ](ui-components.md#配置とコンテナ) |
| `Splitter` | 2領域の比率変更・折畳み。ポインターとキー・ボタンの操作。 | [配置とコンテナ](ui-components.md#配置とコンテナ) |
| `Divider` / `Spacer` | 区切り線・ラベル、意味トークンに従う余白。 | [配置とコンテナ](ui-components.md#配置とコンテナ) |
| `ScrollArea` / `StickyRegion` | 局所スクロールと最寄りスクロール領域内の固定表示。 | [配置とコンテナ](ui-components.md#配置とコンテナ) |
| `AspectRatio` / `ResponsiveVisibility` | 媒体の縦横比、幅条件による表示切替。必須操作を隠すかはアプリが判断。 | [配置とコンテナ](ui-components.md#配置とコンテナ) |
| `Card` | 見出し・本文・媒体・フッター・操作の領域、外観・向き・開閉・読込み。 | [Cardと領域](ui-components.md#cardと領域) |

Card の領域には `CardHeader` / `CardBody` / `CardFooter` / `CardMedia` / `CardActions`、差替えには `CardTemplate` を使います。Card の読込み表示だけでは、本文の業務操作を無効にしません。

## ボタン・操作

| 公開名 | 主な用途・機能 | 詳細 API |
| --- | --- | --- |
| `ActionControl` / `ActionLink` | native button / link に主操作・副操作・危険操作の外観、処理中・無効、アイコン・幅・サイズを接続。 | [操作部品](ui-components.md#操作部品) |
| `IconButton` / `ButtonGroup` | 名前付きアイコンボタン、ボタン群の配置・共通サイズ。 | [操作部品](ui-components.md#操作部品) |
| `ToggleButton` / `SegmentedControl` | ON/OFF、単一・複数の選択。SegmentedControl はフォーム値に接続可能。 | [操作部品](ui-components.md#操作部品) |
| `SplitButton` / `FloatingActionButton` | 主操作とメニュー、画面端の主操作と補助操作。 | [操作部品](ui-components.md#操作部品) |
| `Toolbar` | 操作群のキーボード移動、収まらない項目のメニュー化、sticky 表示。 | [操作部品](ui-components.md#操作部品) |
| `CopyButton` | Clipboard API によるコピーと、完了・失敗・再試行の表示。 | [操作部品](ui-components.md#操作部品) |

## フォーム・選択・条件編集

| 公開名 | 主な用途・機能 | 詳細 API |
| --- | --- | --- |
| `FormField` / `FieldControl` | native 入力のラベル・説明・エラーとの関連付け。 | [FormField / FieldControl](ui-components.md#formfield--fieldcontrol) |
| `FormLayout` / `FormGroup` / `InputGroup` | 列・ラベル配置、fieldset によるグループ、入力前後の補助領域。 | [フォームと候補入力](ui-components.md#フォームと候補入力) |
| `FormActions` / `FormErrorSummary` | submit・reset・cancel、エラー一覧から入力への移動。 | [フォーム配置](ui-components.md#フォームと候補入力)・[フォーム操作](ui-components.md#構造化入力とフォーム操作) |
| `TextInput` / `Textarea` | 単行・複数行、文字数・クリア・自動高さ。 | [フォームと候補入力](ui-components.md#フォームと候補入力) |
| `NumberInput` / `PasswordInput` / `SearchInput` | 数値の範囲・刻み、パスワード表示切替、待機時間付き検索と候補要求。 | [フォームと候補入力](ui-components.md#フォームと候補入力) |
| `Checkbox` / `Switch` / `RadioGroup` / `RadioOption` | 真偽・中間状態、切替、ラジオの単一選択。 | [候補入力](ui-components.md#フォームと候補入力)・[RadioGroup / RadioOption](ui-components.md#radiogroup--radiooption) |
| `Select` / `MultiSelect` / `Combobox` | native 選択、複数選択・検索、候補選択と任意入力。非同期候補は要求 ID と検索語を照合。 | [フォームと候補入力](ui-components.md#フォームと候補入力) |
| `MaskedInput` / `OTPInput` / `TagInput` | 書式付き文字入力、コード入力、文字列の追加・削除。 | [構造化入力とフォーム操作](ui-components.md#構造化入力とフォーム操作) |
| `Slider` / `RangeSlider` / `Knob` / `Rating` | 数値・範囲・目盛り・評価の選択。キーや native 入力の代替操作を持つ。 | [数値・色・編集・段階・条件](ui-components.md#数値色編集段階条件) |
| `ColorPicker` | hex/rgb/hsl、透明度・パレット・文字入力。 | [数値・色・編集・段階・条件](ui-components.md#数値色編集段階条件) |
| `InlineEdit` | インライン編集、保存要求への応答、失敗時の下書き保持。 | [数値・色・編集・段階・条件](ui-components.md#数値色編集段階条件) |
| `Wizard` / `WizardStep` | 段階移動・分岐・移動承認待ち。非表示の段階も入力を保持。 | [数値・色・編集・段階・条件](ui-components.md#数値色編集段階条件) |
| `FilterBuilder` | 型付き項目の再帰 AND/OR 条件、検証・保存要求・復元。 | [数値・色・編集・段階・条件](ui-components.md#数値色編集段階条件) |

候補の表示差替えには `ComboboxOption`、条件の型付き context には `FilterGroupContext` を使います。フォーム対応部品では Angular forms の値と `value/valueChange` のどちらかに所有者を決めます。表示エラーの時機、送信時の検証、保存、OTP の認証成否はアプリが扱います。[フォーム接続の共通契約](ui-library-runtime-foundation-spec.ja.md#フォームと未確定draft)も参照してください。

## 日付・予定

| 公開名 | 主な用途・機能 | 詳細 API |
| --- | --- | --- |
| `Calendar` / `DatePicker` | 月・年表示、日付選択、範囲・選択不可日、明示書式の入力。 | [Calendar と日付入力](ui-components.md#calendar-と日付入力) |
| `TimePicker` / `DateTimePicker` | 時刻・日時、刻み・範囲・時刻帯の指定。 | [Calendar と日付入力](ui-components.md#calendar-と日付入力) |
| `MonthPicker` / `YearPicker` / `DateRangePicker` | 月・年・期間選択。期間上限・プリセット・複数月表示。 | [Calendar と日付入力](ui-components.md#calendar-と日付入力) |
| `Scheduler` / `Agenda` | 日・週・月・一覧の予定表示（Agenda は一覧固定）、資源・時間帯の絞込み、予定移動要求。 | [要求と表示](ui-library-scheduler-expansion-spec.ja.md#要求と表示)・[入力と出力](ui-library-scheduler-expansion-spec.ja.md#inputs--outputs) |

日セルは `CalendarDay`、予定は `SchedulerEventTemplate` で表示を差し替えます。日付だけの値を暗黙に instant へ変換しません。Scheduler には time zone と `temporal-polyfill` が必要です。予定移動は日時・資源の入力と実行ボタンから要求し、保存・業務認可・DST の判断はアプリが行います。

## ナビゲーション

| 公開名 | 主な用途・機能 | 詳細 API |
| --- | --- | --- |
| `Navigation` / `NavigationItem` / `Breadcrumb` | native リンクの配置、現在地、パンくず。 | [Navigation / Breadcrumb / NavigationItem](ui-components.md#navigation--breadcrumb--navigationitem) |
| `SideNav` / `BottomNavigation` | 階層付きサイドナビと、平坦な画面移動先のバー。 | [SideNav / NavigationRail / BottomNavigation / Dock](ui-components.md#sidenav--navigationrail--bottomnavigation--dock) |
| `AnchorNavigation` | 同一ページ内の対象への移動と現在位置表示。 | [AnchorNavigation](ui-components.md#anchornavigation) |
| `Tabs` / `TabPanel` | タブと内容の切替。非表示の本文も保持。 | [Tabs / TabPanel](ui-components.md#tabs--tabpanel) |
| `Menubar` / `MegaMenu` | 階層メニュー、グループ表示、キーボード移動。 | [Menubar / MegaMenu](ui-components.md#menubar--megamenu) |
| `CommandPalette` | コマンド検索・選択・実行要求と失敗時の再試行。 | [CommandPalette](ui-components.md#commandpalette) |

URL・現在地・履歴と Angular Router の設定はアプリが所有します。既存 Navigation / ActionLink と `RouterLink` 等の合成は未検証です。BottomNavigation へ階層項目は渡せません。固定配置を使う場合の本文余白もアプリで確保します。

## ダイアログ・浮動表示

| 公開名 | 主な用途・機能 | 詳細 API |
| --- | --- | --- |
| `Disclosure` | 本文の開閉と入力保持。 | [Disclosure](ui-components.md#disclosure) |
| `Dialog` | native dialog、modal・非 modal、終了理由・終了保留、移動・サイズ変更。 | [Dialogの拡張と各種Dialog](ui-components.md#dialogの拡張と各種dialog) |
| `ConfirmDialog` / `AlertDialog` / `FormDialog` | 確認・明示応答、未保存確認付きフォーム。 | [Dialogの拡張と各種Dialog](ui-components.md#dialogの拡張と各種dialog) |
| `DynamicDialogHost` | `DynamicDialogService` から指定した Angular component を表示。一 scope に一 host。 | [Dialogの拡張と各種Dialog](ui-components.md#dialogの拡張と各種dialog) |
| `Drawer` / `BottomSheet` | 画面端の領域、段階的な高さ変更。 | [端の領域と浮動表示](ui-components.md#端の領域と浮動表示) |
| `Popover` / `Tooltip` / `HoverCard` / `ConfirmPopover` | 対象に結び付く補助情報・操作・確認。Tooltip に操作は置かない。 | [端の領域と浮動表示](ui-components.md#端の領域と浮動表示) |
| `Menu` / `OverlayHost` | 階層・チェック・ラジオ・context メニュー、浮動表示 scope の調停。 | [MenuとOverlay](ui-components.md#menuとoverlay) |
| `MoveHandle` / `ResizeHandle` | 対象領域の移動・リサイズをポインターと矢印キーで操作。 | [MenuとOverlay](ui-components.md#menuとoverlay) |

本文の差替えには `DialogTemplate` / `PopupTemplate` を使います。終了・確認イベントは保存成功の証拠ではありません。フォームの下書き、業務処理の取消、未保存判断はアプリへ接続します。

## 通知・状態・進捗

| 公開名 | 主な用途・機能 | 詳細 API |
| --- | --- | --- |
| `AsyncRegion` / `ActionFeedback` | 取得中・部分欠損・古い情報、処理結果・結果不明と復旧操作。 | [通知一覧と状態表示](ui-components.md#通知一覧と状態表示) |
| `Alert` / `EmptyState` / `ResultState` | 常設通知、0件・検索0件、結果の詳細と次の操作。 | [通知一覧と状態表示](ui-components.md#通知一覧と状態表示) |
| `ProgressBar` / `Spinner` / `Skeleton` / `LoadingOverlay` | 確定・不定の進捗、遅延表示、装飾 placeholder、対象領域の操作抑止。 | [通知一覧と状態表示](ui-components.md#通知一覧と状態表示) |
| `Snackbar` / `NotificationHost` / `NotificationScope` | 一時通知、通知キューと重複・同時表示数、modal 内などの通知 scope。`NotificationService` から通知を追加。 | [Snackbar・Toast・通知ホスト](ui-components.md#snackbartoast通知ホスト) |
| `NotificationCenter` | 未読・分類・絞込み、既読・削除・追加取得の要求。 | [通知一覧と状態表示](ui-components.md#通知一覧と状態表示) |
| `Tour` | 実要素に結び付く手順案内、次・戻る・終了、表示済み ID の通知。 | [通知一覧と状態表示](ui-components.md#通知一覧と状態表示) |

取消・Undo・既読変更・案内の完了などの業務上の結果と永続化はアプリが扱います。結果不明・未取得・部分欠損を成功や0件に置き換えません。

## 一覧・コレクション・階層

| 公開名 | 主な用途・機能 | 詳細 API |
| --- | --- | --- |
| `GridList` / `List` / `Masonry` / `DataView` | グリッド、通常一覧、高さの異なる一覧、検索・ソート・ページ・表示形式の切替。 | [GridList と Icon](ui-components.md#gridlist-と-icon)・[一覧・選択・仮想化・移動](ui-components.md#一覧選択仮想化移動) |
| `Listbox` / `VirtualList` | 単一・複数選択、固定行高の仮想一覧。 | [一覧・選択・仮想化・移動](ui-components.md#一覧選択仮想化移動) |
| `SortableList` / `TransferList` | 順序変更、左右一覧間の選択・一括移動。ドラッグのほかキー・ボタン操作を用意。 | [一覧操作](ui-components.md#一覧選択仮想化移動)・[TransferとTimeline](ui-components.md#transferとtimelineの契約) |
| `InfiniteScroll` / `Timeline` | 続きの取得、日時・種別・詳細付きの活動一覧。 | [一覧操作](ui-components.md#一覧選択仮想化移動)・[TransferとTimeline](ui-components.md#transferとtimelineの契約) |
| `Tree` / `TreeItem` | 展開・選択・チェック・検索と遅延取得。 | [Tree / TreeItem](ui-library-tree-expansion-spec.ja.md#tree--treeitem) |
| `TreeSelect` / `Cascader` | ツリーからの単一・複数選択、階層経路の選択。 | [TreeSelect / CascaderとCVA](ui-library-tree-expansion-spec.ja.md#treeselect--cascaderとcva) |
| `OrganizationChart` | 親子関係の組織図、4方向の配置、ノード開閉。 | [OrganizationChart](ui-library-tree-expansion-spec.ja.md#organizationchart) |

表示差替えには `GridItem` / `CollectionItem` / `ListChoiceTemplate` / `VirtualItem` / `TransferItem` / `TimelineItem` / `TreeNodeTemplate` を使います。安定キーと一覧・選択状態はアプリで保持します。仮想一覧の投影内容には固定行高の契約があり、描画外も含む編集状態をアプリで管理します。CDK、非同期応答、native radio の制約は [一覧の詳細](ui-components.md#一覧選択仮想化移動)を確認してください。

## 表・データグリッド

| 公開名 | 主な用途・機能 | 詳細 API |
| --- | --- | --- |
| `DataTable` / `TableContainer` | native table の外観と名前付きスクロール領域。 | [DataTable / TableContainer](ui-components.md#datatable--tablecontainer) |
| `DataTableView` / `Pagination` | 型付き行・列、検索・ソート・ページ・選択・行操作、状態表示。 | [DataTableView](ui-library-table-expansion-spec.ja.md#datatableviewの入力とイベント) |
| `DataGrid` / `TreeGrid` | セル移動・範囲選択・貼付け要求、階層行・遅延取得。 | [DataGrid](ui-library-table-expansion-spec.ja.md#datagridの移動選択clipboard)・[TreeGrid](ui-library-table-expansion-spec.ja.md#treegridの階層と取得) |
| `VirtualDataTable` | 固定行高の仮想表、追加取得・通常表への復旧。 | [仮想化・追加取得・通常表への復旧](ui-library-table-expansion-spec.ja.md#仮想化追加取得通常表への復旧) |
| `CellEditor` / `RowEditor` | セル・行の下書き、検証・保存応答と入力保持。 | [編集、応答、入力保持](ui-library-table-expansion-spec.ja.md#編集応答入力保持) |
| `ColumnFilter` / `ColumnChooser` / `FilterChips` / `SearchPanel` / `TableToolbar` | 列条件・表示列・条件解除・保存検索・一括操作・出力要求。 | [列条件、検索、列設定](ui-library-table-expansion-spec.ja.md#列条件検索列設定) |
| `TableColumnResize` | 列幅変更。 | [幅、多段見出し、固定表示、行group](ui-library-table-expansion-spec.ja.md#幅多段見出し固定表示行group) |

セル・見出し・詳細行などは `TableTemplate` で差し替えます。行・列・状態は immutable な参照で渡します。Clipboard・CSV・印刷の出力範囲と実 I/O、保存・競合検証は [出力と I/O の境界](ui-library-table-expansion-spec.ja.md#出力対象とioの境界)に従い、アプリへ接続します。

## 文字・情報・数値表示

| 公開名 | 主な用途・機能 | 詳細 API |
| --- | --- | --- |
| `Typography` / `Icon` | native タグの意味を保つ文字表現、登録した Lucide アイコン。 | [文字・情報・数値表示](ui-components.md#文字情報数値表示)・[Icon](ui-components.md#gridlist-と-icon) |
| `Badge` / `Tag` / `Avatar` / `AvatarGroup` | 件数・状態、選択・削除要求、人物画像と代替表示・上限外の氏名。 | [文字・情報・数値表示](ui-components.md#文字情報数値表示) |
| `Descriptions` / `Statistic` / `Meter` / `MeterGroup` | 項目と値、数値と比較、範囲値・内訳。0・欠損・比較不能を区別。 | [文字・情報・数値表示](ui-components.md#文字情報数値表示) |
| `HelpText` / `ShortcutHint` / `ReadMore` | 常設説明、キー表示、実際にあふれた文章の展開。 | [文字・情報・数値表示](ui-components.md#文字情報数値表示) |
| `CodeBlock` / `InlineCode` / `Watermark` | コードの文字表示・コピー、装飾用の透かし。 | [文字・情報・数値表示](ui-components.md#文字情報数値表示) |

Descriptions の値の差替えには `DescriptionTemplate` を使います。Icon は個別データまたは `provideUiIcons()` で登録します。ShortcutHint はキー処理を実装せず、Watermark は認証やコピー防止を保証しません。

## ファイル・画像・音声・動画

| 公開名（別名 export） | 主な用途・機能 | 詳細 API |
| --- | --- | --- |
| `FileUpload`（`Dropzone`）/ `UploadList`（`AttachmentList`） | 形式・容量・件数の検証、picker/drop、進捗・取消・再試行の要求。 | [入力とイベント](ui-library-media-expansion-spec.ja.md#入力とイベント) |
| `Image` / `ImageViewer`（`Lightbox`）/ `Gallery`（`Carousel`） | alt・比率・取得状態、拡大・回転、前後移動・自動送り。 | [入力とイベント](ui-library-media-expansion-spec.ja.md#入力とイベント) |
| `ImageCompare` / `ImageCropper` | 画像比較の境界操作、切抜き・比率・回転と PNG の確定。 | [入力とイベント](ui-library-media-expansion-spec.ja.md#入力とイベント) |
| `PDFViewer`（`FilePreview`） | PDF.js のページ描画、ページ・倍率・元 PDF の download。 | [入力とイベント](ui-library-media-expansion-spec.ja.md#入力とイベント) |
| `MediaPlayer`（`AudioPlayer` / `VideoPlayer`） | native 音声・動画、再生・音量・速度・字幕・全画面。 | [入力とイベント](ui-library-media-expansion-spec.ja.md#入力とイベント) |
| `QRCode` / `Barcode` | QR・バーコードの符号化と文字による説明。 | [入力とイベント](ui-library-media-expansion-spec.ja.md#入力とイベント) |

括弧内は同じ実装の別名で、独立した機能実装ではありません。実 upload・保存・削除・認可はアプリが担当します。PDF.js、QR・バーコードの engine と型、PDF の worker・補助資産・ライセンス、画像の取得条件は [所有と復旧](ui-library-media-expansion-spec.ja.md#所有と復旧)と [配布資産](ui-library-consumer-guide.ja.md#css-と配布資産)を参照してください。

## 専門部品

| 公開名 | 主な用途・機能 | 主な追加条件・詳細 API |
| --- | --- | --- |
| `Chart` / `Sparkline` | ECharts の各種グラフ、選択・凡例、全文の値表、欠損を分けた小グラフ。 | `echarts`。[図・地図・時間軸・board](ui-library-specialist-expansion-spec.ja.md#図地図時間軸board) |
| `MapView` | MapLibre の地図、地点・領域・カメラ・選択。 | `maplibre-gl`、worker/shared ESM、専用 CSS。tile・font・帰属・通信契約はアプリ指定。[詳細](ui-library-specialist-expansion-spec.ja.md#図地図時間軸board) |
| `Gantt` / `Kanban` | 期間・進捗・依存線、列間・順序移動の要求。 | Kanban の drag/drop は CDK。[詳細](ui-library-specialist-expansion-spec.ja.md#図地図時間軸board) |
| `Spreadsheet` | 単一矩形の編集・選択・固定行列、数式計算、CSV/JSON 入出力要求。 | `fast-formula-parser`、生成した計算 worker の別ビルド。全 Excel 関数・XLSX・複数 sheet の互換ではない。[詳細](ui-library-specialist-expansion-spec.ja.md#spreadsheeteditor) |
| `CodeEditor` / `RichTextEditor` | 言語・補完・履歴付きコード入力、schema に従うリッチテキスト。 | CodeMirror / ProseMirror。[Spreadsheet・editor](ui-library-specialist-expansion-spec.ja.md#spreadsheeteditor) |
| `MarkdownEditor` / `MarkdownPreview` | Markdown の編集・preview・分割表示、表示専用 preview。 | CodeMirror / `marked`、Angular sanitizer。[詳細](ui-library-specialist-expansion-spec.ja.md#spreadsheeteditor) |
| `DiffViewer` / `JsonViewer` | 差分・検索・移動、原文を保持した JSON の展開・検索・コピー。 | CodeMirror MergeView / `jsonc-parser`。[詳細](ui-library-specialist-expansion-spec.ja.md#spreadsheeteditor) |
| `FileExplorer` | tree/list/grid、展開・検索・選択、open・rename・delete 等の要求。 | 実 storage と操作結果はアプリ側。[ファイル・flow・chat](ui-library-specialist-expansion-spec.ja.md#ファイルflowchat) |
| `FlowEditor` | グラフ編集・拡大率・選択、Dagre の配置を SVG へ反映。 | `@dagrejs/dagre`、変更・配置要求をアプリへ返す。[詳細](ui-library-specialist-expansion-spec.ja.md#ファイルflowchat) |
| `Chat` / `MessageList` / `MessageComposer` | メッセージ、編集中テキスト、添付、送信・再送・追加取得要求。 | backend・添付処理・送信結果をアプリへ接続。[詳細](ui-library-specialist-expansion-spec.ja.md#ファイルflowchat) |

各 engine と型は利用アプリで解決できるように導入します。公開入口が専門部品の生成ソースも参照するため、使う画面の部品だけを見て依存を省けるとは限りません。正確な依存一覧と worker・CSS・資産・NOTICE の供給は [利用ガイド](ui-library-consumer-guide.ja.md#依存関係)に従ってください。

## 共通の言語・方向・プロファイル

`provideUiLocale` と `UiLocaleScope`（`[uiLocale]`）で、ライブラリ文言、数値や日付の書式、表示方向を設定します。部品の文言を上書きするときは安定IDと名前付き引数を使います。業務ラベルやデータはアプリが翻訳します。[言語の切り替えと外部翻訳の接続例](ui-library-consumer-guide.ja.md#locale文言rtl-の責任)を参照してください。生成したプロファイルは `data-ui-profile` で適用し、部品と画面は用途別セマンティックトークンを使います。

## 開発元の操作サンプル

以下は **ui-foundation の開発用 fixture** です。公開 Web サンプルの URL ではありません。npm を導入した利用アプリにこれらのファイルや経路が作られることもありません。実装例を読む場合は開発元リポジトリのソースを参照してください。以下のGitHubリンクの閲覧には、開発元リポジトリへのアクセス権が必要です。

[fixture の入口](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/main.ts)は、URL の pathname に応じて次のカタログを起動します。開発元のソースは任意の実装例であり、導入や利用の必須入力ではありません。

| fixture 内の pathname | ソースと対象 |
| --- | --- |
| `/catalog` | [基本部品・入力・日付](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/catalog.ts) |
| `/catalog/layout` | [配置・コンテナ](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/layout-catalog.ts) |
| `/catalog/actions` | [ボタン・操作](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/actions-catalog.ts) |
| `/catalog/forms` / `/catalog/choices` | [構造化フォーム](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/structured-form-catalog.ts)・[数値・色・編集・段階・条件](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/choice-catalog.ts) |
| `/catalog/navigation` / `/catalog/floating` | [ナビゲーション](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/navigation-catalog.ts)・[浮動表示](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/floating-catalog.ts) |
| `/catalog/feedback` / `/catalog/display` | [通知・状態](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/feedback-catalog.ts)・[情報表示](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/display-catalog.ts) |
| `/catalog/collections` / `/catalog/transfers` | [一覧](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/collection-catalog.ts)・[左右移動・時間順一覧](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/transfer-timeline-catalog.ts) |
| `/catalog/trees` / `/catalog/scheduler` | [階層](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/tree-catalog.ts)・[予定](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/scheduler-catalog.ts) |
| `/catalog/tables` / `/catalog/media` | [表](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/table-catalog.ts)・[媒体](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/media-catalog.ts) |
| `/catalog/specialist` / `/catalog/foundation` | [専門部品](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/specialist-catalog.ts)・[フォーム・locale・方向・プロファイル](https://github.com/ist-h-i/ui-foundation/blob/main/tests/fixture-app/foundation-catalog.ts) |

fixture の静的検査・操作試験・画像は、それぞれの条件での検証資料です。実スクリーンリーダー、SSR/hydration、任意の Router 統合、利用アプリの通信・復元や業務での使いやすさの確認は、アプリの構成に合わせて行ってください。

入力前に確認すべき条件はFormFieldの補足位置を使って提示する。入力内容に応じて入力欄の幅を調整し、狭い画面でも操作できるようにする。リセットは必要な場合のみ表示する。詳細は[部品仕様](ui-components.md#formfield--fieldcontrol)を参照する。
