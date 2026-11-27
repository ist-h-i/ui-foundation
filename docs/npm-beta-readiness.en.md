# Installation, upgrade and recovery contract

[Japanese](npm-beta-readiness.ja.md)

This is the installation, upgrade and recovery contract for `@hiroshi.inoue/ui-foundation@0.2.0`. Original CLI/templates/Skill/generated code use the MIT License (2026 Hiroshi Inoue). Existing third-party terms are retained.

## Tested environment and public contract

| Boundary | Contract |
| --- | --- |
| Distribution | The npm package provides a CLI that generates Angular source, CSS, Skill, and a source checker. The app compiles the generated source. |
| Node and OS | Node.js **24.19.0** on macOS arm64. |
| Consumer | Angular/CDK 22.3.0 and TypeScript 6.0.3. Follow the [dependency guide](ui-library-consumer-guide.en.md#application-dependencies) for foundation and specialist dependencies. |
| Browser | Focused interactions were verified in Playwright Chromium. Verify other browsers and assistive technology in your app. |
| API | YAML `schema_version=1`, documented CLI commands and flags, explicit exports from the public Angular entries, semantic tokens, and stable message IDs and their named arguments. The CLI manages the manifest, policy, ownership data, and sync lock. |
| Check results | CLI `check` combines generation consistency and source checks. Generated `check-ui.cjs` checks policy and source. Documented fields and status meanings are part of the public contract. |

The full `angular/index.ts` entry references specialist components, so apps that use it must resolve the 25 engines and other dependencies listed in the guide. Apps using the public `angular/core.ts` and `angular/forms.ts` entries can use the smaller dependency set in the consumer guide.

## Installation and documentation

Install the npm package and use its installed bin for init/dry-run/sync/check. Follow the [integration guide](ui-library-consumer-guide.en.md#install-and-generate) and provide actual app sources at `checks.source_roots`.

Consumer API/design/installation/upgrade documents ship in npm `docs/` and generated Skill `references/docs/`. Development plans, ADRs, requirement matrices and audit/verification records do not ship. Do not assume the app root contains authoring-repository docs. Author matrices/evidence do not establish the installed app's successful verification. Historical logs/fixtures outside the package are not required inputs.

Original MIT text ships as `UI-FOUNDATION-LICENSE.txt` in generated output and Skill. Do not overwrite the app's root LICENSE. Preserve it as `ui-foundation/LICENSE.txt` in distributed app output. This license does not change app/third-party terms.

Copy all contents of npm `assets/third-party/` into delivered assets. When shipping PDF assets, also copy all contents of `assets/pdf-source/`. Generated-checker CHECKER-NOTICE.txt and CLI CLI-NOTICE.txt cover different bundles. Generated-app foundation dependencies also need FOUNDATION-NOTICES.txt. Follow the [asset guide](ui-library-consumer-guide.en.md#css-and-distribution-assets). Check actual final HTTP bytes and worker execution separately from file existence.

## Upgrade and recovery

[Stable message migration from beta.4](ui-message-migration.en.md)

1. Save package version, lockfile, YAML, complete generated directory and `.agents/skills/project-ui/` in one Git commit/backup. Keep business code/input data outside generated regions.
2. Read release notes for resync requirements, YAML/dependency/API changes, app actions and recovery point before upgrading the CLI. Updating npm alone does not update copied code.
3. Run only one operation per root. Inspect `sync --dry-run` differences, Skill, notices and manifest. Resolve edited/unowned-file conflicts rather than forcing overwrite.
4. Run sync and CLI check; inspect generated/dependency changes, typecheck, build and key interactions. Adopt app and generated changes together.
5. Roll back the saved CLI **and matching lockfile, YAML, output and Skill** to the same recovery point. Do not mix versions or adopt unknown files into an old manifest. Rerun the old CLI check and app verification.

Patch releases aim to preserve the documented public contract for the supported versions. Release notes identify compatibility changes, including the Lucide interop migration for `0.2.0`. For a beta upgrade, review the tested dependencies and migration instructions together. [Upgrade to 0.2.0](npm-beta-release-notes.en.md#020) · [Upgrade from beta](npm-beta-release-notes.en.md#010)

## Concurrent execution and interruption

Sync, including dry-run, exclusively acquires root `.ui-foundation-sync.lock`. An existing marker causes rejection before writes. PID is diagnostic information; age or an inactive PID alone does not automatically clear the marker.

Normal completion or successful recovery from ordinary I/O exceptions removes only the current run's marker. Forced termination/recovery failure retains it and blocks later sync. Atomic multi-file updates and automatic recovery from forced termination are not guaranteed.

Recover a retained marker as follows:

1. Stop writers to the same root and establish exclusive control. Retain the marker if ownership/stoppage is unknown.
2. Compare marker root/run ID/phase/planned paths/before-and-after hashes with actual files and saved Git/backup. Never execute marker paths as commands.
3. Confirm legitimate file ownership and restore matching YAML/output/Skill/manifests. Do not delete unowned files or business input. Stop with unresolved portions recorded if restoration is impossible.
4. Only after verifying restoration and stopped writers, explicitly move aside the recorded marker itself. Recheck that a new marker has not replaced it. There is no generic force-unlock or automatic deletion based on PID guesses.
5. Run dry-run, sync, check and app verification before resuming normal work.

## App-owned safety policy

Markdown/HTML sanitization and destination control are separate. The app selects external image/media origins, CSP, network access and authentication. HTTP(S)/Blob shape checks do not establish prohibition of outbound requests.

CSV enables formula mitigation by default. TSV and copy retain formulas. For untrusted strings sent to spreadsheet software, explicitly connect an app writer using `serializeTableMatrix(matrix, '\t', true)` and verify the paste destination.
