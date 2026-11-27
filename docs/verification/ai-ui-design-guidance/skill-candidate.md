# Candidate AI UI design guidance — review draft

This is a proposed instruction set for issue #65. It is not part of the distributed Skill. Integrate only after the review confirms the scope. Do not copy DADS visual values or add duplicate component runtime rules.

## Proposed addition to token-design.md

Design the hierarchy before choosing tokens. Make the task title, decision-critical information, primary action and supporting details distinguishable by position, typography, grouping and spacing, not by color alone. Keep labels, values and their actions together; separate groups with more space than the space within a group. Align comparable values. Prefer a heading and spacing to a new bordered surface unless the boundary identifies a separate entity or action scope. Use semantic roles and the selected profile rather than literal values. Dense layouts may present more information but must retain the information and controls needed to decide, act and recover.

## Proposed on-demand screen-design reference

Read when planning or materially changing a screen, a workflow, or component selection. Use the existing component catalog, component-checks and runtime contracts for supported APIs and interaction tests.

1. Define the work unit: what must the user decide, change or inspect; what identifies the affected entity; what must remain available to complete the task? Remove or combine steps and controls that do not serve that unit.
2. Choose the information structure: group information by decision or action; use a table when users compare the same attributes across items; use cards when independently meaningful items need their own summary. Avoid nested cards or repeated decorative framing without a grouping function.
3. Choose the action hierarchy: normally one visually dominant action per work unit; independent regions may have independent primary actions. Separate cancellation and destructive actions from routine confirmation. Name the action and make its target and outcome clear. Explain why a required control is unavailable and how to proceed. Do not permit an unauthorized or duplicate operation to avoid a disabled state.
4. Choose controls by value and commitment: use Checkbox for staged boolean choices and consent, Switch for immediately applied binary settings whose effect or confirmed status can be observed, RadioGroup for a small set of mutually exclusive choices that benefit from simultaneous comparison, Select for a longer list when search is not needed, Combobox for search-assisted single selection, and Checkbox/MultiSelect for multiple independent choices. Respect existing component contracts. Do not imply that an asynchronous setting has been saved until its result is known.
5. Keep labels visible while values are entered. Put input constraints where they are needed before committing. Associate errors with the affected input and offer a correction or recovery action. Keep optional explanatory text subordinate to the decision.
6. Use tabs for alternative views within the same task context, navigation for distinct destinations, and disclosure for optional detail. Do not hide essential information or an unresolved error behind a collapsed control. Use steps when order and prerequisites genuinely constrain completion; preserve earlier input when returning.
7. Interrupt the task with a modal only when the user must focus on a bounded decision or confirmation before continuing. Prefer inline information or local controls for nonblocking changes. Show the affected entity and consequence before an irreversible operation. Preserve cancellation and recovery where supported.
8. Scope asynchronous feedback to the affected region. Show important unresolved failures and required actions persistently; reserve transient feedback for noncritical events whose loss does not prevent recovery. Keep unaffected data and actions usable. Distinguish pending, empty, failed, partially available and unknown results. Reuse existing state and retry contracts.
9. Check the proposed design against the actual task: can a user locate the necessary information, distinguish actions without color, understand whether an operation is committed, identify selected items and their scope, and correct or recover from an error? Use existing component checks for keyboard, focus, accessible names, contrast, narrow screens and enlarged text. Record a task-specific reason and verification for any departure from these defaults.

## Proposed SKILL.md entry condition

When designing a screen or selecting components, read the screen-design reference and the relevant component and runtime contracts. For a localized behavior fix, use only the relevant existing contracts and checks.
