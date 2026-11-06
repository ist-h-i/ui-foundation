# npm公開の手順と記録

現在の公開対象は`@hiroshi.inoue/ui-foundation@0.1.0-beta.3`、配布タグは`beta`、accessは`public`です。2026/11/06の本人の明示依頼により、英語主・日本語副の配布と新規アプリの英語既定値を検証し、必要なPRの通常merge、新版のnpm公開、公開版の導入確認を進めます。認証状態は公開前に確認し、認証情報は記録へ含めません。既存versionは上書きしません。公開版の導入検証後に`latest`も対象版へ更新し、新規プロジェクト・新規cacheで版指定なしの導入を確認します。

自作CLI・テンプレート・Skill・生成コードはMIT License（2026 Hiroshi Inoue）です。第三者資産の既存条件を保持し、候補と公開版を同じdigestへ結び付けます。CLI exitだけでは公開成功とせず、registryのstatus・version・tag・integrityと新規取得物の導入結果を確認します。過去のbeta.1検証記録は履歴として保持します。

## 配布仕様と受入条件

- 製品はNode.jsの`init/sync/check` CLI。Angular部品はアプリへ生成するソースで、コンパイル済みAngularライブラリのimport APIは追加しない。
- CLI・検査器・TypeScript標準libを事前ビルドし、利用先ではesbuildやcheckoutを要求しない。テンプレート、Skillとreferences、設定例、第三者通知、PDF source kitを同梱する。
- `files`で配布範囲を制限し、fixture、過去検証、evidence、認証設定、開発用node_modulesをtarballへ含めない。CLI用と生成検査器用の第三者ライセンス原文を保持する。
- 実tarballをcheckout外へ導入し、checkoutと開発元node_modulesへの読取りをOSで拒否した条件で、binからhelp/init/dry-run/sync/checkを実行する。ソース版との生成manifest一致、再同期、設定変更の検出・復旧、手編集保護、パッケージ非依存の検査器のエラー/警告を確認する。
- Angular/CDK/RxJSと各runtime engineは利用アプリへ別途導入する。PDF/Map/Sheet workerと補助資産の配信はアプリの責任で、CLI導入だけでは完了しない。
- 公開後はregistryのname/version/integrityと、公開版を新規取得したアプリで導入・生成・検査を確認する。通常インストール向けの公開では、`latest`の更新と、新規プロジェクト・新規cacheでのバージョン未指定インストールまでを完了条件に含める。ローカルtarball成功や固定versionの導入成功だけを公開完了と扱わない。

## ローカル候補の作成と導入

公開候補を作る前に、生成・型検査・対象試験・独立レビューを終えます。公開候補は新しい専用ディレクトリへ一回だけpackし、JSON出力、SHA256、SHA512 integrityを固定します。

```sh
npm run ui:sync
npm run ui:check:warnings
npm run package:build
npm pack --ignore-scripts --json --pack-destination /absolute/path/to/release-candidate
# 上のpack結果と独立計算したdigestを固定する
UI_FOUNDATION_PACKAGE_TARBALL=/absolute/path/to/release-candidate/candidate.tgz \
UI_FOUNDATION_PACKAGE_SHA256=<固定したSHA256> \
UI_FOUNDATION_PACKAGE_EVIDENCE=/absolute/path/to/release-evidence \
npm run test:package
```

実際のtgz名はpackの結果に従います。外部候補とdigestを指定した試験はbuild/packを迂回し、前後のバイト列と全package metadataを照合します。試験用のprivate合成版A/Bは更新・復旧の検証用であり、公開候補とは区別します。公開候補を再build/repackして置き換えません。失敗や終了不明は記録を保存し、公開前に原因と受入条件への影響を確認します。

通常の`npm pack`のprepackはパッケージ用ビルドを行います。固定公開工程では先に`package:build`し、`--ignore-scripts`で一回packします。fixtureアプリ用`npm run build`とは別工程です。次は利用アプリのルートで実行する。`init`後にアプリ用YAMLと、`checks.source_roots`が指す実際の対象ファイルを用意する。

```sh
npm install --save-dev /absolute/path/to/hiroshi.inoue-ui-foundation-0.1.0-beta.3.tgz
./node_modules/.bin/ui-foundation init
# ui.config.yamlとchecks.source_rootsをアプリに合わせて編集
./node_modules/.bin/ui-foundation sync --dry-run
./node_modules/.bin/ui-foundation sync
./node_modules/.bin/ui-foundation check --format json
```

文書は`node_modules/<パッケージ名>/docs/`、PDF source kitと原通知は同パッケージの`assets/pdf-source/`と`assets/third-party/`から取得する。アプリへのコピーとworker配信は[利用ガイド](ui-library-consumer-guide.ja.md#css-と配布資産)に従う。`dist/CLI-NOTICE.txt`と生成先の`CHECKER-NOTICE.txt`は別のbundleに対応する。

## 公開工程と見積り

初版の準備・公開工程は履歴として保存済みです。今後の通常インストール向けの公開も次の順で進めます。作業量の目安は1〜2hで、待ち時間や本人の実測時間とは別。過去の準備候補は[保存記録](verification/npm-beta-20261019/README.md)、各公開の実施結果はその公開専用の検証記録を参照する。

1. 公開用metadata・案内をcommitへ固定し、CLI・検査器をbuild、`npm pack --ignore-scripts --json`で候補を一度作る。SHA256とnpm integrityを保存する。
2. `UI_FOUNDATION_PACKAGE_TARBALL`と`UI_FOUNDATION_PACKAGE_SHA256`を指定したpackage試験で、その候補を隔離導入する。入力は一時領域へコピーし前後hashと全metadataを照合する。digest不一致は導入前に失敗させ、候補の再build・再packへ置換しない。
3. 候補と実consumer成果物を依存監査へ渡す。未知の原ライセンスや非稼働optional経路のUnknownを保持する。対象試験・静的検査・独立レビューの結果を固定する。
4. 正規アカウントと2FAで、検証済みの同一tgzを`npm publish /absolute/path/to/candidate.tgz --ignore-scripts --tag beta --access public --registry=https://registry.npmjs.org/`で公開する。この時点では`latest`を維持し、公開版の検証後に手順6で対象版へ進める。既存versionを上書きしない。応答が不明なときはregistryを先に確認し、publishを盲目的に再実行しない。
5. npm公式statusが`published`になったことを確認し、registryのname/version/dist-tags/dist.integrityを照合する。`validating`や承認待ちは未完了として同じ対象の状態を確認する。新規cacheとcheckout外のプロジェクトから固定versionを取得し、取得したtgzのSHA256/integrityが公開候補と同じことを確認する。同じpackage試験を取得物で再実行し、公開版の導入・生成・検査・UI操作を確認する。
6. 手順5の検証済みversionへ`npm dist-tag add <package>@<version> latest --registry=https://registry.npmjs.org/`で`latest`を更新する。変更前後のタグを記録し、registryで`latest`が対象versionを指すことを再確認する。タグ変更の認証待ち・終了不明・不一致は完了と扱わず、registryの状態を先に確認する。
7. checkout外の新規プロジェクトと新規cacheで、`npm install --save-dev @hiroshi.inoue/ui-foundation`のようにversion・タグを指定せず導入する。導入版・lockfileのintegrity・利用者文書の内容を候補と照合する。詳細は次節に従う。
8. 公開日時、候補と取得物のdigest、registry integrity、変更前後のタグ、通常インストールのコマンド・終了状態・導入版・文書照合結果、検証範囲・未確認事項を公開専用の証跡へ保存する。依頼に含まれない外部計画表は更新しない。

対応範囲はNode.js 24.19.0、macOS arm64、Angular/CDK 22.2.1、TypeScript 6.0.3。重点ブラウザー試験はChromium。未検証の版・OS・ブラウザーを合格へ補完しない。技術ゲートと公開ゲートの違い、更新・復旧、通信先と表計算コピーの制約は[ベータの利用・更新契約](npm-beta-readiness.ja.md)、依存監査の範囲は[監査文書](npm-beta-dependency-audit.ja.md)を参照する。

## latestの更新と通常インストールの検証

バージョンやタグを指定しない`npm install <package>`は、既定で`latest`を参照します。公開用の補助タグが`beta`でも、通常の導入先へ届ける対象版には`latest`も設定します。対象のcommit・tgz・固定digestと、手順5の公開版検証結果を確認してから更新します。以下は公開対象のcommitをcheckoutしたリポジトリのルートから実行します。`release_tarball`には固定済みの同一候補の絶対パスを指定します。

```sh
(
  set -eu
  release_version=$(node -p 'require("./package.json").version')
  release_tarball=/absolute/path/to/release-candidate/candidate.tgz
  release_integrity=$(node -e '
    const { createHash } = require("node:crypto");
    const bytes = require("node:fs").readFileSync(process.argv[1]);
    console.log("sha512-" + createHash("sha512").update(bytes).digest("base64"));
  ' "$release_tarball")
  release_probe_root=$(mktemp -d "${TMPDIR:-/tmp}/ui-foundation-release-install.XXXXXX")
  mkdir "$release_probe_root/app" "$release_probe_root/cache"
  printf '%s\n' "$release_probe_root"

  npm dist-tag ls @hiroshi.inoue/ui-foundation --registry=https://registry.npmjs.org/ > "$release_probe_root/tags-before.txt"
  npm dist-tag add "@hiroshi.inoue/ui-foundation@$release_version" latest --registry=https://registry.npmjs.org/
  npm view @hiroshi.inoue/ui-foundation dist-tags --json --registry=https://registry.npmjs.org/ --cache "$release_probe_root/tag-cache" > "$release_probe_root/tags-after.json"

  cd "$release_probe_root/app"
  node -e 'require("node:fs").writeFileSync("package.json", JSON.stringify({ private: true, type: "module" }) + "\n")'
  npm install --save-dev @hiroshi.inoue/ui-foundation --registry=https://registry.npmjs.org/ --cache "$release_probe_root/cache"
  node --input-type=commonjs - "$release_version" "$release_integrity" <<'NODE'
const assert = require('node:assert/strict');
const fs = require('node:fs');
const expectedVersion = process.argv[2];
const expectedIntegrity = process.argv[3];
const tags = JSON.parse(fs.readFileSync('../tags-after.json', 'utf8'));
const installed = require('./node_modules/@hiroshi.inoue/ui-foundation/package.json');
const locked = JSON.parse(fs.readFileSync('package-lock.json', 'utf8')).packages['node_modules/@hiroshi.inoue/ui-foundation'];
assert.equal(tags.latest, expectedVersion);
assert.equal(installed.version, expectedVersion);
assert.equal(locked.version, expectedVersion);
assert.equal(locked.integrity, expectedIntegrity);
console.log(JSON.stringify({ version: installed.version, integrity: locked.integrity, latest: tags.latest }));
NODE
)
```

出力された検証ディレクトリを保存し、次を確認・記録します。

- `node_modules/@hiroshi.inoue/ui-foundation/README.md`と`docs/`の全利用者資料を、固定tgzの展開物とファイル集合・SHA256で照合する。README、usage、部品一覧、コマンド一覧、AIの読み込み手順が最新であり、開発計画・ADR・検証記録等を含まないことを確認する。`npm install`の成功や版番号の一致だけでは文書の確認済みとしない。
- 新規プロジェクトには既存の`package-lock.json`・`node_modules`を持ち込まず、cacheも公開ごとに新規作成する。version指定・`@latest`や`@beta`指定・ローカルtgz指定の導入は、このバージョン未指定の確認と別に記録する。
- `latest`、導入版、integrity、文書のいずれかが一致しなければ公開完了としない。候補と結果を保存して原因を確認し、ソースの再packや同versionの再publishで置き換えない。必要なタグ修正は対象版と影響を確認して行う。

既存プロジェクトで旧版をlockfileに固定したままの`npm install`は、その固定版を再現します。新規導入の検証は上記の新規環境で行い、既存利用者への案内にはパッケージ更新と必要な再同期を含めます。この手順書は開発者向けのため、npmと生成Skillの利用者資料には追加しません。

## 認証と公開結果の扱い

今回の公開先・version・タグに対する本人の指示を適用し、別の公開へ拡大しない。認証情報・OTP・復旧コードは検証記録に保存しない。npm公式ログインの通常のローカル認証設定は本人が管理する。2FAの本人確認が求められた場合は公式画面で本人が完了する。Trusted Publishing/provenanceはこの手動公開では設定済みと記録しない。

公開後に問題が見つかった場合、公開済みversionを上書きしない。結果を保存し、修正版・タグ変更・非推奨化などの対応方針を確認する。公開後の導入失敗を合格へ補完せず、今回の結果に残す。

仕様参照: [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)、[npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/)、[npm dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/)、[Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)。

## beta.2の文書配布境界

`package.json`の`files`に利用者向け文書をファイル名で明示し、生成Skillも同じリストを参照します。READMEと14 Markdown、API目録、設定例を利用先へ渡し、開発計画・ADR・要求追跡・監査/検証記録は配布しません。既存の開発説明は`docs/development.md`等に残します。第三者通知と対応ソースは文書分類と別に、従来の全内容を保持します。

試験では、任意の開発文書を追加しても生成対象へ入らないこと、許可資料の欠損・glob・symlinkを拒否すること、実tarballと生成Skillの文書集合が一致すること、旧版で所有していた開発文書だけが再同期で退役すること、手編集/未所有物を保護することを確認します。
