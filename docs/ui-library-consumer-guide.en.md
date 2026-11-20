# Use UI Foundation in an Angular app

[English](ui-library-consumer-guide.en.md) · [日本語](ui-library-consumer-guide.ja.md)

UI Foundation generates Angular components, design tokens, a Tailwind theme, a project Skill, and a source checker from one YAML configuration. Start in an existing Angular app and choose components for the tasks people need to complete. [Component contracts](ui-components.en.md) · [Public API catalog](ui-library-api.json)

## Install and generate

Run these commands from the app root, where its `package.json` lives. Pin the version for a reproducible installation.

```sh
npm install --save-dev --save-exact @hiroshi.inoue/ui-foundation@0.1.0-beta.4
```

To use a local build, install the tarball produced by `npm pack`.

```sh
npm install --save-dev --save-exact /path/to/ui-foundation.tgz
```

After either installation, run the CLI from the app root.

```sh
./node_modules/.bin/ui-foundation --help
./node_modules/.bin/ui-foundation init
```

The package's `engines` field specifies the Node.js version. The beta was tested with Node.js 24.19.0, Angular and CDK 22.2.1, and TypeScript 6.0.3. Install the required dependencies before compiling the generated Angular code. [Application dependencies](#application-dependencies)

`init` creates `ui.config.yaml` and refuses to overwrite an existing configuration. Edit the YAML before generating. English is the default configuration language. Use `init --language ja` for Japanese. `init` stores `default_language: en` (or `ja` with `--language ja`), selecting both starter prose and the generated built-in language/Intl defaults. New English apps need no locale provider for English built-in text. Existing YAML remains unchanged by sync; if it omits this setting, generated defaults stay Japanese. Use the bundled examples as schema references. [English example](../examples/ui.config.example.en.yaml) · [日本語の例](../examples/ui.config.example.yaml)

| Field | What the app defines |
| --- | --- |
| `context` | Product, user goals, and constraints that inform design decisions |
| `primitives` | Concrete values for color, dimensions, typography, and other scales |
| `semantic` | References from roles such as body text, primary action, or page padding to primitive values |
| `profiles` | Named groups of overrides and design guidance for different contexts |
| `default_profile` | Profile ID applied by default |
| `default_language` | `en` or `ja` for generated built-in text and locale defaults; absent in older YAML means Japanese |
| `output` | Managed output directory, initially `.ui/generated` |
| `checks` | App source roots and any scoped, documented exceptions for static checking |

The `guided` and `dense` IDs in the example are editable profile names. The CLI resolves explicit token references and profile overrides. Developers use the prose in `context` and `guidance` to make layout and interaction decisions. Use the app's YAML as the source of truth for configuration changes. [Token and generation design](design.en.md)

```sh
./node_modules/.bin/ui-foundation sync --dry-run --config ui.config.yaml
./node_modules/.bin/ui-foundation sync --config ui.config.yaml
./node_modules/.bin/ui-foundation check --config ui.config.yaml
```

Track the configuration, full output directory, and `.agents/skills/project-ui/` together in version control. The generated manifest records ownership and content hashes. Put application code and custom styles in app-owned paths. To move an existing output directory, follow the CLI's migration procedure and update app-owned imports and scripts. [CLI reference](commands.en.md)

## Use the English project Skill

The installed package contains this guide under `node_modules/@hiroshi.inoue/ui-foundation/docs/` and the English Skill instructions under `node_modules/@hiroshi.inoue/ui-foundation/skills/ui-development/SKILL.md`. After `sync`, ask the AI tool to open the app root and read these files explicitly.

- `.agents/skills/project-ui/SKILL.md` for the English UI workflow (`SKILL.en.md` is also available); the legacy `SKILL.ja.md` remains for compatibility. Use English instructions and references for the standard AI workflow.
- `.agents/skills/project-ui/project-context.md` for the resolved profiles and app context.
- `ui.config.yaml` or the actual configuration path for the source settings.

The generated Skill directory stays fixed when `output` changes. The Skill's `references/docs/` directory contains the documentation shipped with the installed package, including this guide. The AI tool controls automatic discovery. Ask it to confirm which files it read, the profile it selected, and the output path before it edits the app. Have it read the generated files again after an upgrade or sync changes them.

### Ask the AI to read the files

Use the AI tool's file/attachment or local-read capability. Automatic discovery depends on that tool; install/sync success does not prove it read anything. Start with this prompt, adjusting the actual YAML path:

```text
Before implementing UI in this app, read:
- .agents/skills/project-ui/SKILL.md
- .agents/skills/project-ui/project-context.md
- ui.config.yaml

Use the English references selected by the Skill for component contracts and dependencies.
Briefly report the files you read, the selected profile and the generated output path.
Report missing or inaccessible files instead of assuming their contents.
```

Check the returned paths/profile IDs/output against your app. If the AI cannot access files, provide the required material through a capability it supports; verify its account of what it read.

### Ask for a screen or configuration change

Explain the task, data, existing operations and interactions to verify. For an app that already fetches and saves requests:

```text
Follow the project-ui workflow to implement a request list and editing screen.
Use default_profile from ui.config.yaml, the existing fetch/save operations and generated public components.
Support searching, selecting, editing and checking persistence outcomes.
Handle pending, error and partial-information states while preserving drafts.
Report changed app files, reused components, checks run and anything unverified.
```

Configuration changes belong in source YAML; regenerate instead of editing managed output. Do not require a profile-switch UI if the app uses one fixed profile.

### Provide real diagnostics and verify the result

Run the app's installed check and pass its actual diagnostic output to the AI:

```text
Read this actual ui-foundation check result and explain each relevant file/rule/reason.
Fix confirmed app-source/configuration errors, synchronize if needed, and rerun the check.
Retain unsupported static cases as warnings with reasons and recheck conditions.
Do not infer interaction, accessibility or business correctness from exit code 0.
Report exact checks and the scope left unverified.
```

Review the actual generated/app diff and the new check result. AI proposals, static checks, builds, interaction tests and human UX review establish different things.

## Load the theme

Apply the generated CSS globally. For an app with a Tailwind v4 build and `src/styles.css`, use paths relative to that stylesheet.

```css
@import "tailwindcss" source(none);
@import "../.ui/generated/tokens.css";
@import "../.ui/generated/tailwind.css";
@import "../.ui/generated/angular/styles.css";

@source "./**/*.ts";
@source "./**/*.html";
@source "../.ui/generated/angular/**/*.ts";

.app-screen {
  font-family: var(--ui-font-body);
  font-size: var(--ui-text-body);
  line-height: var(--ui-leading-body);
  color: var(--ui-color-text);
  background: var(--ui-color-background);
  padding: var(--ui-space-page);
}
```

The generated TypeScript contains inline templates, so include it in Tailwind's source scan. Apps without Tailwind can load `tokens.css` and `angular/styles.css` globally and use the same semantic CSS variables. Register the global stylesheet in the Angular build. Specialist components have additional stylesheet and asset requirements. [CSS and distribution assets](#css-and-distribution-assets)

`tokens.css` applies the default profile at `:root`. To apply another configured profile to a region, set `data-ui-profile` on that region. For a runtime switcher, use the generated `uiProfiles` export from `profiles.ts` to obtain the valid IDs and labels. Keep the form DOM, focus, and active requests when switching profiles. The app owns persistence for a user's profile choice.

## Import generated components

Choose the generated public entry point for your app.

| Entry point | When to use it |
| --- | --- |
| `angular/core.ts` | Only actions, cards, native form fields, and their icons and locale APIs. |
| `angular/index.ts` | Any other components or the complete Angular API. |

Use `core` after installing and syncing a version that provides this entry point. For example, with the default output path:

```ts
import { ActionControl, Card, FormField, FieldControl } from '../.ui/generated/angular/core';
```

The core entry resolves Angular core, common, CDK and its Angular Forms peer, RxJS, and Lucide. The app still supplies its normal Angular build and bootstrap packages. Use app-owned source files as TypeScript roots and let imports select the generated code. A glob that adds every generated TypeScript file makes the compiler resolve specialist sources too. Load the shared tokens and component styles described above. The core entry requires no app-side `sideEffects` override or specialist CSS and worker assets. The full entry remains available to existing users.

The following standalone component uses the full entry and belongs in `src/app.ts` when the app uses the default output path.

```ts
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TextInput } from '../.ui/generated/angular/index';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TextInput, ReactiveFormsModule],
  template: `
    <main class="app-screen">
      <ui-text-input controlId="application-name" label="Application name"
        [formControl]="name" />
    </main>
  `,
})
export class App {
  readonly name = new FormControl<string | null>('');
}
```

Connect controls to app-owned data and use the value type documented for each component. Verify nullable resets, disabled and read-only states, and invalid drafts with real input. Where a component provides a typed template directive, pass typed data through its public input so Angular can check the projected context. The app owns routing, unsaved-change handling, authorization, requests, and persistence.

Keep `strictTemplates` and `strictInjectionParameters` enabled. The Angular builder applies the linker to partial-compiled dependencies. For a custom pipeline, bundle the AOT output and use the Angular Babel linker from `@angular/compiler-cli/linker/babel` for partial-compiled dependencies. Preserve browser ESM and dynamic imports, and build standalone module workers where needed.

## Select English component messages

The English starter config selects English automatically through `default_language: en`; `default_language: ja` selects Japanese. Existing configs without this field preserve Japanese across upgrades. Changing the YAML default requires sync. To switch at runtime or override that default, import `uiEnglishMessages` from the generated public entry point and provide it in the app's locale options. In this example, `src/main.ts` bootstraps the standalone root from the previous section.

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import {
  provideUiLocale,
  uiEnglishMessages,
} from '../.ui/generated/angular/index';
import { App } from './app';

bootstrapApplication(App, {
  providers: [...provideUiLocale({
    locale: 'en-US',
    messages: uiEnglishMessages,
  })],
});
```

`locale` configures `Intl` formatting. `messages` selects the dictionary for library-owned text such as built-in actions, status announcements, and diagnostics. The generated default locale is `en-US` with the English dictionary when `default_language: en`; it is `ja-JP` with Japanese fallbacks when the setting is `ja` or absent. An unmapped message uses its Japanese source fallback. To override an English entry, pass a new dictionary such as `{ ...uiEnglishMessages, '検索': 'Find' }`. Keep placeholder names such as `{count}` in custom translations. The app supplies its own field labels, content, and backend errors.

For an app-wide English/Japanese switch, keep one options signal and pass it to `provideUiLocale` at bootstrap:

```ts
import { signal } from '@angular/core';
import { provideUiLocale, uiEnglishMessages, uiJapaneseMessages,
  type UiLocaleOptions } from '../.ui/generated/angular/index';

export const appLocale = signal<UiLocaleOptions>({
  locale: 'en-US', messages: uiEnglishMessages, timeZone: 'Asia/Tokyo',
});
export const localeProviders = provideUiLocale(appLocale);
export function selectLanguage(language: 'en' | 'ja'): void {
  appLocale.update(current => ({ ...current,
    locale: language === 'en' ? 'en-US' : 'ja-JP',
    messages: language === 'en' ? uiEnglishMessages : uiJapaneseMessages,
  }));
}
```

Add `...localeProviders` to the app bootstrap providers. Update the app's own translations and document `lang` with the same language selection. Keep business time zone and date input format explicit and independent of language.

For a Japanese child of an English region, supply `{ locale: 'ja-JP', messages: uiJapaneseMessages }` to `[uiLocale]`. An empty child dictionary inherits its parent's translations, so `{}` alone does not restore Japanese. The Japanese dictionary restores the built-in keys; app-specific extra keys need their own scoped overrides.

To support an app-wide language switch, pass a `Signal<UiLocaleOptions>` to `provideUiLocale` and update both `locale` and `messages` together. For one region, import the standalone `UiLocaleScope` directive and bind `[uiLocale]` to the regional options. A scope inherits parent messages and overrides the keys it supplies. Set the app document's `lang` and direction to match its content. For date and time formatting, set `timeZone` explicitly wherever the component needs one. Civil dates retain their calendar date independently of the time zone. An explicit component input takes precedence over the corresponding provider setting. [Locale and component contracts](ui-components.en.md)

## Application dependencies

The npm package installs the CLI. Install the dependencies for the generated code in the consuming app and record the exact versions in its lockfile. The beta verification setup uses Angular and CDK `22.2.1`, RxJS `7.8.2`, `@lucide/angular@1.52.0`, TypeScript `6.0.3`, and, when Tailwind is used, `tailwindcss@4.3.0`. Use your Angular compiler and builder to compile the app.

The full `angular/index.ts` entry point references components in all categories, so the application compiler must resolve these packages even for a screen that imports a single component from it. Several engines load on demand at runtime.

| Package | Tested version | Used for |
| --- | --- | --- |
| `@codemirror/autocomplete` | `6.20.3` | Autocomplete |
| `@codemirror/commands` | `6.11.1` | Editor commands |
| `@codemirror/lang-javascript` | `6.2.5` | JavaScript syntax |
| `@codemirror/lang-json` | `6.0.2` | JSON syntax |
| `@codemirror/lang-markdown` | `6.5.2` | Markdown syntax |
| `@codemirror/merge` | `6.12.2` | Diffs |
| `@codemirror/state` | `6.7.6` | Editor state |
| `@codemirror/view` | `6.43.13` | Editor rendering |
| `@dagrejs/dagre` | `3.1.1` | Flow layout |
| `echarts` | `6.1.0` | Charts and sparklines |
| `fast-formula-parser` | `1.0.19` | Spreadsheet formulas |
| `jsonc-parser` | `3.3.1` | JSON structure |
| `maplibre-gl` | `6.12.0` | Map rendering |
| `marked` | `18.1.0` | Markdown |
| `prosemirror-commands` | `1.7.2` | Rich-text commands |
| `prosemirror-history` | `1.5.1` | Rich-text history |
| `prosemirror-keymap` | `1.2.3` | Rich-text keyboard operations |
| `prosemirror-model` | `1.25.12` | Rich-text document model |
| `prosemirror-schema-basic` | `1.2.5` | Rich-text schema |
| `prosemirror-state` | `1.4.4` | Rich-text state |
| `prosemirror-view` | `1.42.6` | Rich-text rendering |
| `pdfjs-dist` | `6.4.299` | PDF |
| `qrcode` | `1.5.4` | QR codes |
| `jsbarcode` | `3.12.3` | Barcodes |
| `temporal-polyfill` | `1.0.5` | Scheduler time and time zones |

Install `@types/qrcode@1.5.6` for type checking. The generated `formula-parser.d.ts` supplies types for `fast-formula-parser`. If an independent app worker or entry point imports the parser directly, make sure its TypeScript project can see that generated declaration.

## CSS and distribution assets

Load the generated `angular/specialist.css` globally for screens using specialist components. MapView also needs the CSS from the installed MapLibre version.

The CLI, templates, Skill, and generated code carry the MIT license. Retain the package's `LICENSE` and the generated `UI-FOUNDATION-LICENSE.txt` files. Copy the generated license text into the distributable as `ui-foundation/LICENSE.txt`. Preserve third-party notices and corresponding sources alongside their assets. The CLI and checker notices cover their respective tools.

In this table, `assets/` refers to the installed UI Foundation package's assets. Copy both asset trees in full, including original notices, PDF font source archives, build recipes, and font mapping. Keep the deployment paths and component URLs in sync.

| Source | Example public location | Component setting |
| --- | --- | --- |
| `pdfjs-dist/build/pdf.worker.mjs` | `/assets/pdf/pdf.worker.mjs` | `PDFViewer.workerUrl` |
| `pdfjs-dist/{cmaps,standard_fonts,wasm,iccs}/` | Matching directories under `/assets/pdf/` | `PDFViewer.assetsBaseUrl` |
| `pdfjs-dist/LICENSE` | `/assets/pdf/LICENSE` | Retain the original license |
| `assets/pdf-source/` | `/assets/pdf/source/` | Copy the entire tree |
| `maplibre-gl/dist/maplibre-gl-worker.mjs` | `/assets/maplibre/maplibre-gl-worker.mjs` | `MapView.workerUrl` |
| `maplibre-gl/dist/maplibre-gl-shared.mjs` | Same directory as the MapLibre worker | Keep the worker's relative import |
| `maplibre-gl/dist/maplibre-gl.css` and `maplibre-gl/LICENSE.txt` | `/assets/maplibre/` | Include CSS and the original license |
| Generated `sheet-formula.worker.ts` bundled as a separate ESM entry | `/assets/sheet-formula.worker.js` | `Spreadsheet.workerUrl` |
| `assets/third-party/` | `/assets/third-party/` | Copy the entire tree, including both notices |

```html
<ui-pdf-viewer label="Application documents" [source]="pdfSource()"
  workerUrl="/assets/pdf/pdf.worker.mjs" assetsBaseUrl="/assets/pdf/" />
<ui-map label="Site locations" [markers]="markers"
  workerUrl="/assets/maplibre/maplibre-gl-worker.mjs" />
<ui-spreadsheet label="Cost worksheet" [sheet]="sheet"
  workerUrl="/assets/sheet-formula.worker.js" />
```

Match the PDF worker version to the PDF library version. Serve module workers with a JavaScript MIME type and Wasm as `application/wasm`. Check that public worker URLs serve the actual files without hitting the app's HTML fallback. Verify CSP against the deployed script, worker, stylesheet, and data origins. For a map that needs external tiles or styles, the app chooses the provider and handles access, attribution, and fallback.

Keep dynamically imported browser engine chunks and worker entries in the deployed build. For SSR, defer browser-only screens until the browser and supply appropriate server fallbacks. Verify the actual server bundle and hydration paths used by the app.

## Check changes and upgrade

The CLI's `check` validates settings, compares generated files, and scans application sources selected by `checks`. New configurations start with `checks.source_roots: [src]`. Use actual project-relative paths for those roots and for the optional `checks.tsconfig`.

```sh
./node_modules/.bin/ui-foundation check --config ui.config.yaml --format json
node .ui/generated/check-ui.cjs --config ui.config.yaml --format json
```

The generated checker runs with Node and checks the generated policy against the configuration and selected app sources. Keep it with its sibling `checker-lib/`, `policy.json`, and `CHECKER-NOTICE.txt` files. Use the full CLI for generated-file consistency and ownership checks. Keep the checker out of the browser bundle.

Fix errors in app source or the YAML, then rerun the check. Warnings record cases the static checker could not establish. `NOT_CONFIGURED` means no source scan was configured. [Static checks and scoped exceptions](static-checks.en.md)

Build the app and exercise the actual tasks in the browser after synchronization. Check supported profiles and languages with narrow layouts, longer translated labels, text zoom, and keyboard focus. Exercise pending, failure, partial-data, and retry paths and verify that a language change retains the current draft or request. For media and specialist components, verify worker startup and real asset responses. Track compile results, automated accessibility findings, observed behavior, and visual review separately.

To migrate an existing Japanese app to an English generated default, set `default_language: en`, inspect the sync diff, sync and check, then verify app-owned translations and date/number presentation. Time zone, native input format and business data are unchanged. Older CLI versions reject the new field, so rollback must restore the saved YAML with the matching package and generated files.

When updating the package or YAML, keep the previous package version, lockfile, configuration, generated files, and Skill together as a recovery point. Review dependencies and API changes. Run `sync --dry-run`, `sync`, and `check`, then repeat the applicable app checks. `npm install` updates the package in `node_modules`. `sync` updates the app's copied artifacts. [Interruption recovery](npm-beta-readiness.en.md) · [Release notes](npm-beta-release-notes.en.md)
