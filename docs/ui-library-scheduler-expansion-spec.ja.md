# Scheduler / Agendaの利用契約

2026-10-06の統合候補を対象とする。公開名は生成先 `angular/index.ts` と一致する。SchedulerControllerのSHA-256は `4f8c5855858ccc66967c51002ff4cc09cc068591cbdd00fcd59eef6a30948b2c`、public indexは `c06b42cf58885d81a0a5fd44e2fa99213efb3c7946679d2f82d46464fa3fb218`。入力・出力と表示用型を公開する部品は `Scheduler` / `Agenda` で、内部Controllerをconsumerからimportする契約ではない。[証拠一覧](verification/ui-library-tree-scheduler-contract/contract-evidence.json)に全対象SHA、lock、正式試験・独立実測を保存する。

## 要求と表示

[matrix](ui-library-matrix.json) `dates-07` と[要求](ui-library-request.ja.md)90行の制御項目「日・週・月・一覧表示、予定、リソース、時間帯、予定移動」を対象とする。`foundation-08` は言語・日付書式・RTL、`foundation-09` はプロファイル適用を共有する。matrixの状態更新と、この仕様のAPI説明は別の作業である。

`Scheduler<T>`（`ui-scheduler`）はnative selectで `day` / `week` / `month` / `list` を切り替える。日1セル、週7セル、月6週の42 civil日セルを基本にし、月外の隣接日も表示する。`Agenda<T>`（`ui-agenda`）はlist固定で、view input/切替selectを持たない。日付範囲境界では有効civil日だけを残す。両部品に表示日input、前後の期間移動、資源filter、移動editorを備える。

day/week/monthは日セル内のchronologicalな予定カード、listはchronologicalな予定一覧である。複数日に跨る予定本体は最初に見える日へ置き、後続日へ件数と継続予定名を出す。リソースは複数割当・表示filter・移動先に用いる。時間帯は実instantの表示filterである。hour軸への自由配置やpointer dragによる移動をpublic APIとして表すものではなく、native日時input・resource選択・実行buttonで予定移動を要求する。

## inputs / outputs

両部品の必須inputsは `schedulerId: string`、`label: string`、`date: string`。schedulerIdはページ内で一意な空白を含まない非空ID、labelは非空。dateは `0001`〜`9999` の有効civil ISO日付 `YYYY-MM-DD` とする。

| 共通inputs | 型・初期値 |
| --- | --- |
| `events` / `resources` | `readonly SchedulerEvent<T>[] = []` / `readonly SchedulerResource[] = []` |
| `locale` / `timeZone` | 省略可能なstring。component明示値 → locale provider。zone未設定は診断 |
| `civilDateOptions` / `dateTimeOptions` | 省略可能な `Intl.DateTimeFormatOptions`。省略時はprovider |
| `weekStartsOn` | integer `0..6`（日曜0）、初期値1 |
| `listDays` | integer `1..366`、初期値31 |
| `dayStart` / `dayEnd` | `string = '00:00'` / `string = '24:00'` |
| `resourceFilter` / `showUnassigned` | `readonly string[] | null = null` / `boolean = true` |
| `disabled` / `busy` / `readonly` | 各 `boolean = false` |
| `movable` | `boolean = true` |
| `canMove` | `((request: SchedulerMoveRequest<T>) => boolean) | null = null` |

Schedulerだけが `view: SchedulerView = 'week'` inputを持つ。`SchedulerView` は `'day' | 'week' | 'month' | 'list'`。outputsは `dateChange: string`、`viewChange: SchedulerView`、`resourceFilterChange: readonly string[] | null`、`moveRequested: SchedulerMoveRequest<T>`、`moveCancelled: SchedulerMoveCancellation`。Agendaも共通output型を継承するが、viewを変更する操作は提供しない。アプリが必要な表示outputを状態へ反映する。

readonlyは移動を抑止し、日付・view・resourceの閲覧操作を残す。disabled/busyは組込み操作を止める。`movable=false`、event.disabled、無効resource、canMoveのfalse/例外で移動を許可しない。指定したcanMoveは同期・純粋で、trueだけを許可する。部品が繰り返し評価するためI/Oや副作用を入れず、業務認可はサーバーでもアプリが保証する。

Schedulerのeventsはアプリ所有のcollectionでありCVA値ではない。入力を置く場合は型付きtemplate内のアプリFormControlへ接続し、そのdisabled/reset/保存をアプリが管理する。安定event IDを使うとview/date/filter/profile変更で投影入力DOMと値を保つ。eventをcollectionから除去した場合は該当DOMを除去する。

## イベント・表示context

`SchedulerEvent<T>` はreadonly `id: string`、`title: string`、`start: string`、`end: string`、省略可能な `resourceIds: readonly string[]`、`disabled: boolean`、`data: T`。start/endはoffset付きISO timestamp、endは排他的でstartより後。実装はmillisecond精度のinstantとして判定する。civil終日予定は別モデルとしてアプリが設計し、この型にallDay flagを追加したものとして扱わない。

`SchedulerResource` はreadonly `id: string`、`label: string`、省略可能な `disabled: boolean`。event/resource IDは各collectionで一意な空白なしの非空文字列、title/labelは非空。identity違反は例外とする。日時不正、逆転、未知/重複resourceは元eventを保持し、診断付きで表示する。正常設定下ではfilterで不正eventを黙って隠さない。構成自体が不正な場合は全体診断を出し、予定データを捏造しない。

`resourceFilter=null` は全資源、配列は指定資源のいずれかとの交差で判定する。`[]` は割当済み予定を対象にしない。未割当予定は `showUnassigned` で独立に決める。disabled resourceも閲覧filterへ使えるが、移動先には選べない。

`SchedulerEventTemplate<T>` のselectorは `ng-template[uiSchedulerEvent]`。必須 `[uiSchedulerEvent]="events"` でgenericを推論する。`SchedulerEventContext<T>` は `$implicit` / `event: SchedulerEvent<T>`、`entry: SchedulerEntry<T>`、`pending: boolean`。

| 公開表示型 | フィールド |
| --- | --- |
| `SchedulerLocal` | `date: string`、`time: string`、`dateTime: string`、`offsetSeconds: number` |
| `SchedulerEntry<T>` | `event`、`visible: boolean`、`column/row: number`、`startLocal/endLocal: SchedulerLocal | null`、`startText/endText/resourceText: string`、`problem: string | null`、`offsetChange: boolean`、`days: readonly string[]` |
| `SchedulerDay` | `date/label: string`、`column/row: number`、`inMonth: boolean`、`count: number`、`continuing: readonly string[]`（継続予定名） |
| `SchedulerConfiguration` | `date`、`view`、`weekStartsOn`、`listDays`、`locale`、`timeZone`、`dayStart`、`dayEnd`、`resourceFilter`、`showUnassigned`、省略可能な `civilDateOptions/dateTimeOptions` |

公開純関数は `schedulerInstant`、`schedulerLocal`、`schedulerDays`、`schedulerNavigate`、`schedulerConfigurationProblem`、`schedulerEventProblem`、`schedulerMoveProblem`、`schedulerLayout`。`schedulerLayout` は `{days: readonly SchedulerDay[], entries: readonly SchedulerEntry<T>[], columns: number, problem: string | null}` を返す。内部snapshot・timeband構築・request採番helperはpublic barrelのAPIではない。

## civil日・時間帯・zone・DST

表示zoneは `Intl` と `Temporal` が解決できる明示値（例 `America/New_York`、`UTC`）を必要とする。`[timeZone]` → providerのtimeZone → 未設定の診断の順で、ブラウザーzoneを暗黙に補わない。locale/date書式の変更は表示を変え、元start/endとraw IDを変更しない。月移動は月末を有効日へclampし、日/週/listはcivil日数で進む。

dayStart/dayEndは同一civil日の半開区間 `[start, end)`。`HH:mm[:ss]`、`24:00` はendだけに許可し、end > startを必要とする。夜を跨ぐ帯は別日に分ける。予定の `[startInstant, endInstant)` と帯instant区間に正の長さの交差がある日だけを所属日にする。端点が触れるだけなら所属しない。

帯は各日でzone offsetの遷移境界を列挙して一定offset区間に分割する。[Temporalの公開遷移API](https://tc39.es/proposal-temporal/docs/zoneddatetime.html)を用い、常に24時間のcivil日、一律1時間のDST、最初のmidnight二つだけによる境界を仮定しない。Gap内の帯にはinstantがなく、fold内の帯は早い/遅い両区間を含む一方、間にある帯外instantは除外する。Lord Howeの30分変化、Apiaの全日skip、St Johnsの深夜foldを扱う。skipされたcivil日は格子に残して件数0とする。長期event全秒の走査やサンプリングではなく、表示日単位の遷移区間との交差で判定する。

既知instantの表示と、まだinstantでない移動入力を分ける。表示時は明示zoneのoffset/DST変更を説明し、移動入力を部品が自動的にinstantへ確定しない。

## 移動要求・ack・失敗と入力保持

`SchedulerDisambiguation` は `'reject' | 'earlier' | 'later'`。`SchedulerMoveDraft` はreadonly `localStart/localEnd: string`（zoneなしのnative datetime-local値）、`timeZone: string`、`startDisambiguation/endDisambiguation: SchedulerDisambiguation`、`resourceIds: readonly string[]`。構文・zone・有効resourceをUIで検証し、不完全なnative badInputは別に保持する。DST gapやwall時刻上の逆転をUIだけで解決したことにせず、アプリへ曖昧性指定とともに送る。

`SchedulerMoveRequest<T>` はreadonly `requestId: number`、`event: SchedulerEvent<T>`、`previous: {start: string, end: string, resourceIds: readonly string[]}`、`target: SchedulerMoveDraft`。同時に保留する要求はhostにつき1件。module内で進むrequest IDは同じhostの未完了要求へのackに使い、永続/別bundle IDとしない。

公開メソッドは以下。組込みnative操作で開くeditorの内部open/closeを、新しいpublicメソッドとして扱わない。

| メソッド | 受理・結果 |
| --- | --- |
| `completeMove(requestId: number): boolean` | 現在の要求とsnapshotが一致するとackを受理し、完了説明とeditor終了を行う |
| `failMove(requestId: number, message: string): boolean` | 一致時に保留を解き、errorとdraftを残す。空messageには既定説明 |
| `invalidatePending(reason: SchedulerMoveCancellation['reason'] = 'invalidate'): void` | 保留を失効し、draftと失効説明を残す |
| `resetMoves(): void` | 保留をreset失効し、全editor/draftとfocus復帰予約を初期化する |

アプリはmoveRequestedを受けて、権限・競合・DST不存在/重複・instant順序を判断し、実保存を行う。成功時は **同じhostへ `completeMove(id)` を先に呼び、trueを確認してから保存済みeventsを反映する**。eventsを先に差し替えて旧snapshotのackを有効にする手順ではない。falseの応答をUI成功にせず、既に成立したbackend更新の再取得などはアプリが別に解決する。失敗時はfailMoveで入力を残し、再試行は新しいrequest IDを使う。実通信取消、冪等性、Undo、保存の再試行可否もアプリの責任である。

保留snapshotはeventのid/title/start/end/resourceIds/disabled、resourcesのid/label/disabled、実効表示zone、canMoveの関数identityと再評価結果を比較する。opaqueな `data: T` の内容までは比較しない。event除去やこれらの変更、movable OFF/readonly ONは旧要求を失効させる。view/date/filter/profile/locale表示の変更だけを自動的な保存取消としない。busy/disabledはUI操作を抑止し、アプリのackを代行しない。

`SchedulerMoveCancellation` はreadonly `requestId: number`、`eventId: string`、`reason: 'source-change' | 'configuration-change' | 'reset' | 'invalidate' | 'destroy'`。configuration-changeは必要なアプリworkflowから明示指定できる理由で、date/view/filter変更で必ず自動送出されるという意味ではない。destroy後の応答は拒否し、破棄時のcancel outputは送らない。

同じturnの親signal差替えと旧応答を混在させる場合は **`invalidatePending()` を先に呼んでから親状態を更新する**。render後のeffectが未反映の親状態を先読みすると仮定しない。元eventが変わってdraft snapshotが古い場合も入力を残して説明し、nativeのreset操作で現在eventから作り直せる。成功ackだけでeventsを書換えず、アプリが保存済みデータを渡す。

## raw ID・focus・狭い画面

event/resource/requestのIDはraw値を保持する。内部DOM IDはTreeと共通のUTF-16安全なtokenに加え、ID内のhyphenを `%2D` として区切りと分離する。合法な `x` / `preview-x`、`fold` / `fold-fold`、単独surrogateが同時にある場合もinput/preview/曖昧性selectのIDを分離し、native labelとaria-describedbyを同じeventへ接続する。内部tokenを業務IDやwire formatへ流用しない。native FormDataの単独surrogate scalar変換までをlosslessと宣言しない。

editorのEscape/閉じる/完了は、自身が所有しているfocusだけを移動開始buttonへ戻す。閉じる操作の同じturnでアプリが外部buttonや投影memoへfocusを移した場合、その新しいfocusを保つ。renderまでに再openしたeditorへ古い復帰を適用せず、reset/destroyで復帰予約を消す。event除去・非表示・組込み操作のdisabled化で所有focusが消えた場合は部品の状態説明へ退避する。保留中の同じeventのEscapeでは要求を勝手に取消してeditorを閉じない。投影inputのキー・IMEを横取りしない。

見た目は[設計](design.md)と `src/roles.ts` の役割契約に従い、YAML `default_profile` / `profiles` と `data-ui-profile="ID"` で切り替える。font.body/code、text/leading/weight、space/size、color/border/radiusをsemantic経由で使う。共通motion.duration/easingも正本のsemantic役割であり、独自の固定animation値を追加しない。guided/dense変更で未確定日時・error・保留要求・投影CVA入力を保持する。logical CSSと自身のscroll領域を使い、320px/文字200%では日時native editorの内部scrollに加えて全文previewを残す。技術的な日時値のeditor/previewは局所LTR、周囲の説明・button/resourceはscopeのRTLに従う。reduced motionでsmooth scrollを抑止する。

公開 `provideUiLocale` / `[uiLocale]` (`UiLocaleScope`) はlocale、messages、timeZone、date options、directionを供給する。明示component propが優先する。既定localeはja-JP、timeZoneは未指定、directionはアプリのdirを継承する。UiLocaleScopeはnative lang/dirと公開CDK Directionalityへ接続し、明示Dir・外部属性を尊重する。辞書はライブラリ文言だけを変え、event.title/data/raw IDsとapp errorは変えない。

## 依存と成熟候補の判断

設定・templateを直し `npm run ui:sync` → `npm run ui:check` を行い、生成先のAngular public barrelとtokens.cssを利用する。検証したAngular/CDKは `22.2.1`、RxJSは `7.8.2`。生成ソースはpackage manager設定を自動配布するものではない。利用アプリは **runtime依存 `temporal-polyfill: "1.0.5"`** を自身のpackage/lockへ宣言する。root検証用devDependenciesが利用アプリへ自動的に導入されるとは扱わない。consumerの正規install・strict AOT・browser buildでも依存を解決する。

| 対象 | 判断と根拠 |
| --- | --- |
| FullCalendar Angular `7.1.0` | [固定版の公式package](https://raw.githubusercontent.com/fullcalendar/fullcalendar/v7.1.0/packages/angular/package.json)はAngular common/core 16–22をpeerに持ち、[connectorのMIT原文](https://raw.githubusercontent.com/fullcalendar/fullcalendar/v7.1.0/packages/angular/LICENSE.txt)と[公式eventDrop](https://fullcalendar.io/docs/eventDrop)のoldEvent/revert等を比較した。成熟候補として残す。resource timeline/vertical resource等は[別のpremium license](https://fullcalendar.io/docs/premium)であり、今回の依存・利用権として含めない。 |
| 今回のnative部品 | 既存Angular/native HTML/Intl/civil modelとtyped projected DOMを使い、全要求のview・resource・band・native移動を接続する。FullCalendarの採用にはtheme、typed slot/DOM保持、native keyboard代替、業務DTO/ackとlicense範囲を別に検証する。FullCalendarをインストールした実装ではない。 |
| Temporal `1.0.5` | 厳密なzone遷移帯の判定に `import {Temporal} from 'temporal-polyfill'` を採用。[公式entrypoint説明](https://raw.githubusercontent.com/fullcalendar/temporal-polyfill/main/polyfill/README.md)の局所・副作用なしimportを用い、native Temporalがあればその実装を使う。製品sourceでglobals/shim/private chunksをimportしない。[1.0.5 CHANGELOG](https://raw.githubusercontent.com/fullcalendar/temporal-polyfill/main/polyfill/CHANGELOG.md)のepoch `0n` 遷移の修正を確認した。移動draftのinstant確定はアプリへ残す。 |

固定 `package-lock.json` SHA-256は `ccfffbff59251d7429b58872f94c11746b72cce2cd624696d3de29e240448d7e`。実installed packageと原LICENSE、公開型、bundle import閉包を照合した依存は以下。[lock/installed/license証拠](verification/ui-library-tree-scheduler-contract/contract-evidence.json)は元auditとの一致も保持する。

| package | 版 | 原license | 役割 |
| --- | --- | --- | --- |
| `temporal-polyfill` | `1.0.5` | MIT | 公開Temporal runtime entrypoint |
| `temporal-utils` | `1.0.3` | MIT | runtime依存 |
| `temporal-spec` | `1.0.1` | Apache-2.0 | 公開TypeScript型 |

配布する利用アプリはこれらのlicense/noticeを元packageの条件に従って保持する。固定lockの `npm ci --ignore-scripts` はactual exit0・219 added/220 audited・当時のnpm DBでvulnerabilities0。これを将来の脆弱性、runtime安全性、全第三者license義務の包括承認には広げない。

## 正式試験と実測の境界

| 正式試験 | 対象 |
| --- | --- |
| [scheduler model](../tests/model/scheduler.test.ts) | instant、zone、civil navigation、resource/timeband、DST、move入力検証 |
| [Scheduler browser](../tests/ui/scheduler-catalog.spec.ts) | 全view/継続予定、native移動、失敗/再試行/stale/reset/destroy、投影CVA、band/zone、host Temporalと1.0.5強制fallback、320px/200%/RTL/axe |
| [focus transfer](../tests/ui/scheduler-focus-transfer.spec.ts) | close/completeと同じturnの外部・投影memo focus移動 |
| [ID boundaries](../tests/ui/scheduler-id-boundaries.spec.ts) | raw UTF-16、prefix/suffix境界、DOM一意性、native label/ARIA参照、移動要求raw IDs |
| [Foundation browser](../tests/ui/foundation.spec.ts) | provider/明示prop、zone診断、locale/RTL/CDK Dir、live profileとdraft保持 |
| [consumer AOT](../tests/generation/consumer.test.ts) | public barrelから生成部品を使うstrictTemplates/negative型検査 |

独立reviewの実測はTree/Scheduler/Locale合計42/42 native（Scheduler focus8、UTF-16 2、prefix/fold2、Locale6、Tree Escape16、旧不具合8）、モデル16＋locale/server DI5。94 supporting TSのscoped strict AOTはpositive exit0、typed contextのnegative4件は期待するTS2339/exit1。pageerror/console warning/errorは0。axe24 scansのviolationsは0、incompleteはaria-valid-attr-value16 nodes/color-contrast50 nodesを残す。正式試験ファイルの参照とこの独立reviewの実行scopeを区別し、全181部品/full139 AOT、実AT、Firefox/Safari、全component SSR/hydration、実保存/DST確定/Undoを検証済みとはしない。
