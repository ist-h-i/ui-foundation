# プロファイルと二段階トークンの設計

## 目的

利用者の目的・経験・利用環境に応じて、同じUI部品の色、余白、文字、寸法、形状を大きく変更できる開発基盤を作る。AIは設定案と画面構成を提案し、確定したYAMLから通常のプログラムが生成・検査する。実行時のLLM APIは持たない。

二段階トークンとプロファイルを初版の構造とする。旧preset/density設定、旧CSS変数、旧生成経路の互換層は作らない。

## 設定の正本

`ui.config.yaml`は利用アプリが管理する唯一の正本。リポジトリの検証には`examples/ui.config.example.yaml`を使う。

- `schema_version: 1`：今回の新しい初版スキーマ。
- `context`：product、goals、constraints。AIが読む判断材料。
- `output`：プロジェクト内の生成専用ディレクトリ。
- `default_profile`：既定のプロファイルID。
- `primitives`：名前から`{ type, value }`への対応。具体値を置く唯一の層。
- `semantic`：役割名からプリミティブ名への参照。全プロファイルの基底。
- `profiles`：IDからlabel、context（audience、usage、goals、constraints）、guidance、semantic上書きへの対応。

context/guidanceの文章からCLIが見た目を推測しない。プロファイルは年齢や役割から自動選択しない。利用アプリが初期設定または明示的な選択で適用する。新しい配色や尺度もAIが提案でき、特定の美学や固定パレットを強制しない。

プリミティブ型は`color`（不透明な3桁/6桁のhex）、`length`（非負px/rem/em）、`fontFamily`（ローカル書体リスト）、`number`（有限の非負数）、`duration`（非負ms/s）、`easing`（CSS標準の名前）。自由なCSSコード、URL、var式は入力しない。セマンティックはプリミティブを直接参照し、意味トークン同士の参照や循環は持たない。

セマンティックの名前は`カテゴリ.kebab-caseの役割`。追加の役割も定義できる。基礎部品が必要とする役割は以下。参照先の型を検証する。

| カテゴリ | 必須の役割 | 型 |
| --- | --- | --- |
| color | text, muted, surface, background, border, action, action-hover, on-action, link, tab-selected, danger, danger-hover, on-danger, success, success-surface, warning, warning-surface, error-surface, focus, disabled-surface, backdrop, shadow | color |
| font | body, code | fontFamily |
| text | body, small, heading | length |
| leading | body, heading, control | number |
| weight | body, heading, control | number |
| space | page, section, field, control-x, control-y, control-gap, table-x, table-y | length |
| radius | control, surface | length |
| size | control, icon, dialog, content, table-column-min, table-viewport, input-max-height, form-label, grid-item, sidebar, avatar, elevation-blur, overlay-min, dialog-min, drawer-inline, drawer-block, navigation-rail, mega-menu, navigation-column, knob, collection-item, collection-viewport, media-viewport, visualization-viewport | length |
| border | control, focus, focus-offset | length |
| motion | duration, easing | duration / easing |
| opacity | watermark | number（0〜1） |

未対応版、未知の構造項目、重複キー、参照切れ、型違い、必須役割不足、未知のdefault_profile、危険な値を位置・理由付きで拒否する。各プロファイルで定義済みの文字/背景ペアのコントラストを検査する。この数値検査をUXやアクセシビリティ全体の合格とは扱わない。

`size.collection-item`と`size.collection-viewport`は固定高さの仮想一覧、`size.media-viewport`は媒体、`size.visualization-viewport`は図の領域に使う正の長さ。表の`size.table-viewport`と用途を分け、profileごとに独立したプリミティブへ対応できる。サンプルで同じ480pxへ対応する媒体・図・表も、部品からは各用途のセマンティックを読む。カタログの数値・地図座標・画像pixel・QRの符号化画素はデータであり、UIの色や寸法の正本とは分ける。

`color.action`／`color.action-hover`は主操作の背景、`color.on-action`はその文字色。ナビゲーションとパンくずのリンク文字は`color.link`、選択中タブの文字と下線は`color.tab-selected`を使う。同じ具体色を採用する場合は同じプリミティブを参照する。リンクは透明背景の通常時にsurface／background上、hover／現在地ではbackground上で使い、両背景との4.5:1を検査する。選択タブは明示したsurface背景との4.5:1を検査する。明るい主操作の背景を使っても、リンクや選択中タブの文字色へ流用しない。利用アプリが独自の背景を追加する場合は、その組合せも利用側で確認する。

## 生成と利用

```text
利用者・目的・利用環境
  → 人/AIがプリミティブと対応関係を提案
  → YAMLを確定
  → 型検証・各プロファイルの解決
      ├─ tokens.css（プリミティブと全プロファイルの意味トークン）
      ├─ tailwind.css（@theme inlineによる同じ意味トークンへの接続）
      ├─ angular/（意味トークンを使う部品と構造CSS）
      ├─ profiles.ts / resolved.json / policy.json / manifest.json
      └─ .agents/skills/project-ui/（利用者の文脈とAIの設計手順）
```

CSS変数は`--ui-p-...`と`--ui-カテゴリ-役割`。部品と画面はセマンティックだけを参照する。Tailwindの`bg-color-action`、`px-control-x`、`font-family-body`等も同じ変数へ接続する。数字のutilityや任意値を使うことを設計の標準経路にしない。

Tailwindでは色と文字サイズが`text-*`、書体と太さが`font-*`を共有するため、生成するutilityは用途を区別する。色は`bg-color-action`／`text-color-on-action`、文字サイズは`text-size-body`、書体は`font-family-body`、太さは`font-weight-body`。同じbodyやcontrolの役割名を追加しても互いを上書きしない。余白とsize等で同じtheme変数を生成する追加roleは位置付きで拒否する。旧utility名のaliasは作らない。

`:root`へ既定プロファイルを出力する。`data-ui-profile="ID"`を持つスコープではそのプロファイルの全セマンティック対応を再定義する。部分上書きだけを継承させないため、入れ子でも外側のプロファイルが漏れない。未知IDの選択は利用アプリ側で防ぐ。

Tailwind v4のテーマ定義はトップレベルの`@theme inline`。YAMLを直接Tailwindに渡さず、CSSを生成して読み込む。[公式仕様](https://tailwindcss.com/docs/theme#referencing-other-variables)、[CLI](https://tailwindcss.com/docs/installation/tailwind-cli)を参照する。

`init`は既存ファイルを上書きせず雛形を作る。`sync --dry-run`は書き込みなしで差分を示す。`sync`は同じ入力・ツール版で同じ内容を生成する。前回manifestとの照合で手編集、未所有ファイルとの衝突、symlink/プロジェクト外の出力を拒否する。`check`は設定と生成物の一致およびmanifest所有範囲を実際に検査する。全ソースのASTによる逸脱検査を実装したとは主張しない。

固定Skillのownership.jsonはschema_version・output・manifest_pathを持ち、output内のv1 manifestがそのSHAを所有する。manifest自身のSHAはregistryへ入れない。output変更時はこの機械情報から旧manifestを読み、旧・新生成先とSkillの全ファイルを検査してから移行する。旧ownedファイルだけを列挙削除し、新manifest、registry更新、旧manifest退役の順で所有metadataを確定する。通常のI/O失敗は両manifestとregistryを含む全試行ファイルを復元する。root内の同時書込みや強制終了に対するtransaction原子性は保証しない。

registryなしの従来v1は同outputのsyncで更新する。初回更新とoutput変更が同時ならsync専用の`--from-output <旧生成先>`が必要で、dry-runと併用できる。registryの破損・SHA不一致は明示旧pathでも無視しない。自然言語contextの解析やプロジェクト全体のmanifest探索、同内容の未所有ファイルの採用は行わない。rootにつき固定Skillのactive ownerは一つ。大文字・小文字のみの移動は拒否し、親子ディレクトリ間の移動でも全presentの所有検査を保つ。

生成ディレクトリとSkillはCLIが所有する。機能コード、業務試験、custom拡張は同期対象にしない。生成物をGitで追跡する。既存の安全な処理中・エラー・復旧・focus・入力保持の部品挙動は新トークンへ接続し、互換APIを追加しない。

## 画面構成とAI

プロファイルのguidanceは情報の優先順位、一覧/段階的入力、補助説明等の判断材料を持つ。AIは利用者の目的と対象機能を確認し、必要な構成を実装する。YAMLに全画面のDOMや業務仕様を記述せず、CLIが文章から画面を自動生成したとは扱わない。

## 受入条件

1. 同じ部品がguided/denseの二プロファイルで主操作色、文字サイズ、余白、角丸を変え、nativeの意味・focus・状態を維持する。
2. YAMLの対応変更が生成CSS、Tailwind utility、Angular部品、Skill、policyへ反映される。
3. 不正設定を拒否し、文脈だけの変更でトークン値を推測しない。
4. 生成の冪等性、dry-run、手編集/衝突/パス境界/未同期検出を実試験で確認する。
5. 実ブラウザーでプロファイル変更後も入力・取得状態・実行結果を保持し、入れ子のスコープも正しく解決する。
6. 両プロファイルで通常/処理中/エラー/部分欠損/復旧、狭い画面、文字拡大、キーボードと自動アクセシビリティを確認する。
7. 設定、生成、型検査、ビルド、操作試験を別々に報告し、未実施の実利用評価を合格扱いしない。
8. 明るい主操作背景の設定でもリンク・選択中タブの読みやすさを維持し、不適切な文字／背景の組合せは設定検証で拒否する。
9. ナビゲーションとパンくずの長い日本語／連続英字を、両プロファイルの320px幅・100%／200%文字サイズで全文表示し、ページの横はみ出しを生じさせない。

`size.sidebar`はPageFrameのsidebar幅を用途別に指定する。ContainerやGridの標準余白・gapは既存space役割を使用し、利用アプリが明示する幅/比率/scroll座標は配置制御として扱う。

`size.drawer-inline`と`size.drawer-block`はDrawerの標準幅/高さ。左右端の幅と上下端の高さを別用途とし、guided/denseへ正本YAMLで明示対応する。明示pixel寸法とBottomSheetのviewport比率は配置制御であり、色/文字/余白のプリミティブを部品から参照するものではない。
