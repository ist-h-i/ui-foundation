# npm公開の準備と見積り

2026/10/19の追加依頼による、既存UI基盤の完成後の配布工程。従来の「npm公開は対象外」は既存基盤の受入範囲であり、この工程では公開を計画する。現在は未公開で、`private: true`、名前`ui-foundation`、版`0.0.0`は準備用のまま。公開名・scope・初版version・自作コードのライセンス・公開アカウントは未決定。

## 配布仕様と受入条件

- 製品はNode.jsの`init/sync/check` CLI。Angular部品はアプリへ生成するソースで、コンパイル済みAngularライブラリのimport APIは追加しない。
- CLI・検査器・TypeScript標準libを事前ビルドし、利用先ではesbuildやcheckoutを要求しない。テンプレート、Skillとreferences、設定例、第三者通知、PDF source kitを同梱する。
- `files`で配布範囲を制限し、fixture、過去検証、evidence、認証設定、開発用node_modulesをtarballへ含めない。CLI用と生成検査器用の第三者ライセンス原文を保持する。
- 実tarballをcheckout外へ`--offline --omit=dev --ignore-scripts`で導入し、binからhelp/init/dry-run/sync/checkを実行する。ソース版との生成manifest一致、再同期、設定変更の検出・復旧、手編集保護、パッケージ非依存の検査器のエラー/警告を確認する。
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

## 残作業と暫定日程

10/19着手、10/23公開を暫定目標とする。公開名・ライセンス・権限が10/21までに確定し、関連検証が通ることが前提。待ち時間は工数に含めず、毎日の本人稼働義務も意味しない。

| 工程 | 目安日 | 残る実装・検証の作業量 |
| --- | --- | --- |
| 配布構成・clean CLI導入・文書 | 10/19〜20 | 今回の準備結果から不足分を修正 |
| 確定metadata/ライセンス、対応Node版、tarball由来の生成部品のstrict AOT・worker/asset確認 | 10/20〜21 | 6〜10h |
| fresh独立レビュー、修正、候補固定、通常mergeの判断 | 10/22 | 3〜4h |
| 正規アカウントで公開、registry版の新規導入確認 | 10/23 | 1〜2h |

配布構成とCLI導入の準備後に残る実装・検証は合計10〜16hの仮見積り。AIが行う開発・試験の作業量目安で、実測の本人時間や自動経過時間ではない。本人の名前/ライセンス選択、権限確認、merge/公開判断は別に1〜3h（代表値2h）を確保する。ガントの本人判断枠にはこの2hだけを加算し、10〜16hと混ぜない。

対応Node範囲は`package.json`の`engines`に従う。準備時の実行版はNode 24.19.0で、他の対応版・OSを合格へ補完しない。tarball由来のAngular strict AOT・worker/asset確認と公開後の新規導入は、CLI smokeとは別の証拠とする。決定待ちや重要なreview指摘、対応版での失敗があれば10/21に再見積りする。

## 公開前の判断

1. 本人が公開名/scopeの利用権限、初版version、自作コードのライセンスを決める。第三者通知の存在を自作コードの権利許諾と混同しない。
2. 確定metadataを候補commitに固定し、検証・独立レビュー後に通常mergeする。名前/version変更後は候補tarballを再検証する。
3. 手動公開は既存の正規アカウントと2FAを使い、認証情報を保存しない。Trusted Publishingを選ぶ場合はnpm側の設定と対応CIが別途必要。未設定のOIDC/provenanceを有効と記録しない。
4. 公開の明示指示後に`private: true`を変更し、候補を公開する。今回の準備ではregistry書込み、名前予約、権限変更を行わない。
5. 公開version/integrityを記録し、checkoutやローカルtarballを使わず取得・導入して確認する。公開済みversionの上書きは試みない。

仕様参照: [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)、[Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)。`private`、`files`、`bin`と公開条件の説明を2026/10/19に確認した。
