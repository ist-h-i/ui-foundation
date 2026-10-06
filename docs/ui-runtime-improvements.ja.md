PR #11で完了した181要件とIssue #2の完了を維持し、追加改善をIssue #12と専用ブランチで管理する。開始点はmain `9f5430ca87e249af204cc335a8610d0d8040621f`。人による目視は今回の完了条件にしない。

| 対象 | 改善内容 | 必要な実証 | 現在の状態 |
| --- | --- | --- | --- |
| output変更のP2 | 固定機械registry、旧v1の明示移行、旧新manifest管理 | dry-run・冪等性・未所有/手編集/symlink拒否・ordinary I/O rollback・consumer | v3回帰8/8、独立42拒否・CLI44・public consumer5とlate-write rollbackを実証。範囲限定の独立承認済み |
| 媒体strict診断 | Media回帰3specと直接helperの継続型検査 | 既存DOM assertionを維持したruntime narrowing・各媒体実操作 | 43診断→0、87any→0、228matcherと18title保持。作者native18/18、独立5/5 actual0、独立承認済み |
| PR11追加Diagram P2 | 空ラベル確定と負の座標の拒否 | 純粋model・UI入力保持・keyboard・2profile | モデル19/19、作者native22/22・独立26/26 actual0、最終8sourceを独立承認・採用済み |
| Arabic SVG描画 | 後描画strokeが目盛文字を上書きする差分の修正 | 元actual1の保存・因果分類・対照描画・foreground/background | 元71/55差分がaxisTickに一致。v2の34ケースで全alpha文字RGBA差分0・clip0、負対照も実証。作者外レビュー・統合待ち |
| SVG/Tree axe incomplete | rule/node/state別分類と独立自動検査 | AX/ARIA参照・keyboard/focus・paint/contrast・clip/到達可能性 | Tree42をARIA18・非BMP21・clip3へ分類。追加native6/6と独立6/6 actual0、参照/実paint/AX/keyboard/負検査を独立承認。SVGは原未判定を保全して補助検証中 |
| 複数browser | opt-inの重点Chromium/Firefox/WebKit回帰 | 実engine/version・2profile・重点操作・異常/終了/時間 | Chromium153.0.8010.12・Firefox155.0・WebKit26.6の旧Menu候補36/36 actual0。独立検出の同階層focus/roving不整合を追加修正し、最終統合後の36再実行待ち |
| 最終統合 | Draft PR・独立レビュー・必要な回帰・merge | frozen source SHA・実終了値・main一致 | 未完了 |

新しい検証は元のactual1/incompleteを消したり、未実施の検査を合格へ置き換えたりしない。今回は追加改善の変更に必要な回帰を行い、既存1248件の全再実行を唯一の条件にはしない。

現時点の範囲限定レビューは、[所有情報移行](verification/ui-runtime-improvements/ownership-independent-v3/PACK-MANIFEST.json)、[媒体・Tree](verification/ui-runtime-improvements/media-tree-independent/PACK-MANIFEST.json)、[Diagram](verification/ui-runtime-improvements/diagram-independent/diagram-independent-verdict.json)に保存した。最終統合の承認とは区別する。作者の修正前・試験準備中の実失敗も各パックへ保全する。

型検査は通常の `npm run typecheck` に加えた `typecheck:ui:media` と `typecheck:ui:runtime` を継続実行する。前者はMedia3spec、後者はTree/Diagram3specと各直接依存が対象であり、全UI specのstrict検査を実装したという意味ではない。

WebKitはSafari実機と区別する。DOM/ARIA/AX snapshotは実スクリーンリーダーの発話を保証しない。機械で判断できない意味、未検証の実機は限界として記録する。npm公開、ライセンス決定、OS認証/セキュリティ変更、実サービスupload、本番認可、実ハードウェア操作は対象外。
