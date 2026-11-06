# CLIコマンドリファレンス

[English](commands.en.md)

公開npmパッケージ`@hiroshi.inoue/ui-foundation`のCLIを、利用アプリのルートから実行するためのリファレンスです。導入・Angularへの組込み・CSSと配布資産は[生成UIの利用ガイド](ui-library-consumer-guide.ja.md)、部品の選び方は[部品一覧](components.ja.md)を参照してください。対応環境と更新・復旧の契約は[公開ベータの利用・更新契約](npm-beta-readiness.ja.md)にまとめています。

以下はパッケージを導入済みのアプリで実行します。アプリのルートとは、アプリ自身の`ui.config.yaml`や`src/`を管理するディレクトリです。CLIは現在のディレクトリをrootにし、親ディレクトリの設定を自動探索しません。

```sh
./node_modules/.bin/ui-foundation --help
```

## 構文とオプション

```text
ui-foundation init [--config ui.config.yaml] [--language en|ja]
ui-foundation sync [--config ui.config.yaml] [--dry-run] [--from-output previous/path]
ui-foundation check [--config ui.config.yaml] [--format text|json]
ui-foundation --help
ui-foundation -h
```

表のオプションが対応範囲のすべてです。コマンドの後ろに指定し、値は空白で区切ります。同じオプションの重複、不明な引数、対応しないコマンドへの指定は終了コード1です。`--config=...`形式には対応しません。

| オプション | 対象 | 意味・既定値 |
| --- | --- | --- |
| `--config PATH` | `init` / `sync` / `check` | アプリrootからの相対パス。既定は`ui.config.yaml`。`init`では作成先、それ以外では読込み元 |
| `--language en\|ja` | `init`のみ | ひな形の説明文と生成部品の既定言語。既定は英語。日本語は`ja`。YAMLへ`default_language`を保存する |
| `--dry-run` | `sync`のみ | 同期予定を検査・表示し、生成物とSkillを変更しない。排他lockは取得する |
| `--from-output PATH` | `sync`のみ | 従来v1の生成先を明示する移行用指定。[限定条件](#生成先の変更と--from-output)を参照 |
| `--format text` | `check`のみ | 人が読むテキスト。省略時もこの形式 |
| `--format json` | `check`のみ | JSONを標準出力へ出す |
| `--help` / `-h` | 単独指定のみ | usageを表示する。無引数でも同じ表示 |

`help`というサブコマンドや`sync --help`には対応しません。本体CLIには`--root`、`--force`、`--version`もありません。別rootを対象にする場合は、そのアプリのルートへ移動して実行してください。

無引数・単独の`--help`・`-h`は設定を読み書きせず、usageを標準出力へ表示して終了コード0で終わります。

設定・生成先・旧生成先はプロジェクト内のパスです。絶対パス、`./`や`..`のパス要素、バックスラッシュ、`.git`や`node_modules`内のパス、管理対象のsymlinkは拒否します。生成先を`.agents/skills/project-ui/`と重ねることもできません。例の`.ui/generated/`はひな形の生成先であり、実際の出力はYAMLの`output`で決まります。

## `init`：設定のひな形を作成する

```sh
./node_modules/.bin/ui-foundation init --language ja
# 別名で作成する場合
./node_modules/.bin/ui-foundation init --config config/ui.config.yaml
```

- **入力**：パッケージ同梱の設定例。利用アプリ向けに`checks.source_roots: [src]`、空の承認一覧・例外一覧を設定します。開発元固有の検査対象や例外は引き継ぎません。
- **出力**：指定先のYAMLと`Created <path>`の表示。必要な親ディレクトリも作成します。
- **副作用**：設定ファイルの新規作成だけを行います。既存の同名ファイルは上書きしません。Angular部品・Skill・アプリの`src/`や依存関係は作成しません。
- **終了コード**：作成できれば0、既存ファイルとの衝突やパス・I/Oエラーは1です。

作成後に利用者、トークン、プロファイル、`output`、検査対象をアプリに合わせて編集します。既に設定がある場合は再度`init`せず、その設定を使います。別名の設定では、以後の`sync`と`check`にも同じ`--config`を指定してください。

## `sync`：設定と生成物を同期する

```sh
./node_modules/.bin/ui-foundation sync --dry-run
./node_modules/.bin/ui-foundation sync
./node_modules/.bin/ui-foundation check
```

**入力**は正本YAML、インストール済みパッケージのテンプレート・Skill・文書・検査器、前回のmanifestとownership情報、現在の生成物です。設定の構造・型・参照・必須役割・定義された色ペア等を検証してから生成します。設定の文章から見た目を推測する処理はありません。

**出力先**はYAMLの`output`と、固定の`.agents/skills/project-ui/`です。主な生成物は次のとおりです。

| 出力先 | 内容 |
| --- | --- |
| `<output>/` | `tokens.css`、`tailwind.css`、`profiles.ts`、`resolved.json`、`angular/`、`policy.json`、`check-ui.cjs`、`checker-lib/`、通知・ライセンス、`manifest.json` |
| `.agents/skills/project-ui/` | UI開発Skill、`project-context.md`、利用者文書の`references/docs/`、ライセンス、`ownership.json` |

**副作用**として、同期対象に`create`・`update`・`delete`を適用します。前回manifestが所有する不要なファイルは削除対象になります。生成先とSkillに業務コードや独自ファイルを置かないでください。手編集、未所有ファイル、所有情報の破損や不一致を検出すると書込み前に停止します。同じ内容のファイルでも、未所有なら自動採用しません。強制上書きのオプションはありません。

標準出力には`create: <path>`等の予定・実施差分と、次のいずれかを表示します。

| 表示 | 意味 |
| --- | --- |
| `Dry run: no files written.` | 差分はあるが、生成物とSkillには適用していない |
| `Generated UI foundation synchronized.` | 差分を適用した |
| `Generated UI foundation is current.` | 適用する差分がない。dry-runでも同じ表示 |

`--dry-run`も本実行と同じ所有権・衝突検査を行い、rootの`.ui-foundation-sync.lock`を一時作成して解除します。「書込みなし」は生成物とSkillへの変更がないという意味です。lockを作成できないrootではdry-runも実行できません。

終了コードは正常終了が0、設定・所有権・lock・I/O等のエラーが1です。`sync`の成功は指定ソースの検査成功を意味しません。続けて`check`とアプリの型検査・build・操作検証を実行してください。

### 生成先の変更と`--from-output`

現在の`ownership.json`が有効なら、YAMLの`output`を変更して通常のdry-runとsyncを実行します。CLIが旧生成先を読み、旧・新生成先と固定Skillの所有物を検査します。旧manifestが所有するファイルと旧manifestを移行対象にし、ownership情報を更新します。アプリのimportやCSS参照、checker起動パスはアプリ側で更新します。

`--from-output`が必要なのは、`ownership.json`がない従来v1の生成物を初めて更新するときに、同時に`output`も変更する場合です。同じ生成先で更新するだけなら不要です。次の例は、YAMLの`output`を新しい生成先へ変更済みで、旧生成先が`.ui/previous`の場合です。

```sh
./node_modules/.bin/ui-foundation sync --from-output .ui/previous --dry-run
./node_modules/.bin/ui-foundation sync --from-output .ui/previous
```

指定先には有効な旧`manifest.json`が必要です。既にownership情報がある場合、指定先がその`output`と一致しなければ拒否します。このオプションで破損したownership情報やhash不一致を無視することはできません。旧manifestの自動探索や任意ディレクトリの取込みにも使えません。大文字・小文字だけの生成先変更は拒否されるため、別名の中間生成先を使います。

### 同時実行と中断からの復旧

`sync`とdry-runは、同じrootで一つだけ実行してください。既存の`.ui-foundation-sync.lock`があると、設定読込み・生成物書込み前に拒否します。通常終了や通常のI/Oエラーからの復元完了時には、自分のlockだけを解除します。強制終了や復元失敗ではlockが残り、次のsyncを止めます。複数ファイル更新全体の原子性や、強制終了からの自動復元は保証しません。

lockは予定パスと前後hashを持ち、ファイルのバックアップは含みません。PIDや古さだけで削除しないでください。実行者の停止、markerの同一性、実ファイルと保存済みGit・バックアップを照合し、対応する設定・生成物・Skill・manifestの復元を確認してから明示的に退避します。詳細は[同時実行と中断の復旧手順](npm-beta-readiness.ja.md#同時実行と中断)に従います。

## `check`：生成一致と指定ソースを検査する

```sh
./node_modules/.bin/ui-foundation check
./node_modules/.bin/ui-foundation check --config config/ui.config.yaml --format json
```

**入力**は正本YAML、インストール済みパッケージから生成される期待値、現在の生成物・固定Skill、`checks`で指定したアプリソースです。YAMLの検証に加え、期待する全生成ファイルの内容と不足、生成先・Skill内の未所有ファイルを確認し、指定ソースの静的検査を行います。生成物・設定・ソースは変更しません。sync用の排他lockは取得しません。

**テキスト出力**では、生成一致の差分を標準エラーへ`Missing:`・`Changed:`・`Unowned:`で出します。差分がなければ標準出力へ`Configuration and generated files match.`を出し、続けてソース診断と集計、静的検査の限界を表示します。この生成一致の表示だけで、ソース検査の結果を判断しないでください。

**JSON出力**は標準出力の一つのオブジェクトです。

| フィールド | 内容 |
| --- | --- |
| `valid` | 生成一致とソース検査を合わせた判定 |
| `differences` | 生成物の不足・変更・未所有ファイルの配列 |
| `source` | `status`、`valid`、`files`、`checked`、`diagnostics`、`exceptions`を持つソース検査結果 |

診断には`file`、`line`、`column`、`rule`、`severity`、`message`、`suggestion`、`source`等を含みます。設定読込み・引数解析等で例外終了した場合は、通常の結果構造ではなく`{"valid":false,"error":"..."}`を出します。自動処理では終了コードと`valid`、`error`の有無を確認してください。

### 終了コード・警告・`NOT_CONFIGURED`

| 結果 | 終了コードと読み方 |
| --- | --- |
| 生成一致かつソース検査に確定エラーなし | 0。ソースの`status`は`passed`または`warnings` |
| 警告のみ | ほかに失敗がなければ0。`status: "warnings"`。未確認箇所が残る |
| YAMLに`checks`がない | ソースは`status: "not_configured"`、テキストは`NOT_CONFIGURED`。ほかに失敗がなければ0。ソース検査は未実施 |
| 生成差分、確定違反、検査設定不備、対象欠損、読取り・解析失敗 | 1。生成差分とソース診断の両方を確認する |
| 不明なコマンド・オプション、必須値不足、その他の例外 | 1。エラーメッセージを確認する |

`NOT_CONFIGURED`はソース検査の合格ではありません。導入する場合は`checks.source_roots`に実在する対象を設定し、syncしてからcheckします。`init`が設定する`src`にも対象ソースが必要です。空ディレクトリや存在しないrootでは検査に失敗します。

警告は、動的な値や未知のCSS供給元などを静的に確定できなかったことを示します。警告を消すために一律承認せず、発生元と実行時の挙動を確認してください。検査対象・除外・承認・例外・未確認範囲は[静的検査の契約](static-checks.ja.md)を参照してください。終了0は実行時動作、業務上の正しさ、視覚品質、アクセシビリティ全体、利用者の理解を保証しません。

## 生成済み`check-ui.cjs`を実行する

生成ディレクトリ全体を保持すれば、アプリのNode.jsでソース検査を実行できます。パッケージ本体のcheckoutや検査専用の追加npm依存は不要です。`checker-lib/`、`policy.json`、通知等を含めて管理し、検査器をブラウザーバンドルに含めないでください。

```sh
node .ui/generated/check-ui.cjs --config ui.config.yaml
node .ui/generated/check-ui.cjs --config ui.config.yaml --format json
node .ui/generated/check-ui.cjs --help
```

| オプション | 意味・既定値 |
| --- | --- |
| `--root PATH` | 検査対象のアプリroot。既定は現在のディレクトリ。絶対・相対パスを指定可能 |
| `--config PATH` | 指定rootからの設定相対パス。既定は`ui.config.yaml` |
| `--format text` / `--format json` | 出力形式。既定はtext |
| `--help` / `-h` | usageを表示する |

生成済み検査器にはサブコマンドを付けません。`--root`はこの検査器だけのオプションです。設定とpolicyは指定rootを基準に読み、検査器の配置場所からrootを推測しません。YAMLの`output`を変えた場合は起動パスも変更します。

| 比較 | パッケージ本体の`check` | 生成済み`check-ui.cjs` |
| --- | --- | --- |
| YAML検証 | 行う | 行う |
| 検査に使うpolicy | 現在のCLIとYAMLから構築 | 生成済みpolicyの構造とYAMLとの一致を確認して使用 |
| 指定ソース検査 | 行う | 行う |
| 生成物全体・Skillの一致と未所有ファイル | 確認する | 代替しない |
| JSONの通常結果 | `{valid, differences, source}` | ソース結果そのもの：`{status, valid, files, checked, diagnostics, exceptions}` |
| JSONの例外結果 | `{valid: false, error}` | `{valid: false, status: "failed", error}` |

生成済み検査器も警告のみ・`NOT_CONFIGURED`ならほかに失敗がなければ終了0、確定違反・設定不備・対象欠損・読取りや解析の失敗なら終了1です。policy未同期のエラーが出たら、対応するパッケージ版で本体CLIのsyncとcheckを実行します。エラー文中の`Run ui:sync`は同期の案内であり、利用アプリに同名のnpm scriptが存在することを前提にしません。

## よくある停止理由と対処

| 表示・状況 | 対処 |
| --- | --- |
| `EEXIST`でinitが停止 | 既存設定を確認して利用する。作り直す場合は先に保存・退避する |
| `ENOENT`、設定を読めない | アプリrootと`--config`、対象ファイルの存在を確認する |
| `Unsafe project-relative path`、symlink関連 | プロジェクト内の実パスを指定し、`./`・親移動・禁止領域・symlinkを避ける |
| `Generated file was edited` | 手編集を保存して内容を確認する。必要な修正は設定・生成元へ移し、対応する元の生成物へ復元してからdry-runする |
| `Unowned file would be overwritten or removed` | 表示されたファイルの持ち主と用途を確認し、業務ファイル・独自拡張は生成領域外で管理する |
| manifest / ownershipの破損・hash不一致 | 対応するYAML・生成物・Skillを保存済みの同じ復旧点から戻す。手編集で所有情報を合わせない |
| `Sync lock exists or its ownership is uncertain` | [中断からの復旧](#同時実行と中断からの復旧)に従って確認する。force解除や自動再試行はしない |
| checkの`Missing` / `Changed` / `Unowned` | CLIの版と正本設定、手編集・未所有物を確認し、dry-runで予定を確認してsyncする |
| source root不足・ソース解析失敗 | 実際の対象パスと構文、必要なら`checks.tsconfig`を修正する。対象を消して成功扱いにしない |
| policyがmissing / invalid / out of sync | 生成物を手修正せず、対応する本体CLIで再同期する |

更新前には、パッケージ版・lockfile・YAML・生成物・Skillを一緒に保存してください。npmパッケージの更新だけでは、コピー済みのAngularコードや検査器は更新されません。[更新と復旧](npm-beta-readiness.ja.md#更新と復旧)に従って再同期し、アプリ側の検証を行います。
