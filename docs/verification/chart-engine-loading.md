# Gantt・Chart・Sparkline の初回描画と ECharts の配信量

2026年11月25日。Angular CLI 22.3.0、ECharts 6.1.0、Node 24.19.0、Chromium の新規コンテキストで、開始画面から各部品だけの `loadComponent` ルートに移動した。開発構成は AOT、最適化なし、ソースマップあり、CLI キャッシュ無効。遷移から SVG が描画され通信が落ち着くまでに取得した JavaScript の応答本体を数えた。修正前の Chart と Gantt の生成元は `0c421cc4` と一致する。

| 描画した部品 | 修正前の遷移合計 B | 修正後の遷移合計 B | 修正前 → 修正後の最大応答 B | 修正後に読み込んだ系列 |
| --- | ---: | ---: | ---: | --- |
| Gantt、1タスク | 12,094,730 | 5,889,317 | 2,753,576 → 5,073,196 | custom |
| Chart、棒グラフ1系列 | 12,153,862 | 7,753,425 | 2,753,576 → 5,342,292 | bar、gauge、heatmap、line、pie、radar、scatter、treemap |
| Sparkline、2点の折れ線 | 12,153,836 | 6,218,148 | 2,753,576 → 5,342,292 | line |

旧構成では、各ルートのインラインソースマップに Sankey・Funnel・Candlestick を含む22種類の系列登録モジュールが現れた。修正後は3ルートとも初期画面に ECharts のレスポンスがなく、遷移時の合計は減った。共通処理が少数のファイルにまとまり、最大の単一応答は大きくなった。SVG の path 数は Gantt 9、Chart 32、Sparkline 4 で、各部品の変更前後で一致した。いずれも描画領域は 1,264 × 480 CSS px で、部品内にエラー表示はなかった。

同じ Gantt ルートを最適化・ソースマップなしでビルドすると、描画エンジン用 JS は 1,116,179 B から 475,835 B になった。これはビルド出力の非圧縮サイズ。上表の開発サーバーの応答にはインラインソースマップを含む。

汎用 Chart は表示中の種類変更に使う全10種類を8つの系列で描く。面グラフは line、ドーナツは pie を使用する。Sparkline 内の Chart は折れ線用のエンジンを使う。ECharts がパッケージの `exports` に列挙する系列・部品別の登録モジュールを遅延アダプターから読む。複数アダプターが `echarts/charts` の同じ再エクスポートから名前を選ぶ試作では、esbuild が系列を共有チャンクにまとめ、Sparkline でも汎用 Chart の系列が届いた。

`node --import tsx --test tests/generation/chart-engine-loading.test.ts` は生成済み Chart と Gantt を同時に分割ビルドし、初期・各遅延入口から静的に到達できる出力の入力寄与をたどる。初期入口への ECharts・ZRender の混入と、それぞれの遅延入口への未使用系列の混入を検出する。[バンドルの回帰試験](../../tests/generation/chart-engine-loading.test.ts)・[元の横展開調査](generated-icon-loading-56/README.md)
