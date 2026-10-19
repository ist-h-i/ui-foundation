# npm公開ベータの準備・対象検証記録

2026/10/19、候補commit `5844a9cd5d0de8a85590e7399582e499d040046d` の修正・対象検証を完了した。Draft PR #22は未統合。公開名・自作コードのライセンスは未定、`private: true`を維持し、npm公開は行っていない。

候補tgzのSHA256は `36c7c4ad1ef7d26df56413919279c0674dab0b9d5d35613619fa0ef4e5337eb4`。315 files / tgz 7,074,292 bytes / 展開後20,359,117 bytes。後続のこの記録の追加は配布対象・生成契約を変えない。

## 結果

- 型検査（tools/Angular/media/runtime）、設定72件、同期・移行・排他28件、警告台帳・Skill参照11件が成功。型検査対象の実装は候補まで変更していない。
- 静的検査は0エラー、既存122警告はUnknownのまま。最新コードの分類照合122/122・未分類0・消滅0。以後は文書の引数重複だけを修正し、同期dry-runは差分なし。
- 最終package試験2件が成功。OSによるcheckoutと開発元node_modulesの読取り拒否、bin導入、非公開合成版A→B→A、手編集/未所有保護、I/O失敗の復元を確認。
- 独立依存導入からstrict AOT・build、入力DOM/値とprofile変更、表計算・PDF・Mapの3workerを実操作した。221資産のHTTP byte hash、80 Skill参照が成功。実browser bundleの1203入力と39出力の全バイトを保存metafile/reportへ結び付けた。
- 監査回帰9件と[最終依存監査](dependency-audit.json)が成功。293件の既知advisoryは0、高・重大0。CLI/checker各13依存、原通知149件、40資産を照合した。

監査のVerifiedは今回の候補・consumer・Darwin arm64配布に限定する。非配布native packageの原ライセンス1件と、非稼働WASI経路の内部依存5件はUnknownを保持した。前者はactual bundle入力、出力バイト、候補と配信先のnativeファイル/同一binaryの不在から今回の配布対象外と判定した。原文確認済みや他OSで動くという意味ではない。[最初の停止結果](dependency-audit-initial.json)も保存した。

## レビューと未確認

[初回独立レビュー](independent-review-initial.md)、[入力更新の確認](independent-review-inputs.md)、[配布監査のfreshレビュー](independent-review-shipping.md)で必須修正指摘なし。資産の取得先の説明と、監査コマンドの重複を修正した。レビュー判定はnpm公開の認可ではない。

全件の`npm test`、他Node/OS/browser、SSR、npm公開とregistry版の新規取得は未確認。以前の既存generation consumer480秒timeoutを今回の新しいtgz consumerの成功と混同しない。

## 残日程と工数

ガントはU3.1を「検証済・統合待ち」、main統合10/23仮目標へ更新。残る技術差分再確認はAI作業量の目安0〜1h、本人の統合判断は0.25〜1h（代表0.5h）。U3.2 npm公開は日付なしの保留。公開方針決定後にmetadata反映・候補再監査・新規導入等2〜4h（AI目安）、本人判断1〜3h（代表2h）を見込む。待ち時間や本人の実測時間ではない。

詳細なcommit・実行範囲・hash・保存先は[機械可読記録](verification.json)を参照する。公開名・ライセンス確定後は、そのmetadataと権利資料を含む別候補で再検証し、本人の公開指示を得る。
