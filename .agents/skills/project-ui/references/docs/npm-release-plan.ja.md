# npm公開の準備と見積り

パッケージは`@hiroshi.inoue/ui-foundation@0.1.0-beta.1`、自作CLI・テンプレート・Skill・生成コードはMIT License（2026 Hiroshi Inoue）。2026/10/20に本人が最終検証、`beta`タグでのnpm公開、公開版の導入確認を明示した。CLIユーザー`hiroshi.inoue`、メール認証、2FAは確認済み。今回の公開用に`private: false`とする。公開結果は実際のregistry応答と新規取得物へ結び付け、未実行を成功と扱わない。

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

## 公開工程と見積り

技術準備・名称・MIT・初版は10/19にPR #23までmain統合済み。10/20の公開工程は次の順に行う。作業量の目安は1〜2hで、待ち時間や本人の実測時間とは別。過去の準備候補は保存記録（開発元の参考資料: `verification/npm-beta-20261019/README.md`。この生成Skillには含めない）、今回の実施結果は公開検証記録とガントを参照する。

1. 公開用metadata・案内をcommitへ固定し、CLI・検査器をbuild、`npm pack --ignore-scripts --json`で候補を一度作る。SHA256とnpm integrityを保存する。
2. `UI_FOUNDATION_PACKAGE_TARBALL`と`UI_FOUNDATION_PACKAGE_SHA256`を指定したpackage試験で、その候補を隔離導入する。入力は一時領域へコピーし前後hashと全metadataを照合する。digest不一致は導入前に失敗させ、候補の再build・再packへ置換しない。
3. 候補と実consumer成果物を依存監査へ渡す。未知の原ライセンスや非稼働optional経路のUnknownを保持する。対象試験・静的検査・独立レビューの結果を固定する。
4. 正規アカウントと2FAで、検証済みの同一tgzを`npm publish /absolute/path/to/candidate.tgz --ignore-scripts --tag beta --access public --registry=https://registry.npmjs.org/`で公開する。`latest`タグを設定せず、既存versionを上書きしない。応答が不明なときはregistryを先に確認し、publishを盲目的に再実行しない。
5. registryのname/version/dist-tags/dist.integrityを照合する。新規cacheとcheckout外のプロジェクトから固定versionを取得し、取得したtgzのSHA256/integrityが公開候補と同じことを確認する。同じpackage試験を取得物で再実行し、公開版の導入・生成・検査・UI操作を確認する。
6. 公開日時、候補と取得物のdigest、registry integrity、検証範囲・未確認事項を保存し、ガントへ完了を反映する。

対応範囲はNode.js 24.19.0、macOS arm64、Angular/CDK 22.2.1、TypeScript 6.0.3。重点ブラウザー試験はChromium。未検証の版・OS・ブラウザーを合格へ補完しない。技術ゲートと公開ゲートの違い、更新・復旧、通信先と表計算コピーの制約は[ベータの利用・更新契約](npm-beta-readiness.ja.md)、依存監査の範囲は[監査文書](npm-beta-dependency-audit.ja.md)を参照する。

## 認証と公開結果の扱い

今回の公開先・version・タグに対する本人の指示を適用し、別の公開へ拡大しない。認証情報・OTP・復旧コードは検証記録に保存しない。npm公式ログインの通常のローカル認証設定は本人が管理する。2FAの本人確認が求められた場合は公式画面で本人が完了する。Trusted Publishing/provenanceはこの手動公開では設定済みと記録しない。

公開後に問題が見つかった場合、公開済みversionを上書きしない。結果を保存し、修正版・タグ変更・非推奨化などの対応方針を確認する。公開後の導入失敗を合格へ補完せず、今回の結果に残す。

仕様参照: [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)、[npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/)、[Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)。
