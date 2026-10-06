# 生成 UI の利用ガイド

生成した Angular の公開入口を利用アプリへ組み込み、必要な画面だけで部品を使うためのガイドです。要求カタログの全部品を一つの業務画面に配置する必要はありません。ツリーの選択、予定、一覧編集、添付、専門エディターなどを用途ごとの画面に分け、利用者の目的、欠損の影響、失敗時に保持する入力、復旧経路を先に決めます。

機械設定の正本は [`examples/ui.config.example.yaml`](../examples/ui.config.example.yaml) です。[部品契約](ui-components.md)、[トークンと生成契約](design.md)、[開発手順](development.md)と併せて読みます。生成した `.ui/generated/` は手編集せず、設定・`templates/angular/`・Skill を変更して `npm run ui:sync`、`npm run ui:check` を実行します。

## 公開入口と Angular のビルド

利用アプリは生成先の `angular/index.ts` を入口にします。以下は生成先が `.ui/generated/` の場合です。内部 controller、private field、fixture の実装に依存しません。

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

独立 consumer は `include: ["consumer.ts"]` だけで公開 barrel を読み、strictTemplates/AOT を通しています。生成物の全 glob を root file に追加する必要はありません。実アプリではアプリ自身の入口と画面を `include` に指定します。

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

アプリ側の Angular builder を使う場合はその標準 linker を使用します。独立 esbuild consumer では `ngc` の出力を bundle し、partial-compiled な Angular 依存を `@angular/compiler-cli/linker/babel` で link しています。ブラウザー向け ESM、code splitting、production の `ngDevMode: false` を使用しました。生成した TypeScript をリンクなしにそのまま配信する構成にはしません。

## 依存関係

今回の検証版は Angular/CDK `22.2.1`、RxJS `7.8.2`、TypeScript `6.0.3` を使用します。Node の要求版は `package.json` の `engines` に従います。リポジトリ上の `devDependencies` 分類だけを見て生成部品の runtime engine を省かないでください。利用する生成ソースをアプリで解決できる依存と、再現可能な lockfile が必要です。

追加 runtime engine は次の 25 件です。公開 barrel はそれらを参照する生成ソースへつながるため、最小 consumer の strict compile でも解決可能にしておきます。実際のブラウザー bundle では複数の engine が動的 import により分割されます。

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

型検査には `@types/qrcode@1.5.6` も必要です。`@zxing/library@0.23.0` は fixture の独立 decoder であり、生成部品の runtime には不要です。ビルド用の Angular compiler/CLI、TypeScript、使用する bundler/linker もアプリの toolchain に用意します。

`fast-formula-parser` の型は生成した `formula-parser.d.ts` にあります。公開 barrel の `SheetResult` export から `sheet-formula.ts` の triple-slash reference を経由して読み込まれます。この経路で最小 consumer の型付き parser 利用は検査できます。生成 barrel を読まずに parser だけを import した別の root file では型宣言が自動で現れるとは限りません。必要ならアプリの当該 worker/入口から生成型宣言を明示的に参照します。型宣言を `any` の module stub へ置き換えません。

## CSS と配布資産

部品の inline CSS に加え、生成した `tokens.css`、`angular/styles.css`、専門部品を使う画面では `angular/specialist.css` を global CSS として取り込みます。MapView には実使用版の `maplibre-gl/dist/maplibre-gl.css` も必要です。アプリの utility CSS も用途別セマンティックトークンを使います。primitive 値の直接参照や旧 preset/density API の互換層は追加しません。

次の表は独立 consumer で実際に配信した対応です。アプリの public base path に合わせ、URL とファイル配置を一緒に変更します。

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
| `assets/third-party/` | `/assets/third-party/` | `THIRD-PARTY-NOTICES.txt` の全文を保持 |

```html
<ui-pdf-viewer label="申請資料" [source]="pdfSource()"
  workerUrl="/assets/pdf/pdf.worker.mjs" assetsBaseUrl="/assets/pdf/" />
<ui-map label="対象地点" [markers]="markers"
  workerUrl="/assets/maplibre/maplibre-gl-worker.mjs" />
<ui-spreadsheet label="計算表" [sheet]="sheet"
  workerUrl="/assets/sheet-formula.worker.js" />
```

`PDFViewer.source` は `PdfSource | null`、`MapView.markers` は `readonly MapMarker[]`、`Spreadsheet.sheet` は `SheetModel` です。PDF の worker と本体は同じ exact 版にします。module worker の `.mjs` / `.js` は JavaScript MIME、Wasm は `application/wasm` で配信し、SPA の HTML fallback が worker URL を置き換えないようにします。worker の URL は実ファイルへ到達する public URL を明示し、bundle の chunk 配置から推測しません。

PDF の補助資産は上記四 directory の全内容と原 notice を維持します。`standard_fonts` の Liberation TTF に対応する実 source package は `assets/pdf-source/` が正本です。URL リストだけに置き換えず、11 ファイルをそのまま配布します。版・フォント・コピー対象を変更する際は [`dependency-license-audit.ja.md`](dependency-license-audit.ja.md) と `FONT-MAPPING.json` の対応も更新します。今回の作業は byte 対応と配布資料の確認で、FontForge による再ビルドや法的判断を完了したという意味ではありません。

MapView の既定 style は外部データを持たない背景で、マーカー・領域を描画できます。地図タイルや style を必要とする業務では `baseStyle` をアプリが選び、データ取得先、利用条件、帰属、障害時の代替一覧を管理します。外部 map service の契約や認証は部品から自動で作りません。

アプリの CSP は module script、worker、配信した補助資産の取得先を許可する必要があります。上記の同一 origin 配信では worker の exact URL を `worker-src` の対象にし、PDF/地図データの `connect-src` も実際の取得先へ合わせます。Angular の style/nonce とアプリの既存 CSP を含めて配布先で検証します。独立 consumer は実 worker と同一 origin assets を確認しましたが、全 CSP policy を検証したものではありません。

## Locale、文言、RTL の責任

公開 API は `UI_LOCALE`、`provideUiLocale`、`injectUiLocale`、`UiLocaleScope`、`injectUiText`、`UiMessagePipe`、`uiMessage` です。`UiText` という公開型・export はありません。

```ts
import {Directive, inject, signal} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {
  UI_LOCALE, provideUiLocale, type UiLocaleOptions,
} from './.ui/generated/angular/index';

const locale = signal<UiLocaleOptions>({
  locale: 'ja-JP',
  timeZone: 'Asia/Tokyo',
  dateInputFormat: 'dd/MM/yyyy',
});
bootstrapApplication(App, {providers: [...provideUiLocale(locale)]});

@Directive({selector: '[localeProbe]', standalone: true})
export class LocaleProbe {
  readonly resolvedLocale = inject(UI_LOCALE); // Signal<UiLocaleResolved>
}
```

`App` は利用アプリの standalone root です。アプリが source signal を所有し、`locale.set(...)` で表示設定を変更できます。既定は `locale: 'ja-JP'`、`direction: null`、`timeZone: null`、`dateInputFormat: 'native'` です。ブラウザー言語・time zone・生成 context の文章から設定を推測しません。Scheduler など time zone が必要な用途にはアプリが明示します。

`UiLocaleOptions` の `civilDateOptions`、`dateTimeOptions`、`numberOptions` は Intl の表示 option、`messages` は部品所有の日本語 fallback 文言を key にする辞書です。civil date は日付の意味を維持し、time zone を跨いで別日へ変換しません。date-time の zone は `timeZone` に指定し、`dateTimeOptions.timeZone` へ重ねて指定しません。NumberInput などの明示 input は DI defaults より優先します。NumberInput の表示 locale と、native 数値 editor の入力契約は別です。

```html
<section [uiLocale]="{locale: 'de-DE', direction: 'rtl', messages: {'検索': 'Suchen'}}">
  <!-- この領域の部品は同じ UI_LOCALE と public CDK Directionality を使う -->
</section>
```

`UiLocaleScope` を standalone imports に追加して使います。辞書は親の設定を継承して指定 key を上書きします。部品の構造上の説明・操作・状態・fallback は `injectUiText` / `UiMessagePipe` で扱い、利用アプリが渡す label、domain データ、保存エラーの文章はアプリが翻訳・管理します。例えば app の「この申請は承認できません」というエラーを、部品の辞書が勝手に置き換えることはありません。

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

重いブラウザー engine は部品内の描画開始後に動的 import されます。アプリの bundler はその import と worker entry を保持し、遅延 chunk も配布します。独立 consumer は ECharts、PDF.js、MapLibre、CodeMirror、ProseMirror の実 chunk 取得と、PDF・Spreadsheet・MapLibre の native worker、実画像・音声・字幕を観測しています。

SSR を使うアプリではブラウザー専用画面の import/mount を browser の処理まで defer し、server 側では目的が伝わる fallback とデータの代替表を用意します。Locale の実 directive を server DI で生成・破棄して browser globals 非参照を確認したことは、カタログ全体の SSR HTML rendering / hydration を保証しません。SSR を採用するアプリは自分の server bundle と hydration を別に検証します。

compile、生成一致、純モデル、native 操作、axe、視覚・意味レビューを分けて記録します。独立 consumer の strictTemplates 成功や全カテゴリの import 成功は、全 181 部品の全状態を実操作で確認したという意味ではありません。axe の incomplete は手動確認を要する観測として残します。実 screen reader、OS IME/touch、Firefox/Safari、業務 backend と利用者理解は、利用アプリの条件に合わせて確認してください。
