# Independent review: post-burst paint v1

Decision: **request changes**. One Major finding prevents the observer from satisfying the logical identity/history pinning requirement. Browser acceptance remains unverified by this reviewer. This is a review of the frozen bytes below, not merge authorization.

## F1 [Major] A logical identity can change and return between samples without failing

The observer can return `ready` for a target whose logical identity changed during its observation. At `tests/ui/post-burst-paint.ts:43-47`, the MutationObserver records child removal only and requests `{childList:true,subtree:true}`. Identity checks at lines 51 and 60 inspect the current value at sample time. A producer can change the same connected, focused element's identity and restore it in one microtask before the next rendering sample. No focus or removal event occurs, and both sampled identities match the expected value. This falsely accepts a changed logical target, contrary to the identity/history contract.

This also matters for the application identity function at `tests/ui/virtual-fast-tab.spec.ts:12-18`: a target's identity depends on attributes of both the target and its containing row, including `aria-posinset` / `aria-rowindex`. Stable DOM object identity alone does not establish stable logical row identity. This review does not claim that the application currently performs the counterexample sequence; it establishes an observer false-pass path under the required contract.

The current native control at `tests/ui/virtual-fast-tab.spec.ts:144,163-168` leaves the changed ID in place until the final sample. It exercises persistent identity mismatch, so it cannot detect the returned-identity false pass. The returned-focus control exercises a different path and is correctly covered by the focus listeners.

**Reproduction:** from the repository root, run:

```sh
node docs/verification/ui-static-warning-release-20261018/review-post-burst-paint-v1/identity-history-probe.mjs
```

The saved probe uses the exact helper source and a small mocked document/Element/MutationObserver/RAF contract environment. It starts with `initial.ready=false`, changes the ID to `different-logical-target`, restores `paint-target`, and then makes the metric ready before the next sample. The result is `COUNTEREXAMPLE_REPRODUCED`: two attempted attribute mutations, zero delivered mutations under the observer's requested options, `outcome="ready"`, `targetIssue=null`, and `final.sameTarget=true`. This is a finite algorithm counterexample, not native-DOM, native-scroll, keyboard, rendered, or application acceptance evidence.

**Required fix:** retain a lossless history guard for identity-bearing changes of the pinned target and the attributes/ancestors used to identify it, including changes that revert before the next sample. Add or strengthen a self-contained native DOM negative control for that returned-identity sequence. Sampling identity more frequently is insufficient for changes within one task. Re-run the affected finite controls and obtain a fresh independent review of the substantive correction. Keep the immediate keyboard burst contract and historical failure classification unchanged.

## Frozen target and integrity

- Repository: `/Users/inouehiroshi/Documents/GitHub/ui-foundation`.
- Branch: `feat/ui-static-warning-release`.
- Supplied base and initial HEAD: `c19aa1137a1ca281e433d4d96b56f27e45099cd8`.
- The main agent committed the same source bytes during review. Final observed HEAD: `2b46a4487a08e069bcae74fd98f62f4899789fa6`. The review target remains the supplied manifest, tar and patch; it is not an unrestricted review of that commit.

| Artifact / source | SHA-256 |
| --- | --- |
| `review-post-burst-paint-v1-snapshot.json` | `78937773883dec29bb25b9a7ade9b8a36bac0ea1d09ca0e73d563c06739a723b` |
| `review-post-burst-paint-v1.tar` | `b94e4e32084ca9c6a9b3d9f4dd5d9d1db79d3ac548c99a21c1950ff84e586c7e` |
| `review-post-burst-paint-v1.patch` | `1c04bda10bbce6ebdcfe32eeb090fff0b6ba0ca03ea679dd3b21645bb19ff238` |
| `tests/ui/virtual-fast-tab.spec.ts` | `9c92e334585b2cbadc04dcdb7aac894e053987e7ad1162c320ed8598de79db26` |
| `tests/ui/post-burst-paint.ts` | `aaa05618b63103591284cd33559c2dc57c4fee7f85dcdfbe15356fc557a932ee` |
| `docs/ui-warning-reviews.json` | `e66837c1177409503596091b61d714c3c75e439cf481c9eec3e23deb6fc60c7f` |

All **19 manifest files** matched their expected SHA-256 in both the live checkout and immutable tar before source review and at final readback. Snapshot/tar/patch hashes also matched both times. The final per-file record is `review-post-burst-paint-v1/final-snapshot-verification.json`; its script is `review-post-burst-paint-v1/verify-snapshot.py`.

## Scope inspected and finite checks

The actual frozen patch, both changed test files in full, the two ledger edits, `css-override-test.ts`, `runtime-lifecycle.ts`, both Playwright configurations, and the runtime tsconfig were read. Repository requirements and validation boundaries were checked in `AGENTS.md`, `docs/project-brief.ja.md`, `docs/implementation-plan.md`, and relevant `docs/design.md` / `docs/static-checks.ja.md` passages. The included correction report, ledger readjudication, prior broad-run summary, native investigation, v3 diagnostic summary and protocol were read as evidence with their stated limits.

The small TypeScript AST/source comparison against the supplied base exited 0. Its saved result is `review-post-burst-paint-v1/static-contract-result.json`:

- `snapshot`, `tab`, `flush`, `disposeProbe`, `nativeScrollReference`, and `nativeNestedSequence` are byte-identical.
- The probe's `paint`, `read`, `keydown`, and `keyup` declarations are byte-identical.
- All four existing application test declarations are byte-identical after removing only the newly supplied geometry identity argument. Their five expanded application cases and same-instance A-D matrix are preserved. The mixed-control counts remain 1040 for list and 2064 for table.
- The existing exact geometry assertion suffix is byte-identical, retaining the 1 px height/window tolerance, zero CDK offset, intersection and owned nine-point hit checks.
- A recursive JSON comparison found exactly two changes: `/reviews/93/evidence/6/sha256` (D155) and `/reviews/97/evidence/6/sha256` (D160), both updating only the referenced test hash. All 122 `producer_static_status` and all 122 `universal_runtime_status` fields remain `Unknown`.

Static inspection found the first metric is synchronously detached with `structuredClone(read())` before an await, post-burst observation has a finite requested deadline plus a timer when RAF is suspended, and the observer does not write application state, DOM, focus or scroll. The nine added controls use self-contained inline DOM and current rectangle/hit measurements with no historical data dependency. Their actual browser behavior remains unexecuted by this reviewer. F1 limits the claimed target-history protection.

The prior broad 120-case summary remains a failure: 119 expected cases and one unexpected WebKit original D-C geometry failure. The included native scheduling protocol explicitly places two RAF callbacks after row 997, declares application acceptance false, and reports the broad immediate-offscreen/later-visible category separately from the unsupported exact row-997 centering hypothesis. It is diagnostic evidence only and cannot substitute for the supported unpaced application suite. No CSS override or producer contract was changed by this patch.

## Commands and artifact results

All commands ran in the existing checkout without dependency installation. No source was changed by this reviewer. The initial and final Python hash checks, TypeScript AST/source comparison, recursive ledger comparison, and finite identity-history probe each exited 0. Probe exit 0 means the counterexample was reproduced, not that the observer passed acceptance.

| Reviewer artifact | SHA-256 |
| --- | --- |
| `review-post-burst-paint-v1/identity-history-probe.mjs` | `3a8983f07f6fbc9c65e97b0377e6a7dd4be74763b26211ff92151de120731806` |
| `review-post-burst-paint-v1/identity-history-result.json` | `e8bb454495b81ca67daac8fa5a743998989c2ddae74781b9c2dbae4e1d125398` |
| `review-post-burst-paint-v1/static-contract-result.json` | `91802a15a0999df428f6361eb32a6f67ea87e1daa8a2978c95e40e49d0694330` |
| `review-post-burst-paint-v1/final-snapshot-verification.json` | `50afbc8e6cb5b5d2d19f96762246398e585ccc8492e87b4410f77786c0046c5f` |

No browser, build, full typecheck, guarded 147-case run, clean `npm test`, remote check, publication, deployment, or merge was performed by this reviewer. The main agent owns those acceptance and publication actions. No subagent or worktree was created; unrelated source and artifacts were preserved. Runtime identity changes outside this finite counterexample, cross-engine behavior, persistent offscreen/occlusion execution, and the complete consumer/runtime claims remain unverified here. No additional finding is asserted for those unexecuted areas.
