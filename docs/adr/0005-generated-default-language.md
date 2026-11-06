# 0005: Select the generated default language explicitly and preserve older YAML

Date: 2026-11-06
Status: accepted

## Context

The npm experience should start in English and support Japanese. Changing the shared runtime fallback globally would also change existing apps on sync, including their number/date presentation. Deriving language from context prose, profiles or browser settings would make generation implicit and unstable.

## Decision

Add optional YAML `default_language: en | ja`. `init` records `en`; `init --language ja` records `ja`. Omitted settings preserve Japanese for existing configurations. Sync generates a small `locale-defaults.ts` module from the explicit setting. The locale model selects bundled text and `en-US`/`ja-JP` defaults from it. Existing runtime providers, scopes and explicit component inputs keep their precedence.

App-owned content, time zones, native input formats, business data and token profiles remain separate. No provider is required for a new English app's built-in English text. Language changes in existing apps are an explicit YAML change followed by sync and app verification.

## Alternatives

- Global English fallback: simpler, but silently changes existing Japanese apps.
- Keep Japanese everywhere and require English providers: preserves existing apps but fails the new user's default expectation.
- Infer language from prose or browser state: nondeterministic and inconsistent with explicit configuration ownership.

## Consequences and verification

New YAML uses an additive field that older CLIs reject. Rollback restores the saved package, YAML and generated output together. An omitted field stays omitted through parse/resolve; no migration rewrites existing YAML.

Verify strict enum validation, English/Japanese generation, omitted-field Japanese compatibility, unchanged tokens and real installed Angular startup without a locale provider. Preserve dictionary overrides and runtime language switching. Review this decision before adding more bundled languages or inferring regional/time-zone defaults.

No earlier ADR is superseded.
