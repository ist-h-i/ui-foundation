# 名称・MIT確定後の候補検証

公開予定名`@hiroshi.inoue/ui-foundation`、初版`0.1.0-beta.1`、自作CLI・テンプレート・Skill・生成自作コードのMIT License（2026 Hiroshi Inoue）を本人が決定した。第三者の原条件は保持する。`private: true`を維持し、npm公開・名前予約・権限変更・今回追加分のPRのReady化・mergeは行っていない。

## 固定した候補

ソースcommit `4820be8309d503026c1b085684b1d684e9c95f0c`。

tgz SHA256 `0cd6d4ffe7e6d4768713d65fd16485b6de014c5b5afcae55dedfe4377c1a8567`。316 files、圧縮7,075,534 bytes、展開20,362,718 bytes。MIT本文SHA256 `8a37eec5a3c72f402f170a31547a367d5d3f8d252538dbc72dfe44d9a088f5cd`。パッケージ・生成output・生成Skill・配信先の本文を同一バイトで照合した。アプリ自身のroot LICENSEは上書きしない。

## 実行結果

- 型検査（tools/Angular/media/runtime）成功。
- 生成ライセンス・Skill参照2試験成功。manifest所有、手編集拒否、未所有衝突拒否、アプリroot LICENSE保持を確認。
- 監査の単体10試験成功。自作MITの欠損・変更を拒否する負例を含む。
- 静的検査・警告分類はソースエラー0、122/122分類一致、未分類・消滅0。既存警告はUnknownを保持し、抑制やレビュー内容の変更はない。
- package試験2/2成功。checkout/node_modulesのOS読取り拒否、offline導入、ソース版と生成manifest一致、同梱checker、A/B/A更新・復旧、手編集/未所有保護、I/O rollback、strict AOT/build、入力保持、表計算/PDF/Mapの3workerを確認。222 HTTP資産のバイトと80 Skill参照が一致。
- [この候補の依存監査](dependency-audit-metadata.json)はVerified。293依存の既知advisory0、高・重大0。原通知と42資産（自作MITのpackage/delivery 2項目を含む）を照合。既存の非配布native原文1件と非稼働WASI依存5件はUnknownのまま。今回のDarwin arm64候補だけのshipping gateである。
- [fresh独立レビュー](independent-review-metadata.md)で具体的な指摘なし。重い統合試験は主担当が結果・成果物を直接確認した。

## 未完了の公開ゲート

本人申告のnpmユーザー名は`hiroshi.inoue`で、公式ブラウザー画面の識別子も一致した。未認証のregistry照会はE404で、公開版や利用権限の証明にはならない。当初CLIはENEEDAUTHだったが、本人のターミナルでの認証後、公式registryへのwhoamiは`hiroshi.inoue`、profileの`email_verified`はtrueと確認した。`tfa`はfalse（2FA無効）。本人は2FA設定を後日にすると明示した。個人scope名と認証ユーザーは一致するが、実際の公開権限をregistry書込みで試験してはいない。認証情報は記録しない。配布文書内の未確認という記述は固定候補作成時点の状態で、最新のアカウント確認はこの追加記録を正本とする。

本人の明示公開指示後にprivate解除と候補再作成・再検証が必要で、現tgzをそのまま公開可能とは扱わない。公開後のregistry取得・version/integrity確認も未実行。前段のPR #22は作業中の14:38:02 UTCにmain `275b710fa799d4fd564312d05049cebe981ea69c`へmerge済みになった。今回追加のmetadata・MIT変更は別のDraft PRへ切り出し、未merge・未Ready。

本人の残枠は統合判断0.25〜1h（代表0.5h）、2FA設定・公開判断0.5〜1.5h（代表1h）。AI作業目安は統合差分再確認0〜1h、公開指示後の再検証・公開後導入1〜2h。実測・待ち時間ではない。統合は10/23仮目標、公開日は未定。詳細と証拠の保存先は[機械可読記録](metadata-verification.json)を参照する。
