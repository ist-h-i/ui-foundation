# npm公開の手順

現行の公開手順は本書を入口とする。対象版・候補タグは公開するコミットの `package.json`、過去版と `latest` は公式registryの照合結果から決める。mainにある版は公開済み版を意味しない。npmパッケージのREADMEと同梱文書はそのパッケージ版の契約とし、GitHubのmainは次の候補を含み得る。通常導入版は `latest`、候補版は承認した候補タグまたは固定版で区別する。

過去の記録: [ベータ公開の手順と記録](npm-beta-publication-history.ja.md) · [初回通常版0.1.0の計画](npm-stable-release-plan.ja.md)。過去の認可・版・タグ・対応環境を次の公開に流用しない。

## 1. 公開前の候補と文書

- 対象コミットを固定し、package metadata、lockfile、日英README、導入ガイド、利用契約、リリースノート、公開API、生成Skillを照合する。文書の現行版は候補版と一致させ、過去版の移行手順は履歴として残す。
- `npm run ui:sync`、`npm run ui:check:warnings`、型検査、変更対象の試験、独立レビューを実施する。全標準部品のスタイル照合（[#39](https://github.com/ist-h-i/ui-foundation/issues/39)）を維持する。
- 固定tarballを一度だけ作り、SHA-256とSHA-512 integrity、対象コミット、pack結果を保存する。

```sh
npm run package:build
npm pack --ignore-scripts --json --pack-destination /absolute/path/to/release-candidate
# release_tarball と release_sha256 には検証記録の実測値を設定する
UI_FOUNDATION_PACKAGE_TARBALL="$release_tarball" \
UI_FOUNDATION_PACKAGE_SHA256="$release_sha256" \
UI_FOUNDATION_PACKAGE_EVIDENCE=/absolute/path/to/release-evidence \
npm run test:package
```

固定候補をcheckout外で検証し、生成・再同期・手編集保護、日英資料・Skillの同梱・参照、旧公開版からの移行と復旧を確認する。依存監査、原ライセンス、対応環境の独立したAngularアプリ（Tailwindなしの標準CSSも含む）、対象画面の実操作とアクセシビリティを確認する。候補を再packして置き換えない。既存の配布試験が文書の版・配布範囲・生成Skillを検査する。registry照合を技術ゲートの必須ネットワーク依存にしない。

## 2. registryと配布意図の照合（読み取り専用）

公開操作の前に次の観測を行い、全タグ、全版、対象版の公開時刻・integrity、通常インストールで取得する版を記録する。JSONを公開証跡に保存する。スクリプトは公開・タグ変更を行わない。

```sh
node scripts/package-verification/registry.mjs --stage observe
```

取得不能は `status: registry-unavailable`、公式registryのHTTP 404は `registryStatus: not-found` として記録する。パッケージを取得できても対象版が存在しない場合は `targetState: unpublished` になる。対象版が公開済みの場合は `targetState` と `targetTags` で通常配布、候補タグ、タグなしの固定版を区別する。観測時は最新タグの有無に応じて通常導入、対象版が公開済みなら固定版導入をそれぞれ新規プロジェクト・新規キャッシュで確認する。公開済み対象版の同梱文書は実パッケージから確認する。通常導入・固定版導入ごとに取得したCLIでinit・sync・dry-run・checkを実行し、生成Skillの所有権と全管理ファイルのハッシュを照合する。通常の再同期でも変更なしを確認し、シンボリックリンクや不正な所有権記録は拒否する。対象版では同梱文書の許可リスト、生成Skillの文書一覧、英語だけで参照をたどれることも確認する。さらにAPIカタログの各ハッシュを同梱されたテンプレートと照合し、生成コードと生成Skillへの反映を確認する。旧latestには新しい対象版の文書構造を要求せず、取得版自身のCLI・生成契約で検証する。固定候補があるときは `--candidate` と、候補作成時に独立して記録したSHA-256を `--candidate-sha256` で指定し、候補の固定バイト列とregistry integrityを照合する。

公開操作を認可されたリリース担当者は、`previous_latest`（存在しなければ `none`）を観測結果から明示して次のゲートを実行する。すべて同じ固定候補と公開コミットを使用し、`release_sha256` には候補作成時に保存したSHA-256を指定する。候補公開前・公開直後は対象版と異なる旧latestを明示し、候補タグに `latest` を指定しない。

```sh
node scripts/package-verification/registry.mjs --stage before-publish --previous-latest "$previous_latest" --candidate "$release_tarball" --candidate-sha256 "$release_sha256"
# 認可された公開操作の後
node scripts/package-verification/registry.mjs --stage candidate-published --previous-latest "$previous_latest" --candidate "$release_tarball" --candidate-sha256 "$release_sha256"
# 認可されたlatest切り替えの後
node scripts/package-verification/registry.mjs --stage latest --candidate "$release_tarball" --candidate-sha256 "$release_sha256"
```

候補公開後は対象版・候補タグ・integrityと旧latestの維持を確認する。通常導入先を切り替えた後は対象版がlatestを指し、新規インストールの版・lockfileのintegrityが一致することを確認する。タグを更新する前後で差異があれば停止する。固定版と通常導入を別々に取得するため、候補公開中に旧latestが正当に残ることを異常扱いしない。

## 3. 公開と復旧

公開・タグ変更は対象版、タグ、影響、復旧先の明示認可がある場合だけ行う。正規アカウントの認証や2FAは担当者が管理し、認証情報を証跡へ保存しない。候補の固定バイト列を `npm publish "$release_tarball" --ignore-scripts --tag "$candidate_tag" --access public --registry=https://registry.npmjs.org/` で公開する。候補タグは `package.json` と承認済み方針を照合する。公開済み版を上書きしない。

候補の照合・新規取得・既存配布試験が合格した後、認可された場合のみ `npm dist-tag add "$package_name@$release_version" latest --registry=https://registry.npmjs.org/` で切り替える。切り替え前のlatestを再確認する。切り替え後のゲートが失敗した場合は追加公開を止め、記録した旧版へのタグ復旧を判断する。既存アプリは旧パッケージ、lockfile、YAML、生成物、Skillの復旧点へ戻す。同versionの再publishや再packを代用しない。応答不明時はregistryを確認してから次の操作を判断する。

## 4. 公開結果と外部掲載の確認

公開コミット、候補・registryのdigest、全タグの変更前後、固定版・通常導入の結果、同梱資料と生成Skillの検証、実行日時、未確認範囲を公開証跡に記録する。GitHubの案内、npm公式の版・タグ・README、外部収集サイトの掲載版と取得時点を比較する。外部サイトの差異は公式registryの配布異常と区別し、自リポジトリで修正できる事項を特定する。外部サイトの即時反映は公開完了条件にしない。

### #64の観測記録（2026-11-28）

| 観測対象 | 結果 |
| --- | --- |
| 調査対象のmain | `bd49e07fba0dc1eb2e0f724742f402b680cdd9b1`。package.jsonは0.2.0、公開時に指定する候補タグは `release-candidate`。 |
| 公式registry | 2026-11-28 15:06 JSTに取得。`latest` は0.2.0、`next` は0.1.0-beta.5、`beta` は0.1.0-beta.4。 |
| 公式0.2.0 | 2026-11-27 11:07:12.737 JST公開。SHA-512 integrityは `sha512-u2VaaRMPKhdgOkNjyPwEg+DjkukCJmgHf0B2YZ4ZQIITr7rhDVxR4w/kwb6sufgGUbwntkXKwfCAkopQ7MrgQw==`。 |
| 通常導入と版指定導入 | Node.js 24.19.0、npm 11.17.0で独立したプロジェクトとキャッシュを用意。どちらも0.2.0と公式integrityが一致し、日英文書・生成Skill・CLIの生成と再同期を照合した。 |
| 人向けの掲載ページ | 11月28日の先行調査ではSocket.devに0.2.0とAngular/CDK 22.3.0が掲載され、11月27日のbeta.4表示との差は解消していた。今回の再確認ではSocket.devとnpmjs.comの掲載ページがHTTP 403を返した。公開版の判定には公式registryの応答と新規導入結果を使用した。 |

公式registryに公開済みの0.2.0と変更後のローカル候補は、各tarballのハッシュで識別する。候補の版番号とタグは次回の公開前に決める。

仕様参照: [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/) · [npm dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/) · [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)。
