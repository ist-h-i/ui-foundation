# Public UI component contracts

[Japanese](ui-components.md)

Inputs/events/operations of generated Angular source and the state/work owned by the consuming app. Use the [overview](components.en.md) to select components and the [consumer guide](ui-library-consumer-guide.en.md) for installation/dependencies.

Choose the [generated entry point](ui-library-consumer-guide.en.md#import-generated-components) covering the standalone components your app uses. Load tokens.css, angular/styles.css and, with Tailwind, tailwind.css. The app owns HTTP, restoration, business decisions, persistence, sending and undo. Distinguish typecheck/build/interactions/automated accessibility/visual-semantic review; automated checks alone do not establish understanding or business effectiveness. Built-in default labels follow generated language/runtime dictionaries; Japanese message keys in examples are not an unconditional Japanese display default.

## Tokens and profiles

Concrete values belong in YAML primitives, role mappings in semantic, and overrides in profiles.<id>.semantic; see [required roles/types](design.en.md). Component CSS uses semantics such as `--ui-color-action`, `--ui-text-body`, `--ui-space-control-x`, not concrete color/typography/spacing/dimension/radius/border/weight/line-height/motion values. Font family is `--ui-font-body`; size is `--ui-text-body`. There is no old-theme/density compatibility layer.

Generated Tailwind bg-color-action/text-color-on-action/px-control-x/py-control-y/font-family-body/text-size-body/font-weight-body/rounded-control connect to those same semantics, with color/size and family/weight distinguished in names. Use app styles.css as Tailwind CLI input, loading tokens/adapter/components/app CSS to generate actual utilities.

Root uses the default profile. data-ui-profile=guided/dense redefines all semantics per scope. Use uiProfiles from generated profiles.ts for switcher IDs/labels. The sample defaults to guided. Change the same main element's attribute and retain inputs/selections/fetches/pending/results in app signals and the same DOM. Reject IDs absent from generated metadata.

Sample guided uses blue actions, initial18px body, broad spacing and12px control radius; dense uses green,16px, narrow spacing and4px. Rem sizes follow root size. Nested scopes apply all their own semantics. Context/guidance informs AI composition; runtime components infer neither audiences nor screen layouts.

## Public API

### PageFrame

`<ui-page-frame title="Edit request">` uses headingLevel:1|2 (default1). Project decision context through [uiPageContext], page actions through [uiPageActions], and remaining content as body. The app owns main. Do not add unnecessary subtitles.

### ActionControl / ActionLink

Native `<button uiAction>`/`<a uiAction href="…">`; variant:primary|secondary|danger defaults secondary; busy/disabled are booleans. Button type defaults button and preserves explicit submit/reset. Busy suppresses repeated actions, exposes aria-busy and visible pending text, and retains projected labels. ActionLink suppresses actual navigation and consumer click/auxclick while disabled/busy, removes itself from tab order, and becomes operable at default tabindex0 when href returns. The app owns busy/disabled. RouterLink/custom keyboard composition is unverified.

Renderer2 capture listeners suppress before consumer handlers; DestroyRef removes them. DOM access is limited to this interaction guard. Server rendering/hydration are unverified.

Labels project into .ui-action-label. Long/unbroken names wrap without shrinking pending text. Retain full names/status inside the control at narrow widths/large text rather than truncating.

Optional `emphasis: 'primary' | 'secondary' | 'tertiary' | null` and `tone: 'normal' | 'danger' | null` separate visual prominence from destructive meaning. Omitted axes inherit the legacy variant; legacy danger resolves to primary/danger. Explicit normal cannot cancel a legacy danger variant; remove the legacy danger binding to change that meaning. Legacy-only usage retains its data-variant and styles. Explicit usage adds data-emphasis and data-tone. A conflicting legacy danger and explicit normal exposes data-action-tone-conflict. Tertiary actions have an underlined label and use their native button or link interaction. Keep destructive labels explicit and keep permission, confirmation and recovery in the app. SplitButton forwards the optional axes to the main action; ConfirmDialog and ConfirmPopover accept optional confirmTone for the confirmation action only.

When IconButton or ToggleButton uses either appearance axis, the selected indicator remains visible when the control is disabled or busy. Forced colors distinguishes primary, secondary and tertiary with outline weight and label underlining. A double border indicates selection. When a danger ConfirmDialog opens, its enabled cancel button takes initial focus within the active dialog. A tone change while the dialog is open preserves the current focus.

### FormField / FieldControl

`<ui-form-field controlId="name" label="Request name" [required]="true" hint="…" [error]="error()"><input uiFieldControl …></ui-form-field>` manages one native input/select/textarea. FieldControl connects id/required/aria-invalid/aria-describedby; extra description IDs go in whitespace-separated describedBy. Control IDs are unique/whitespace-free and labels nonempty; attach uiFieldControl to the actual control. The app owns value/input through native HTML/Angular forms, including native checkbox/select state; use RadioGroup for radios. This base wrapper does not itself implement composite/custom CVAs (extended input components below provide their own contracts). Its structure accepts formControl on native elements; initial wrapper tests cover native value/input/change only.

Host hidden=true hides even checkbox layout and removes input from tab order while retaining the instance/value/selection for reappearance.

### AsyncRegion

`<ui-async-region [state]="state()" [retryAvailable]="true" (retry)="reload()">…</ui-async-region>`.

AsyncRegionState is ready or loading|empty|error|refreshing|partial|stale with message:string. Loading/empty/error hide body; ready/refreshing/partial/stale retain it. Body instances/drafts survive. Partial is incomplete data; stale retains old results after refresh failure. Explain missing information/impact in message. RetryAvailable/retryBusy default false; retryLabel uses the shared Retry message; retry emits intent. The app separates independent healthy regions. Rendering-exception isolation is not guaranteed.

### ActionFeedback

`<ui-action-feedback [state]="feedback()" recoveryLabel="Undo" (recover)="undo()" />`.

ActionFeedbackState is idle or success|error|unknown|warning with message:string. Unknown is neither success nor failure. Warning can explain irreversible targets/impact before action. Empty recoveryLabel hides recovery; recoveryBusy/recoveryDisabled default false; recover emits intent. Connect undo only when actual restoration exists. Failure text does not disappear automatically.

AsyncRegion/ActionFeedback retain initially empty live regions even in ready/idle and update their text with state; visible content shows the same message. Initial automated tests do not establish actual assistive-technology announcement.

### RadioGroup / RadioOption

Project native same-name radios inside `<ui-radio-group name="priority" label="Priority" [value]="priority()" (valueChange)="priority.set($event)" [required]="true" hint="…" [error]="error()">`, for example `<label class="ui-radio-option"><input uiRadioOption value="normal">Normal</label>`. Uses native fieldset/legend. Name is app-unique/whitespace-free; label nonempty. Value:string|null; valueChange:string. Group/individual RadioOption can disable. App owns value/validation; native arrow selection remains.

### Navigation / Breadcrumb / NavigationItem

Project native ul/li/links into `<nav uiNavigation label="Main pages">`. Direction horizontal|vertical and narrow wrap|scroll choose layout; icons can project inside links. Navigation requires label; Breadcrumb uses the shared breadcrumb label by default. `<a uiNavigationItem href="…" [currentPage]="true">` uses aria-current=page. App owns URLs/current page. Angular Router composition is unverified.

Breadcrumb accepts native ol/li projection or items:readonly BreadcrumbItem[]. Each has unique id/label and optional href/current; at most one current, default last. Separator is decorative. MaxItems is integer>=3 including expansion; expanded/expandedChange controls middle levels. Collapsed links remain in native details, preserving all levels. Current without href is a span. Reject executable javascript/data/vbscript and empty URLs.

Link text uses color.link, separate from action backgrounds. Transparent normal links sit over surface/background; hover/current backgrounds use background. List/link width management wraps long Japanese/unbroken Latin text without requiring app truncation or hidden overflow.

### Tabs / TabPanel

`<ui-tabs label="Request information" [selected]="panelId()" (selectedChange)="panelId.set($event)"><ui-tab-panel panelId="summary" label="Summary">…</ui-tab-panel>…</ui-tabs>`. Panel IDs are app-unique; whitespace/generated-tab-ID collisions are rejected. Empty selected chooses first enabled; explicit selected must exist. Disabled panels are skipped; a disabled selected panel displays first enabled, while app owns selected-value updates.

Orientation horizontal|vertical defaults horizontal. Scrollable=false by default; enabled tablist scrolling is local. Long horizontal labels remain single-line without changing other tab heights. Manual activation: horizontal arrows (RTL reversed)/vertical arrows/Home/End move focus; Enter/Space/click selects. Tab enters visible panel. Hidden panels retain input instances; nested Tabs handle only their owned panels.

TabPanel closable=false by default. Tabs closeRequested:string returns ID on Delete/selected close. App decides unsaved behavior and updates panel data/selected together. Reorderable/orderChange emit new ID order with Alt+arrows or previous/next controls; reorder app data using tracked panel IDs. Input DOM is not regenerated. AllowEmpty=false and focusFallback:HTMLElement|null cover last-panel removal/explicit fallback. Empty tabs hide tablist/selected actions and focus fallback. Dynamic removal/disable recovers owned focus to next/previous enabled tab without stealing external focus.

Selected text/underline use color.tab-selected over surface; verify text contrast independently of button backgrounds.

### Disclosure

`<ui-disclosure title="Detailed conditions" [open]="expanded()" (openChange)="expanded.set($event)">…</ui-disclosure>` uses native details/summary, required title and default open=false. App owns openness; retain native keys. Host hidden=true on Tabs/Disclosure removes display/tab-order while preserving inputs/selection/open state for reappearance.

### SideNav / NavigationRail / BottomNavigation / Dock

SideNav (also ui-navigation-rail, same implementation) requires navId/label; takes items:readonly NavigationNode[], current, expandedIds/expandedIdsChange, collapsed/collapsedChange, optional positive pixel width and selected:NavigationNode output. Nodes have id/label and optional href/icon/description/disabled/visible/recursive children; all-hierarchy IDs are unique and cycles rejected. Native nav/list/details/summary/links retain site-navigation semantics rather than forced menu arrows. Parents with href get a link inside expanded hierarchy. Disabled parents cannot expand; disabled links retain explanations but cannot navigate; visible=false hides the hierarchy.

Width is expanded width, default size.sidebar. Global collapse uses size.navigation-rail and remembers expanded branches. Icons/initials retain complete accessible labels. Selecting a parent summary while collapsed expands nav and parent. External collapse/parent closure/removal moves only owned focus to remaining parent summary/collapse control.

BottomNavigation (also ui-dock) requires label, takes flat items/current, showLabels=true, fixed=false, physical edge top|bottom|left|right and selected. Child-bearing items error and direct the app toward SideNav. Hidden labels retain link names. Left/right are vertical, top/bottom horizontal, with local scrolling. App layout reserves content clearance for fixed regions and owns navigation/current/Router/history.

### AnchorNavigation

Requires label and items:readonly {id;label;target:HTMLElement|null}[]. Optional scrollRoot:HTMLElement|null, nonnegative pixel offset=0, position:static|sticky|fixed, behavior:auto|smooth, updateHash=true; emits currentChange/selected. Targets are same-document actual elements with valid IDs and inside scrollRoot when supplied. Null/hidden/inert/disconnected targets disable links while retaining explanation. Native href/modifier-click semantics remain.

Ordinary clicks actually scroll/focus targets and optionally update hash while preserving history.state. Offset connects scroll-margin-block-start; movement/current-position also account for scrollport scroll-padding-block-start, including percentages/calc. Local scrollTop uses the same clearance. Reduced motion avoids smooth. Scroll/resize/target visibility/root-dir/profile/style changes update current position. Sticky positions the host within nearest scroll region. Destroy/target change restores only owned margin/tabindex without overriding intervening app changes, including !important priority. App owns fixed-region clearance/business current-location meaning/extra URL rules. Window scrolling uses html scroll-padding-block-start; demo ResizeObserver reserves actual nav height and restores owned values on static/destruction. Match local-root offsets to actual layout.

### Menubar / MegaMenu

Menubar requires controlId/label, items:readonly MenuItem[]; exposes itemsChange/selected, disabled=false, closeOnSelect=true. Always-visible roots use horizontal roving focus and root commands/check/radio with recursive Menu. Root group/separator are rejected; put them in popup children. Roots with child popups are type=item; checkbox/radio choices belong inside popups. Disabled items are focusable for explanation but reject execution. Selection returns root-inclusive ID path/item. ItemsChange is updated check/radio data, not business success.

Root horizontal arrows (RTL reversed)/Home/End/typeahead, popup vertical/Enter/Space, forward child opening, backward/Escape parent return are connected. Forward on a popup leaf advances root and enters its popup if present; backward at top-level popup goes to previous root. Tab/Shift+Tab from roots/popups close all and exit the whole Menubar, without depending on rendering new tabindex first. Verify rapid root/deep keys and owned focus after removal. Existing Menu menubar/rootNavigation/openMenu/dismiss/focusTrigger support this composition.

MegaMenu is an actual-anchor native popup inheriting Popover controlId/anchor/open/trigger/placement/busy/close-reason/defer/target-loss contracts. Adds required label, groups:readonly MegaMenuGroup[] (id/label/description/items), positive integer columns=3, current, closeOnSelect=true, closeLabel and selected. Render group headings/descriptions/native-link-details hierarchy/parent links; size.mega-menu/navigation-column control maximum columns/wrapping. Site navigation does not force menu-arrow interaction. Tab reaches every link/summary; shared popup owns outside/close focus. App updates destination/current. Native destination focus wins on navigation; Escape/cancel returns to trigger.

### CommandPalette

Requires controlId/label, commands:readonly PaletteCommand[], open/openChange, query/queryChange, recentIds/historyChange, positive integer historyLimit=10. Commands have unique id/label and optional description/group/keywords/shortcut/disabled/visible/icon. Whitespace-separated query words AND-match label/description/group/keywords. Group results; empty searches prioritize recent invocations, which are not proof of successful business work. App persists history.

Native modal Dialog contains focus-retaining combobox/listbox with groups/descriptions. Up/Down moves candidates; Enter emits commandRequested; disabled remains visible but cannot execute. Respect defaultPrevented/IME. Same search editor/draft survives close/reopen/candidate replacement. Busy/error/busyLabel/retryLabel suppress repeated requests and retain selection/query after failure. Error begins below search, long bodies remain locally keyboard-scrollable, retry stays in Tab order and errors do not move search focus. Before removing an owned-focus retry button after request, return focus to retained search. closeRequested/completed follow Dialog defer/result; close() cancels; complete(value) returns app result. closeOnSelect defaults false: requests alone do not close. Explicit true is for immediately completable app actions. Defaults are closeOnOutsideClick=false/size=large. searchLabel/resultsLabel/defaultGroup/emptyLabel are replaceable; app auxiliary controls project inside Dialog.

Shortcut:string|null=null explicitly opts in. ShortcutScope:HTMLElement|null defaults to shared OverlayHost/body. Use exact modifier/key combinations containing Control/Alt/Meta plus letter/digit/F1..12/Enter/Space/arrows (Control+k, Meta+Shift+k). Shift-only, duplicate modifiers and ambiguous Ctrl spellings are rejected. Candidate shortcuts run only while open. Do not intercept normal inputs/already-handled/IME/repeat keys or palettes outside another modal. App verifies screen conflicts/OS-screenreader reserved keys/actual command/backend outcomes. Every shortcut retains a visible action path.

At narrow widths/zoom, heading wraps with close; search label/input/status remain fixed during local scrolling. After opening/arrows/error/research rendering, reveal selected action name using actual search-region height, not merely description/shortcut bottoms. ResizeObserver follows text-size changes; destruction clears observer/reserved render work.

### Dialog

`<dialog uiDialog label="Delete request" [open]="dialogOpen()" (openChange)="dialogOpen.set($event)">…</dialog>` connects native showModal/close. Browser modal semantics suppress background/handle focus. Label required; cancelled/closed report Escape/closing. Provide a close button and update open=false. Initial base verification does not establish SSR/hydration or multiple modals; extensions below specify additional dialog behavior.

### DataTable / TableContainer

`<ui-table-container label="Request table"><table uiTable caption="Requests"><thead>…</thead><tbody>…</tbody></table></ui-table-container>` requires caption/region label. App owns th scope/sort aria-sort/row keys/cell semantics/missing-data explanations. Basic foundation markup does not automatically implement sorting/selection. Horizontal scrolling stays inside a keyboard-focusable table region.

### Pagination

Page>=1 and totalPages>=0 are safe integers. If totalPages>0, page<=totalPages; known-zero results use page1. Invalid/unknown values show a shared page-information diagnostic and suppress actions. Do not replace an unfetched total with0; separate states through AsyncRegion/etc. Disabled defaults false. Previous/next/current-total display does not generate buttons for every page.

## Common library extensions

The following are extended public APIs and usage limits.

Install the matching Angular Forms package for input components. Icons render generated Lucide shape data. [Consumer guide](ui-library-consumer-guide.en.md#register-icons)

### DataTableView and Pagination

`columnFilters=true` shows an initially collapsed column-filter area. Active column counts remain visible; opening/closing retains constraints/incomplete input. Hidden-column conditions can be cleared there too. Keep filters out of sticky headers to prevent overlap with rows.

Alongside native table[uiTable], ui-data-table accepts required rows/columns/keyField/tableId/caption. Row keys are unique strings/finite numbers; column IDs unique nonempty strings. Distinguish missing/invalid number-date/zero/false. Missing sorts last in both directions.

TableColumn<T> has id/field/header/type/format/sortable/filterable/options/width/minWidth/maxWidth/pinned. TableState has page/pageSize/search/sort/filters/columnOrder/hiddenColumns/columnWidths/pinnedColumns; initialize with createTableState(). App state/stateChange owns persistence/restoration; components do not write HTTP/localStorage.

- `sortable`/`sortMode` selects off/single/multiple and cycles ascending→descending→removed.
- `columnFilters`/`globalSearch`/`searchColumns` cover typed text/number/date/option conditions and selected-column global search. TableFilter represents AND/OR and multiple constraints. Empty comparisons are inactive but retain chosen operators. The current ColumnFilter UI can add/remove multiple constraints; see the [full table contract](ui-library-table-expansion-spec.en.md).
- `pagination`/`pageSizeOptions` control pages/counts. Client filtering clamps a reduced page range and emits state. Server mode does not locally search/sort/page supplied rows; app supplies totalItems and adopts state.
- `autoWidth`/`autoFit: content | available` uses measured content/available width, clamped to bounds, with table-local overflow. Resizable-column sliders support pointer/keyboard.
- `stickyHeader`/`columnControls` cover headers/visibility/order/logical pinning/width/reset. RTL pinning follows logical directions; the final visible column cannot be hidden.
- `selectionMode`/`selectedKeys`/`selectedKeysChange`/`rowSelectable`/`selectAllScope` use native checkboxes/radios, exclude ineligible rows and retain other-page selection. Server select-all covers the supplied page.
- `expandedKeys`/`expandedKeysChange`/`rowActions`/`rowAction` provide details/actions. Hidden detail DOM retains drafts while on the page; the app owns retention after moving rows to another page.
- `striped`/`borders`/`hoverRows`/`rowSpacing`/`wrapCells`/`ellipsis` and dataState/retryAvailable/retry control display/fetch-update-failure-partial states. Busy suppresses query/selection and retains old content; app decides safe business actions with partial data.

Replace cells through `<ng-template uiTableCell="amount" [uiTableTemplateOf]="rows" let-row let-value="value">` and details with uiTableDetail. Import TableTemplate; uiTableTemplateOf supplies context inference.

Pagination extends page/totalPages/pageChange with totalItems/pageSize/pageSizeOptions/pageSizeChange/showFirstLast/busy/disabled/label. Compute totals from known counts and suppress invalid settings/boundaries. App owns server refetch/page persistence.

### Forms and suggestion inputs

TextInput/Textarea/NumberInput/PasswordInput/SearchInput/Checkbox/Switch/Select/MultiSelect/Combobox are native-element CVAs. Required controlId/label; shared hint/error/required/disabled/busy/readonly/value/valueChange/name. Choose formControl/formControlName or controlled value/valueChange, not two value owners. writeValue does not emit back; disabled/read-only/busy suppress edits. App owns displayed error text/timing and final submission validation. FormField-backed CVAs also use labelPosition; native selection fieldsets use legend/direction.

- TextInput: placeholder/maxLength/autocomplete/clearable/showCount. Native UTF-16 units determine counts/maxlength.
- Textarea: rows/autoResize/maxHeight/maxLength/showCount/placeholder. Overflow scrolls internally; manual enlargement remains. Auto-resize recalculates for input/CVA, width/profile/hidden reappearance.
- NumberInput: min/max/step/fractionDigits/grouping/locale/unit. Native-number editing; grouping/fraction display is supplemental. CVA validates range/step/required/badInput and revalidates bounds changes. An invalid draft is not falsely valid through an old numeric value.
- PasswordInput: autocomplete/visibility/app-supplied strength. Component display does not establish password security.
- SearchInput: debounceMs/loading/suggestions/suggestionsQuery/suggestionsRequestId and searchRequest:{query,requestId}. Input updates immediately; debounce emits latest query once. Enter/search button cancels pending and emits immediately, respecting IME Enter. Output naming avoids native search-event collision. Async responses supply query plus request ID, including repeated identical queries. Equal-value CVA reset invalidates responses/debounce; static-only suggestions use null request ID. Clear-search has its own named action/aria-controls target.
- Checkbox: boolean/indeterminate. Switch: boolean/busy/native role=switch. Connect changed values/touched.
- Select: options label/value/disabled/group, placeholder/clearable, native select/optgroup. The unselected label comes from `uiFoundation.select.noSelection`. Set `placeholder` for a control-specific label. Decorative chevron sits at logical native-select end with separate text/edge padding.
- MultiSelect/ui-checkbox-group: options/searchable/showSelectAll/maxSelected/selected display/individual removal/direction vertical-horizontal/columns. Retain filtered-out selections; disabled/deleted selections remain individually removable. Leaving the whole group notifies updateOn:blur.
- Combobox: options/freeInput/loading/placeholder/queryChange:{query,requestId}/optionsQuery/optionsRequestId. Async replies include both identifiers to exclude old same-query responses. Nonfree editing clears old selection to null; incomplete drafts validate invalid. Equal-value reset clears drafts. Arrows/Home/End/Enter/Escape/Tab/aria-activedescendant respect disabled options/IME. Typed ng-template[uiComboboxOption] exposes $implicit:SelectOption/active/selected for display only, without nested actions. Native popover/OverlayRegistry/placement/viewport flip-clamp remain in native modal scope. First Escape closes candidates; next reaches Dialog. Tab/outside/selection synchronously unregister without stealing focus from another action.

FormLayout ([uiFormLayout]) has columns/direction/gap:none|compact|normal|wide, labelPosition:above|inline and positive-pixel labelWidth (null uses size.form-label). FormField inherit|above|inline defaults to layout; inline labels occupy at most40% to preserve input. At viewport<=40rem text inputs return to vertical layout; native checkboxes can explicitly use above/inline. InputGroup projects uiInputBefore/uiInputAfter and connected. FormErrorSummary takes errors:{controlId,label,message}, visible/title, focuses native fields and emits navigate. FormGroup is native fieldset/legend with groupId/label/hint/disabled/shared layout; native disabled retains values. Use Angular FormGroup.disable() when excluding validation too. See the [component overview](components.en.md) for other input categories.

### Structured inputs and form actions

MaskedInput/OTPInput/TagInput use shared CVA with format/incomplete-draft validation/explanation. App owns business validation/transport and serializes Angular-form values.

- MaskedInput: required mask (9=ASCII digit, A=Unicode letter, *=letter/ASCII digit, backslash escapes literals), one-grapheme placeholderCharacter, showPlaceholders/clearIncompleteOnBlur/autocomplete. CVA is raw separator-free string; native input is formatted, so native FormData reads display text and raw submission uses CVA. Missing slots are placeholder/format explanations, not values. Preserve incomplete drafts; only explicit clearIncompleteOnBlur=true clears on leave. Invalid/excess characters remain draft rather than masking invalidity with old accepted values. Support separator deletion/reentry/caret/Unicode/IME/equal-value reset. Limits1–128 slots/256 parts; mask changes retain/revalidate values.
- OTPInput: digits1..64 (default6), numeric|alphanumeric ASCII kind, stripPasteSeparators=false. Uses native text/inputmode/pattern/autocomplete=one-time-code. Preserve leading0/full-code paste; do not truncate excess/wrong-kind input. Only explicitly configured paste strips spaces/hyphens. OS autofill/authentication success are outside DOM/interaction evidence.
- TagInput/ui-token-input: readonly string[], options/freeInput/allowDuplicates/caseSensitive/maxTokens:null|nonnegative integer. Native editor/datalist/add/individual remove. Retain duplicate/outside-option/limit-rejected drafts and invalid restored collections for correction. Validator distinguishes unadded draft; reset clears it. Validate collection-required, not native required on an empty editor. Keep editor focus before removing tokens; app supplies data-update outcomes.
- RadioGroup: name/label/value/valueChange/required/disabled/hint/error/direction. CVA or controlled initial selection uses each input[uiRadioOption] value/disabled. Native arrows skip disabled options; group exit marks touched. CVA reset follows FormControl nullable/nonNullable/app reset value.
- FormActions: native submit/reset/cancel, formId for external form association, busy/disabled, showSubmit/showReset/showCancel, per-action labels, direction/align/group label. cancelled is intent. Native reset reaches Angular FormGroupDirective/app reset. Busy suppresses built-in actions/projected clicks, retains built-in owned focus inside its region and returns to the same action after completion without stealing external focus. App connects projected-action disabled/form targets. Persistence success/navigation/cancel outcome are not assumed.

Primary references: [HTML autofill](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill), [APG Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).

### Calendar and date inputs

Dates use YYYY-MM-DD, months YYYY-MM, years strings and times HH:mm[:ss]. Civil dates are not converted into regional local instants. Calendar/DatePicker take min/max/disabledDates/dateDisabled/weekStartsOn0..6/locale. Calendar has value/CVA/today/initialMonth/displayMonth/monthChange/view:month|year/selectedDates and ng-template[uiCalendarDay]. Context: $implicit date/day/inMonth/selected/disabled. Do not nest other controls inside day cells; Calendar owns selection.

Omitted Calendar.today/DateRangePicker.initialMonth use device-local date/month at construction, without automatic midnight selection/month changes. Apps needing business zones/date refresh supply explicit values. Locale only changes display; civil values/arithmetic do not shift with time zones.

Calendar grid has one tab stop: arrows/Home/End/PageUp/PageDown/Shift+Page navigate day/week/month/year. Disabled dates remain focusable for inspection but cannot commit. Named local horizontal scrolling at narrow/large text retains undivided date digits. Initial/key focus reveals the date, including RTL. Previous/next/year-month buttons retain focus while revealing the new date's tab entry. dayDescription(date) adds information to the date button name. DatePicker native dialog focuses selected date and returns to trigger after Escape/confirmation, within the same profile/RTL scope.

DatePicker/DateRangePicker format changes retain incomplete invalid draft and its current display format; valid input repair, explicit reset/clear or calendar selection adopts the new format. Formatting alone does not mark invalid input valid. Range endpoints propagate validators to the parent, retaining the last committed range while partial input makes the parent invalid; preset/clear/reset/calendar repair it. Datetime steps use min (or civil epoch) as origin across both date/time.

DatePicker inputFormat is native/yyyy-MM-dd/yyyy/MM/dd/dd/MM/yyyy/MM/dd/yyyy. Parse explicit manual formats without inferring ambiguous regional order. Invalid drafts remain visible/invalid until clear/reset/repair. Format:locale|iso controls supplemental display. TimePicker has seconds/stepSeconds/hourFormat12|24/timeAllowed and validates step/range. DateTimePicker requires timeZone and retains native datetime-local strings; app resolves instants/DST gaps-folds, without implicit component conversion. MonthPicker/YearPicker provide min/max/clear. Empty date/time descriptions produce no description element, only retained input spacing.

DateRangePicker value is {start,end}; takes min/max/maxDays inclusive/disabledDates/dateDisabled/presets/months/weekStartsOn/locale/initialMonth/clearable. Validate order/maximum duration/internal disabled dates while retaining input. Link multimonth origins and explicitly choose start/end target. Scheduler resource/event movement is separate.

### GridList and Icon

GridList takes items/keyField/labelField/controlId/label and typed ng-template uiGridItem [uiGridItemOf]="items", context $implicit item/index/selected. Columns=null computes from actual container width/size.grid-item; columns/maxColumns/minimumItemWidth/itemSize/gap/breakpoints control layout, with breakpoint {minWidth,columns} container-width conditions. SelectionMode/selectedKeys/selectedKeysChange/itemSelectable/showSelectAll/busy/disabled/emptyMessage use native checkbox/radio. Busy blocks component selection; app connects projected business actions.

Icon has name/size:small|medium|large/severity/decorative/label. Decorative icons are hidden from assistive technology; meaningful icons require labels. `provideUiIcons()` registers 12 defaults. To register only the icons a route uses, pass their shapes together to `selected(...shapes)`. To share registrations or paint settings with native Lucide directives or providers, enable the Lucide adapter and follow the provider order in the consumer guide. Verify the SVG paths in the rendered app. [Icon registration](ui-library-consumer-guide.en.md#register-icons)

### Card and regions

ui-card takes cardId/title/collapsible/collapsed plus showHeader/showBody/showFooter/showMedia/showActions, each controlled with hidden. Orientation vertical|horizontal, appearance outlined|plain|raised, padding none|compact|normal, title/subtitle/label, loading/loadingLabel. Collapse/hide/loading retain input instances. A disappearing owned-focus region transfers to expansion/article. Loading does not automatically disable business content; app interprets fetch state.

Projected ui-card-header/body/footer/media/actions accept align:start|center|end/padding. Alternatively ng-template uiCardTemplate=header|body|footer|media|actions receives title/subtitle/collapsed/loading, one template per region; an explicit template takes precedence. Import CardTemplate/projected components. Card applies one inner padding and equal visible-region gaps. Empty regions/loading descriptions consume no spacing; hidden/collapsed projected input DOM remains.

### Menu and Overlay

Menu selectors ui-menu/ui-dropdown-menu/ui-context-menu require menuId/label and recursive unique-ID MenuItems with type:item|checkbox|radio|group|separator, label/icon/disabled/visible/checked/radioGroup/value/children. selected returns {item,path}; itemsChange returns checks. Inputs open/openChange/trigger:click|hover|context/placement/closeOnSelect/disabled. Radio exclusivity uses explicit radioGroup or same-parent default. Reject missing/duplicate IDs/cycles/empty labels.

Arrows/Home/End/Enter/Space/typeahead support RTL-reversed hierarchy directions. Disabled items are focusable/explainable, never executable. Escape returns one focused hierarchy level; Tab exits to adjacent operation. Parent-menu-return is a touch alternative. Context trigger supports right-click/Shift+F10/ContextMenu/500ms long press/permanent button, with uiMenuContext projection. Hover permits moving between trigger/content and closes200ms after leaving.

Hover does not steal editing focus. Root trigger setting does not prevent child opening by click/arrows/Enter/Space. Narrow overlapping submenus do not switch items on last-moment hover before click. Removal/visibility changes repair focus through remaining siblings/parent/trigger. Parent Dialog close or hidden/inert/destroyed anchors end popups as scope-exit. Outside clicks across OverlayHosts close only the topmost with one pointer event.

Native popovers enter top layer while preserving DOM profile/RTL scope. OverlayHost supplies optional scoped OverlayRegistry, coordinated across the same Document's top order. Anchor/visual viewport/RTL/margins determine flip/clamp and follow scroll/resize. Browser handles native-modal inertness/Tab. MoveHandle/ResizeHandle (button[uiMoveHandle/uiResizeHandle]) take target/uiHandleDisabled/rectChange and use pointer capture/arrows/Shift for movement/resizing.

### Extended Dialog and dialog variants

Dialog selector dialog[uiDialog]. Inputs open/openChange/modal/showHeader/showFooter/closable/closeOnEscape/closeOnOutsideClick/size:small|normal|large|full/position:center|top|bottom|start|end/draggable/resizable/maximizable/busy. Header defaults false for original projection-only usage. uiDialogHeader/uiDialogFooter or ng-template[uiDialogTemplate] replace header/body/footer; context busy/finish(reason,value,returnValue). Header move/maximize/close and independent resizing controls are available. Maximize/busy disable native movement/resize buttons; restoring size re-enables them. Continuous movement/resize keys accumulate against latest coordinates without render waits.

Even without header, closable=true displays shared close and draggable/maximizable controls before body, without changing initial body focus merely because close was added. Changing modal while open uses native close→show/showModal without completed. Nonmodal dialogs stay ahead of ordinary positioned controls.

finish(reason,value?,returnValue?) synchronously emits closeRequested:DialogCloseRequest; app preventDefault defers exit until unsaved confirmation, then finish again. Busy blocks user exit. After confirmed work, complete(value,returnValue) closes with confirm across UI busy suppression but still respects app closeRequested deferral. Explicit open=false is programmatic. completed:{reason,value,returnValue}, cancelled/closed notify and restore caller focus. Reasons: escape/outside/close-button/confirm/cancel/programmatic/native. Direct native close()/method=dialog uses native reason and bypasses finish's deferral contract.

ConfirmDialog takes label/message/confirmLabel/cancelLabel/busy/closeOnOutsideClick/open and emits closeRequested/completed confirmation intent. AlertDialog uses alertdialog and remains until explicit response, blocking Escape/outside. Neither confirmation is HTTP-update success.

FormDialog takes label/open/busy/dirty/valid/error/saveLabel/closeOnOutsideClick/projected inputs. Dirty exit defers and offers continue editing/discard. App owns model; closing does not reset draft. SaveRequested asks app validation/persistence; app calls complete after success. Error retains input. Save-originated busy retains focus in status and returns to save (or input if disabled) while still open, without stealing focus moved elsewhere. App can additionally defer closeRequested. Explicit open=false is app instruction; use finish for guarded unsaved exits.

Place DynamicDialogHost before DynamicDialogService.open<T>({component,label,data,inputs,modal,...}), which actually renders Angular content. Inject UI_DYNAMIC_DIALOG_DATA/UI_DYNAMIC_DIALOG_REF; ref.finish(reason,value)/Escape end it and ref.result returns DialogResult. updateInputs preserves the component instance. One host/dialog per scope; disconnected/duplicate opens error. Host destruction resolves result too.

### Snackbar, Toast and notification host

Snackbar selectors ui-snackbar/ui-toast take open/openChange/message/severity/autoDismiss/durationSeconds/position/showCloseButton/actionLabel/pauseOnHover/pauseOnFocus; action and dismissed:close|action|timeout. Enabled auto-dismiss defaults5 finite positive seconds. Disabled does not read seconds or pass0/NaN to timers. Overlapping hover/focus pauses resume remaining duration only after both end. Action/close ends notification and returns owned active focus to caller; focusReturn supplies explicit destination.

NotificationService.notify(request) enqueues FIFO. NotificationHost maxConcurrency/dedup:ignore|replace|allow/position configure delivery. Queued timers start only when rendered. Identity uses dedupKey or message/severity/position. Replace increments same-ID revision/restarts display duration; stale action/timeout cannot dismiss replacement. Dismiss(id)/clear explicitly end. Six top-bottom/start-center-end positions use logical start/end in RTL.

Centered positions support nested mixed directions. Long notifications scroll within available space with body/actions reachable. Dismiss/clear restores focus only from that scope's active notification, not another scope. IDs are local to NotificationService.

Notifications requeued by reduced concurrency or rerendered after position changes restart configured duration on next display: this is not an elapsed-global-time TTL. Use one host per service. Actionable modal notifications need uiNotificationScope or a dedicated provider and NotificationHost inside that modal DOM. Notifications outside native modals remain inert background; do not enable background interaction. Real undo/backend persistence/message business meaning/dedup-key design belong to the app.

## Layout and containers

PageFrame (ui-page-frame/ui-app-shell) projects header/sidebar/body/footer/actions through uiPageHeader/uiPageContext/uiPageSidebar/uiPageFooter/uiPageActions and controls visibility/header-sidebar-footer stickiness. Hidden children retain inputs. Sidebar defaults to size.sidebar and stacks before body at narrow widths. Sticky uses its actual scroll container; measured header/footer heights determine sidebar offset/available height. If that scroll region (viewport for document) cannot fit fixed regions plus one action at enlarged text, return to ordinary flow. External hiding can supply focusFallback; if unusable, move owned focus to an outer operation in the same modal.

Container (ui-container/ui-section) supports content/full/explicit-pixel maximum width, semantic padding, start/center/end placement, surface/muted/transparent backgrounds and heading/headingLevel, bounded by available width. Stack (ui-stack/ui-flex/ui-space) supports vertical/horizontal/gap/align/justify/wrap. Gap/padding none|compact|normal|wide select semantics; apps choosing nowrap own content fit.

Grid has columns/rows/gap/container-width breakpoints. Boundaries are inclusive; highest matching minWidth wins. uiGridCell has column/row/columnSpan/rowSpan/width-based placements; spans fit current columns/explicit rows. ResizeObserver updates placement without recreating inputs. Reject duplicate breakpoints, empty/fractional row-column counts and negative widths/positions.

Panel (ui-panel/ui-fieldset) has title/uiPanelActions/bordered/collapsible/collapsed/collapsedChange/disabled. Native body fieldset/inert plus action-region inert express disabled; collapse/disable retain projected inputs. Accordion/AccordionItem support single/multiple, initialExpanded or expanded/expandedChange, itemId/title/icons/disabled. Nested items belong to nearest Accordion. Enter/Space toggle; Up/Down/Home/End navigate enabled headings. Move body-owned focus to heading before hiding. Mark only needed items as regions to avoid excess landmarks.

Splitter retains uiSplitPrimary/body regions, horizontal left-right or vertical top-bottom, initialRatio or ratio/ratioChange, minRatio/maxRatio/step/height/resizable/disabled/collapsible/collapsed/collapsedChange. Ratios are percentages excluding the handle; min/max form a valid0–100 interval; collapse makes primary0. Zero/100 regions hide/remove tab access while retaining contents. Expanding0 restores last positive ratio, or valid initialRatio/range midpoint if untouched. Handle pointer capture/cancel/destruction/direction changes and provide arrows/shrink-grow/toggle alternatives. Horizontal Left/Right are physical RTL-aware; vertical Up/Down move; Home/End use bounds; Enter collapses/restores. Retain ratio while collapsed; explicit app ratio updates win.

Divider/Spacer support direction/semantic spacing/line style/label/grow. ScrollArea uses direction/height/position/positionChange, native keys and actual coordinates. StickyRegion (ui-sticky-region/ui-affix) uses nearest native scroll region with edge/offset/enabled; it creates no remote DOM portal and sticks once ordinary position crosses offset.

AspectRatio takes positive ratio/contain|cover|fill for directly projected native img/video/iframe. ResponsiveVisibility retains projected content and shows it within inclusive viewport minWidth/maxWidth; focusFallback handles hiding. App decides whether required business actions can depend on width.

References: [APG Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/), [APG Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/). The latter notes ongoing example/task-force review; this implementation establishes its stated role/value/keyboard contract and tested interactions, not broader APG review completion.

## Action components

ActionControl (button[uiAction]) extends variant/type/busy/disabled with size:small|medium|large, width:auto|full, icon/iconPosition:start|end/uiActionIcon projection. Sizes follow profile semantics; small does not reduce minimum targets. Busy/disabled use native disabled/capture guard to suppress consumer clicks. ActionLink (a[uiAction]) adds href/external/target/rel; external announces external link, defaults target=_blank and adds noopener/noreferrer while retaining supplied rel. Busy/disabled remove href/tab access.

IconButton (button[uiIconButton]) requires icon/label, shape:square|round, size, selected:null|boolean with aria-pressed when stateful. ToggleButton (button[uiToggleButton]) has stable label/checked/checkedChange/on-off labels-icons, aria-pressed, shared icon/iconPosition and replaceable state text/decorative icons. ButtonGroup has label/direction/gap/connected/shared size; explicit projected action sizes win.

SegmentedControl has controlId/label/options:value-label-icon-disabled/multiple/direction/equalWidth. Single uses native radio with string|null; multiple uses checkbox with readonly string[]. Connect CVA/required/option-mode validation/disabled-busy-readonly/hint-error/exit touched. App decides value conversion when changing modes. Equal widths retain radio/icon/short-word needs and wrap whole options when narrow/large text; long unbroken legend text wraps within bounds.

SplitButton separates primary action from Menu selected, with items/placement/open/openChange/closeOnSelect/busy/disabled. FloatingActionButton (ui-floating-action-button/ui-speed-dial) has primary/auxiliary items, four logical-corner positions, physical up/down/left/right popup directions and open/openChange. It does not bypass inert background outside native modals.

Toolbar (ui-toolbar/ui-action-bar) has controlId/label/typed action-separator items/direction/overflow:menu|wrap/fixed:none|top|bottom/disabled. Actual width moves overflow into Menu. Horizontal RTL-aware arrows/vertical arrows/Home/End use roving focus. Before an action hides, recover to visible primary/More; popup actions returning to primary layout retain their action focus. Fixed uses native sticky in nearest scroll region.

CopyButton has text/label/busy-disabled/successMessage-errorMessage/positive durationSeconds default3/copied-failed. Actual Clipboard writeText success is announced only after Promise resolution. Unavailable/rejected writes show failure/retry. Suppress duplicates/stale post-destroy outcomes. Own-button focus is retained within action while pending and restored after completion, without stealing external focus. Status expires from completion after configured duration. UI_CLIPBOARD_WRITER injects an adapter that owns copy semantics/Promise outcome. It does not read unrelated clipboard contents.

References: [APG Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/), [Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/), [Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/), [Clipboard API](https://www.w3.org/TR/clipboard-apis/#async-clipboard-api).

## Notification lists and status

NotificationCenter has controlId/label/typed items:id-title-message-category-read-severity-disabled-busy, filter/category/change outputs, disabled/loading/hasMore/error and load/retry labels. Show unread counts/categories; emit readRequested:{id,read}, deleteRequested:id, loadMoreRequested. Display app-supplied lists without assuming read/delete/fetch success. Retain lists/block repeated loads and allow retry. Before filtering/deletion/disable removes active controls, move owned focus to visible action/status.

Alert (ui-alert/ui-banner/ui-inline-message) has open/openChange/title-message/severity/announcement:polite|assertive|off/closable-closeLabel/actionLabel-action/busy-disabled/focusFallback. Project body/uiAlertActions and retain until explicit dismissal. Announcing does not steal focus; closing transfers only internal focus outward. Externally hiding built-in confirm/close moves its owned focus to body while retaining other actions/auxiliary inputs/external focus. App connects custom projected-action busy behavior.

ActionFeedback adds busy/busyMessage/focusFallback to idle-success-error-warning-unknown state/recovery contracts, preserving unknown outcomes/explanation/input. AsyncRegion retains ready/loading/empty/error/refreshing/partial/stale/retry contracts and acquired content during refresh/partial/stale states. Transfer focus before switching content/status; disabled pending recovery keeps focus in status.

EmptyState has kind:empty|search/title-message/image-imageAlt/auxiliary actions; image failure retains explanation. ResultState has status:info|success|warning|error|unknown/title-message-details/native-details openness/next actions. Both support busy/disabled/action/projection/auxiliary controls.

ProgressBar connects native progress to controlId/label/value/total/valueText/cancel intent. Total is positive finite; value finite|null. Indeterminate removes value; numeric values clamp0..total. Spinner (ui-spinner/ui-circular-progress) shares progress/label and size:small|medium|large|positive-pixels, active/delayMilliseconds. Stop-before-display/destruction cancel timers; reduced motion stops rotation. Skeleton has line/rectangle/circle, rows/width-height-diameter/motion, is decorative and hidden from assistive technology; circles preserve aspect ratio inside narrow parents.

LoadingOverlay (ui-loading-overlay/ui-block-ui) makes only projected target content inert while active; exposes message/cancelLabel/cancelRequested/cancelBusy/disabled. Retain inputs and external controls. On activation transfer target-owned focus; on release return to original input, focusFallback, then enabled content action. Oversized explanations scroll from their start with keyboard-accessible cancel. Cancellation is intent, not proof work stopped.

Tour (ui-tour/ui-coachmark) uses actual HTMLElement-target typed steps:id-title-message-placement, open/openChange/index/indexChange/seen/seenChange/next-back-finish-close labels. It scrolls to target and places nonmodal popovers while allowing target inputs/actions. Emit navigation/resume/seen IDs; closed reasons are completed/dismissed/escape/target-unavailable/scope-exit. Popup-owned focus returns to initiator, including external open=false, without stealing target/external focus. Unavailable targets due to native-modal transitions/CSS hiding end the tour. App persists seen/resume and decides actual workflow completion.

For directive elements such as uiAction used as target/focusFallback, query `viewChild<unknown, ElementRef<HTMLElement>>(name, {read: ElementRef})` and pass nativeElement. A directive template reference is not an HTMLElement.

References: [APG Alert](https://www.w3.org/WAI/ARIA/apg/patterns/alert/), [HTML progress](https://html.spec.whatwg.org/multipage/form-elements.html#the-progress-element), [native modal/inert](https://html.spec.whatwg.org/multipage/interaction.html#modal-dialogs-and-inert-subtrees).

## Text, information and numeric display

Typography attaches uiTypography/uiHeading/uiText to native h1–h6/p/span/strong/em/etc. Actual tags determine semantics/heading hierarchy; uiTypography:body|heading|small, tone:neutral|muted|info|success|warning|error, align:start|center|end|justify, wrap:wrap|nowrap|balance, emphasis:normal|strong|italic control appearance. Preserve strong/em semantics. Nowrap allows local scrolling and adds tab access only if no existing tabindex/native action; preserve app tabindex.

Badge supports count/maximum/showZero/dot/label/tone and inline/top-bottom×start-center-end positions. Explain complete numbers even when visual display is99+; dot uses label for description. Logical positions support RTL and remain inside target bounds.

Tag (ui-tag/ui-chip) has label/icon/tone/selectable/selected-selectedChange/removable-removed/disabled-busy/focusFallback. Separate native selection/removal buttons; selection uses aria-pressed. Before removal intent transfer internal focus outward; dynamically removed/disabled controls retain focus at Tag, not from outside. App owns actual data removal/validation/failure recovery.

Avatar has name/src/alt/decorative/locale/size:small|medium|large/shape:circle|square. Failed images use grapheme-safe name initials/alternative explanation; changed src retries and imageFailed emits failed src. Initial size derives from avatar dimensions and stays unwrapped/inside bounds when enlarged. AvatarGroup takes typed id-name-src-alt items/maximum/label/size-shape-locale; overflow people remain named in native details. Removing summary through maximum changes retains focus at group.

Descriptions (ui-descriptions/ui-key-value) uses native dl/dt/dd with typed id-label-value items, columns/direction:horizontal|vertical/label/missingLabel/emptyLabel. Distinguish null/undefined/0/false/empty string; narrow layout becomes one column. DescriptionTemplate (ng-template[uiDescriptionValue]) exposes typed $implicit:DescriptionItem/value/missing.

Statistic (ui-statistic/ui-metric-card) has label/value/unit/comparison/comparisonLabel/deltaMode:absolute|percent/deltaLabel/deltaTone/locale/Intl.NumberFormatOptions format/missingLabel/unavailableDeltaLabel. Accept finite numbers/null and distinguish0 from unfetched. Percent=(value−comparison)/abs(comparison); zero/missing comparison or unrepresentable change is unavailable. Increase does not imply business success; app selects semantic tone.

Meter connects controlId/label/value/minimum/maximum/low/high/optimum/unit-locale/Intl format/missingLabel to native meter. Validate minimum<maximum, finite in-range values and low<=high. Null shows missing without creating a numeric meter; use ProgressBar for progress. MeterGroup requires controlId/label and takes typed id-label-value-tone items/maximum/unit-locale-format, shows acquired sum/unknown count/per-item native meters/decorative proportional band. Reject duplicate IDs/over-limit sums, accounting only for compensated addition/final rounding so0.1+0.2 at limit0.3 is valid. Values/sum/limit share Intl format. Quantity+unit/limit and sum/limit use LTR bdi, unit interior uses auto bidi, preserving ratio order in RTL. Unknown is not zero remaining capacity.

HelpText projects content/id/position:inline|above|below for explicit aria-describedby. ShortcutHint connects keys/optional spoken label/position:inline|below to native kbd; provide labels for symbols such as Command. App owns command execution.

ReadMore (ui-read-more/ui-truncated-text) has controlId/text/positive lines/expanded-expandedChange/expandLabel-collapseLabel. ResizeObserver measures actual overflow; show native full/collapse button only if needed. Visual line clamping retains complete DOM text. If text/line/width changes remove the action, retain focus at ReadMore.

CodeBlock has source/language/label/format:preserve|json/indent/optional synchronous formatter(source,language)/lineNumbers/wrap/direction:ltr|rtl|auto (default ltr)/copyable-copyLabel-copyDurationSeconds/copied-copyFailed. Pre/code interpolation never executes HTML. JSON formatting changes only whitespace, preserving duplicate keys/raw number-string tokens; failures retain source/explanation. Numbers share each source row, including empty lines; wrapped continuations get no extra number. Exclude line numbers from assistive technology/selected copy; code uses named local scroll. Actual CopyButton copies displayed contents and retains source on failure. Before pending disables its owned button retain focus within CopyButton, return only while still owned. External action removal retains focus at code region. Post-destroy Clipboard completion emits no result, but already-started OS writes are not guaranteed cancellable. InlineCode attaches matching family to native code[uiInlineCode]. Highlighting/language completion are not part of this display component.

Watermark has controlId/content/repeat/position:top-center-bottom×start-center-end/opacity/tileWidth-tileHeight. Repeat uses actual SVG patterns; single placement is logical. Null opacity uses semantics; explicit opacity0..1; positive-pixel or purpose-profile tile dimensions. Decorative content is hidden from assistive technology and pointer-events:none preserves underlying inputs/actions. Watermarks do not guarantee authentication/copy protection.

Additional required roles are font.code/size.avatar/opacity.watermark, resolved for both profiles. Code family/avatar dimension connect to appropriate Tailwind namespaces; opacity connects directly to semantic CSS.

References: [HTML meter](https://html.spec.whatwg.org/multipage/form-elements.html#the-meter-element), [code/kbd](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-code-element), [APG disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/), [bidi isolation](https://www.w3.org/International/articles/inline-bidi-markup/).

## Edge regions and floating content

Drawer (dialog[uiDrawer]) and BottomSheet (dialog[uiBottomSheet]) inherit native Dialog. Label/open-openChange/modal/closeOnEscape/closeOnOutsideClick/closable/busy/closeRequested.preventDefault/completed reason-value/finish()/post-result complete() follow Dialog. ShowHeader defaults true; typed uiDialogTemplate header/body/footer and region projection remain.

Drawer edge:left|right|top|bottom is physical, default right, without RTL reversal. Width/height are positive finite pixels|null. Null side widths use size.drawer-inline; top/bottom heights use size.drawer-block; cross-axis fills viewport. Bound to viewport with internal scroll. Explicit size/edge changes clear previous move/resize without rebuilding content. Optional move/resize/maximize use Dialog native keyboard handles. Edge overrides ordinary position; maximize fills viewport. Hidden/inert/disconnected Drawer/Sheet closes natively, releases modal inertness and reports native reason; UI deferral cannot block cleanup. External nonmodal closure does not steal moved focus.

BottomSheet stages are ascending positive ratios<=1, default[.4,.7,1]; stage/stageChange uses valid index default1. Height is selected fraction of viewport/explicit height. Native range/reduceLabel-expandLabel buttons/setStage(index) change stage; stageLabel/current-stage-percentage explain it. Height controls follow body with one label/range/minus-plus actions and spoken names/titles. Busy blocks changes and retains focus in region; endpoint-disabled buttons transfer to range. Dialog close/action contracts remain; pointer dragging is unnecessary.

Popover/Tooltip/HoverCard/ConfirmPopover use actual HTMLElement|null anchors. Directive/component references may be component instances: pass nativeElement from viewChild(...,{read:ElementRef}). Target/content share a document and native-modal DOM when modal. Top-layer rendering retains original DOM profile/RTL, without relocating content to anchor. ControlId is unique/whitespace-free.

Shared trigger:click|hover|focus|manual defaults click for Popover/ConfirmPopover and hover for Tooltip/HoverCard. Placement defaults bottom-start among six overlay placements. Open/openChange/disabled/busy, closeOnEscape-closeOnOutsideClick=true, finite nonnegative timer-bounded showDelayMs/hideDelayMs and focusFallback apply. Hover has keyboard-focus/explicit-click paths. show() starts explicitly. Anchor/position changes reposition; hidden/inert/lost-modal-scope targets/content trigger cleanup.

close(reason) synchronously emits PopupCloseRequest, which apps can defer. Busy defers UI exit. Closed returns {reason,value}; reasons escape/outside/scope-exit/target-unavailable/close-button/cancel/confirm/programmatic/leave. Explicit open=false, target loss and destruction clean timer/listener/Overlay. Do not steal external focus; owned content focus returns to available anchor/fallback. Scope loss cannot be prolonged by veto. Close native popup/unregister synchronously so next Escape reaches parent Dialog.

Popover/HoverCard are nonmodal dialogs with label/showHeader-showCloseButton=true/closeLabel-busyLabel/focusOnOpen=true. Click/explicit show focuses controls; automatic hover/focus retains anchor focus. Explicit click/Enter enters even an already automatically shown HoverCard; Tab can enter too. uiPopupTemplate header/body/actions context is busy/close(); project uiPopupHeader/uiPopupActions/body. Closing retains DOM/input. Runtime trigger/RTL/profile changes retain owned focus/placement. Component owns anchor aria-controls/haspopup/expanded, so do not share with other controllers; destroy/target-change restores owned attributes only. Explicit destruction does not guarantee input retention; a recreated component opens if app still supplies open=true.

Tooltip displays required message only, without action projection. Defaults500ms show/100ms hide; HoverCard300ms/150ms; both configurable. Role=tooltip receives no focus. Add only its ID to existing anchor aria-describedby, removing only that ID on target-change/destruction. Unhandled Escape cancels pending timers and suppresses restart for continuing hover/focus. Input-consumed/IME keys do not cancel pending display. Pointer movement into content retains it. Required explanation also needs permanent content, not tooltip alone.

ConfirmPopover requires label/message, with confirmLabel/cancelLabel/busyLabel/error. Confirm uses primary tone, cancel secondary; initial focus is cancel. ConfirmRequested is intent and does not auto-close. Until next render after request, internally suppress duplicates/ordinary exit; then app busy owns pending state. App connects busy/error/retry and later complete(value) or explicit open=false. Cancel closes with cancel reason. Failures retain input/error/retry. Library does not establish backend success/real undo.

Shared Escape reaches topmost Overlay after child handlers, respecting defaultPrevented/IME. Repeated busy/vetoed Escapes remain consumed and do not close lower Dialogs. Native Dialog owns modal inertness/Tab; cancel rejection alone cannot guarantee every repeated close stays deferred, so registry mediates app key contracts. Nonkey exits such as OS back are not guaranteed deferrable.

Observe targets/content including documentElement. Root dir/profile/style changes reposition; root hidden/inert cleans Menu/Popup and releases Drawer/Sheet native modal. Restoring root availability does not steal externally moved focus.

References: [HTML popover](https://html.spec.whatwg.org/multipage/popover.html), [APG modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [APG Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) (work in progress). Native semantics/interactions/axe/rendering remain distinct from real-screenreader/user-understanding evidence.

## Numbers, colors, editing, steps and conditions

Import generated angular/index.ts. Authoring demo is /catalog/choices; installed consumers do not require that fixture. Shared controlId/label/hint/error/required/disabled/busy/readonly/name with CVA or value/valueChange. External CVA reset invalidates incomplete UI requests, not app transport.

| Component | Settings/value | Interaction/output |
| --- | --- | --- |
| Slider | Number; min/max/step/unit/ticks:SliderTick[]/labelPosition | Native range arrows/Home/End; snap from min; datalist ticks/text labels |
| RangeSlider | {start,end}; same bounds/ticks plus startLabel/endLabel | Two native ranges enforce start<=end; DOM order stays stable |
| Knob | Number; same range/step/unit/labelPosition |270-degree SVG indicator/native range/pointer capture/increment-decrement; size.knob per profile |
| Rating | Number; stars1..20/halfSteps/clearable/clearLabel | Native radios for integer/0.5 increments; clear to0 (invalid if required); read-only retains value explanation |
| ColorPicker | String; format:hex|rgb|hsl/allowAlpha/freeSelection/palette:ColorChoice[]/valueLabel/freeLabel/alphaLabel/paletteLabel | Raw text/native color/alpha range/palette; retain focused text, format on valid blur |
| InlineEdit | String; multiline/rows/maxLength/validateValue/editLabel/saveLabel/cancelLabel/emptyLabel/busyLabel | saveRequested:{requestId,value,previousValue}/editingChange; app answers complete(id,value?)/fail(id,message) |
| Wizard / Stepper | controlId/label/current/direction/disabled/busy/deferTransitions/nonlinear/action-status labels | currentChange/transitionRequested:{requestId,from,to,reason}/completionAccepted; approve/reject/restart |
| WizardStep | stepId/label/disabled/canProceed/next | Project mounted-hidden body retaining input; own heading focus on entry |
| FilterBuilder / QueryBuilder | Recursive FilterGroup/fields:FilterField[]/group-field-operator-value-add-remove-save-clear-restore-status labels | saveRequested:{requestId,value}/savedCleared; completeSave/failSave apply matching requests only |

Numeric settings need finite min<max and representable positive step. If max is off-step, use last reachable value. Invalid models remain with Validator/explanation while native display alone is bounded safely. Snap during user edits; reversed ranges can be repaired by actual editing within bounds. Check values/settings/duplicate ticks; invalid configuration blocks edits. Native read-only alternatives disable interaction while retaining textual value explanation.

Color parses hex3/4/6/8, RGB byte/percent, HSL angle/percent and alpha. Conversion through RGBA gives hex-alpha byte precision and RGB/HSL up to3 decimals. Do not silently revert incomplete raw input. Alpha-off does not silently rewrite transparent models opaque; explain error and allow new selection. FreeSelection=false permits palette/readback only. Native OS color UI is environment-dependent; retain text/palette alternatives.

InlineEdit Enter (Control/Meta+Enter for multiline) requests save; Escape cancels, respecting IME. Pending makes same editor read-only, retains input/focus and blocks duplicates. Failure restores draft/retry. Confirmed complete publishes CVA separately from ordinary editing commit and can apply through busy. Old post-reset/destroy results return false. Applied external value changes invalidate old requests and sync same editor; complete/fail also compare operation-time previousValue. Move only owned start/end focus; preserve result-button/external focus. MaxLength counts Unicode code points, not graphemes.

Wizard next=undefined means next enabled projected step, null means completion, ID means branch. Linear allows direct return only to visited steps; nonlinear permits unvisited. Back uses actual history. Pending permission/from-to/branch/available-step changes invalidate old approvals. DeferTransitions=false accepts UI movement immediately; true awaits approve/reject. Completion is UI-step completion, not backend submission. Invalid external current displays first enabled. App owns input validation/business branching/persistence/unsaved choices. Parent Wizards do not own nested steps.

Filter uses text/number/date/boolean/choice fields, typed operators, recursive and/or, stable unique IDs. Missing=null/undefined/wrong type, distinct from0/false/empty string. Dates compare valid YYYY-MM-DD or Date UTC day. compileFilter copies valid conditions and evaluates only row own properties. Empty groups are excluded; empty root means unrestricted. No arbitrary code/SQL/network execution. Invalid structure/values/unknown fields remain with validation/field explanations. Restored saved conditions are UI snapshots; app returns persistence outcomes through completeSave. Applied field-ID/description/type/option changes invalidate pending while retaining/revalidating conditions; completeSave/failSave require same definitions/valid conditions. Busy/pending block actions. Verify failed drafts/stale post-reset-external-change-destroy responses/owned focus before removal. Restored field/operator/boolean/choice native selection must match models. Pending/failure/success owned-focus destinations reveal text/focus outlines after rendering; responses do not move externally selected input/focus/viewport position.

Condition conjunction and fixed operators use concise translated all/any/not-equal/greater-than/less-than labels. Preserve negation/boundaries at nested/narrow/large text without changing serialized IDs/evaluation.

InlineEdit/FilterBuilder invalidatePending() clears UI requests without discarding draft/saved snapshot. Child components cannot observe parent-signal changes not yet applied to inputs in the same turn. Invalidate before replacing parent values or handle replies after child inputs update. CVA writeValue/reset invalidates synchronously. App owns I/O cancellation/server rollback/identifying equal-value external rewrites.

## Lists, selection, virtualization and movement

Generated consumers install compatible @angular/cdk; see [verified versions/dependencies](ui-library-consumer-guide.en.md#application-dependencies). Use public scrolling/drag-drop APIs without private CDK API/style modifications.

List/ui-list, Masonry/ui-masonry and DataView/ui-data-view have items/keyField/labelField/label and optional descriptionField/iconField/emptyMessage. Keys are unique nonempty strings/finite numbers; contents app-owned immutable snapshots. Typed ng-template uiCollectionItem [uiCollectionItemOf]=items exposes $implicit/index/pageIndex/count/key/label, replacing primary/secondary/row action content. List supports separators/spacing; Masonry columns/maxColumns/minimumItemWidth/breakpoints/gap lays variable-height items in CSS columns.

DataView state/stateChange:CollectionViewState holds query/sort/page/pageSize/layout. Configure locale/searchable/sortable/paginated/pageSizes/disabled/busy. Disabled features stop processing those conditions while preserving app state; unused pager configuration is not validated. Active out-of-range pages emit nearest valid page. Context index is absolute filtered/sorted index; pageIndex is page-local. Layout-only changes retain stable-key input DOM.

Listbox/ui-listbox and SelectionList/ui-selection-list are one CVA. ListChoice has value/label/disabled?/group?; single value string|null, multiple readonly string[]|null. Inputs multiple/searchable/showSelectAll/maxSelected/clearable/locale/virtual/itemHeight/height/overscan/shared ValueControl. uiListChoice exposes $implicit/selected/active/index for display-only projection. Selection/focus differ: arrows/Home/End/typeahead focus; Space/Enter select; Ctrl/Meta+A selects visible enabled candidates. Retain hidden/disabled selections; removing entries repairs over-limit restored values. Invalid shape/duplicates/unknown values remain validation errors until explicit form.reset repair, not automatic normalization. Virtual group metadata owns rendered options and exposes no unrendered active IDs. Virtual rows match public viewport clientWidth; long default labels truncate within row width. Ordinary width follows parent. Null itemHeight measures default group/option lines/padding with size.collection-item minimum and one shared row height, remeasuring profile/text/group changes. Explicit heights/projected fixed-row content are app contracts; oversized content scrolls inside rows.

VirtualList takes items/keyField/labelField/label/itemHeight/height/overscan/emptyLabel/radioGroups, emits rangeChange/positionChange and exposes scrollToIndex/scrollToOffset. Null dimensions use measured semantics. Typed ng-template uiVirtualItem [uiVirtualItemOf]=items exposes $implicit/index/count. Fixed-height interiors scroll locally; app stores editor state by stable key. Recycling owned-focused rows transfers to viewport without stealing external focus. ResizeObserver measures public clientWidth and modifies only owned row widths. Long default labels truncate; oversized projected content scrolls inside rows. Do not alter CDK internal elements/CSS.

Before native Tab/Shift+Tab, VirtualList/VirtualDataTable render current/adjacent rows into the fixed-row window; no per-key RAF waits. Browser owns tab order/focus. Respect handled keys/IME/modified Tab/inner viewports. Pointer/wheel/explicit scrolling releases current-row retention; lost rows transfer only owned focus to viewport. RangeChange is planned-range notification, not DOM-completion. App verifies full logical Tab order for projections with many consecutive nonfocusable rows. Synchronous search may create views proportional to total data size; extreme counts/expensive templates need additional verification.

Cross-row native radios need radioGroups:readonly VirtualRadioGroup[]|Signal<readonly VirtualRadioGroup[]> shaped `{name, form?, value: string|null, members: [{key: CollectionKey, value: string, disabled?, hidden?}]}`. Keys are row keys; values native input.value. Omitted form means inherited viewport owner; explicit form matches native form.id. Describe all group members within one viewport, including effective disabled/hidden offscreen states. App updates canonical value on native change. Dynamic models pass readonly Signal itself as [radioGroups]="groups"; arrays suit static/applied parent models, Signals provide latest state during continuous keys. Table selectedKeys accepts arrays/Signals too. Adapter synchronizes checked/tab entry without separate selection storage. Unselected entry follows Firefox first-member, WebKit directional edge, Chromium direction/focus history. Within-row option order follows DOM, not metadata ordering.

Built-in table single selection connects the same adapter to selectedKeys; app adopts selectedKeysChange. Native form.reset restores canonical value in app. Rejected/delayed updates reapply current canonical value. Tab/Shift+Tab remain native; arrows prepare at most3 current/previous-next eligible member rows and let native direction/wrap/input-change run, never mounting all members simultaneously.

Example: app computed groups contain name:decision/value:decision()/members[{key:0,value:yes},{key:499,value:no}], passed as a Signal; projected native radios use the same name/row.value/canonical checked/change update. Values stay unique even when several members share one row. Unknown row keys/duplicate groups-values/unknown selections produce configuration errors without clearing models.

Excluded: external members/shared groups across viewports/positive tabindex/shadow DOM/other documents. App keeps metadata name/form/value/disabled/hidden aligned with actual DOM. Extra configurations need verification. Synchronous cost scales with total data and metadata holds all members; extreme-count/high-cost projection performance is not guaranteed.

SortableList/ui-sortable-list and OrderList/ui-order-list take items/keyField/labelField/controlId/label/orientation/disabled/busy/readonly/canMove/emptyMessage and emit itemsChange/moved. App adopts itemsChange. Moved contains item/fromIndex/toIndex/items/reason:button|pointer|keyboard; canMove exceptions reject. Public CDK handles/touch delay, native position buttons and handle-click→arrows-Home-End draft→Enter confirm/Escape cancel provide alternatives. Changed pointer-start sources invalidate old drops. Cancel-before-release publishes no update and explains pointer release. This is not actual undo/server success.

InfiniteScroll has label/loading/finished/error/disabled/autoLoad/observerRoot/rootMargin/resetKey/contentVersion/loadingMessage/endMessage, loadRequested:{id,reason}, completeLoad(id)/failLoad(id,message)/invalidatePending(). Reasons button/intersection/retry. Auto-request once per initial version; app increments version only after actual append/cursor advancement, allowing next request even with visible sentinel. Empty replies do not advance version. Manual/retry may request same version. Explicit invalidation clears UI waiting/re-registers observation, not network abort. Capture original host in callbacks; do not acknowledge an old ID on a recreated host.

### Transfer and Timeline contracts

TransferList/PickList cover cross-list movement/search/multiselection/order. Timeline/ActivityLog cover datetime/type/details/load-more.

TransferList / PickList:

- Selectors ui-transfer-list/ui-pick-list; TransferList<T> CVA is readonly(string|number)[]|null, key order defines selected order. Items/keyField/labelField/controlId/label required.
- Optional boolean disabledField/hiddenField default false when absent. Hidden/disabled selections remain in CVA; native checkboxes/actions show disabled.
- SourceLabel/targetLabel/searchable/locale/reorderable/maxSelected/shared ValueControl required-readonly-disabled-busy-hint-error apply.
- Both sides' native checks are temporary batch checks. Select-all scope is **all currently search-matching visible enabled items**. Do not unselect disabled/hidden/outside-query values or move outside-scope checked values through another batch.
- Over-limit batch addition rejects all; batch removal repairs limits and remains allowed with required errors. Invalid shape/duplicate/unknown keys retain values/explanations/Validator. Do not normalize them during actions; explicit FormControl.reset repairs.
- Synchronous pure canTransfer(TransferChange<T>)/canReorder(TransferReorder<T>) evaluate batches/canonical positions. Omitted allows; supplied requires true, with exceptions/undefined failing closed. App owns I/O/persistence/undo/business authorization.
- Transferred/reordered/inherited valueChange return intent/new values. Do not reuse filtered display indices as canonical positions.
- Connected CDK cross-list/reorder drag includes native add/remove/up/down. Handle starts draft; horizontal arrows choose side (RTL-aware), vertical/Home/End target position, Enter/Space commit, Escape cancels. Draft does not commit CVA.
- Pointer/draft registers OverlayRegistry kind:operation, respecting child-consumed Escape/IME and synchronously unregistering on end/cancel/destroy. CDK ended precedes dropped; epoch-tagged microtasks clean snapshots. Changed candidates/value/state/search/policies/direction reject old drops. InvalidatePending() explicitly invalidates before same-turn app changes.
- Typed ng-template uiTransferItem [uiTransferItemOf]="items" supplies auxiliary content and $implicit/key/label/side/index/pageIndex/count/checked/selected. Index is original left catalog/right selection index; pageIndex visible index. Component retains native checkbox labels; projected actions are excluded from owned-focus helpers.

Timeline / ActivityLog:

- Selectors ui-timeline/ui-activity-log; Timeline<T> requires items/keyField/labelField/label/dateTimeField/typeField/timeZone. Display app array order; app defines ordering/type meaning.
- Datetime accepts offset ISO, finite epoch milliseconds or valid Date. Reject civil dates/offsetless local datetime. Intl.DateTimeFormat(locale,{...dateTimeOptions,timeZone}) displays while native time.datetime retains UTC ISO. Null/undefined are unfetched; invalid values explicit errors; original items remain. Default options use medium date/short time.
- Type descriptions are text, not color alone, distinguishing missing/invalid. DetailsField/detail template creates native details/summary; collapsed DOM/editing remains.
- ExpandedKeys/expandedKeysChange controls externally, otherwise local. Return only detail-owned focus to summary; retain external focus.
- Typed ng-template uiTimelineItem [uiTimelineItemOf]="items" defaults to item slot; uiTimelineItemSlot=details selects detail. Context: $implicit/key/label/index/pageIndex/count/type/dateTime/expanded.
- LoadMore=true delegates loading/finished/loadError/disabled/autoLoad/observerRoot/rootMargin/resetKey/contentVersion/loadingMessage/endMessage to the same InfiniteScroll host.
- LoadRequested carries that original host's pending id/reason, not permanent/cross-bundle uniqueness. App actually fetches/checks and acknowledges **the same Timeline host** through completeLoad(id)/failLoad(id,message), confirms acceptance then appends. App owns finished/items/I/O/backend/cancel; component does not assume success/append.
- Ack matches pending ID/resetKey/InfiniteScroll host. Distinguish end/failure/retry/old-query/loader-recreation/post-destroy. InvalidatePending() explicitly precedes same-turn condition changes.

Shared: semantics only, external guided/dense profile switching, RTL/narrow/large text. Direct primitives, full-source AST success, backend success, real-screenreader/Firefox/Safari/user-study acceptance are not inferred.

## Extended APIs across all categories

These guides cover barrel types/controls/failure-recovery/native interaction/generated-consumer supply:

- [Tree / TreeSelect / Cascader / OrganizationChart](ui-library-tree-expansion-spec.en.md)
- [Scheduler / Agenda](ui-library-scheduler-expansion-spec.en.md)
- [Full tables, DataGrid/TreeGrid, columns/editing/search/output](ui-library-table-expansion-spec.en.md)
- [File / PDF / Image / media / QR / Barcode](ui-library-media-expansion-spec.en.md)
- [Chart / Map / Gantt / Kanban / Spreadsheet / editors / explorer / flow / chat](ui-library-specialist-expansion-spec.en.md)
- [Forms, locale/date formats, RTL/CDK and profiles](ui-library-runtime-foundation-spec.en.md)
- [Independent consumers, dependencies, workers/assets/notices](ui-library-consumer-guide.en.md)

See [props/events/methods/types/exports](ui-library-api.json), an inventory rather than AST-deviation/accessibility verification. Verify inference/inherited inputs in strict consumers.

Column filters separate comparison/value rows as text grows. Column filters/cell-row editors associate full date explanations when native input display narrows. DataGrid/TreeGrid reserve widths for values/permanent edit actions and local scroll at narrow widths. Scheduler week/month retains card widths for names/datetimes and date-navigation actions. FlowEditor inputs fit cell content width.

Multiple ColumnFilter conditions select translated all/any with associated all-match/one-or-more explanations. Date explanations show valid drafts without changing caret-preserving native bindings. Sort headers avoid stacked borders and retain focus outlines/state symbols. FormDialog reveals unsaved actions/owned pending-status-return destinations.

CommandPalette close remains in the same fixed search region during narrow/large-text/candidate-error scrolling, following Dialog close-button reason/synchronous app veto/busy prohibition. Default retry has concise visible Retry and accessible Retry selected command (localized); retryLabel overrides both. Locally scrolled retry outlines stay inside the button.

Shared selects also cover flow endpoints/file views/timelines/collection sorting-counts/scheduler views-disambiguation/media speed-captions-zoom-ratios. Retain native semantics/keys; chevrons use logical-end clearance and forced-colors return to OS rendering.

Scheduler duplicate-wall-time choices explain reject/earlier/later through translated check-required/earlier/later labels linked to both start/end selectors, preserving serialized values/app decisions. Narrow audio/video selects use control-gap side spacing and retain complete caption names plus arrow clearance at200% text; desktop spacing/native values/track control remain.

The DataTableView virtual wrapper also takes readonly Signal itself for dynamic selectedKeys. VirtualRadioGroups accepts the same projected-cell model and preserves its Signal to children. Members cover only current query/page rows; app retains outside-view selection and computes visible members/selected value or null after query/page changes. Ordinary projected radios use browser-native groups.

Virtual-radio tab eligibility follows reported UA. Unknown/spoofed UA, untested versions/OS/devices/assistive technology and OS settings excluding some control types from Tab are not guaranteed. WebKit does not Tab into groups whose checked member is hidden/disabled and arrows do not wrap at edges; canonical app values remain. Compare with same-engine native radios in the adopted environment and after browser updates.

### Action groups and overflow appearance

ToolbarItem and TableBulkAction accept optional emphasis and tone. Toolbar passes both axes to the displayed action and its measurement copy. In the overflow menu, items share the menu's action hierarchy, but the explicit tone is retained in MenuItem and shown on the leaf command. Menubar root commands also use their specified tone. A submenu opener keeps the regular disclosure style. Use a descriptive action label; danger color alone never communicates authorization or confirmation. The menu trigger does not inherit the command's tone. FloatingActionButton passes the optional axes to its main action, not to the auxiliary menu trigger. FormDialog keeps its legacy danger variant for discarding unsaved changes, including consumer styles targeting that variant. CopyButton retains its routine secondary operation, ButtonGroup uses projected action appearances, and SegmentedControl remains a selection control rather than a destructive command group. Wizard and FormActions retain their established fixed controls and app-owned transition and persistence rules. These are not replacements for the existing confirmation, permission and recovery contracts.
