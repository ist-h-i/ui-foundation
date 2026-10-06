# 共通UIライブラリ整備の依頼原文（2026-10-05）

以下はユーザーの要求原文です。実装状況は別の要求マトリクスで管理します。部品名・プロパティ名は設計案であり、機能の省略を意味しません。

並行作業で、ui-foundationに以下のコンポーネントを追加する作業を進めて完了まで進めてください。

**カードの各領域、入れ子メニュー、ダイアログ、通知の表示時間まで含めた、共通UIライブラリの整備対象一覧です。** 既存部品も含みます。部品名とプロパティ名は設計案です。

種類の抜けを確認するため、[PrimeNG](https://primeng.dev/card)と[Ant Design](https://ant.design/components/overview/?locale=en-US)の公式カタログも参照しました。

画面の構成・配置・コンテナとして、次を揃えます。

| コンポーネント | 制御する項目 |
| --- | --- |
| AppShell / PageFrame | ヘッダー、サイドバー、本文、フッター、操作領域、固定表示 |
| Container / Section | 最大幅、余白、配置、背景、見出し |
| Stack / Flex / Space | 縦横方向、間隔、整列、折返し |
| Grid | 列数、行数、間隔、セル結合、画面幅別の配置 |
| **Card / CardHeader / CardBody / CardFooter / CardMedia / CardActions** | 各領域の表示、内容、配置、余白、枠、影、折畳み、読込み状態 |
| Panel / Fieldset | 見出し、操作領域、枠、開閉、無効状態 |
| Accordion / Disclosure | 単一・複数展開、初期展開、展開状態、開閉アイコン |
| Splitter / ResizablePanel | 分割方向、初期比率、最小・最大サイズ、リサイズ、折畳み |
| Divider / Separator / Spacer | 縦横方向、線種、間隔、ラベル |
| ScrollArea | スクロール方向、高さ、スクロール位置 |
| Affix / StickyRegion | 固定位置、固定開始位置、対象スクロール領域 |
| AspectRatio | 縦横比、内容の収め方 |
| ResponsiveVisibility | 画面幅に応じた表示・非表示 |

ボタン・操作部品には、次が必要です。

| コンポーネント | 制御する項目 |
| --- | --- |
| Button / ActionControl | 種別、サイズ、処理中、無効、幅、アイコン位置 |
| IconButton | アイコン、説明ラベル、形状、サイズ、選択状態 |
| Link / ActionLink | 遷移先、外部リンク表示、無効、処理中 |
| ButtonGroup | 方向、間隔、連結表示、共通サイズ |
| ToggleButton | ON/OFF、選択時の文言・アイコン |
| SegmentedControl | 単一・複数選択、選択肢、方向、均等幅 |
| SplitButton | 主操作、補助メニュー、メニュー位置、無効 |
| FloatingActionButton / SpeedDial | 固定位置、展開方向、補助操作、開閉 |
| Toolbar / ActionBar | 操作の配置、区切り、狭幅時の退避メニュー、固定 |
| Icon | アイコン名、サイズ、意味色、装飾用／説明付き |
| CopyButton | コピー対象、成功・失敗表示、表示時間 |

入力・選択・フォームには、次を揃えます。

| コンポーネント | 制御する項目 |
| --- | --- |
| FormField | ラベル、必須、説明、エラー、ラベル位置 |
| FormLayout / FormGroup | 列数、方向、ラベル幅、間隔、グループ構成 |
| InputGroup | 前後のラベル・アイコン・ボタン、連結表示 |
| TextInput | 値、placeholder、文字数、クリア、読取り専用、無効 |
| Textarea | 行数、自動高さ、最大高さ、文字数 |
| NumberInput | 最小・最大、刻み、小数桁、単位、桁区切り |
| SearchInput | 検索、クリア、候補、入力待ち時間、取得状態 |
| PasswordInput | 表示切替、強度表示、補助説明 |
| MaskedInput | 入力書式、書式付き表示、未入力部分の扱い |
| OTPInput | 桁数、入力種別、一括貼付け、自動補完 |
| TagInput / TokenInput | 複数値、自由入力、重複、上限、個別削除 |
| Checkbox / CheckboxGroup | 選択、中間状態、選択上限、並び方 |
| RadioGroup | 選択肢、初期値、方向、個別無効 |
| Switch | ON/OFF、ラベル、処理中、無効 |
| Select | 選択肢、グループ、クリア、表示内容 |
| MultiSelect | 複数選択、全選択、検索、選択上限、選択済み表示 |
| Combobox / Autocomplete | 候補検索、自由入力可否、非同期候補、候補の描画 |
| Listbox | 単一・複数選択、検索、グループ、仮想スクロール |
| Cascader | 階層選択、途中階層の選択可否、遅延読込み |
| TreeSelect | ツリー選択、複数選択、親子の選択連動、検索 |
| TransferList / PickList | 左右移動、検索、複数選択、順序変更 |
| Slider / RangeSlider | 最小・最大、刻み、目盛り、単一値／範囲 |
| Knob | 値、範囲、刻み、単位、読取り専用 |
| Rating | 評価数、半段階、クリア、読取り専用 |
| ColorPicker | 色形式、透明度、パレット、自由選択 |
| InlineEdit | 表示／編集、保存、取消、エラー、処理中 |
| FormErrorSummary | エラー一覧、対象欄への移動、表示タイミング |
| FormActions | 送信、戻す、取消、処理中、操作配置 |
| Stepper / Wizard | 現在段階、進行可否、戻る、分岐、入力保持 |
| FilterBuilder / QueryBuilder | 条件、演算子、AND/OR、入れ子、保存・解除 |

日付入力と予定表示も、個別に必要です。

| コンポーネント | 制御する項目 |
| --- | --- |
| Calendar | 月・年表示、週開始曜日、選択日、無効日、日セルの内容 |
| DatePicker | 入力書式、最小・最大日、選択不可日、クリア |
| DateRangePicker | 開始・終了日、範囲制限、定型期間、複数月表示 |
| TimePicker | 時・分・秒、12/24時間、刻み、選択可能時間 |
| DateTimePicker | 日付と時刻、書式、範囲、タイムゾーンの扱い |
| MonthPicker / YearPicker | 選択範囲、表示形式、初期表示 |
| Scheduler / Agenda | 日・週・月・一覧表示、予定、リソース、時間帯、予定移動 |

ナビゲーションとメニューは、階層構造まで扱えるようにします。

| コンポーネント | 制御する項目 |
| --- | --- |
| Navigation / NavigationBar | 移動先、現在地、方向、アイコン、狭幅時の表示 |
| SideNav / NavigationRail | 入れ子、展開、折畳み、幅、現在地 |
| BottomNavigation / Dock | 項目、選択、ラベル、固定位置 |
| Breadcrumb | 階層、区切り、長い階層の折畳み |
| Tabs | 選択、縦横方向、スクロール、無効、閉じる、並べ替え |
| AnchorNavigation | ページ内移動、現在位置、固定、移動時の余白 |
| **Menu / MenuItem / Submenu / MenuGroup / MenuSeparator** | 再帰的な入れ子、項目種別、開閉、選択、無効、非表示 |
| DropdownMenu | 起動ボタン、配置、開く契機、選択後の終了 |
| ContextMenu | 右クリック・長押し、対象、表示位置 |
| Menubar | 横方向のメニュー、入れ子、選択、操作項目 |
| MegaMenu | 複数列、グループ、見出し、補助情報 |
| CommandPalette | コマンド検索、グループ、ショートカット、履歴 |

ダイアログと浮動表示には、次が必要です。

| コンポーネント | 制御する項目 |
| --- | --- |
| **Dialog** | 開閉、modal、ヘッダー・本文・フッター、サイズ、位置、終了条件 |
| ConfirmDialog | 確認内容、確認・取消操作、処理中、確認結果 |
| AlertDialog | 重要な通知、応答操作、終了条件 |
| FormDialog | 入力内容、検証、保存・取消、未保存時の終了確認 |
| Drawer | 左右上下の位置、幅・高さ、背景操作、閉じ方 |
| BottomSheet | 高さ、展開段階、閉じ方、操作領域 |
| Popover | 対象要素、表示位置、開く契機、外側クリック |
| Tooltip | 内容、位置、表示・非表示までの待ち時間 |
| HoverCard | プレビュー内容、表示遅延、操作領域 |
| ConfirmPopover | 対象操作、確認・取消、処理中 |
| DynamicDialog | 差替え内容、渡すデータ、戻り値、終了理由 |

通知・処理状態・結果表示も独立した部品として揃えます。

| コンポーネント | 制御する項目 |
| --- | --- |
| **Snackbar** | 自動消去ON/OFF、表示秒数、位置、操作、閉じるボタン |
| Toast | 表示時間、保持、位置、複数表示、積重ね、重複処理 |
| NotificationCenter | 通知一覧、未読、既読、分類、削除、追加読込み |
| Alert / Banner / InlineMessage | 意味種別、タイトル、本文、操作、閉じる |
| ActionFeedback | 成功・失敗・結果不明、説明、復旧操作、処理中 |
| AsyncRegion | 取得中、更新中、空、エラー、部分欠損、再試行 |
| EmptyState | 0件・検索結果なしの説明、補助操作、図 |
| ResultState | 完了・失敗などの結果、詳細、次の操作 |
| ProgressBar | 進捗値、総量、不定状態、ラベル、取消操作 |
| Spinner / CircularProgress | サイズ、進捗の有無、説明、表示遅延 |
| Skeleton | 形状、行数、サイズ、動きの有無 |
| BlockUI / LoadingOverlay | 対象領域、操作抑止、説明、取消操作 |
| Tour / Coachmark | 対象、段階、次・戻る・終了、再開、表示済み状態 |

リスト・ツリー・表には、次を含めます。

| コンポーネント | 制御する項目 |
| --- | --- |
| List / ListItem | 行構成、補助情報、アイコン、行操作、区切り |
| SelectionList | 単一・複数選択、全選択、選択不可項目 |
| GridList | 列数、間隔、項目サイズ、選択、画面幅別の配置 |
| Masonry | 列数、間隔、高さの異なる項目の配置 |
| DataView | リスト／グリッド切替、検索、ソート、ページ送り |
| VirtualList | 表示領域、項目高さ、先読み、スクロール位置 |
| InfiniteScroll | 追加取得、取得状態、終端、再試行 |
| Tree / TreeItem | 階層、展開、選択、チェック、遅延読込み |
| TreeTable / TreeGrid | 階層付き表、列、展開、選択、編集 |
| SortableList / OrderList | 並べ替え、移動可能範囲、移動操作 |
| Timeline / ActivityLog | 日時、種別、詳細展開、追加読込み |
| OrganizationChart | 親子関係、方向、展開、ノード内容 |
| TableContainer | 表題、領域名、スクロール、表示サイズ |
| DataTable | 列定義、検索、ソート、フィルター、選択、表示形式 |
| DataGrid | セル移動、セル選択、編集、コピー・貼付け |
| Pagination | ページ番号、件数、総件数、表示件数、移動操作 |
| TableToolbar | 全体検索、列設定、一括操作、出力 |
| ColumnFilter / ColumnChooser | 列条件、表示・非表示、順序、固定、リセット |
| CellEditor / RowEditor | 編集、検証、確定、取消、処理中 |
| FilterChips / SearchPanel | 適用条件、個別解除、全解除、保存条件 |

テーブルの機能範囲は、[PrimeNG Table](https://primeng.dev/table)のような列・行・検索・表示制御まで含めて定義します。

| 機能 | 切替・設定する項目 |
| --- | --- |
| ソート | ON/OFF、単一列／複数列、昇順・降順・解除 |
| 列フィルター | ON/OFF、文字・数値・日付・選択肢、複数条件 |
| 全体検索 | ON/OFF、対象列、検索条件の解除 |
| ページ送り | ON/OFF、表示件数、ページ番号、先頭・末尾移動 |
| 列幅 | 自動調節ON/OFF、固定幅、最小・最大幅、手動リサイズ |
| 自動幅の方式 | 内容に合わせる／表示領域に合わせる |
| ヘッダー | 固定ON/OFF、多段見出し、列グループ |
| 固定表示 | 左右の固定列、固定行、集計フッター |
| 列操作 | 表示・非表示、並べ替え、設定リセット |
| 行選択 | なし／単一／複数、全選択、選択対象範囲 |
| 行の詳細 | 展開、操作ボタン、グループ化、集計 |
| 編集 | なし／セル／行、検証、確定、取消 |
| スタイル | 縞模様、罫線、hover、行間、折返し、省略表示 |
| データ処理 | アプリ内処理／サーバー処理、追加取得、仮想スクロール |
| 状態の保持 | 検索・ソート・ページ・列配置の保持と復元 |
| 出力 | コピー、CSV出力、印刷、出力対象の指定 |

文字・短い情報・数値の表示部品も必要です。

| コンポーネント | 制御する項目 |
| --- | --- |
| Typography / Heading / Text | 意味、階層、強調、整列、折返し |
| Badge | 数値、上限表示、ドット、位置、意味色 |
| Tag / Chip | ラベル、アイコン、選択、削除、無効 |
| Avatar / AvatarGroup | 画像、代替文字、サイズ、形状、表示上限 |
| Descriptions / KeyValue | 項目名と値、列数、方向、欠損表示 |
| Statistic / MetricCard | 値、単位、増減、比較値、表示形式 |
| Meter / MeterGroup | 値、範囲、区分、ラベル |
| HelpText / ShortcutHint | 補助説明、キー表記、表示位置 |
| ReadMore / TruncatedText | 行数、展開・折畳み、全文表示 |
| CodeBlock / InlineCode | 言語、整形、行番号、コピー |
| Watermark | 内容、位置、繰返し、濃さ |

ファイル・画像・メディアには、次を揃えます。

| コンポーネント | 制御する項目 |
| --- | --- |
| FileUpload | 形式、容量、件数、進捗、取消、再試行 |
| Dropzone | ドロップ受付、複数ファイル、受付条件 |
| UploadList / AttachmentList | ファイル情報、進捗、個別失敗、削除、再試行 |
| FilePreview / PDFViewer | 表示対象、ページ、拡大、ダウンロード |
| Image | 代替説明、縦横比、収め方、取得失敗、遅延読込み |
| ImageViewer / Lightbox | 拡大、回転、前後移動、閉じる |
| Gallery / Carousel | 項目、移動、ページ表示、自動送り、間隔、停止 |
| ImageCompare | 比較方向、境界位置、操作 |
| ImageCropper | 切抜き範囲、比率、回転、確定 |
| AudioPlayer / VideoPlayer | 再生、停止、音量、速度、字幕、全画面 |
| QRCode / Barcode | 内容、形式、サイズ、説明 |

専門的な画面を作るための部品も、カタログに含めます。

| コンポーネント | 制御する項目 |
| --- | --- |
| Chart | 折線、棒、面、円・ドーナツ、散布図、ヒートマップ、レーダー、ゲージ、ツリーマップなどの種別、軸、凡例、選択 |
| Sparkline | 小型の推移表示、比較、欠損 |
| Map | 地図表示、マーカー、領域、選択、拡大 |
| Gantt | タスク、期間、依存関係、進捗、時間軸 |
| Kanban / TaskBoard | 列、カード、移動、順序、件数制限 |
| Spreadsheet | セル、数式、編集、選択、固定、入出力 |
| RichTextEditor | 書式、ツールバー、画像、リンク、読取り専用 |
| MarkdownEditor | 編集、プレビュー、分割表示 |
| CodeEditor | 言語、補完、行番号、読取り専用 |
| DiffViewer / JsonViewer | 比較、差分、階層展開、検索、コピー |
| FileExplorer | 階層、表示方式、選択、検索、ファイル操作 |
| Diagram / FlowEditor | ノード、接続、配置、拡大、編集 |
| Chat / MessageList / MessageComposer | メッセージ、添付、送信状態、再送、追加読込み |

ご指定の4部品は、特に次のプロパティを明確にします。

| 部品 | プロパティ・設定案 |
| --- | --- |
| **Card** | `showHeader`、`showBody`、`showFooter`、`showMedia`、`showActions`、`title`、`subtitle`、`orientation`、`appearance`、`padding`、`collapsible`、`collapsed`、`loading` |
| **入れ子Menu** | 再帰的な`items[].children`、項目の`type`・`icon`・`disabled`・`visible`・`checked`、`open`、`trigger`、`placement`、`closeOnSelect` |
| **Dialog** | `open`、`modal`、`showHeader`、`showFooter`、`closable`、`closeOnEscape`、`closeOnOutsideClick`、`size`、`position`、`draggable`、`resizable`、`maximizable`、`busy` |
| **Snackbar** | `open`、`message`、`severity`、`autoDismiss`、`durationSeconds`、`position`、`showCloseButton`、`actionLabel`、`pauseOnHover`、`pauseOnFocus` |

Snackbarは、**`autoDismiss=true`・`durationSeconds=5`なら5秒後に消去、`autoDismiss=false`なら明示的に閉じるまで保持**とします。自動消去ONでは正の秒数を指定し、OFFでは秒数を使用しません。複数通知のキュー、同時表示数、重複の扱いは共通通知ホストで設定します。時間指定・保持・位置指定の参考になる実装は[PrimeNG Toast](https://primeng.dev/toast)にあります。

CardやDialogの複雑な中身は、ヘッダー・本文・フッターごとのテンプレートで差し替えられるようにします。Menuは多階層の開閉と親項目へのフォーカス復帰、Dialogは終了理由と未保存時の終了保留も契約に含めます。

これらを支える共通基盤として、**OverlayHost、通知ホスト、フォーカス管理、ドラッグ＆ドロップ、リサイズ、仮想スクロール、フォーム接続、言語・日付書式・RTL、プロファイル適用**も必要です。キーボード操作と支援技術への情報は、[WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/)の各操作パターンに沿って設計します。見た目は既存のセマンティックトークンとプロファイルへ接続します。
