# npm公開の準備と見積り

2026/10/19の追加依頼による、既存UI基盤の完成後の配布工程。従来の「npm公開は対象外」は既存基盤の受入範囲であり、この工程では公開を計画する。現在は未公開で、`private: true`、名前`ui-foundation`、版`0.0.0`は準備用のまま。公開名・scope・初版version・自作コードのライセンス・公開アカウントは未決定。

## 配布仕様と受入条件

- 製品はNode.jsの`init/sync/check` CLI。Angular部品はアプリへ生成するソースで、コンパイル済みAngularライブラリのimport APIは追加しない。
- CLI・検査器・TypeScript標準libを事前ビルドし、利用先ではesbuildやcheckoutを要求しない。テンプレート、Skillとreferences、設定例、第三者通知、PDF source kitを同梱する。
- `files`で配布範囲を制限し、fixture、過去検証、evidence、認証設定、開発用node_modulesをtarballへ含めない。CLI用と生成検査器用の第三者ライセンス原文を保持する。
- 実tarballをcheckout外へ導入し、checkoutと開発元node_modulesへの読取りをOSで拒否した条件で、binからhelp/init/dry-run/sync/checkを実行する。ソース版との生成manifest一致、再同期、設定変更の検出・復旧、手編集保護、パッケージ非依存の検査器のエラー/警告を確認する。
- Angular/CDK/RxJSと各runtime engineは利用アプリへ別途導入する。PDF/Map/Sheet workerと補助資産の配信はアプリの責任で、CLI導入だけでは完了しない。
- 公開後はregistryのname/version/integrityと、公開版を新規取得したアプリで導入・生成・検査を確認する。ローカルtarball成功を公開済みと扱わない。

## ローカル候補の作成と導入

```sh
npm ci
npm run ui:sync
npm run ui:check
npm run test:package
npm pack --pack-destination /absolute/path/to/release-candidate
```

`npm pack`のprepackはパッケージ用ビルドを行う。fixtureアプリ用`npm run build`とは別工程。次は利用アプリのルートで実行する。`init`後にアプリ用YAMLと、`checks.source_roots`が指す実際の対象ファイルを用意する。

```sh
npm install --save-dev /absolute/path/to/ui-foundation-0.0.0.tgz
./node_modules/.bin/ui-foundation init
# ui.config.yamlとchecks.source_rootsをアプリに合わせて編集
./node_modules/.bin/ui-foundation sync --dry-run
./node_modules/.bin/ui-foundation sync
./node_modules/.bin/ui-foundation check --format json
```

文書は`node_modules/<パッケージ名>/docs/`、PDF source kitと原通知は同パッケージの`assets/pdf-source/`と`assets/third-party/`から取得する。アプリへのコピーとworker配信は[利用ガイド](ui-library-consumer-guide.ja.md#css-と配布資産)に従う。`dist/CLI-NOTICE.txt`と生成先の`CHECKER-NOTICE.txt`は別のbundleに対応する。

## 残作業と見直した日程

10/19の追加依頼により、公開名・自作コードのライセンスは未定を維持し、npm公開は保留する。旧計画の「10/21までに決定、10/23公開」は取り下げる。10/23は公開ベータの**技術準備を統合するための仮目標**とし、公開日は設定しない。待ち時間を工数に含めず、毎日の本人稼働義務も意味しない。

| 工程 | 目安日 | 残る作業量の目安 |
| --- | --- | --- |
| 隔離tgz導入、生成UI/worker/配信資産、版更新・復旧、排他制御とSkill参照の修正・検証 | 10/19〜20 | 固定候補の検証・独立レビュー・指摘対応に3〜6h |
| 技術準備の統合判断 | 10/20〜23 | 本人判断0.25〜1h（代表値0.5h）。Draft PRのまま提示し、通常mergeは別途の指示に従う |
| 名称・version・自作/生成コードの条件・公開権限・公開判断 | 未定・保留 | 本人判断1〜3h（代表値2h）。期限を置かない |
| 決定後のmetadata反映、候補再作成・再監査・新規導入、公開後のregistry版確認 | 公開指示後 | 実装・検証2〜4h。現在は実行しない |

この表は10/19の着手時点の見積りで、実装・検証の残量を3〜6h、公開に向けた決定後の追加作業を2〜4hへ見直したもの。完了後の結果と残量は最終検証記録（開発元の参考資料: `verification/npm-beta-20261019/README.md`。この生成Skillには含めない）とガントで確認する。これはAIが進める開発・試験の作業量の目安で、本人の実測時間や自動実行の経過時間ではない。ガントの本人判断枠は技術統合0.5hと公開判断2hを別行に置く。公開判断の2hは日程未定のため週次負荷へ割り当てない。

対応範囲はNode.js 24.19.0、macOS arm64、Angular/CDK 22.2.1、TypeScript 6.0.3。重点ブラウザー試験はChromium。未検証の版・OS・ブラウザーを合格へ補完しない。技術ゲートと公開ゲートの違い、更新・復旧、通信先と表計算コピーの制約は[ベータの利用・更新契約](npm-beta-readiness.ja.md)、依存監査の範囲は[監査文書](npm-beta-dependency-audit.ja.md)を参照する。

## 公開前の判断

1. 本人が公開名/scopeの利用権限、初版version、自作コードのライセンスを決める。第三者通知の存在を自作コードの権利許諾と混同しない。
2. 確定metadataを候補commitに固定し、検証・独立レビュー後に通常mergeする。名前/version変更後は候補tarballを再検証する。
3. 手動公開は既存の正規アカウントと2FAを使い、認証情報を保存しない。Trusted Publishingを選ぶ場合はnpm側の設定と対応CIが別途必要。未設定のOIDC/provenanceを有効と記録しない。
4. 公開の明示指示後に`private: true`を変更し、候補を公開する。今回の準備ではregistry書込み、名前予約、権限変更を行わない。
5. 公開version/integrityを記録し、checkoutやローカルtarballを使わず取得・導入して確認する。公開済みversionの上書きは試みない。

仕様参照: [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)、[Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)。`private`、`files`、`bin`と公開条件の説明を2026/10/19に確認した。
