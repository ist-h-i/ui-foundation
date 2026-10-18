# Independent review: post-burst paint v2

Decision: **approve the frozen observer/spec/ledger correction within this review scope; no findings**. The v1 F1 logical-identity-history false pass is corrected in the reviewed bytes. This source review and the native control evidence do not establish application-suite acceptance or merge authorization. The main agent owns the guarded unfiltered 180-case run, clean normal `npm test`, and publication checks.

## Fixed target and integrity

Repository: `/Users/inouehiroshi/Documents/GitHub/ui-foundation`, branch `feat/ui-static-warning-release`.

- Cumulative base: `c19aa1137a1ca281e433d4d96b56f27e45099cd8`.
- Supplied correction base / initial HEAD: `2b46a4487a08e069bcae74fd98f62f4899789fa6`.
- Observed HEAD after the main committed the same source: `469e142750a4edb5fdb995e3c2542d481774da50`.
- The review target remains the frozen manifest/tar/patch and its 26 named file contents. This is not an unrestricted review of other commits, old artifacts, or the whole product.

| Fixed artifact/source | SHA-256 |
| --- | --- |
| `review-post-burst-paint-v2-snapshot.json` | `7a178ff00dfe8732d21ec74bede5eaf84f47f71ab584b746dcd41e1b8c9a9391` |
| `review-post-burst-paint-v2.tar` | `8dd7807d5193cf03d969de08081baa1f7048b0dadb852d348a8949d0165ad012` |
| `review-post-burst-paint-v2.patch` | `77c8337846ae8ca25a0d93bebe0f90916baf1be317a22a69ee11d17a90998fa7` |
| `tests/ui/post-burst-paint.ts` | `25c0fd3a2def34739fddd649f52c57302b92644e3d3f6539044a7659b3dbc837` |
| `tests/ui/virtual-fast-tab.spec.ts` | `523b4df14e8245db103e680f47d996c95f3029a0ab3538ac3b8447646300dd54` |
| `docs/ui-warning-reviews.json` | `f1f6b05605f30d79331b9a5d3f50b9d28d68bb6e5463a690625a1896354a60db` |

All 26 live files and all 26 tar members matched before review and at final readback. Final verification also checks the extracted immutable review copies. Wrapper hashes match, with no duplicate tar entries. Per-file results are in `review-post-burst-paint-v2/initial-integrity.json` and `review-post-burst-paint-v2/final-snapshot-verification.json`; the latter is reproducible using `review-post-burst-paint-v2/verify-snapshot.py`. Source mutation and Git operations were left to the main agent.

## F1 resolution and observer review

The helper at `tests/ui/post-burst-paint.ts:45-74` pins the exact active DOM object and its initial ancestor chain. Its explicit dependency rules match the finite inputs of the actual fast-tab `identify` callback at `tests/ui/virtual-fast-tab.spec.ts:8-26`: target ID/nested/boundary/control/role/column attributes; row position/index and row-key selector attributes on the target or ancestors; and `ui-virtual-row` class membership. Reference equality, element tag names, root containment, and ancestor structure supply the remaining identity inputs. Attribute changes cannot alter a node's tag; removal/reparenting records cover loss of the pinned structure.

Filtered attribute observation retains old values. For each relevant record, both its old value and the current value are compared with the pinned value. Therefore A→B→A does not become acceptable merely because its final sampled identity is A. Class history compares only the relevant token using HTML ASCII whitespace, preserving the distinction between a space and NBSP. Unrelated labels, style, cosmetic class tokens, and other elements do not become identity changes. Pending records are drained with `takeRecords()` before accepting an outcome. Child-list removal checks also retain the original identity ancestors.

The observer captures a detached `structuredClone(read())` synchronously before its first await. It never writes application state, DOM, focus, or scroll; the only property assignment installs the helper on `window`. The application observation remains bounded to 1000 ms with a timer when RAF is suspended. Exact active DOM object, connection, expected current identity, pinned identity, focus departure/return, and identity mutation history remain separate failure conditions. The returned initial metric is preserved when the final state changes or fails. The `finally` block removes focus listeners and disconnects observation after success, timeout, caught measurement failure, or an identity callback rejection.

An independent finite VM probe ran the exact baseline helper from `2b46a448` and the frozen correction. For all ten restored identity histories, the old helper returned `ready` and the correction returned `target-changed`. This held for both callback-delivered records and records retained until `takeRecords()` — 20 old counterexamples and 20 corrected rejections. The initial cloned metric stayed unchanged. The cosmetic/NBSP case remained `ready`; suspended RAF timed out; read/isReady exceptions produced `measurement-failed`; an identity exception rejected; returned focus and a removed/restored ancestor failed. Every exercised exit left zero listeners, observers, frame callbacks, and timers. These are mocked algorithm/cleanup checks, not browser scheduling or rendering evidence.

## Existing contracts and regression scope

The TypeScript AST/source audit against C19 directly verified:

- `snapshot`, `tab`, `flush`, `disposeProbe`, `nativeScrollReference`, and `nativeNestedSequence` are byte-identical.
- Probe `paint`, `read`, `keydown`, and `keyup` declarations are byte-identical. The trusted native keyup capture, focus/order, cancellation/direction, public-range and live-DOM assertions remain immediate, with no added per-key frame, poll, geometry, or delay.
- All four original application test declarations match after removing only the new expected-identity argument to post-burst geometry. Their five expanded application cases and same-instance A–D loop remain. The list/table counts remain 1040/2064 native keys.
- The exact geometry assertion suffix is byte-identical: public range/DOM correspondence, 1 px owned-window and row-height tolerances, zero CDK offset, viewport intersection, and all owned hit samples remain required.
- The original radio/sparse sources are unchanged. Mock top-level registration retains all original 40 cases per engine and adds exactly 20 unique observer controls, yielding 60 per engine / 180 for three engines. No only/skip/fixme/fail masking calls were added.
- The control producers are self-contained inline native DOM with real geometry/hit measurements. Their imports do not reference verification output, historical artifacts, or saved results. The ten history controls record a changed middle identity and a restored final identity. The cosmetic control is a separate positive case.

The ledger comparison reconstructs the entire expected document from C19 using only two spec-hash replacements and two direct helper evidence additions, in D155 and D160. It then deep-compares that reconstruction with the frozen ledger. It matches exactly: 908 references across 92 files, all 122 `producer_static_status` and all 122 `universal_runtime_status` fields remain `Unknown`. Reasons, producers, classification boundaries, and CSS override contracts are unchanged. The cumulative tracked diff contains only the helper, spec, and ledger; no product or driver change is part of this correction.

## Primary native evidence readback

After source review, the main supplied `post-burst-controls-v2/results.json`, its `run-receipt.json`, and `post-burst-controls-v2-receipt.json`. The reviewer directly parsed all 60 tests and their decoded observation attachments, rather than accepting a summary alone.

There are exactly 20 controls for each of Chromium, Firefox, and WebKit, with one passed result per test, retry 0, no skipped/unexpected/flaky cases, and all expected control titles present. Attached initial/final readiness, failure outcomes, restored A/B/A identity histories, and same connected final target assertions match the intended contract. The receipt pins both changed source hashes to this snapshot, reports 717 source inputs and no source/bundle drift, and records native exit 0 with the owned server closed.

This was an explicitly filtered control run using `--grep=post-burst paint observer:`. Build is explicitly `NOT RUN`; the existing bundle hash was `b381a2a994a883ec91cc2c8856cd5d9f9b37715b8a8d46d88711f54f7ae7c27a`. Inline native DOM controls do not establish that the full application passes against that bundle. Readback details and the three primary artifact hashes are saved in `review-post-burst-paint-v2/native-control-evidence-result.json`.

Historical classifications remain intact: v10 is a failed broad 120-case run, with 119 expected and one unexpected WebKit original D–C geometry failure. V11 was interrupted after the v1 finding, with build exit 137, native `NOT_RUN`, server `NOT_STARTED`. The native scheduling v3 diagnostic declares unpaced application acceptance false; it observes immediate-offscreen/later-visible behavior but does not support the exact row-997 centering hypothesis. None of these artifacts is reclassified as acceptance. The old v1 probe was read as history and was not rerun against corrected root bytes.

## Commands, evidence, and limits

The following reviewer checks exited 0 in the existing checkout without dependency installation. Environment: Node `v24.19.0`, Python `3.14.6`, existing repository dependencies; no browser or build process was started by the reviewer.

| Check | Raw artifact |
| --- | --- |
| Initial Python manifest/live/tar SHA verification | `review-post-burst-paint-v2/initial-integrity.json` |
| `node .../review-post-burst-paint-v2/static-contract-probe.mjs` | `static-contract-result.json`, `static-contract.stdout.txt`, `static-contract.stderr.txt` |
| `node .../review-post-burst-paint-v2/identity-history-probe.mjs` | `identity-history-result.json`, `identity-history.stdout.txt`, `identity-history.stderr.txt` |
| `python3 .../review-post-burst-paint-v2/audit-native-evidence.py` | `native-control-evidence-result.json`, `native-control-evidence.stdout.txt`, `native-control-evidence.stderr.txt` |
| `git diff --check c19aa1137a1ca281e433d4d96b56f27e45099cd8 HEAD -- tests/ui/post-burst-paint.ts tests/ui/virtual-fast-tab.spec.ts docs/ui-warning-reviews.json` | No diagnostics |
| `python3 .../review-post-burst-paint-v2/verify-snapshot.py final` | `final-snapshot-verification.json` |

The static probe also typechecked only the frozen helper through TypeScript's compiler API, with strict DOM/ES2022 libraries and zero diagnostics. This is not a full project typecheck. All result JSON files and executable probes are under the reviewer-owned directory next to this report.

No browser, build, heavy suite, clean checkout, full `npm test`, remote mutation, merge, or deployment was executed by this reviewer. The supported unfiltered 180-case application suite and clean normal `npm test` were pending main-owned acceptance work when this source report was prepared. Full product/driver semantics and arbitrary runtime identity sources are outside this patch review. No universal safety, CSS writer completeness, screen-reader acceptance, or merge permission is inferred. No subagent or worktree was created; other people's files were preserved.
