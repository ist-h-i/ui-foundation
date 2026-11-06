# Static checks for UI source

[Japanese](static-checks.ja.md)

The resolved YAML generates a checking policy and Node `check-ui.cjs`. It runs in the consuming repository without checker-specific npm dependencies or a ui-foundation checkout. Include the entire generated directory because it also uses `checker-lib/` and dependency notices. Normal dependencies needed to build components are separate.

Definite violations in the selected source fail. Runtime values and unknown producers that cannot be established statically remain warnings. A warning is neither a confirmed violation nor proof of safety. Record the reasons for retained warnings and the conditions for reviewing them again in the consuming app.

## Configuration and distribution

Optional `checks` in `ui.config.yaml` selects project-local source files or directories. Globs, absolute paths, parent traversal and symlinks are not supported.

```yaml
checks:
  source_roots: [src]
  tsconfig: tsconfig.app.json
  approved_components:
    - module: '@vendor/ui'
      export: AdoptedButton
      reason: External action component adopted by this project
  exceptions:
    - file: src/scroll-specimen.css
      rule: literal-token
      source: 'width:400px'
      reason: Fixed test dimension reproducing scrolling in a narrow region
```

`tsconfig`, approvals and exceptions are optional. `source_roots` cannot be empty; every root needs at least one applicable source file. Generated output, `.agents`, `.git`, `node_modules`, build/dist/coverage and similar directories are excluded. Only the selected source is checked. Older configurations without `checks` report `NOT_CONFIGURED` while retaining configuration/generated consistency checks. New `init` configurations select `src` and do not inherit the author's exceptions or external-component approvals.

```sh
# Edit the app's source configuration, then synchronize and check.
./node_modules/.bin/ui-foundation sync
./node_modules/.bin/ui-foundation check
./node_modules/.bin/ui-foundation check --format json
# Standalone source checker; examples use the default output.
node .ui/generated/check-ui.cjs --config ui.config.yaml
node .ui/generated/check-ui.cjs --root /absolute/application --config ui.config.yaml --format json
```

Add `"ui:check": "node .ui/generated/check-ui.cjs --config ui.config.yaml"` to the app's `package.json` and run it before CI/build. The CLI does not edit the app's package.json automatically. Update this command and app imports when moving output. The checker runs in Node and must not enter the browser bundle.

The standalone checker validates YAML, compares it with generated policy and scans source. Reconstructing generated output and detecting unowned files are responsibilities of the full CLI. Standalone success does not establish generation consistency. Update configuration/package version and run `./node_modules/.bin/ui-foundation sync`; generation, ownership, idempotence and migration follow the [design contract](design.en.md).

## Inputs and results

The checker parses TypeScript/Angular syntax: inline/external templates and styles, host metadata, `HostBinding`, class/style/ngClass/ngStyle and statically identifiable DOM style writes. It does not search comments or ordinary business strings as CSS, or execute app code.

`HostBinding` is identified through the real Angular export, tracking import aliases, namespaces and explicit re-exports. Even without Angular declarations in the consumer, explicit named import/re-export chains are followed for up to32 symbols. Member decorators depending on unavailable declarations remain unknown; CSS-writer completeness is not certified. All finite key candidates are checked; no argument means the member name; unknown keys and invalid types produce warnings. Conditional keys do not become unconditional producers. Exclusive class/id choices retain their computation/instance association. Choice products stop at128 candidates and report unexplored cases. `attr.style`/`attr.class` are checked; ordinary attributes such as `attr.style.color` are not mistaken for style declarations. Same-named local functions or shadows are not treated as Angular APIs.

Logical DOM-style assignments inspect every right-hand side that can write. `+=` treats the prior value as unknown and checks known fragments without promoting them to complete CSS supply values. Unsupported compound assignments and storage-changing `++`/`--` retain warnings. Numeric unary `+`, `-` and `~` use their computed result; a nonzero value is not permitted as if it were zero.

CSS uses PostCSS; SCSS follows [postcss-scss parsing](https://github.com/postcss/postcss-scss). Sass compilation, variable evaluation and mixin expansion are not run. Unresolved variables/mixins remain unknown.

| Input | Checks |
| --- | --- |
| Tokens | Colors, font families/sizes, line height, weight, spacing, radii, dimensions, borders, motion and opacity: literals, direct primitive references, undefined semantics and wrong roles. |
| CSS values | Shorthands, logical properties, functions and fallbacks, including the literal in `calc(var(--ui-space-page) + 12px)`. Zero, inheritance/reset, suitable structural keywords and dimensionless calculation coefficients are allowed. |
| Tailwind | Protected utilities and state/responsive variants: declarations from the pinned built-in parser undergo the same CSS value checks. |
| Native dimensions | HTML/SVG `width`/`height`, distinguished from same-named business inputs on Angular components. Review data dimensions by purpose; display dimensions use semantic roles. |
| Angular components/directives | Native HTML, generated components, locally declared components and standard Angular core/common/forms/router are allowed. Approve others by source module and public export. |

Generated Tailwind utilities connect to policy semantics. Local classes are checked through their CSS declarations; Emulated/ShadowDom component classes are not allowed in unrelated components. Global CSS and explicit `ViewEncapsulation.None` classes can be shared. App Tailwind configuration, plugins and imports are not executed. Numeric utilities and concrete arbitrary values violate the contract. Arbitrary-value purposes follow Tailwind type hints/default behavior: for example `text-(length:--ui-text-body)` and `border-(length:--ui-border-control)`. Unresolved slash-modifier variables warn. Named breakpoints are framework structure; explicit dimensions such as `min-[900px]` or `@min-[40rem]/sidebar`, including compound variants, need individual exceptions.

External component identity follows import aliases/re-exports. Alias names or attribute spelling alone do not grant approval. Services, pipes and models are distinguished from UI components; this is not an exhaustive acceptance check for external rendering engines.

Results include file, line/column, rule, reason, suggestion, counts, unknowns and applied exceptions, with JSON available. Violations, invalid configuration, missing targets and read/parse failures exit1. The normal CLI and standalone checker exit0 for warnings alone and retain their locations/counts.

## Finite expression tracking

Constants, arrays, concatenation and finite conditional branches are inspected. All determinable value branches are checked even when their condition is dynamic. Toggling a fixed class name creates no new class name. Input defaults, annotations alone and mutable initializers do not guarantee runtime values.

Analysis covers real-symbol-verified readonly Angular `computed`, arguments and normal returns of closed private helpers, limited Map writes and array/index loops. Membership/own-key/safe-integer throw guards narrow values only within verified builtin identity and mutation paths. Escaping values/helpers, mutation, unknown callbacks and unsupported control flow remain warnings. Guarded ASCII identifiers with fixed class prefixes are finalized only after showing they cannot reach the pinned Tailwind registry/utility grammar.

Methods on exposed instances do not acquire a closed value range even if their normal body or known replacement returns are additionally inspected. Const callable aliases, synchronous functions and limited known-own-data `Object.assign` are associated; unknown receivers/factories/spreads/accessors/keys/multiple sources remain unknown. A definite pre-initialization failure within a confirmed same execution frame, such as a synchronous IIFE, is excluded from candidates, distinct from later closures, async/generators, reflection and unknown call sites. Arbitrary methods/getters are not executed.

## CSS overrides and inheritance

Custom properties are checked against known candidates that can reach consumers. The checker does not select a cascade winner or prove exhaustive coverage of unknown writers/dynamic CSS. Conditional definitions under state/ancestors/media/supports alone cannot establish unconditional consumption. Unresolved style bags, resets, cycles and uncertain inheritance retain warnings while known literal/token violations are still detected.

Candidates retain CSS owner, applicable instance, actual native element, host computation origin, selector/condition and lookup layer. Aliases are evaluated at their defining computation origin, without borrowing dependent values from a consuming child/sibling/pseudo-element/other instance. This association is retained across multiple `styles`/`styleUrl(s)`, shared stylesheets, parent templates, same-element directives and known host metadata/HostBinding supplies. Equal stylesheet text does not allow reusing another stylesheet's reachability result.

Simple tag/class/id selectors and finite class/id bindings are checked per element/branch. Matching only some elements does not establish complete supply: missing values and unknown classes/IDs remain. Complex selectors check candidates consistent with known terminal conditions and retain unknowns. Comma-separated Angular selectors are alternatives, not a conjunction of class/tag requirements.

On one physical host, incoming parent values and child-owned values are separated at the initial lookup; dependent aliases consult all needed layers. HostBinding key choices retain independent associations even when class values are unresolved. Exclusive class/id choices are not combined as separate producers. Incoming parent values are not reflected as new child writers; child CSS/metadata/HostBinding remain candidates. Parent-scoped CSS is not copied into a child's definition pool. Actual native-ancestor supplies pass to actual descendants, not backward to siblings/hosts. `@property` inheritance boundaries, host writes and pseudo-element definitions remain distinct.

`ng-container` is transparent. Styles of non-rendering template elements are not producers. Views inside explicit `ng-template` can move to another outlet, so outer-host DOM ancestry/document reachability is not established. Known candidates from actual ancestors, same elements and component hosts inside the view remain.

External document CSS, shared None CSS and Emulated/ShadowDom scoped CSS have distinct reachability. Document selectors do not apply inside a shadow tree; inherited custom properties reaching its host differ from selector application inside it. Standard ShadowDom's own styles and None CSS supplied through Angular `SharedStylesHost` are internal candidates. Standard ShadowDom internal shared reachability can sometimes be established even if outer-host placement is unknown. Unknown encapsulation, isolated renderers and uncertain placement are not inferred as document/shared destinations.

When external global CSS or parent None CSS consumes a child's internal native element, it binds to the verified actual native element and the same instance's host resolver. Host aliases are not recomputed using a leaf's same-named values; adding a native consumer does not duplicate checking of the same host. Untransformed `:host` in None CSS is not treated as that None component's own host definition; valid global selectors and host bindings are checked. Not all routes from shared-CSS `:host` to its enclosing ShadowRoot host, arbitrary child-internal scoped CSS that avoids the host, or dynamic adopted stylesheets are covered.

Cycles use the pair of resolver environment and referenced name, not alias name alone. Same-named aliases at different computation origins are followed; true cycles at one origin remain unknown. Unexplored cases remain after alias depth32,512 candidate visits per declaration, parent depth8,32 parent branches or incoming-owner expansion budget128. Literal values outside aliases are still inspected. Diagnostics/use categories are not mixed into the computed-value cache.

## Reasoned exceptions

Placement dimensions, data colors, circles and assistive-technology clipping need individual exceptions after checking purpose and generation path. Ordinary UI values return to semantics. A use exception is a limited token-requirement permission, not approval of actual dimensions, interactions or arbitrary-input safety.

Match exactly one diagnostic using file, rule and the complete JSON `source` snippet. Repeated snippets can be narrowed by `line`/`column`. Moved positions, no match, multiple matches or duplicate exceptions are configuration errors. Explain the use and why it is not tokenized. Exceptions remain separately listed and do not alter input source. Whole-file exclusions, automatic approvals from detections and exceptions hiding read/parse failures are unsupported.

Alias violations include the consumer declaration and ` :: name=candidate-value` in `source`, so a literal-only exception cannot silently approve new overrides/dependencies. If an old exception also matches a new candidate, multiple-match failure results. Regressions detect changes to the supporting source/helpers of authoring structural/data exceptions. That evidence preservation is not a standalone proof of arbitrary data flow.

## Verification scope and completion

Completion means these rules run on selected source and retained warnings have traceable reasons/recheck conditions. Arbitrary runtime data flow, unknown CSS supply, the full cascade, external engine internals, real user understanding and overall visual/accessibility quality need separate verification. Passing finite browser tests of DOM measurements, image decoding, async updates or interaction sequences does not by itself resolve static Unknowns.
