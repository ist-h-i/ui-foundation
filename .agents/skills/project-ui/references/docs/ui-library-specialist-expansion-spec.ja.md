# 専門13要求の公開契約

[原文](ui-library-request.ja.md)の`specialist-01`〜`13`を実renderer/editor/計算エンジンとnative操作で扱う。[採用判断](ui-library-specialist-assessment.ja.md)、[型とmethods](ui-library-api.json)、[consumer配信](ui-library-consumer-guide.ja.md)を参照する。

## 入力とイベント

| 公開部品 | 入力 | 出力 |
| --- | --- | --- |
| Chart | `numberOptions` / `dateTimeOptions` / `timeZone` / `locale` / `label` / `kind` / `series` / `xAxis` / `yAxis` / `legend` / `hiddenSeries` / `selected` / `disabled` / `busy` / `compact` | `hiddenSeriesChange` / `selectionChange` |
| Sparkline | `numberOptions` / `locale` / `label` / `series` / `disabled` / `busy` | — |
| MapView | `label` / `markers` / `regions` / `camera` / `baseStyle` / `workerUrl` / `selected` / `disabled` / `busy` | `selectionChange` / `cameraChange` |
| Gantt | `civilDateOptions` / `locale` / `label` / `tasks` / `scale` / `readonly` / `disabled` / `busy` | `taskChange` / `scaleChange` |
| Kanban | `label` / `columns` / `cards` / `disabled` / `busy` / `readonly` | `moveRequested` |
| Spreadsheet | `label` / `sheet` / `readonly` / `disabled` / `busy` / `frozenRows` / `frozenColumns` / `workerUrl` | `cellEditRequested` / `selectionChange` / `importRequested` / `exportRequested` |
| RichTextEditor | `toolbar` | — |
| MarkdownEditor | `mode` | `modeChange` |
| CodeEditor | `language` / `completions` / `lineNumbers` | — |
| DiffViewer | `label` / `disabled` / `busy` / `before` / `after` / `writer` | — |
| JsonViewer | `locale` / `label` / `disabled` / `busy` / `source` / `writer` | — |
| FileExplorer | `locale` / `label` / `nodes` / `view` / `selected` / `multiple` / `disabled` / `busy` / `readonly` / `error` | `viewChange` / `selectionChange` / `operationRequested` |
| FlowEditor | `label` / `model` / `zoom` / `direction` / `selected` / `readonly` / `disabled` / `busy` | `changeRequested` / `layoutRequested` / `zoomChange` / `selectionChange` |
| Chat | `label` / `value` / `messages` / `attachments` / `disabled` / `busy` / `readonly` / `hasMore` / `cursor` / `loadState` | `sendRequested` / `retryRequested` / `loadMoreRequested` / `attachmentsSelected` / `attachmentRemoveRequested` / `attachmentRequested` / `textChange` |
| MessageList | `label` / `messages` / `disabled` / `hasMore` / `cursor` / `loadState` | `retryRequested` / `loadMoreRequested` / `attachmentRequested` |
| MessageComposer | `label` / `value` / `attachments` / `readonly` / `disabled` / `busy` | `textChange` / `sendRequested` / `attachmentsSelected` / `attachmentRemoveRequested` |

Rich/Markdown/Codeは共通SpecialistEditorControlのlabel/value/valueChange/readonly/disabled/busyとCVAも継承する。MapはMapView、DiagramはFlowEditorを公開名とする。

## 図・地図・時間軸・board

Chartはline/bar/area/pie/doughnut/scatter/heatmap/radar/gauge/treemapを実EChartsで描画。Pointはraw id/label/value、scatter/heatmapはx/y、treemapはchildren。valueは有限数またはnull、重複ID/不正座標/循環/矛盾軸を診断する。time軸は明示timezoneを要求し、Intlで原値を変換しない。物理rendererの局所LTRと周囲RTL操作を分け、軸名/凡例/目盛は文字を保った局所scrollで到達可能にする。全文値表・native選択を実描画と併用。Sparklineはfirst/last/delta/missingを表示し0/欠損を分ける。

Mapのlongitude/latitude、閉じたpolygon rings、cameraを実MapLibre canvas/GeoJSON/Markerへ反映する。baseStyle/tile/font provider/帰属/network/provider契約はアプリが指定。既定は外部tileなし。v6 worker/shared ESM/CSSはexact版で配信し同一appのworker URLを統一する。障害でも原一覧とエラーを保つ。

GanttTaskはcivil ISO start/end、progress0〜100またはnull、dependenciesは既存ID。未知依存/循環/不正期間を診断し実task bars・依存線・day/week/monthとnative期間/進捗編集を接続する。日付とタスク名は意味tokenの書体・文字サイズ・行高で実測し、目盛り間隔と描画寸法を決める。狭幅・文字拡大では名前付き局所scrollで軸ラベルを読めるようにし、nativeタスク表は同じ値と編集経路を保つ。時間の座標はLTR、civil日付はアプリのlocale/formatを使う。KanbanはCDK drag/dropとnative列/順序移動。移動先selectの現在値はカードの所在列と一致し、移動後に列が作り直されても保持する。順序移動で元のbuttonが無効化・除去される場合は、移動したカードの見出しへ自前focusを保持し、見出しの文字とfocus枠を局所scroll領域内へ表示し、そのカード内からTab操作を続けられるようにする。BoardMoveのcardId/fromColumn/toColumn/index、readonly/disabled/limitを検証してintentを返す。

Ganttの外枠、図の局所scroll、タスク表は領域名を分ける。図はlabelに翻訳可能な「の図」、タスク表は「のタスク」を加え、領域ナビゲーションで表示の用途を区別できるようにする。

## Spreadsheet・editor

SheetCellはstring/number/boolean/null。式原文・先頭0・欠損を結果で上書きしない。単一矩形最大1000行/100列/10000セル、string8192文字、CSV2MB。実formula workerはready前startupと計算deadlineを分けrequest/snapshot/protocolを検査、stale/cancel/destroyで終了する。不能時にsource/draftを保ち明示再計算へ戻る。再試行buttonの自前focusは計算状態へ保持し、失敗後に再試行へ戻す。状態と復帰先は描画後に文字とfocus枠が画面内で読めるように表示する。利用者が別の操作へ移したfocusは応答で奪わない。SUM/IF/四則/参照/循環/エラーとセル/範囲選択、sticky固定、CSV/JSON原文入出力を扱う。固定する軸だけにsticky位置を指定し、列幅・行高は実描画から取得する。固定範囲が操作可能な次のセルを覆う狭い表示では固定数を一時的に減らし、広がると指定範囲へ戻す。矢印・Home・Endで選択したセルの値とfocus枠は固定行列の背後へ隠さず、自前のfocusを維持したまま局所scroll内に表示する。計算応答では外部へ移したfocusや局所scrollをコンポーネントから変更しない。状態文の高さの変化に対するブラウザー標準のscroll anchoringは維持し、受入検証では外部入力欄のfocus・局所scroll・画面内での位置の保持をそれぞれ確認する。page scroll座標の不変は契約に含めない。全Excel関数/XLSX/複数sheet/永続workbook互換ではない。

CodeMirror/ProseMirrorのnative入力・language/completion/history/schema/transactionを使い、nullable reset、readonly、selectionとDOM寿命、profile/locale変更、zoneless親値表示を接続する。CodeLanguage/CodeCompletion/RichToolbarActionは公開型。Rich JSON schema/URL/image altはDOM/CVA公開前に検証し、無条件trusted HTMLを作らない。Markdownはmarked結果をAngular sanitizerへ渡しedit/preview/splitを制御する。

Diffは実MergeView差分と検索/移動、JSONは元文字列offsetのparse treeで展開/検索する。巨大整数・重複propertyの原文を保つ。copy成功は実writer Promise完了後だけ示し、拒否/再試行/旧完了を分ける。

## ファイル・flow・chat

FileExplorerはtree/list/gridと展開/選択/検索、open/rename/delete/create-folder/downloadのintent。view/search後もcanonical IDとdisabled/readonlyを検証、自前focusだけ退避する。treeの展開・子への移動はLTRで右、RTLで左、その逆は親への移動・折畳み。キー処理時の実際のCSS directionに従い、方向変更でも選択と下書きを保つ。実storage/削除/download/Undoはアプリが所有する。

FlowEditorはtyped graphをimmutableに検証してDagreの実座標をSVGへ反映。ノードとSVGの座標原点・拡大率を一致させ、ノードの実際の文字折返し後の高さを接続中心とcanvas寸法へ反映する。自動配置にも実測した必要高と接続ラベルの必要幅を渡す。接続ラベルはノードとの重なりを避け、表示位置を離す場合も補助線で対応する接続を示す。ノード・接続をキーボードで削除した後は残存する関連操作へ自前focusを保持し、外部へ移したfocusを奪わない。編集表の入力欄は局所スクロール領域の幅に収め、狭幅・文字拡大・RTLでもfocus先の内容を確認できる。ノード/接続/配置/zoom/編集とnative endpoint/positionの代替を持つ。layout/change intentの実適用はアプリへ返す。

`layoutDiagram(model, width, height, gap, direction, rankGap)`の省略可能な`rankGap`はrank間の間隔を指定し、既定値は従来どおり`gap * 2`。ノード同士の間隔とcanvas余白は`gap`を使う。寸法・間隔はすべて有限の正数を要求する。

MessageComposer/ChatのCVAは編集中text。current送信IDのcompleteSend/failSend/markSendUnknownで結果を受けunknown中は二重送信を止める。reset/destroyで旧ack失効。MessageListの追加取得はcursor/current IDのcompleteLoad/failLoadへ接続する。添付/再送可否/実backend成功はアプリの責任。

## 正式検証

specialist-catalog/accessibility/recovery/workers/sheet-startup/rich-boundary/chart-explorerの各specとmodel specialist-*.test.tsで実針/heatmap cell/canvas・language候補・schema/URL拒否・worker冷開始/終了・CSV/JSON raw値・clipboard/failed/unknown復旧・320px/文字200%/RTL/両profileを扱う。全回帰/独立consumer/source review/axe/実画像はmatrixで別に記録する。
