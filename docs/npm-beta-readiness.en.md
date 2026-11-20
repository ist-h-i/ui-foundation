# Public beta installation, upgrade and recovery contract

[Japanese](npm-beta-readiness.ja.md)

This is the installation, upgrade and recovery contract for `@hiroshi.inoue/ui-foundation@0.1.0-beta.4`. Original CLI/templates/Skill/generated code use the MIT License (2026 Hiroshi Inoue). Existing third-party terms are retained.

## Accepted beta scope

| Boundary | Contract |
| --- | --- |
| Distribution | One CLI package generates Angular source, CSS, Skill and checker; it is not a compiled Angular library. |
| Node and OS | Node.js **24.19.0**, macOS arm64; other Node series/OS are unverified. |
| Consumer | Angular/CDK22.2.1, TypeScript6.0.3 and the recorded lockfile; follow the [dependency guide](ui-library-consumer-guide.en.md#application-dependencies) for foundation/specialist dependencies. |
| Browser | Focused interactions in the verified configuration use Playwright Chromium; verify other browsers/assistive technology in the app's adopted configuration. |
| API | YAML `schema_version=1`, CLI init/sync/check and existing flags, explicit exports from the public Angular barrel and generated structure. Manifest/policy/ownership/lock are tool-managed, not app-editable APIs. |
| Check results | CLI check combines generation consistency and source checks; generated check-ui.cjs checks policy/source. Existing JSON fields and error/warning/not-configured meanings are retained. |

The full `angular/index.ts` entry references specialist components, so apps that use it must resolve the 25 engines and other dependencies listed in the guide. When the installed version provides `angular/core.ts`, apps using only its exports can resolve the smaller dependency set described in the consumer guide. Verify additional configurations in the consumer.

## Installation and documentation

Install the npm package and use its installed bin for init/dry-run/sync/check. Follow the [integration guide](ui-library-consumer-guide.en.md#install-and-generate) and provide actual app sources at `checks.source_roots`.

Consumer API/design/installation/upgrade documents ship in npm `docs/` and generated Skill `references/docs/`. Development plans, ADRs, requirement matrices and audit/verification records do not ship. Do not assume the app root contains authoring-repository docs. Author matrices/evidence do not establish the installed app's successful verification. Historical logs/fixtures outside the package are not required inputs.

Original MIT text ships as `UI-FOUNDATION-LICENSE.txt` in generated output and Skill. Do not overwrite the app's root LICENSE. Preserve it as `ui-foundation/LICENSE.txt` in distributed app output. This license does not change app/third-party terms.

Copy **all contents** of npm `assets/third-party/` and `assets/pdf-source/` into delivered assets. Generated-checker CHECKER-NOTICE.txt and CLI CLI-NOTICE.txt cover different bundles. Generated-app foundation dependencies also need FOUNDATION-NOTICES.txt. Follow the [asset guide](ui-library-consumer-guide.en.md#css-and-distribution-assets). Check actual final HTTP bytes and worker execution separately from file existence.

## Upgrade and recovery

1. Save package version, lockfile, YAML, complete generated directory and `.agents/skills/project-ui/` in one Git commit/backup. Keep business code/input data outside generated regions.
2. Read release notes for resync requirements, YAML/dependency/API changes, app actions and recovery point before upgrading the CLI. Updating npm alone does not update copied code.
3. Run only one operation per root. Inspect `sync --dry-run` differences, Skill, notices and manifest. Resolve edited/unowned-file conflicts rather than forcing overwrite.
4. Run sync and CLI check; inspect generated/dependency changes, typecheck, build and key interactions. Adopt app and generated changes together.
5. Roll back the saved CLI **and matching lockfile, YAML, output and Skill** to the same recovery point. Do not mix versions or adopt unknown files into an old manifest. Rerun the old CLI check and app verification.

Technical upgrade/recovery tests do not guarantee future compatibility. The beta primarily maintains the latest candidate, identifies incompatible changes by version/release notes and does not promise long-term maintenance of multiple old versions.

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

CSV enables formula mitigation by default; existing TSV/copy retains formulas. For untrusted strings sent to spreadsheet software, explicitly connect an app writer using `serializeTableMatrix(matrix, '\t', true)`. Formula-preserving workflows and safe-string output have different acceptance criteria; verify the actual paste destination. The beta does not silently change default TSV behavior.
