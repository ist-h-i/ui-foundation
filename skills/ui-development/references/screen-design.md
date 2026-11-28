# Screen design and component selection

Read when designing a screen or workflow, materially changing its structure, or choosing components. Apply app context and installed component contracts rather than copying a visual example. Use the [component overview](../../../docs/components.en.md), [component contracts](../../../docs/ui-components.en.md), [token design](token-design.md), [interaction checks](component-checks.md) and [runtime contracts](ui-library-runtime.md). The app owns business rules, permissions, persistence and routing.

## Start with a work unit

Identify the decision, action or information the user needs; identify the affected entity, current state, required inputs, and recovery path. Remove or combine redundant steps, duplicated labels and controls before adding instructions. Use defaults only when correct for the task and safe to change. Keep decision evidence visible when an action is available. Separate unrelated work units; independent regions may each have a primary action.

## Design the hierarchy and action group

- Establish the order of the page heading, decision-critical information, primary action and supporting detail before choosing components. Use the [hierarchy and grouping rules](token-design.md) for typography, alignment, spacing and boundaries.
- Make the primary action easy to find, usually one dominant action within the current work unit. Separate secondary actions, cancellation and destructive actions. Visual importance and the risk of executing an action are independent. Use the available public appearance API; do not invent a variant or depend on red alone. When the installed contracts provide separate emphasis and tone inputs, set them independently; keep legacy variants intact during an upgrade. Name the affected object and the result. Use a link for navigation and a native button for operations. In prose, distinguish links by underlining or another non-color cue. Indicate when a link opens a new tab. Use an icon-only action when the meaning is familiar in context and the control has an accessible name. Pair uncommon icons with visible text. Hide decorative icons from assistive technology.
- Explain a blocked action's reason and remedy near the action. Do not enable unauthorized or duplicate requests to avoid disabled buttons. Offer a correction path when correction is possible. Prefer reversible actions or recovery over unnecessary confirmations. For high-impact irreversible actions, require deliberate confirmation when prevention and recovery cannot sufficiently reduce risk.
- Verify actual text/background contrast, focus visibility and action identification without color. A status label or warning must convey meaning, not just a badge or icon. Keep actionable information available in dense, narrow and enlarged-text layouts. Use semantic roles rather than copying another design system's values.

## Choose controls from value and commitment

| Decision | Prefer | Avoid or consider |
| --- | --- | --- |
| Independent staged boolean or consent | Checkbox | Switch when later Save or Submit determines commitment |
| Immediately applied binary setting | Switch | Implying remote change succeeded before the result is known; expose pending, failure and confirmed state |
| A small set of alternative views | SegmentedControl for a short, local view choice | Choose links when each option is a distinct destination. Use tabs when each view owns a panel. |
| Small mutually exclusive choice where comparison matters | RadioGroup | Hiding important choices in a dropdown |
| Longer single selection without needed search | Select | Hiding information necessary for comparison |
| Search-assisted or remotely supplied single selection | Combobox | Uncorrelated results, confusing empty and failed queries |
| Multiple independent choices | Checkbox group or MultiSelect | Hiding selected values, allowed count or selection scope |
| Read-only information | Text or Descriptions | Disabled editable controls when editing is not offered |

Use a persistent, visible label. Put required formats and constraints before commitment; choose a width suited to expected content and available viewport. Use native form semantics and the documented field API. When the installed contracts provide hintPosition and controlCharacters, use them for pre-input constraints and an approximate editor width. Neither changes value validation. Distinguish required/optional and errors in text, not color alone; associate correction guidance with its field and use an error summary when navigation among multiple errors helps. For a staged form without a reset task, set FormActions `showReset` to false. Keep the cancel event separate from app-owned discard. Retain input after a recoverable error.

## Choose navigation and overlays

| Need | Component choice |
| --- | --- |
| Change view within the same task and object | Tabs or SegmentedControl |
| Move to another page or object | Navigation, Breadcrumb or app routing links |
| Optional supporting information | Disclosure or inline help |
| Find a section in a long document | A visible table-of-contents heading and AnchorNavigation. Use nested items when supported by the installed version, or use nested native links. |
| Ordered procedure with prerequisites | Wizard for mounted step panels and transition requests; StepNavigation if exported by the installed catalog (otherwise an app-owned progress display) when routing is separate |
| Bounded decision or input that must interrupt the task | Dialog or ConfirmDialog |
| Related detail or additional actions without replacing the task | Drawer, Popover or inline panel, according to space and focus |
| Brief supplementary explanation | Tooltip only if keyboard users can access it; do not hide essential instructions there |

Keep current location, necessary information and errors accessible. Do not hide required fields or unresolved errors exclusively inside collapsed content. Do not open a modal merely to report routine success. Preserve focus, cancellation, drafts and recovery; show the entity and consequence before an irreversible operation. The app, not visual tone or completion events, determines whether business execution succeeded.

## Choose information structures

Choose a table for comparing the same attributes across items and a list or card for independent summaries. In a resource list, use List with a typed CollectionItem template to show a title, status and local actions. Give each row an independent title link and an accessible name for each distinct action. Use trees when hierarchy serves navigation or selection. Use virtualization when real data size justifies it and retain stable keys and drafts outside recycled rows. Avoid turning comparison into a wall of unrelated cards. Use specialist engines for required editing or rendering behavior, respecting the public entry, worker and dependency contracts.

### Apply the choices to a real task

Use the existing [public API inventory](../../../docs/ui-library-api.json) to check the installed version. Match component imports and dependencies to that version. These examples specify when information and controls become available, with the app's data and result states connected explicitly.

| Screen and user goal | Composition and checks |
| --- | --- |
| **Search and bulk review** of requests | Put search, applied conditions and the result count above the table. Connect SearchPanel and FilterChips `stateChange` to the app query. Pass stable row keys to TableToolbar `selectedKeys` and connect `bulkRequested` to the selected records. State both the selection count and its scope, such as “6 selected on this page”. If the app supports all filtered results, make that a separate explicit intent and confirm its count and query before applying changes. Reassess selection on a query change. Keep unsuccessful records and offer a way to review them. [Table contracts](../../../docs/ui-library-table-expansion-spec.en.md) |
| **Read the details** of one request | Use the request name or number as the page title, Descriptions for facts, and a visible label for the status. Group decision evidence near the action it supports. “Return request” needs an explicit target and outcome. Separate an unreceived document from one known to be absent. [Text and information components](../../../docs/ui-components.en.md#text-information-and-numeric-display) |
| **Edit and save** a registration | Use FormGroup for related fields and FormErrorSummary to reach multiple errors after a submit attempt. Use FormActions `[showReset]="false"` for an ordinary edit. Connect pending, failed and saved outcomes to the app request, and preserve the original draft on failure. Use the [registration retry example](examples/dialog-retry.ts) to exercise failed save, retry and focus return. [Form contracts](../../../docs/ui-components.en.md#structured-inputs-and-form-actions) |
| **Select and inspect** items in a list plus detail layout | Keep the search and selected record stable while showing details in the adjacent region. Use a title link or native button according to whether selection changes the destination. At narrow widths provide a clear return path to the relevant result. Scope loading and “details unavailable” to the detail area when the list is usable. [List contracts](../../../docs/ui-components.en.md#lists-selection-virtualization-and-movement) |
| **Find exceptions** in an operations dashboard | Put the decision and time range first, then group counts, comparisons and actionable exceptions. Pass missing values to Statistic as `null` and reserve zero for a measured zero. Use independent AsyncRegion states for distinct sources. Display refreshed or stale values with their status and allow a local retry where safe. [Statistic and text components](../../../docs/ui-components.en.md#text-information-and-numeric-display) |
| **Complete a sequenced** application | Show sequence, current step and any incomplete requirements. Use Wizard `transitionRequested` for app-validated movement when steps remain mounted, or use StepNavigation if available for route-owned steps. Keep previous input when navigating back. Review the affected records before final submission, and show a receipt only after confirmation from the app. [Step and Wizard contracts](../../../docs/ui-components.en.md#numbers-colors-editing-steps-and-conditions) |

## Choose feedback from scope, duration and recovery

Use ActionFeedback for operation outcomes and recovery, AsyncRegion for independently loaded data, an inline error for a correctable value, and Alert for persistent important information. For stable procedural guidance, use an inline paragraph or a named aside without live announcement. Reserve Snackbar for noncritical transient events whose disappearance cannot prevent recovery. Use EmptyState only for confirmed absence; do not treat an unconfirmed response as an empty result. Choose Skeleton when showing the known layout is useful, Spinner for indeterminate progress, and ProgressBar only for measured progress. Do not block unaffected content with global loading. Keep unresolved failures, unknown outcomes, scope and recovery available; use existing request and acknowledgement contracts.

## Verify the design in the app

Can the user locate necessary information, distinguish actions without color, determine what is selected and whether an operation is committed, and correct or recover from an error? Use [interaction checks](component-checks.md) for keyboard, focus, accessible names, contrast, narrow screens and enlarged text. Distinguish visual review from interaction, static or accessibility tests. Record task-specific reasons for exceptions and evidence used to check them. Do not force a contextual design decision through a new static rule.
