# Independent CodeEditor review v3

Decision: no Blocker, Major, or Minor finding in the reviewed CodeEditor slice. The source can proceed to the remaining repository validation. This is a scoped code review, not an overall merge authorization or a claim that the normal repository guards have passed.

## Fixed target and integrity

- Repository: `/Users/inouehiroshi/Documents/GitHub/ui-foundation`.
- Supplied branch: `feat/ui-static-warning-release`; supplied base/head: `f85544caf7657ac9a3eec43c6554c1151aff9171`.
- Fixed dirty snapshot: `review-editor-v3-snapshot.json`, SHA-256 `c755ec4dce8fdfcfc95ffa4c55710fa5cf67459eaca90cc7950888e24a72faaa`.
- Archive SHA-256: `6db93588b7175952315fdc5e74a6a0f953193033551e025e5a9f0779ee883771`.
- Patch SHA-256: `d05b221383c076bbde382c866e58aad73bb270de6a3d45b0b44b8870f593a812`.
- All 23 live files and all 23 archive files matched every manifest hash at the first check. The archive had no additional files. A second saved checkpoint is `review-editor-v3/integrity-start.json`; the final checkpoint is `review-editor-v3/integrity-end.json`.
- No Git command was used; branch/base/head above are the supplied identifiers. Review identity is independently established by the manifest, archive, patch, and file hashes. No source, generated file, fixture, package, or Git state was changed by this reviewer.

## Review scope and observations

Reviewed the actual patch, template and generated CodeEditor/helper, `editor-control.ts`, `editor-model.ts`, `specialist-browser.ts`, locale/style context, the new model tests and native-input helper/specs, the cross-browser runtime fixture, relevant existing recovery/lifecycle fixtures, and runtime typecheck configuration. The 23 context files are enumerated by the fixed manifest. This review does not cover the release's complete static-warning classification ledger.

1. **Document/configuration ownership.** At `templates/angular/code-editor.ts:19-22`, draft changes update the document without recreating the settings extension or theme. The settings effect still tracks label, language, completions, line numbers, readonly, disabled, form-disabled, and busy. Its untracked restoration reads the accepted draft before reconfiguration, including the queued rejected engine-write case. The semantic theme is created once during mounting, and the CSS values are retained. The existing CVA base still owns draft updates and rejects edits while blocked/readonly.
2. **Async and lifetime.** Runtime CodeMirror imports remain inside asynchronous `mount()`. The new helper imports CodeMirror types only and receives the state module after loading. The destroyed check precedes construction; existing editor/scope disposal remains. No changed loading/error contract or new retained browser observer was found. This is source review, not fresh failure-injection coverage.
3. **Narrow native eligibility.** At `templates/angular/code-editor-input.ts:13-35`, the helper captures only trusted, cancelable, noncomposing, nonempty `insertText`, in writable single-selection state. One resolvable target range must exactly match CM's range. Fallback is limited to an absent/empty target-range API and one in-editor DOM selection whose anchor/head orientation matches CM. Conflicting nonempty ranges cannot fall back. Resolution failures delegate.
4. **Transaction scope.** At `templates/angular/code-editor-input.ts:37-56`, intent is consumed once, requires the same state/range/text, and activates the filter only during CM's default transaction construction. The filter additionally requires exact `input.type`, a single matching change, and the mapped previous selection rather than an already correct or intentionally different selection. It retains the transaction and adds only a sequential cursor spec. Application transactions outside that call, compound edits, composition annotations, paste/replacement, and unresolved native evidence delegate.
5. **Installed CM API contract.** Inspected installed `@codemirror/view` 6.43.13 `applyDOMChangeInner`/`applyDefaultInsert` (`dist/index.js:4346-4453`), observer ordering (`:4583-4615`, `:4723-4751`), `@codemirror/state` 6.7.6 transaction resolution (`dist/index.js:2382-2479`), and HTML auto-close input handling (`@codemirror/lang-html/dist/index.js:627-667`). CM caches `defaultInsert()`, continues later handlers when the guard returns false, and dispatches the cached transaction only if none handles input. The prior guard's language-handler interception is absent from this snapshot. Markdown HTML auto-close is covered with both stale and already correct default selections.
6. **Test changes.** Native bursts do not rewrite input DOM, add keyboard delay, or wait for RAF between characters. The controlled test's earlier-created MutationObserver delivers a scroll event before CM's mutation callback, and is explicitly labeled as controlled. Per-character trusted keyups check DOM/CM text and CM cursor; final output checks form state. Theme-class, external CVA write, readonly, disable/enable, and the queued rejected engine write are also checked. The Dialog locator now matches the existing fixture label at `tests/fixture-app/overlay-catalog.ts:29`.

## Evidence directly inspected

`review-editor-v3/evidence-summary.json` contains the independent raw JSON/receipt readback.

- **Pure model:** recorded command `node --import tsx --test tests/model/code-editor-input.test.ts`, exit 0; 36 passed, 0 failed/skipped. Read the test source, raw log, and receipt. This tests real CM state/history/language APIs using a modeled view/event; it is not browser or IME evidence. The receipt matches the final template helper and test, and 21/23 final context files; the two mismatches are the then-unsynchronized generated helper/manifest. Subsequent build and browser receipts match all 23 final files.
- **Diagnostic compile/bundle:** recorded `tsc -p tsconfig.ui-runtime.json`, `ngc -p tsconfig.json`, `node scripts/build.mjs`, and the local Tailwind command, each exit 0. Before/after source receipts match all 23 files. The expected build changed the main bundle/map. The generated main bundle is `b381a2a994a883ec91cc2c8856cd5d9f9b37715b8a8d46d88711f54f7ae7c27a`. This diagnostic explicitly deferred the normal checkProject guard.
- **Focused actual browsers:** recorded existing-bundle cross-browser command with `--grep CodeEditor`, exit 0. Raw results: 12 passed, 0 skipped/unexpected/flaky, retry 0. Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6; guided/dense, ordinary/controlled. Each case has 16 bursts and 403 trusted character keyups, all matching expected prefix/head and stable theme class. The 6 controlled cases each recorded 403 controlled scroll deliveries. All 12 runtime-engine attachments have no runtime errors or unknown warnings. Before/after receipts match all 23 files and the diagnostic bundle; the server was closed.
- **Prior bounded failure evidence:** `editor-mo-scroll-race-before-v2.json` records 16/16 incorrect samples under the controlled ordering; `editor-intent-v8.json` records trusted `insertText` with empty target ranges. The prior pure `review-editor-v2/input-handler-probe.json` demonstrates HTML closing-tag suppression in the earlier handler. These support the regression target; none establishes a direct observation of the original natural event ordering.
- **Reviewer commands:** read-only `rg`/`sed`/`nl`/`cat` inspections plus Python SHA-256/tar/JSON/attachment checks, all shell invocations exit 0. Only this report and proof JSON files under `review-editor-v3/` were added. No browser, build, heavy test, Git, or subagent operation was run by this reviewer. No security refusal occurred.

Fixed raw evidence hashes:

| Artifact | SHA-256 |
| --- | --- |
| `editor-input-model-v9.log` | `9880742d7a448203b3e00be8055c57f5413f6043def926e957c876c5f1088664` |
| `editor-input-model-v9-receipt.json` | `5006814b86af91fe34156d7c72d6ec354fb4fc6ac53d0c387041e25ef719e82f` |
| `diagnostic-build-v9-receipt.json` | `8afe831bcabec212b98b0e546784258deb4079dbb2cd1c152cc1323ea12174a3` |
| `editor-regression-v9/results.json` | `8b51e21a125ddd743ca1bac89519e2ba1048863ffac6c578ce620073e281d8cb` |
| `editor-regression-v9-receipt.json` | `ef383439dbfe7619db9853030b5557c2af031f23ac75da9b2e1b48dc74f1457c` |

## Limits and remaining verification

The normal repository guard and final `npm test` are not established by the diagnostic compiler run. The 48-case full runtime run was still in progress at this review's evidence cut and is not counted as passed. Its completion and any final source change require the main agent's matching checks.

Natural original race ordering, real IME/dead-key/mobile behavior, assistive-technology speech, and physical Safari-device behavior remain unmeasured. Composition/paste/replacement/deferred application transactions have bounded delegation controls rather than universal browser coverage. Passing the finite native sample does not establish arbitrary input reliability or overall UI quality. Static Unknowns and warning-classification correctness remain separate from this editor review.

No mandatory code fix is requested by this review. These scoped observations do not replace the repository's remaining guards, independent reviews of other slices, or the user's publication constraints.

Final integrity check: all 23 live/archive files and snapshot/patch/archive hashes remained unchanged. `review-editor-v3/integrity-end.json` SHA-256: `f0e87b435e0d5e3f4c919d6235080ddac4f12101b8f001ab1a8ce5b313d3577b`.
