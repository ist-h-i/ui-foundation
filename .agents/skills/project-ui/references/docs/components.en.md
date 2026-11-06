# Component overview

[English](components.en.md) · [日本語](components.ja.md)

Import components from your generated `angular/index.ts`. These are Angular source components with interactions and state/events; the consuming app compiles them and owns business operations. Follow the [integration guide](ui-library-consumer-guide.en.md) for dependencies, CSS, workers and assets. Public selectors, inputs, outputs, types and defaults are listed in the [API catalog](ui-library-api.json). [Detailed component contracts — Japanese](ui-components.md)

| Area | Public components and capabilities |
| --- | --- |
| Layout | `PageFrame`, `Container`, `Stack`, `Grid`, `Panel`, `Splitter`, `Divider`, `Spacer`, `ScrollArea`, `StickyRegion`, `AspectRatio`, `ResponsiveVisibility`: semantic layout, local scrolling, resizing and visibility |
| Cards | `Card`, `CardHeader`, `CardBody`, `CardFooter`, `CardMedia`, `CardActions`, `CardTemplate`: content regions, variants, collapse and loading |
| Actions | `ActionControl`, `ActionLink`, `IconButton`, `ButtonGroup`, `ToggleButton`, `SegmentedControl`, `SplitButton`, `FloatingActionButton`, `Toolbar`, `CopyButton`: native actions/links, selection, menus and copy feedback |
| Form layout | `FormField`, `FieldControl`, `FormLayout`, `FormGroup`, `InputGroup`, `FormActions`, `FormErrorSummary`: labels, descriptions, errors, grouped fields and error navigation |
| Text and selection | `TextInput`, `Textarea`, `NumberInput`, `PasswordInput`, `SearchInput`, `Checkbox`, `Switch`, `RadioGroup`, `RadioOption`, `Select`, `MultiSelect`, `Combobox`: nullable form values, selection, search and async suggestions |
| Structured input | `MaskedInput`, `OTPInput`, `TagInput`, `Slider`, `RangeSlider`, `Knob`, `Rating`, `ColorPicker`, `InlineEdit`, `Wizard`, `WizardStep`, `FilterBuilder`: constrained input, editing, steps and typed recursive conditions |
| Dates | `Calendar`, `DatePicker`, `TimePicker`, `DateTimePicker`, `MonthPicker`, `YearPicker`, `DateRangePicker`: civil dates, explicit input formats, ranges and unavailable dates |
| Scheduling | `Scheduler`, `Agenda`, `Gantt`, `Kanban`: time/resource views, task dependencies and move requests |
| Navigation | `Navigation`, `NavigationItem`, `Breadcrumb`, `SideNav`, `BottomNavigation`, `AnchorNavigation`, `Tabs`, `TabPanel`, `Menubar`, `MegaMenu`, `CommandPalette`: links, current state, hierarchical actions and retained panels |
| Overlays | `Dialog`, `ConfirmDialog`, `FormDialog`, `Drawer`, `Popover`, `Tooltip`, `Menu`: shared overlay lifetime, keyboard/focus handling, positioning and confirmation flows |
| Feedback | `Alert`, `NotificationHost`, `Snackbar`, `ProgressBar`, `Spinner`, `Skeleton`, `EmptyState`: status, missing information, busy states and recovery |
| Collections | `List`, `Masonry`, `DataView`, `Listbox`, `VirtualList`, `SortableList`, `TransferList`, `InfiniteScroll`, `Timeline`: stable-key rendering, virtualization, movement and incremental loading |
| Tables | `DataTable`, `VirtualDataTable` and typed table templates: query/selection, sorting, filtering, columns, sticky regions and row/cell editing |
| Trees | `Tree`, `TreeSelect` and tree templates: hierarchy, expansion, selection and async child requests |
| Files and media | `FileUpload`, image/audio/video/PDF components, `QRCode` and `Barcode`: selection/validation, viewing/playback, encoding and decoding |
| Specialist engines | `Chart`, `Sparkline`, `MapView`, `Spreadsheet`, `CodeEditor`, `DiffViewer`, `RichTextEditor`, `MarkdownEditor`, `MarkdownPreview`, `FlowEditor`: real renderer/editor integration with app-owned data |

The detailed catalog includes additional helpers and template directives. Use exact exported names and their contracts from the API catalog rather than assuming every category has the same inputs.

## Shared integration contracts

Choose either Angular forms or app-owned `value`/`valueChange` as a control's value owner. Test nullable reset, disabled/read-only state, invalid drafts and native keyboard/IME behavior. Preserve zero, false, missing and invalid values as distinct states. The app chooses when to expose validation errors and owns actual submission and authentication.

For English built-in labels, status and diagnostics, pass `provideUiLocale({locale:'en-US', messages:uiEnglishMessages})`; use `uiJapaneseMessages` with `ja-JP` for Japanese, including a child scope within an English parent. Both dictionaries come from the generated public entry point. English starter configurations select English without a provider. Existing configurations that omit `default_language` keep Japanese defaults; add `default_language: en` and resync only when intentionally migrating. The app translates its own labels/data/errors. Explicit input settings take precedence over provider defaults. [Language switching](ui-library-consumer-guide.en.md#select-english-component-messages)

Keep civil dates separate from instants. Supply the business time zone explicitly for date-time operations. Scheduler requires `temporal-polyfill`; specialist components require the documented engines, styles and real worker/asset delivery.

Use stable keys for collections and tables. Keep drafts outside recycled virtual rows. Correlate async suggestion, load, save and movement results with the component's request ID and current app state. The app owns network cancellation, permissions, persistence and undo; a UI completion method alone does not establish backend success.

Use semantic tokens and configured profiles. Preserve input, active operations and focus across profile/language changes. Check narrow layouts, enlarged text, RTL where supported, pending/failure/retry and accessibility with the real screen. Keep actionable information and recovery paths visible.

App routing, dirty-state protection and fixed-navigation content offsets remain app responsibilities. Existing link components have not been verified in composition with Angular Router directives. Native file/media/clipboard features retain browser permission and capability limits.
