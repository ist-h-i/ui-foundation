# npm ベータ解除公開計画

2026年11月20日作成。初回通常版 0.1.0 の計画記録です。現在の公開には [npm公開の手順](npm-release-plan.ja.md) を使用してください。記録中の認可・版・タグを次回に引き継ぎません。

`@hiroshi.inoue/ui-foundation@0.1.0` を最初の通常版とする。PR #52 をマージした `main` `06cb5e4a56a0593c01940bbd2bcfd7034352d550` を起点に、依存の対応範囲と `0.1.x` の互換性を明文化する。`beta.6` は `main` 上の検証済み候補として扱い、最終候補を利用アプリで確かめてから `0.1.0` を公開する。 [PR #52](https://github.com/ist-h-i/ui-foundation/pull/52)

## 計画作成時の状態

| 対象 | 確認済みの状態 |
| --- | --- |
| npm | `latest` と `beta` は `0.1.0-beta.4`、`next` は `0.1.0-beta.5`。`beta.6` と `0.1.0` は未公開。 |
| ライブラリ | `main` は `0.1.0-beta.6`。PR #52 の固定 tarball で、公開済みの `beta.4` と `beta.5` からの更新・復旧、独立した利用アプリでの strict AOT と主要操作を確認済み。 |
| 実プロジェクト | Ambitus の `main` `4d4cf860` は Angular 21 系と `beta.4` を利用。`0.1.0` の候補は未検証。 |

[npm の公開版](https://www.npmjs.com/package/@hiroshi.inoue/ui-foundation?activeTab=versions) · [PR #52 の検証結果](https://github.com/ist-h-i/ui-foundation/pull/52) · [Ambitus の依存定義](https://github.com/ist-h-i/ambitus/blob/4d4cf860405ee95424c3ada773356f0b55ac7f27/package.json#L79)

## 互換性と対応環境

`0.1.x` では、対応環境で文書化した公開契約を保つ。修正や新機能がこの契約に影響する場合は、利用者に必要な変更を明示する。 [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html#spec-item-4)

| 対象 | `0.1.x` で維持する契約 |
| --- | --- |
| CLI・静的検査 | 文書化した `init`・`sync`・`check` の引数と生成先、終了条件、公開 JSON フィールドの意味。検査範囲を広げる修正で既存アプリの CI が失敗し得る場合は、互換性への影響をレビューする。 |
| YAML・生成出力 | `schema_version: 1` の既存入力、既定値、公開セマンティックトークン名と CSS の入口。再同期で過去版の管理対象を安全に更新できること。所有権ファイルの内部形式はツールが管理する。 |
| Angular・翻訳 | `angular/core`・`angular/forms`・`angular/index` の公開 export と文書化した入力・出力・値の契約。公開メッセージ ID と名前付き引数、翻訳アダプターの接続契約。公開入口以外からの直接 import は利用ガイドで内部実装と明記する。 |
| バージョン更新 | `0.1.x` のパッチ更新は上記の互換性を保つ。利用アプリの変更が必要な破壊的変更は `0.2.0` 以降に送り、移行手順と復旧点をリリースノートに記載する。 |

初回の基準は Node.js 24.19.0、Angular/CDK 22.3.0、TypeScript 6.0.3。macOS arm64 と Playwright Chromium で確認する。Angular 21 の利用先は、現在の固定版を使うか、アプリの Angular 更新と合わせて移行する。 [利用契約](npm-beta-readiness.ja.md) · [生成UIの設計判断](adr/0006-angular-state-and-io.md)

## 公開までの工程

| 順序 | 担当 | 作業と完了条件 |
| --- | --- | --- |
| 1. 公開範囲の確定 | 保守担当者 | 対応環境と公開契約を日英の利用ガイドに記載する。公開対象のコミット、検証用アプリと確認する画面、更新前の復旧点をリリース PR に記録する。 |
| 2. 候補の作成 | リリース担当者 | `package.json` と lockfile を `0.1.0` に変更する。日英の README・導入ガイド・利用契約・リリースノートを更新し、ドキュメントの配布一覧とパッケージ試験の候補版チェックを合わせる。公開済みベータからの更新・復旧試験を維持する。`ui:sync` 後、生成差分を確認する。 [候補版を指定する配布試験](../tests/package/beta.test.mjs) |
| 3. リポジトリと配布物の検証 | リリース担当者、独立レビュー担当者 | 公開するコミットと tarball を固定し、SHA-256 と npm の `sha512` integrity を保存する。型検査、生成・静的検査、警告台帳、対象ブラウザー試験、`test:package` を実行する。既存の公開手順に沿い、Tailwind を入れていない独立アプリで標準 CSS と公開入口を確認する。配布一覧、通知、worker・資産、日英文書を照合し、結果をレビューする。 [npm 公開の手順](npm-release-plan.ja.md) |
| 4. 利用アプリでの確認 | リリース担当者 | 手順3と同じ tarball を対応環境の独立した利用アプリに入れ、`beta.4` と `beta.5` からの更新・ビルド・主要操作・復旧を検証する。既存プロジェクトへの適用は、各アプリの移行作業で確認する。 |
| 5. npm 公開と `latest` 切り替え | リリース担当者 | 手順3・4と独立レビューが完了し、公開対象・タグ・復旧先の認可がある状態で実行する。初回インストールが返す版とバイト列を確認して完了とする。 |

実プロジェクトでは、旧版のパッケージ・lockfile・YAML・生成コードと Skill・関連するアプリ変更を一つの復旧点に保存する。`sync --dry-run`、`sync`、`check --require-source-checks`、production build、主要操作の順に確認し、保存点に戻して旧版の検査とビルドも通す。`beta.4` を移行する場合は、利用している翻訳上書きが安定 ID と名前付き引数へ移ったことを確認する。該当画面でフォームの入力保持を確認し、仮想行・PDF・コピーを使う場合は各操作も確認する。 [翻訳の移行・復旧](ui-message-migration.ja.md) · [Angular 移行の代表操作](angular-modernization-plan.ja.md#更新後にチームで確かめる操作)

## npm での公開と復旧

1. 公開直前に、マージ済みの `main` と検証対象のソースが一致することを確認する。npm の全タグ、`latest` が指す版と integrity、`0.1.0` と `release-candidate` タグの使用状況、固定 tarball の版と digest、公開用アカウントを再確認する。現在の `latest` の版を `previous_latest` として記録する。
2. 固定 tarball を `npm publish "$release_tarball" --tag release-candidate --access public --registry=https://registry.npmjs.org/` で公開する。ここで `0.1.0` は公開済みとなり、版指定や依存範囲から取得され得る。通常のバージョン指定なしの導入先は、この時点では従来の `latest` を指す。 [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/) · [npm dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/)
3. npm の `0.1.0` の integrity を固定候補と照合する。新規ディレクトリ・新規キャッシュへ `@0.1.0` を導入し、同梱文書、`init`、`sync`、`check --require-source-checks` を確認する。`init` が指定するソースルートには確認するアプリソースを用意する。
4. 合格後、`latest` が手順1で記録した版を指すことを再確認し、`npm dist-tag add @hiroshi.inoue/ui-foundation@0.1.0 latest --registry=https://registry.npmjs.org/` を実行する。別の新規ディレクトリ・新規キャッシュで `npm install --save-dev @hiroshi.inoue/ui-foundation` を行い、取得版、lockfile の integrity、日英の同梱資料、代表的な生成を確認する。切り替え時刻と検証結果を記録し、確認用タグ `release-candidate` を外す。旧 `beta` と `next` は既存利用先に合わせて維持する。 [通常インストールの公開確認手順](npm-release-plan.ja.md)
5. 切り替え前に差異を見つけたら `latest` の更新を保留する。切り替え後に版・integrity の不一致、導入・同期・ビルド不能、主要操作の回帰が判明した場合は、`npm dist-tag add "@hiroshi.inoue/ui-foundation@$previous_latest" latest --registry=https://registry.npmjs.org/` で記録した旧版へ戻し、新規キャッシュで復旧先を確認する。すでに導入したアプリは保存点から個別に復旧する。公開済み `0.1.0` の修正は新しい版で出す。 [npm dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/) · [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/)

利用者への告知には、対応環境、`beta.4` 利用者向けの翻訳移行、再同期の要否、旧版への復旧方法を含める。公開記録にはリリースコミット、検証対象のアプリと依存版、tarball の digest、タグの変更前後、版指定なしの導入結果を残す。
