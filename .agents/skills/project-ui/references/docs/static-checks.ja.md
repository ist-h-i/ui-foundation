# UIソースの静的検査

[English](static-checks.en.md)

確定したYAMLから検査policyとNode用の`check-ui.cjs`を生成します。取り込み先のリポジトリだけで実行でき、検査専用のnpm依存やui-foundationのcheckoutは不要です。`checker-lib/`と依存のNOTICEも使うため、生成ディレクトリ全体を取り込みます。部品をビルドするための通常の依存は別に必要です。

指定ソースで確定できる違反を失敗にし、実行時の値や未知の供給元を静的に確定できない箇所を警告として残します。警告は違反の確定でも、安全性の証明でもありません。利用アプリでは、残す警告の理由と再確認条件を記録してください。

## 設定と配布

`ui.config.yaml`の任意の`checks`で対象を指定します。パスはプロジェクト内のファイルまたはディレクトリです。glob、絶対パス、親への移動、symlinkは使いません。

```yaml
checks:
  source_roots: [src]
  tsconfig: tsconfig.app.json
  approved_components:
    - module: '@vendor/ui'
      export: AdoptedButton
      reason: このプロジェクトで採用した外部操作部品
  exceptions:
    - file: src/scroll-specimen.css
      rule: literal-token
      source: 'width:400px'
      reason: 狭い領域でのスクロールを再現する試験用の固定寸法
```

`tsconfig`、承認一覧、例外一覧は省略できます。`source_roots`は空にできず、各rootに少なくとも一つの対象ソースが必要です。生成先、`.agents`、`.git`、`node_modules`、build/dist/coverage等は対象から除きます。検査器が確認するのは指定したソースです。`checks`がない従来の設定は`NOT_CONFIGURED`と表示し、設定・生成一致検査を維持します。`init`の新規設定は`src`を対象とします。

新規アプリの`init`は、開発元固有の例外や外部部品承認を引き継ぎません。

```sh
# 利用アプリの正本を編集してから同期・検査
./node_modules/.bin/ui-foundation sync
./node_modules/.bin/ui-foundation check
./node_modules/.bin/ui-foundation check --format json
# 取り込み先のソース検査（例は既定のoutput）
node .ui/generated/check-ui.cjs --config ui.config.yaml
node .ui/generated/check-ui.cjs --root /absolute/application --config ui.config.yaml --format json
```

取り込み先の`package.json`へ`"ui:check": "ui-foundation check --config ui.config.yaml --require-source-checks"`を追加し、CIやbuildの前段で実行します。CLIは取り込み先のpackage.jsonを自動編集しません。outputを移行したら、アプリ側のimportを更新します。検査器はNode専用で、アプリのブラウザーbundleには含めません。

同梱版はYAMLを検証し、生成policyとの一致を確認してソースを検査します。生成物を再構築する一致検査と未所有ファイル検出はui-foundation本体のCLIが担当します。同梱版の成功は生成一致の証拠にはなりません。更新は設定やパッケージ版を変更し、`./node_modules/.bin/ui-foundation sync`で反映します。生成・所有権・冪等性・output移行は既存の生成契約に従います。

## 翻訳漏れの検査

安定メッセージ ID を使うアプリで、`checks.i18n` を追加します。旧方式を固定しているアプリではこのキーを省略します。検査対象は `checks.source_roots` 内の Angular テンプレートと TypeScript、および指定した辞書です。

```yaml
checks:
  source_roots: [src]
  i18n:
    functions: [t]
    pipes: [translate]
    dictionaries:
      - file: src/orders.messages.json
        complete: true
```

実際に使う翻訳関数と pipe を登録します。関数には `t('order.count', {count: 3})` のように ID と名前付き引数を渡します。pipe には左側に ID、コロンの後に名前付き引数を渡します。独自部品の表示用入力も検査する場合は `display_bindings: [toastMessage]` のように指定します。 生成側の `injectUiMessageText()` または `injectUiMessage()` を部品のフィールドに保持すると、テンプレートやホストバインディングからの直接呼び出しも検査します。判定対象は静的に確認できる ID と名前付き引数です。同名のテンプレート変数がある箇所で部品フィールドを使う場合は、`this` を明示します。

アプリ所有の ID は、平坦な JSON にまとめます。文字列の `{name}` は必須の引数名を表します。型まで検査する場合は `parameters` に `string`、`number`、`boolean`、`null` のいずれかを指定します。基盤の ID と引数は、配布物に含まれる定義で検査します。アプリ側の辞書は指定したファイルを合わせて一つの範囲として調べます。特定の言語の辞書に欠落がないかを調べる場合は、その言語の完全な辞書だけを指定してください。

```json
{
  "order.save": "注文を保存",
  "order.count": { "parameters": { "count": "number" } }
}
```

次の例ではボタンの表示と読み上げに直書き警告が出ます。`count` には型不一致のエラーが出ます。

<!-- i18n-check: before -->
```html
<button data-testid="save-order" aria-label="Save order">保存</button>
<p>{{ t('order.count', {count: '3'}) }}</p>
<p>{{ 'uiFoundation.actionControl.busy' | uiStableMessage }}</p>
<p>{{ order.reference }}</p>
```

アプリの辞書を経由して文言を表示し、件数は数値で渡します。Angular の翻訳機能を使う箇所では、`i18n` や `i18n-aria-label` も利用できます。

<!-- i18n-check: after -->
```html
<button data-testid="save-order" [attr.aria-label]="t('order.save')">{{ 'order.save' | translate }}</button>
<p>{{ t('order.count', {count: 3}) }}</p>
<p>{{ 'uiFoundation.actionControl.busy' | uiStableMessage }}</p>
<p>{{ order.reference }}</p>
```

| 診断 | 対応 |
| --- | --- |
| `i18n-raw-text` 警告 | 表示や読み上げに使う固定文言を翻訳経由にします。サーバーの状態コードに対応してアプリ側で定義した固定エラー文言も対象です。テスト ID、ルート設定、受信データそのものは対象外です。 |
| `i18n-message-reference`・`i18n-message-arguments` エラー | ID、指定した辞書、呼び出し側の引数名と型を確認します。全体を表す辞書から ID を削除すると、テンプレートが同じでも検査は失敗します。 |
| `i18n-fragment` 警告 | 文全体を一つのメッセージとして登録し、差し込む値は名前付き引数で渡します。 |
| `i18n-unconfirmed` 警告 | 実行時の ID、引数、読み込まれる辞書を確認します。利用できるメッセージの一部だけを検査するときは、指定する辞書に `complete: false` を設定します。 |
| `i18n-legacy-key` エラー | 基盤の安定 ID、または登録したアプリ用の翻訳経路とアプリ所有の ID を使います。 |

YAML を変更したら、インストール済みの CLI で `sync` を実行し、`check --format json` で診断を確認します。本体 CLI と生成済み検査器は同じソース検査を行います。既存エラーは確認済みの基準を使って段階的に直し、意図的に残す箇所の例外には理由と再確認条件を記録します。遅延ロードの辞書と実行中の言語切替は利用アプリで確認してください。

## ワークスペースの検査範囲と既存違反

プロジェクトルートに `angular.json` があるときは、登録された各プロジェクトの `sourceRoot`（省略時は `root`）を `checks.source_roots` と照合します。範囲外のプロジェクトは名前とパスを `uncovered-project` 警告で表示します。検査範囲は設定で指定したルートです。意図的に対象外とする場合は、`checks.excluded_projects` に名前と理由を記録します。

```yaml
checks:
  source_roots: [src, projects/admin/src]
  excluded_projects:
    - name: playground
      reason: 専用のCIジョブで検査するため
```

ソース検査を必須にする場合は `--require-source-checks` を指定します。`NOT_CONFIGURED` のときは終了コードが1になります。この指定と `--baseline <プロジェクト相対のJSONパス>` は、本体 CLI の `check` と生成済み検査器で使えます。

既存アプリで新規違反から修正するときは、まず `check --format json` の全件結果を確認し、基準として保存します。既存違反がある全件検査は終了コード1です。JSON に保存するソース検査結果が含まれていることを確認してください。`check --baseline ui-check-baseline.json` は新規違反と検査の失敗を終了コード1にします。既存違反は `source.existing_diagnostics`（生成済み検査器では直下の `existing_diagnostics`）に表示します。照合にはファイル・ルール・構文から特定した違反内容と位置、それぞれの出現件数を使います。CSS の条件、テンプレートの親要素、TypeScript の操作対象や分岐が異なれば新規違反です。無関係な行の挿入や、対応する CSS の値や HTML 開始タグ内の意味を変えない改行で、新規扱いにはなりません。診断には元のソース断片も表示します。違反内容や位置を特定できない診断は、基準を使う場合も確定違反として扱います。照合に必要な情報を記録していない旧形式の基準は、全件検査で取り直してください。警告・読み取りや解析の失敗・不正な例外は引き続き報告し、本体 CLI は生成一致も検査します。全件を判定する場合は指定を外します。基準の変更は差分を確認して明示的に行います。

`generated-internal-import` は、設定した tsconfig のパスエイリアスも含めて、import や再エクスポートの解決先が生成内部ファイルなら警告します。警告に公開入口が示されている場合は、その入口へ変更します。アプリ独自の部品や公開入口を経由するラッパーも使えます。必要な内部参照を残すときは、範囲を絞った例外に理由と再確認条件を記録します。

## 対象と結果

TypeScriptとAngularの構文を読み、inline/外部template・styles、host metadata、`HostBinding`、class/style/ngClass/ngStyle、静的に識別できるDOM style操作を検査します。コメントや通常の業務文字列をCSSとして検索せず、アプリのコードを実行しません。

`HostBinding`は実Angular exportのidentityで識別し、import alias・namespace・明示した再exportを追跡します。Angular宣言がない取り込み先でも、明示した名前付きimport/reexportを最大32 symbolまで辿ります。利用できない宣言に依存するmember decoratorは未確認を残し、CSS writerの完全性も認定しません。有限keyは全候補を調べ、引数なしはmember名を使い、未知keyや不正な型は警告にします。条件付きkeyは無条件の供給元にせず、class/idの排他的な選択と計算元・instanceの対応を保ちます。選択の積は128候補で打ち切り、未確認を報告します。`attr.style`・`attr.class`は検査し、`attr.style.color`等の通常属性をstyle宣言と混同しません。同名のローカル関数やshadowをAngular APIと認定しません。

DOM styleの論理代入は書込み得る右辺を検査します。`+=`は既存値を未確認とし、既知断片だけを検査します。断片を完全なCSS供給値に昇格させません。その他の未解決な複合代入とstorageを更新する`++`/`--`は警告を残します。数値の単項`+`・`-`・`~`は演算結果を使い、非ゼロの値をゼロとして許可しません。

CSSはPostCSS、SCSSは[postcss-scssの仕様](https://github.com/postcss/postcss-scss)に従って構文解析します。Sassのコンパイル、変数計算、mixin展開は実行しません。解決できない変数・mixin等は未確認として報告します。

| 対象 | 検査する内容 |
| --- | --- |
| トークン | 色、書体、文字サイズ、行高、太さ、余白、角丸、寸法、境界、動き、透明度。具体値、primitive直接参照、未定義semantic、用途違いを検出する。 |
| CSS値 | 省略形、論理プロパティ、関数、fallback。`calc(var(--ui-space-page) + 12px)`の固定値も検査する。ゼロ、継承・リセット、適合する構造用キーワード、無次元の計算係数は許可する。 |
| Tailwind | 保護対象utilityと状態・レスポンシブ等のvariant。固定版の組み込み構文解析で得た宣言をCSSと同じ値検査へ通す。 |
| native寸法 | HTML/SVGの`width`・`height`。Angular部品の同名の業務入力とは区別する。データ寸法は用途を確認し、表示寸法はsemanticを使う。 |
| Angular部品・directive | native HTML、生成部品、対象内で宣言された自作部品、Angular標準のcore/common/forms/routerを許可する。その他は参照元モジュールと公開名で明示承認する。 |

Tailwindの生成テーマutilityはpolicyのsemanticへ接続します。ローカルclassは対応するCSS宣言を検査し、Emulated/ShadowDomの部品内classを他部品へ許可しません。global CSSと明示した`ViewEncapsulation.None`のclassは共有できます。アプリのTailwind設定・plugin・importは実行しません。数値utilityや具体的な任意値は違反です。任意値はTailwindの型指定と既定動作で用途を判定し、例えば文字サイズは`text-(length:--ui-text-body)`、境界幅は`border-(length:--ui-border-control)`とします。slash modifierの未解決変数は警告です。名前付きbreakpointはframeworkの構造として許可し、`min-[900px]`や`@min-[40rem]/sidebar`等の明示寸法は複合variantを含めて個別例外を必要とします。

外部部品はimport aliasや再exportを辿って参照identityを検査します。alias名や属性の綴りだけでは承認しません。service・pipe・モデルをUI部品と混同せず、外部描画エンジン一般の採否を網羅する検査とも区別します。

結果にはファイル、行・列、ルール、理由、修正案、検査件数、未確認箇所、適用した例外を出し、JSONも提供します。違反、設定不備、対象欠損、読み取り・解析失敗は終了1です。通常の`ui:check`と同梱版は警告のみなら終了0とし、警告の件数と場所を結果へ残します。

## 有限な式の追跡

定数、配列、文字列結合、有限の条件分岐を読み取ります。条件が動的でも値が確定する全分岐を検査します。名前が固定されたclassのtoggleは新しいclass名を作りません。入力の既定値、型注釈だけ、書き換え可能な初期値を、実行時の値の保証には使いません。

実symbolで参照元を確認したreadonlyのAngular `computed`、閉じたprivate helperの引数と正常return、限定したMap書込み、配列・添字ループ等を解析します。throw guardのmembership、own-key、安全な整数範囲による絞込みも、組込み関数の同一性と変更経路を確認した範囲で使います。値やhelperのescape、書換え、未知のcallback、未対応の制御フローは警告を維持します。guard済みASCII識別子の固定prefix付きclassも、固定版Tailwind registryとutility grammarへ到達しないことを確認した場合だけ判定を完了します。

露出したinstanceのmethodは、通常本文や明示的な差替えの既知returnを追加検査しても値域を閉じません。const callable alias、同期function、限定した`Object.assign`の既知own dataを対応させ、未知receiver・factory・spread・accessor・key・複数sourceは未確認に残します。同期IIFE等で同じ実行frameと確認できる初期化前の確定失敗は値候補にせず、後から実行されるclosure、async/generator、反射、未知callsiteと区別します。任意のmethodやgetterを実行する検査ではありません。

## CSS上書きと継承の契約

CSSカスタムプロパティは、消費側に届き得る既知の値候補を検査します。cascadeの勝者を選ばず、未知writerや動的CSSを含む全供給元の網羅を証明しません。状態、祖先、media/supports等の条件付き定義だけで無条件の消費を確認済みにはしません。未解決style bag、reset、循環、不確かな継承があれば警告を保ち、同時に既知候補の具体値やtoken違反を検出します。

候補はCSS owner、適用instance、実native要素、hostの計算元、selector/条件、lookup層を区別して保持します。aliasの依存値を消費する子・兄弟・疑似要素や別instanceから借りず、定義した計算元で評価します。複数の`styles`や`styleUrl(s)`、共有stylesheet、親template、同一要素directive、host metadata/HostBindingの既知供給も、この対応を保って追跡します。本文が同じ別stylesheetの到達判定を流用しません。

単純なtag/class/idと有限のclass/id bindingは、対応する要素・分岐ごとに確認します。同じselectorに一致する要素の一部だけで供給の完全性を認定せず、値がない要素や未知のclass/idも保持します。複雑selectorは既知の終端条件に矛盾しない候補を検査して未確認を残します。Angularのカンマ区切りselectorは代替であり、同時成立するclass/tagへ集約しません。

同じ物理hostでは、親からのincomingと子自身のownを最初のlookupで分け、依存aliasは必要な全層を参照します。HostBindingのkey選択はclass値が未確定でも独立した対応を保ち、排他的なclass/idを別の供給元として組み合わせません。親から渡した値を子の新しいwriterとして反射させず、子自身のCSS/metadata/HostBindingは候補に保ちます。親scoped CSSを子の定義poolへコピーしません。実native祖先の供給は実際の子孫への候補として渡し、兄弟やhostへ逆流させません。`@property`登録による継承境界と、host自身の書込み・疑似要素自身の定義を区別します。

`ng-container`は透過させ、描画しないtemplate要素のstyleは供給元にしません。明示した`ng-template`内部のviewは別outletへ移動できるため、外側hostとのDOM祖先関係やdocument到達を確定しません。view内部の実祖先・同一要素・component host自身の既知候補は保持します。

外部document CSS、Noneの共有CSS、Emulated/ShadowDomのscoped CSSは到達範囲を分けます。documentのselectorをshadow tree内部へ適用せず、hostへ届くcustom property継承と内部へのselector適用を区別します。標準ShadowDom自身のstylesとAngularのSharedStylesHostが配るNone CSSは内部の候補に含めます。外側hostの配置が未確定でも標準ShadowDom内部の共有到達を確認できる場合があります。未知encapsulation、隔離renderer、未確定の配置をdocument/共有先と推定しません。

外部global CSSや親None CSSが子内部nativeを消費する場合は、到達を確認できた実nativeと同じinstanceのhost resolverへ結びます。hostのaliasをleafの同名値で再計算せず、追加したnative消費のために同じhostを重複検査しません。None CSSの未変換`:host`は、そのNone部品自身のhost定義として扱いません。有効なglobal selectorやhost bindingは検査します。共有CSSの`:host`が囲むShadowRootのhostへ作用する全経路、hostを経由しない任意の子内部scoped CSS、動的adopted stylesheet等は網羅しません。

循環はalias名だけでなく計算するresolver環境と参照名の組で判定します。別計算元の同名aliasは追跡し、同一計算元の真の循環は未確認にします。alias深さ32・一宣言の候補訪問512、親追跡の深さ8・親分岐32・受信ownerの展開予算128を超えた場合も未探索を保持し、alias外の具体値は引き続き検査します。診断や用途カテゴリを計算値のcacheへ混ぜません。

## 理由付き例外

配置寸法、データ色、円形表現、支援技術用クリップ等は用途と生成経路を確認して個別例外にします。通常のUI値はsemanticへ戻します。用途例外はトークン要件への限定した許可であり、実寸法、操作、任意入力の安全性を承認するものではありません。

例外はファイル、ルール、`source`のコード片で一つの診断だけに一致させます。同じコード片が繰り返される場合は`line`・`column`で限定できます。位置の変更、一致なし、複数一致、重複指定は設定エラーです。JSONの完全な`source`を使い、理由には用途とトークン化しない根拠を書きます。例外は別一覧に残り、入力ソースは変更しません。全ファイルの除外、検出結果からの自動承認、読み取り・解析失敗を隠す例外は認めません。

alias経由の違反の`source`には消費宣言と` :: 名前=候補値`を含めます。固定値だけの例外が、追加された上書きや別の依存値を承認しないようにします。既存例外が新しい候補にも一致すれば複数一致で失敗します。生成元の構造・データ用途例外は、その根拠ソースやhelperの変更を回帰で検出します。この根拠保全を、同梱版による任意データフローの証明とは扱いません。

## 検証の範囲と完成の意味

静的検査の完成は、指定ソースへこれらのルールを実行し、残る警告の理由と再確認条件を追えることです。任意の実行時データフロー、未知CSS供給元、全cascade、外部描画エンジン内部、実利用での理解、視覚品質・アクセシビリティ全体の合格は別の検証です。DOM実測、画像decode、非同期更新、操作順序等の有限な実ブラウザー試験が成功しても、それだけで静的Unknownを解消しません。
