# usage：npmパッケージからアプリへ組み込む

[English consumer guide](ui-library-consumer-guide.en.md)

生成した Angular の公開入口を利用アプリへ組み込み、必要な画面だけで部品を使うためのガイドです。要求カタログの全部品を一つの業務画面に配置する必要はありません。ツリーの選択、予定、一覧編集、添付、専門エディターなどを用途ごとの画面に分け、利用者の目的、欠損の影響、失敗時に保持する入力、復旧経路を先に決めます。

設定項目は [日本語の設定例](../examples/ui.config.example.yaml) を参照してください。設定の正本は、そのアプリの `ui.config.yaml` です。[部品契約](ui-components.md)、[トークンと生成契約](design.md)、[CLIコマンド](commands.ja.md)と併せて読みます。生成した `.ui/generated/` は手編集せず、設定やパッケージ版を変更してCLIで同期・検査します。

## 導入から画面を作るまで

このガイドは、公開npmパッケージを自分のAngularアプリへ導入する開発者向けです。開発元のcheckoutは不要です。部品選びは[コンポーネント一覧](components.ja.md)、引数やエラー対処は[CLIコマンド一覧](commands.ja.md)を参照してください。

1. パッケージと、生成コードを使うアプリの依存関係を導入する。
2. `init`で設定を作り、アプリの目的と見た目をYAMLへ設定する。
3. `sync --dry-run`で確認し、`sync`で部品・スタイル・Skill・検査器を生成する。
4. 生成した部品とCSSをアプリへ組み込み、画面と業務処理を実装する。AIを使う場合は[生成Skillを読み込ませる](#aiに読み込ませて開発する)。
5. `check`、アプリの型検査・ビルド・操作確認を行う。変更時も設定を直して再同期する。

### パッケージを導入する

アプリのルートでパッケージの版を指定してインストールし、設定を初期化します。`package.json` と `package-lock.json` を一緒に Git へ登録すると、開発環境や CI で `npm ci` を使って同じ版を導入できます。

```sh
npm install --save-dev --save-exact @hiroshi.inoue/ui-foundation@0.2.0
./node_modules/.bin/ui-foundation --help
./node_modules/.bin/ui-foundation init --language ja
```

`0.2.0` の検証環境は Node.js 24.19.0、macOS arm64、Angular/CDK 22.3.0、TypeScript 6.0.3 です。**生成 UI に必要な依存関係は、アプリ側で導入します。** 全件入口を使う場合は、画面で使う部品の数にかかわらず、専門部品のエンジンまで型解決できる必要があります。 [依存関係](#依存関係) · [利用契約](npm-beta-readiness.ja.md)

npm install後は`node_modules/@hiroshi.inoue/ui-foundation/docs/`で、導入した版の利用者文書を読めます。`sync`すると同じ文書が`.agents/skills/project-ui/references/docs/`へコピーされ、アプリ用のSkillと`project-context.md`も生成されます。開発元の計画・ADR・要求マトリクス・監査・検証履歴は配布せず、導入時の必須入力にはしません。

`init`は`ui.config.yaml`のひな形だけを作ります。既存設定は上書きしないので、導入済みなら`init`を繰り返さず既存YAMLを編集します。以下のCLIコマンドはすべてアプリのルートから実行します。

### 目的と見た目を設定する

最初の画面を作る前に、生成された`ui.config.yaml`を編集します。開発中に見た目を変える場合も、このファイルを変更します。

| 項目 | 設定する内容 |
| --- | --- |
| `context` | 作るアプリの目的・目標・制約。開発者やAIの判断材料 |
| `primitives` | 色、長さ、書体などの具体値 |
| `semantic` | 本文、主操作、ページ余白など、用途と具体値の対応 |
| `profiles` | 名前付きの設定集。共通の`semantic`に対する差分と、画面設計の指針 |
| `default_profile` | 既定として使うプロファイルID |
| `output` | 生成専用ディレクトリ。ひな形は`.ui/generated` |
| `checks` | 静的検査するアプリソースや、理由付きの例外 |

`guided`／`dense`は設定例のIDです。名前自体に特別な機能はなく、2種類に限定されません。`guided`を選んでも手順画面が自動生成されるわけではありません。画面構成は開発者やAIが実装し、`context`や`guidance`の文章からCLIが色や寸法を推測することもありません。

最初は、ひな形の既存項目を変更して違いを確認できます。次は既存の同名キーを編集する例で、YAML全体ではありません。末尾へ同じキーを追加すると重複になるため、元の定義を置き換えます。

```yaml
# 既存のprimitives内にある値を変更する
primitives:
  round-guided: { type: length, value: 8px }

# 既存のdefault_profileを変更する場合
# ここでは変更したguidedの角丸を確認する
default_profile: guided
```

`default_profile`はルート直下へ置く項目です。`dense`の設定を使うならこの値を`dense`に変更します。完全な構造と参照の条件は[設定例](../examples/ui.config.example.yaml)と[設計](design.md#設定の正本)を参照してください。

## 静的検査の導入と更新

`checks.source_roots` に検査するソースを指定します。新規の `init` は `src` を設定します。対象ディレクトリには、実際のTypeScript・Angular template・CSS/SCSS等の対象ファイルが必要です。アプリの配置が異なる場合は変更してください。`tsconfig` は省略できます。指定する場合は、アプリに存在する設定ファイルへのプロジェクト相対パスを使います。

```yaml
checks:
  source_roots: [src]
  # tsconfig: tsconfig.app.json
```

利用アプリのルートで、設定から部品・スタイル・Skill・検査器を一緒に生成します。設定変更や生成元の更新後も同じ手順で同期します。

```sh
./node_modules/.bin/ui-foundation sync --dry-run --config ui.config.yaml
./node_modules/.bin/ui-foundation sync --config ui.config.yaml
./node_modules/.bin/ui-foundation check --config ui.config.yaml
```

`output` の既定値は `.ui/generated/` です。`check-ui.cjs` だけを抜き出さず、`checker-lib/`・`policy.json`・`CHECKER-NOTICE.txt` 等を含む生成ディレクトリ全体と、`.agents/skills/project-ui/` を管理します。生成物とSkillはGitで追跡します。所有範囲や移行は[生成契約](design.md#生成と利用)に従います。

画面を追加するときは `angular.json` のソースルートと `checks.source_roots` を照合します。例えば `projects/admin/src` を追加した場合、`uncovered-project` が出たら検査対象へ加えます。アプリのCIでソース検査を必須にする実行例です。

```sh
./node_modules/.bin/ui-foundation check --require-source-checks
node .ui/generated/check-ui.cjs --require-source-checks
```

生成一致も検査する場合は1行目、同期済みの方針でソースだけを検査する場合は2行目を使います。既存違反を段階的に直す場合は確認済みの JSON 基準を `--baseline ui-check-baseline.json` で指定します。新規違反は修正し、警告は個別に確認します。公開入口を案内する警告は、該当する import を公開入口へ変更します。意図した例外には理由と再確認条件を残します。 [検査範囲・差分判定と例外](static-checks.ja.md)

安定メッセージ ID を使うアプリは、表示や読み上げの翻訳漏れと、辞書の ID・引数を検査できます。[翻訳漏れの検査を有効にする](static-checks.ja.md#翻訳漏れの検査)

生成後のソース検査は、利用アプリのNode.jsから実行できます。Node.jsの対応版はインストール済みパッケージの`package.json`の`engines`に従います。本体のチェックアウトや検査専用の追加npm依存は不要ですが、部品のビルド・実行に必要なAngular等の依存は別途導入します。同梱検査器をアプリのブラウザーバンドルへ含めません。

```sh
node .ui/generated/check-ui.cjs --config ui.config.yaml
node .ui/generated/check-ui.cjs --config ui.config.yaml --format json
```

利用アプリの既存 `package.json` の `scripts` へ、次の項目を追加し、CIやbuildの前段で実行します。このコマンドは設定から生成先を読み取ります。

```json
{
  "scripts": {
    "ui:check": "ui-foundation check --config ui.config.yaml --require-source-checks"
  }
}
```

上の`ui:check`は利用アプリで追加するスクリプトの例です。ui-foundationをインストールしても、このスクリプトがアプリへ自動追加されるわけではありません。このスクリプトは、生成一致と設定したアプリソースを確認します。本体CLIの `check` は設定・生成物の一致と指定ソースを検査します。同梱版は設定と生成policyの一致・指定ソースを検査し、生成物全体の一致や所有範囲の確認は代替しません。policy未同期を検出したら、生成物を手直しせず本体CLIで再同期します。

### 判定と修正の進め方

- 確定した違反、設定不備、対象欠損、読み取り・解析失敗は終了コード1です。診断のファイル・行・ルール・理由を確認し、アプリのソースや正本設定を修正します。
- 静的に確定できない箇所は警告として残り、警告だけなら終了コード0です。動的な値やCSSの供給元等を確認し、必要な実行時・操作検証を別に行います。終了0を視覚品質・アクセシビリティ・実利用の合格に広げません。
- `checks` がない既存設定は `NOT_CONFIGURED` です。ソース検査を導入する場合は対象を設定して再同期します。
- 外部部品の承認や配置寸法等の例外には、用途に応じた理由と対象を明示します。警告を消すための全ファイル除外や一律承認は行いません。

対象・除外、承認部品、理由付き例外、JSONの使い方、静的に確認できない範囲は[静的検査の設定・配布・判定範囲](static-checks.ja.md)にまとめています。

## AIに読み込ませて開発する

標準のAI向けSkill・参照手順・生成contextの説明は英語です。人間向けのこのガイドやAPI・設計資料には日英版を用意し、標準Skillは英語版を参照します。アプリに同期される入口は `SKILL.md` です。アプリがYAMLに記述した文脈やラベルは原文を保持します。

ファイルを参照できる開発AIに、生成したSkillと設定を読み込ませて画面の作成・修正を依頼できます。ui-foundationは、AIが提供部品と採用したデザイン設定を使うための開発指針を生成します。AIモデルの起動・選択やAPIへの接続は行いません。

### 1. 初回のsyncを終えて、参照するファイルを確認する

パッケージ導入、YAMLの編集、最初の`sync`を終えてから、AIの作業対象を**利用先アプリのルート**にします。`init`だけではSkillはまだ生成されません。

| アプリrootからのパス | AIが読む内容 |
| --- | --- |
| `.agents/skills/project-ui/SKILL.md` | UI設計・部品利用・設定変更・検証の手順 |
| `.agents/skills/project-ui/project-context.md` | アプリの目的・制約・プロファイル・解決済みのデザイン設定 |
| `ui.config.yaml` | アプリが管理する設定の正本。別名で管理する場合は実際のパスを使う |
| `.agents/skills/project-ui/references/docs/` | 部品API、利用ガイド、設計・依存の資料。収録文書は導入したパッケージ版に従う |

Skillの生成先は固定です。YAMLの`output`を変更しても`.agents/skills/project-ui/`は変わりません。部品とCSSは、`project-context.md`と正本YAMLにある実際の`output`を参照します。利用先アプリのルートに開発元の`docs/`があるとは仮定せず、同梱された`references/docs/`を使います。

### 2. AIへファイルの読み込みを依頼する

AIツールのファイル参照・添付機能、またはローカルファイルの読み取り機能を使います。Skillを自動探索するか、どのタイミングで選ぶかはAIツール側の仕様によるため、このガイドではパスを明示して読み込ませます。インストールや`sync`の成功だけで、AIが内容を読んだとは扱いません。

次の依頼文を出発点にできます。別名のYAMLを使う場合は、そのパスへ置き換えてください。

```text
このアプリのUIを実装する前に、次のファイルを読んでください。
- .agents/skills/project-ui/SKILL.md
- .agents/skills/project-ui/project-context.md
- ui.config.yaml

使う部品のAPIと依存条件は、Skillが参照するreferences/docs/の英語版から確認してください。
読めたファイル、採用するプロファイル、生成先を簡潔に示してください。
不足するファイルや参照できない資料がある場合は、その箇所を報告してください。
```

AIの返答では、読み込んだパス、設定に存在するプロファイルID、現在の生成先が自分のアプリと一致していることを確認します。ファイルを読めない場合は、そのAIツールで参照可能な形で必要な資料を渡します。AIが示した内容が実際のファイルと一致するかも確認してください。

### 3. 画面作成や設定変更を依頼する

読み込み後は、作りたい機能、使うデータ、既存処理との接続、確認したい操作を伝えます。例えば、既に一覧取得・保存処理を持つアプリなら次のように依頼できます。

```text
読み込んだproject-uiの手順に従い、申請の一覧と編集画面を作ってください。
プロファイルはui.config.yamlのdefault_profileを使ってください。
既存の一覧取得・保存処理と、生成済みの公開部品を使ってください。
検索、対象の選択、入力、保存結果を確認できる構成にしてください。
処理中・エラー・一部情報の欠損も扱い、入力を保持してください。
変更したアプリのファイル、使った部品、実行した検証と未確認事項を報告してください。
```

画面構成と業務処理は、AIがアプリのソースへ実装します。生成部品の公開入口とセマンティックトークンを使い、生成ディレクトリや生成Skillへ業務コードを置かないようにします。

見た目を変える依頼では、例えば「本文を大きくし、入力欄の間隔を広げたい」と目的を伝え、AIに正本YAMLの変更案を出してもらいます。採用する具体値と対応関係を決めてYAMLへ反映し、次の順で同期・検査します。生成したCSSや`project-context.md`を直接書き換えて合わせる手順にはしません。

```sh
./node_modules/.bin/ui-foundation sync --dry-run
./node_modules/.bin/ui-foundation sync
./node_modules/.bin/ui-foundation check --format json
```

別名のYAMLを使う場合は全コマンドへ同じ`--config`を指定します。`context`や`guidance`の説明を変えただけではトークン値は変わりません。AIが目的から具体値を提案し、人が採用した設定をCLIが生成する、という分担です。

### 4. 診断をAIへ渡し、変更後の結果を確認する

`check --format json`の出力と終了コードをAIへ渡すと、生成差分やソース診断を根拠に修正を依頼できます。本体CLIの`differences`と`source.diagnostics`を使い、警告や`NOT_CONFIGURED`を合格へ読み替えないようにします。[検査結果の読み方](commands.ja.md#終了コード警告not_configured)も参照してください。

AIの作業後は、アプリの差分、採用した設定、実行した型検査・ビルド・主要操作を確認します。静的検査だけでは画面の見た目や使いやすさを判定できないため、実画面も確認します。

設定やパッケージ版を変更して再同期した場合は、更新された`SKILL.md`、`project-context.md`、必要な参照文書をAIへ読み直させます。新しい会話でも、上の読み込み依頼から始められます。

## 設定を画面へ適用する

`sync`が出力した`tokens.css`には、`default_profile`を`:root`へ適用する定義が入っています。別のプロファイルを使う領域だけ、設定に存在するIDを`data-ui-profile`へ指定します。

```html
<main class="app-screen" data-ui-profile="guided">
  <!-- この領域へ生成部品を配置する -->
</main>
```

初期値に固定して使うなら、切替UIを実装する必要はありません。実行時に切り替える場合は、生成した`profiles.ts`の`uiProfiles`から有効なIDとラベルを読み、属性を変更します。入力や取得状態を作り直さない構成にしてください。属性の変更はYAMLへ保存されず、次の起動時の初期値を変えるには設定またはアプリの保存処理が必要です。

### CSSとTailwindを読み込む

アプリのグローバルCSSへ生成CSSを読み込みます。次はアプリのルート直下へ生成し、`src/styles.css`へ記述する場合の例です。ファイルの位置を変えた場合は相対パスも合わせます。Angularのグローバルスタイル設定へこのファイルを登録してください。

```css
@import "tailwindcss" source(none);
@import "../.ui/generated/tokens.css";
@import "../.ui/generated/tailwind.css";
@import "../.ui/generated/angular/styles.css";

@source "./**/*.ts";
@source "./**/*.html";
@source "../.ui/generated/angular/**/*.ts";

.app-screen {
  font-family: var(--ui-font-body);
  font-size: var(--ui-text-body);
  line-height: var(--ui-leading-body);
  color: var(--ui-color-text);
  background: var(--ui-color-background);
  padding: var(--ui-space-page);
}
```

Tailwind v4を処理するビルド環境が必要です。生成部品のTypeScript内にもinline templateがあるので、アプリのHTMLだけでなく生成ソースも`@source`に含めます。Tailwindを使わないアプリは、Tailwind用のimportと`@source`を省き、`tokens.css`と`angular/styles.css`をグローバルCSSとして取り込み、画面のCSSから同じセマンティック変数を使います。専門部品の追加CSSやworkerは[CSSと配布資産](#css-と配布資産)を確認してください。

## 公開入口と Angular のビルド

利用する部品に応じて、生成先の公開入口を選びます。

| 公開入口 | 用途 |
| --- | --- |
| `angular/core.ts` | 操作部品、Card、ネイティブ入力欄と、対応するアイコン・翻訳 API を使う。 |
| `angular/forms.ts` | テキスト入力、複数行入力、ラベル付きのネイティブ入力欄を使う。 |
| `angular/layout.ts` | `Stack` などの配置部品とレイアウト用の型を使う。 |
| `angular/disclosure.ts` | `Disclosure` で内容を開閉する。 |
| `angular/index.ts` | ほかの部品を使う場合や、全件の Angular API が必要な場合に使う。 |

`layout` と `disclosure` は `@angular/core` と共通の生成トークン・部品用 CSS を使います。この2つの入口だけを利用するアプリでは、CDK や専門部品向けの依存は不要です。

`core` を提供する版を導入して同期すると、生成先が既定の `.ui/generated/` の場合は次のように指定できます。

```ts
import { ActionControl, Card, FormField, FieldControl } from '../.ui/generated/angular/core';
```

`core` は Angular core・common・CDK と CDK の peer である Angular Forms、RxJS を参照します。アプリのビルドと起動に必要な Angular パッケージも用意してください。TypeScript の検査対象にはアプリのソースを指定し、生成コードは import を通じて取り込みます。全生成ソースを glob で指定すると、専門部品の依存関係まで型検査対象になります。共通のトークンと部品用 CSS を読み込んでください。`core` を使うための `sideEffects` 指定や専門部品の CSS・worker は不要です。既存の全件入口も引き続き利用できます。

Angular CLI 22.3.0で作り、Angular FormsとRxJSを含むアプリなら、基本部品とフォームには CDK を追加します。

```sh
npm install --save-exact @angular/cdk@22.3.0
```

フォーム用の入口は `core` と同じ依存構成で使えます。

最初はテキスト入力を一つ組み込めます。次は`src/app.ts`に置くstandalone componentの例です。既存のアプリでは、自分の画面へimportとtemplateを組み込んでください。

```ts
import {Component} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {TextInput} from '../.ui/generated/angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TextInput, ReactiveFormsModule],
  template: `
    <main class="app-screen">
      <ui-text-input controlId="application-name" label="申請名"
        [formControl]="name" />
    </main>
  `,
})
export class App {
  readonly name = new FormControl<string | null>('');
}
```

この例ではアプリが`name`を所有します。保存先への送信や成功・失敗の処理は、アプリ側で接続します。次は、型付きテンプレートを使うTreeの例です。importの相対パスはソースファイルの位置に合わせて変更します。

```ts
import {Component} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {
  Tree, TreeSelect, TreeNodeTemplate,
  type TreeNode,
} from './.ui/generated/angular/index';

interface Department { amount: number; description: string; }

@Component({
  selector: 'department-screen',
  standalone: true,
  imports: [Tree, TreeSelect, TreeNodeTemplate, ReactiveFormsModule],
  template: `
    <ui-tree treeId="departments" label="部署一覧" [nodes]="nodes">
      <ng-template [uiTreeNodeTemplate]="nodes" let-node let-level="level">
        {{node.label}} {{node.data?.amount?.toFixed(0)}} {{level}}
      </ng-template>
    </ui-tree>
    <ui-tree-select controlId="department" label="代表部署"
      [nodes]="nodes" [formControl]="selected" />
  `,
})
export class DepartmentScreen {
  readonly nodes: readonly TreeNode<Department>[] = [
    {id: 'operations', label: '運用', data: {amount: 2, description: '第二部署'}},
  ];
  readonly selected = new FormControl<readonly string[] | null>(null);
}
```

`TreeNodeTemplate` の `[uiTreeNodeTemplate]`、`SchedulerEventTemplate` の `[uiSchedulerEvent]`、`TableTemplate` の該当契約へ型付きの配列を渡すと、template context の型を Angular が検査できます。`TreeNode<Department>.data.amount` に `toUpperCase()` を使うと strictTemplates で失敗します。型を `any` へ広げるとこの検査を失います。

公開barrelを読むアプリの入口を`include: ["consumer.ts"]`のように指定できます。生成物の全 glob を root file に追加する必要はありません。実アプリではアプリ自身の入口と画面を `include` に指定します。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "experimentalDecorators": true,
    "skipLibCheck": true,
    "noEmitOnError": true
  },
  "angularCompilerOptions": {
    "strictTemplates": true,
    "strictInjectionParameters": true
  },
  "include": ["consumer.ts"]
}
```

アプリ側の Angular builder を使う場合はその標準 linker を使用します。esbuildなどで独自にビルドする場合は、`ngc`の出力をbundleし、partial-compiledなAngular依存を`@angular/compiler-cli/linker/babel`でlinkする構成が必要です。ブラウザー向けESM、code splitting、productionの`ngDevMode: false`を適切に設定してください。生成した TypeScript をリンクなしにそのまま配信する構成にはしません。

### ページ遷移はアプリ側で組み込む

ナビゲーション、パンくず、メニューなどはUI部品です。Angular Routerのルート定義、`RouterOutlet`、認証・未保存状態に応じた遷移制御は利用アプリが実装します。生成部品と`RouterLink`などの合成は未検証です。リンクを置くだけでSPAの画面遷移が実装されるとは扱わず、採用する構成で現在地表示、無効・処理中のリンク、戻る操作などを確認してください。

## アイコンの登録

アイコンを1種類だけ使う場合は、表示する部品やルートにその図形を登録します。遅延ルート専用の図形は、そのルートのファイルで読み込みます。

```ts
import { Icon, selected } from '../.ui/generated/angular/icons';
import { shape as search } from '../.ui/generated/angular/icons/search';

// @Component({ imports: [Icon], providers: [selected(search)], ... })
// <ui-icon name="search" />
```

既定12種類を使うには `angular/icons/defaults` の `provideUiIcons()` を登録します。従来の `angular/core` と `angular/index` からも利用できます。遅延ルートで検索と矢印を使う場合は、そのルートで `icons/search` と `icons/chevron-right` の図形を読み、`selected(search, chevronRight)` を登録します。子の injector に登録すると、そのスコープでは子の登録を使います。

生の `svg[lucideIcon]` や `provideLucideIcons`・`provideLucideConfig` と登録や設定を共有しているアプリは、更新時に `@lucide/angular@1.52.0` を導入し、YAML に `icons: { lucide_interop: true }` を指定して同期してください。登録用の import を `angular/icons/lucide` に切り替え、この入口の `provideUiIcons(...extraIcons)` を使うと登録を共有できます。既存の Lucide レジストリを使う場合は、同じ入口の `provideUiLucideInterop()` を追加します。アプリが `@lucide/angular` のクラスを直接 import したルートには、そのパッケージの読み込みが発生します。

アプリのルートで通常の `selected(...)` と空の `provideLucideIcons()` を並べると、`ui-icon` は選択した図形を使います。生の Lucide と同じ登録順で空にしたい場合は、互換入口の `provideUiIcons(...)` の後に空の `provideLucideIcons()` を置いてください。

## 依存関係

`0.2.0` の検証構成は Angular/CDK `22.3.0`、RxJS `7.8.2`、TypeScript `6.0.3` を使用します。Node の要求版は `package.json` の `engines` に従います。Tailwindを使う場合の検証版は`tailwindcss@4.3.0`です。リポジトリ上の `devDependencies` 分類だけを見て生成部品の runtime engine を省かないでください。利用する生成ソースをアプリで解決できる依存と、再現可能な lockfile が必要です。

全件入口 `angular/index.ts` から参照される追加 runtime engine は次の 25 件です。この入口を使うときは、画面で使う部品が少なくても strict compile で解決できるようにします。実際のブラウザー bundle では複数の engine が動的 import により分割されます。

| パッケージ | 検証版 | 用途 |
| --- | --- | --- |
| `@codemirror/autocomplete` | `6.20.3` | 補完 |
| `@codemirror/commands` | `6.11.1` | エディター操作 |
| `@codemirror/lang-javascript` | `6.2.5` | JavaScript 言語 |
| `@codemirror/lang-json` | `6.0.2` | JSON 言語 |
| `@codemirror/lang-markdown` | `6.5.2` | Markdown 言語 |
| `@codemirror/merge` | `6.12.2` | 差分 |
| `@codemirror/state` | `6.7.6` | エディター状態 |
| `@codemirror/view` | `6.43.13` | エディター描画 |
| `@dagrejs/dagre` | `3.1.1` | フロー配置 |
| `echarts` | `6.1.0` | Chart / Sparkline |
| `fast-formula-parser` | `1.0.19` | Spreadsheet 数式 |
| `jsonc-parser` | `3.3.1` | JSON 構造 |
| `maplibre-gl` | `6.12.0` | 地図描画 |
| `marked` | `18.1.0` | Markdown |
| `prosemirror-commands` | `1.7.2` | RichText 操作 |
| `prosemirror-history` | `1.5.1` | RichText 履歴 |
| `prosemirror-keymap` | `1.2.3` | RichText キー操作 |
| `prosemirror-model` | `1.25.12` | RichText 文書 |
| `prosemirror-schema-basic` | `1.2.5` | RichText schema |
| `prosemirror-state` | `1.4.4` | RichText 状態 |
| `prosemirror-view` | `1.42.6` | RichText 描画 |
| `pdfjs-dist` | `6.4.299` | PDF |
| `qrcode` | `1.5.4` | QRCode |
| `jsbarcode` | `3.12.3` | Barcode |
| `temporal-polyfill` | `1.0.5` | Scheduler の時刻・time zone |

全件入口を使うアプリの型検査用に `npm install --save-dev @types/qrcode@1.5.6 @types/geojson@7946.0.16` を実行します。公開入口の `angular/index.ts` は地図部品も参照するため、基本部品だけを使う場合も GeoJSON の型が必要です。ビルド用の Angular compiler/CLI、TypeScript、使用する bundler/linker もアプリの toolchain に用意します。

`fast-formula-parser` の型は生成した `formula-parser.d.ts` にあります。公開 barrel の `SheetResult` export から `sheet-formula.ts` の triple-slash reference を経由して読み込まれます。この経路で最小 consumer の型付き parser 利用は検査できます。生成 barrel を読まずに parser だけを import した別の root file では型宣言が自動で現れるとは限りません。必要ならアプリの当該 worker/入口から生成型宣言を明示的に参照します。型宣言を `any` の module stub へ置き換えません。

## CSS と配布資産

画面の配置や余白は利用アプリ側で設定します。この例ではセクションの余白をアプリの CSS で指定し、ボタンの強調度は公開 API の `emphasis` で選びます。Tailwind を使う場合、`p-section` は同じ余白トークンを参照します。

```html
<section class="app-actions">
  <button uiAction emphasis="primary">保存</button>
</section>
```

```css
.app-actions { padding: var(--ui-space-section); }
```

自作CLI・テンプレート・Skill・生成コードはMIT License（2026 Hiroshi Inoue）です。npm内の`LICENSE`と、生成outputおよび生成Skillの`UI-FOUNDATION-LICENSE.txt`を保持します。最終成果物へ生成outputの本文を`ui-foundation/LICENSE.txt`としてコピーしてください。利用アプリのroot LICENSEは変更せず、第三者資産の通知・対応ソースをこのMIT本文で置き換えません。

この節で`assets/`と示すコピー元は、インストール済みの`node_modules/@hiroshi.inoue/ui-foundation/assets/`です。`assets/third-party/` は全内容を配布成果物に含めます。PDF 資産を配布する場合は `assets/pdf-source/` の全内容も含めます。前者の`FOUNDATION-NOTICES.txt`と`THIRD-PARTY-NOTICES.txt`、後者の原notice・対応ソースarchive・recipe・font mappingを保持してください。PDFとMapLibreのworkerに付随する原LICENSEも下表に従って含めます。CLIの`CLI-NOTICE.txt`や生成checkerの`CHECKER-NOTICE.txt`は対象が別であり、アプリ配布用の基盤・第三者通知を代替しません。

新たに見た目を指定するときは、現在の操作APIを使えます。既存の `variant="primary"` と `variant="secondary"` はそのまま使えます。`variant="danger"` を同じ表示の新APIへ移すには、`emphasis="primary" tone="danger"` を指定します。グループ内での優先度に応じて強調度を選び、操作の結果はラベルで伝えます。[操作の仕様](ui-components.md#actioncontrol--actionlink)

部品の inline CSS に加え、生成した `tokens.css`、`angular/styles.css`、専門部品を使う画面では `angular/specialist.css` を global CSS として取り込みます。MapView には実使用版の `maplibre-gl/dist/maplibre-gl.css` も必要です。アプリの utility CSS も用途別セマンティックトークンを使います。primitive 値の直接参照や旧 preset/density API の互換層は追加しません。

次の表は配布資産の配置例です。アプリの public base path に合わせ、URL とファイル配置を一緒に変更します。

| コピー元・ビルド入口 | public 配置例 | 部品側の指定 |
| --- | --- | --- |
| `pdfjs-dist/build/pdf.worker.mjs` | `/assets/pdf/pdf.worker.mjs` | `PDFViewer.workerUrl` |
| `pdfjs-dist/{cmaps,standard_fonts,wasm,iccs}/` | `/assets/pdf/` 配下に同じ directory | `PDFViewer.assetsBaseUrl` |
| `pdfjs-dist/LICENSE` | `/assets/pdf/LICENSE` | 原文を保持 |
| `assets/pdf-source/` | `/assets/pdf/source/` | 実 archive、原 notice、recipe、font mapping を全コピー |
| `maplibre-gl/dist/maplibre-gl-worker.mjs` | `/assets/maplibre/maplibre-gl-worker.mjs` | `MapView.workerUrl` |
| `maplibre-gl/dist/maplibre-gl-shared.mjs` | 上記 worker と同じ directory | worker の相対 import を保持 |
| `maplibre-gl/dist/maplibre-gl.css`、`maplibre-gl/LICENSE.txt` | `/assets/maplibre/` | CSS と原 notice |
| 生成した `sheet-formula.worker.ts` を別 ESM entry として compile/bundle | `/assets/sheet-formula.worker.js` | `Spreadsheet.workerUrl` |
| `assets/third-party/` | `/assets/third-party/` | `FOUNDATION-NOTICES.txt`と`THIRD-PARTY-NOTICES.txt`を含む全内容を保持 |

```html
<ui-pdf-viewer label="申請資料" [source]="pdfSource()"
  workerUrl="/assets/pdf/pdf.worker.mjs" assetsBaseUrl="/assets/pdf/" />
<ui-map label="対象地点" [markers]="markers"
  workerUrl="/assets/maplibre/maplibre-gl-worker.mjs" />
<ui-spreadsheet label="計算表" [sheet]="sheet"
  workerUrl="/assets/sheet-formula.worker.js" />
```

`PDFViewer.source` は `PdfSource | null`、`MapView.markers` は `readonly MapMarker[]`、`Spreadsheet.sheet` は `SheetModel` です。PDF の worker と本体は同じ exact 版にします。module worker の `.mjs` / `.js` は JavaScript MIME、Wasm は `application/wasm` で配信し、SPA の HTML fallback が worker URL を置き換えないようにします。worker の URL は実ファイルへ到達する public URL を明示し、bundle の chunk 配置から推測しません。

PDF の補助資産は上記四 directory の全内容と原 notice を維持します。`standard_fonts` の Liberation TTF に対応する実 source package は `assets/pdf-source/` が正本です。URL リストだけに置き換えず、11 ファイルをそのまま配布します。版・フォント・コピー対象を変更する際は、同梱の`FONT-MAPPING.json`、原notice、source archive、recipeとの対応と各原ライセンスの供給条件を確認します。source kitの配布は、FontForgeによる再ビルドや法的判断の完了を示すものではありません。

MapView の既定 style は外部データを持たない背景で、マーカー・領域を描画できます。地図タイルや style を必要とする業務では `baseStyle` をアプリが選び、データ取得先、利用条件、帰属、障害時の代替一覧を管理します。外部 map service の契約や認証は部品から自動で作りません。

アプリの CSP は module script、worker、配信した補助資産の取得先を許可する必要があります。上記の同一 origin 配信では worker の exact URL を `worker-src` の対象にし、PDF/地図データの `connect-src` も実際の取得先へ合わせます。Angular の style/nonce とアプリの既存 CSP を含めて配布先で検証します。workerの起動・資産のHTTP応答と、アプリ全体のCSP policyは別に確認してください。

## Locale、文言、RTL の責任

`provideUiLocale` でアプリ全体にロケールを渡せます。一部の領域に適用する場合は、`UiLocaleScope` を standalone imports に追加し、`[uiLocale]` に設定を渡します。`injectUiLocale()` で現在の設定を取得できます。

`init` は `default_language: en`、`init --language ja` は `default_language: ja` を保存します。この項目のない既存設定は日本語を引き継ぎます。YAMLを変えた場合は再同期します。実行時は `locale` の言語が日本語なら標準の日本語文言を表示し、それ以外の言語では標準の英語文言を表示します。ブラウザー言語から設定を推測することはありません。

外部翻訳を接続すると、ライブラリは安定IDと型付きの名前付き引数を `UiMessageRequest` に入れ、アプリの `translate(request, locale)` を呼びます。対象は部品に備わる操作・状態・診断などの文言です。業務ラベル・候補名・本文・APIエラーはアプリ側で翻訳します。辞書を読み込んでいる間、値が空のとき、または翻訳処理がIDをそのまま返したときは、部品の標準文言が表示されます。

[辞書を遅延取得する接続例](../examples/locale-adapter.ts)を、`.ui/` と同じ階層にコピーします。アプリの生成先や配信先が異なる場合は import と辞書URLを合わせます。アプリ全体には `options` の Signal を `provideUiLocale` に渡し、画面の一部なら `options()` を `[uiLocale]` に渡します。言語切り替えの操作から `switchLanguage` を呼び、利用言語ごとのJSONを配信します。このファイルをnpm配布物から取り出し、隔離したAngularアプリでコンパイルして実操作を検証します。

辞書には、例えば `uiFoundation.dialog.closeAction` に対応する訳文を登録します。`uiFoundation.card.expand` なら `「{title}」の詳細を表示` のように引数名を使えます。語順、単数・複数形は文全体で決めます。言語と方向は辞書の取得を待たずに切り替わります。遅く届いた辞書は、その辞書の言語にだけ適用されます。入力済みの内容や編集中の部品を作り直す必要はありません。

子領域は親の翻訳処理を継承します。子だけで翻訳処理を指定するか、`translate: null` で標準文言を使えます。`locale` は Intl の書式にも反映されます。業務タイムゾーンは `timeZone` で明示します。暦日はタイムゾーンで別日へ変換しません。明示した部品の入力設定は共通設定より優先されます。[ランタイム仕様](ui-library-runtime-foundation-spec.ja.md) · [日本語キーからの移行](ui-message-migration.ja.md)

native のアプリ所有 `lang` / `dir`、祖先の方向、public CDK `Dir` はアプリの指定を尊重します。scope は自分が設定した属性だけを破棄時に戻し、アプリが変更した属性を保持します。子へ提供する CDK `Directionality` は `.value`、`.valueSignal()`、`.change` の公開契約を使います。RTL の意味は部品の表示だけでなく、アプリの document/画面構成・入力内容にも合わせます。

## フォーム、下書き、非同期結果

フォームの reset は null を含む型で設計します。

```ts
const files = new FormControl<readonly File[] | null>(null);
const period = new FormControl<DateRange | null>(null);
const comment = new FormControl<string | null>('');
```

`DateRange` は公開 barrel から import します。空の reset が domain 上で不適切な場合はアプリが `nonNullable` と有効な reset 値を選びます。Angular の `[formControl]` と CVA は部品ごとの値型を完全には結び付けないため、strict compile 成功だけで接続した control の実値が正しいとは判断できません。入力 API の型、フォーム型、runtime Validator、native 操作を併せて確認します。

FileUpload / Dropzone は `readonly File[] | null` の CVA と Validator を持ちます。未知の復元値を成功したファイル選択へ変換せず、invalid として保持します。混在バッチに拒否がある場合、確定したフォーム値を部分更新しません。一方、`selection` と許可された各ファイルの `uploadRequested` は通知されるため、アップロード処理の採否はアプリ側で別に決めます。native file picker は値を programmatically 復元できず、reset 後は空になります。

`UploadEntry`、`UploadRequest`、`UploadIntent` の `id` と `requestId` を保ったまま、進捗・失敗・取消・再試行の結果をアプリが更新します。再 mount で旧 entry を復元する場合も entry の ID と request epoch を引き継ぎます。遅い旧要求の結果で最新の entry を上書きしません。readonly/disabled と reset は native intake とフォーム値の両方で確認します。

DateRangePicker は開始と終了の draft を持ち、両側が有効になってから range を公開します。開始日の途中入力が invalid のまま終了日を編集しても、以前の確定 range を部分的に置き換えません。アプリは Validator の状態と確定値の違いを扱い、invalid draft を自動保存成功に数えません。 DatePicker の invalid draft や native `badInput` がある間、provider / scope / `inputFormat` から要求された入力書式は保留され、表示中の書式と入力を維持します。利用者がその書式で有効な日付へ修復するか、クリア、CVA reset、カレンダー選択を行うと、新しい設定書式を採用します。書式変更だけで入力を捨てたり、Validator を VALID に戻したりしません。

MessageComposer / Chat の `sendRequested: ChatSendRequest` は送信要求です。結果は公開 `completeSend(requestId, clearDraft?)`、`failSend(requestId, message)`、`markSendUnknown(requestId)` でアプリが返します。送信意図だけで保存済み表示へしません。CVA reset / 明示 value の更新は以前の pending 要求とエラーを解除し、古い request ID の応答は適用されません。unknown の場合は保存済みかをアプリが確認してから次の行動を決めます。

DataGrid の保存、Scheduler の移動、Kanban/Gantt/FlowEditor の変更、Spreadsheet の cell edit/import も intent をアプリが受け、アプリ所有の controlled データを更新する契約です。部品の ACK、実 backend の保存、永続化、取消、Undo の完了は別々に確認します。

既に表示しているライブラリの状態説明・エラーやファイル拒否理由も、locale / messages の変更へ追随します。業務側が提供したエラーは、文面が辞書 key と一致しても業務文言として保持します。辞書変更は取得・送信・worker の処理を再実行する指示にはならず、入力・選択と現在の要求を維持します。

## ブラウザー境界と検証

重いブラウザー engine は部品内の描画開始後に動的 import されます。アプリの bundler はその import と worker entry を保持し、遅延 chunk も配布します。採用するengineのchunk取得、native workerの起動、画像・音声・字幕の実配信をアプリのHTTP環境で確認してください。

SSR を使うアプリではブラウザー専用画面の import/mount を browser の処理まで defer し、server 側では目的が伝わる fallback とデータの代替表を用意します。Localeのserver DI対応だけでは、カタログ全体のSSR HTML rendering/hydrationを保証しません。SSR を採用するアプリは自分の server bundle と hydration を別に検証します。

compile、生成一致、純モデル、native 操作、axe、視覚・意味レビューを分けて記録します。strictTemplates成功や全カテゴリのimport成功は、すべての部品・状態の実操作を確認したという意味ではありません。axe の incomplete は手動確認を要する観測として残します。実 screen reader、OS IME/touch、Firefox/Safari、業務 backend と利用者理解は、利用アプリの条件に合わせて確認してください。

## 設定変更とパッケージ更新

### 見た目やプロファイルを変える

1. `ui.config.yaml`の具体値や対応関係を編集する。生成先のCSSやTypeScriptは直接編集しない。
2. `./node_modules/.bin/ui-foundation sync --dry-run`で変更範囲を確認する。
3. `./node_modules/.bin/ui-foundation sync`で生成物とSkillを更新する。
4. `./node_modules/.bin/ui-foundation check --format json`を実行する。
5. 利用アプリの型検査・ビルドを行い、採用した各プロファイルで実画面と主要操作を確認する。

生成物、YAML、Skill、アプリの変更を一緒にGitで管理します。`default_profile`の変更は既定値に反映されますが、画面が`data-ui-profile`で明示指定しているIDは変わりません。

### パッケージの版を更新する

CLI を npm で更新した後、再同期してアプリの部品・Skill・利用者文書を更新します。旧パッケージ版・lockfile・YAML・生成物・Skill を同じ復旧点へ保存し、更新先の依存関係と API の変更を確認してから、上と同じ dry-run・sync・check とアプリ検証を行います。ベータ版から更新するときは、移行元に応じた手順も確認してください。 [0.2.0 への更新](npm-beta-release-notes.ja.md#020) · [ベータ版からの移行](npm-beta-release-notes.ja.md#010) · [更新と復旧](npm-beta-readiness.ja.md#更新と復旧) · [コマンド一覧](commands.ja.md)

## 保存の再試行を確認する任意のブラウザーテスト

インストールした npm パッケージの `skills/ui-development/references/examples/dialog-retry.ts`、または同期済み Skill の `references/examples/dialog-retry.ts` をコピーします。既存の Playwright テストから `verifyRegistrationRetry` を import し、`page` fixture を渡します。利用アプリの Playwright コマンドでそのテストを実行します。 `baseURL` を設定して画面の相対パスを使うか、画面の URL 全体を渡します。Tab 操作とフォーカスの期待値は画面に合わせ、保存失敗後の移動先も指定します。

画面の URL、操作対象のアクセシブルな名前、表示するエラーを利用アプリに合わせて変更します。保存先の POST パス、リクエスト本文、失敗・成功時の模擬応答も合わせてください。この例は保存失敗後の入力保持、キーボードからの再試行、保存成功後のフォーカス復帰を確認します。
