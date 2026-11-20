# Tree・階層選択・組織図の利用契約

[English](ui-library-tree-expansion-spec.en.md)

Tree、TreeItem、TreeSelect、Cascader、OrganizationChartと型付きTreeNodeTemplateの公開APIを説明します。生成先の`angular/index.ts`から必要なstandalone部品をimportします。設定変更後は利用アプリで`sync`・`check`を行い、生成物は手編集しません。

Tree系の追加runtime packageはありません。公開入口が参照する共通依存は[利用ガイド](ui-library-consumer-guide.ja.md#依存関係)、日程の依存は[Scheduler契約](ui-library-scheduler-expansion-spec.ja.md#依存)を参照してください。

## 共通モデル・raw ID・型付き内容

`TreeNode<T>` はreadonlyな `id: string`、`label: string` と、省略可能な `description: string`、`data: T`、`children: readonly TreeNode<T>[]`、`hasChildren: boolean`、`disabled: boolean`、`selectable: boolean`、`checkable: boolean` を持つ。IDは階層全体で一意な空白を含まない非空文字列、labelは非空の表示文言とする。循環・深さ100超・ノード数10,000超・重複IDなどの構造違反は例外になる。有限階層を描画する契約であり、大規模データを採用するアプリは件数・取得単位を設計する。

`children === undefined && hasChildren === true` は未取得、`children: []` は取得済み空である。未取得・空・無効・削除済み選択を区別する。祖先のdisabledは子へ継承する。未知IDを受け取っても選択値を勝手に削除せず、検証結果と未取得・削除済みの表示を残す。

選択・経路・load要求には元のIDを完全一致で用いる。受理可能なUTF-16文字列には単独surrogateも含まれる。内部DOM IDは通常のURI符号化と、単独surrogate用の `%u` 名前空間で区別し、元IDへ上書きしない。[ECMAScriptのURI Encode規則](https://tc39.es/ecma262/multipage/global-object.html#sec-encode)では単独surrogateをそのまま符号化できないため、この境界を内部で処理する。DOM tokenは送信キーではない。native `FormData` は文字列をUnicode scalar値へ変換するため、単独surrogateの通信往復までを保証する契約ではない。

`TreeEntry<T>` は `node: TreeNode<T>`、`path: readonly string[]`（自身を含むrootからのID経路）、`parentId: string | null`、`level: number`、継承済み `disabled: boolean`、`position: number`、`setSize: number`。`TreeCheckState` は `'true' | 'false' | 'mixed'`。

`TreeNodeTemplate<T>` のselectorは `ng-template[uiTreeNodeTemplate]`。必須input `[uiTreeNodeTemplate]="nodes"` に型付き配列を渡す。`TreeNodeContext<T>` は `$implicit` / `node: TreeNode<T>`、`path: readonly string[]`、`level: number`、`expanded: boolean`、`selected: boolean`、`checkState: TreeCheckState`。Tree、TreeSelect、OrganizationChartへ投影でき、strictTemplatesで `data` の型を推論する。投影したbutton/link/inputと業務フォームはアプリが所有する。

## Tree / TreeItem

`Tree<T>`（`ui-tree`）は必須input `treeId: string`、`label: string` を持つ。IDはページ内で一意にする。

| inputs | 型・初期値 |
| --- | --- |
| `nodes` | `readonly TreeNode<T>[] = []` |
| `expandedIds` / `selectedIds` / `checkedIds` | 各 `readonly string[] = []` |
| `selectionMode` | `TreeSelectionMode = 'none' | 'single' | 'multiple'`、初期値 `'single'` |
| `checkable` / `linkChecks` | `boolean = false` / `boolean = true` |
| `selectionLabel` / `checkLabel` | 省略可能なstring。省略時は共通messageの表示文言 |
| `disabled` / `busy` / `readonly` | 各 `boolean = false` |
| `query` / `locale` | `string = ''` / 省略時はlocale provider |

outputsは `expandedIdsChange`、`selectedIdsChange`、`checkedIdsChange`（各 `readonly string[]`）、`activated: TreeNode<T>`、`loadRequested: TreeLoadRequest`、`loadCancelled: TreeLoadCancellation`、`focusLeft: void`。アプリが必要なoutputを状態へ反映する。選択とチェックは別の状態である。readonlyでは選択・チェックを変更できず、階層の展開はできる。disabled/busyは組込み操作と新しいload要求を止める。

公開メソッドは `focusFirst(): void`、`resolveLoad(requestId: number, children: readonly TreeNode<T>[]): boolean`、`failLoad(requestId: number, message: string): boolean`、`invalidateLoads(reason: TreeLoadCancellation['reason'] = 'invalidate'): void`。`resolvedNodes` は取得済みchildrenを統合したreadonly配列のcomputed signal。

`linkChecks=true` では取得済み・有効・checkableな親子を連動する。親の復元値と子の復元値を同じ連動意味で扱う。未取得の子がある親を「すべて取得済みで選択」と偽らず、mixed・取得要求・説明に接続する。`linkChecks=false` は独立チェック。検索はlabel/descriptionをNFKCとlocaleで照合し、該当ノードの祖先を残す。未取得の子を検索結果として生成せず、元nodesや選択値を変更しない。

`TreeItem` はnative `li[uiTreeItem]` のstandalone directive。必須 `uiTreeItem: TreeEntry` と `itemExpanded: boolean | null = null`、`itemDisabled=false`、`itemSelected: boolean | null = null`、`itemChecked: TreeCheckState | null = null`、`itemBusy=false`、`itemTabIndex=-1` を受ける。treeitem role、level、posinset、setsize、expanded/selected/checked/busy/disabledを接続する。独立したoutputは持たず、これだけで階層操作のcontrollerにはならない。

## TreeSelect / CascaderとCVA

両部品は[Angular ControlValueAccessor](https://angular.dev/api/forms/ControlValueAccessor)とValidatorを実装し、値は常に `readonly string[]`。TreeSelectの単一選択でも配列である。CVAのnull/non-array resetは `[]`、配列中のstring以外は除外する。未知・重複したstring IDは説明と検証のため保持する。FormControlのdisabledとcomponentのdisabledを合わせて扱う。`[value]` が与えられていればCVA内部値より優先するため、値の管理方式をアプリで統一する。

| 共通inputs / output | 型・初期値 |
| --- | --- |
| `controlId` / `label` | 必須string。controlIdはページ内で一意 |
| `hint` / `error` | `string | null = null`。アプリの説明・errorをそのまま表示 |
| `required` / `disabled` / `busy` / `readonly` | 各 `boolean = false` |
| `value` / `valueChange` | 省略可能な `readonly string[]` input / 同型output |
| `name` / `labelPosition` | `string = ''` / `'inherit' | 'above' | 'inline' = 'inherit'` |
| `placement` | `OverlayPlacement = 'bottom-start'` |
| `locale` | 省略時は共通locale provider |

`OverlayPlacement` は `'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'right-start' | 'left-start'`。`name` を指定すると同名hidden inputで各raw IDを送信する。Cascaderでは経路順を保つ。enabled/busyの値は残り、disabledの値はnativeフォーム送信から外れる。HTTP、送信値の認可、必須業務条件、保存成功はアプリが所有する。

`TreeSelect<T>`（`ui-tree-select`）は `nodes: readonly TreeNode<T>[] = []`、`multiple=false`、`linkSelection=true`、`searchable=true`、省略可能な `placeholder: string` を加える。`loadRequested` / `loadCancelled` と `resolvedNodes` を公開し、`resolveLoad(requestId, children): boolean`、`failLoad(requestId, message): boolean`、**`invalidateLoads(): void`** を持つ。複数選択でlinkSelectionを有効にすると親子を連動し、chipの除去も同じルールを使う。単一選択は最大1件。Validatorは `{required: true}` または `{treeSelection: 'cardinality' | 'unknown' | 'disabled' | 'unselectable' | 'incomplete' | 'duplicate'}` を返す。

検索draftは選択値と分離する。Escape・再open・profile/locale変更で検索文字を保持し、CVA `writeValue` / 明示クリアで検索をresetする。searchableをOFFにして自身の検索inputが消える場合はTreeへfocusを移す。readonly/busy/disabledで編集を抑止しても、復元した不正値やerrorの説明を消さない。

`Cascader<T>`（`ui-cascader`）は `nodes: readonly TreeNode<T>[] = []`、`allowIntermediate=false`、省略可能な `placeholder: string` を加える。値はrootから選択地点までのraw ID配列。native列ボタンで辿る候補draftと、確定済みCVA値は分離する。`allowIntermediate=true` なら途中の親を確定できる。親への復帰、候補の取得、確定、クリアを明示操作で行う。Escape取消は候補をcommitしない。open時は確定値からdraftを作る。

Cascaderのoutputsは `loadRequested` / `loadCancelled`、公開signalは `resolvedNodes`。メソッドは `resolveLoad(requestId, children): boolean`、`failLoad(requestId, message): boolean`、`invalidateLoads(reason: TreeLoadCancellation['reason'] = 'invalidate'): void`。Validatorは `{required: true}` または `{cascader: 'path' | 'disabled' | 'unselectable' | 'intermediate'}`。候補・祖先がすべて除去された場合も、有効な閉じる操作を残す。

## 遅延取得・失効・復旧

`TreeLoadRequest` はreadonly `nodeId: string`、`path: readonly string[]`、`requestId: number`。`TreeLoadCancellation` は同じフィールドに `reason: 'collapse' | 'source-change' | 'reset' | 'invalidate' | 'destroy' | 'close'` を加える。requestIdは同じmodule内の部品instanceを跨いで進む。永続IDや別bundle間の一意性ではない。

アプリは要求を発行した同じhostの `resolveLoad` / `failLoad` を呼び、booleanで受理を確認する。一致する未完了要求だけを受理し、retryは新IDを使う。不正childrenはcommit前に検証する。failには空白だけでない利用者向けmessageを渡す。失敗は該当枝へ表示し、他の枝・選択・入力を残して再試行できる。

Tree/Cascaderのnodes参照の差替えは取得cacheと旧要求を失効させる。折畳みで隠れた枝、popup終了、reset、明示invalidateでも該当要求を失効する。destroy後の応答は拒否し、破棄時のcancel outputは送らない。UIのcancelは通信取消の成功を表さず、I/O取消・重複更新防止はアプリが実施する。

親signalの変更と旧応答を同じturnで処理する場合は、render後の自動検出を待たず **hostの `invalidateLoads()` を先に呼び、その後nodesを変更する**。閉じたpopupのhostへ届く遅延応答も受理結果を確認する。OrganizationChartにはload要求・resolveメソッドを設けず、アプリが取得したnodesを渡す。

## キーボード・popup終了・focus

Treeは[APG Tree View](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)に沿ってtreeitemへroving focusを置く。上下、Home/End、展開/親への論理左右、Enter選択、Spaceチェック（checkableでなければ選択）、700msのlocale対応typeaheadを扱う。RTLは展開/親への左右を反転する。投影したnative input/button/link上のキーとIMEを尊重する。扱ったAPGキー・一致したtypeaheadだけを消費し、Tree自体で扱わないEscape・Tab・不一致文字は親/nativeへ届く。

TreeSelect/Cascaderはnative comboboxからmanual popover内の非modal dialogを開く。ArrowDown/ArrowUp/Enter/Spaceで開き、子popupのEscapeはcomboboxへ戻す。次のEscapeは親native dialogへ届く。Tab/outsideは移動先のfocusを保ち、blur/touchedへ接続する。内部 `OverlayCloseReason` は `'escape' | 'outside' | 'scope-exit'`。これは共有overlayの終了理由であり、両CVA部品のpublic `closed` / `openChange` outputを追加する契約ではない。

折畳み・候補除去・hidden/disabled化で所有focusが消える際は、可視祖先、Treeの有効項目、状態/閉じる操作へ回復する。外部へ既に移ったfocusを奪わない。Cascaderはraw属性の完全一致で候補を照合し、UTF-16をCSS selectorに変換して別IDへ置換しない。

## OrganizationChart

`OrganizationChart<T>`（`ui-organization-chart`）の必須inputsは `chartId: string`、`label: string`。`nodes: readonly TreeNode<T>[] = []`、`expandedIds: readonly string[] = []`、`disabled=false`、`busy=false` と、`direction: OrganizationDirection = 'top-down'` を受ける。方向は `'top-down' | 'bottom-up' | 'left-right' | 'right-left'`。outputは `expandedIdsChange: readonly string[]`。

親子関係はnative nested list、展開操作はnative button、線は装飾CSSで表す。方向は視覚配置を変え、DOMの親子順と読み順を維持する。TreeNodeTemplateでノード内容と業務フォームを投影し、展開変更はhiddenで入力DOMを保つ。contextのselectedはfalse、checkStateは `'false'`。自身の隠れたfocusは可視祖先の展開button/viewportへ戻し、外部focusを保持する。方向入力と文章のRTLは別に扱い、ancestorのdir変更にも追従する。locale input、CVA、readonly、load outputは持たない。

## プロファイル・言語・検証

見た目は[設計](design.md)の二段階トークンの役割契約に従う。YAMLの `default_profile` / `profiles` と `data-ui-profile="ID"` で全semantic対応を切り替える。font.body/code、text、leading、weight、space、size、color、border、radiusを用途ごとに接続し、プリミティブを部品へ直接書かない。共通motion.duration/easingも正本のsemantic役割であり、独自の固定animation値を追加しない。文字・余白・操作寸法をguided/denseで変え、選択・取得・投影フォーム・focusを作り直さない。popupはlogical CSSと自身のscroll領域を使い、320px/文字200%でも必須操作を残す。reduced motionではsmooth scrollを抑止する。

公開 `provideUiLocale` / `[uiLocale]` (`UiLocaleScope`) はlocale、translate、directionなどをscopeへ供給する。明示component localeはproviderより優先する。既定localeは生成時の `default_language` に従い、英語は `en-US`、日本語と項目のない既存YAMLは `ja-JP`。directionは未指定ならアプリのdirを継承する。UiLocaleScopeはnative lang/dirと公開CDK Directionalityを接続し、アプリの明示Dirや外部属性を尊重して自身の所有属性だけを復元する。辞書が変えるのはライブラリ文言であり、raw ID、label、description、app errorを翻訳・置換しない。

公開純関数は `treeNodes`、`treeBranch`、`treeUnloaded`、`treeEntries`、`treeEntry`、`treePath`、`treeFilter`、`treeVisible`、`treeComplete`、`treeCheckState`、`treeToggleCheck`、`treeSelectionProblem`、`cascaderPathProblem`。DOM符号化・load内部状態のhelperや共有popup baseをconsumerへ公開するものではない。

実支援技術、全ブラウザー、SSR/hydration、業務保存・Undoは利用アプリの採用構成で確認してください。
