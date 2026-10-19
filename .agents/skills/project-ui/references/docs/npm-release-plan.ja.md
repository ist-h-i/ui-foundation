# npm公開の準備と見積り

2026/10/19の追加依頼による、既存UI基盤の完成後の配布工程。従来の「npm公開は対象外」は既存基盤の受入範囲であり、この工程では公開を計画する。本人が公開予定名`@hiroshi.inoue/ui-foundation`、初版`0.1.0-beta.1`、自作CLI・テンプレート・Skill・生成コードのMIT License（2026 Hiroshi Inoue）を決定した。npm未公開で`private: true`を維持する。npmユーザー名は本人申告`hiroshi.inoue`。CLI認証・2FA・公開権限は未確認。

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
npm install --save-dev /absolute/path/to/hiroshi.inoue-ui-foundation-0.1.0-beta.1.tgz
./node_modules/.bin/ui-foundation init
# ui.config.yamlとchecks.source_rootsをアプリに合わせて編集
./node_modules/.bin/ui-foundation sync --dry-run
./node_modules/.bin/ui-foundation sync
./node_modules/.bin/ui-foundation check --format json
```

文書は`node_modules/<パッケージ名>/docs/`、PDF source kitと原通知は同パッケージの`assets/pdf-source/`と`assets/third-party/`から取得する。アプリへのコピーとworker配信は[利用ガイド](ui-library-consumer-guide.ja.md#css-と配布資産)に従う。`dist/CLI-NOTICE.txt`と生成先の`CHECKER-NOTICE.txt`は別のbundleに対応する。

## 残作業と見直した日程

名称・初版・MITは確定した。10/23は技術準備を統合するための仮目標とし、公開日は設定しない。待ち時間を工数へ含めず、本人稼働の実測値とも扱わない。

| 工程 | 目安日 | 残る作業量の目安 |
| --- | --- | --- |
| 決定したmetadata・MITの配布経路を実装し、候補を再作成・再監査・独立レビュー | 10/19〜20 | AI実装・検証1〜2h。今回実施する |
| 技術準備の統合判断 | 10/20〜23（仮） | 本人判断0.25〜1h（代表値0.5h）。Draft PRのまま提示する |
| npmログイン・メール認証・2FA・scope権限確認と公開判断 | 未定・保留 | 本人0.5〜1.5h（代表値1h）。登録・設定待ちは含めない |
| 明示的な公開指示後のprivate解除・候補の再検証・公開・registry版導入確認 | 公開指示後 | AI作業1〜2h。今回の公開操作は行わない |

ガントでは本人判断の技術統合0.5hと公開準備・判断1hを別行に置く。後者は日程未定のため週次負荷へ割り当てない。過去の着手時見積り・候補検証の実績は検証記録（開発元の参考資料: `verification/npm-beta-20261019/README.md`。この生成Skillには含めない）に保持する。

対応範囲はNode.js 24.19.0、macOS arm64、Angular/CDK 22.2.1、TypeScript 6.0.3。重点ブラウザー試験はChromium。未検証の版・OS・ブラウザーを合格へ補完しない。技術ゲートと公開ゲートの違い、更新・復旧、通信先と表計算コピーの制約は[ベータの利用・更新契約](npm-beta-readiness.ja.md)、依存監査の範囲は[監査文書](npm-beta-dependency-audit.ja.md)を参照する。

## 公開前の判断

1. 公開予定名・初版・MITは決定済み。npm CLIの認証ユーザーが`hiroshi.inoue`であること、メール認証・2FA・個人scopeの公開権限を確認する。未認証での404応答を名前の予約や権限確認と扱わない。
2. 確定metadataを候補commitに固定し、検証・独立レビュー後に通常mergeする。名前/version変更後は候補tarballを再検証する。
3. 手動公開は既存の正規アカウントと2FAを使い、認証情報をリポジトリや検証記録へ保存しない。npm公式ログインが保存する通常のローカル認証設定は、本人の操作で作成する。Trusted Publishingを選ぶ場合はnpm側の設定と対応CIが別途必要。未設定のOIDC/provenanceを有効と記録しない。
4. 公開の明示指示後に`private: true`を変更し、`beta`タグ・public access・公式registryを指定して、再検証した同一tgzを公開する。`publishConfig`はその既定値を設定するが、公開指示や権限の代わりにはならない。今回の準備ではregistry書込み、名前予約、権限変更を行わない。
5. 公開version/integrityを記録し、checkoutやローカルtarballを使わず取得・導入して確認する。公開済みversionの上書きは試みない。

仕様参照: [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)、[Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)。`private`、`files`、`bin`と公開条件の説明を2026/10/19に確認した。
