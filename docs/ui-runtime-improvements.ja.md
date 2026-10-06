PR #11で完了した181要件とIssue #2の完了を維持し、追加改善をIssue #12と専用ブランチで管理した。開始点はmain `9f5430ca87e249af204cc335a8610d0d8040621f`。PR #13は2026-10-06 14:49 UTCにマージされ、main `9b8bb12861228c2bb610be2f8827710e7e2e9932` と独立承認済みhead `228ade09f21a613535f7dc1439734db12400fb99` のtree一致と `ui:check` 実終了0を確認した。Issue #12は完了。人による目視は今回の完了条件にしない。

| 対象 | 改善内容 | 必要な実証 | 現在の状態 |
| --- | --- | --- | --- |
| output変更のP2 | 固定機械registry、旧v1の明示移行、旧新manifest管理 | dry-run・冪等性・未所有/手編集/symlink拒否・ordinary I/O rollback・consumer | v3回帰8/8、独立42拒否・CLI44・public consumer5とlate-write rollbackを実証。範囲限定の独立承認済み |
| 媒体strict診断 | Media回帰3specと直接helperの継続型検査 | 既存DOM assertionを維持したruntime narrowing・各媒体実操作 | 43診断→0、87any→0、228matcherと18title保持。作者native18/18、独立5/5 actual0、独立承認済み |
| PR11追加Diagram P2 | 空ラベル確定と負の座標の拒否 | 純粋model・UI入力保持・keyboard・2profile | モデル19/19、作者native22/22・独立26/26 actual0、最終8sourceを独立承認・採用済み |
| Arabic SVG描画 | 後描画strokeが目盛文字を上書きする差分の修正 | 元actual1の保存・因果分類・対照描画・foreground/background | 元71/55差分がaxisTickに一致。最終統合34/34・独立18/18 actual0。1,226ラベル・573,046 alpha画素のRGBA差0、clip/実ink衝突0、最低contrast14.645。負対照と範囲限定の独立承認あり |
| SVG/Tree axe incomplete | rule/node/state別分類と独立自動検査 | AX/ARIA参照・keyboard/focus・paint/contrast・clip/到達可能性 | Tree42をARIA18・非BMP21・clip3へ分類し、追加6/6・独立6/6 actual0。SVGの34ケース8scanには212ノードの未判定が残り、別の実paint/contrast/到達/操作検査を実証。全axe合格とはしない |
| 複数browserとMenu | opt-inの重点3engine回帰とopen/closed roving | 実engine/version・2profile・重点操作・異常/終了/時間 | 統合37ecf88で36/36。閉Menuのtabindex修正後a1ed5c0で影響するMenu/Dialog12/12、関連Navigation/Overlay28/28、独立Menu5＋Nav2の7/7 actual0。3engine versionは下記参照 |
| SVG継続gate | 継承filterで0件になる偽成功の防止 | 修正前0件exit0・必須34件/一意/実終了・6step | 旧0件exit0反例を保持。子環境の5制御を解除し、34件・34組合せ・全成功を検査。独立11契約検査と最終rootのhostile34 actual0 |
| 最終統合 | Draft PR・独立レビュー・必要な回帰・merge | frozen source SHA・実終了値・main一致 | 最終製品a1ed5c0の必要なlocal回帰は実終了0。947a9eeの全変更独立承認と228ade09の証拠採用照合を経てPR #13をマージし、main一致をIssue #12へ記録した |

マージ後の追加bot指摘は、保存された検証script3本のMac固有パスに関するP2で、Issue #14に分けた。継続実行する入口と保存したraw scriptの区別は [検証ツールの再実行](verification-tools.ja.md) を参照する。製品ソースや元の181要件の未完了を示す指摘ではない。

新しい検証は元のactual1/incompleteを消したり、未実施の検査を合格へ置き換えたりしない。今回は追加改善の変更に必要な回帰を行い、既存1248件の全再実行を唯一の条件にはしない。

範囲限定レビューは、[所有情報移行](verification/ui-runtime-improvements/ownership-independent-v3/PACK-MANIFEST.json)、[媒体・Tree](verification/ui-runtime-improvements/media-tree-independent/PACK-MANIFEST.json)、[Diagram](verification/ui-runtime-improvements/diagram-independent/diagram-independent-verdict.json)、[Chart/Menu/runner](verification/ui-runtime-improvements/chart-menu-independent/REVIEW.ja.md)、[SVG gate](verification/ui-runtime-improvements/svg-runner-contract-independent/PACK-MANIFEST.json)へ保存した。Chart/Menuの1,283 payloadは圧縮パックへ元のまま保存し、全SHA/bytesを再照合した。最終統合の承認とは区別する。作者の修正前・試験準備中の実失敗も各パックへ保全する。

型検査は通常の `npm run typecheck` に加えた `typecheck:ui:media` と `typecheck:ui:runtime` を継続実行する。前者はMedia3spec、後者はTree/Diagram/Menu4specと各直接依存が対象であり、全UI specのstrict検査を実装したという意味ではない。媒体の228matcher・18title、Navigationの旧242assertion・33titleを保持して新しい閉状態の検査を加えた。

最終製品ソースは `a1ed5c012c5b35a50e8df1038e04ade71cf044c4`。通常生成から得た151管理ファイルとmanifestの一致、型検査・公開consumerのfull strict AOT・dry-run・冪等性を確認した。[変更対応表](verification/ui-runtime-improvements/ROOT-SOURCE-ADOPTION-SUPPLEMENT.json)は前段の37ecf88と最終ソースの9入力差分を示す。[実検証一覧](verification/ui-runtime-improvements/ROOT-FINAL-VERIFICATION.json)に各raw packを対応付け、最終4実行は458入力の前後一致を持つ。

37ecf88で設定70/70・モデル190/190・生成23/23・3engine36/36・SVG34/34がactual0だった。その後の重点74では72成功・2失敗を検出したため、閉Menuの2guardを直した。最終ソースで影響する28操作と3engine12操作を通過し、変更していない媒体・Tree・Diagramの46操作を含む先の72成功は履歴として保持する。最終ソースで74全部や元の1248件を再実行したという意味ではない。

最終3engine12操作はChromium153.0.8010.12・Firefox155.0・WebKit26.6の各4件が成功し、retry/skip/flaky/runtime error/未知warningは0。axe violationは0、incompleteは12case・21rule記録・52node（ARIA18＋contrast34）だった。SVG34では94pointer選択、34keyboard選択、34下書き・選択保持を実証した。字形の実衝突0とbounding boxの交差52を区別する。SVGの旧196ノードと新212ノードは別snapshotのraw結果であり、数の差を解消件数や旧tick欠損の証拠へ読み替えない。

rootの初回環境指定誤りは、Chromium起動前4失敗・Firefox/WebKit8成功とSVG起動前失敗・native0件でactual1だった。修正後は同じ458入力のまま成功し、[ブラウザー起動失敗](verification/ui-runtime-improvements/root-cross12-environment-failure-a1ed5c0/PACK-MANIFEST.json)と[SVG起動失敗](verification/ui-runtime-improvements/root-svg34-environment-failure-a1ed5c0/PACK-MANIFEST.json)を保存している。これは0件を合格へ置き換える手順ではない。各runnerの所有サーバー終了とPlaywright終了後のport5494 listener不在を確認した。

WebKitはSafari実機と区別する。DOM/ARIA/AX snapshotは実スクリーンリーダーの発話を保証しない。VoiceOverは利用可能性を読み取ったが、アクセシビリティ権限が未付与のため発話や実操作を測定していない。権限やOS設定は変更していない。機械で判断できない意味、未検証の実機は限界として記録する。実hardware・実サービスupload・本番認可は今回の承認範囲外、npm公開とライセンス決定は別のリリース判断である。
