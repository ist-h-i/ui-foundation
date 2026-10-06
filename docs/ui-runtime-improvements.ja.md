PR #11で完了した181要件とIssue #2の完了を維持し、追加改善をIssue #12と専用ブランチで管理する。開始点はmain `9f5430ca87e249af204cc335a8610d0d8040621f`。人による目視は今回の完了条件にしない。

| 対象 | 改善内容 | 必要な実証 | 現在の状態 |
| --- | --- | --- | --- |
| output変更のP2 | 固定機械registry、旧v1の明示移行、旧新manifest管理 | dry-run・冪等性・未所有/手編集/symlink拒否・ordinary I/O rollback・consumer | 初期全生成22件通過、独立レビューの親子移行反例を修正して再検証中 |
| 媒体strict診断 | Media回帰3specと直接helperの継続型検査 | 既存DOM assertionを維持したruntime narrowing・各媒体実操作 | 元43診断を解消、87any除去、228matcherと18title保持、native18件通過。作者外レビュー待ち |
| PR11追加Diagram P2 | 空ラベル確定と負の座標の拒否 | 純粋model・UI入力保持・keyboard・2profile | 隔離候補を実装中 |
| Arabic SVG描画 | 後描画strokeが目盛文字を上書きする差分の修正 | 元actual1の保存・因果分類・対照描画・foreground/background | 元71/55差分がaxisTickに一致、修正候補を準備中 |
| SVG/Tree axe incomplete | rule/node/state別分類と独立自動検査 | AX/ARIA参照・keyboard/focus・paint/contrast・clip/到達可能性 | 原始結果を保持して調査中 |
| 複数browser | opt-inの重点Chromium/Firefox/WebKit回帰 | 実engine/version・2profile・重点操作・異常/終了/時間 | task用browser取得、隔離consumer検証中 |
| 最終統合 | Draft PR・独立レビュー・必要な回帰・merge | frozen source SHA・実終了値・main一致 | 未完了 |

新しい検証は元のactual1/incompleteを消したり、未実施の検査を合格へ置き換えたりしない。今回は追加改善の変更に必要な回帰を行い、既存1248件の全再実行を唯一の条件にはしない。

WebKitはSafari実機と区別する。DOM/ARIA/AX snapshotは実スクリーンリーダーの発話を保証しない。機械で判断できない意味、未検証の実機は限界として記録する。npm公開、ライセンス決定、OS認証/セキュリティ変更、実サービスupload、本番認可、実ハードウェア操作は対象外。
