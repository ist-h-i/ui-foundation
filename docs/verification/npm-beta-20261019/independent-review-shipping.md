# Shipping audit source review

Decision: approve the reviewed source changes. No Blocker/Major/Minor findings requiring a fix were identified. This is not final-candidate execution approval or npm publication authorization.

Exact target: `17a21d48000f5de6bb23cbceb45e6bb88b336405` -> `a7cc066bbc5bab5f7cdce562adaf0d85b511ae1d` (HEAD confirmed at review). Independent, read-only review; no source edits or delegation.

## Scope and evidence

- Read repository AGENTS.md and code-review-quality/SKILL.md; reviewed the actual diff, complete audit implementation, consumer-smoke flow, package beta receipt creation, focused audit tests, changed docs/generated references and initial failed receipt summary.
- `scripts/audit-package.mjs:53-94`: closure carries optional/required route state separately. Required or explicitly rooted paths cannot be exempted by an optional second route. Missing edges can become inactiveOptional only for an uninstalled, lock-optional parent excluded by current OS/CPU and reached exclusively through optional edges; missing fixed version/source/execution remain Unknown.
- `scripts/audit-package.mjs:97-105,252-261`: MIT-LICENSE originals are recognized; the murmurhash-js README exception is exact name/version and full SHA256. Original bytes still pass the existing full-byte notice comparison, including line endings.
- `scripts/audit-package.mjs:118-161,253-256`: native exclusion requires the exact Darwin/arm64 package/version and every proof flag. Saved candidate report SHA, metafile SHA/input-path digest, complete metafile output list, output byte counts/hashes and actual delivery files are checked. Candidate/delivery .node files and renamed exact copies of the installed native binary prevent exclusion. Notice and inventory source-license status stay Unknown.
- `scripts/package-verification/consumer-smoke.mjs:17-62`, `tests/package/beta.test.mjs:54-80,199-230`: actual esbuild metafile is captured outside the served root, all emitted outputs are recorded from actual bytes, independently checked in the beta test and saved with candidate/consumer evidence only after the successful smoke.
- Advisory failed/missing/inconsistent responses and network skip continue to be handled separately from zero results. Verdict wording is scoped to this candidate/consumer/host and explicitly disclaims source-license/legal-compliance conclusions.
- Initial saved audit remains ActionRequired with original unresolved notices and five wasm-platform missing edges; it is not treated as final shipment success.

## Checks executed

- `node --test tests/package-audit/*.test.mjs`: exit 0; 9 passed, 0 failed, 0 skipped (Node environment from the shared checkout).
- `git diff --check 17a21d48000f5de6bb23cbceb45e6bb88b336405 a7cc066bbc5bab5f7cdce562adaf0d85b511ae1d`: exit 0.
- Read-only probe of actual lock closure and original-source discovery: runtime missing edges empty; five oxide-wasm32-wasi bundled edges classified as explicit Unknown when its absent optional platform path is modeled; jsbarcode MIT-LICENSE and exact murmurhash README recognized. Unit tests separately cover installed, compatible-host, explicit-root and required-route counterexamples.

## Optional editorial suggestion

`docs/npm-beta-dependency-audit.ja.md:47` repeats the identical `--tarball` option already present at line 45. Removing the second occurrence would make the sample clearer; identical values do not change this CLI result.

## Unverified / residual limits

The current candidate package-heavy test, saved new consumer evidence and final network/package audit are pending in the main agent's execution and were not run concurrently here. Passing focused tests is not proof that the current candidate satisfies every shipping gate. Extraction provenance depends on the package test's successful candidate extraction/receipt workflow. No npm publish, name/license decision, legal compliance, other host/browser coverage or external publication was performed or inferred.
