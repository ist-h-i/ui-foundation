# Independent review: scoped fast native Tab case budget

Date: 2026-10-18. Reviewer scope: read-only source and saved-evidence review using `code-review-quality`. This report is the reviewer's only created file. No source/Git mutation, browser execution, build, typecheck, suite execution, retry, external publication, or delegation occurred.

## Decision and findings

**Source-scope decision: no findings in the exact two-file diff.** The 90-second total budget is a reasoned accommodation for the existing finite matrix, while the native-key delivery and assertion contract remain unchanged. The source correction's browser acceptance is **Unknown / NOT_RUN by this reviewer**. This is not a browser pass, overall release assessment, or merge authorization.

No F1 [Blocker|Major|Minor] finding is issued. The pending execution evidence is an explicit verification limit, not evidence of a newly introduced source defect.

## Fixed review target

- Repository: `/Users/inouehiroshi/Documents/GitHub/ui-foundation`.
- Branch: `feat/ui-static-warning-release`.
- Base and HEAD: `10074eae430dd75335189e325edb7c57049e2bb5` plus the exact dirty snapshot below.
- Snapshot: `review-fast-tab-budget-v1-snapshot.json`, SHA256 `a823de0c992b015fb8e595e3722d5ac98131d08a53634e8c38e64a8f777d61c7`.
- Archive: `review-fast-tab-budget-v1.tar`, SHA256 `31e0bb921898d1c3be1332a32ddfd015618b2c49f9037a183934e53dec8dc843`.
- Exact patch: `review-fast-tab-budget-v1.patch`, SHA256 `c2f7fd068a4546363068dba3a8f6009476959ccbbf6b73aea210cf0fcde41fb7`.

All 12 manifest file hashes were checked against both the working files and in-memory archive members before review. The exact live `git diff -- tests/ui/virtual-fast-tab.spec.ts docs/ui-warning-reviews.json` hashes to the pinned patch. The final integrity check repeats these checks after review and confirms unchanged HEAD/branch.

The only source delta is `tests/ui/virtual-fast-tab.spec.ts:110-112`, a two-line explanatory comment plus `test.setTimeout(90_000)` inside the callback declared by the `['list','table']` loop. Removing that exact inserted block makes the entire file byte-identical to its base Git object, SHA256 `36c1e061c20928a9fa707502ad4641d8526fb1def6d39e857993215dcb0f63e2`. The snapshot spec SHA256 is `bd6657b953083ca945c00792ab58dbada533ea704612c3a3cf0f7951b014f616`.

## Contract and scope assessment

1. **Only two cases receive the new total deadline.** The timeout call executes inside each A–D mixed-control test callback, before its setup; it does not run at suite declaration scope. Installed Playwright 1.63.0 `lib/common/index.js:2376-2385` routes this call to the current `testInfo`; the worker timeout manager changes the current slot's deadline (`lib/worker/workerProcessEntry.js:444-449,1289-1290`). The ordinary config remains byte-identical to base with two workers, `fullyParallel:true`, `retries:0`, and no global case timeout override (`playwright.config.ts:6-19`). The retained failure traces independently record the ordinary 30,000-ms case timeout. The existing dedicated virtual-radio cross-browser configuration already budgets 90,000 ms (`playwright.cross-browser.config.ts:21-27`); its one-worker scheduling remains distinct from the ordinary two-worker run.

2. **The workload is finite and the comment's counts are exact.** Each of four contexts sends `1 + 64*k + 1 + 64*k + 2` native keys: viewport entry, forward row controls, after-boundary exit, reverse row controls, then reverse viewport/before exit. List has `k=2`: 260/context, 1,040 total. Table has `k=4`: 516/context, 2,064 total. Both retain 12 `flush` calls, eight post-burst geometry checks and the C forward screenshot. The arithmetic agrees with the fixture's projected input/select controls and the table's cell stops (`runtime-fast-tab.ts:7-38`, spec `:113-124`).

3. **The original same-instance transition history is preserved.** One page and one `RuntimeFastTab` instance/id are created before the A–D loop; all four contexts update that same id before destruction. The contexts preserve profile, width, font, direction and reduced-motion transitions (`css-override-test.ts:5-20`). Row size/overscan inputs remain `null/2 -> null/2 -> 220/0 -> null/2`, including restoring C's overrides on D. Setup/transition settling remains outside key bursts. Splitting or reducing these contexts is not part of this diff.

4. **No pacing or weakened correctness oracle is introduced.** `tab` still appends one expected entry and awaits only `page.keyboard.press('Tab'|'Shift+Tab')` without options (`spec:44-48`). Keyup capture records identity/range/DOM, without geometry, polling or RAF (`spec:34-40`). All reads and checks remain after each burst; every captured keyup still checks count, exact focus identity, native trust, direction, cancellation, live DOM bound and public range bound (`spec:49-59`). Post-burst checks retain offset/range/row-size alignment, zero extra CDK wrapper offset, visible focused target, and active/first-visible hit ownership (`spec:103-107,119-121`). There are no added skips, retries, slow mode, extra waits, synthesized replacement Tab events, removed rows/controls, or changed assertions anywhere in the file. The installed keyboard driver waits only when `options.delay` is supplied (`playwright-core/lib/coreBundle.js:21384-21413`); its SHA256 is `549070af3acabb3efcc4f55bfe6210f9f7c2fcf633cf7eaa59bfe60719969171`.

5. **Lifecycle/error behavior is retained.** The lifecycle fixture and `runWithLifecycleCleanup` are byte-identical to base. Primary and cleanup failures are separately recorded, and the original failure is rethrown (`runtime-lifecycle.ts:119-145`); browser warnings/errors still fail the automatic fixture (`css-override-test.ts:4`). The total budget adjustment does not change these paths. Product/fixture sources and both Playwright config files are unchanged in this diff. Context inspection of `VirtualScroll.prepareTab` and ADR 0003 confirms the relevant contract remains synchronous bounded preparation followed by the browser's native uncancelled Tab action, without a per-key RAF requirement.

6. **Only D155/D160 evidence hashes change.** A recursive JSON comparison finds exactly `/reviews/93/evidence/6/sha256` and `/reviews/97/evidence/6/sha256`, mapping to D155 and D160. Both change from the base spec digest above to the snapshot spec digest. All other JSON keys, array order, source hashes, anchors, scopes, reasons, recheck conditions and dispositions are byte-semantically identical. Both remain `retained-warning`, `producer_static_status:Unknown`, `universal_runtime_status:Unknown`, with the existing source-reference/NOT_RUN limits. Relevant lines are `docs/ui-warning-reviews.json:6903-6910,7173-7180`; no approval or execution claim is promoted.

## Independent raw-evidence assessment

The earlier investigator's report was consulted as context; the conclusions below were independently checked from the saved ZIP records, attachments, error contexts and source identities. Failed-run source HEAD is `20761f986c6480546ddf405235b1ddf4faa8b405`, private copy `/var/folders/57/t9r9mr850f74d7hd68f9zcm80000gn/T/ui-foundation-release-v2-72k3he8j`. The failed spec equals the current base spec; seven relevant config/helper/product files and the ADR also match their failed-HEAD Git objects and present context bytes. Thus the old execution informs the aggregate deadline diagnosis for an otherwise unchanged test body, while it is not an execution of the new timeout.

Raw evidence under that copy's `test-results/`:

| Kind | Case directory suffix | `trace.zip` SHA256 | `error-context.md` SHA256 |
| --- | --- | --- | --- |
| list | `virtual-fast-tab-fast-nati-3822e-ry-row-forward-and-backward-chromium` | `fa552e1b120f4283746c2742617a5ec55ee265e0bbc7fee5350a6b040e916a5c` | `418b10a3bb10d2fe5c5e765a411b85bd6ef46c416b95013c36a55c2dca138d14` |
| table | `virtual-fast-tab-fast-nati-b4c6b-ry-row-forward-and-backward-chromium` | `05980441c2a9c854330635f8291ce7a5ccd4a4221dcfd4ed7bc4b62e8b2e2fdf` | `d2e059fcfe7b2c6e867d98ad9c18bf79e72e091c27fbc2f3605d7f8c611f7d80` |

Both runner headers specify `testTimeout:30000`; both error contexts retain the primary 30-second failure. Runner records were joined by callId and library native actions by stepId. The first runner `error` is kept separate from all later teardown activity. Times below are relative to each runner trace's monotonic origin, not a user-facing performance benchmark.

| Observation | List | Table |
| --- | ---: | ---: |
| Native key APIs completed before first primary error | 975 | 1,032 |
| Completed strictly by nominal origin + 30,000 ms | 974 | 1,032 |
| Native key API duration min / median / max before primary error | 2.971 / 9.495 / 64.289 ms | 3.753 / 9.971 / 58.515 ms |
| After Hooks start | 30,016.590 ms | 30,012.648 ms |
| Last pre-primary completed focus target | D backward `row:31:tail` | B reverse exit `before` |
| Pending at primary error | another Shift+Tab, `pw:api@6676` | C environment evaluation, `pw:api@7411` |

The one list key completed at 30,004.862 ms was before the recorded primary error but after the nominal 30,000-ms boundary. It is not counted as an in-budget completion. The table's later `keyboard.press` cancellation occurs during teardown after its first primary failure; it does not establish a native-key stall as the original cause.

The raw context environment evaluation times after initial setup are list A/B/C/D 3,759.951 / 10,613.609 / 17,787.988 / 25,356.491 ms, and table A/B/C 3,996.872 / 17,123.087 / 29,951.697 ms. Complete list A/B/C cycles consume about 6.85 / 7.17 / 7.57 seconds; complete table A/B cycles about 13.13 / 12.83 seconds. All library keyboard records carry only `{key:'Tab'|'Shift+Tab'}`, without a delay option. This combination of many continuing, short native API calls and progressively completed contexts supports a cumulative workload explanation for the 30-second failure. It supplies a reasonable basis for a 90-second aggregate budget; it does not measure a strict maximum human-perceived latency or establish how all remaining phases behave.

Saved keyup attachments were independently reconstructed against the entire expected 1,040/2,064-key plan:

- List `attachments/d95fefd97ee03c705ee8d7209a9385324c763667`, SHA256 `92e3677c0d13332b3a0a6ea01b5d835c44d8c98843fad913b55155984c368810`: 1,040 saved events, zero identity/trust/direction/cancellation/DOM-limit/range-limit mismatches. The final 65 returned APIs occur after the primary error; the final 66 are not strictly before the nominal deadline. The full saved log and D backward paint do not convert the failed run into a pass.
- Table `attachments/46fa39791073577e3465bbed2550fb6b9a8500ac`, SHA256 `894bb1c5ef0505fd71326430a1ac01bca8ec13e135384f627156e0c2d401d63e`: 1,289 saved events, zero such mismatches. Only the first 1,032 correspond to pre-primary completed A/B work. All 257 saved C forward events are post-primary. C backward's unflushed events and D are not established by this saved log.

Pre-primary paint attachments cover list A/B/C forward/backward and D forward, and table A/B forward/backward, with both paint flags true. List D backward attachment at 31,297.042 ms and table C forward attachment at 32,594.750 ms are explicitly post-primary observations. Both saved lifecycle attachments classify the page as open, browser connected, with no close/crash/disconnect event at their observation boundary and only the primary timeout. This does not guarantee future lifecycle events; the table records a later unexpected page close during teardown.

## Commands, exits and preservation

Commands used were targeted, local and read-only, except for writing this report:

| Command / probe | Exit | Result |
| --- | ---: | --- |
| `git branch --show-current`; `git rev-parse HEAD`; targeted `git status --short` / `git diff` | 0 | Exact branch, base/head and two-file tracked delta established; unrelated work preserved. |
| `python3` standard-library `hashlib/json/tarfile` preflight over the manifest, archive and `git diff` | 0 | All 12 source/archive hashes, three artifact digests, exact patch and HEAD matched. |
| `python3` exact-block removal comparison against `git show 10074eae:tests/ui/virtual-fast-tab.spec.ts` and recursive registry comparison | 0 | Whole spec equality after removing only the insertion; exactly two evidence hash leaves changed. |
| Targeted `nl -ba`, `sed -n`, `rg -n` source/config/ADR/driver reads | 0 | Native delivery, lifecycle, context history, bounds and unchanged config inspected. |
| Optional lookup of unbundled Playwright implementation paths | 2 from `rg` | Those paths do not exist in this distribution; no behavior conclusion was drawn. `rg --files` located the actual bundles, and the subsequent targeted reads succeeded with exit 0. |
| `python3` source identity check against failed HEAD/private copy plus `zipfile/json` runner/library joins, first-error boundary, attachment inspection and expected-sequence reconstruction | 0 | Raw deadline, key counts/durations, bounded correct saved prefixes, paint and lifecycle observations verified. No ZIP extraction or evidence rewriting. |
| `git diff --check` | 0 | No whitespace errors in the pinned diff. |
| Final `python3` repeat of all 12 working/archive hashes, three artifact digests, exact live patch and branch/HEAD | 0 | Review target unchanged after inspection. |

The exact source/hash probes were performed inline and created no helper script or extracted archive. The only reviewer-created path is this report. No existing worktree, untracked evidence or other person's edits were removed or rewritten.

## Unverified limits and remaining responsibility

- The new snapshot's ordinary two-worker browser completion remains NOT_RUN by this reviewer. The main agent owns supported-pipeline execution and adjudication of all failures; the preserved normal run's 12 failures are not cleared by this review.
- No result from the main agent's separate broad 120-second/cross-browser activity is asserted or used here. Such results must bind their exact source and effective per-test deadlines and remain distinct from the old failed run.
- Changing a total deadline relaxes the old aggregate 30-second cutoff. It does not add pacing or weaken identity/range/paint assertions, and the saved executions show no long individual key stall. This is still not a dedicated per-key performance SLA, a general latency regression proof, or an arbitrary-projection/native-order guarantee.
- The saved table C backward/D matrix is incomplete, and saved post-deadline activity is diagnostic evidence only. A fresh successful supported run is needed to establish completed runtime acceptance on the corrected snapshot. Producer static status and universal runtime status remain Unknown regardless of finite test completion.
