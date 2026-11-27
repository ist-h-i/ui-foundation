# Release notes

[Japanese](npm-beta-release-notes.ja.md)

Consumer changes through `@hiroshi.inoue/ui-foundation@0.2.0`. Original CLI/templates/Skill/generated code use the MIT License (2026 Hiroshi Inoue). Existing third-party terms apply to their assets.

## 0.2.0

- Import `Stack` and other layout components from `angular/layout` and `Disclosure` from `angular/disclosure`. Both public entries work with Angular Core without CDK or specialist dependencies. [Issue #55](https://github.com/ist-h-i/ui-foundation/issues/55)
- `FormField` loads only its own built-in labels when used with native controls from `angular/core` or `angular/forms`. Existing message IDs and translation overrides still work. [Issue #54](https://github.com/ist-h-i/ui-foundation/issues/54)
- Generated icons, charts, and CodeEditor languages load less code. Apps sharing icon registrations with native Lucide directives or providers must enable `icons.lucide_interop` in YAML and use the provider from `angular/icons/lucide`. [Icon registration and migration](ui-library-consumer-guide.en.md#register-icons)

Keep the previous package version, lockfile, YAML, generated files and Skill together as a recovery point. Install `0.2.0`, run `sync --dry-run`, `sync`, and `check`, then rebuild and verify the screens you use. [Upgrade and recovery](npm-beta-readiness.en.md#upgrade-and-recovery)

## 0.1.0

The first regular release uses Angular/CDK 22.3.0 and adds the lightweight `angular/forms` entry for text controls. The beta.6 candidate introduced this entry and updated PDF loading, virtual row behavior, form handling during text composition, and clipboard feedback.

- From `beta.4`, migrate Japanese translation keys and overrides to stable message IDs with named arguments. [Message migration and rollback](ui-message-migration.en.md)
- From `beta.4` or `beta.5`, align app dependencies with the verified versions for `0.1.0` and use `angular/forms` when your screen needs only its text controls. If your app stays on Angular 21, keep its verified package version pinned until you can move to the tested Angular version. [Application dependencies](ui-library-consumer-guide.en.md#application-dependencies)
- Save a recovery point, install the new version, and run `sync --dry-run`, `sync`, and `check`. Build the app and exercise its main interactions. [Upgrade and recovery](npm-beta-readiness.en.md#upgrade-and-recovery)

## beta.5: Breaking change to library translations

Library messages use stable IDs and typed named arguments. The runtime locale selects built-in English or Japanese. Apps can supply an external translator to override those messages and keep their own text under app ownership. The old Japanese-key dictionaries and message pipe are removed. The English `SKILL.md` is the single AI entry point.

Keep `0.1.0-beta.4` and its matching app checkpoint to continue using Japanese keys. Choose beta.5 explicitly when ready to convert the app's overrides and synchronize. Beta.5 was published under `next`. [Key mapping, upgrade and rollback](ui-message-migration.en.md)

## beta.4: English AI references and bilingual human contracts

The standard AI Skill, runtime/token reference instructions, generated-context prose and optional authoring-reference notices use English. Existing Japanese Skill entry points remain for compatibility; app-authored context and labels retain their own language. Human-facing design, full component APIs, static checks, beta recovery and Tree/Scheduler/Table/Media/Specialist/Runtime guides now have English and Japanese editions. Standard AI links select English references, including the copies in the synced Skill. This changes documentation and generated guidance, not component runtime APIs or locale selection.

After updating the package, review sync --dry-run and resync to replace copied guidance/documents. Edited/unowned generated files remain protected. Run check and app verification; rollback restores the matching saved package/lockfile/YAML/output/Skill as a unit. Original third-party legal text and corresponding-source archives are retained; the PDF source guide has a Japanese counterpart.

## beta.3: English-first UI with Japanese support

English is the primary README, CLI/component guidance and project Skill language. Japanese documentation and the Japanese Skill remain bundled. New `init` configurations select English built-in text and `en-US` formatting without a locale provider; `init --language ja` selects Japanese. Existing YAML that omits `default_language` keeps Japanese defaults after sync.

Both dictionaries are available from the generated entry point. Language switches preserve inputs and retained feedback; app-owned labels, data and backend errors stay under the app's translation system. In English dictionaries, override dynamic messages by their parameterized key (such as `{limit}件まで選択してください。`), not just a completed instance. Detailed specialist references still include Japanese prose.

Upgrade the package and lockfile, review `sync --dry-run`, sync, check, then build and test the app. To opt an existing app into English defaults, explicitly set `default_language: en` and verify app-owned translations plus date/number presentation. Time zone, native input format and tokens are unchanged. Older CLIs reject the new field; rollback restores the matching saved package, YAML, generated files and Skill together.

The release lockfile uses Zod 4.6.7 within Angular Forms' supported range to address the known oversized-collection memory exhaustion advisory affecting versions before 4.6.6. Consuming apps manage their own dependency lockfiles and should select a patched transitive Zod version.

## beta.2 changes

- npm `docs/` and generated Skill `references/docs/` contain consumer documentation: installation, CLI, component catalog, API, configuration, static checks, upgrade/recovery.
- Development plans, ADRs, requirement matrices and audit/verification history remain in the authoring repository. Consumer feature limits and license/notice/corresponding-source delivery obligations remain documented in the package.
- README/usage installation examples, document placement/update instructions and explicit AI Skill-loading steps were updated. YAML schema_version=1 and component APIs were retained.

## Upgrading from beta.1

Save old CLI version, lockfile, YAML, generated output and Skill together before updating the CLI to beta.2. npm updates alone do not update copied output/documents.

Review `sync --dry-run` then resync. Former beta.1-owned developer documents/ADRs/requirement matrices retire. Manually edited owned files stop synchronization rather than being silently deleted. Save needed additions outside generated regions and verify ownership/file correspondence before resync. Unowned-file adoption and forced overwrite are unsupported.

After resync, run check, app typecheck/build and key interactions. Manage YAML/output/Skill/app changes together rather than partially copying generated files. Follow the [asset guide](ui-library-consumer-guide.en.md#css-and-distribution-assets) for third-party notices, workers and PDF source kit.

## Rollback and limits

Restore the saved CLI and matching lockfile/YAML/output/Skill to the same recovery point, then run its check and app verification. Do not mix manifests or claim recovery by adopting/deleting unowned files. Follow [interruption recovery](npm-beta-readiness.en.md#concurrent-execution-and-interruption) for retained markers.

The full `angular/index.ts` entry includes specialist components and requires the listed engines. Verify your app's browsers, persistence, and undo behavior with its own deployment. [Application dependencies](ui-library-consumer-guide.en.md#application-dependencies)
