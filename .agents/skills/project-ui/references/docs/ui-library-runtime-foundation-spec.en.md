# Shared forms, locale, RTL and profile contracts

[Japanese](ui-library-runtime-foundation-spec.ja.md)

These contracts apply from existing inputs through trees, scheduling, tables, media and specialist components. Read the [consumer guide](ui-library-consumer-guide.en.md) and [exact types, props and methods](ui-library-api.json).

## Public locale API

`provideUiLocale(options | Signal<UiLocaleOptions>)` provides `UI_LOCALE: Signal<UiLocaleResolved>`. A local `UiLocaleScope` inherits parent values through `[uiLocale]`. Use `injectUiLocale()` to read resolved options, `injectUiMessage()` to resolve a typed `UiMessageRequest`, or `UiStableMessagePipe` in templates with a stable ID and any named arguments. The public pure functions are `resolveUiLocale` and `resolveUiMessage`.

Options are `locale/direction/timeZone/dateInputFormat/civilDateOptions/dateTimeOptions/numberOptions/translate`. Generated `default_language: en` defaults to `en-US`, and `ja` or an omitted setting defaults to `ja-JP`. Time zone and direction are initially unspecified. Date input is `native`, civil display uses `dateStyle:full`, and date-time uses `dateStyle:medium,timeStyle:short`. Explicit component props override shared values. Invalid Intl settings or a non-function translator produce diagnostics. Runtime APIs preserve YAML and profiles.

The app's optional `translate(request, locale)` receives a stable ID and named arguments for built-in actions, descriptions, status, and diagnostics. A translator can return `undefined` while its dictionary loads. Missing, blank, or unchanged IDs fall back to built-in Japanese for Japanese locales and English otherwise. A child scope inherits the parent translator, can supply its own function, or can reset to built ins with `translate: null@. Apps translate their own labels, content, raw values, and backend errors. Angular text interpolation escapes HTML. [Integration guide and example](ui-library-consumer-guide.en.md#select-english-component-messages)

## Dates, numbers and direction

Date input formats are `native/yyyy-MM-dd/yyyy/MM/dd/dd/MM/yyyy/MM/dd/yyyy`. Civil ISO dates display in UTC without time-zone conversion. Date-time/timeline/scheduling require an explicit prop/provider time zone. Intl display does not convert underlying numbers/raw IDs. Explicit NumberInput locale/grouping/fractionDigits, per-axis Chart number/date options/category names and Gantt civil formats take precedence.

`UiLocaleScope` connects native lang/dir to public CDK Directionality value/valueSignal/change. It respects explicit app Dir/external changes and tracks only attributes it writes. On destroy, it restores an attribute only if its current value still matches the last owned value, and ends its Observer/change stream. Other scopes' DOM is untouched. Local LTR for code, identifiers or physical-coordinate renderers is distinct from surrounding RTL interaction.

## Forms and incomplete drafts

Native inputs/CVAs connect value, disabled, nullable reset, touched and Validator. `updateOn:blur` does not commit when focus moves to an internal suggestion/attachment; leaving the entire control notifies it. Profile/locale/read-only/disabled switches preserve input DOM and drafts. Vendor-editor/async acknowledgments update zoneless OnPush parent values. CVA alone does not guarantee complete template agreement with FormControl generics; verify typed consumers and runtime validation separately.

DateRange separates each raw endpoint draft from its last complete range. While either endpoint is invalid, editing the other never publishes a partial range. Commit both endpoints together when valid. Equal-value reset repairs rejected drafts. If provider/prop date format changes while incomplete invalid input exists, retain the draft and currently displayed format. Valid repair input, explicit reset/clear or calendar selection adopts the new format. A format switch alone must not reset Validator to VALID.

MessageComposer/Chat CVA is editing text, not attachments/messages/backend persistence. `sendRequested` is an intent; the app answers the current ID with `completeSend/failSend/markSendUnknown`. Pending/unknown block repeated submission; failure retains drafts. Explicit writeValue/reset invalidates failure and pending requests, so old acknowledgments cannot clear new input.

FileUpload/Dropzone CVA is the last completely accepted `readonly File[] | null` batch. Invalid shapes or mixed rejection retain parent value and explain through Validator/UI. Distinguish individual upload intents from batch CVA acceptance. Equal-value reset repairs rejection/native picker state. IDs/request IDs avoid collisions within the same host/retained items; retry uses the same ID and a new request ID. The app owns global backend IDs.

Editing in tables/Spreadsheet/Gantt emits validated intents. Do not add imaginary persistence CVAs to structural containers/FormActions. Transport, authorization, persistence outcomes, safe retry and actual undo belong to the app.

## Profiles and verification scope

Source YAML controls colors, font families/sizes, spacing, dimensions and shapes across all categories. Media/visualization viewports have independent semantic roles from tables. Literal semantic-reference audits, generation consistency, strict AOT and actual consumer interactions are distinct and do not establish full-source AST deviation checks.

Suppressing global access during server DI is different from full SSR rendering/hydration. Verify the adopted app.

Retained library-owned text reads the current dictionary at the `uiMessageState` display boundary. Conditions/counts/app values are captured at operation time. Dictionary changes do not rerun workers/fetches/saves. Explicit `set(appText)` preserves the original even if it equals a dictionary key. `setMessage(parts)` delays library text only; dynamic untranslated parts retain operation-time strings. This covers FileUpload rejection text, private Scheduler movement state, vendor Diff descriptions and displayed JSON diagnostics. Original JSON, technical type names/parse codes/offsets and pure-model diagnostics remain unchanged.
