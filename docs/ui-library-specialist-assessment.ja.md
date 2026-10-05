# 専門部品の依存候補

2026-10-05に一次資料を確認した候補評価。名称を登録しただけでは実装済みに数えず、要求マトリクスの専門13行はpendingのままにする。今回の段階では追加依存・有償アカウント・ライセンス同意を導入していない。

| 対象 | 候補と確認した機能 | 統合時に実証する項目 |
| --- | --- | --- |
| Chart / Sparkline | [Apache EChartsの機能](https://echarts.apache.org/en/feature.html)は多種の図、SVG/Canvas、操作とデータ変換を持つ。[LICENSE](https://github.com/apache/echarts/blob/master/LICENSE)はApache-2.0と同梱部分の別ライセンスを記す。 | 必要な種別だけのimport、Angular AOTと破棄、resize、テーマの意味トークン、欠損、代替表、選択のkeyboard経路。 |
| Map | [Leaflet](https://leafletjs.com/)はframeworkから独立した地図API。[LICENSE](https://github.com/Leaflet/Leaflet/blob/main/LICENSE)はBSD-2-Clause。 | providerをアプリが指定し、タイル取得・帰属表示を接続。外部serviceを仮定しない。marker/領域選択、zoom、keyboardと一覧代替、破棄。 |
| CodeEditor / MarkdownEditor | [CodeMirrorの開発元](https://github.com/codemirror/dev)と[MIT LICENSE](https://github.com/codemirror/dev/blob/main/LICENSE)を確認。 | 言語別extension、補完、readonly、選択保持、CVA、semantic theme、プレビューの安全な描画、拡張が未登録の言語での扱い。 |
| RichTextEditor | [Tiptapの公式概要](https://tiptap.dev/docs/editor/getting-started/overview)はheadlessのplain JS統合とMITのOSS、別の有償Pro機能を区別する。 | Angular lifecycle/CVA、書式/toolbar、画像・URL検証、readonly、内容保持、safe preview。要求の基本書式にProが必要とは判断していない。 |
| Spreadsheet | [Univerの公式repo](https://github.com/dream-num/univer)は編集・式・選択・sort/filterを含むOSSとPro機能を分ける。React view層とAngularの接続は別に実証が必要。 | OSSのセル/式/固定/入力、semantic接続、keyboard、clipboard、consumer。公式Excel import/export・印刷はProのため、採用前にOSSの入出力経路を比較する。 |
| Diagram / FlowEditor | [xyflowの公式repo](https://github.com/xyflow/xyflow)はReact/Svelteの実装。Angular向け部品としてそのまま採用できるとは判断しない。 | framework境界を増やさない候補を比較し、ノード/接続/配置/zoom/編集、keyboardによる接続/移動、破棄、データ契約を検証する。 |

Gantt、Kanban、Diff/JsonViewer、FileExplorer、Chat等は業務更新をUIで偽装せず、移動/編集/送信を利用アプリへ通知する契約を持たせる。各候補の採用は実装時のexact版・依存一覧・license/NOTICE・consumerの実操作・サイズを記録する。React向け既成UIや有償機能の宣伝だけをAngular22への適合証拠としない。
