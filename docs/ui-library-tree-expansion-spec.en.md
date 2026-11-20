# Tree, hierarchical selection and organization-chart contracts

[Japanese](ui-library-tree-expansion-spec.ja.md)

Public APIs for Tree, TreeItem, TreeSelect, Cascader, OrganizationChart and typed TreeNodeTemplate. Import needed standalone components from generated `angular/index.ts`. Run sync/check in the consumer after configuration changes; do not hand-edit output.

Trees add no runtime package. Resolve the public barrel's [shared dependencies](ui-library-consumer-guide.en.md#application-dependencies); see [Scheduler dependencies](ui-library-scheduler-expansion-spec.en.md#dependencies) for scheduling.

## Shared model, raw IDs and typed content

Readonly `TreeNode<T>` has `id: string`, `label: string`, and optional `description: string`, `data: T`, `children: readonly TreeNode<T>[]`, `hasChildren: boolean`, `disabled: boolean`, `selectable: boolean`, `checkable: boolean`. IDs are nonempty whitespace-free strings unique across the hierarchy; labels are nonempty display text. Cycles, depth above100, more than10,000 nodes and duplicate IDs throw structural errors. The contract renders finite hierarchies; the app designs counts/fetch units for large data.

`children === undefined && hasChildren === true` means unfetched; `children: []` means fetched and empty. Distinguish unfetched/empty/disabled/deleted selections. Ancestor disabled propagates to descendants. Unknown selected IDs are not silently deleted; retain validation and unfetched/deleted explanations.

Selection/paths/load requests use exact raw IDs. Accepted UTF-16 can include lone surrogates. Internal DOM IDs distinguish normal URI encoding from a `%u` namespace for lone surrogates; they never overwrite raw IDs. [ECMAScript URI encoding](https://tc39.es/ecma262/multipage/global-object.html#sec-encode) cannot directly encode lone surrogates, so the boundary is handled internally. DOM tokens are not submission keys. Native FormData converts strings to Unicode scalar values; lone-surrogate network round trips are not guaranteed.

`TreeEntry<T>` contains `node: TreeNode<T>`, `path: readonly string[]` (root-to-self IDs), `parentId: string | null`, `level: number`, inherited `disabled: boolean`, `position: number`, `setSize: number`. `TreeCheckState` is `'true' | 'false' | 'mixed'`.

`TreeNodeTemplate<T>` selects `ng-template[uiTreeNodeTemplate]`. Supply a typed array to required `[uiTreeNodeTemplate]="nodes"`. `TreeNodeContext<T>` has `$implicit`/`node: TreeNode<T>`, `path: readonly string[]`, `level: number`, `expanded: boolean`, `selected: boolean`, `checkState: TreeCheckState`. It projects into Tree/TreeSelect/OrganizationChart and strictTemplates infers data types. Projected buttons/links/inputs/business forms are app-owned.

## Tree / TreeItem

`Tree<T>` (`ui-tree`) requires `treeId: string` and `label: string`. IDs are unique per page.

| Inputs | Types/defaults |
| --- | --- |
| `nodes` | `readonly TreeNode<T>[] = []` |
| `expandedIds` / `selectedIds` / `checkedIds` | Each `readonly string[] = []` |
| `selectionMode` | `TreeSelectionMode = 'none' | 'single' | 'multiple'`; default `'single'` |
| `checkable` / `linkChecks` | `boolean = false` / `boolean = true` |
| `selectionLabel` / `checkLabel` | Optional string; omitted values use shared messages |
| `disabled` / `busy` / `readonly` | Each `boolean = false` |
| `query` / `locale` | `string = ''` / shared provider if omitted |

Outputs: `expandedIdsChange`, `selectedIdsChange`, `checkedIdsChange` (each `readonly string[]`), `activated: TreeNode<T>`, `loadRequested: TreeLoadRequest`, `loadCancelled: TreeLoadCancellation`, `focusLeft: void`. The app adopts needed outputs. Selection and checking are separate states. Read-only blocks changing them but allows expansion. Disabled/busy stop built-in actions and new loads.

Public methods: `focusFirst(): void`, `resolveLoad(requestId: number, children: readonly TreeNode<T>[]): boolean`, `failLoad(requestId: number, message: string): boolean`, `invalidateLoads(reason: TreeLoadCancellation['reason'] = 'invalidate'): void`. `resolvedNodes` is a computed readonly array including loaded children.

With `linkChecks=true`, loaded/enabled/checkable parents/children are linked. Restored parent/child values use the same linking semantics. A parent with unfetched children is not falsely shown as completely fetched/selected; connect mixed state, loading intent and explanations. False means independent checks. Search matches label/description using NFKC/locale and retains matching-node ancestors. It does not invent unfetched search results or change source nodes/selections.

`TreeItem` is standalone native `li[uiTreeItem]`. Inputs: required `uiTreeItem: TreeEntry`, `itemExpanded: boolean | null = null`, `itemDisabled=false`, `itemSelected: boolean | null = null`, `itemChecked: TreeCheckState | null = null`, `itemBusy=false`, `itemTabIndex=-1`. It connects treeitem role/level/posinset/setsize/expanded/selected/checked/busy/disabled, has no independent outputs, and is not a hierarchy controller by itself.

## TreeSelect / Cascader and CVA

Both implement [ControlValueAccessor](https://angular.dev/api/forms/ControlValueAccessor)/Validator and always use `readonly string[]`, including single-select TreeSelect. CVA null/non-array reset becomes `[]`; nonstring array entries are removed. Unknown/duplicate string IDs remain for explanation/validation. FormControl/component disabled combine. Explicit value takes precedence over internal CVA; choose one app value owner.

| Shared inputs/output | Types/defaults |
| --- | --- |
| `controlId` / `label` | Required strings; controlId unique per page |
| `hint` / `error` | `string | null = null`; app text displayed unchanged |
| `required` / `disabled` / `busy` / `readonly` | Each `boolean = false` |
| `value` / `valueChange` | Optional `readonly string[]` input / same-type output |
| `name` / `labelPosition` | `string = ''` / `'inherit' | 'above' | 'inline' = 'inherit'` |
| `placement` | `OverlayPlacement = 'bottom-start'` |
| `locale` | Shared provider if omitted |

OverlayPlacement is `'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'right-start' | 'left-start'`. A name submits each raw ID through same-name hidden inputs, preserving Cascader path order. Enabled/busy values remain; disabled values are excluded from native submission. HTTP, submitted-value authorization, required business conditions and persistence success belong to the app.

`TreeSelect<T>` (`ui-tree-select`) adds `nodes: readonly TreeNode<T>[] = []`, `multiple=false`, `linkSelection=true`, `searchable=true`, optional string placeholder. It exposes loadRequested/loadCancelled/resolvedNodes, `resolveLoad(requestId, children): boolean`, `failLoad(requestId, message): boolean` and **`invalidateLoads(): void`**. Multiple linked selection links parent/child and chip removal uses the same rules; single selection allows at most one ID. Validator returns `{required: true}` or `{treeSelection: 'cardinality' | 'unknown' | 'disabled' | 'unselectable' | 'incomplete' | 'duplicate'}`.

Search draft is separate from selection. Escape/reopen/profile/locale changes retain search text; CVA writeValue/explicit clear reset it. Turning searchable off transfers focus from the removed search input to Tree. Read-only/busy/disabled suppression retains invalid restored values/error explanations.

`Cascader<T>` (`ui-cascader`) adds `nodes: readonly TreeNode<T>[] = []`, `allowIntermediate=false`, optional string placeholder. Value is a root-to-selection raw-ID array. Native-column candidate draft is separate from committed CVA value. allowIntermediate permits parent confirmation. Parent return, loading, confirm and clear are explicit; Escape cancellation does not commit. Opening initializes draft from committed value.

Cascader exposes loadRequested/loadCancelled/resolvedNodes; methods are `resolveLoad(requestId, children): boolean`, `failLoad(requestId, message): boolean`, `invalidateLoads(reason: TreeLoadCancellation['reason'] = 'invalidate'): void`. Validator returns `{required: true}` or `{cascader: 'path' | 'disabled' | 'unselectable' | 'intermediate'}`. Retain a usable close action even if every candidate/ancestor disappears.

## Lazy loading, invalidation and recovery

Readonly `TreeLoadRequest` contains nodeId:string, path:readonly string[], requestId:number. `TreeLoadCancellation` adds `reason: 'collapse' | 'source-change' | 'reset' | 'invalidate' | 'destroy' | 'close'`. Request IDs advance across instances in one module; they are not persistent or cross-bundle globally unique IDs.

Call resolveLoad/failLoad on the same host that emitted the request and check the returned acceptance boolean. Only matching pending requests are accepted; retry gets a new ID. Children are validated before commit. Failure messages must contain nonwhitespace user-facing text. Failure is shown on its branch while retaining other branches/selection/input and retry.

Replacing Tree/Cascader nodes references invalidates cache/old requests. Hidden collapsed branches, popup closure, reset and explicit invalidation cancel applicable requests. Post-destroy responses are rejected; destruction emits no cancellation output. UI cancel does not prove network cancellation; I/O cancellation/deduplication are app-owned.

When changing a parent signal and processing an old response in one turn, **call host `invalidateLoads()` before changing nodes**, without waiting for post-render detection. Check acceptance of delayed replies to closed-popup hosts too. OrganizationChart has no loading/resolve methods; supply app-fetched nodes.

## Keyboard, popup closure and focus

Tree uses [APG Tree View](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) roving treeitem focus: Up/Down, Home/End, logical expand/parent arrows, Enter selection, Space checking (selection if not checkable) and700ms locale typeahead. RTL reverses expand/parent arrows. Respect projected native input/button/link keys and IME. Consume only handled APG keys/matched typeahead; otherwise Escape/Tab/unmatched characters reach parent/native behavior.

TreeSelect/Cascader open nonmodal dialogs inside manual popovers from native comboboxes. ArrowDown/ArrowUp/Enter/Space open; child Escape returns to combobox, next Escape reaches parent native dialog. Tab/outside retain destination focus and connect blur/touched. Internal `OverlayCloseReason` is `'escape' | 'outside' | 'scope-exit'`; it does not add public closed/openChange outputs to the two CVAs.

When collapse/candidate removal/hidden/disabled removes owned focus, recover to a visible ancestor, enabled Tree item or status/close action. Do not steal already-external focus. Cascader compares raw attributes exactly; it does not convert UTF-16 to CSS selectors and substitute another ID.

## OrganizationChart

`OrganizationChart<T>` (`ui-organization-chart`) requires chartId:string/label:string. Inputs: `nodes: readonly TreeNode<T>[] = []`, `expandedIds: readonly string[] = []`, disabled=false, busy=false, `direction: OrganizationDirection = 'top-down'`. Directions: `'top-down' | 'bottom-up' | 'left-right' | 'right-left'`. Output: `expandedIdsChange: readonly string[]`.

Native nested lists represent relationships, native buttons expand, decorative CSS draws lines. Direction changes visual layout while retaining DOM hierarchy/reading order. TreeNodeTemplate projects nodes/business forms; hidden preserves input DOM on expansion changes. Context selected=false/checkState='false'. Hidden owned focus returns to a visible ancestor expansion button/viewport; external focus is retained. Visual direction and text RTL remain distinct and ancestor dir changes are followed. There is no locale input, CVA, read-only or load output.

## Profiles, language and verification

Follow the [two-layer role contract](design.en.md). YAML default_profile/profiles and data-ui-profile switch all semantic mappings. Connect font.body/code, text, leading, weight, space, size, color, border and radius by purpose; no direct component primitives. Shared motion.duration/easing are source semantic roles, not new fixed animations. Guided/dense vary typography/spacing/target sizes without recreating selection, loads, projected forms or focus. Popups use logical CSS/local scrolling and retain required controls at320px/200% text. Reduced motion suppresses smooth scrolling.

Public provideUiLocale/[uiLocale] (UiLocaleScope) supply locale/translate/direction. Explicit component locale wins. Generated default_language selects en-US or ja-JP; omitted older YAML retains Japanese. Unspecified direction inherits app dir. UiLocaleScope connects native lang/dir/CDK Directionality, respects explicit app Dir/external changes and restores owned attributes only. Dictionaries change library text, never raw IDs/labels/descriptions/app errors.

Public pure functions: `treeNodes`, `treeBranch`, `treeUnloaded`, `treeEntries`, `treeEntry`, `treePath`, `treeFilter`, `treeVisible`, `treeComplete`, `treeCheckState`, `treeToggleCheck`, `treeSelectionProblem`, `cascaderPathProblem`. Internal DOM-encoding/load helpers/shared popup bases are not consumer APIs.

Verify actual assistive technology, all adopted browsers, SSR/hydration and business persistence/undo in the consuming configuration.
