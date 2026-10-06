# 専門・媒体部品の採用判断

Angular22.2.1のstandalone部品へ成熟した公開JS APIとnativeブラウザー実装を接続する。名称だけのwrapperや静的カタログを完成と数えず、strict AOT・実描画・入力/選択・復旧・破棄・生成consumerで適合性を検証する。exact解決と原license/NOTICEは[依存監査](dependency-license-audit.ja.md)、供給手順は[consumer guide](ui-library-consumer-guide.ja.md)、機能と実証は[要求マトリクス](ui-library-matrix.json)が正本。

| 対象 | 採用と一次資料 | 接続と採用理由 |
| --- | --- | --- |
| Chart/Sparkline/Gantt | [Apache ECharts](https://echarts.apache.org/handbook/en/get-started/)6.1.0 | core/use/init/setOption/resize/dispose、10種別とCustomChart、SVGRenderer/ARIA。native値表・選択・依存/期間編集・semantic themeを併用。 |
| Map | [MapLibre GL](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/)6.12.0 | ESM/WebGL2、GeoJSON/Marker/cameraとmodule worker。wrapper peerを増やさず公開APIで接続し、外部tileサービスはアプリが選ぶ。 |
| Kanban/仮想化 | [Angular CDK](https://material.angular.dev/cdk/drag-drop/overview)22.2.1 | 既存公開drag-drop/scrolling API、native移動代替、focus/draft保持。private patchや別Overlayを追加しない。 |
| Spreadsheet | [fast-formula-parser](https://github.com/LesterLyu/fast-formula-parser)1.0.19 | 実parser/evaluatorを独立workerへ接続。native grid、CSV/JSON原文入出力、startup/計算期限の分離。 |
| Code/Markdown/Diff | [CodeMirror](https://codemirror.net/docs/)state/view/commands/autocomplete/lang/merge | EditorView/Compartment/language/completion/MergeView、history/CVA/readonly。exact各版はlock/guide。 |
| RichText | [ProseMirror](https://prosemirror.net/docs/)model/state/view/schema-basic/commands/history/keymap | schema/transaction/history、URL/schemaの表示前検証、native toolbar/画像/link。 |
| Markdown preview | [marked](https://github.com/markedjs/marked)18.1.0 | parse結果をAngular sanitizerへ渡す。無条件trusted HTMLを作らない。 |
| JSON | [jsonc-parser](https://github.com/microsoft/node-jsonc-parser)3.3.1 | 元文字列offset/lengthで数値tokenと重複keyを保持。 |
| Flow/Diagram | [Dagre](https://github.com/dagrejs/dagre)3.1.1 | graphlib.Graph/layoutの実座標をSVG/native編集へ反映。別framework UIを増やさない。 |
| PDF | [PDF.js](https://mozilla.github.io/pdf.js/getting_started/)6.4.299 | display layer dynamic import、実module worker/canvas/page/text/getData。native embedを代用しない。 |
| QR/Barcode | [qrcode](https://github.com/soldair/node-qrcode)1.5.4 / [JsBarcode](https://github.com/lindell/JsBarcode)3.12.3 | 実canvas符号化・全文説明、独立decoderで実画素を検証。ZXingは試験専用。 |
| 日程 | [Temporal polyfill](https://github.com/fullcalendar/temporal-polyfill)1.0.5 | named timezone/InstantとDST gap/fold。native day/week/month/agenda/resourcesと移動draft/ackを接続。 |

原同梱物と推移依存を含めlicense名だけでなく原文を保持する。PDF standard fontsの原licenseと対応source kitも配布する。条件と検証の限界は監査文書へ記録し、rootパッケージの公開や新たな権利許諾は行わない。

## 比較した候補と範囲

地図はLeafletも比較し、今回canvas/領域/worker適合性を実証したMapLibreを採用した。RichTextはTiptapを比較し、基本schema/transactionを直接扱うProseMirrorを採用した。SpreadsheetはUniver/Jspreadsheet等を検討し、指定のセル/式/選択/固定/入出力をnative gridと実formula engineで構成した。有償Excel機能やReact view層を前提にしない。

HyperFormulaのGPL/commercial、SheetXLのregistry/READMEとtarballで異なる条件を確認したため、同意を推測して採用しなかった。FullCalendar premiumリソースやSaaSを前提にせず、指定のview/resource/timeband/moveはTemporalとnative UIで構成する。crop候補はdecode寿命/source替え/破棄も比較し、native Bitmap/Canvas adapterで実PNGを作る。

採用エンジンの全機能を再公開する契約ではない。全Excel関数/XLSX/複数sheet、全言語IDE、外部地図provider、実storage/upload/chatサービスの成功を検証済みと扱わない。今回の全制御項目は[専門契約](ui-library-specialist-expansion-spec.ja.md)と[媒体契約](ui-library-media-expansion-spec.ja.md)へ対応付ける。
