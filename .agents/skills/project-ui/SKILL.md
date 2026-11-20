---
name: project-ui
description: Design and implement UI for this project using its persona profiles, two-layer design tokens, generated Angular components and Tailwind theme. Use for UI changes or explicit UI configuration work.
---

# Project UI development

[Legacy Japanese workflow](SKILL.ja.md)

Use these English instructions and English references for AI-assisted UI design, implementation, and configuration. The legacy Japanese Skill entry remains for existing consumers; human-facing guides provide English and Japanese editions.

## Read the app context

After sync, read the generated Skill's adjacent `project-context.md` and the app's source YAML. Identify the user goal, usage constraints, active profile, and generated output path. Use the profile's `guidance` as design context. Make concrete token changes in the app's YAML.

- Follow the integration steps for dependencies, assets, English messages, and updates. [English consumer guide](references/docs/ui-library-consumer-guide.en.md)
- Check token roles and generated-file ownership before changing configuration. [Design contract](references/docs/design.en.md)
- Confirm inputs, outputs, and interaction behavior for the components you use. [Component contracts](references/docs/ui-components.en.md) · [Public API catalog](references/docs/ui-library-api.json)
- For advanced forms, locale scopes, RTL, and specialist components, check the runtime contracts. [Runtime integration contracts](references/ui-library-runtime.md)
- Check CLI flags and recovery procedures when changing the output location. [CLI reference](references/docs/commands.en.md)

After sync, the generated Skill and its references are available under `.agents/skills/project-ui/` in the app.

## Design and synchronize

1. Identify the user's immediate task, the information they need to decide, and the actions and recovery paths they need. Determine the expected devices and usage conditions from app context.
2. Reuse the app's components and choose a valid profile. Apply a profile to a particular region with `data-ui-profile`. Keep focus, form input, and active requests when the profile changes.
3. Use primitive values in YAML and refer to semantic roles from application styles. Use `bg-color-action` for an action background, `text-color-on-action` for its text, and `text-size-body` for a text size. Create a separate semantic role when two uses have different meanings, even if their current values match.
4. For a design configuration change, edit the app's YAML. Review `sync --dry-run`, run `sync`, then run `check` with the installed CLI from the app root. Keep business logic in app-owned code and managed output under generator ownership.
5. If the output directory moves, consult the CLI reference and verify old and new ownership in the dry run. For a legacy v1 project without an ownership registry, sync once at the old path or supply `sync --from-output <previous-output>`. Update app imports explicitly and run a single sync at a time in the app root.

## Implement the interaction

Before adding a screen or shared component, compare its path with `checks.source_roots` in the app YAML. Use the generated public entry points and app-owned components or wrappers. [Source coverage and import diagnostics](references/docs/static-checks.en.md)

Check the standard component’s public API for variants, state, and appearance. Set page layout and custom component styles in app-owned files using semantic tokens. [Consumer styling example](references/docs/ui-library-consumer-guide.en.md#css-and-distribution-assets)

Use the generated `angular/core.ts` entry for the action, card, and native form-field APIs it exports. Use `angular/index.ts` for other components. Load the global styles described in the consumer guide. For icons, install the compatible `@lucide/angular` version and register the icons the app uses with `provideUiIcons`.

New configurations use `default_language: en`, so built-in text defaults to English without a provider. Japanese starters use `ja`; existing YAML without this field stays Japanese after sync. Do not change an existing app's language implicitly. For a runtime English override, pass `{ locale: 'en-US', messages: uiEnglishMessages }` to `provideUiLocale`, with both exports imported from the generated public entry point. Use the app's own translation system for labels, content, and business errors. Keep an app-controlled locale and update the dictionary alongside it when switching languages. A scope can override parent settings through `UiLocaleScope`. For Japanese text, use `{ locale: 'ja-JP', messages: uiJapaneseMessages }` from the same entry point. Supply the Japanese dictionary explicitly in a Japanese child of an English scope; an empty dictionary inherits the parent translations.

Treat pending, failed, partially available, stale, and unknown results as distinct states. Keep the draft and the information the user can still act on. Connect a component's request events and public completion methods to the app's actual operations. The app owns I/O, permissions, deduplication, and confirmation that persistence, cancellation, or undo succeeded. Correlate responses with request IDs where the public contract supplies them.

Use the relevant component contracts to guide implementation and choose the checks for the screen.

| Screen area | Decisions and checks |
| --- | --- |
| Layout and navigation | Keep required actions available at narrow widths and large text sizes. Use native navigation links and app-owned routing. For tabs and collapsed panels, retain drafts and test focus after the active panel changes or disappears. |
| Buttons, overlays, and notifications | Use native buttons and links. Give busy states a description and prevent duplicate actions. Keep popup content in its modal's scope. Test Escape, keyboard traversal, restoration of owned focus, and the app's confirmation and failure paths. |
| Forms and structured input | Match the documented CVA value types and test nullable reset, disabled, read-only, and validation. Preserve invalid drafts. Correlate asynchronous suggestions with both the query and request ID. Test keyboard and IME behavior where the component edits text. |
| Lists, tables, and virtualization | Use stable item keys and typed templates. Let the app own server-side query state. Persist drafts outside recycled rows, and test selection, keyboard focus, and scroll position when data or viewport size changes. |
| Date, time, and numbers | Keep civil dates separate from instants and supply the business time zone explicitly. Preserve incomplete input across formatting changes. Verify zero, false, missing, and invalid values as distinct cases. |
| Editors, media, and other specialist components | Follow the public worker and asset contracts. Test real HTTP responses, engine startup, failures, and retry. Keep app-owned source text or data available when rendering or processing fails. |

## Verify and report

When changing save, retry, or dialog focus, adapt the [optional registration retry test](references/docs/ui-library-consumer-guide.en.md#optional-browser-test-for-retrying-a-save) to the app.

Run the installed CLI's `check`, app type checks and build, and focused browser tests of the changed tasks. Where configured, the source checker scans the selected Angular, CSS, and SCSS files. Record warnings and skipped checks with the scope they leave open. Fix generation mismatches by updating the source configuration and rerunning sync.

Read `NOT_CONFIGURED` as an unperformed source check. Review uncovered Angular projects and expand the configured roots when those projects belong in scope. Correct definite violations, and review warnings individually before changing the app. When a reviewed baseline is enabled, fix new violations and track existing findings. Keep baseline changes explicit, and record a reason and review trigger for each intentional exception. [Check results and scoped exceptions](references/docs/static-checks.en.md)

For each relevant profile and language, inspect the layout at narrow widths and enlarged text. Verify keyboard focus, reduced motion, visible and accessible labels, and what happens when the user changes settings during editing or a request. Check success, pending, failure, missing data, and recovery with the app's actual inputs. Distinguish build and static-check results, observed interactions, automated accessibility results, and visual or user review.
