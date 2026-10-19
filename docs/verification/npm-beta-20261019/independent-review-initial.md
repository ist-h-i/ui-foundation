# Independent npm beta review

Decision: approve with comments for the reviewed source change. No Blocker or Major finding identified. Completion of the current candidate's final package/browser and dependency-audit gates must be assessed separately from this source review.

Reviewed Git range: `0550cf62df46a8badb914bea06f20830b4ddb326..7da6c9a21279bf4e644250c866a77ad9f23abf83`. Working HEAD was exactly `7da6c9a21279bf4e644250c866a77ad9f23abf83`; no source was changed by this reviewer.

## Findings

F1 [Minor] The generated Skill's runtime reference does not identify the installed package as the source of original assets. At `skills/ui-development/references/ui-library-runtime.md:35`, immediately after “このSkillに同梱した” documentation, it instructs the reader to obtain originals from “同梱の assets/pdf-source/ と assets/third-party/”. Those paths are absent from the generated Skill; `src/sync.ts:117-120` copies Skill text and documentation there, while `package.json:18-19` packages assets under the installed npm package. A consumer following this local reference can look in the wrong directory when preparing notices/source assets. Specify `node_modules/<package>/assets/pdf-source/` and `node_modules/<package>/assets/third-party/`, or link directly to the precise package-asset instructions in `references/docs/ui-library-consumer-guide.ja.md`. The consumer guide and beta-readiness document already give the correct location, so this is not a source-checkout dependency or a merge blocker.

## Scope and evidence

- Read repository AGENTS.md, the supplied execution/review rules, and code-review-quality Skill.
- Reviewed the range's handwritten implementation/tests/contracts and generated-document relationship: package file allowlist/bin/private/engine metadata; CLI/checker bundling and notice inventory; generated Skill references; sync locking/journaling/release/rollback; independent tgz install, synthetic version A/B protection and recovery; strict Angular compilation and browser workers/assets; dependency closure, advisory-response classification, original notices and source-kit checks.
- The packaged checker substitution reads prebuilt colocated assets. The bundled CLI's external-import allowlist, source/packed manifest comparison, and OS-denial sentinel provide complementary boundaries.
- Sync lock acquisition precedes config/ownership reads, canonicalizes root aliases, refuses existing/unknown markers, records hashes before writes, preserves incomplete rollback markers, and verifies inode/run ownership before marker removal. These claims are limited to the implemented cooperative root lock and documented manual recovery contract.
- `node --test tests/package-audit/audit.test.mjs`: exit 0, 5 passed, 0 failed. Covers failed/malformed/omitted-dev audits, high advisory, byte-preserving notice checks, inventory mismatches, and nested/required-peer closure.
- Read-only Node probe imported `renderSkillDocumentation()`, rendered all 37 operational reference files, and compared their bytes to `.agents/skills/project-ui/references/`: exit 0; all 37 matched.
- No package build, Angular compiler, static scan, package integration, browser test, registry audit, npm publish, metadata choice, source edit, worktree operation, or redelegation was performed by this reviewer.

## Unverified and limits

- I did not execute the final current-head package suite or independently inspect its final output receipt. Those expensive checks were reserved for the primary agent to run sequentially.
- No claim is made here that the current tarball has passed the browser/isolation or full dependency-audit gate; the source tests describe and implement those gates, but execution is separate evidence.
- Other Node versions, OS/architectures, browser engines, registry publication, project-license permission and real-service adoption remain outside this review. The contract correctly restricts the candidate to Node 24.19.0/macOS arm64/Chromium and retains `private: true`, undecided package/license/publication metadata, and explicit no-publication scope.
- Audit Verified means the documented fixed-lock, known-advisory and notice/source-asset checks passed at collection time. It does not establish comprehensive vulnerability absence or legal compliance.
