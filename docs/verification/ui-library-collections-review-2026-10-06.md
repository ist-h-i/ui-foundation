# Independent collections12 review

Base: `04dc3f4bc71161a5fff0860d810e73272a729499`.
Final source reviewed: `85c5ffdea19135010a30f2cbcf327f77d4ca5669`.
Final decision: **approve**. No unresolved product findings remain. The two independently reproduced P2 findings below were fixed and their original reproductions were rerun on this exact final source. Root full-suite completion and final proof-only metadata are separate acceptance evidence.

## Finding

**Fixed P2 — Constrain each owned VirtualList and virtual Listbox row to the visible viewport inline dimension.** At 001c99b, `templates/angular/virtual-list.ts:11–12` and `templates/angular/listbox.ts:28` gave each rendered virtual row only a percentage maximum under CDK's intrinsic content wrapper. A valid long default label expands every rendered row to its intrinsic width. The declared `text-overflow:ellipsis` does not truncate the span because its containing row is already oversized. At a 320px viewport and 200% root font, guided has viewport clientWidth 254 but all three rows 2541.078px; dense has clientWidth 286 but rows 2248.078px. Both LTR and RTL reproduce. Pre-fix Listbox repeated the same widths with valid app-owned options and successful native Space selection; pre-fix evidence `listbox-long-label-probe-final-001c99b.json`, `listbox-long-label-probe.log` and four original images. Final Listbox evidence is `listbox-long-label-probe-final-85c5ffd.json` and `listbox-long-label-probe-final-85c5ffd.log`. Projected native input fields also extend past the viewport. This is reproducible with only public required VirtualList inputs and a label `'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.repeat(3)`, no projected template or private API needed. A fixture flex-basis change alone cannot fix the default row. Final source applies public `viewport.elementRef.nativeElement.clientWidth` measurements to only the owned virtual rows. Original public VirtualList four cases and Listbox four cases now have guided row/client/scrollWidth 254px and dense row/client/scrollWidth 286px, real ellipsis, contained projected editor, and no viewport horizontal overflow. Dynamic 640→320 parent width, 100→200% font, both profiles, same editor DOM/value/focus, and native selection plus exact CDP AX parent/group ownership passed. Listbox virtual↔nonvirtual recreation retains the selected value and correct ownership. The final drawing confirms the ellipsis. CDK internal elements/styles remain untouched.

Evidence: `virtual-default-probe/consumer.ts`, `tsconfig.json`, `aot.log`, `build.log`, `browser.json`, four `drawing-*.png` files. Pre-fix and final strict AOT and official linker succeeded; 15 modules linked; actual browser process exited 0 after all four cases. Pre-fix files are preserved as `browser-before-width-fix-001c99b.{json,log}`; final `browser.json` is tagged with 85c5ffd. Narrow fixture candidate measurements are separately stored in `narrow-virtual-fixture-probe.json`.

Previously found InfiniteScroll idle invalidation P2 is fixed at this source. The final original repro plus synchronous queued old observer callback, native IO, empty result, invalidated request acknowledgement, destruction and recreation passed in both profiles. Evidence: `final-async-probes.json` and `.log`, actual exit 0. The first extended harness version expected an intersection after parent scroll was reset by destroy; that harness assumption was corrected to perform a real scroll after recreation, and the earlier log is retained.

The tentative zero YAML dimension concern was withdrawn after independently checking `resolveConfig(parseConfig(...))`. All four guided/dense collection item/viewport values reject zero. Direct runtime CSS override is outside the validated generated-config contract.

## Executed independent ledger

Repository and Git stayed read-only. Reviewer source/build/server/browser artifacts are in `/tmp/ui-foundation-collections-final-review`.

| Command / operation | Actual result at final 85c5ffd |
| --- | --- |
| Full tracked snapshot blob comparison | 399 tracked files; exact except owned server/playwright port harness overrides |
| `npm run build` | exit 0; ui:check, Angular strict AOT, esbuild public CDK linker, Tailwind |
| `node node_modules/typescript/bin/tsc -p tsconfig.tools.json` | exit 0 |
| `node --import tsx --test tests/config/*.test.ts tests/model/*.test.ts` | exit 0; 161/161 = config68 + model93 |
| `node independent-browser-review.mjs` | exit 0; 32/32 guided/dense; native keys, pointer, focus/DOM/rectangles, CDP AX, IO, scopes/CVA, details, 320px/200%/RTL/reduced-motion, axe violation0 |
| `node final-async-probes.mjs` | exit 0; 2/2 original idle invalidation and stale lifetime cases |
| `node --import tsx focused-consumer.mts` | exit 0; generated sync/check valid; positive strict AOT; five invalid typed contexts rejected |
| `node focused-consumer-build.mjs` | exit 0; official public CDK linker, 20 linked modules; whole bundle 8,312,100 bytes (not a CDK incremental-size claim) |
| `node focused-consumer-browser.mjs` | exit 0; both profiles real actions/CVA/bounded1000 rows/settled native reorder/manual ack/native details, errors[] |
| Minimal default VirtualList public consumer AOT/linker/browser | exit 0; original four cases fixed; dynamic width/profile/font and editor identity/value/focus passed |
| Long-label virtual Listbox real Chrome/AX/selection/resize/recreation | exit 0; four original cases fixed; correct option/group parents, one listbox, live active ID and retained selection |
| `node capture-stable-viewports.mjs` | exit 0; twelve final 320px/200%/RTL/reduced-motion images and native control hit-test metadata; all twelve images inspected |

The independent full stock generated-consumer test on preceding a1886aa timed out at its 240s limit under concurrent builds (exit1). It is not a pass; the focused independent consumer above is narrower evidence. The root's full `npm test` is a separate ledger. Its 001 run was stopped with actual exit 130 after the width finding (337 passed / 2 interrupted / 361 not run). The final 85c5ffd 880-case full suite was still running at this report revision; no full-suite pass is claimed by this review.

## Scope and limits

Source/API, generic original typed contexts, schema/roles/config resolution, generator ownership and manifests, public CDK22.2.1 MIT notice/peers, Skill/generated context, native semantics and CVA, keyboard/AX ownership, Escape ordering, async cleanup and drawings were reviewed. All 181 authoritative `requestedControls` and `sourceLine` values remain unchanged against base; no pending matrix entries were promoted by this reviewer.

Chromium 153.0.8010.12 is the tested engine. No Safari/Firefox, real assistive-technology session, physical OS touch device, shadow DOM/separate document or SSR certification is claimed. CDP touch emulation and native keyboard alternatives were exercised on the preceding source whose relevant drag implementation is unchanged. Zero automated axe violations do not certify human comprehension or all color contrast; axe incomplete items remain manual-review limitations. Fixed-height virtual row editor state remains application-owned.
