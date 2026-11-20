# Profiles and two-layer token design

[Japanese](design.md)

## Purpose

The foundation lets the same UI components vary substantially in color, spacing, typography, dimensions and shape for user goals, experience and environments. AI proposes configuration and composition; ordinary programs generate/check from adopted YAML. There is no runtime LLM API.

Two-layer tokens and profiles are the initial structure. There is no compatibility layer for old preset/density settings, CSS variables or generation paths.

## Source configuration

The app owns `ui.config.yaml` as its sole configuration source. Bundled `examples/ui.config.example.yaml` and its English counterpart are starter schemas.

- `schema_version: 1`: initial schema.
- `context`: product/goals/constraints, used as AI decision context.
- `output`: project-local dedicated generated directory.
- `default_profile`: default profile ID.
- `default_language`: optional `en`/`ja`, selecting initial built-in messages/Intl locale. Init writes `en`; `init --language ja` writes `ja`; older omitted settings retain Japanese. Time zone, native date-input format, business data and visual tokens are unchanged.
- `primitives`: names mapped to `{ type, value }`, the only layer holding concrete design values.
- `semantic`: roles referencing primitive names, forming the base for all profiles.
- `profiles`: IDs mapped to label, context (audience/usage/goals/constraints), guidance and semantic overrides.

Generated `angular/locale-defaults.ts` is generator-owned; change language in YAML. Runtime provider/scope/explicit-prop precedence is retained. Rollback to older CLIs restores saved YAML without the new field together with its matching package/output.

The CLI does not infer appearance from context/guidance prose. Profiles are not automatically selected by age/role; the app applies an initial choice or an explicit user selection. AI may propose new palettes/scales; no fixed aesthetic or palette is required.

Primitive types: `color` (opaque3/6-digit hex), `length` (nonnegative px/rem/em), `fontFamily` (local font list), `number` (finite nonnegative), `duration` (nonnegative ms/s), and `easing` (standard CSS names). Arbitrary CSS, URLs and var() expressions are not accepted. Semantic tokens directly reference primitives; there are no semantic-to-semantic references or cycles.

Names use `category.kebab-case-role`. Additional roles are supported. Foundation-required roles and reference types are:

| Category | Required roles | Type |
| --- | --- | --- |
| color | text, muted, surface, background, border, action, action-hover, on-action, link, tab-selected, danger, danger-hover, on-danger, success, success-surface, warning, warning-surface, error-surface, focus, disabled-surface, backdrop, shadow | color |
| font | body, code | fontFamily |
| text | body, small, heading, avatar | length |
| leading | body, heading, control | number |
| weight | body, heading, control | number |
| space | page, section, field, control-x, control-y, control-gap, table-x, table-y | length |
| radius | control, surface | length |
| size | control, icon, dialog, content, table-column-min, table-viewport, input-max-height, form-label, grid-item, sidebar, avatar, elevation-blur, overlay-min, dialog-min, drawer-inline, drawer-block, navigation-rail, mega-menu, navigation-column, knob, collection-item, collection-viewport, media-viewport, visualization-viewport | length |
| border | control, focus, focus-offset | length |
| motion | duration | duration |
| motion | easing | easing |
| opacity | watermark, map-region | number |

Opacity values range from 0 to 1.

Avatar text uses `text.avatar`; map-region opacity uses `opacity.map-region`. Add these roles to older configurations before resync. The example maps avatar text to its existing avatar-dimension primitive and opacity to0.25, preserving both profiles' earlier appearance.

Unsupported versions, unknown structural fields, duplicate keys, missing references, wrong types, missing required roles, unknown default-profile IDs and unsafe values are rejected with location/reason. Defined text/background pairs are contrast-checked per profile. That numeric check does not establish overall UX/accessibility acceptance.

`size.collection-item`/`size.collection-viewport` are positive lengths for fixed-height virtual lists; `size.media-viewport` is for media; `size.visualization-viewport` is for diagrams. They differ from `size.table-viewport` and may reference independent primitives per profile. Even if all sample viewports use480px, components read purpose-specific semantics. Catalog numbers, map coordinates, image pixels and QR encoding pixels are data, distinct from UI-color/dimension configuration.

`color.action`/`color.action-hover` are primary-action backgrounds and `color.on-action` is their text. Navigation/breadcrumb text uses `color.link`; selected-tab text/underline uses `color.tab-selected`. Roles can reference the same primitive when concrete colors match. Normal transparent links are used over surface/background; hover/current links over background. Both pairs are checked at4.5:1. Selected tabs are checked against explicit surface at4.5:1. Do not reuse bright action backgrounds as link/tab text. Verify any additional app-owned backgrounds separately.

## Generation and use

```text
Users, goals and environment
  → people/AI propose primitives and mappings
  → adopt YAML
  → validate types and resolve every profile
      ├─ tokens.css (primitives and every profile's semantic tokens)
      ├─ tailwind.css (@theme inline connections to the same tokens)
      ├─ angular/ (semantic-token components and structural CSS)
      ├─ profiles.ts / resolved.json / policy.json / check-ui.cjs / CHECKER-NOTICE.txt / manifest.json
      └─ .agents/skills/project-ui/ (app context and AI design instructions)
```

CSS variables use `--ui-p-...` and `--ui-category-role`. Components/screens use only semantic tokens. Tailwind `bg-color-action`, `px-control-x`, `font-family-body` and similar utilities connect to the same variables. Literal numeric/arbitrary utilities are not the standard design workflow.

Because Tailwind shares `text-*` between color/font size and `font-*` between family/weight, generated names distinguish purpose: `bg-color-action`/`text-color-on-action`, `text-size-body`, `font-family-body`, `font-weight-body`. Adding the same body/control role in different categories does not overwrite the other. Additional roles producing colliding theme variables, such as spacing/size, are rejected with location. There are no aliases for old utility names.

`:root` receives the default profile. Each `data-ui-profile="ID"` scope redefines all semantic mappings, preventing outer-profile leakage through partial inheritance even when nested. The app prevents selecting unknown IDs.

Tailwind v4 uses top-level `@theme inline`. Generate CSS and load it rather than passing YAML directly to Tailwind. See the [official theme specification](https://tailwindcss.com/docs/theme#referencing-other-variables) and [CLI](https://tailwindcss.com/docs/installation/tailwind-cli).

Init creates a starter without overwriting files. `sync --dry-run` reports changes without writing output; sync deterministically generates the same content for the same input/tool version. Previous-manifest checks reject manual edits, unowned-file collisions, symlinks and output outside the project. Check verifies configuration/output agreement and manifest ownership. Optional `checks` additionally scans selected Angular/CSS/SCSS source; see [targets, exceptions and unknowns](static-checks.en.md).

The fixed Skill's ownership.json holds schema_version/output/manifest_path; its hash is owned by the output's v1 manifest. The registry does not hash the manifest itself. Output migration reads the old manifest from this machine metadata and verifies old/new output plus all Skill files. It removes only old-owned files, then establishes new manifest, registry update and old-manifest retirement. Ordinary I/O failures restore every attempted file, including both manifests/registry. Sync and dry-run exclusively acquire root `.ui-foundation-sync.lock` and reject concurrent runs. Successful ordinary restoration removes the run's marker; forced termination/incomplete restoration leaves it to block later sync. Neither PID nor age automatically clears it. Atomic multi-file transactions/automatic forced-termination recovery are not guaranteed; follow [interruption recovery](npm-beta-readiness.en.md#concurrent-execution-and-interruption).

Legacy v1 without a registry upgrades by sync at the same output. Combining first upgrade and output movement requires sync-only `--from-output <previous-output>`, also compatible with dry-run. Explicit old paths do not bypass corrupt registries/hash mismatches. The tool does not parse prose context, search all project manifests or adopt same-content unowned files. There is one active fixed-Skill owner per project root. Case-only moves are rejected; parent/child moves still check ownership of all existing files.

The CLI owns generated output/Skill. Feature code, business tests and custom extensions are not synchronized. Track generated files in Git. Existing safe pending/error/recovery/focus/input-retention behavior connects to the new tokens without adding compatibility APIs.

## Screen composition and AI

Profile guidance informs information priority, lists/stepwise input and assistance. AI verifies user goals/target features and implements suitable composition. YAML is not a duplicate definition of every screen DOM/business rule; the CLI does not automatically generate screens from prose.

`size.sidebar` controls PageFrame sidebar width. Container/Grid default padding/gaps use existing spacing roles. Explicit app widths/ratios/scroll coordinates are placement controls.

`size.drawer-inline` and `size.drawer-block` independently control left/right width and top/bottom height, explicitly mapped in source YAML for guided/dense. Explicit pixel dimensions and BottomSheet viewport ratios are placement control, not direct component access to color/typography/spacing primitives.
