# 検証ツールの再実行

PR13の保存証拠には、当時のcheckoutや一時作業場所を参照するone-shot scriptも元のバイト列で含めている。これらはmanifestが検証する履歴であり、継続実行する入口は以下の3本とする。履歴を置換して、過去の実終了値や独立承認を書き直さない。

| 当時の保存script | 継続実行する入口 | 今回実行する処理 |
| --- | --- | --- |
| `media-tree-independent/review-tools/audit-media-independent.mjs` | `scripts/verification/audit-media.mjs` | 現在のMedia3spec・helper・設定と明示baselineの実監査・型検査 |
| `media-tree-independent/review-tools/build-handoff.py` | `scripts/verification/build-handoff.py` | 既存Media/Tree packのSHA256・bytes・相対pathを検査し、元のまま別の場所へ搬送 |
| `cross-browser-author/tools/build-public-proof.py` | `scripts/verification/build-public-proof.py` | 既存cross-browser packと段階別の結果対応を検査し、元のまま別の場所へ搬送 |

保存scriptの相対位置は `docs/verification/ui-runtime-improvements/` を起点とする。新しい入口はscript自身が属するcheckoutを既定のrepoとし、別の作業ディレクトリから呼び出せる。`--repo` で対象を明示できる。Nodeとcheckoutの正規依存、Python3が必要で、接続・権限・ブラウザーの変更は行わない。

Mediaの監査はUI操作や全UI specの型検査を代替しない。証拠の搬送はファイルの一致を確認する処理であり、UI試験・build・描画・独立レビューを再実施したという意味にはならない。元のactual1、incomplete、対象commitと限定承認を保持する。

repoルートでの実行例は次のとおり。出力先はまだ存在しない場所を選ぶ。

```sh
npm run audit:media -- --baseline 9f5430ca87e249af204cc335a8610d0d8040621f --output /tmp/ui-media-audit

npm run verify:evidence:handoff -- \
  --manifest-sha256 bc9049f0128c315ea963e1d7ac371b2a65b7e1789996668fc333ae32777f4998 \
  --transport-metadata-sha256 a87cc9844bcd51bc4bc76db85d72d73ae0a981ade45c1dd0544896738bd6dcef \
  --output /tmp/ui-media-tree-transport

npm run verify:evidence:cross-browser -- \
  --manifest-sha256 e929d1d31b57b55717dcf511388fd82991273b6e661f6afbd737ccfcd184ca78 \
  --transport-metadata-sha256 b87271548398f71268790e0710a001622402437ed1ee75bd11b3ebf1391cbe06 \
  --output /tmp/ui-cross-browser-transport
```

別cwdからはcheckout内のscriptのパスを直接指定する。`--repo`・`--source-pack`・`--output` の明示相対パスは呼出し時のcwdを起点とする。Mediaのbaselineは必須で、Git履歴が足りない場合も成功にはしない。タイトル・matcherの期待値とlabelは原文のまま比較するため、書式だけの変更も不一致になる。固定3specがcompiler rootに含まれ、helperがimport先も含めたTypeScript programに存在し、strict/noEmitが有効であることも検査する。インストール済みTypeScriptがstrict下位設定として定義した項目の実効値を検査し、`strict: true`でも`noImplicitAny: false`などの明示無効を拒否する。型検査を無効にする `noCheck=true` は拒否し、実コンパイラにも `--noCheck false` を明示する。reportの`disabledStrictChecks`と`missingCompilerHelper`は、コンパイラ実終了値とは別に対象漏れ・設定不足を示す。

証拠builderはdirectory入力を扱う。`--source-pack` と `--manifest` を省略すると、上記の保存packとそのmanifestをcheckoutから選ぶ。期待SHAは別途保存した値を必ず渡す。rootによる採用情報 `ROOT-ADOPTION.json` があるpackでは、そちらの期待SHAも必要になる。元のmanifestやpayloadを修正せず、列挙されていないファイル、パスの逸脱、symlink、重複、改変、既存出力、入出力の重なりを拒否する。

出力の `payload/` は元のlisted file・manifest・検査した採用情報のバイト列を保持し、`payload.tar.gz` と `transport-receipt.json` を付ける。receiptの成功は搬送検査の実終了だけを表す。履歴packに含まれる判定・失敗・対象commitは元のまま残る。

PR15時点のローカル回帰は `npm run test:verification` の48/48が実終了0。別checkoutの3入口から、実Mediaの228 matcher・18タイトル・any0・コンパイラ実終了0、および既存2packの139/359 payloadのバイト一致と再搬送を確認した。回帰数には失敗を正しく拒否する検査と親testを含み、UI操作の件数ではない。

通常の `npm run typecheck` と `ui:check` も実終了0。初回 `ui:check` はsandboxの一時IPC制限で起動前に実終了1となり、同じ入力を許可された環境で照合して成功した。元の失敗は保持する。独立レビューで見つかった文字列内空白の偽一致とコンパイラからの3spec除外、最終確認で実証したnoCheckによる型検査の無効化は専用回帰で検査する。原181要件・製品・151管理生成ファイル・旧証拠は変えていない。

実行証拠と独立判定は 採用記録（開発元の参考資料: `verification/portable-tools/ROOT-REVIEW-ADOPTION.json`。この生成Skillには含めない） から参照する。[PR #15](https://github.com/ist-h-i/ui-foundation/pull/15)・[Issue #14](https://github.com/ist-h-i/ui-foundation/issues/14) にマージとmain確認を記録する。旧47件の全変更承認と、noCheck修正後48件に対応する差分承認を区別して保存した。

PR15後のstrict下位設定とhelper対象漏れの2指摘は [Issue #16](https://github.com/ist-h-i/ui-foundation/issues/16) へ分けた。旧監査がコンパイラ実終了0のまま誤成功する2反例を保存し、実効strict設定8項目とhelperのtransitive包含を確認する10回帰を加えた。専用回帰は58/58・実終了0、実Mediaは228 matcher・18タイトル・any0・コンパイラ実終了0で、strict下位8項目はすべて有効、helperはTypeScript programに含まれた。旧48件の記録と承認は当時の結果として保持する。
