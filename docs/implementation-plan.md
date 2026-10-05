# 実装・検証計画

## 設定と解決

`src/config.ts`でYAMLの構造と型を検証し、`src/roles.ts`の役割契約へ接続する。必須役割、参照先、型、default_profile、色ペアを各プロファイルで確かめる。context/guidanceだけを変更しても見た目の値を推測しない。未知項目や旧preset/density設定は受理しない。

`src/tokens.ts`はプリミティブと解決済み意味トークン、全プロファイルのスコープ、Tailwindのテーマ接続を決定的に生成する。基底だけでなく各プロファイルの全対応を出力し、入れ子の継承漏れを検査する。

## 生成とAIへの接続

`src/sync.ts`と`src/cli.ts`でinit/sync/checkを提供する。tokens.css、tailwind.css、Angular部品、Skillとproject-context、profile選択情報、policy/resolved、manifestを同じ解決結果から作る。

生成試験は冪等性、dry-run、文脈/対応変更の反映、未同期、手編集、未所有ファイル、欠損、manifest、symlink、プロジェクト外パス、initの保全、CLIの失敗終了を確認する。書込み時の通常エラーは復元するが、プロセス強制終了への原子性を保証しない。

## UIの接続と比較

fixtureは生成した部品をコンパイルし、Tailwind CLIでCSSを作る。guided/denseを明示的に切り替え、同じ部品と同じ意味のutilityで色・文字・余白・角丸が変わることをcomputed styleで観測する。ネストした異なるprofileも確認する。

| 観点 | 観測する結果 |
| --- | --- |
| 切替 | 画面を作り直さず入力・取得・実行状態を保つ。 |
| 非同期処理 | 処理中の再操作を抑止し、結果不明を偽らない。 |
| 部分障害 | 正常領域と入力が残り、局所再試行に接続できる。 |
| 入力と復旧 | エラー箇所が分かり、修正/実ローカルデータUndoで継続できる。 |
| 操作 | nativeの意味、キーボード、focus、選択、dialog、hiddenを保つ。 |
| 表示 | 狭い画面・文字拡大・動き低減で情報と操作を維持する。 |
| 自動アクセシビリティ | 両profileの対象状態をaxeで検査する。 |

明るい主操作背景とink文字の設定を解決・生成し、通常／現在地／hoverのリンクと選択中タブを実際のAngular部品で描画する。リンクのsurface／background、選択タブのsurfaceの文字色ペアを確認する。ナビゲーションとパンくずでは、320px幅、文字サイズ100%／200%、日本語／連続英字の全文字行が枠内に収まり、ページ全体の横スクロールが出ないことを測定し、focus・href・現在地を確認する。

静止画は描画の証拠、操作試験は対象シナリオの証拠。どちらも利用者の理解や実業務の有効性を証明しない。

## 実行とレビュー

`npm run ui:sync`→`npm run ui:check`→`npm run typecheck`→`npm run test:config`→`npm run test:generation`→`npm run test:model`→`npm run test:ui`。`npm test`は同期済みであることを確認して全検査を実行する。`npm run build`も未同期を拒否する。

実装後は正確なbase/headと実diffをfresh context reviewerへ渡す。結果はソース/試験を主担当が確認する。コミット・Draft PR更新後もマージやReady化は別の判断。全ソースASTによる逸脱検査、Skillの自動選択の評価、Firefox/Safari、実スクリーンリーダー、実サービスの復元、実利用での有効性はこの初版で確認済みとは扱わない。
