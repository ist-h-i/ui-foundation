# プロファイルと二段階トークンの設計

[English](design.en.md)

## 目的

利用者の目的・経験・利用環境に応じて、同じUI部品の色、余白、文字、寸法、形状を大きく変更できる開発基盤を作る。AIは設定案と画面構成を提案し、確定したYAMLから通常のプログラムが生成・検査する。実行時のLLM APIは持たない。

二段階トークンとプロファイルを初版の構造とする。旧preset/density設定、旧CSS変数、旧生成経路の互換層は作らない。

## 設定の正本

`ui.config.yaml`は利用アプリが管理する唯一の正本。同梱の`examples/ui.config.example.yaml`は設定のひな形。

- `schema_version: 1`：今回導入する初版スキーマ。
- `context`：product、goals、constraints。AIが読む判断材料。
- `output`：プロジェクト内の生成専用ディレクトリ。
- `default_profile`：既定のプロファイルID。
- `icons.lucide_interop`：任意の真偽値。`true` で Lucide DI と接続する専用入口を生成する。省略時は個別データと標準の描画部品を生成する。
- `default_language`：任意の `en` / `ja`。生成部品の初期文言とIntl localeを選ぶ。`init` は `en`、`init --language ja` は `ja` を保存する。項目のない既存設定は日本語を維持する。time zone・native日付入力書式・業務データ・見た目のトークンは変更しない。
- `primitives`：名前から`{ type, value }`への対応。具体値を置く唯一の層。
- `semantic`：役割名からプリミティブ名への参照。全プロファイルの基となる対応。
- `profiles`：IDからlabel、context（audience、usage、goals、constraints）、guidance、semantic上書きへの対応。

生成した `angular/locale-defaults.ts` は同期の所有範囲とし、言語はYAMLで変更する。runtime provider・scope・明示propの優先関係は維持する。旧CLIへ戻す場合は新項目を含まない保存済みYAMLと、対応するパッケージ・生成物を合わせて復元する。

context/guidanceの文章からCLIが見た目を推測しない。プロファイルは年齢や役割から自動選択しない。利用アプリが初期設定または明示的な選択で適用する。新しい配色や尺度もAIが提案でき、特定の美学や固定パレットを強制しない。

プリミティブ型は`color`（不透明な3桁/6桁の16進数カラーコード）、`length`（0以上のpx/rem/em値）、`fontFamily`（ローカル書体リスト）、`number`（有限の非負数）、`duration`（0以上のms/s値）、`easing`（CSS標準の名前）。自由なCSSコード、URL、var()式は入力しない。セマンティックはプリミティブを直接参照し、意味トークン同士の参照や循環は持たない。

セマンティックの名前は`カテゴリ.kebab-caseの役割`。追加の役割も定義できる。基礎部品が必要とする役割は以下。参照先の型を検証する。

| カテゴリ | 必須の役割 | 型 |
| --- | --- | --- |
| color | text, muted, surface, background, border, action, action-hover, on-action, link, tab-selected, danger, danger-hover, on-danger, success, success-surface, warning, warning-surface, error-surface, focus, disabled-surface, backdrop, shadow | color |
| font | body, code | fontFamily |
| text | body, small, heading, avatar | length |
| leading | body, heading, control | number |
| weight | body, heading, control | number |
| space | page, section, field, control-x, control-y, control-gap, table-x, table-y | length |
| radius | control, surface | length |
| size | control, icon, dialog, content, table-column-min, table-viewport, input-max-height, form-label, grid-item, sidebar, avatar, elevation-blur, overlay-min, dialog-min, drawer-inline, drawer-block, navigation-rail, mega-menu, navigation-column, knob, collection-item, collection-viewport, media-viewport, visualization-viewport | length |
| border | control, focus, focus-offset | length |
| motion | duration | duration |
| motion | easing | easing |
| opacity | watermark, map-region | number |

不透明度の値域は0〜1です。

Avatarの文字には`text.avatar`、地図領域の透明度には`opacity.map-region`を使う。これらを持たない既存設定は役割を追加してから再同期する。設定例では前者を既存のAvatar寸法と同じプリミティブ、後者を0.25へ対応させ、両プロファイルの従来の表示を維持している。

未対応のバージョン、未知の構造項目、重複キー、参照切れ、型違い、必須役割不足、default_profileに指定した未知のID、危険な値を位置と理由を示して拒否する。各プロファイルで定義済みの文字/背景ペアのコントラストを検査する。この数値検査をUXやアクセシビリティ全体の合格とは扱わない。

`size.collection-item`と`size.collection-viewport`は固定高さの仮想一覧、`size.media-viewport`は媒体、`size.visualization-viewport`は図の領域に使う正の長さ。表の`size.table-viewport`と用途を分け、プロファイルごとに独立したプリミティブへ対応させられる。サンプルで同じ480pxへ対応する媒体・図・表も、部品からは各用途のセマンティックを読む。カタログの数値・地図座標・画像のピクセル・QRの符号化画素はデータであり、UIの色や寸法の正本とは分ける。

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
      ├─ profiles.ts / resolved.json / policy.json / check-ui.cjs / CHECKER-NOTICE.txt / manifest.json
      └─ .agents/skills/project-ui/（利用者の文脈とAIの設計手順）
```

CSS変数は`--ui-p-...`と`--ui-カテゴリ-役割`。部品と画面はセマンティックだけを参照する。Tailwindの`bg-color-action`、`px-control-x`、`font-family-body`等も同じ変数へ接続する。数値を直接指定するユーティリティや任意値の使用を、標準の設計手順にしない。

Tailwindでは色と文字サイズが`text-*`、書体と太さが`font-*`を共有するため、生成するユーティリティは用途を区別する。色は`bg-color-action`／`text-color-on-action`、文字サイズは`text-size-body`、書体は`font-family-body`、太さは`font-weight-body`。同じbodyやcontrolの役割名を追加しても互いを上書きしない。余白とsize等で同じテーマ変数を生成する追加の役割は、位置を示して拒否する。旧ユーティリティ名の別名は作らない。

`:root`へ既定プロファイルを出力する。`data-ui-profile="ID"`を持つスコープではそのプロファイルの全セマンティック対応を再定義する。部分上書きだけを継承させないため、入れ子でも外側のプロファイルが漏れない。存在しないIDの選択は利用アプリ側で防ぐ。

Tailwind v4のテーマ定義はトップレベルの`@theme inline`。YAMLを直接Tailwindに渡さず、CSSを生成して読み込む。[公式仕様](https://tailwindcss.com/docs/theme#referencing-other-variables)、[CLI](https://tailwindcss.com/docs/installation/tailwind-cli)を参照する。

`init`は既存ファイルを上書きせずひな形を作る。`sync --dry-run`は書き込みなしで差分を示す。`sync`は同じ入力・ツール版で同じ内容を生成する。前回manifestとの照合で手編集、未所有ファイルとの衝突、symlink/プロジェクト外の出力を拒否する。`check`は設定と生成物の一致およびmanifest所有範囲を実際に検査する。任意の`checks`を指定すると、設定したAngular/CSS/SCSSソースの静的逸脱検査も実行する。対象、例外、未確認は[静的検査](static-checks.ja.md)に従う。

固定Skillのownership.jsonはschema_version・output・manifest_pathを持ち、output内のv1 manifestがそのSHAを所有する。manifest自身のSHAはregistryへ入れない。output変更時はこの機械情報から旧manifestを読み、旧・新生成先とSkillの全ファイルを検査してから移行する。旧manifestが所有するファイルだけを列挙して削除し、新manifestの作成、registryの更新、旧manifestの廃止の順で所有情報を確定する。通常のI/O失敗は両manifestとregistryを含む書き込みを試みた全ファイルを復元する。syncとdry-runはrootの`.ui-foundation-sync.lock`を排他的に取得し、二重起動を拒否する。通常復元が完了すれば自分のmarkerを解除し、強制終了や不完全な復元ではmarkerを残して次のsyncを停止する。PIDや経過時間だけで自動解除しない。複数ファイル全体や強制終了に対するトランザクションの原子性・自動復元は保証しない。復旧は[ベータの利用・更新契約](npm-beta-readiness.ja.md#同時実行と中断)に従う。

registryなしの従来v1は同じoutputでのsyncで更新する。初回更新とoutput変更が同時ならsync専用の`--from-output <旧生成先>`が必要で、dry-runと併用できる。registryの破損・SHA不一致は旧パスを明示しても無視しない。自然言語で書かれたcontextの解析やプロジェクト全体のmanifest探索、同内容の未所有ファイルの採用は行わない。プロジェクトルートごとに、固定Skillの有効な所有者は一つとする。大文字・小文字のみの移動は拒否し、親子ディレクトリ間の移動でも存在するすべてのファイルの所有権検査を維持する。

生成ディレクトリとSkillはCLIが所有する。機能コード、業務試験、独自の拡張は同期対象にしない。生成物をGitで追跡する。既存の安全な処理中・エラー・復旧・フォーカス・入力保持の部品挙動は新トークンへ接続し、互換APIを追加しない。

## 画面構成とAI

プロファイルのguidanceは情報の優先順位、一覧/段階的入力、補助説明等の判断材料を持つ。AIは利用者の目的と対象機能を確認し、必要な構成を実装する。YAMLに全画面のDOMや業務仕様を記述せず、CLIが文章から画面を自動生成したとは扱わない。

`size.sidebar`はPageFrameのsidebar幅を用途別に指定する。ContainerやGridの標準余白・gapは既存space役割を使用し、利用アプリが明示する幅/比率/スクロール座標は配置制御として扱う。

`size.drawer-inline`と`size.drawer-block`はDrawerの標準幅/高さ。左右端の幅と上下端の高さを別用途とし、guided/denseへ正本YAMLで明示対応する。明示的なピクセル寸法とBottomSheetのviewport比率は配置制御であり、色/文字/余白のプリミティブを部品から参照するものではない。

## 視覚的な階層の任意トークン

新規設定例では `text.page-title`、`text.section-title`、`text.subheading` を使い、ページタイトル、セクション見出し、小見出しを区別する。旧YAMLで省略した場合は、各プロファイルのheading、heading、bodyのプリミティブ参照をそれぞれ利用する。明示指定が優先され、必須設定は増えない。既存のheadingとTypographyの既定表示は維持する。HTMLの見出しレベルと視覚的な役割は独立して選択する（例：`<h2 uiTypography="section-title">…</h2>`）。新規設定例ではセクション間の余白を項目間より大きくする。既存アプリのYAMLは書き換えない。

PageFrameのタイトルはpage-title、Containerの見出し、Card・Dialogのタイトル、フィードバックの見出し、Wizardの段階見出しはsection-titleを参照する。HTMLの見出しレベル、従来の太さと行高は変更しない。旧設定で新しい役割を省略した場合はtext.headingの値を参照するため、組込み見出しの従来のサイズを維持する。subheadingは明示指定時のみ利用する。
