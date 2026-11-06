# English consumer reference closure

Scope: human-facing Markdown documentation named by the npm `files` allowlist is English-primary/Japanese-secondary. Standard AI instructions, Skill references and generated context use English; existing Japanese Skill entry points remain for compatibility, without adding Japanese-only AI-reference copies. Shared human/AI guides retain both language versions, with the standard AI workflow selecting English. Preserve app-authored context, Japanese human documents and source/API/license identifiers. Repository-only plans, ADRs and historical evidence are outside scope.

Acceptance:
- Every shipped Japanese operational guide has a complete English counterpart. The standard English Skill, overview and integration guide lead to English design, detailed component, static-check, runtime/specialist, and upgrade/recovery contracts.
- Japanese variants remain available through explicit language switches; configuration-owned prose and literal dictionary keys are not automatically translated.
- The npm tarball and the synced Skill contain the same allowed guides. English documentation never requires Japanese prose for an operational step; optional source-only references are labelled in English.
- Local document paths and fragments resolve in the installed package and the synced Skill. API names, code contracts, prerequisites, failure behavior and verification limits agree across languages.
- Generation remains deterministic and preserves edited/unowned files. Runtime components, locale selection, token values and third-party legal/source materials keep their contracts.

Plan: audit the installed reading path; add counterpart documents and navigation; localize reference fallbacks; test package and synced-Skill closure; regenerate; review the exact diff independently; verify one frozen release candidate and publish through the existing normal release process.

Verification: focused generation tests, link/fragment and translation-parity review, packed-resource and offline CLI/Angular consumer tests, warning-ledger consistency, candidate/consumer dependency audit, then registry digest and fresh fixed/unspecified-version install verification after authorized release.
