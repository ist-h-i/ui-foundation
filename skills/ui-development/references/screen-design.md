# Screen design and component selection

Read when designing a screen or workflow, materially changing its structure, or choosing components. Apply app context and installed component contracts rather than copying a visual example. Use the [component overview](../../../docs/components.en.md), [component contracts](../../../docs/ui-components.en.md), [token design](token-design.md), [interaction checks](component-checks.md) and [runtime contracts](ui-library-runtime.md). The app owns business rules, permissions, persistence and routing.

## Start with a work unit

Identify the decision, action or information the user needs; identify the affected entity, current state, required inputs, and recovery path. Remove or combine redundant steps, duplicated labels and controls before adding instructions. Use defaults only when correct for the task and safe to change. Keep decision evidence visible when an action is available. Separate unrelated work units; independent regions may each have a primary action.

## Design the hierarchy and action group

- Identify the main heading, information groups, decision-critical values, primary action and supporting information. Use semantic heading levels independently of visual appearance. Align comparable labels and values. Group related elements with smaller gaps; separate groups with larger gaps. Prefer headings and spacing over decorative borders, shadows and nested cards. Add framing when it identifies a distinct entity, state or interaction scope.
- Make the primary action easy to find, usually one dominant action within the current work unit. Separate secondary actions, cancellation and destructive actions. Visual importance and the risk of executing an action are independent. Use the available public appearance API; do not invent a variant or depend on red alone. When the installed contracts provide separate emphasis and tone inputs, set them independently; keep legacy variants intact during an upgrade. Name the affected object and the result. Use a link for navigation and a native button for operations; use an icon alone only when its meaning is clear and it has an accessible name.
- Explain a blocked action's reason and remedy near the action. Do not enable unauthorized or duplicate requests to avoid disabled buttons. Offer a correction path when correction is possible. Prefer reversible actions or recovery over unnecessary confirmations. For high-impact irreversible actions, require deliberate confirmation when prevention and recovery cannot sufficiently reduce risk.
- Verify actual text/background contrast, focus visibility and action identification without color. A status label or warning must convey meaning, not just a badge or icon. Keep actionable information available in dense, narrow and enlarged-text layouts. Use semantic roles rather than copying another design system's values.

## Choose controls from value and commitment

| Decision | Prefer | Avoid or consider |
| --- | --- | --- |
| Independent staged boolean or consent | Checkbox | Switch when later Save or Submit determines commitment |
| Immediately applied binary setting | Switch | Implying remote change succeeded before the result is known; expose pending, failure and confirmed state |
| Two or a few alternative views | SegmentedControl when appropriate | Switch for unrelated alternatives; navigation when switching within the same task |
| Small mutually exclusive choice where comparison matters | RadioGroup | Hiding important choices in a dropdown |
| Longer single selection without needed search | Select | Hiding information necessary for comparison |
| Search-assisted or remotely supplied single selection | Combobox | Uncorrelated results, confusing empty and failed queries |
| Multiple independent choices | Checkbox group or MultiSelect | Hiding selected values, allowed count or selection scope |
| Read-only information | Text or Descriptions | Disabled editable controls when editing is not offered |

Use a persistent, visible label. Put required formats and constraints before commitment; choose a width suited to expected content and available viewport. Use native form semantics and the documented field API. When the installed contracts provide hintPosition and controlCharacters, use them for pre-input constraints and an approximate editor width. Neither changes value validation. Distinguish required/optional and errors in text, not color alone; associate correction guidance with its field and use an error summary when navigation among multiple errors helps. Keep reset out of routine action groups unless clearing inputs serves the task. Retain input after a recoverable error.

## Choose navigation and overlays

| Need | Component choice |
| --- | --- |
| Change view within the same task and object | Tabs or SegmentedControl |
| Move to another page or object | Navigation, Breadcrumb or app routing links |
| Optional supporting information | Disclosure or inline help |
| Ordered procedure with prerequisites | Wizard for mounted step panels and transition requests; StepNavigation if exported by the installed catalog (otherwise an app-owned progress display) when routing is separate |
| Bounded decision or input that must interrupt the task | Dialog or ConfirmDialog |
| Related detail or additional actions without replacing the task | Drawer, Popover or inline panel, according to space and focus |
| Brief supplementary explanation | Tooltip only if keyboard users can access it; do not hide essential instructions there |

Keep current location, necessary information and errors accessible. Do not hide required fields or unresolved errors exclusively inside collapsed content. Do not open a modal merely to report routine success. Preserve focus, cancellation, drafts and recovery; show the entity and consequence before an irreversible operation. The app, not visual tone or completion events, determines whether business execution succeeded.

## Choose information structures

Use a table for comparing the same attributes across items; use a list or card for independent summaries or heterogeneous items. Use trees when hierarchy serves navigation or selection. Use virtualization when real data size justifies it and retain stable keys and drafts outside recycled rows. Avoid turning comparison into a wall of unrelated cards. Use specialist engines for required editing or rendering behavior, respecting the public entry, worker and dependency contracts.

| Screen | Compose and verify |
| --- | --- |
| List and search | SearchInput/SearchPanel, FilterChips, DataTable or List, TableToolbar and Pagination when needed. Show applied conditions, result and selected counts, selection scope (visible page or all filtered results), and clear/reset. Put bulk actions next to their selected scope. Distinguish empty from unavailable data. |
| Detail | PageFrame, headings, Descriptions and grouped actions. Keep entity identity, current state and decision information visible; show missing information explicitly. |
| Edit or application | FormLayout/FormGroup, appropriate inputs, FormErrorSummary and FormActions as needed. Explain constraints before entry, retain drafts and show save result or recovery. Omit unnecessary reset. |
| List plus detail | Preserve selection, query and scroll where useful. Keep the selected object obvious; at narrow widths provide a clear return path. |
| Dashboard | Group indicators by the decisions they support. Use Statistic, Chart or table according to the comparison. Scope AsyncRegion to independently loaded areas; keep unaffected areas usable. Never turn missing values into zero. |
| Multi-step procedure | Show position, prerequisites and completion; preserve earlier input and distinguish UI progress from confirmed submission. Allow return or jump only when the app supports it. |

These are composition examples, not mandatory page templates. Inspect public APIs and use only the parts needed.

## Choose feedback from scope, duration and recovery

Use ActionFeedback for operation outcomes and recovery; AsyncRegion for independently loaded data; an inline error for a correctable value; Alert for persistent important information; Snackbar for noncritical transient events whose disappearance cannot prevent action or recovery. Use EmptyState only for confirmed absence; do not treat an unconfirmed response as an empty result. Choose Skeleton when showing the known layout is useful, Spinner for indeterminate progress, and ProgressBar only for measured progress. Do not block unaffected content with global loading. Keep unresolved failures, unknown outcomes, scope and recovery available; use existing request and acknowledgement contracts.

## Verify the design in the app

Can the user locate necessary information, distinguish actions without color, determine what is selected and whether an operation is committed, and correct or recover from an error? Use [interaction checks](component-checks.md) for keyboard, focus, accessible names, contrast, narrow screens and enlarged text. Distinguish visual review from interaction, static or accessibility tests. Record task-specific reasons for exceptions and evidence used to check them. Do not force a contextual design decision through a new static rule.
