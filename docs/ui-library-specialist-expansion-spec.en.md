# Visualization and specialist-editor public contracts

[Japanese](ui-library-specialist-expansion-spec.ja.md)

Public APIs for specialist components using actual rendering/editing/calculation engines and native interaction. Read [types/methods](ui-library-api.json) and the [consumer guide](ui-library-consumer-guide.en.md).

## Inputs and events

| Public component | Inputs | Outputs |
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

Rich/Markdown/Code inherit SpecialistEditorControl label/value/valueChange/readonly/disabled/busy and CVA. Public names are MapView for maps and FlowEditor for diagrams.

## Charts, maps, timelines and boards

Chart renders line/bar/area/pie/doughnut/scatter/heatmap/radar/gauge/treemap through actual ECharts. Points carry raw id/label/value, scatter/heatmap add x/y, treemap adds children. Values are finite numbers/null; duplicate IDs, invalid coordinates, cycles and incompatible axes produce diagnostics. Time axes require an explicit time zone; Intl does not transform raw values. Separate local physical-renderer LTR from surrounding RTL controls. Axis names/legends/ticks retain complete text and local scrolling. Full value tables/native selection accompany actual rendering. Sparkline displays first/last/delta/missing and distinguishes zero from missing.

Map applies longitude/latitude, closed polygon rings and camera to actual MapLibre canvas/GeoJSON/Marker. The app selects baseStyle/tile/font providers, attribution, network and provider contracts. Defaults use no external tiles. Deliver exact-version v6 worker/shared ESM/CSS and use one consistent worker URL in the app. Failures retain the source list and error.

GanttTask uses civil ISO start/end, progress0–100/null and dependencies referencing existing IDs. Unknown dependencies, cycles and invalid periods produce diagnostics. Actual task bars/dependency lines/day-week-month views connect to native period/progress editors. Dates/task names are measured with semantic font/size/line-height to set tick spacing and drawing dimensions. At narrow widths/large text, named local scrolling keeps axis labels readable; the native task table retains the same values/edit path. Time coordinates are LTR; civil dates use app locale/format. Kanban uses CDK drag/drop and native column/order movement. Destination select reflects the card's current column and retains that value when columns rebuild after movement. If order movement disables/removes its button, retain owned focus at the moved card's heading, reveal its text/focus outline in the local scroll region and continue Tab navigation inside that card. Validate BoardMove cardId/fromColumn/toColumn/index and read-only/disabled/limits before emitting intent.

Gantt outer frame, locally scrollable chart and task table have distinct region names. The chart adds the translatable diagram suffix to label; the table adds its tasks suffix, distinguishing purposes during region navigation.

## Spreadsheets and editors

SheetCell is string/number/boolean/null. Results never overwrite formula source, leading zeros or missing values. One rectangle is limited to1000 rows/100 columns/10000 cells; strings to8192 characters; CSV to2MB. The actual formula worker separates pre-ready startup from calculation deadlines, validates request/snapshot/protocol and terminates on stale/cancel/destruction. On inability to calculate, retain source/draft and return to explicit recalculation. Retry-button owned focus moves to calculation status and returns to retry after failure; rendered status/destination reveal readable text and focus outlines. Responses do not take focus from other user-selected actions. Supported operations include SUM/IF/arithmetic/references/cycles/errors, cell/range selection, sticky frozen regions and CSV/JSON source import/export. Sticky positioning applies only to frozen axes; column widths/row heights come from actual rendering. If frozen cells would cover the next operable cell in narrow space, temporarily reduce the frozen count and restore it when space returns. Arrow/Home/End selection reveals cell value/focus outline within local scrolling, outside frozen overlays, while retaining owned focus. Calculation responses do not change externally moved focus or component scroll. Standard browser scroll anchoring for status-height changes remains; acceptance checks focus, local scroll and the external input's on-screen position separately. Unchanged page-scroll coordinates are not part of the contract. This is not all-Excel-function/XLSX/multisheet/persistent-workbook compatibility.

CodeMirror/ProseMirror supply native input, language/completion/history/schema/transactions. Connect nullable reset, read-only, selection/DOM lifetime, profile/locale changes and zoneless parent display. CodeLanguage/CodeCompletion/RichToolbarAction are public types. Validate Rich JSON schema/URLs/image alt before DOM/CVA exposure; never create unconditional trusted HTML. Markdown sends marked output through Angular sanitizer and supports edit/preview/split modes.

Diff uses actual MergeView differences and search/navigation. JSON expansion/search uses an offset-preserving parse tree of the original string; large integers/duplicate properties retain source. Copy success appears only after the actual writer Promise resolves. Rejection/retry/stale completion remain distinct.

## Files, flow and chat

FileExplorer provides tree/list/grid, expand/select/search and open/rename/delete/create-folder/download intents. Validate canonical IDs and disabled/read-only after view/search changes; transfer owned focus only. Tree expansion/child navigation is Right in LTR and Left in RTL; the opposite direction goes to parent/collapses. Use actual computed CSS direction at key time and retain selection/drafts across direction changes. Actual storage/removal/download/undo belong to the app.

FlowEditor immutably validates typed graphs and maps actual Dagre coordinates to SVG. Node/SVG origins and scale agree. Measured wrapped-node height determines connector centers/canvas size; auto-layout receives required node heights and connector-label widths. Labels avoid node overlap and use leader lines to identify their connector if displaced. After keyboard node/edge deletion, retain owned focus at a remaining related action without taking externally moved focus. Editing-table inputs fit the local scroll width and reveal focused content at narrow widths/large text/RTL. Nodes/edges/layout/zoom/editing include native endpoint/position alternatives. The app applies layout/change intents.

Optional `rankGap` in `layoutDiagram(model, width, height, gap, direction, rankGap)` controls spacing between ranks and defaults to the existing `gap * 2`. Node separation/canvas padding use gap. Dimensions/gaps must all be finite positive numbers.

MessageComposer/Chat CVA is editing text. Current send-ID `completeSend/failSend/markSendUnknown` responses represent outcomes; unknown blocks duplicate sending. Reset/destruction invalidate old acknowledgments. MessageList incremental loading connects cursor/current ID to `completeLoad/failLoad`. Attachments, retry eligibility and actual backend success are app responsibilities.
