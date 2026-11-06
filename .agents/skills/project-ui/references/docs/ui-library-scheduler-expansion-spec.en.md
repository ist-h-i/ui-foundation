# Scheduler / Agenda consumer contracts

[Japanese](ui-library-scheduler-expansion-spec.ja.md)

Public components are Scheduler/Agenda. Use generated `angular/index.ts`, not internal controllers.

## Requests and display

`Scheduler<T>` (`ui-scheduler`) switches day/week/month/list with a native select. Base grids are one civil day, seven week cells and42 civil-day cells across six month weeks, including adjacent-month dates. `Agenda<T>` (`ui-agenda`) is list-only with no view input/switcher. Date-range boundaries retain only valid civil dates. Both expose a displayed date, previous/next period navigation, resource filters and movement editor.

Day/week/month place chronological event cards inside day cells; list shows chronological events. Multiday event content appears on the first visible day, with counts/continuing event names on subsequent days. Resources support multiple assignments, filtering and movement targets. Time bands filter actual instants. These are not public hour-axis free-placement/pointer-drag APIs: native datetime inputs, resource selection and an action button request moves.

## Inputs / outputs

Both require `schedulerId: string`, `label: string`, `date: string`. Scheduler IDs are nonempty whitespace-free page-unique IDs; label is nonempty. Date is valid civil ISO `YYYY-MM-DD` in years0001–9999.

| Shared inputs | Types/defaults |
| --- | --- |
| `events` / `resources` | `readonly SchedulerEvent<T>[] = []` / `readonly SchedulerResource[] = []` |
| `locale` / `timeZone` | Optional strings; explicit component value then locale provider; missing zone produces a diagnostic |
| `civilDateOptions` / `dateTimeOptions` | Optional Intl.DateTimeFormatOptions; provider when omitted |
| `weekStartsOn` | Integer0..6 (Sunday0), default1 |
| `listDays` | Integer1..366, default31 |
| `dayStart` / `dayEnd` | `string = '00:00'` / `string = '24:00'` |
| `resourceFilter` / `showUnassigned` | `readonly string[] | null = null` / `boolean = true` |
| `disabled` / `busy` / `readonly` | Each `boolean = false` |
| `movable` | `boolean = true` |
| `canMove` | `((request: SchedulerMoveRequest<T>) => boolean) | null = null` |

Only Scheduler has `view: SchedulerView = 'week'`; SchedulerView is `'day' | 'week' | 'month' | 'list'`. Outputs are dateChange:string, viewChange:SchedulerView, resourceFilterChange:readonly string[]|null, moveRequested:SchedulerMoveRequest<T>, moveCancelled:SchedulerMoveCancellation. Agenda inherits shared output types but offers no view-changing interaction. The app adopts needed display outputs.

Read-only blocks movement while allowing date/view/resource browsing. Disabled/busy stop built-in actions. Movable=false, event.disabled, disabled resources and canMove false/throw reject movement. canMove must be synchronous/pure and only true allows a move. It is evaluated repeatedly: no I/O/side effects; server authorization remains app-owned.

Events are an app-owned collection, not a CVA value. Connect projected inputs to app FormControls inside the typed template; the app manages disabled/reset/persistence. Stable event IDs retain projected input DOM/values across view/date/filter/profile changes; removing an event removes its DOM.

## Events and display context

Readonly SchedulerEvent<T> has id:string, title:string, start:string, end:string and optional resourceIds:readonly string[], disabled:boolean, data:T. Start/end are offset-bearing ISO timestamps; exclusive end is after start. Instants are evaluated at millisecond precision. Civil all-day events need a separate app model, not an assumed allDay flag on this type.

Readonly SchedulerResource has id:string, label:string and optional disabled:boolean. Event/resource IDs are unique nonempty whitespace-free strings within each collection; title/label are nonempty. Identity violations throw. Invalid/reversed times and unknown/duplicate resources retain original events with diagnostics. Under valid configuration, filters do not silently hide invalid events. Invalid overall configuration shows a global diagnostic without inventing event data.

resourceFilter=null means all resources; an array tests intersection with any listed resource. An empty array excludes assigned events. showUnassigned independently controls unassigned events. Disabled resources can be browsing filters but not movement targets.

SchedulerEventTemplate<T> selects `ng-template[uiSchedulerEvent]` and infers generics from required `[uiSchedulerEvent]="events"`. SchedulerEventContext<T> exposes `$implicit`/event:SchedulerEvent<T>, entry:SchedulerEntry<T>, pending:boolean.

| Public display type | Fields |
| --- | --- |
| SchedulerLocal | date:string, time:string, dateTime:string, offsetSeconds:number |
| SchedulerEntry<T> | event, visible:boolean, column/row:number, startLocal/endLocal:SchedulerLocal|null, startText/endText/resourceText:string, problem:string|null, offsetChange:boolean, days:readonly string[] |
| SchedulerDay | date/label:string, column/row:number, inMonth:boolean, count:number, continuing:readonly string[] (continuing event names) |
| SchedulerConfiguration | date, view, weekStartsOn, listDays, locale, timeZone, dayStart, dayEnd, resourceFilter, showUnassigned, optional civilDateOptions/dateTimeOptions |

Public pure functions: `schedulerInstant`, `schedulerLocal`, `schedulerDays`, `schedulerNavigate`, `schedulerConfigurationProblem`, `schedulerEventProblem`, `schedulerMoveProblem`, `schedulerLayout`. Layout returns `{days: readonly SchedulerDay[], entries: readonly SchedulerEntry<T>[], columns: number, problem: string | null}`. Internal snapshots/time-band builders/request-number helpers are not barrel APIs.

## Civil dates, time bands, zones and DST

Display requires an explicit zone resolvable by Intl/Temporal, for example America/New_York/UTC. Precedence is timeZone prop, provider timeZone, missing-zone diagnostic. Browser zones are not silently substituted. Locale/date-format changes affect display, not raw start/end/IDs. Month navigation clamps month-end to valid days; day/week/list move by civil-day counts.

DayStart/dayEnd form a half-open interval `[start, end)` within one civil day. Format is `HH:mm[:ss]`;24:00 is allowed only as end; end must exceed start. Split overnight bands across days. An event belongs to a day only for a positive-duration intersection of `[startInstant, endInstant)` and that day's band-instant intervals; touching endpoints alone does not count.

Each day enumerates zone-offset transitions and splits bands into constant-offset intervals using the [public Temporal transition API](https://tc39.es/proposal-temporal/docs/zoneddatetime.html). Do not assume24-hour civil days, one-hour DST changes or boundaries from only the first two midnights. Gap bands have no instants; fold bands include early/late intervals while excluding intervening instants outside the band. Cases include Lord Howe30-minute changes, Apia full-day skips and St Johns midnight folds. Skipped civil days remain grid cells with count0. Membership intersects display-day transition intervals; it does not scan/sample every second of long events.

Distinguish display of known instants from movement input that is not yet an instant. Display explains offset/DST changes in the explicit zone; the component does not automatically finalize move input to an instant.

## Movement requests, acknowledgments, failure and drafts

SchedulerDisambiguation is `'reject' | 'earlier' | 'later'`. Readonly SchedulerMoveDraft contains localStart/localEnd:string (native datetime-local without zone), timeZone:string, startDisambiguation/endDisambiguation:SchedulerDisambiguation, resourceIds:readonly string[]. UI checks syntax/zone/enabled resources and separately retains incomplete native badInput. It does not claim to resolve DST gaps or reversed wall times solely in UI; disambiguation accompanies the request to the app.

Readonly SchedulerMoveRequest<T> contains requestId:number, event:SchedulerEvent<T>, `previous: {start: string, end: string, resourceIds: readonly string[]}`, target:SchedulerMoveDraft. One pending request per host. Module-sequenced request IDs acknowledge that host's current request; they are not persistent/cross-bundle IDs.

Public methods are below. Internal editor open/close controlled by native UI are not new public methods.

| Method | Acceptance/result |
| --- | --- |
| `completeMove(requestId: number): boolean` | Matching current request/snapshot accepts acknowledgment, explains completion and closes editor |
| `failMove(requestId: number, message: string): boolean` | A match clears pending and retains error/draft; empty message uses default explanation |
| `invalidatePending(reason: SchedulerMoveCancellation['reason'] = 'invalidate'): void` | Invalidates pending, retaining draft/invalidation explanation |
| `resetMoves(): void` | Reset-invalidates pending and clears every editor/draft/focus-return reservation |

On moveRequested, the app handles authorization/conflicts/DST gaps-folds/instant order and actual persistence. On success **call completeMove(id) on the same host first, confirm true, then supply persisted events**. Replacing events first is not the acknowledgment procedure for the old snapshot. A false response is not UI success; the app separately resolves already-completed backend updates, for example by refetch. FailMove retains input; retry uses a new request ID. Actual transport cancellation, idempotence, undo and safe persistence retries remain app-owned.

Pending snapshots compare event id/title/start/end/resourceIds/disabled, resource id/label/disabled, effective display zone, canMove function identity and reevaluation. Opaque data:T contents are not compared. Removing/changing these or turning movable off/read-only on invalidates old requests. View/date/filter/profile/locale-display changes alone do not automatically cancel persistence. Busy/disabled suppress UI and do not acknowledge for the app.

Readonly SchedulerMoveCancellation contains requestId:number, eventId:string, `reason: 'source-change' | 'configuration-change' | 'reset' | 'invalidate' | 'destroy'`. configuration-change is an explicitly available app-workflow reason, not guaranteed automatic emission on every date/view/filter change. Post-destroy responses are rejected; destruction emits no cancellation output.

For parent-signal replacement and old replies in one turn, **call invalidatePending() before updating parent state**; post-render effects do not read future unapplied state. Stale drafts after source-event changes retain input/explanation; native reset recreates them from the current event. Successful acknowledgment alone does not mutate events; the app supplies persisted data.

## Raw IDs, focus and narrow screens

Retain raw event/resource/request IDs. DOM IDs use Tree's UTF-16-safe tokens plus `%2D` for embedded hyphens to separate delimiters. Legal x/preview-x, fold/fold-fold and lone surrogates can coexist with distinct input/preview/disambiguation-select IDs and correct native labels/descriptions. Do not use internal tokens as business IDs/wire format. Native FormData's lone-surrogate scalar conversion is not declared lossless.

Editor Escape/close/completion returns only owned focus to its initiating move button. If the app moves focus to an external button/projected memo in the same close turn, preserve it. Old deferred returns do not affect an editor reopened before rendering; reset/destruction clear reservations. Removal/hiding/disabling of owned-focus controls transfers focus to component status. Escape on the same pending event does not silently cancel/close. Projected-input keys/IME are respected.

Follow [semantic roles](design.en.md), switching through YAML default_profile/profiles and data-ui-profile. Use font.body/code, text/leading/weight, space/size, color/border/radius and shared semantic motion.duration/easing, not new fixed animations. Guided/dense changes retain incomplete datetimes/errors/pending requests/projected CVA input. Logical CSS/local scrolling retain full previews alongside datetime editor internal scrolling at320px/200% text. Technical datetime editor/previews are locally LTR; descriptions/buttons/resources follow scope RTL. Reduced motion suppresses smooth scrolling.

provideUiLocale/[uiLocale] (UiLocaleScope) supply locale/messages/timeZone/date options/direction; explicit component props win. Generated default_language selects en-US or ja-JP; older omitted YAML retains Japanese. Time zone remains unspecified and direction inherits app dir. UiLocaleScope connects native lang/dir/CDK Directionality and respects explicit Dir/external attributes. Dictionaries change only library text, not event title/data/raw IDs/app errors.

## Dependencies

Declare runtime `temporal-polyfill: "1.0.5"` in the app's own package/lockfile. Generated source/CLI installation does not add it automatically. Resolve [shared dependencies](ui-library-consumer-guide.en.md#application-dependencies).

Exact zone-transition-band evaluation uses temporal-polyfill's public Temporal API and native Temporal when available. The app verifies move-draft instant resolution, persistence/cancel/undo, CSP and SSR/hydration. No FullCalendar/paid-resource feature rights are included.
