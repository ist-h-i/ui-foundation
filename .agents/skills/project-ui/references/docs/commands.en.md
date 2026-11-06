# CLI reference

[English](commands.en.md) · [日本語](commands.ja.md)

Run the installed CLI from the consuming app's root, where its YAML and source directories live. It uses the current directory and does not search parent directories. See the [integration guide](ui-library-consumer-guide.en.md) for dependencies and assets.

```text
ui-foundation init [--config ui.config.yaml] [--language en|ja]
ui-foundation sync [--config ui.config.yaml] [--dry-run] [--from-output previous/path]
ui-foundation check [--config ui.config.yaml] [--format text|json]
ui-foundation --help
ui-foundation -h
```

Use `./node_modules/.bin/ui-foundation` to select the installed version. With no arguments, the CLI prints usage and exits successfully without reading configuration.

| Option | Commands | Meaning |
| --- | --- | --- |
| `--config PATH` | All | Project-relative YAML path; defaults to `ui.config.yaml` |
| `--language en\|ja` | `init` | Starter prose and generated default language; defaults to English. Writes YAML `default_language` |
| `--dry-run` | `sync` | Validate and print planned changes without writing generated files; still acquires the sync lock |
| `--from-output PATH` | `sync` | Explicit previous output for legacy v1 migration without an ownership registry |
| `--format text\|json` | `check` | Output format; defaults to text |
| `--help`, `-h` | Standalone | Print usage |

Place options after the command and separate their values with spaces. Duplicate, unknown, unsupported or incomplete options fail with exit code 1. There is no `--config=...`, `sync --help`, `--force`, `--root` or `--version` option in the main CLI.

## Initialize

```sh
./node_modules/.bin/ui-foundation init
# Or start with Japanese context and profile guidance:
./node_modules/.bin/ui-foundation init --language ja --config config/ui.config.yaml
```

Creates a configuration from the bundled English or Japanese example, recording `default_language: en` or `ja`, replacing repository-specific checks with `source_roots: [src]`, no approved external components and no exceptions. It refuses to overwrite an existing file. Edit context, profiles, tokens and check roots for your app before sync. Existing YAML prose is preserved during sync; it is not machine-translated. Older configurations without `default_language` retain Japanese component defaults. Set the field explicitly and resync to migrate; app-owned translations and formatting still need verification.

## Synchronize

```sh
./node_modules/.bin/ui-foundation sync --dry-run
./node_modules/.bin/ui-foundation sync
```

Validates YAML and creates tokens, Tailwind theme, Angular sources, profiles, policy, checker, notices, manifest and the project Skill. Reports `create`, `update` and `delete` paths. An empty plan reports that generation is current. The Skill always lives at `.agents/skills/project-ui/` even when YAML `output` changes.

Sync protects manually edited or unowned files. Move custom code outside managed directories. Restore the matching generated files from version control before retrying; do not change hashes to adopt manual edits.

To move output, change YAML `output`, inspect the dry run and update app-owned imports/scripts. The ownership registry identifies the old directory. A legacy v1 project without that registry must sync once at the old path or explicitly pass `--from-output previous/path`. The option cannot override an existing registry, adopt an arbitrary directory or bypass conflicts. Case-only output renames require an intermediate name.

Paths must remain inside the app. Absolute paths, `.`/`..` segments, backslashes, `.git`, `node_modules`, symlinks in managed paths and output overlapping the Skill directory are rejected.

### Interrupted sync

Run only one sync or dry run in an app root at a time. An existing `.ui-foundation-sync.lock` blocks another run before configuration/output changes. Normal completion and successful rollback remove only the current run's lock. Force termination or failed recovery may leave it behind.

The lock records intended paths and before/after hashes, not file backups. Confirm the writer stopped, verify lock identity and compare files with a saved Git/backup state. Restore matching YAML, output, Skill and manifest together before explicitly moving the lock aside. Do not remove a lock based only on its age or PID. Multi-file updates are not atomic across forced process termination. [Detailed recovery contract](npm-beta-readiness.en.md)

## Check

```sh
./node_modules/.bin/ui-foundation check
./node_modules/.bin/ui-foundation check --format json
```

Reads the source YAML, expected generated files from the installed version, current output/Skill and configured app sources. Checks validation, missing/changed/unowned files and supported static source rules. It does not write these files or acquire the sync lock.

Text output writes generation differences to stderr as `Missing:`, `Changed:` or `Unowned:`. If generation matches, stdout includes `Configuration and generated files match.` followed by source diagnostics and totals. Always read the source result as well.

JSON output is one object on stdout:

| Field | Meaning |
| --- | --- |
| `valid` | Combined generation and source validity |
| `differences` | Missing, changed or unowned generated paths |
| `source` | Source status, validity, file/check counts, diagnostics and exceptions |

Diagnostics include location, rule, severity, message, suggestion and source. Argument/configuration failures instead return `{"valid":false,"error":"..."}`. Automation must inspect the exit code and error field as well as validity.

| Result | Exit code |
| --- | --- |
| Matching generation and no source errors | 0; source status may be `passed` or `warnings` |
| Warnings only | 0; unverified behavior remains |
| YAML has no `checks` | 0 if nothing else fails; source is `not_configured`, text includes `NOT_CONFIGURED` |
| Generation mismatch, source errors, invalid config, missing sources or parse/read failure | 1 |
| Invalid command/options or another exception | 1 |

`NOT_CONFIGURED` means source checking was not performed. Empty or nonexistent configured roots fail. Warnings need investigation, not blanket suppression. Static success does not certify runtime behavior, business correctness, visual quality, accessibility as a whole or user understanding. [Detailed check contract](static-checks.en.md)

## Standalone generated checker

Keep the full generated directory, including `checker-lib/`, policy and notices. Node can execute its source checker without the package checkout or extra checker dependencies:

```sh
node .ui/generated/check-ui.cjs --config ui.config.yaml --format json
```

This checker takes no subcommand. It additionally accepts `--root PATH` (absolute or relative; defaults to the current directory), plus `--config`, `--format` and standalone `--help`/`-h`. It validates YAML/policy agreement and checks sources. It does not replace the main CLI's full output and Skill consistency check. JSON success is the source result itself; exceptions return `{valid:false,status:"failed",error}`. Resync with the corresponding installed CLI when policy is missing, invalid or stale.

## Recovery

| Symptom | Action |
| --- | --- |
| `EEXIST` during init | Inspect and use the existing configuration; back it up before replacing it |
| `ENOENT` | Check the app root, config path and actual source files |
| Unsafe path or symlink | Use real project-relative paths outside protected directories |
| Edited/unowned generated file | Preserve the change, establish ownership and move custom code outside managed output |
| Invalid manifest or ownership | Restore YAML/output/Skill/manifest from the same saved state |
| Lock exists | Follow the interrupted-sync checks above |
| Missing/changed output or policy | Confirm the CLI version, review dry run and sync |
| Missing sources or parse failure | Correct source roots, syntax and any `checks.tsconfig` |

Before upgrading, save the package version, lockfile, YAML, output and Skill together. Installing a newer package alone does not update copied sources. Review the dry run, sync, check, then run the app's build and interaction tests. Roll back the complete saved state if necessary.
